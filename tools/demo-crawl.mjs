import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/playwright'); } })();
const routes = {
  u_yoav: ['/dashboard', '/projects', '/projects?new=1', '/projects/p_cohen', '/projects/p_cohen/tasks', '/projects/p_cohen/plans', '/projects/p_cohen/specs', '/projects/p_cohen/documents', '/projects/p_cohen/meetings', '/projects/p_cohen/procurement', '/projects/p_cohen/budget', '/projects/p_cohen/fees', '/projects/p_cohen/approvals', '/projects/p_cohen/team', '/projects/p_cohen/messages', '/projects/p_cohen/activity', '/projects/p_rosen', '/projects/p_hanamal',
    '/clients', '/clients/cl_cohen', '/tasks', '/tasks?tab=kanban', '/tasks?tab=calendar', '/tasks?tab=templates', '/tasks?open=t1', '/plans', '/plans/pl_cohen_floor', '/plans/pl_cohen_floor/compare', '/plans/pl_cohen_elec', '/plans/pl_ohayon_exist', '/plans/pl_cohen_bath', '/plans?upload=1',
    '/specs', '/specs/p_cohen', '/specs/p_mizrahi', '/documents', '/documents/doc_c1', '/documents/doc_f2', '/approvals', '/approvals?open=ap_1', '/calendar', '/calendar?view=month', '/calendar?view=day', '/calendar?new=1', '/meetings/mt_4', '/meetings/mt_1',
    '/suppliers', '/suppliers/sup_hadar', '/procurement', '/procurement/po_4', '/procurement?new=1', '/budget', '/expenses', '/expenses?new=1', '/fees', '/team', '/team?tab=perms', '/team?tab=assign', '/team?tab=invites', '/team/u_shira', '/messages', '/notifications', '/notifications?tab=email', '/notifications?tab=prefs',
    '/settings', '/settings?tab=integrations', '/settings?tab=security', '/profile', '/billing', '/billing/change', '/billing/cancel', '/billing/invoices/inv0', '/pricing', '/help', '/help/h1', '/support', '/support/tk1', '/portal', '/nope'],
  u_michal: ['/dashboard', '/billing', '/billing/change?plan=starter', '/team?tab=perms'],
  u_shira: ['/dashboard', '/projects', '/projects/p_rosen', '/budget', '/billing', '/projects/p_cohen/budget', '/documents/doc_c1', '/tasks'],
  cu_dana: ['/portal', '/portal/approvals', '/portal/drawings', '/portal/drawings/pl_cohen_floor', '/portal/drawings/pl_cohen_elec', '/portal/documents', '/portal/meetings', '/portal/messages', '/portal/history', '/portal/notifications', '/dashboard'],
  cu_yael: ['/portal', '/portal/approvals'],
  sa_ron: ['/admin', '/admin/usage', '/admin/offices', '/admin/offices/off_1', '/admin/offices/off_5', '/admin/users', '/admin/users/u_noa', '/admin/subscriptions', '/admin/pricing', '/admin/pricing-log', '/admin/tickets', '/admin/tickets/tk1', '/admin/announcements', '/admin/events', '/admin/audit', '/admin/retention', '/admin/settings', '/dashboard'],
  anon: ['/login', '/register', '/forgot', '/onboarding', '/pricing'],
};
const width = Number(process.argv[2] || 1366);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 } });
let errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); });
await page.goto(new URL('../dist/test.html', import.meta.url).href);
const report = [];
for (const [user, list] of Object.entries(routes)) {
  for (const r of list) {
    errors = [];
    await page.evaluate(([u, path]) => { localStorage.setItem('archiflow.demo.v3', JSON.stringify({ ...(JSON.parse(localStorage.getItem('archiflow.demo.v3') || '{}')), userId: u === 'anon' ? 'u_yoav' : u, path })); }, [user, r]);
    await page.reload();
    await page.waitForTimeout(r.includes('projects') && !r.includes('/p_') ? 450 : 150);
    const info = await page.evaluate(() => ({ text: document.body.innerText.slice(0, 20000), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelector('h1')?.innerText || '' }));
    const flags = [];
    if (errors.length) flags.push('ERR: ' + errors.join(' | ').slice(0, 300));
    if (info.text.includes('בבנייה')) flags.push('STUB');
    if (info.sw > info.cw + 1) flags.push(`OVERFLOW ${info.sw}>${info.cw}`);
    if (info.text.includes('undefined') || info.text.includes('NaN')) flags.push('UNDEF/NaN');
    report.push(`${flags.length ? '✗' : '✓'} ${user} ${r} [${info.h1.slice(0, 40)}] ${flags.join(' ; ')}`);
  }
}
console.log(process.argv[3] ? report.join('\n') : (report.filter((l) => l.startsWith('✗')).join('\n') || 'all clean'));
console.log(`${report.length} routes checked`);
await browser.close();
