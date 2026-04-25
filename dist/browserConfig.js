// import { addExtra } from 'puppeteer-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import puppeteerVanilla from 'puppeteer-core';
// // We cast to 'any' to bypass the 'createBrowserFetcher' version mismatch
// const puppeteer = addExtra(puppeteerVanilla as any);
// puppeteer.use(StealthPlugin());
// export default puppeteer;
import { addExtra } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerVanilla from 'puppeteer-core';
// Initialize the stealth plugin
const puppeteer = addExtra(puppeteerVanilla);
puppeteer.use(StealthPlugin());
export default puppeteer;
