import { confetti } from '../ui/confetti';
// Data access layer: read selectors, permission rules and write actions.
// Future: each selector becomes a Supabase query; each action becomes an RPC/insert/update
// protected by RLS. Keep UI components free of business rules.
import type { DB } from './store';
import type * as T from './types';
import { todayISO, daysFromToday, nowStamp, D } from './dates';

export const uid = (p = 'id') => ((globalThis as any).__AF_LIVE ? crypto.randomUUID() : `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`);

// ---------- lookups ----------
export const byId = <X extends { id: string }>(arr: X[], id?: string | null) => (id ? arr.find((x) => x.id === id) : undefined);
export const userName = (db: DB, id?: string) => byId(db.users, id)?.name || '—';
export const projectOf = (db: DB, id?: string | null) => byId(db.projects, id || undefined);
export const clientOf = (db: DB, id?: string) => byId(db.clients, id);
export const supplierOf = (db: DB, id?: string | null) => byId(db.suppliers, id || undefined);
export function contactOf(db: DB, contactId?: string) {
  for (const c of db.clients) { const ct = c.contacts.find((x) => x.id === contactId); if (ct) return { client: c, contact: ct }; }
  return undefined;
}

// ---------- permissions (demo assumptions, configurable in settings) ----------
export const ROLE_LABEL: Record<T.Role, string> = { super_admin: 'Super Admin', owner: 'בעלים (Office Owner)', admin: 'מנהל/ת משרד (Office Admin)', member: 'חבר/ת צוות (Team Member)', client: 'לקוח (Client)' };
export const ROLE_SHORT: Record<T.Role, string> = { super_admin: 'Super Admin', owner: 'בעלים', admin: 'מנהל/ת משרד', member: 'חבר/ת צוות', client: 'לקוח' };

export function canSeeFinance(db: DB, me: T.User) { return me.role === 'owner' || me.role === 'admin' || (me.role === 'member' && db.settings.memberCanSeeFinance); }
export function canManageTeam(me: T.User) { return me.role === 'owner' || me.role === 'admin'; }
export function canManageBilling(db: DB, me: T.User) { return me.role === 'owner' || (me.role === 'admin' && db.settings.adminCanManageBilling); }
export function canEditProject(me: T.User) { return me.role === 'owner' || me.role === 'admin' || me.role === 'member'; }
export function canChangeProjectStatus(me: T.User) { return me.role === 'owner' || me.role === 'admin'; }

export function visibleProjects(db: DB, me: T.User): T.Project[] {
  if (me.role === 'owner' || me.role === 'admin') return db.projects;
  if (me.role === 'member') {
    if (db.settings.memberSeesAllProjects) return db.projects;
    const mine = new Set(db.assignments.filter((a) => a.userId === me.id).map((a) => a.projectId));
    return db.projects.filter((p) => mine.has(p.id));
  }
  if (me.role === 'client') return db.projects.filter((p) => p.clientId === me.clientId);
  return [];
}
export const visibleProjectIds = (db: DB, me: T.User) => new Set(visibleProjects(db, me).map((p) => p.id));
export const inScope = (db: DB, me: T.User) => { const ids = visibleProjectIds(db, me); return (pid: string | null) => (pid === null ? me.role !== 'client' : ids.has(pid)); };

// ---------- subscription / feature flags ----------
export const currentPlan = (db: DB) => db.subscriptionPlans.find((p) => p.id === db.officeSubscription.planId)!;
export function hasFeature(db: DB, key: string) {
  const sub = db.officeSubscription;
  if (sub.status === 'בוטל' || sub.status === 'פג תוקף') return ['projects', 'documents'].includes(key);
  return !!currentPlan(db).features[key];
}
export const FEATURE_FOR_ROUTE: Record<string, string> = { '/procurement': 'procurement', '/suppliers': 'procurement', '/fees': 'fees' };

// ---------- finance ----------
export const VAT = 0.18;
export const poTotal = (po: T.PurchaseOrder) => po.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
export const specLineTotal = (s: T.SpecItem) => s.qty * s.unitPrice;
export function projectFinance(db: DB, projectId: string) {
  const p = projectOf(db, projectId)!;
  const lines = db.budgetLines.filter((b) => b.projectId === projectId);
  const exps = db.expenses.filter((e) => e.projectId === projectId);
  const pos = db.purchaseOrders.filter((o) => o.projectId === projectId && o.status !== 'בוטלה' && o.status !== 'טיוטה');
  const planned = lines.reduce((s, l) => s + l.planned, 0) || p.execBudget;
  const actual = exps.reduce((s, e) => s + e.amount, 0);
  const paid = exps.filter((e) => e.status === 'שולם').reduce((s, e) => s + e.amount, 0);
  // committed = open PO value not yet expensed
  const committed = pos.reduce((s, o) => {
    const spent = exps.filter((e) => e.poId === o.id).reduce((a, e) => a + e.amount, 0);
    return s + Math.max(0, poTotal(o) - spent);
  }, 0);
  const byCat = lines.map((l) => {
    const a = exps.filter((e) => e.category === l.category).reduce((s, e) => s + e.amount, 0);
    const c = pos.reduce((s, o) => {
      const poCat = exps.find((e) => e.poId === o.id)?.category || guessPoCategory(db, o);
      if (poCat !== l.category) return s;
      const spent = exps.filter((e) => e.poId === o.id).reduce((x, e) => x + e.amount, 0);
      return s + Math.max(0, poTotal(o) - spent);
    }, 0);
    return { ...l, actual: a, committed: c, pct: l.planned ? a / l.planned : 0 };
  });
  const fees = db.feeMilestones.filter((f) => f.projectId === projectId);
  const feePaid = fees.filter((f) => f.status === 'שולם').reduce((s, f) => s + f.amount, 0);
  const feeBilled = fees.filter((f) => f.status === 'נשלחה דרישה' || f.status === 'באיחור').reduce((s, f) => s + f.amount, 0);
  const specTotal = db.specItems.filter((s) => s.projectId === projectId).reduce((s, i) => s + specLineTotal(i), 0);
  return { planned, actual, paid, committed, remaining: planned - actual - committed, pct: planned ? actual / planned : 0, byCat, feeTotal: p.feeTotal, feePaid, feeBilled, feeOpen: p.feeTotal - feePaid, specTotal, expenses: exps, lines };
}
function guessPoCategory(db: DB, o: T.PurchaseOrder) {
  const sup = supplierOf(db, o.supplierId);
  const map: Record<string, string> = { sup_shalom: 'נגרות', sup_hadar: 'ריצוף וחיפוי', sup_light: 'תאורה', sup_sanit: 'סניטריה', sup_nordic: 'ריהוט', sup_galed: 'נגרות', sup_textile: 'ריהוט', sup_adar: 'חשמל ותקשורת', sup_bina: 'קבלן ביצוע' };
  if (o.items.some((i) => /שיש|משטח/.test(i.name))) return 'שיש ומשטחים';
  return map[sup?.id || ''] || 'בלתי צפוי';
}
export function budgetHealth(pct: number, warn = 0.9): 'ok' | 'warn' | 'bad' { return pct > 1 ? 'bad' : pct >= warn ? 'warn' : 'ok'; }

// ---------- dashboard selectors ----------
export function myOpenTasks(db: DB, me: T.User) { return db.tasks.filter((t) => t.assigneeId === me.id && t.status !== 'הושלם'); }
export const isOverdue = (t: T.Task) => t.status !== 'הושלם' && t.dueDate < todayISO;
export const isToday = (t: T.Task) => t.status !== 'הושלם' && t.dueDate === todayISO;

export function projectAlerts(db: DB, me: T.User) {
  const out: { project: T.Project; reasons: { text: string; tone: 'bad' | 'warn' | 'info'; link: string }[] }[] = [];
  for (const p of visibleProjects(db, me)) {
    if (p.status === 'הושלם') continue;
    const reasons: { text: string; tone: 'bad' | 'warn' | 'info'; link: string }[] = [];
    const late = db.tasks.filter((t) => t.projectId === p.id && isOverdue(t)).length;
    if (late) reasons.push({ text: `${late} משימות באיחור`, tone: 'bad', link: `/projects/${p.id}/tasks` });
    if (canSeeFinance(db, me)) {
      const f = projectFinance(db, p.id);
      if (f.byCat.some((c) => c.pct > 1)) reasons.push({ text: 'חריגה בסעיף תקציב', tone: 'bad', link: `/projects/${p.id}/budget` });
      else if (f.pct >= db.settings.budgetWarnPct / 100) reasons.push({ text: `${Math.round(f.pct * 100)}% מהתקציב נוצל`, tone: 'warn', link: `/projects/${p.id}/budget` });
    }
    const waiting = db.approvals.filter((a) => a.projectId === p.id && a.status === 'ממתין' && a.dueAt < todayISO).length;
    if (waiting) reasons.push({ text: `${waiting} אישורים באיחור`, tone: 'warn', link: `/projects/${p.id}/approvals` });
    const issues = db.annotations.filter((a) => a.kind === 'issue' && a.status === 'פתוח' && a.severity === 'גבוהה' && db.plans.find((pl) => pl.id === a.planId)?.projectId === p.id).length;
    if (issues) reasons.push({ text: `${issues} ממצאים בחומרה גבוהה`, tone: 'warn', link: `/projects/${p.id}/plans` });
    if (p.status === 'בהשהיה') reasons.push({ text: 'בהשהיה: ' + (p.statusNote || ''), tone: 'info', link: `/projects/${p.id}` });
    if (p.dueDate && daysFromToday(p.dueDate) <= 21 && daysFromToday(p.dueDate) >= 0) reasons.push({ text: `מסירה בעוד ${daysFromToday(p.dueDate)} ימים`, tone: 'info', link: `/projects/${p.id}` });
    if (reasons.length) out.push({ project: p, reasons });
  }
  return out.sort((a, b) => b.reasons.filter((r) => r.tone === 'bad').length - a.reasons.filter((r) => r.tone === 'bad').length);
}

// ---------- client visibility ----------
export function clientVisible(db: DB, me: T.User) {
  const pids = visibleProjectIds(db, me);
  return {
    projects: db.projects.filter((p) => pids.has(p.id)),
    plans: db.plans.filter((p) => pids.has(p.projectId) && p.sharedWithClient),
    docs: db.documents.filter((d) => d.projectId && pids.has(d.projectId) && d.sharedWithClient),
    specs: db.specItems.filter((s) => pids.has(s.projectId) && s.sharedWithClient),
    approvals: db.approvals.filter((a) => pids.has(a.projectId)),
    meetings: db.meetings.filter((m) => m.projectId && pids.has(m.projectId) && m.sharedWithClient),
    messages: db.messages.filter((m) => pids.has(m.projectId)),
    hidden: {
      plans: db.plans.filter((p) => pids.has(p.projectId) && !p.sharedWithClient).length,
      docs: db.documents.filter((d) => d.projectId && pids.has(d.projectId) && !d.sharedWithClient).length,
      specs: db.specItems.filter((s) => pids.has(s.projectId) && !s.sharedWithClient).length,
      meetings: db.meetings.filter((m) => m.projectId && pids.has(m.projectId) && !m.sharedWithClient).length,
    },
  };
}

// ---------- write actions ----------
type C = { me: T.User };
export function logActivity(db: DB, ctx: C, projectId: string | null, text: string, link?: string) {
  db.activity.unshift({ id: uid('a'), projectId, userId: ctx.me.id, text, at: nowStamp(), link });
  db.auditLog.unshift({ id: uid('au'), at: nowStamp(), actor: ctx.me.name + (ctx.me.role === 'client' ? ' (לקוח)' : ''), officeId: 'off_1', action: text.split(':')[0].slice(0, 40), target: text, ip: 'demo' });
}
export function notify(db: DB, userId: string, n: Omit<T.Notification, 'id' | 'userId' | 'at' | 'read'>) {
  db.notifications.unshift({ id: uid('n'), userId, at: nowStamp(), read: false, ...n });
}
export function simulateEmail(db: DB, to: string, subject: string, template: string, relatedLink = '') {
  db.emailLog.unshift({ id: uid('em'), to, subject, template, at: nowStamp(), status: 'הודמה – לא נשלח', relatedLink });
}

export const A = {
  // projects
  setProjectStatus(db: DB, ctx: C, id: string, status: T.ProjectStatus, note?: string) {
    const p = byId(db.projects, id)!; const prev = p.status; p.status = status; p.statusNote = note || undefined; p.updatedAt = nowStamp();
    if (status === 'הושלם') p.progress = 100;
    logActivity(db, ctx, id, `שינוי סטטוס: ${prev} ← ${status}`, `/projects/${id}`);
  },
  saveProject(db: DB, ctx: C, data: T.Project, isNew: boolean) {
    if (isNew) { db.projects.unshift(data); db.assignments.push({ id: uid('as'), projectId: data.id, userId: data.leadId, roleInProject: 'אחראי/ת פרויקט' }); logActivity(db, ctx, data.id, `יצירת פרויקט: ${data.name}`, `/projects/${data.id}`); }
    else { const i = db.projects.findIndex((p) => p.id === data.id); db.projects[i] = { ...data, updatedAt: nowStamp() }; logActivity(db, ctx, data.id, `עדכון פרטי פרויקט: ${data.name}`, `/projects/${data.id}`); }
  },
  toggleMilestone(db: DB, ctx: C, projectId: string, msId: string) {
    const m = byId(db.projects, projectId)!.milestones.find((x) => x.id === msId)!; m.done = !m.done;
    logActivity(db, ctx, projectId, `${m.done ? 'סימון' : 'ביטול סימון'} אבן דרך: ${m.title}`);
  },
  addMilestone(db: DB, ctx: C, projectId: string, title: string, date: string) {
    byId(db.projects, projectId)!.milestones.push({ id: uid('ms'), title, date, done: false });
    byId(db.projects, projectId)!.milestones.sort((a, b) => a.date.localeCompare(b.date));
  },
  assign(db: DB, ctx: C, projectId: string, userId: string, roleInProject: string) {
    if (!db.assignments.some((a) => a.projectId === projectId && a.userId === userId)) db.assignments.push({ id: uid('as'), projectId, userId, roleInProject });
    logActivity(db, ctx, projectId, `שיוך ${userName(db, userId)} לפרויקט`);
  },
  unassign(db: DB, ctx: C, projectId: string, userId: string) { db.assignments = db.assignments.filter((a) => !(a.projectId === projectId && a.userId === userId)); },
  // clients
  saveClient(db: DB, ctx: C, data: T.Client, isNew: boolean) {
    if (isNew) db.clients.unshift(data); else { const i = db.clients.findIndex((c) => c.id === data.id); db.clients[i] = data; }
    logActivity(db, ctx, null, `${isNew ? 'הוספת' : 'עדכון'} לקוח: ${data.name}`, `/clients/${data.id}`);
  },
  setPortal(db: DB, ctx: C, clientId: string, contactId: string, portal: T.ClientContact['portal']) {
    const ct = byId(db.clients, clientId)!.contacts.find((c) => c.id === contactId)!; ct.portal = portal;
    if (portal === 'הוזמן') simulateEmail(db, ct.email, `הוזמנת לפורטל הלקוחות של ${db.office.name}`, 'portal_invite', `/clients/${clientId}`);
    logActivity(db, ctx, null, `גישת פורטל ל${ct.name}: ${portal}`, `/clients/${clientId}`);
  },
  // tasks
  saveTask(db: DB, ctx: C, t: T.Task, isNew: boolean) {
    if (isNew) { db.tasks.unshift(t); if (t.assigneeId !== ctx.me.id) notify(db, t.assigneeId, { kind: 'task', title: 'משימה חדשה שויכה אליך', body: t.title, link: '/tasks' }); logActivity(db, ctx, t.projectId, `יצירת משימה: ${t.title}`, '/tasks'); }
    else { const i = db.tasks.findIndex((x) => x.id === t.id); db.tasks[i] = t; }
  },
  setTaskStatus(db: DB, ctx: C, id: string, status: T.TaskStatus) {
    const t = byId(db.tasks, id)!; t.status = status;
    logActivity(db, ctx, t.projectId, `${status === 'הושלם' ? 'השלמת' : 'עדכון'} משימה: ${t.title}${status !== 'הושלם' ? ' → ' + status : ''}`, '/tasks');
  },
  addTaskComment(db: DB, ctx: C, id: string, text: string) { byId(db.tasks, id)!.comments.push({ id: uid('c'), authorId: ctx.me.id, text, at: nowStamp() }); },
  toggleCheck(db: DB, ctx: C, id: string, checkId: string) { const c = byId(db.tasks, id)!.checklist.find((x) => x.id === checkId)!; c.done = !c.done; },
  deleteTask(db: DB, ctx: C, id: string) { const t = byId(db.tasks, id); db.tasks = db.tasks.filter((x) => x.id !== id); if (t) logActivity(db, ctx, t.projectId, `מחיקת משימה: ${t.title}`); },
  applyTemplate(db: DB, ctx: C, tplId: string, projectId: string, assigneeId: string) {
    const tpl = byId(db.templates, tplId)!; tpl.usedCount++;
    tpl.tasks.forEach((x) => db.tasks.unshift({ id: uid('t'), projectId, title: x.title, description: `נוצר מתבנית "${tpl.name}" (תפקיד: ${x.role})`, status: 'לביצוע', priority: x.priority, assigneeId, dueDate: D(x.offsetDays), createdAt: todayISO, createdBy: ctx.me.id, tags: [], comments: [], checklist: [], source: { kind: 'template', id: tplId } }));
    logActivity(db, ctx, projectId, `החלת תבנית "${tpl.name}" – ${tpl.tasks.length} משימות`, '/tasks');
  },
  saveTemplate(db: DB, ctx: C, tpl: T.WorkTemplate, isNew: boolean) { if (isNew) db.templates.push(tpl); else db.templates[db.templates.findIndex((x) => x.id === tpl.id)] = tpl; },
  // plans
  addPlanVersion(db: DB, ctx: C, planId: string, v: T.PlanVersion) {
    const p = byId(db.plans, planId)!; p.versions.forEach((x) => { if (x.status !== 'הוחלף') x.status = 'הוחלף'; }); p.versions.push(v);
    logActivity(db, ctx, p.projectId, `העלאת גרסה ${v.v} של ${p.number} ${p.title}`, `/plans/${planId}`);
  },
  createPlan(db: DB, ctx: C, plan: T.Plan) { db.plans.unshift(plan); logActivity(db, ctx, plan.projectId, `העלאת שרטוט חדש: ${plan.number} ${plan.title}`, `/plans/${plan.id}`); },
  finishProcessing(db: DB, ctx: C, planId: string, v: number) { const pv = byId(db.plans, planId)?.versions.find((x) => x.v === v); if (pv && pv.processing === 'בעיבוד') pv.processing = 'מוכן'; },
  setPlanStatus(db: DB, ctx: C, planId: string, status: T.PlanStatus) {
    const p = byId(db.plans, planId)!; const last = p.versions[p.versions.length - 1]; last.status = status;
    logActivity(db, ctx, p.projectId, `סטטוס ${p.number} גרסה ${last.v}: ${status}`, `/plans/${planId}`);
  },
  togglePlanShare(db: DB, ctx: C, planId: string) { const p = byId(db.plans, planId)!; p.sharedWithClient = !p.sharedWithClient; },
  addAnnotation(db: DB, ctx: C, a: T.Annotation) { db.annotations.push(a); const p = byId(db.plans, a.planId)!; logActivity(db, ctx, p.projectId, `${a.kind === 'issue' ? 'ממצא' : a.kind === 'measure' ? 'מדידה' : 'הערה'} על ${p.number}: ${a.text}`, `/plans/${p.id}`); },
  resolveAnnotation(db: DB, ctx: C, id: string) { const a = byId(db.annotations, id)!; a.status = a.status === 'פתוח' ? 'טופל' : 'פתוח'; },
  deleteAnnotation(db: DB, ctx: C, id: string) { db.annotations = db.annotations.filter((a) => a.id !== id); },
  annotationToTask(db: DB, ctx: C, annId: string, taskId: string, assigneeId: string) {
    const a = byId(db.annotations, annId)!; const p = byId(db.plans, a.planId)!;
    db.tasks.unshift({ id: taskId, projectId: p.projectId, title: `${p.number}: ${a.text}`.slice(0, 90), description: a.text, status: 'לביצוע', priority: a.severity === 'גבוהה' ? 'גבוהה' : 'בינונית', assigneeId, dueDate: D(3), createdAt: todayISO, createdBy: ctx.me.id, tags: ['ממצא שרטוט'], comments: [], checklist: [], source: { kind: 'plan', id: p.id } });
    a.taskId = taskId;
    logActivity(db, ctx, p.projectId, `יצירת משימה מממצא על ${p.number}`, '/tasks');
  },
  // approvals
  requestApproval(db: DB, ctx: C, ap: T.Approval) {
    db.approvals.unshift(ap);
    const ct = contactOf(db, ap.contactId);
    if (ct?.contact.userId) notify(db, ct.contact.userId, { kind: 'approval', title: 'פריט חדש ממתין לאישורך', body: ap.title, link: '/portal/approvals' });
    if (ct) simulateEmail(db, ct.contact.email, `ממתין לאישורך: ${ap.title}`, 'approval_request', '/approvals');
    logActivity(db, ctx, ap.projectId, `שליחה לאישור לקוח: ${ap.title}`, '/approvals');
  },
  decideApproval(db: DB, ctx: C, id: string, status: T.Approval['status'], comment?: string) {
    const ap = byId(db.approvals, id)!; ap.status = status; ap.decidedAt = todayISO; if (comment) ap.comment = comment;
    if (ap.kind === 'מפרט') { const s = byId(db.specItems, ap.refId); if (s) s.status = status === 'אושר' ? 'מאושר' : status === 'נדחה' ? 'נדחה' : 'בקשת שינוי'; }
    if (ap.kind === 'שרטוט') { const p = byId(db.plans, ap.refId); if (p) p.versions[p.versions.length - 1].status = status === 'אושר' ? 'מאושר' : 'נדרשים תיקונים'; }
    const proj = projectOf(db, ap.projectId)!;
    notify(db, ap.requestedBy, { kind: 'approval', title: `${ctx.me.name}: ${status}`, body: `${ap.title}${comment ? ' – "' + comment + '"' : ''}`, link: '/approvals' });
    notify(db, proj.leadId, { kind: 'approval', title: `החלטת לקוח: ${status}`, body: ap.title, link: '/approvals' });
    logActivity(db, ctx, ap.projectId, `${status === 'אושר' ? 'אישור' : status === 'נדחה' ? 'דחייה' : 'בקשת שינוי'}: ${ap.title}${comment ? ' – ' + comment : ''}`, '/approvals');
  },
  // specs
  saveSpec(db: DB, ctx: C, s: T.SpecItem, isNew: boolean) {
    if (isNew) db.specItems.push(s); else db.specItems[db.specItems.findIndex((x) => x.id === s.id)] = s;
    logActivity(db, ctx, s.projectId, `${isNew ? 'הוספת' : 'עדכון'} פריט מפרט: ${s.name}`, `/specs/${s.projectId}`);
  },
  useAlternative(db: DB, ctx: C, specId: string, altIndex: number) {
    const s = byId(db.specItems, specId)!; const alt = s.alternatives[altIndex];
    const old = { name: s.name, unitPrice: s.unitPrice, supplierId: s.supplierId, note: 'הפריט הקודם' };
    s.name = alt.name; s.unitPrice = alt.unitPrice; s.supplierId = alt.supplierId; s.alternatives.splice(altIndex, 1, old); s.status = 'טיוטה';
    logActivity(db, ctx, s.projectId, `החלפה לחלופה: ${alt.name}`, `/specs/${s.projectId}`);
  },
  newSpecVersion(db: DB, ctx: C, projectId: string, summary: string) {
    const vs = db.specVersions.filter((v) => v.projectId === projectId); const total = db.specItems.filter((s) => s.projectId === projectId).reduce((a, s) => a + specLineTotal(s), 0);
    db.specVersions.push({ id: uid('sv'), projectId, v: vs.length + 1, date: todayISO, authorId: ctx.me.id, summary, total });
    logActivity(db, ctx, projectId, `שמירת גרסת מפרט ${vs.length + 1}: ${summary}`, `/specs/${projectId}`);
  },
  // documents
  saveDoc(db: DB, ctx: C, d: T.Doc, isNew: boolean) { if (isNew) db.documents.unshift(d); else db.documents[db.documents.findIndex((x) => x.id === d.id)] = d; logActivity(db, ctx, d.projectId, `${isNew ? 'העלאת' : 'עדכון'} מסמך: ${d.name}`, `/documents/${d.id}`); },
  addDocVersion(db: DB, ctx: C, docId: string, note: string) { const d = byId(db.documents, docId)!; d.versions.push({ v: d.versions.length + 1, date: todayISO, authorId: ctx.me.id, note, sizeKb: d.versions[d.versions.length - 1].sizeKb + 4 }); logActivity(db, ctx, d.projectId, `גרסה ${d.versions.length} למסמך ${d.name}`, `/documents/${d.id}`); },
  // meetings
  saveMeeting(db: DB, ctx: C, m: T.Meeting, isNew: boolean) { if (isNew) db.meetings.push(m); else db.meetings[db.meetings.findIndex((x) => x.id === m.id)] = m; logActivity(db, ctx, m.projectId, `${isNew ? 'קביעת' : 'עדכון'} פגישה: ${m.title}`, `/meetings/${m.id}`); },
  saveAbsence(db: DB, ctx: C, a: T.Absence) { db.absences.push(a); },
  // procurement
  savePO(db: DB, ctx: C, po: T.PurchaseOrder, isNew: boolean) { if (isNew) db.purchaseOrders.unshift(po); else db.purchaseOrders[db.purchaseOrders.findIndex((x) => x.id === po.id)] = po; logActivity(db, ctx, po.projectId, `${isNew ? 'יצירת' : 'עדכון'} הזמנת רכש ${po.number}`, `/procurement/${po.id}`); },
  setPOStatus(db: DB, ctx: C, id: string, status: T.POStatus) {
    const po = byId(db.purchaseOrders, id)!; po.status = status;
    if (status === 'סופקה') po.items.forEach((i) => (i.received = i.qty));
    if (status === 'נשלחה לספק') { const s = supplierOf(db, po.supplierId); if (s) simulateEmail(db, s.email, `הזמנת רכש ${po.number}`, 'purchase_order', `/procurement/${id}`); }
    logActivity(db, ctx, po.projectId, `הזמנת רכש ${po.number}: ${status}`, `/procurement/${id}`);
  },
  receiveItem(db: DB, ctx: C, poId: string, itemId: string, qty: number) { const po = byId(db.purchaseOrders, poId)!; const it = po.items.find((i) => i.id === itemId)!; it.received = Math.min(it.qty, Math.max(0, qty)); po.status = po.items.every((i) => i.received >= i.qty) ? 'סופקה' : po.items.some((i) => i.received > 0) ? 'סופקה חלקית' : po.status; },
  saveSupplier(db: DB, ctx: C, s: T.Supplier, isNew: boolean) { if (isNew) db.suppliers.push(s); else db.suppliers[db.suppliers.findIndex((x) => x.id === s.id)] = s; },
  // finance
  saveExpense(db: DB, ctx: C, e: T.Expense, isNew: boolean) {
    if (isNew) db.expenses.unshift(e); else db.expenses[db.expenses.findIndex((x) => x.id === e.id)] = e;
    logActivity(db, ctx, e.projectId, `${isNew ? 'רישום' : 'עדכון'} הוצאה: ${e.description} (${e.amount.toLocaleString('he-IL')} ₪)`, '/expenses');
    const f = projectFinance(db, e.projectId); const line = f.byCat.find((c) => c.category === e.category);
    if (line && line.pct > 1) notify(db, projectOf(db, e.projectId)!.leadId, { kind: 'budget', title: `חריגה בסעיף ${e.category}`, body: `${projectOf(db, e.projectId)!.name}: ${Math.round(line.pct * 100)}% מהסעיף`, link: `/projects/${e.projectId}/budget` });
  },
  deleteExpense(db: DB, ctx: C, id: string) { db.expenses = db.expenses.filter((e) => e.id !== id); },
  setBudgetLine(db: DB, ctx: C, id: string, planned: number) { byId(db.budgetLines, id)!.planned = planned; },
  addBudgetLine(db: DB, ctx: C, projectId: string, category: string, planned: number) { db.budgetLines.push({ id: uid('bl'), projectId, category, planned }); },
  addFeeMilestone(db: DB, ctx: C, f: T.FeeMilestone) { db.feeMilestones.push(f); db.feeMilestones.sort((a, b) => a.dueDate.localeCompare(b.dueDate)); logActivity(db, ctx, f.projectId, `אבן דרך לשכר טרחה: ${f.title}`, `/projects/${f.projectId}/fees`); },
  deleteFeeMilestone(db: DB, ctx: C, id: string) { db.feeMilestones = db.feeMilestones.filter((f) => f.id !== id); },
  setFeeStatus(db: DB, ctx: C, id: string, status: T.FeeMilestone['status']) { const f = byId(db.feeMilestones, id)!; f.status = status; if (status === 'שולם') f.paidAt = todayISO; logActivity(db, ctx, f.projectId, `שכר טרחה – ${f.title}: ${status}`, `/projects/${f.projectId}/fees`); },
  // messages & notifications
  sendMessage(db: DB, ctx: C, projectId: string, text: string) {
    const side = ctx.me.role === 'client' ? 'client' : 'studio';
    db.messages.push({ id: uid('msg'), projectId, side, authorId: ctx.me.id, authorName: ctx.me.name, text, at: nowStamp() });
    const p = projectOf(db, projectId)!;
    if (side === 'client') notify(db, p.leadId, { kind: 'comment', title: `${ctx.me.name} כתב/ה בפורטל`, body: text.slice(0, 80), link: `/projects/${projectId}/messages` });
    else { const c = clientOf(db, p.clientId); c?.contacts.filter((x) => x.userId).forEach((x) => notify(db, x.userId!, { kind: 'comment', title: `הודעה חדשה מ${db.office.name}`, body: text.slice(0, 80), link: '/portal/messages' })); }
  },
  markRead(db: DB, ctx: C, id: string) { const n = byId(db.notifications, id); if (n) n.read = true; },
  markAllRead(db: DB, ctx: C) { db.notifications.forEach((n) => { if (n.userId === ctx.me.id) n.read = true; }); },
  // team
  invite(db: DB, ctx: C, inv: T.Invitation) { db.invitations.unshift(inv); simulateEmail(db, inv.email, `הוזמנת להצטרף ל${db.office.name} ב-ArchiFlow`, 'team_invite', '/team'); logActivity(db, ctx, null, `הזמנת ${inv.name} (${ROLE_SHORT[inv.role]})`, '/team'); },
  acceptInvite(db: DB, ctx: C, id: string) {
    const inv = byId(db.invitations, id)!; inv.status = 'התקבלה';
    const u: T.User = { id: uid('u'), name: inv.name, email: inv.email, title: 'חבר/ת צוות', color: '#3E6A8A', role: inv.role, officeId: 'off_1', status: 'פעיל', joinedAt: todayISO, lastActive: nowStamp() };
    db.users.push(u); db.memberships.push({ id: uid('m'), officeId: 'off_1', userId: u.id, role: inv.role, since: todayISO }); db.officeSubscription.seatsUsed++;
  },
  revokeInvite(db: DB, ctx: C, id: string) { db.invitations = db.invitations.filter((i) => i.id !== id); },
  setUserRole(db: DB, ctx: C, userId: string, role: T.Role) { const u = byId(db.users, userId)!; const prev = u.role; u.role = role; const m = db.memberships.find((x) => x.userId === userId); if (m) m.role = role; logActivity(db, ctx, null, `שינוי תפקיד ל${u.name}: ${ROLE_SHORT[prev]} ← ${ROLE_SHORT[role]}`, '/team'); },
  setUserStatus(db: DB, ctx: C, userId: string, status: T.User['status']) { const u = byId(db.users, userId)!; u.status = status; logActivity(db, ctx, null, `${status === 'מושבת' ? 'השבתת' : 'הפעלת'} משתמש: ${u.name}`, '/team'); },
  setSetting(db: DB, ctx: C, path: string, value: any) { const parts = path.split('.'); let o: any = db.settings; parts.slice(0, -1).forEach((k) => (o = o[k])); o[parts[parts.length - 1]] = value; },
  updateOffice(db: DB, ctx: C, patch: Partial<T.Office>) { Object.assign(db.office, patch); db.platformOffices[0].name = db.office.name; },
  absence(db: DB, ctx: C, a: T.Absence) { db.absences.push(a); },
  // subscription (all simulated)
  changePlan(db: DB, ctx: C, planId: 'starter' | 'pro', cycle: 'חודשי' | 'שנתי') {
    const sub = db.officeSubscription; const from = sub.planId; const plan = byId(db.subscriptionPlans as any, planId) as T.SubscriptionPlan;
    const upgrade = from === 'starter' && planId === 'pro';
    if (upgrade || sub.status !== 'פעיל') { sub.planId = planId; sub.status = 'פעיל'; sub.cancelAt = undefined; }
    sub.cycle = cycle;
    sub.history.push({ at: todayISO, text: upgrade ? `שדרוג ל-${plan.name} ${cycle} – נכנס לתוקף מיד (חיוב יחסי מדומה)` : from === planId ? `שינוי מחזור חיוב ל${cycle}` : `שנמוך ל-${plan.name} – נכנס לתוקף ב-${sub.currentPeriodEnd} (הנחת דמו)`, by: ctx.me.name });
    if (!upgrade && from !== planId) (sub as any).pendingPlan = planId;
    if (upgrade) { const amount = Math.round((plan.priceMonthly - 149) * 0.6); db.invoices.unshift({ id: uid('inv'), officeId: 'off_1', number: 'AF-' + todayISO.replace(/-/g, '').slice(0, 6) + '-P' + Math.floor(Math.random() * 900 + 100), date: todayISO, periodFrom: todayISO, periodTo: sub.currentPeriodEnd, planId, amount, vat: Math.round(amount * 0.18 * 100) / 100, status: 'שולמה' }); }
    db.platformOffices[0].planId = sub.planId; db.platformOffices[0].mrr = sub.planId === 'pro' ? 299 : 149;
    logActivity(db, ctx, null, `מנוי: ${sub.history[sub.history.length - 1].text}`, '/billing');
  },
  applyPendingDowngrade(db: DB, ctx: C) { const sub: any = db.officeSubscription; if (sub.pendingPlan) { sub.planId = sub.pendingPlan; delete sub.pendingPlan; sub.history.push({ at: todayISO, text: 'השנמוך נכנס לתוקף (סימולציית סוף תקופה)', by: 'מערכת' }); db.platformOffices[0].planId = sub.planId; } },
  cancelSubscription(db: DB, ctx: C, reason: string) { const sub = db.officeSubscription; sub.status = 'יבוטל בסוף התקופה'; sub.cancelAt = sub.currentPeriodEnd; sub.history.push({ at: todayISO, text: `בקשת ביטול – בתוקף עד ${sub.currentPeriodEnd}. סיבה: ${reason}`, by: ctx.me.name }); db.platformOffices[0].status = sub.status; },
  resumeSubscription(db: DB, ctx: C) { const sub = db.officeSubscription; sub.status = 'פעיל'; sub.cancelAt = undefined; sub.history.push({ at: todayISO, text: 'ביטול הבקשה לביטול – המנוי ממשיך', by: ctx.me.name }); db.platformOffices[0].status = 'פעיל'; },
  simulateSubState(db: DB, ctx: C, status: T.OfficeSubscription['status']) { const sub = db.officeSubscription; sub.status = status; if (status === 'תקופת ניסיון') sub.trialEndsAt = D(5); sub.history.push({ at: todayISO, text: `סימולציה: מצב מנוי "${status}"`, by: 'הדמיה' }); db.platformOffices[0].status = status; },
  retryInvoice(db: DB, ctx: C, id: string) { const inv = byId(db.invoices, id)!; inv.status = 'שולמה'; },
  // super admin
  setPlanPrice(db: DB, ctx: C, planId: string, field: 'priceMonthly' | 'priceYearlyPerMonth', value: number) {
    const p: any = byId(db.subscriptionPlans as any, planId); const from = p[field]; p[field] = value;
    db.pricingChanges.unshift({ id: uid('pc'), at: nowStamp(), planId, field: field === 'priceMonthly' ? 'מחיר חודשי' : 'מחיר שנתי (לחודש)', from: '₪' + from, to: '₪' + value, by: ctx.me.name, note: 'עדכון דמו – טעון אישור' });
  },
  setPlanLimit(db: DB, ctx: C, planId: string, key: string, value: number | null) {
    const p: any = byId(db.subscriptionPlans as any, planId); const from = p.limits[key]; p.limits[key] = value;
    db.pricingChanges.unshift({ id: uid('pc'), at: nowStamp(), planId, field: 'מגבלה: ' + key, from: String(from ?? 'ללא הגבלה'), to: String(value ?? 'ללא הגבלה'), by: ctx.me.name, note: '' });
  },
  togglePlanFeature(db: DB, ctx: C, planId: string, key: string) {
    const p: any = byId(db.subscriptionPlans as any, planId); p.features[key] = !p.features[key];
    db.pricingChanges.unshift({ id: uid('pc'), at: nowStamp(), planId, field: 'פיצ׳ר: ' + key, from: p.features[key] ? 'כבוי' : 'פעיל', to: p.features[key] ? 'פעיל' : 'כבוי', by: ctx.me.name, note: '' });
  },
  setOfficeStatus(db: DB, ctx: C, officeId: string, status: T.PlatformOffice['status']) { const o = byId(db.platformOffices, officeId)!; o.status = status; if (officeId === 'off_1') db.officeSubscription.status = status; db.auditLog.unshift({ id: uid('au'), at: nowStamp(), actor: ctx.me.name + ' (Super Admin)', officeId, action: 'שינוי מצב מנוי', target: `${o.name} → ${status}`, ip: 'demo' }); },
  ticketReply(db: DB, ctx: C, id: string, text: string, side: 'user' | 'support') { const t = byId(db.tickets, id)!; t.messages.push({ side, name: side === 'support' ? 'צוות ArchiFlow' : ctx.me.name, text, at: nowStamp() }); if (side === 'support' && t.status === 'פתוח') t.status = 'בטיפול'; if (side === 'user' && t.status === 'ממתין למשתמש') t.status = 'בטיפול'; },
  setTicket(db: DB, ctx: C, id: string, patch: Partial<T.Ticket>) { Object.assign(byId(db.tickets, id)!, patch); },
  createTicket(db: DB, ctx: C, t: T.Ticket) { db.tickets.unshift(t); },
  saveAnnouncement(db: DB, ctx: C, a: T.Announcement, isNew: boolean) { if (isNew) db.announcements.unshift(a); else db.announcements[db.announcements.findIndex((x) => x.id === a.id)] = a; },
};

// a little celebration for finished work (skipped when motion is off)
export function celebrate(fn: any, args: any[]) {
  const A2: any = A;
  if ((fn === A2.setTaskStatus || fn === A2.setProjectStatus) && args[1] === 'הושלם') confetti();
  else if (fn === A2.decideApproval && args[1] === 'אושר') confetti();
}
