import CONFIG from "./config.js";
import funcAsStr from "./EventManager.js";
import { log } from "./utils.js";
export class SiteController {
    page;
    constructor(page) {
        this.page = page;
    }
    async init() {
        await this.page.evaluate((code) => window.eval(code), funcAsStr);
        log("SiteController initialized.");
    }
    async bringToFront() {
        await this.page.bringToFront();
    }
    async isInTask() {
        return await this.page.evaluate(() => {
            return !!document.querySelector('img[alt="Input"]');
        });
    }
    async clickGetNewTask() {
        log("Clicking 'Get New Task'...");
        await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const btn = btns.find(b => b.innerText.includes("Get New Task"));
            btn?.click();
        });
    }
    // Updated to ensure fresh task detection
    async waitForNewTaskImage(previousSrc) {
        log("Waiting for NEW task image...");
        await this.page.waitForFunction((oldSrc) => {
            const img = document.querySelector('img[alt="Input"]');
            // Verify image exists and has a new source URL
            if (!img || !img.src || img.src.includes('placeholder'))
                return false;
            return oldSrc ? img.src !== oldSrc : true;
        }, { timeout: 60000 }, previousSrc);
        // Final verification that the image is fully rendered
        await this.page.waitForFunction(() => {
            const img = document.querySelector('img[alt="Input"]');
            return img && img.complete && img.naturalHeight > 0;
        });
    }
    async captureTask() {
        log("Capturing current task...");
        await this.page.waitForSelector('img[alt="Input"]', { visible: true, timeout: 60000 });
        await this.page.waitForSelector('img[alt="Output"]', { visible: true, timeout: 60000 });
        await this.page.waitForFunction(() => {
            const imgs = Array.from(document.querySelectorAll("img"));
            return imgs.every(i => i.complete && i.naturalHeight > 0);
        });
        await this.page.screenshot({ path: CONFIG.TEMP_IMAGE_PATH });
        const availableTools = await this.page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            return btns
                .map(b => b.innerText.trim())
                .filter(t => t.includes("("))
                .join(", ");
        });
        return `Available UI Tools: ${availableTools}`;
    }
    async getInputImageSrc() {
        return await this.page.evaluate(() => {
            const img = document.querySelector('img[alt="Input"]');
            return img?.src || null;
        });
    }
    async waitForUserAction() {
        return await this.page.evaluate(() => {
            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    const btns = Array.from(document.querySelectorAll("button"));
                    const doneBtn = btns.find(b => b.innerText.trim() === "Done");
                    const nextBtn = btns.find(b => b.innerText.trim() === "Done & Next Task");
                    if (doneBtn && !doneBtn.dataset.listenerApplied) {
                        doneBtn.dataset.listenerApplied = "true";
                        doneBtn.addEventListener("click", () => {
                            clearInterval(interval);
                            resolve("DONE");
                        });
                    }
                    if (nextBtn && !nextBtn.dataset.listenerApplied) {
                        nextBtn.dataset.listenerApplied = "true";
                        nextBtn.addEventListener("click", () => {
                            clearInterval(interval);
                            resolve("NEXT");
                        });
                    }
                }, 500);
            });
        });
    }
}
