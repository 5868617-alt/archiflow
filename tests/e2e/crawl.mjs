// Visits every screen as each role on the live site (against the local gateway) and flags errors.
import { chromium, newPage, login, go, BASE } from './lib.mjs';
const P1 = 'e0000000-0000-4000-8000-000000000001', P2 = 'e0000000-0000-4000-8000-000000000002', P3 = 'e0000000-0000-4000-8000-000000000003';
const proj = (id) => ['', '/tasks', '/plans', '/specs', '/documents', '/meetings', '/procurement', '/budget', '/fees', '/approvals', '/team', '/messages', '/activity'].map((t) => `/projects/${id}${t}`);
const routes = {
  yoav: ['/dashboard', '/projects', '/projects?new=1', ...proj(P1), '/projects/' + P2, '/clients', '/clients/c0000000-0000-4000-8000-000000000001', '/tasks', '/tasks?tab=kanban', '/tasks?tab=calendar', '/tasks?tab=templates', '/tasks?open=f0000000-0000-4000-8000-000000000001',
    '/plans', '/plans/70000000-0000-4000-8000-000000000001', '/plans/70000000-0000-4000-8000-000000000001/compare', '/plans/70000000-0000-4000-8000-000000000002', '/plans?upload=1',
    '/specs', '/specs/' + P1, '/documents', '/documents/40000000-0000-4000-8000-000000000001', '/documents/40000000-0000-4000-8000-000000000002', '/approvals', '/approvals?open=60000000-0000-4000-8000-000000000001', '/calendar', '/calendar?view=month', '/calendar?new=1',
    '/suppliers', '/suppliers/b0000000-0000-4000-8000-000000000001', '/procurement', '/procurement/30000000-0000-4000-8000-000000000001', '/procurement?new=1', '/budget', '/expenses', '/expenses?new=1', '/fees', '/team', '/team?tab=perms', '/team?tab=assign', '/team?tab=invites', '/team/11111111-0000-4000-8000-000000000005',
    '/messages', '/notifications', '/notifications?tab=email', '/notifications?tab=prefs', '/settings', '/settings?tab=integrations', '/settings?tab=security', '/profile', '/billing', '/billing/change', '/billing/cancel', '/pricing', '/help', '/help/h1', '/support', '/portal', '/admin', '/nope'],
  michal: ['/dashboard', '/billing', '/billing/change?plan=starter', '/team?tab=perms', '/settings'],
  shira: ['/dashboard', '/projects', '/projects/' + P3, '/budget', '/billing', '/projects/' + P1 + '/budget', '/documents/40000000-0000-4000-8000-000000000001', '/tasks'],
  dana: ['/portal', '/portal/approvals', '/portal/drawings', '/portal/drawings/70000000-0000-4000-8000-000000000001', '/portal/drawings/70000000-0000-4000-8000-000000000002', '/portal/documents', '/portal/meetings', '/portal/messages', '/portal/history', '/portal/notifications', '/dashboard'],
  yael: ['/portal', '/portal/approvals'],
  ron: ['/admin', '/admin/usage', '/admin/offices', '/admin/offices/a0000000-0000-4000-8000-000000000001', '/admin/users', '/admin/subscriptions', '/admin/pricing', '/admin/pricing-log', '/admin/tickets', '/admin/announcements', '/admin/events', '/admin/audit', '/admin/retention', '/admin/settings', '/dashboard'],
  avital: ['/dashboard', '/procurement', '/messages', '/fees'],
};
const width = Number(process.argv[2] || 1366);
const only = process.argv[3];
const browser = await chromium.launch();
const report = [];
for (const [who, list] of Object.entries(routes)) {
  if (only && only !== who) continue;
  const page = await newPage(browser, width, 900);
  await login(page, who);
  for (const r of list) {
    page.errors = [];
    await go(page, r);
    const info = await page.evaluate(() => ({ text: document.body.innerText.slice(0, 30000), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelector('h1')?.innerText || '' }));
    const errs = page.errors.filter((e) => !e.includes('ERR_TUNNEL') && !e.includes('fonts.g') && !e.includes('Failed to load resource'));
    const flags = [];
    if (errs.length) flags.push('ERR: ' + errs.join(' | ').slice(0, 400));
    if (info.sw > info.cw + 1) flags.push(`OVERFLOW ${info.sw}>${info.cw}`);
    if (/undefined|NaN|Invalid Date|\[object Object\]/.test(info.text)) flags.push('UNDEF/NaN: ' + (info.text.match(/.{0,40}(undefined|NaN|Invalid Date|\[object Object\]).{0,40}/) || [''])[0].replace(/\n/g, ' '));
    if (/סימולציה|מדומה|מדומים|הדמיה|בדמו|דמו –|הנחת דמו|מצב דמו/.test(info.text)) flags.push('DEMO-TEXT: ' + (info.text.match(/.{0,50}(סימולציה|מדומה|מדומים|הדמיה|בדמו|דמו –|הנחת דמו|מצב דמו).{0,30}/g) || []).slice(0, 3).join(' ‖ ').replace(/\n/g, ' '));
    report.push(`${flags.length ? '✗' : '✓'} ${who} ${r} [${info.h1.slice(0, 40)}] ${flags.join(' ; ')}`);
  }
  await page.context().close();
}
console.log(process.argv[4] ? report.join('\n') : (report.filter((l) => l.startsWith('✗')).join('\n') || 'all clean'));
console.log(`${report.length} routes checked, ${report.filter((l) => l.startsWith('✗')).length} flagged`);
await browser.close();
