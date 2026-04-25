import BrowserMan from "./BrowserMan.js";
import ChatController from "./ChatController.js";
import { SiteController } from "./SiteController.js";
import CONFIG from "./config.js";
import Utils, { log } from "./utils.js";
import * as fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "task_logs.txt");
const CSV_FILE_PATH = path.join(process.cwd(), "tasks.csv");

// =========================
// STATE
// =========================
let totalTasks = 0;
let totalSessionTime = 0;
let previousImageSrc: string | null = null;

// =========================
// LOGGING
// =========================
function saveToLogFile(message: string) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(LOG_FILE_PATH, `[${timestamp}] ${message}\n`);
}

// =========================
// MAIN
// =========================
async function main() {
  await BrowserMan.startBrowser();
  const browser = await BrowserMan.connect();

  const bm = new BrowserMan(browser);
  await bm.init();

  const cc = new ChatController(bm.getPage("chat"));
  const sc = new SiteController(bm.getPage("site"));

  await sc.init();

  log("🚀 SYSTEM STARTED");

  while (true) {
    try {
      await sc.bringToFront();

      // ==================================================
      // STEP 1: ENSURE TASK EXISTS
      // ==================================================
      let inTask = await sc.isInTask();

      if (!inTask) {
        log("📦 No task → clicking Get New Task");

        await sc.clickGetNewTask();

        await sc.page.waitForSelector('img[alt="Input"]', {
          visible: true,
          timeout: 60000,
        });
      }

      // ==================================================
      // STEP 2: WAIT FOR ACTUAL NEW TASK (CRITICAL FIX)
      // ==================================================
      await sc.waitForNewTaskImage(previousImageSrc);

      await Utils.sleep(500); // small buffer for DOM stability

      // update reference AFTER confirmed new task
      previousImageSrc = await sc.getInputImageSrc();

      const taskStartTime = Date.now();

      log(`🆕 Task #${totalTasks + 1} READY`);

      // ==================================================
      // STEP 3: CAPTURE TASK (SAFE NOW)
      // ==================================================
      const promptContext = await sc.captureTask();

      // ==================================================
      // STEP 4: AI PROCESSING
      // ==================================================
      await cc.bringToFront();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);

      let aiResponseText = "";

      try {
        aiResponseText = await cc.askForEvaluation(
          promptContext,
          controller.signal
        );
      } finally {
        clearTimeout(timeout);
      }

      log("🤖 AI DONE");

      // ==================================================
      // STEP 5: BACK TO UI
      // ==================================================
      await sc.bringToFront();
      log("⏳ Waiting for user action...");

      const action = await sc.waitForUserAction();

      // ==================================================
      // STEP 6: STATS
      // ==================================================
      const duration = parseFloat(
        ((Date.now() - taskStartTime) / 1000).toFixed(1)
      );

      totalTasks++;
      totalSessionTime += duration;

      log(`✅ Task ${totalTasks} completed in ${duration}s`);

      // ==================================================
      // STEP 7: FLOW CONTROL (FIXED)
      // ==================================================
      if (action === "DONE") {
        log("🛑 STOP REQUESTED");
        break;
      }

      if (action === "NEXT") {
        log("➡️ NEXT TASK → waiting for UI update");
        // No click needed; user manual click triggers the site transition
        await Utils.sleep(2000);
        continue;
      }

    } catch (err: any) {
      log(`⚠️ ERROR: ${err.message}`);

      await Utils.sleep(3000);

      try {
        await sc.page.goto(CONFIG.URLS.site, {
          waitUntil: "networkidle2",
        });

        previousImageSrc = null; // reset state after reload
      } catch {}
    }
  }

  log("SCRIPT STOPPED");
  process.exit(0);
}

main().catch((e) => {
  saveToLogFile(`FATAL: ${e.message}`);
});