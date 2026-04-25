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
// STATE & TRACKING
// =========================
let totalTasks = 0;
let totalSessionTime = 0;
let previousImageSrc: string | null = null;

// =========================
// restaurat logging logic
// =========================
function saveToLogFile(message: string) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(LOG_FILE_PATH, `[${timestamp}] ${message}\n`);
}

function initializeCSV() {
  const header = "Timestamp,TaskNumber,TaskTimeSeconds,TotalTasks,TotalTimeSeconds,TotalTimeInMinutes,AvgTaskTime,TasksPerHour\n";
  if (!fs.existsSync(CSV_FILE_PATH)) {
    fs.writeFileSync(CSV_FILE_PATH, header);
  }
}

function saveToCSV(taskNumber: number, taskTime: number, totalTasks: number, totalTime: number) {
  const timestamp = new Date().toLocaleString();
  const avgTaskTime = totalTime / totalTasks;
  const tasksPerHour = 3600 / avgTaskTime;
  const totalMinutes = (totalTime / 60).toFixed(2);

  const row = `${timestamp},${taskNumber},${taskTime},${totalTasks},${totalTime},${totalMinutes},${avgTaskTime.toFixed(2)},${tasksPerHour.toFixed(2)}\n`;
  fs.appendFileSync(CSV_FILE_PATH, row);
}

// =========================
// MAIN LOOP
// =========================
async function main() {
  initializeCSV();
  await BrowserMan.startBrowser();
  const browser = await BrowserMan.connect();
  const bm = new BrowserMan(browser);
  await bm.init();

  const cc = new ChatController(bm.getPage("chat"));
  const sc = new SiteController(bm.getPage("site"));
  await sc.init();

  log("🚀 SYSTEM STARTED WITH FULL LOGGING");

  while (true) {
    try {
      await sc.bringToFront();
      let inTask = await sc.isInTask();

      if (!inTask) {
        log("📦 Dashboard detected → clicking Get New Task");
        await sc.clickGetNewTask();
        await sc.page.waitForSelector('img[alt="Input"]', { visible: true, timeout: 60000 });
      }

      // CRITICAL: Ensure fresh image is loaded before starting timer
      await sc.waitForNewTaskImage(previousImageSrc);
      const taskStartTime = Date.now();
      
      previousImageSrc = await sc.getInputImageSrc();
      log(`🆕 Task #${totalTasks + 1} READY`);

      const promptContext = await sc.captureTask();

      // AI processing phase
      await cc.bringToFront();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let aiResponseText = "";
      try {
        aiResponseText = await cc.askForEvaluation(promptContext, controller.signal);
      } finally {
        clearTimeout(timeout);
      }

      // Return to Tool for user manual action
      await sc.bringToFront();
      log("⏳ AI Done. Awaiting manual labeling and 'Done'/'Next' click...");

      const action = await sc.waitForUserAction();

      // Calculate Metrics
      const duration = parseFloat(((Date.now() - taskStartTime) / 1000).toFixed(1));
      totalTasks++;
      totalSessionTime += duration;

      const statusMsg = `✅ Task ${totalTasks} | Time: ${duration}s | Total: ${(totalSessionTime / 60).toFixed(1)}m | Speed: ${(3600 / (totalSessionTime / totalTasks)).toFixed(1)} tasks/hr`;
      
      log(statusMsg);
      saveToLogFile(statusMsg); // Record to TXT
      saveToCSV(totalTasks, duration, totalTasks, totalSessionTime); // Record to CSV

      if (action === "DONE") {
        log("🛑 STOP REQUESTED");
        break;
      }

      if (action === "NEXT") {
        log("➡️ Proceeding to next image...");
        await Utils.sleep(2000);
        continue;
      }

    } catch (err: any) {
      const errorMsg = `⚠️ ERROR: ${err.message}`;
      log(errorMsg);
      saveToLogFile(errorMsg);
      await Utils.sleep(3000);
      try {
        await sc.page.goto(CONFIG.URLS.site, { waitUntil: "networkidle2" });
        previousImageSrc = null;
      } catch {}
    }
  }

  log("SCRIPT STOPPED");
  process.exit(0);
}

main().catch((e) => {
  saveToLogFile(`FATAL: ${e.message}`);
});