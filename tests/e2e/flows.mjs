// End-to-end write flows on the live site, verified in the database. Run after tests/e2e/restart.sh.
import fs from 'fs';
import { chromium, newPage, login, go, settle, BASE, EMAIL } from './lib.mjs';
const results = [];
const log = (ok, msg, extra = '') => { results.push(ok); console.log((ok ? '✓ ' : '✗ ') + msg + (extra && !ok ? '  → ' + extra : '')); };
const q = async (sql) => { const r = await (await fetch(BASE + '/__test/sql', { method: 'POST', body: sql })).json(); if (r.code) console.log('SQL ERR', r.err); return r.out; };
const badToasts = async (page) => page.evaluate(() => [...document.querySelectorAll('.toast.bad')].map((t) => t.textContent));
const waitWrites = async (page) => { await page.waitForTimeout(400); for (let i = 0; i < 80; i++) { if (!(await page.evaluate(() => document.body.innerText.includes('שומר…')))) break; await page.waitForTimeout(100); } await page.waitForTimeout(400); };
const P1 = 'e0000000-0000-4000-8000-000000000001';

// a real PDF and PNG to upload
const pdfBytes = fs.readFileSync(new URL('./.storage/plans/a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001/v2/A-101.pdf', import.meta.url));
fs.writeFileSync('/tmp/claude-0/kitchen.pdf', pdfBytes);
fs.writeFileSync('/tmp/claude-0/receipt.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
fs.writeFileSync('/tmp/claude-0/survey.dwg', Buffer.from('AC1027 not a real dwg'));

const browser = await chromium.launch();
const page = await newPage(browser);
await login(page, 'yoav');
log(page.url().includes('/dashboard'), 'login as admin (Yoav) lands on dashboard');

// ---------------------------------------------------------------- client + project
await go(page, '/clients?new=1');
await page.click('.modal-foot .btn.primary');
log(await page.isVisible('text=יש להזין שם לקוח'), 'client form validation');
await page.fill('#cf-name', 'משפחת בדיקה');
await page.fill('#cf-city', 'חיפה');
await page.fill('#ct-n0', 'רות בדיקה');
await page.fill('#ct-e0', 'ruth.test@example.com');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q("select count(*) from public.clients c join public.client_contacts ct on ct.client_id = c.id where c.name = 'משפחת בדיקה' and ct.email = 'ruth.test@example.com'")) === '1', 'client + contact saved in DB', await badToasts(page));
const clientId = await q("select id from public.clients where name = 'משפחת בדיקה'");

await go(page, '/projects?new=1');
await page.fill('#pf-name', 'פרויקט בדיקה חי');
await page.selectOption('#pf-client', clientId);
await page.fill('#pf-city', 'חיפה');
await page.fill('#pf-budget', '500000').catch(() => {});
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
const projectId = await q("select id from public.projects where name = 'פרויקט בדיקה חי'");
log(!!projectId, 'project saved in DB', await badToasts(page));
log((await q(`select count(*) from public.project_assignments where project_id = '${projectId}'`)) === '1', 'project lead assigned');

// ---------------------------------------------------------------- tasks
await go(page, '/tasks?new=1');
await page.fill('#tf-title', 'משימה חיה לבדיקה');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
const taskId = await q("select id from public.tasks where title = 'משימה חיה לבדיקה'");
log(!!taskId, 'task saved in DB', await badToasts(page));
await go(page, `/tasks?open=${taskId}`);
await page.fill('input[aria-label="הוספת תגובה…"]', 'תגובה מהבדיקה');
await page.press('input[aria-label="הוספת תגובה…"]', 'Enter');
await waitWrites(page);
log((await q(`select count(*) from public.task_comments where task_id = '${taskId}' and body = 'תגובה מהבדיקה'`)) === '1', 'task comment saved', await badToasts(page));

// ---------------------------------------------------------------- project status via server function
await go(page, `/projects/${projectId}`);
await page.selectOption('select[aria-label="סטטוס פרויקט"]', 'תכנון ראשוני');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q(`select status from public.projects where id = '${projectId}'`)) === 'initial_design', 'project status changed through set_project_status()', await badToasts(page));
log((await q(`select count(*) from public.project_status_history where project_id = '${projectId}'`)) === '1', 'status history recorded');

// ---------------------------------------------------------------- real plan upload, finding, task, calibration, measurement
await go(page, '/plans?upload=1');
await page.selectOption('#up-p', projectId);
await page.fill('#up-n', 'A-201');
await page.setInputFiles('.dropzone input[type=file]', '/tmp/claude-0/kitchen.pdf');
await page.fill('#up-ti', 'תכנית מטבח');
await page.click('.modal-foot .btn.primary');
await page.waitForFunction(() => location.hash.includes('/plans/') && !location.hash.includes('upload'), null, { timeout: 15000 }).catch(() => {});
await waitWrites(page);
const planId = await q("select id from public.plans where number = 'A-201'");
const planPath = await q(`select file_path from public.plan_versions where plan_id = '${planId}'`);
log(!!planId && planPath.endsWith('.pdf') && fs.existsSync(new URL('./.storage/plans/' + planPath, import.meta.url)), 'PDF uploaded to storage + plan & version rows', await badToasts(page));
await go(page, `/plans/${planId}`);
await page.waitForSelector('.pv-inner svg image', { timeout: 15000 }).catch(() => {});
const img = await page.locator('.pv-inner svg image').count();
log(img === 1, 'uploaded PDF rendered in the viewer (pdf.js)');
const box = await page.locator('.pv-inner svg').boundingBox();
await page.click('button.tool[title="ממצא"]');
await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.3);
await page.fill('#an-t', 'ממצא חי');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q(`select count(*) from public.plan_annotations where plan_id = '${planId}' and body = 'ממצא חי' and kind = 'issue'`)) === '1', 'finding saved on the plan version', await badToasts(page));
await page.locator('button:has-text("יצירת משימה")').first().click();
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q(`select count(*) from public.plan_annotations a join public.tasks t on t.id = a.task_id where a.plan_id = '${planId}'`)) === '1', 'finding converted to a task (annotation_to_task)', await badToasts(page));
await page.click('button.tool[title="מדידה"]');
await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.6);
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
await page.waitForTimeout(300);
log(await page.isVisible('text=כיול קנה מידה'), 'first measurement asks for calibration');
await page.fill('#cal-m', '4.00');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q(`select array_to_string(tags, ',') from public.plans where id = '${planId}'`)).startsWith('cal:1:'), 'calibration stored on the plan', await badToasts(page));
await page.click('button.tool[title="מדידה"]').catch(() => {});
await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.7);
await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.7);
await page.waitForTimeout(300);
const mtext = await page.inputValue('#an-t').catch(() => '');
log(/^4\.00 מ׳/.test(mtext), 'calibrated measurement = 4.00 m', mtext);
await page.click('.modal-foot .btn.primary');
await waitWrites(page);

// DWG: stored without preview
await go(page, '/plans?upload=1');
await page.selectOption('#up-p', projectId);
await page.fill('#up-n', 'S-001');
await page.setInputFiles('.dropzone input[type=file]', '/tmp/claude-0/survey.dwg');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q("select processing from public.plan_versions v join public.plans p on p.id = v.plan_id where p.number = 'S-001'")) === 'unsupported', 'DWG stored, marked as no-preview', await badToasts(page));

// ---------------------------------------------------------------- share plan with the client and request approval
await go(page, `/clients/${clientId}`);
await page.locator('button:has-text("הזמנה לפורטל")').first().click();
await waitWrites(page);
log((await q(`select portal_status from public.client_contacts where client_id = '${clientId}'`)) === 'invited', 'portal invitation via invite_client_contact()', await badToasts(page));
log((await q("select count(*) from public.email_outbox where template = 'portal_invite' and to_email = 'ruth.test@example.com'")) === '1', 'portal invite e-mail queued');

await go(page, `/plans/${planId}`);
await page.click('button:has-text("לאישור לקוח")');
await page.waitForTimeout(300);
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q(`select count(*) from public.approvals where ref_id = '${planId}' and status = 'pending'`)) === '1', 'approval created via request_approval()', await badToasts(page));
log((await q(`select shared_with_client::text from public.plans where id = '${planId}'`)) === 'true', 'plan shared with the client by the server');
const keep = page.locator('text=להשאיר'); if (await keep.count()) await keep.first().click();

// ---------------------------------------------------------------- documents with a real file
await go(page, `/projects/${projectId}/documents`);
await page.click('button:has-text("העלאת מסמך")');
await page.setInputFiles('.modal .dropzone input[type=file]', '/tmp/claude-0/kitchen.pdf');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
const docPath = await q(`select v.file_path from public.document_versions v join public.documents d on d.id = v.document_id where d.project_id = '${projectId}'`);
log(docPath.endsWith('.pdf') && fs.existsSync(new URL('./.storage/documents/' + docPath, import.meta.url)), 'document uploaded with its file', await badToasts(page));
await page.waitForSelector('iframe', { timeout: 10000 }).catch(() => {});
log((await page.locator('iframe').count()) === 1, 'PDF document previewed in the page', page.url());

// ---------------------------------------------------------------- finance: budget line, expense with receipt, fee milestone + request
await go(page, `/expenses?new=1`);
await page.selectOption('#ef-p', P1);
await page.fill('#ef-de', 'קבלה חיה');
await page.fill('#ef-a', '1234');
await page.setInputFiles('#ef-r', '/tmp/claude-0/receipt.png');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
const rp = await q("select receipt_path from public.expenses where description = 'קבלה חיה'");
log(!!rp && fs.existsSync(new URL('./.storage/receipts/' + rp, import.meta.url)), 'expense saved with receipt file', await badToasts(page));
await go(page, `/projects/${projectId}/fees`);
await page.click('button:has-text("אבן דרך חדשה")');
await page.fill('#ff-t', 'מקדמה');
await page.fill('#ff-a', '15000');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
const feeId = await q(`select id from public.fee_milestones where project_id = '${projectId}'`);
log(!!feeId, 'fee milestone created', await badToasts(page));
await page.locator('button:has-text("דרישת תשלום")').first().click();
await waitWrites(page);
log((await q(`select status from public.fee_milestones where id = '${feeId}'`)) === 'requested' && (await q("select count(*) from public.email_outbox where template = 'fee_request'")) === '1', 'fee request sent (status + e-mail queued)', await badToasts(page));

// ---------------------------------------------------------------- procurement: send PO
await go(page, '/procurement/30000000-0000-4000-8000-000000000001');
const sendPo = page.locator('button:has-text("שליחה לספק")');
if (await sendPo.count()) { await sendPo.first().click(); await waitWrites(page); }
log(['sent', 'confirmed'].includes(await q("select status from public.purchase_orders where id = '30000000-0000-4000-8000-000000000001'")), 'purchase order status flow works', await badToasts(page));

// ---------------------------------------------------------------- team: invite a member
await go(page, '/team?tab=invites');
await page.locator("main button.btn.primary", { hasText: "הזמנ" }).first().click();
await page.fill('#iv-n', 'גל חדש');
await page.fill('#iv-e', 'gal.new@example.com');
await page.click('.modal-foot .btn.primary');
await waitWrites(page);
log((await q("select status from public.invitations where email = 'gal.new@example.com'")) === 'pending', 'team invitation via invite_member()', await badToasts(page));

// ---------------------------------------------------------------- notifications read
await go(page, '/notifications');
const markAll = page.locator('button:has-text("סימון הכול כנקרא")');
if (await markAll.count()) { await markAll.click(); await waitWrites(page); }
log((await q("select count(*) from public.notifications where user_id = '11111111-0000-4000-8000-000000000002' and read_at is null")) === '0', 'notifications marked read', await badToasts(page));
// ---------------------------------------------------------------- upgrades: command palette, board drag + undo, inline edit, confirmed status drag
await go(page, '/dashboard');
await page.keyboard.press('Control+k');
await page.fill('#global-search', 'משימה חיה');
await page.keyboard.press('Enter');
await settle(page);
log(page.url().includes('/tasks') && page.url().includes(taskId), 'command palette finds a task and opens it');

const dragTo = async (card, zone) => {
  await card.scrollIntoViewIfNeeded(); const a = await card.boundingBox();
  await zone.scrollIntoViewIfNeeded(); const b = await zone.boundingBox();
  await page.mouse.move(a.x + 20, a.y + 12); await page.mouse.down(); await page.mouse.move(a.x + 30, a.y + 24, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + 60, { steps: 10 }); await page.mouse.up();
};
await page.keyboard.press('Escape'); await go(page, '/dashboard');
await go(page, '/tasks'); await settle(page); await page.click('button.tab:has-text("קנבן")'); await settle(page);
const before = await q(`select status from public.tasks where id = '${taskId}'`);
const card = page.locator('.k-card', { hasText: 'משימה חיה לבדיקה' }).first();
const fromCol = await card.evaluate((el) => el.closest('[data-drop]').getAttribute('data-drop'));
const toCol = fromCol === 'בתהליך' ? 'ממתין לאחר' : 'בתהליך';
await dragTo(card, page.locator(`.k-col[data-drop="${toCol}"]`));
await waitWrites(page);
const after = await q(`select status from public.tasks where id = '${taskId}'`);
log(after !== before && ['in_progress', 'waiting'].includes(after), 'task dragged on the board is saved in DB', `${before} → ${after}`);
await page.click('.toast-undo'); await waitWrites(page);
log((await q(`select status from public.tasks where id = '${taskId}'`)) === before, 'undo from the toast restores the task status in DB');

await go(page, '/dashboard'); await go(page, '/tasks'); await settle(page);
const row = page.locator('tr', { hasText: 'משימה חיה לבדיקה' }).first();
await row.locator('select[aria-label^="עדיפות"]').selectOption('דחופה'); await waitWrites(page);
log((await q(`select priority from public.tasks where id = '${taskId}'`)) === 'urgent', 'inline priority edit in the task table is saved', await badToasts(page));

await go(page, '/projects'); await page.click('.btn-group button:has-text("לוח")'); await settle(page);
const pst = await q(`select status from public.projects where id = '${P1}'`);
const pcard = page.locator(`.k-card:has(.code)`).filter({ has: page.locator('.code') }).first();
const pfrom = await pcard.evaluate((el) => el.closest('[data-drop]').getAttribute('data-drop'));
const pid = await pcard.evaluate((el) => el.getAttribute('data-drag-id'));
const pstatus0 = await q(`select status from public.projects where id = '${pid}'`);
const pto = pfrom === 'תכנון ראשוני' ? 'ליד חדש' : 'תכנון ראשוני';
await dragTo(pcard, page.locator(`.k-col[data-drop="${pto}"]`));
await page.waitForTimeout(300);
const asked = await page.isVisible('.modal:has-text("שינוי סטטוס פרויקט")');
log(asked && (await q(`select status from public.projects where id = '${pid}'`)) === pstatus0, 'project dropped on another status asks first and changes nothing yet');
await page.click('.modal-foot .btn.primary'); await waitWrites(page);
log((await q(`select status from public.projects where id = '${pid}'`)) !== pstatus0 && (await q(`select count(*) from public.project_status_history where project_id = '${pid}'`)) !== '0', 'confirmed board drop goes through set_project_status with history', await badToasts(page));

const errsA = page.errors.filter((e) => !/ERR_TUNNEL|fonts|Failed to load resource/.test(e));
await page.context().close();

// ---------------------------------------------------------------- client decides in the portal
const dana = await newPage(browser);
await login(dana, 'dana');
await go(dana, '/portal/approvals');
await dana.locator('.card.pad', { hasText: 'ברז מטבח נשלף' }).locator('button:has-text("אישור")').click();
await dana.click('.modal-foot .btn');
await waitWrites(dana);
log((await q("select status from public.approvals where id = '60000000-0000-4000-8000-000000000001'")) === 'approved' && (await q("select status from public.spec_items where id = '50000000-0000-4000-8000-000000000003'")) === 'approved', 'client approval via decide_approval() updates approval + spec', await badToasts(dana));
log((await q("select count(*) from public.notifications where user_id = '11111111-0000-4000-8000-000000000004' and kind = 'approval'")) !== '0', 'requester notified of the decision');
await go(dana, '/portal/messages');
await dana.fill('input[aria-label="הודעה"]', 'הודעה מהלקוחה');
await dana.press('input[aria-label="הודעה"]', 'Enter');
await waitWrites(dana);
log((await q("select count(*) from public.messages where body = 'הודעה מהלקוחה' and side = 'client'")) === '1', 'client message saved', await badToasts(dana));
const errsB = dana.errors.filter((e) => !/ERR_TUNNEL|fonts|Failed to load resource/.test(e));
await dana.context().close();

// ---------------------------------------------------------------- member limits are enforced by the server, not only hidden
const shira = await newPage(browser);
await login(shira, 'shira');
const forbidden = await shira.evaluate(async (base) => {
  const s = JSON.parse(localStorage.getItem('archiflow.session.v1'));
  const r = await fetch(base + '/rest/v1/expenses', { method: 'POST', headers: { apikey: 'x', Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ office_id: 'a0000000-0000-4000-8000-000000000001', project_id: 'e0000000-0000-4000-8000-000000000001', expense_date: '2026-10-01', category: 'x', description: 'hack', amount: 1 }) });
  return r.status;
}, BASE);
log(forbidden === 403, 'member cannot write expenses even by calling the API directly', String(forbidden));
await shira.context().close();

// ---------------------------------------------------------------- sign-up → confirm e-mail → onboarding → office
const nu = await newPage(browser);
await nu.goto(BASE + '/#/register');
await nu.fill('#rg-n', 'נועם חדש');
await nu.fill('#rg-e', 'noam.new@example.com');
await nu.fill('#rg-p', 'short');
await nu.check('#rg-t').catch(async () => { await nu.click('label[for=rg-t]'); });
await nu.click('button[type=submit]');
log(await nu.isVisible('text=לפחות 10 תווים'), 'weak password rejected');
await nu.fill('#rg-p', 'Strong-pass-2026');
await nu.click('button[type=submit]');
await nu.waitForTimeout(800);
log(await nu.isVisible('text=שלחנו מייל אימות'), 'sign-up asks to confirm the e-mail');
const conf = await (await fetch(BASE + '/__test/confirm?email=noam.new@example.com')).json();
await nu.goto(BASE + conf.link.replace(/^https?:\/\/[^/]+/, ''));
await nu.waitForTimeout(1500);
log(await nu.isVisible('h1:has-text("ברוכים הבאים")') && await nu.isVisible('text=כתובת המייל אומתה'), 'confirmation link opens a welcome landing page');
await nu.click('button:has-text("לפתיחת המשרד")');
await nu.waitForTimeout(600);
log(await nu.isVisible('text=הקמת המשרד'), 'confirmed user without an office goes to onboarding');
await nu.fill('#ob-o', 'סטודיו חדש בדיקה');
for (let i = 0; i < 3; i++) await nu.click('button:has-text("הבא"), button:has-text("המשך")');
await nu.click('button:has-text("פתיחת המשרד")');
await nu.waitForFunction(() => location.hash.includes('/dashboard'), null, { timeout: 15000 }).catch(() => {});
await settle(nu);
log((await q("select s.status || '/' || s.plan_id from public.offices o join public.office_subscriptions s on s.office_id = o.id where o.name = 'סטודיו חדש בדיקה'")) === 'trialing/pro', 'office created with a Pro trial');
log(nu.url().includes('/dashboard') && (await nu.isVisible('text=סטודיו חדש בדיקה')), 'new owner lands in the new office');
await nu.context().close();

// ---------------------------------------------------------------- expired / used e-mail link
const ex = await newPage(browser);
await ex.goto(BASE + '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
await ex.waitForTimeout(1200);
log(await ex.isVisible('h1:has-text("הקישור כבר לא בתוקף")') && await ex.isVisible('button:has-text("שליחת קישור חדש")'), 'an expired e-mail link opens a clear landing page with a resend option');
await ex.fill('#lx-e', 'noam.new@example.com'); await ex.click('button:has-text("שליחת קישור חדש")'); await ex.waitForTimeout(800);
log(await ex.isVisible('text=שלחנו קישור חדש'), 'a new confirmation link can be requested from that page');
await ex.context().close();

// ---------------------------------------------------------------- invitation link → sign up → accept
const tok = await q("select payload ->> 'token' from public.email_outbox where to_email = 'gal.new@example.com'");
const inv = await newPage(browser);
await inv.goto(BASE + '/#/accept-invite?token=' + tok);
await inv.waitForTimeout(600);
await inv.click('button:has-text("יצירת חשבון")');
await inv.fill('#rg-n', 'גל חדש');
await inv.fill('#rg-e', 'gal.new@example.com');
await inv.fill('#rg-p', 'Strong-pass-2026');
await inv.check('#rg-t').catch(async () => { await inv.click('label[for=rg-t]'); });
await inv.click('button[type=submit]');
await inv.waitForTimeout(600);
const conf2 = await (await fetch(BASE + '/__test/confirm?email=gal.new@example.com')).json();
await inv.goto(BASE + conf2.link.replace(/^https?:\/\/[^/]+/, ''));
await inv.waitForTimeout(1500);
await inv.click('button:has-text("להצטרפות למשרד")');
await inv.waitForTimeout(2500);
await settle(inv);
log((await q("select m.role from public.office_members m join auth.users u on u.id = m.user_id where u.email = 'gal.new@example.com'")) === 'member', 'invitee joined the office as member after confirming');
log(inv.url().includes('/dashboard'), 'invitee lands on the dashboard');
await inv.context().close();

// ---------------------------------------------------------------- password recovery
const rec = await newPage(browser);
const rl = await (await fetch(BASE + '/__test/recovery?email=' + EMAIL.michal)).json();
await rec.goto(BASE + rl.link);
await rec.waitForTimeout(800);
log(await rec.isVisible('text=בחירת סיסמה חדשה'), 'recovery link opens the new-password screen');
await rec.fill('#rp-1', 'New-pass-2026x'); await rec.fill('#rp-2', 'New-pass-2026x');
await rec.click('button[type=submit]');
await rec.waitForTimeout(1500);
await rec.context().close();
const re = await newPage(browser);
await re.goto(BASE + '/#/login'); await re.fill('#lg-e', EMAIL.michal); await re.fill('#lg-p', 'New-pass-2026x'); await re.click('button[type=submit]');
await re.waitForTimeout(1500);
log(re.url().includes('/dashboard'), 'login with the new password');
await re.context().close();

// ---------------------------------------------------------------- super admin
const ron = await newPage(browser);
await login(ron, 'ron');
await go(ron, '/admin/pricing');
await ron.fill('#pr-m-starter', '159');
await ron.locator('.card', { hasText: 'Starter' }).locator('text=שמירת שינויים').click();
await ron.click('.modal-foot .btn.primary');
await waitWrites(ron);
log((await q("select price_monthly from public.subscription_plans where id = 'starter'")) === '159.00' && (await q("select count(*) from public.pricing_changes where plan_id = 'starter'")) !== '0', 'super admin price change saved and logged', await badToasts(ron));
await go(ron, '/admin/offices/a0000000-0000-4000-8000-000000000002');
await ron.locator('button:has-text("העברה ל\\"חוב פתוח\\"")').click();
await ron.click('.modal-foot .btn.primary');
await waitWrites(ron);
log((await q("select status from public.office_subscriptions where office_id = 'a0000000-0000-4000-8000-000000000002'")) === 'past_due', 'super admin changes an office subscription status', await badToasts(ron));
const errsC = ron.errors.filter((e) => !/ERR_TUNNEL|fonts|Failed to load resource/.test(e));
await ron.context().close();

const errs = [...errsA, ...errsB, ...errsC];
console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors');
console.log(`${results.filter(Boolean).length} passed, ${results.filter((x) => !x).length} failed`);
await browser.close();
