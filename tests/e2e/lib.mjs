// helpers for live-site browser tests
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const { chromium } = (() => { try { return require('playwright'); } catch { return require((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/playwright'); } })();
export const BASE = 'http://localhost:8787';
export const PW = 'Test-pass-1234';
export const EMAIL = {
  michal: 'michal@levibarak.example.co.il', yoav: 'yoav@levibarak.example.co.il', shira: 'shira@levibarak.example.co.il', ori: 'ori@levibarak.example.co.il',
  dana: 'dana.cohen@example.com', yael: 'yael@friedman-law.example.com', avital: 'avital@kav.example.com', ron: 'ron@archiflow.example.com',
};
export async function newPage(browser, w = 1366, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/__test/')) page.errors.push(`http ${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`); });
  return page;
}
export async function login(page, who, pw = PW) {
  await page.goto(BASE + '/#/login');
  await page.fill('#lg-e', EMAIL[who] || who);
  await page.fill('#lg-p', pw);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => !location.hash.includes('/login') && !document.body.innerText.includes('טוען נתונים'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
}
export async function go(page, route) {
  await page.evaluate((r) => { location.hash = r; }, route);
  await page.waitForTimeout(250);
  await settle(page);
}
export async function settle(page) {
  // wait for pending writes + reload to finish
  for (let i = 0; i < 60; i++) { const busy = await page.evaluate(() => document.body.innerText.includes('טוען נתונים')); if (!busy) break; await page.waitForTimeout(100); }
  await page.waitForTimeout(500);
}
export async function sql(q) { const r = await fetch(BASE + '/__test/sql', { method: 'POST', body: q }); return r.json(); }
export const text = (page) => page.evaluate(() => document.body.innerText);
