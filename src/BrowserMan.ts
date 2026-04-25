import { spawn } from "child_process";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import CONFIG from "./config.js";
import puppeteer from "./browserConfig.js";
import { Browser, Page } from "puppeteer-core";
import { log } from "./utils.js";

export default class BrowserMan {
  private pages: Record<string, Page> = {};

  constructor(private browser: Browser) {}

  /**
   * Safe getter for pages to prevent "undefined" errors in index.ts
   */
  public getPage(name: string): Page {
    const page = this.pages[name];
    if (!page) throw new Error(`CRITICAL: Page "${name}" not found in BrowserMan session.`);
    return page;
  }

  /**
   * Initializes the two required tabs (Gemini and IceCow) 
   * logic: Finds existing tab or creates a new one
   */
  async init() {
    log("Initializing browser tabs...");
    const pages = await this.browser.pages();

    for (const [key, url] of Object.entries(CONFIG.URLS)) {
      // Check if a tab with this URL is already open
      let target = pages.find(p => p.url().includes(url));
      
      if (!target) {
        log(`Creating new tab for ${key}...`);
        target = await this.browser.newPage();
        // Use timeout: 0 to wait indefinitely for the initial login/load
        await target.goto(url, { waitUntil: "networkidle2", timeout: 0 });
      } else {
        log(`Existing tab found for ${key}.`);
      }
      
      this.pages[key] = target;
    }
    
    // Ensure the first page is blank if Puppeteer opened a default one
    if (pages.length > 0 && pages[0].url() === 'about:blank') {
        await pages[0].close();
    }
  }

  /**
   * Spawns the Chrome process with advanced Stealth arguments
   */
  static async startBrowser() {
    const isPortOpen = await new Promise(res => {
      const s = new net.Socket();
      s.setTimeout(400);
      s.once("connect", () => { s.destroy(); res(true); });
      s.once("error", () => { s.destroy(); res(false); });
      s.connect(CONFIG.PORT, "127.0.0.1");
    });

    if (!isPortOpen) {
      log("Starting Chrome with Stealth Arguments...");
      
      // Clear the SingletonLock to prevent "Profile in use" errors on Windows
      const lock = path.join(CONFIG.PROFILE_DIR, "SingletonLock");
      if (fs.existsSync(lock)) {
          try { fs.unlinkSync(lock); } catch (e) { log("Note: Could not clear lock file."); }
      }

      const args = [
        `--remote-debugging-port=${CONFIG.PORT}`,
        `--user-data-dir=${CONFIG.PROFILE_DIR}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--start-maximized",
        // CORE STEALTH: Prevents Google from detecting Puppeteer
        "--disable-blink-features=AutomationControlled",
        // SESSION PROTECTION: Ensures logins stay active
        "--password-store=basic",
        "--use-mock-keychain",
        // PERFORMANCE: Prevents tabs from freezing in the background
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding"
      ];

      const child = spawn(CONFIG.BROWSER_PATH, args, { detached: true, stdio: "ignore" });
      child.unref();
      
      // Give Chrome 4 seconds to fully initialize the profile and port
      await new Promise(r => setTimeout(r, 4000));
    }
  }

  /**
   * Connects the Puppeteer controller to the spawned Chrome instance
   */
  static async connect(): Promise<Browser> {
    log(`Connecting to Chrome on port ${CONFIG.PORT}...`);
    return await puppeteer.connect({ 
      browserURL: `http://127.0.0.1:${CONFIG.PORT}`, 
      defaultViewport: null ,
      protocolTimeout: 0 // infinite timeout to prevent "Protocol error (Target.setDiscoverTargets): Target closed" on slow startups
    });
  }
}