import BrowserMan from "./BrowserMan.js";
import ChatController from "./ChatController.js";
import { SiteController } from "./SiteController.js";
import CONFIG from "./config.js";
import Utils, { log } from "./utils.js";
import * as fs from "fs";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "task_logs.txt");
const CSV_FILE_PATH = path.join(process.cwd(), "tasks.csv");

// --- TRACKING ---
let totalTasks = 0;
let totalSessionTime = 0; // seconds
// ----------------

// =========================
// TXT LOGGING
// =========================
function saveToLogFile(message: string) {
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(LOG_FILE_PATH, `[${timestamp}] ${message}\n`);
}

// =========================
// INIT CSV
// =========================
function initializeCSV() {
  const header =
    "Timestamp,TaskNumber,TaskTimeSeconds,TotalTasks,TotalTimeSeconds,FormattedTotalTime,AvgTaskTime,TasksPerHour\n";

  if (!fs.existsSync(CSV_FILE_PATH)) {
    fs.writeFileSync(CSV_FILE_PATH, header);
    return;
  }

  const content = fs.readFileSync(CSV_FILE_PATH, "utf-8");
  if (!content.startsWith("Timestamp")) {
    fs.writeFileSync(CSV_FILE_PATH, header + content);
  }
}

// =========================
// LOAD LAST SESSION
// =========================
function loadPreviousTotals() {
  if (!fs.existsSync(CSV_FILE_PATH)) return;

  const lines = fs.readFileSync(CSV_FILE_PATH, "utf-8").trim().split("\n");
  if (lines.length <= 1) return;

  const lastRow = lines[lines.length - 1].split(",");

  totalTasks = parseInt(lastRow[3]) || 0;
  totalSessionTime = parseFloat(lastRow[4]) || 0;

  log(`🔁 Resuming → Tasks: ${totalTasks}, Time: ${totalSessionTime}s`);
}

// =========================
// SAVE CSV
// =========================
function saveToCSV(
  taskNumber: number,
  taskTime: number,
  totalTasks: number,
  totalTime: number
) {
  const timestamp = new Date().toLocaleString();

  const avgTaskTime = totalTime / totalTasks;
  const tasksPerHour = 3600 / avgTaskTime;

  const minutes = Math.floor(totalTime / 60);
  const seconds = (totalTime % 60).toFixed(1);
  const formattedTotalTime = `${minutes}m ${seconds}s`;

  const row = `${timestamp},${taskNumber},${taskTime},${totalTasks},${totalTime},${formattedTotalTime},${avgTaskTime.toFixed(
    2
  )},${tasksPerHour.toFixed(2)}\n`;

  fs.appendFileSync(CSV_FILE_PATH, row);
}

// =========================
// MAIN
// =========================
async function main() {
  initializeCSV();
  loadPreviousTotals();

  await BrowserMan.startBrowser();
  const browser = await BrowserMan.connect();
  const bm = new BrowserMan(browser);
  await bm.init();

  const cc = new ChatController(bm.getPage("chat"));
  const sc = new SiteController(bm.getPage("site"));
  await sc.init();

  log("🚀 Prism Labeller Assistant (Human-in-the-Loop Mode)");

  while (true) {
    try {
      await sc.bringToFront();

      // 1. Enter task view if we aren't already
      const inTask = await sc.isInTask();
      if (!inTask) {
        await sc.clickGetNewTask();
        await Utils.sleep(2000); // Wait for transition
      }

      const taskStartTime = Date.now(); // Start timer for the task
      log(`--- Assisting Task #${totalTasks + 1} ---`);

      // 2. Capture task and read available tools
      const promptContext = await sc.captureTask();

      // 3. Switch to Gemini and ask for Table
      await cc.bringToFront();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2min timeout

      let aiResponseText = "";
      try {
        aiResponseText = await cc.askForEvaluation(promptContext, controller.signal);
      } finally {
        clearTimeout(timeout);
      }

      log("\n🤖 --- GEMINI RESPONSE ---");
      console.log(aiResponseText);
      log("-------------------------\n");

      // 4. Switch back to Prism tool so the user can do the manual work
      await sc.bringToFront();
      log("⏳ Awaiting human labeling... Work in the browser, then click 'Done' or 'Done & Next Task'.");

      // 5. Freeze automation and wait for Human click
      const userAction = await sc.waitForUserAction();

      // 6. Calculate time and update tracking
      const durationSeconds = parseFloat(((Date.now() - taskStartTime) / 1000).toFixed(1));
      totalTasks++;
      totalSessionTime += durationSeconds;

      const avgTaskTime = totalSessionTime / totalTasks;
      const tasksPerHour = 3600 / avgTaskTime;
      const minutes = Math.floor(totalSessionTime / 60);
      const seconds = (totalSessionTime % 60).toFixed(1);

      const statusMsg =
        `✅ Task #${totalTasks} | ` +
        `Time: ${durationSeconds}s | ` +
        `Total: ${minutes}m ${seconds}s | ` +
        `Avg: ${avgTaskTime.toFixed(1)}s | ` +
        `Speed: ${tasksPerHour.toFixed(1)} tasks/hr`;

      log(statusMsg);
      saveToLogFile(statusMsg);
      saveToCSV(totalTasks, durationSeconds, totalTasks, totalSessionTime);

      // 7. Handle routing based on User click
      if (userAction === "DONE") {
        log(`✅ User clicked 'Done'. Session complete. Total assisted tasks: ${totalTasks}`);
        break; // Exits the loop and stops the script
      } else {
        log(`➡️ User clicked 'Done & Next Task'. Loading next task...`);
        await Utils.sleep(3000); // Give the site time to load the next task before looping
      }

    } catch (err: any) {
      const errorMsg = `⚠️ Task Error: ${err.message}`;
      log(errorMsg);
      saveToLogFile(errorMsg);
      await Utils.sleep(3000);
      
      // Attempt to recover by returning to Dashboard
      try {
        await sc.bringToFront();
        await sc.page.goto(CONFIG.URLS.site, { waitUntil: "networkidle2" });
      } catch {
        // Ignore fallback errors
      }
    }
  }

  log("Script gracefully exited.");
  process.exit(0);
}

// =========================
// START
// =========================
main().catch((e) => {
  saveToLogFile(`FATAL SCRIPT ERROR: ${e.message}`);
});