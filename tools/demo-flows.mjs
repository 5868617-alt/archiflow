import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/playwright'); } })();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push(m.text()); });
const url = new URL('../dist/test.html', import.meta.url).href;
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
const log = (ok, msg) => console.log((ok ? '✓ ' : '✗ ') + msg);
const getDb = () => page.evaluate(() => JSON.parse(localStorage.getItem('archiflow.demo.v3')));
const go = async (path, user) => { await page.evaluate(([p, u]) => { const v = JSON.parse(localStorage.getItem('archiflow.demo.v3')); v.path = p; if (u) v.userId = u; localStorage.setItem('archiflow.demo.v3', JSON.stringify(v)); }, [path, user]); await page.reload(); await page.waitForTimeout(250); };

// 1 login
await page.waitForSelector('text=כניסה לחשבון');
await page.click('button[type=submit]');
await page.waitForSelector('h1:has-text("טוב, יואב")', { timeout: 3000 }).then(() => log(true, 'login as Yoav')).catch(() => log(false, 'login'));

// 2 create task with validation
await go('/tasks?new=1');
await page.click('.modal-foot .btn.primary');
log(await page.isVisible('text=יש להזין כותרת'), 'task form validation');
await page.fill('#tf-title', 'בדיקת זרימה – משימה חדשה');
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(200);
log((await getDb()).db.tasks.some((t) => t.title === 'בדיקת זרימה – משימה חדשה'), 'task created & persisted');

// 3 plan annotation
await go('/plans/pl_cohen_floor');
const before = (await getDb()).db.annotations.length;
await page.click('button.tool[title="ממצא"]');
const box = await page.locator('.pv-inner svg').boundingBox();
await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.3);
await page.fill('#an-t', 'ממצא בדיקה');
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(200);
log((await getDb()).db.annotations.length === before + 1, 'plan issue added');
// measurement
await page.click('button.tool[title="מדידה"]');
await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5);
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
const mtext = await page.inputValue('#an-t');
log(/מ׳/.test(mtext), 'measurement computed: ' + mtext);
await page.click('.modal-foot .btn.primary');
// auto check simulation
await page.click('text=בדיקה אוטומטית');
await page.click('text=הרצת בדיקה מדומה');
await page.waitForTimeout(1900);
log((await getDb()).db.annotations.filter((a) => a.simulated).length === 3, 'simulated findings added');

// 4 upload plan DWG sample
await go('/plans?upload=1');
await page.click('text=קובץ DWG לדוגמה');
await page.selectOption('#up-p', 'p_friedman');
await page.fill('#up-n', 'A-103');
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(1600);
log((await getDb()).db.plans.some((p) => p.number === 'A-103' && p.versions[0].processing === 'תצוגה לא נתמכת'), 'DWG upload stored without preview');

// 5 send for approval & status suggestion
await go('/projects/p_ohayon/approvals');
await page.click('.filters >> text=שליחה לאישור');
await page.fill('#sa-t', 'חלופות תכנון לאישור');
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(200);
log(await page.isVisible('text=לעדכן את סטטוס הפרויקט?'), 'status change suggested (not forced)');
log((await getDb()).db.projects.find((p) => p.id === 'p_ohayon').status === 'תכנון ראשוני', 'status unchanged until confirmed');
await page.click('text=כן, לעדכן ל"ממתין לאישור"');
await page.waitForTimeout(200);
log((await getDb()).db.projects.find((p) => p.id === 'p_ohayon').status === 'ממתין לאישור', 'status changed after confirm');

// 6 client approves in portal
await go('/portal/approvals', 'cu_dana');
await page.locator('.card.pad', { hasText: 'ברז מטבח נשלף' }).locator('button:has-text("אישור")').click();
await page.click('.modal-foot .btn');
await page.waitForTimeout(200);
const db6 = (await getDb()).db;
log(db6.approvals.find((a) => a.id === 'ap_1').status === 'אושר' && db6.specItems.find((s) => s.id === 's3').status === 'מאושר', 'client approval updates approval + spec');
log(db6.notifications.some((n) => n.userId === 'u_yoav' && n.title.includes('אושר')), 'studio notified of decision');
// change request requires comment
await page.locator('.card.pad', { hasText: 'מנורות תלייה' }).locator('button:has-text("בקשת שינוי")').click();
await page.click('.modal-foot .btn');
log(await page.isVisible('text=נשמח לדעת מה לשנות'), 'change request requires comment');
await page.keyboard.press('Escape');

// 7 portal blocks office route
await go('/budget', 'cu_dana');
log(await page.isVisible('text=אין לך הרשאה'), 'client blocked from office screens');

// 8 member restrictions
await go('/budget', 'u_shira');
log(await page.isVisible('text=אין לך הרשאה'), 'member blocked from budget');

// 9 subscription downgrade + feature lock
await go('/billing/change?plan=starter', 'u_michal');
await page.click('text=המשך לסיכום');
log(await page.isVisible('text=השימוש הנוכחי חורג'), 'downgrade over-limit warning');
await page.click('text=אישור שינוי');
await page.waitForTimeout(200);
await go('/billing');
await page.click('text=סימולציית סוף תקופה');
await page.waitForTimeout(200);
await go('/procurement');
log(await page.isVisible('text=לא כלול במסלול Starter'), 'procurement locked on Starter');
await go('/billing/change?plan=pro');
await page.click('text=המשך לסיכום');
await page.click('text=אישור שדרוג');
await page.waitForTimeout(200);
log((await getDb()).db.officeSubscription.planId === 'pro', 'upgrade back to Pro');

// 10 super admin pricing change logs
await go('/admin/pricing', 'sa_ron');
await page.fill('#pr-m-starter', '159');
await page.locator('.card', { hasText: 'Starter' }).locator('text=שמירת שינויים').click();
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(200);
const db10 = (await getDb()).db;
log(db10.subscriptionPlans[0].priceMonthly === 159 && db10.pricingChanges[0].to === '₪159', 'pricing change logged');

// 11 expense overrun notification
await go('/expenses?new=1', 'u_yoav');
await page.selectOption('#ef-p', 'p_stern');
await page.fill('#ef-de', 'בדיקת חריגה');
await page.selectOption('#ef-c', 'נגרות');
await page.fill('#ef-a', '60000');
log(await page.isVisible('text=מעבר לתקציב'), 'overrun warning before save');
await page.click('.modal-foot .btn.primary');
await page.waitForTimeout(200);
log((await getDb()).db.notifications.some((n) => n.title.includes('חריגה בסעיף נגרות')), 'budget alert notification');

// 12 reset
await page.click('text=איפוס נתוני הדגמה');
await page.click('.demo-strip >> text=כן, אפס');
await page.waitForTimeout(300);
log(!(await getDb()).db.tasks.some((t) => t.title.startsWith('בדיקת זרימה')), 'demo reset');

console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no runtime errors');
await browser.close();
