// Database rows (English enum codes, normalized tables) ⇄ UI model (Hebrew labels, nested objects).
// The UI model is the one the screens already use, so screens stay unchanged.
import type * as T from '../data/types';
import { iso } from '../data/dates';
import * as seed from '../data/seed';

// ---------------------------------------------------------------- enums
function bi<K extends string, V extends string>(pairs: [K, V][]) {
  const to = new Map<string, V>(pairs); const from = new Map<string, K>(pairs.map(([k, v]) => [v, k]));
  return { ui: (k: any, dflt?: V): V => (to.get(k) ?? dflt ?? pairs[0][1]) as V, db: (v: any, dflt?: K): K => (from.get(v) ?? dflt ?? pairs[0][0]) as K };
}
export const E = {
  project: bi([['lead', 'ליד חדש'], ['initial_design', 'תכנון ראשוני'], ['design_development', 'תכנון בפיתוח'], ['pending_approval', 'ממתין לאישור'], ['design_approved', 'תכנון מאושר'], ['execution', 'ביצוע'], ['pre_handover', 'לקראת מסירה'], ['completed', 'הושלם'], ['on_hold', 'בהשהיה']] as const as any),
  task: bi([['todo', 'לביצוע'], ['in_progress', 'בתהליך'], ['waiting', 'ממתין לאחר'], ['done', 'הושלם']]),
  priority: bi([['low', 'נמוכה'], ['medium', 'בינונית'], ['high', 'גבוהה'], ['urgent', 'דחופה']]),
  plan: bi([['draft', 'טיוטה'], ['internal_review', 'בבדיקה פנימית'], ['sent_to_client', 'נשלח ללקוח'], ['approved', 'מאושר'], ['changes_required', 'נדרשים תיקונים'], ['superseded', 'הוחלף']]),
  processing: bi([['ready', 'מוכן'], ['processing', 'בעיבוד'], ['failed', 'נכשל'], ['unsupported', 'תצוגה לא נתמכת']]),
  open: bi([['open', 'פתוח'], ['resolved', 'טופל']]),
  severity: bi([['low', 'נמוכה'], ['medium', 'בינונית'], ['high', 'גבוהה']]),
  spec: bi([['draft', 'טיוטה'], ['pending_client', 'ממתין לאישור לקוח'], ['approved', 'מאושר'], ['change_requested', 'בקשת שינוי'], ['rejected', 'נדחה']]),
  apKind: bi([['spec', 'מפרט'], ['plan', 'שרטוט'], ['document', 'מסמך'], ['quote', 'הצעת מחיר'], ['budget_change', 'שינוי תקציב']]),
  apStatus: bi([['pending', 'ממתין'], ['approved', 'אושר'], ['rejected', 'נדחה'], ['change_requested', 'בקשת שינוי'], ['cancelled', 'בוטל']]),
  access: bi([['project_team', 'צוות הפרויקט'], ['office', 'כל המשרד'], ['owners_admins', 'בעלים ומנהלים']]),
  meetingStatus: bi([['scheduled', 'מתוכננת'], ['held', 'התקיימה'], ['cancelled', 'בוטלה']]),
  absence: bi([['vacation', 'חופשה'], ['sick', 'מחלה'], ['reserve_duty', 'מילואים'], ['training', 'השתלמות']]),
  supplier: bi([['supplier', 'ספק'], ['contractor', 'קבלן'], ['tradesperson', 'בעל מקצוע']]),
  po: bi([['draft', 'טיוטה'], ['sent', 'נשלחה לספק'], ['confirmed', 'אושרה ע״י ספק'], ['in_production', 'בייצור'], ['partially_delivered', 'סופקה חלקית'], ['delivered', 'סופקה'], ['cancelled', 'בוטלה']]),
  payer: bi([['via_office', 'דרך המשרד'], ['client_direct', 'לקוח ישירות']]),
  expense: bi([['paid', 'שולם'], ['pending_payment', 'ממתין לתשלום']]),
  fee: bi([['future', 'עתידי'], ['requested', 'נשלחה דרישה'], ['paid', 'שולם'], ['overdue', 'באיחור']]),
  feeType: bi([['fixed', 'סכום קבוע'], ['percent_of_execution', 'אחוז מביצוע'], ['hourly', 'שעתי']]),
  clientType: bi([['private', 'פרטי'], ['business', 'עסקי']]),
  portal: bi([['none', 'ללא גישה'], ['invited', 'הוזמן'], ['active', 'פעיל'], ['suspended', 'מושהה']]),
  member: bi([['active', 'פעיל'], ['disabled', 'מושבת']]),
  invite: bi([['pending', 'ממתינה'], ['accepted', 'התקבלה'], ['expired', 'פגה'], ['revoked', 'בוטלה']]),
  sub: bi([['active', 'פעיל'], ['trialing', 'תקופת ניסיון'], ['past_due', 'חוב פתוח'], ['cancel_at_period_end', 'יבוטל בסוף התקופה'], ['cancelled', 'בוטל'], ['expired', 'פג תוקף']]),
  cycle: bi([['monthly', 'חודשי'], ['yearly', 'שנתי']]),
  invoice: bi([['paid', 'שולמה'], ['open', 'פתוחה'], ['failed', 'נכשלה'], ['refunded', 'זוכתה']]),
  ticketPriority: bi([['normal', 'רגילה'], ['low', 'נמוכה'], ['high', 'גבוהה'], ['critical', 'קריטית']]),
  ticketStatus: bi([['open', 'פתוח'], ['in_progress', 'בטיפול'], ['waiting_user', 'ממתין למשתמש'], ['closed', 'נסגר']]),
  announcement: bi([['draft', 'טיוטה'], ['published', 'פורסם'], ['scheduled', 'מתוזמן']]),
};

// ---------------------------------------------------------------- time
const pad = (n: number) => String(n).padStart(2, '0');
/** timestamptz → local 'YYYY-MM-DDTHH:MM' (the UI's stamp format) */
export function stamp(ts?: string | null) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const day = (ts?: string | null) => (ts ? (ts.length <= 10 ? ts : stamp(ts).slice(0, 10)) : '');
/** local date + 'HH:MM' → timestamptz ISO string */
export function toTs(dateStr: string, hhmm = '00:00') {
  const [y, m, d] = dateStr.split('-').map(Number); const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0).toISOString();
}

const COLORS = ['#3E6A8A', '#B4572E', '#5F7F4E', '#7A5C99', '#A0782C', '#2F7F7A', '#9A4A6A', '#4F5D75'];
const colorFor = (id: string) => COLORS[parseInt(id.replace(/-/g, '').slice(0, 6), 16) % COLORS.length];
export function coverFor(type = ''): T.Project['cover'] {
  if (/וילה|בית פרטי|בית/.test(type)) return 'villa';
  if (/משרד/.test(type)) return 'office';
  if (/קפה|מסעד|מסחר|חנות/.test(type)) return 'cafe';
  if (/מטבח/.test(type)) return 'kitchen';
  if (/גן|נוף|חצר/.test(type)) return 'garden';
  if (/מלון|אירוח/.test(type)) return 'hotel';
  return 'apartment';
}
const mb = (bytes?: number | null) => Math.max(0.1, Math.round(((bytes || 0) / 1048576) * 10) / 10);
const by = <X>(rows: X[], key: keyof X) => { const m = new Map<any, X[]>(); for (const r of rows) { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); } return m; };

/** Files behind each plan version, read by the drawing renderer (PlanSvg) in live mode. */
export const PLAN_FILES: Record<string, Record<number, { path: string; fileType: string }>> = ((globalThis as any).__afPlanFiles ||= {});

export interface Ctx0 { userId: string; officeId: string | null; role: T.Role; clientId?: string; contactId?: string; isSuperAdmin: boolean }

// ---------------------------------------------------------------- snapshot → UI DB
export function fromSnapshot(s: any, c: Ctx0) {
  const g = (k: string): any[] => s[k] || [];
  const office0 = g('offices').find((o) => o.id === c.officeId) || g('offices')[0] || {};
  const members = c.isSuperAdmin ? g('office_members') : g('office_members').filter((m) => m.office_id === c.officeId);
  const contacts = g('client_contacts');
  const profiles = new Map(g('profiles').map((p: any) => [p.id, p]));

  // users: office staff + portal users + me
  const users: T.User[] = [];
  const seen = new Set<string>();
  const addUser = (id: string, role: T.Role, extra: Partial<T.User> = {}) => {
    if (!id || seen.has(id)) return; seen.add(id);
    const p: any = profiles.get(id) || {};
    users.push({ id, name: p.full_name || p.email || 'משתמש', email: p.email || '', phone: p.phone || '', title: p.title || '', color: p.avatar_color || colorFor(id), role, officeId: role === 'client' ? undefined : c.officeId || undefined, status: 'פעיל', joinedAt: day(p.created_at), lastActive: stamp(p.updated_at), ...extra });
  };
  addUser(c.userId, c.role, c.role === 'client' ? { clientId: c.clientId } : {});
  for (const m of members) addUser(m.user_id, m.role, { status: E.member.ui(m.status) as any, joinedAt: day(m.joined_at), officeId: m.office_id });
  for (const ct of contacts) if (ct.user_id) addUser(ct.user_id, 'client', { clientId: ct.client_id, status: ct.portal_status === 'suspended' ? 'מושבת' : 'פעיל' });
  for (const p of g('profiles')) addUser(p.id, 'member', { status: 'פעיל' });

  const settingsRow = g('office_settings')[0] || {};
  const prefs = new Map(g('notification_preferences').map((n: any) => [n.kind, n]));
  const pref = (k: string) => ({ app: prefs.get(k)?.in_app ?? true, email: prefs.get(k)?.email ?? true });

  const milestonesBy = by(g('milestones'), 'project_id');
  const projects: T.Project[] = g('projects').map((p) => ({
    id: p.id, officeId: p.office_id, clientId: p.client_id, code: p.code, name: p.name, type: p.type || '', address: p.address || '', city: p.city || '',
    areaSqm: Number(p.area_sqm) || 0, status: E.project.ui(p.status) as any, statusNote: p.status_note || undefined, leadId: p.lead_id || '', startDate: p.start_date || '', dueDate: p.due_date || '',
    progress: p.progress || 0, phase: p.phase || 0, execBudget: Number(p.exec_budget) || 0, feeTotal: Number(p.fee_total) || 0, feeType: E.feeType.ui(p.fee_type) as any,
    description: p.description || '', tags: p.tags || [], cover: coverFor(p.type),
    milestones: (milestonesBy.get(p.id) || []).map((m: any) => ({ id: m.id, title: m.title, date: m.due_date, done: !!m.done })).sort((a: any, b: any) => a.date.localeCompare(b.date)),
    updatedAt: stamp(p.updated_at),
  }));

  const contactsBy = by(contacts, 'client_id');
  const clients: T.Client[] = g('clients').map((cl) => ({
    id: cl.id, officeId: cl.office_id, name: cl.name, type: E.clientType.ui(cl.type) as any, city: cl.city || '', address: cl.address || '', source: cl.source || '', createdAt: day(cl.created_at), notes: cl.notes || '',
    contacts: (contactsBy.get(cl.id) || []).map((ct: any) => ({ id: ct.id, name: ct.name, role: ct.role_title || '', phone: ct.phone || '', email: ct.email || '', portal: E.portal.ui(ct.portal_status) as any, userId: ct.user_id || undefined })),
  }));

  const checklistBy = by(g('task_checklist_items'), 'task_id'); const commentsBy = by(g('task_comments'), 'task_id');
  const tasks: T.Task[] = g('tasks').map((t) => ({
    id: t.id, projectId: t.project_id, title: t.title, description: t.description || '', status: E.task.ui(t.status) as any, priority: E.priority.ui(t.priority, 'בינונית') as any,
    assigneeId: t.assignee_id || '', dueDate: t.due_date || '', createdAt: day(t.created_at), createdBy: t.created_by || '', tags: t.tags || [],
    comments: (commentsBy.get(t.id) || []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((x: any) => ({ id: x.id, authorId: x.author_id, text: x.body, at: stamp(x.created_at) })),
    checklist: (checklistBy.get(t.id) || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((x: any) => ({ id: x.id, text: x.body, done: !!x.done })),
    source: t.source_kind && t.source_id ? { kind: t.source_kind, id: t.source_id } : undefined,
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const tplItems = by(g('work_template_items'), 'template_id');
  const templates: T.WorkTemplate[] = g('work_templates').map((w) => ({ id: w.id, name: w.name, description: w.description || '', category: w.category || '', usedCount: w.used_count || 0,
    tasks: (tplItems.get(w.id) || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((i: any) => ({ _id: i.id, title: i.title, offsetDays: i.offset_days || 0, role: i.role_label || '', priority: E.priority.ui(i.priority, 'בינונית') })) as any }));

  const versionsBy = by(g('plan_versions'), 'plan_id');
  const verId = new Map<string, number>();
  for (const k of Object.keys(PLAN_FILES)) delete PLAN_FILES[k];
  const plans: T.Plan[] = g('plans').map((p) => {
    const vs = (versionsBy.get(p.id) || []).sort((a: any, b: any) => a.version - b.version);
    PLAN_FILES[p.id] = {};
    const versions = vs.map((v: any) => {
      verId.set(v.id, v.version);
      if (v.file_path) PLAN_FILES[p.id][v.version] = { path: v.file_path, fileType: v.file_type };
      return { _id: v.id, _path: v.file_path, v: v.version, date: day(v.created_at), authorId: v.uploaded_by || '', note: v.note || '', fileType: v.file_type, sizeMb: mb(v.size_bytes), processing: E.processing.ui(v.processing) as any, status: E.plan.ui(v.status) as any };
    });
    return { id: p.id, projectId: p.project_id, number: p.number, title: p.title, category: p.category || '', scale: p.scale || '', layout: ('live:' + p.id) as any, versions: versions as any, sharedWithClient: !!p.shared_with_client, tags: p.tags || [] };
  }).filter((p) => p.versions.length > 0);

  const annotations: T.Annotation[] = g('plan_annotations').map((a) => ({ id: a.id, planId: a.plan_id, version: verId.get(a.plan_version_id) || 1, kind: a.kind, x: Number(a.x), y: Number(a.y), x2: a.x2 == null ? undefined : Number(a.x2), y2: a.y2 == null ? undefined : Number(a.y2),
    text: a.body, authorId: a.author_id || '', at: stamp(a.created_at), status: E.open.ui(a.status) as any, severity: a.severity ? (E.severity.ui(a.severity) as any) : undefined, taskId: a.task_id || undefined, simulated: !!a.is_simulated }));

  const altBy = by(g('spec_alternatives'), 'spec_item_id');
  const poItems = g('purchase_order_items');
  const specItems: T.SpecItem[] = g('spec_items').map((s) => ({ id: s.id, projectId: s.project_id, room: s.room, category: s.category || '', name: s.name, supplierId: s.supplier_id || '', sku: s.sku || '', qty: Number(s.qty) || 0, unit: s.unit || '', unitPrice: Number(s.unit_price) || 0,
    notes: s.notes || '', status: E.spec.ui(s.status) as any, swatch: s.swatch || '#D9D4C7', pattern: undefined, sharedWithClient: !!s.shared_with_client,
    alternatives: (altBy.get(s.id) || []).map((a: any) => ({ _id: a.id, name: a.name, unitPrice: Number(a.unit_price) || 0, supplierId: a.supplier_id || '', note: a.note || '' })) as any,
    leadTimeWeeks: s.lead_time_weeks || 0, poId: poItems.find((i: any) => i.spec_item_id === s.id)?.po_id }));
  const specVersions: T.SpecVersion[] = g('spec_versions').map((v) => ({ id: v.id, projectId: v.project_id, v: v.version, date: day(v.created_at), authorId: v.created_by || '', summary: v.summary, total: Number(v.total) || 0 }));

  const approvals: T.Approval[] = g('approvals').filter((a) => a.status !== 'cancelled').map((a) => ({ id: a.id, projectId: a.project_id, kind: E.apKind.ui(a.kind) as any, refId: a.ref_id || '', title: a.title, requestedBy: a.requested_by || '', requestedAt: day(a.requested_at), dueAt: a.due_at || '',
    status: E.apStatus.ui(a.status) as any, contactId: a.contact_id, decidedAt: a.decided_at ? day(a.decided_at) : undefined, comment: a.client_comment || undefined, amount: a.amount == null ? undefined : Number(a.amount) }))
    .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const docVer = by(g('document_versions'), 'document_id');
  const documents: T.Doc[] = g('documents').map((d) => ({ id: d.id, projectId: d.project_id, folder: d.folder, name: d.name, fileType: d.file_type,
    versions: (docVer.get(d.id) || []).sort((a: any, b: any) => a.version - b.version).map((v: any) => ({ _id: v.id, _path: v.file_path, v: v.version, date: day(v.created_at), authorId: v.uploaded_by || '', note: v.note || '', sizeKb: Math.round((v.size_bytes || 0) / 1024) })) as any,
    sharedWithClient: !!d.shared_with_client, access: E.access.ui(d.access) as any, tags: d.tags || [], description: d.description || '' }))
    .filter((d) => d.versions.length > 0).sort((a, b) => (b.versions[b.versions.length - 1].date).localeCompare(a.versions[a.versions.length - 1].date));

  const att = by(g('meeting_attendees'), 'meeting_id'); const mc = by(g('meeting_contacts'), 'meeting_id'); const ms = by(g('meeting_suppliers'), 'meeting_id');
  const meetings: T.Meeting[] = g('meetings').map((m) => ({ id: m.id, projectId: m.project_id, title: m.title, kind: m.kind || 'client', date: day(m.starts_at), start: stamp(m.starts_at).slice(11), end: stamp(m.ends_at).slice(11), location: m.location || '',
    attendeeIds: (att.get(m.id) || []).map((x: any) => x.user_id), contactIds: (mc.get(m.id) || []).map((x: any) => x.contact_id), supplierIds: (ms.get(m.id) || []).map((x: any) => x.supplier_id),
    agenda: m.agenda || [], summary: m.summary || '', followUpTaskIds: g('tasks').filter((t) => t.source_kind === 'meeting' && t.source_id === m.id).map((t) => t.id), sharedWithClient: !!m.shared_with_client, status: E.meetingStatus.ui(m.status) as any }));
  const absences: T.Absence[] = g('absences').map((a) => ({ id: a.id, userId: a.user_id, from: a.from_date, to: a.to_date, kind: E.absence.ui(a.kind) as any, note: a.note || '' }));
  const suppliers: T.Supplier[] = g('suppliers').map((s) => ({ id: s.id, officeId: s.office_id, name: s.name, kind: E.supplier.ui(s.kind) as any, category: s.category || '', contact: s.contact_name || '', phone: s.phone || '', email: s.email || '', city: s.city || '', rating: Number(s.rating) || 0, paymentTerms: s.payment_terms || '', notes: s.notes || '' }));
  const poiBy = by(poItems, 'po_id');
  const purchaseOrders: T.PurchaseOrder[] = g('purchase_orders').map((o) => ({ id: o.id, number: o.number, projectId: o.project_id, supplierId: o.supplier_id, status: E.po.ui(o.status) as any, createdAt: day(o.created_at), createdBy: o.created_by || '', expectedDelivery: o.expected_delivery || '',
    items: (poiBy.get(o.id) || []).map((i: any) => ({ id: i.id, name: i.name, qty: Number(i.qty) || 0, unit: i.unit || '', unitPrice: Number(i.unit_price) || 0, specItemId: i.spec_item_id || undefined, received: Number(i.received_qty) || 0 })), notes: o.notes || '', paidBy: E.payer.ui(o.paid_by) as any }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const budgetLines: T.BudgetLine[] = g('budget_lines').map((b) => ({ id: b.id, projectId: b.project_id, category: b.category, planned: Number(b.planned) || 0 }));
  const expenses: T.Expense[] = g('expenses').map((e) => ({ id: e.id, projectId: e.project_id, date: e.expense_date, category: e.category, description: e.description, supplierId: e.supplier_id, poId: e.po_id, amount: Number(e.amount) || 0,
    receipt: e.receipt_path ? e.receipt_path.split('/').pop() : null, _receiptPath: e.receipt_path, status: E.expense.ui(e.status) as any, paidBy: E.payer.ui(e.paid_by) as any } as any)).sort((a, b) => b.date.localeCompare(a.date));
  const feeMilestones: T.FeeMilestone[] = g('fee_milestones').map((f) => ({ id: f.id, projectId: f.project_id, title: f.title, pct: Number(f.pct) || 0, amount: Number(f.amount) || 0, dueDate: f.due_date || '', status: E.fee.ui(f.status) as any, paidAt: f.paid_at || undefined }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const notifications: T.Notification[] = g('notifications').map((n) => ({ id: n.id, userId: n.user_id, kind: n.kind, title: n.title, body: n.body || '', link: n.link || '', at: stamp(n.created_at), read: !!n.read_at }));
  const nameOf = (id: string) => (profiles.get(id) as any)?.full_name || 'משתמש';
  const messages: T.Message[] = g('messages').map((m) => ({ id: m.id, projectId: m.project_id, side: m.side, authorId: m.author_id, authorName: nameOf(m.author_id), text: m.body, at: stamp(m.created_at) })).sort((a, b) => a.at.localeCompare(b.at));
  const emailLog: T.EmailLog[] = g('email_outbox').map((e) => ({ id: e.id, to: e.to_email, subject: e.subject, template: e.template, at: stamp(e.created_at), status: (e.status === 'sent' ? 'נשלח' : e.status === 'failed' ? 'נכשל' : 'בתור לשליחה') as any, relatedLink: e.related_link || '' }));
  const activity: T.Activity[] = g('activity_log').map((a) => ({ id: String(a.id), projectId: a.project_id, userId: a.actor_id || '', text: activityText(a), at: stamp(a.created_at), link: a.link || undefined }));

  const featureDefs = g('feature_definitions');
  const planFeatures = g('plan_features');
  const subscriptionPlans: T.SubscriptionPlan[] = g('subscription_plans').filter((p) => p.is_active !== false).map((p) => ({ id: p.id, name: p.name, tagline: p.tagline || '', priceMonthly: Number(p.price_monthly), priceYearlyPerMonth: p.price_yearly_per_month == null ? null : Number(p.price_yearly_per_month), currency: '₪' as const, vatIncluded: !!p.vat_included, priceConfirmed: !!p.price_confirmed, trialDays: p.trial_days || 14,
    limits: { users: p.max_users, activeProjects: p.max_active_projects, storageGb: p.storage_gb || 0, clientPortalSeats: null },
    features: Object.fromEntries(featureDefs.map((f: any) => [f.key, !!planFeatures.find((x: any) => x.plan_id === p.id && x.feature_key === f.key)?.enabled])) }))
    .sort((a, b) => a.priceMonthly - b.priceMonthly);

  const subRow = g('office_subscriptions').find((x) => x.office_id === c.officeId) || {};
  const events = g('subscription_events').filter((e) => e.office_id === c.officeId);
  const officeSubscription: T.OfficeSubscription = { id: c.officeId || 'none', officeId: c.officeId || '', planId: subRow.plan_id || 'pro', status: E.sub.ui(subRow.status) as any, cycle: E.cycle.ui(subRow.billing_cycle) as any, startedAt: day(subRow.started_at), currentPeriodEnd: day(subRow.current_period_end),
    cancelAt: subRow.cancel_at ? day(subRow.cancel_at) : undefined, trialEndsAt: subRow.trial_ends_at ? day(subRow.trial_ends_at) : undefined, paymentMethod: subRow.provider ? 'אמצעי תשלום אצל ספק הסליקה' : 'טרם הוגדר ספק סליקה',
    seatsUsed: members.filter((m) => m.status === 'active').length, storageUsedGb: 0,
    history: events.map((e: any) => ({ at: day(e.created_at), text: subEventText(e), by: e.actor_id ? nameOf(e.actor_id) : 'מערכת' })) };
  if (subRow.pending_plan_id) (officeSubscription as any).pendingPlan = subRow.pending_plan_id;

  const invoices: T.Invoice[] = g('invoices').map((i) => ({ id: i.id, officeId: i.office_id, number: i.number, date: i.issued_at, periodFrom: i.period_from || '', periodTo: i.period_to || '', planId: i.plan_id || '', amount: Number(i.amount), vat: Number(i.vat), status: E.invoice.ui(i.status) as any, _pdf: i.pdf_path } as any));
  const pricingChanges: T.PricingChange[] = g('pricing_changes').map((p) => ({ id: String(p.id), at: stamp(p.created_at), planId: p.plan_id, field: pricingField(p.field), from: p.old_value ?? '—', to: p.new_value ?? '—', by: p.changed_by ? nameOf(p.changed_by) : 'מערכת', note: p.note || '' }));
  const tmsg = by(g('ticket_messages'), 'ticket_id');
  const tickets: T.Ticket[] = g('support_tickets').map((t) => ({ id: t.id, number: `SUP-${t.number}`, officeId: t.office_id, userId: t.created_by || '', subject: t.subject, category: t.category || '', priority: E.ticketPriority.ui(t.priority) as any, status: E.ticketStatus.ui(t.status) as any, createdAt: stamp(t.created_at), assignee: t.assignee_id ? nameOf(t.assignee_id) : '—',
    messages: (tmsg.get(t.id) || []).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((m: any) => ({ side: m.side, name: m.side === 'support' ? 'צוות ArchiFlow' : nameOf(m.author_id), text: m.body, at: stamp(m.created_at) })) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const auditLog: T.AuditEntry[] = g('audit_log').map((a) => ({ id: String(a.id), at: stamp(a.created_at), actor: a.actor_id ? nameOf(a.actor_id) + (a.actor_is_super_admin ? ' (Super Admin)' : '') : 'מערכת', officeId: a.office_id, action: `${a.action} · ${a.table_name || ''}`, target: a.record_id || '', ip: '—' }));
  const systemEvents: T.SystemEvent[] = g('system_events').map((e) => ({ id: String(e.id), at: stamp(e.created_at), level: e.level || 'info', service: e.service, message: e.message }));
  const announcements: T.Announcement[] = g('announcements').map((a) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience || 'כל המשרדים', status: E.announcement.ui(a.status) as any, at: day(a.publish_at || a.created_at) }));
  const retentionPolicies = g('retention_policies').map((r) => ({ id: r.id, dataType: r.data_type, period: r.period, action: r.action, draft: !!r.is_draft }));

  const invitations: T.Invitation[] = g('invitations').filter((i) => i.status !== 'revoked' && i.role !== 'client').map((i) => ({ id: i.id, officeId: i.office_id, email: i.email, name: i.full_name || i.email, role: i.role, sentAt: day(i.created_at), sentBy: i.invited_by || '', status: E.invite.ui(i.status) as any }));

  const office: T.Office = { id: office0.id || '', name: office0.name || '', legalName: office0.legal_name || '', city: office0.city || '', address: office0.address || '', phone: office0.phone || '', email: office0.email || '', vatId: office0.vat_id || '', createdAt: day(office0.created_at), logoText: office0.logo_text || (office0.name || 'AF').slice(0, 2), specialties: office0.specialties || [] };

  return {
    office, users, memberships: members.map((m: any) => ({ id: m.office_id + ':' + m.user_id, officeId: m.office_id, userId: m.user_id, role: m.role, since: day(m.joined_at) })), invitations, clients, projects,
    assignments: g('project_assignments').map((a) => ({ id: a.project_id + ':' + a.user_id, projectId: a.project_id, userId: a.user_id, roleInProject: a.role_in_project || '' })),
    tasks, templates, plans, annotations, specItems, specVersions, approvals, documents, meetings, absences, suppliers, purchaseOrders, budgetLines, expenses, feeMilestones,
    notifications, messages, emailLog, activity, subscriptionPlans, officeSubscription, invoices, pricingChanges, platformOffices: [] as T.PlatformOffice[], tickets, auditLog, systemEvents, announcements,
    retentionPolicies, helpArticles: seed.helpArticlesLive, faqs: seed.faqsLive,
    settings: {
      memberCanSeeFinance: !!settingsRow.member_can_see_finance, memberSeesAllProjects: !!settingsRow.member_sees_all_projects, clientSeesBudgetSummary: !!settingsRow.client_sees_budget_summary, adminCanManageBilling: !!settingsRow.admin_can_manage_billing,
      notif: { approvals: pref('approval'), tasks: pref('task'), meetings: pref('meeting'), budget: pref('budget'), comments: pref('comment'), digest: pref('digest') },
      calendar: { google: false, outlook: false }, budgetWarnPct: settingsRow.budget_warn_pct || 90,
    },
  };
}

const ACTION_TEXT: Record<string, (d: any) => string> = {
  project_status_changed: (d) => `שינוי סטטוס: ${E.project.ui(d.from)} ← ${E.project.ui(d.to)}`,
  approval_requested: (d) => `שליחה לאישור לקוח: ${d.title}`,
  approval_decided: (d) => `החלטת לקוח (${E.apStatus.ui(d.decision)}): ${d.title}${d.comment ? ' – ' + d.comment : ''}`,
  template_applied: (d) => `החלת תבנית "${d.template}" – ${d.tasks} משימות`,
};
function activityText(a: any) { const f = ACTION_TEXT[a.action]; return f ? f(a.details || {}) : (a.details?.text || a.action); }
const SUB_EVENT: Record<string, string> = { trial_started: 'התחלת תקופת ניסיון', plan_change_requested: 'בקשה לשינוי מסלול (ממתין לחיבור ספק סליקה)', cancellation_requested: 'בקשת ביטול בסוף התקופה', cancellation_reverted: 'ביטול הבקשה לביטול', manual_status_change: 'שינוי ידני ע״י צוות ArchiFlow', trial_expired: 'תקופת הניסיון הסתיימה', cancelled_at_period_end: 'המנוי הסתיים', downgrade_applied: 'השנמוך נכנס לתוקף' };
function subEventText(e: any) { const d = e.details || {}; let t = SUB_EVENT[e.event] || e.event; if (d.to) t += ` → ${d.to}`; if (d.reason) t += ` · סיבה: ${d.reason}`; if (d.note) t += ` · ${d.note}`; if (d.status) t += ` (${E.sub.ui(d.status)})`; return t; }
function pricingField(f: string) { return f === 'price_monthly' ? 'מחיר חודשי' : f === 'price_yearly_per_month' ? 'מחיר שנתי (לחודש)' : f.startsWith('feature:') ? 'פיצ׳ר: ' + f.slice(8) : f.startsWith('max_') ? 'מגבלה: ' + f : f; }

// ---------------------------------------------------------------- UI entity → DB row (for writes)
const n0 = (v: any) => (v === '' || v === undefined ? null : v);
export const toRow = {
  project: (p: T.Project) => ({ id: p.id, client_id: p.clientId, code: p.code, name: p.name, type: p.type, address: p.address, city: p.city, area_sqm: p.areaSqm || null, status: E.project.db(p.status), status_note: p.statusNote || null, lead_id: n0(p.leadId), start_date: n0(p.startDate), due_date: n0(p.dueDate), progress: Math.round(p.progress || 0), phase: p.phase || 0, exec_budget: p.execBudget || 0, fee_total: p.feeTotal || 0, fee_type: E.feeType.db(p.feeType), description: p.description, tags: p.tags || [] }),
  milestone: (m: T.Milestone, projectId: string) => ({ id: m.id, project_id: projectId, title: m.title, due_date: m.date, done: m.done }),
  client: (c: T.Client) => ({ id: c.id, name: c.name, type: E.clientType.db(c.type), city: c.city, address: c.address, source: c.source, notes: c.notes }),
  contact: (ct: T.ClientContact, clientId: string) => ({ id: ct.id, client_id: clientId, name: ct.name, role_title: ct.role, phone: ct.phone, email: n0(ct.email) }),
  task: (t: T.Task) => ({ id: t.id, project_id: t.projectId || null, title: t.title, description: t.description, status: E.task.db(t.status), priority: E.priority.db(t.priority, 'medium'), assignee_id: n0(t.assigneeId), due_date: n0(t.dueDate), tags: t.tags || [], source_kind: t.source?.kind || null, source_id: t.source?.id && /^[0-9a-f-]{36}$/.test(t.source.id) ? t.source.id : null }),
  checklist: (c: any, taskId: string, position: number) => ({ id: c.id, task_id: taskId, body: c.text, done: !!c.done, position }),
  comment: (c: T.Comment, taskId: string) => ({ id: c.id, task_id: taskId, body: c.text }),
  template: (w: T.WorkTemplate) => ({ id: w.id, name: w.name, description: w.description, category: w.category }),
  templateItem: (i: any, templateId: string, position: number) => ({ template_id: templateId, title: i.title, offset_days: i.offsetDays || 0, role_label: i.role || null, priority: E.priority.db(i.priority, 'medium'), position }),
  plan: (p: T.Plan) => ({ id: p.id, project_id: p.projectId, number: p.number, title: p.title, category: p.category, scale: p.scale, shared_with_client: p.sharedWithClient, tags: p.tags || [] }),
  annotation: (a: T.Annotation, versionId: string) => ({ id: a.id, plan_id: a.planId, plan_version_id: versionId, kind: a.kind, x: a.x, y: a.y, x2: a.x2 ?? null, y2: a.y2 ?? null, body: a.text, severity: a.severity ? E.severity.db(a.severity) : null, status: E.open.db(a.status), task_id: a.taskId || null, is_simulated: !!a.simulated }),
  spec: (s: T.SpecItem) => ({ id: s.id, project_id: s.projectId, room: s.room, category: s.category, name: s.name, supplier_id: n0(s.supplierId), sku: s.sku, qty: s.qty || 0, unit: s.unit, unit_price: s.unitPrice || 0, notes: s.notes, status: E.spec.db(s.status), shared_with_client: s.sharedWithClient, lead_time_weeks: s.leadTimeWeeks || 0, swatch: s.swatch }),
  alternative: (a: any, specId: string) => ({ spec_item_id: specId, name: a.name, unit_price: a.unitPrice || 0, supplier_id: n0(a.supplierId), note: a.note || null }),
  specVersion: (v: T.SpecVersion, snapshot: any) => ({ id: v.id, project_id: v.projectId, version: v.v, summary: v.summary, total: v.total, snapshot }),
  doc: (d: T.Doc) => ({ id: d.id, project_id: d.projectId || null, folder: d.folder, name: d.name, file_type: d.fileType, shared_with_client: d.sharedWithClient, access: E.access.db(d.access), tags: d.tags || [], description: d.description }),
  meeting: (m: T.Meeting) => ({ id: m.id, project_id: m.projectId || null, title: m.title, kind: m.kind, starts_at: toTs(m.date, m.start), ends_at: toTs(m.date, m.end || m.start), location: m.location, agenda: m.agenda || [], summary: m.summary, shared_with_client: m.sharedWithClient, status: E.meetingStatus.db(m.status) }),
  absence: (a: T.Absence) => ({ id: a.id, user_id: a.userId, from_date: a.from, to_date: a.to, kind: E.absence.db(a.kind), note: a.note }),
  supplier: (s: T.Supplier) => ({ id: s.id, name: s.name, kind: E.supplier.db(s.kind), category: s.category, contact_name: s.contact, phone: s.phone, email: n0(s.email), city: s.city, rating: s.rating || null, payment_terms: s.paymentTerms, notes: s.notes }),
  po: (o: T.PurchaseOrder) => ({ id: o.id, project_id: o.projectId, supplier_id: o.supplierId, number: o.number, status: E.po.db(o.status), expected_delivery: n0(o.expectedDelivery), paid_by: E.payer.db(o.paidBy), notes: o.notes }),
  poItem: (i: T.POItem, poId: string) => ({ id: i.id, po_id: poId, spec_item_id: i.specItemId && /^[0-9a-f-]{36}$/.test(i.specItemId) ? i.specItemId : null, name: i.name, qty: i.qty || 0, unit: i.unit, unit_price: i.unitPrice || 0, received_qty: i.received || 0 }),
  budgetLine: (b: T.BudgetLine) => ({ id: b.id, project_id: b.projectId, category: b.category, planned: b.planned || 0 }),
  expense: (e: any) => ({ id: e.id, project_id: e.projectId, expense_date: e.date, category: e.category, description: e.description, supplier_id: n0(e.supplierId), po_id: n0(e.poId), amount: e.amount || 0, status: E.expense.db(e.status), paid_by: E.payer.db(e.paidBy), ...(e._receiptPath !== undefined ? { receipt_path: e._receiptPath } : {}) }),
  fee: (f: T.FeeMilestone) => ({ id: f.id, project_id: f.projectId, title: f.title, pct: f.pct || null, amount: f.amount || 0, due_date: n0(f.dueDate), status: E.fee.db(f.status), paid_at: f.paidAt || null }),
  office: (o: T.Office) => ({ name: o.name, legal_name: o.legalName, city: o.city, address: o.address, phone: o.phone, email: n0(o.email), vat_id: o.vatId, logo_text: o.logoText, specialties: o.specialties || [] }),
  ticket: (t: T.Ticket) => ({ id: t.id, subject: t.subject, category: t.category, priority: E.ticketPriority.db(t.priority), status: E.ticketStatus.db(t.status) }),
  announcement: (a: T.Announcement) => ({ id: a.id, title: a.title, body: a.body, audience: a.audience, status: E.announcement.db(a.status), publish_at: a.at ? toTs(a.at) : null }),
};
