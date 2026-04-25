import { Page } from "puppeteer-core";
import CONFIG from "./config.js";
import funcAsStr from "./EventManager.js";
import { log } from "./utils.js";

export class SiteController {
  constructor(public page: Page) {}

  async init() {
    await this.page.evaluate((code: string) => window.eval(code), funcAsStr as string);
    log("SiteController initialized.");
  }

  async bringToFront() {
    await this.page.bringToFront();
  }

  async isInTask(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return !!document.querySelector('img[alt="Input"]');
    });
  }

  async clickGetNewTask() {
    log("Looking for 'Get New Task' button...");
    await this.page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('Get New Task'));
    }, { timeout: 30000 });

    await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.innerText.includes('Get New Task'));
      startBtn?.click();
    });
  }

  async captureTask(): Promise<string> {
    log("Waiting for Input and Output images to load...");
    await this.page.waitForSelector('img[alt="Input"]', { visible: true, timeout: 50000 });
    await this.page.waitForSelector('img[alt="Output"]', { visible: true, timeout: 50000 });
    
    await this.page.waitForFunction(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.every(i => i.complete && i.naturalHeight > 0);
    }, { timeout: 40000 });

    await this.page.screenshot({ path: CONFIG.TEMP_IMAGE_PATH });

    // Extract tools available on screen (e.g., Select, Box, Pin)
    const availableTools = await this.page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.map(b => b.innerText.trim()).filter(text => text.includes('(')).join(", ");
    });

    return `Available UI Tools: ${availableTools}`;
  }

  /**
   * Pauses automation until the human clicks "Done" or "Done & Next Task".
   * Injects event listeners safely into the DOM.
   */
  async waitForUserAction(): Promise<"DONE" | "NEXT"> {
    return await this.page.evaluate(() => {
      return new Promise<"DONE" | "NEXT">((resolve) => {
        const checkInterval = setInterval(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const doneBtn = btns.find(b => b.innerText.trim() === 'Done');
          const nextBtn = btns.find(b => b.innerText.trim() === 'Done & Next Task');

          if (doneBtn && !doneBtn.dataset.listenerApplied) {
            doneBtn.dataset.listenerApplied = "true";
            doneBtn.addEventListener('click', () => { 
              clearInterval(checkInterval); 
              resolve("DONE"); 
            });
          }

          if (nextBtn && !nextBtn.dataset.listenerApplied) {
            nextBtn.dataset.listenerApplied = "true";
            nextBtn.addEventListener('click', () => { 
              clearInterval(checkInterval); 
              resolve("NEXT"); 
            });
          }
        }, 1000);
      });
    });
  }
}