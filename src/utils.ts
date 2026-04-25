export default class Utils {
  static async sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  static formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  static async countDown(seconds: number) {
    for (let i = Math.ceil(seconds); i > 0; i--) {
      process.stdout.write(`⏳ Mimicking human behavior. Wait remaining: ${i}s... \r`);
      await Utils.sleep(1000);
    }
  }
}

export const log = (...args: any[]) => {
  const now = new Date();
  const timestamp = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  console.log(timestamp, ...args);
};