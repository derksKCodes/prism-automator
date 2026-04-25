import { Page } from "puppeteer-core";
import CONFIG from "./config.js";
import Utils, { log } from "./utils.js";

async function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("Operation aborted"));
    signal.addEventListener("abort", onAbort);
    promise.then(resolve).catch(reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export default class ChatController {
  constructor(private page: Page) {}

  async bringToFront(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("Operation aborted");
    await this.page.bringToFront();
    await Utils.sleep(200);
    await this.page.mouse.click(0, 0);
  }

  private async cancelPreviousUploads(signal?: AbortSignal) {
    if (signal?.aborted) throw new Error("Operation aborted");
    await this.page.$$eval("uploader-file-preview.file-preview-chip", (previews) => {
    //   previews.forEach((p) => p.querySelector("button.cancel-button")?.click());
    previews.forEach((p) => (p.querySelector("button.cancel-button") as HTMLElement)?.click());
    });
  }

  async askForEvaluation(promptContext: string, signal?: AbortSignal): Promise<string> {
    if (signal?.aborted) throw new Error("Operation aborted");
    await this.bringToFront(signal);

    const chatInputSelector = "div.ql-editor.textarea";
    await abortable(this.page.waitForSelector(chatInputSelector), signal);

    const fullMessage = `${CONFIG.PROMPT}\n\n**UI Context:**\n${promptContext}`;
    
    await this.cancelPreviousUploads(signal);
    await Utils.sleep(300);

    // Upload File
    await this.page.click('button[aria-controls="upload-file-menu"]');
    await Utils.sleep(400);
    const fileChooserPromise = this.page.waitForFileChooser();
    await this.page.click('button[data-test-id="local-images-files-uploader-button"]');
    
    const fileChooser = await abortable(fileChooserPromise, signal);
    await fileChooser.accept([CONFIG.TEMP_IMAGE_PATH]);
    await Utils.sleep(400);

    // Wait for image upload processing
    const sendBtnSelector = 'button.send-button.submit[aria-disabled="false"]';
    await abortable(this.page.waitForSelector(sendBtnSelector, { timeout: 60000 }), signal);

    // Set Text
    await this.page.evaluate((sel, text) => {
      const editor = document.querySelector(sel) as HTMLElement;
      if (editor) {
        editor.textContent = text;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, chatInputSelector, fullMessage);

    // Mark old responses
    await this.page.evaluate(() => {
      document.querySelectorAll("model-response").forEach(el => el.setAttribute("data-old", "true"));
    });

    await this.page.click(sendBtnSelector);
    log("Prompt and Image sent. Awaiting Gemini table generation...");
    
    return await this._waitForTableResponse(signal);
  }

  private async _waitForTableResponse(signal?: AbortSignal): Promise<string> {
    // Wait for the new response to appear
    const newResponse = await abortable(
      this.page.waitForSelector('model-response:not([data-old="true"])', { timeout: 60000 }), signal
    );
    
    if (!newResponse) throw new Error("New model-response did not appear!");

    // Wait until Gemini stops generating (the send button re-appears/stops spinning)
    await abortable(
      this.page.waitForFunction(() => {
        const btn = document.querySelector('button.send-button');
        return btn && !btn.hasAttribute('disabled') && !document.querySelector('.generating-indicator');
      }, { polling: 1000, timeout: 120000 }), signal
    );

    await Utils.sleep(1000);

    // Extract text containing the table
    const resultText = await this.page.evaluate((res) => {
      return (res as HTMLElement).innerText || "";
    }, newResponse);

    return resultText;
  }
}