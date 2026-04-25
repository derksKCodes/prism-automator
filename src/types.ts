import { Browser, Page } from "puppeteer-core";

export interface BrowserSession {
  browser: Browser;
  chat: pageInfo;
  site: pageInfo;
  port: number;
}

export interface IEventManager {
  goal: number;
  active: number;
  inactive: number;
  rem: number;
  nowMS: number;

  clear: () => void;
  formatEvents(): string;
  isTabInactive(): boolean;
  displayEvents(forHowLong: number): void;
  stopFocusEvents():void;
}

export interface pageInfo {
  readonly url: string;
  page: Page;
}
