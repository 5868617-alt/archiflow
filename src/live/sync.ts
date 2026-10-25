// Turns a UI action into database writes.
// Screens keep calling run(A.someAction, …). The live store applies the action to a copy of the
// data (instant UI), then calls push() with the before/after copies. push() writes the difference,
// routing sensitive changes (statuses, approvals, invitations, subscriptions) through the server
// functions that enforce the business rules. Afterwards the store reloads from the server, so the
// screen always ends up showing what the database actually holds.
import type * as T from '../data/types';
import { Supa } from './client';
import { E, toRow } from './map';

export interface PushCtx { api: Supa; officeId: string | null; me: T.User; action: string; args: any[] }
type Op = () => Promise<any>;
const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const J = (x: any) => JSON.stringify(x);
const changed = (a: any, b: any) => J(a) !== J(b);
function patchOf(a: any, b: any) { const p: any = {}; for (const k of Object.keys(b)) if (J(a[k]) !== J(b[k])) p[k] = b[k]; return p; }
const mapById = <X extends { id: string }>(arr: X[] = []) => new Map(arr.map((x) => [x.id, x]));

/** Actions whose server function writes the activity log itself. */
const SERVER_LOGGED = new Set(['setProjectStatus', 'requestApproval', 'decideApproval', 'applyTemplate']);
/** Actions that only exist to simulate something in the demo – never sent to the database. */
export const DEMO_ONLY = new Set(['simulateSubState', 'retryInvoice', 'applyPendingDowngrade', 'acceptInvite', 'finishProcessing']);

export async function push(c: PushCtx, before: any, after: any): Promise<void> {
  const { api, officeId, me } = c;
  const ops: Op[] = [];
  const withOffice = (row: any) => ({ office_id: officeId, ...row });

  // ---------------------------------------------------------- server-function routes
  switch (c.action) {
    case 'applyTemplate': { const [tplId, projectId, assigneeId] = c.args; await api.rpc('apply_template', { p_template: tplId, p_project: projectId, p_assignee: assigneeId }); return; }
    case 'annotationToTask': { const [annId, , assigneeId] = c.args; await api.rpc('annotation_to_task', { p_annotation: annId, p_assignee: assigneeId }); return; }
    case 'changePlan': { const [planId, cycle] = c.args; await api.rpc('request_plan_change', { p_office: officeId, p_plan: planId, p_cycle: E.cycle.db(cycle) }); return; }
    case 'cancelSubscription': { await api.rpc('request_cancellation', { p_office: officeId, p_reason: c.args[0] }); return; }
    case 'resumeSubscription': { await api.rpc('resume_subscription', { p_office: officeId }); return; }
    case 'setOfficeStatus': { const [oid, status, note] = c.args; await api.rpc('admin_set_subscription_status', { p_office: oid, p_status: E.sub.db(status), p_note: note || 'שינוי ידני מקונסולת הניהול' }); return; }
  }

  // ---------------------------------------------------------- projects (+ milestones, assignments)
  {
    const A = mapById<T.Project>(before.projects), B = mapById<T.Project>(after.projects);
    for (const p of after.projects as T.Project[]) {
      const old = A.get(p.id);
      if (!old) {
        ops.push(() => api.insert('projects', withOffice({ ...toRow.project(p) })));
        for (const m of p.milestones) ops.push(() => api.insert('milestones', withOffice(toRow.milestone(m, p.id))));
        continue;
      }
      if (!changed(old, p)) continue;
      const ra = toRow.project(old), rb = toRow.project(p);
      if (ra.status !== rb.status) {
        const st = rb.status, note = rb.status_note;
        ops.push(() => api.rpc('set_project_status', { p_project: p.id, p_status: st, p_note: note }));
        delete (ra as any).status; delete (rb as any).status; delete (ra as any).status_note; delete (rb as any).status_note;
        if (p.status === 'הושלם') { delete (ra as any).progress; delete (rb as any).progress; }
      }
      const patch = patchOf(ra, rb); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('projects', { id: p.id }, patch));
      diffChildren(ops, api, old.milestones, p.milestones, 'milestones', (m) => withOffice(toRow.milestone(m, p.id)));
    }
    for (const p of before.projects as T.Project[]) if (!B.has(p.id)) ops.push(() => api.remove('projects', { id: p.id }));
    const key = (a: T.Assignment) => a.projectId + ':' + a.userId;
    const aa = new Map((before.assignments as T.Assignment[]).map((a) => [key(a), a])), ab = new Map((after.assignments as T.Assignment[]).map((a) => [key(a), a]));
    for (const [k, a] of ab) if (!aa.has(k)) ops.push(() => api.insert('project_assignments', withOffice({ project_id: a.projectId, user_id: a.userId, role_in_project: a.roleInProject })));
    for (const [k, a] of aa) if (!ab.has(k)) ops.push(() => api.remove('project_assignments', { project_id: a.projectId, user_id: a.userId }));
  }

  // ---------------------------------------------------------- clients (+ contacts and portal access)
  {
    const A = mapById<T.Client>(before.clients);
    for (const cl of after.clients as T.Client[]) {
      const old = A.get(cl.id);
      if (!old) {
        ops.push(() => api.insert('clients', withOffice(toRow.client(cl))));
        for (const ct of cl.contacts) ops.push(() => api.insert('client_contacts', withOffice(toRow.contact(ct, cl.id))));
        continue;
      }
      if (!changed(old, cl)) continue;
      const patch = patchOf(toRow.client(old), toRow.client(cl)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('clients', { id: cl.id }, patch));
      const oc = mapById(old.contacts);
      for (const ct of cl.contacts) {
        const o = oc.get(ct.id);
        if (!o) { ops.push(() => api.insert('client_contacts', withOffice(toRow.contact(ct, cl.id)))); continue; }
        const cp = patchOf(toRow.contact(o, cl.id), toRow.contact(ct, cl.id)); delete cp.id;
        if (Object.keys(cp).length) ops.push(() => api.update('client_contacts', { id: ct.id }, cp));
        if (o.portal !== ct.portal) {
          if (ct.portal === 'הוזמן') ops.push(() => api.rpc('invite_client_contact', { p_contact: ct.id }));
          else ops.push(() => api.update('client_contacts', { id: ct.id }, { portal_status: E.portal.db(ct.portal) }));
        }
      }
      const nc = new Set(cl.contacts.map((x) => x.id));
      for (const o of old.contacts) if (!nc.has(o.id)) ops.push(() => api.remove('client_contacts', { id: o.id }));
    }
  }

  // ---------------------------------------------------------- tasks (+ checklist, comments)
  {
    const A = mapById<T.Task>(before.tasks), B = mapById<T.Task>(after.tasks);
    const skipNew = c.action === 'annotationToTask' || c.action === 'applyTemplate';
    for (const t of after.tasks as T.Task[]) {
      const old = A.get(t.id);
      if (!old) {
        if (skipNew) continue;
        ops.push(() => api.insert('tasks', withOffice({ ...toRow.task(t), created_by: me.id })));
        t.checklist.forEach((x, i) => ops.push(() => api.insert('task_checklist_items', withOffice(toRow.checklist(x, t.id, i)))));
        for (const cm of t.comments) ops.push(() => api.insert('task_comments', withOffice({ ...toRow.comment(cm, t.id), author_id: me.id })));
        continue;
      }
      if (!changed(old, t)) continue;
      const patch = patchOf(toRow.task(old), toRow.task(t)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('tasks', { id: t.id }, patch));
      diffChildren(ops, api, old.checklist, t.checklist, 'task_checklist_items', (x) => withOffice(toRow.checklist(x, t.id, t.checklist.indexOf(x))));
      const oc = new Set(old.comments.map((x) => x.id));
      for (const cm of t.comments) if (!oc.has(cm.id)) ops.push(() => api.insert('task_comments', withOffice({ ...toRow.comment(cm, t.id), author_id: me.id })));
    }
    for (const t of before.tasks as T.Task[]) if (!B.has(t.id)) ops.push(() => api.remove('tasks', { id: t.id }));
  }

  // ---------------------------------------------------------- work templates (items are replaced as a whole)
  {
    const A = mapById<T.WorkTemplate>(before.templates);
    for (const w of after.templates as T.WorkTemplate[]) {
      const old = A.get(w.id);
      if (old && !changed({ ...old, usedCount: 0 }, { ...w, usedCount: 0 })) continue;
      if (!old) ops.push(() => api.insert('work_templates', withOffice(toRow.template(w))));
      else { const p = patchOf(toRow.template(old), toRow.template(w)); delete p.id; if (Object.keys(p).length) ops.push(() => api.update('work_templates', { id: w.id }, p)); }
      if (!old || changed(old.tasks, w.tasks)) {
        if (old) ops.push(() => api.remove('work_template_items', { template_id: w.id }));
        if (w.tasks.length) ops.push(() => api.insert('work_template_items', w.tasks.map((i, n) => withOffice(toRow.templateItem(i, w.id, n)))));
      }
    }
  }

  // ---------------------------------------------------------- plans (+ versions) and annotations
  {
    const A = mapById<T.Plan>(before.plans), B = mapById<T.Plan>(after.plans);
    const verRow = (p: T.Plan, v: any) => withOffice({ ...(v._id ? { id: v._id } : {}), plan_id: p.id, version: v.v, file_path: v._path || null, file_type: v.fileType, size_bytes: v._size ?? Math.round(v.sizeMb * 1048576), note: v.note, status: E.plan.db(v.status), processing: E.processing.db(v.processing), uploaded_by: me.id });
    for (const p of after.plans as T.Plan[]) {
      const old = A.get(p.id);
      if (!old) {
        ops.push(() => api.insert('plans', withOffice(toRow.plan(p))));
        for (const v of p.versions) ops.push(async () => { const id = crypto.randomUUID(); await api.insert('plan_versions', { ...verRow(p, v), id }); (v as any)._id = id; });
        continue;
      }
      if (!changed(old, p)) continue;
      const patch = patchOf(toRow.plan(old), toRow.plan(p)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('plans', { id: p.id }, patch));
      const ov = new Map(old.versions.map((v) => [v.v, v]));
      for (const v of p.versions as any[]) {
        const o: any = ov.get(v.v);
        if (!o) { ops.push(async () => { const id = crypto.randomUUID(); await api.insert('plan_versions', { ...verRow(p, v), id }); v._id = id; }); continue; }
        if (o.status !== v.status || o.processing !== v.processing || o.note !== v.note) {
          const vp: any = {};
          if (o.status !== v.status) vp.status = E.plan.db(v.status);
          if (o.processing !== v.processing) vp.processing = E.processing.db(v.processing);
          if (o.note !== v.note) vp.note = v.note;
          ops.push(() => api.update('plan_versions', { id: o._id }, vp));
        }
      }
    }
    for (const p of before.plans as T.Plan[]) if (!B.has(p.id)) ops.push(() => api.remove('plans', { id: p.id }));

    const versionId = (planId: string, v: number) => (after.plans as T.Plan[]).find((p) => p.id === planId)?.versions.find((x) => x.v === v) as any;
    const AA = mapById<T.Annotation>(before.annotations), AB = mapById<T.Annotation>(after.annotations);
    for (const a of after.annotations as T.Annotation[]) {
      const old = AA.get(a.id);
      if (!old) { ops.push(() => api.insert('plan_annotations', withOffice({ ...toRow.annotation(a, versionId(a.planId, a.version)?._id), author_id: me.id }))); continue; }
      if (!changed(old, a) || c.action === 'annotationToTask') continue;
      const vid = versionId(a.planId, a.version)?._id;
      const patch = patchOf(toRow.annotation(old, vid), toRow.annotation(a, vid)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('plan_annotations', { id: a.id }, patch));
    }
    for (const a of before.annotations as T.Annotation[]) if (!AB.has(a.id)) ops.push(() => api.remove('plan_annotations', { id: a.id }));
  }

  // ---------------------------------------------------------- spec items (+ alternatives) and spec versions
  {
    const A = mapById<T.SpecItem>(before.specItems), B = mapById<T.SpecItem>(after.specItems);
    for (const s of after.specItems as T.SpecItem[]) {
      const old = A.get(s.id);
      if (!old) {
        const row: any = toRow.spec(s); if (['approved', 'rejected', 'change_requested'].includes(row.status)) row.status = 'draft';
        ops.push(() => api.insert('spec_items', withOffice(row)));
        if (s.alternatives.length) ops.push(() => api.insert('spec_alternatives', s.alternatives.map((x) => withOffice(toRow.alternative(x, s.id)))));
        continue;
      }
      if (!changed(old, s)) continue;
      const ra: any = toRow.spec(old), rb: any = toRow.spec(s);
      // "pending client" is set by request_approval(); client decisions only through decide_approval()
      if (rb.status !== ra.status && ['pending_client', 'approved', 'rejected', 'change_requested'].includes(rb.status)) { delete ra.status; delete rb.status; }
      const patch = patchOf(ra, rb); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('spec_items', { id: s.id }, patch));
      if (changed(old.alternatives, s.alternatives)) {
        ops.push(() => api.remove('spec_alternatives', { spec_item_id: s.id }));
        if (s.alternatives.length) ops.push(() => api.insert('spec_alternatives', s.alternatives.map((x) => withOffice(toRow.alternative(x, s.id)))));
      }
    }
    for (const s of before.specItems as T.SpecItem[]) if (!B.has(s.id)) ops.push(() => api.remove('spec_items', { id: s.id }));
    const VA = mapById<T.SpecVersion>(before.specVersions);
    for (const v of after.specVersions as T.SpecVersion[]) if (!VA.has(v.id)) {
      const snap = (after.specItems as T.SpecItem[]).filter((x) => x.projectId === v.projectId).map((x) => ({ id: x.id, name: x.name, qty: x.qty, unitPrice: x.unitPrice, status: x.status }));
      ops.push(() => api.insert('spec_versions', withOffice({ ...toRow.specVersion(v, snap), created_by: me.id })));
    }
  }

  // ---------------------------------------------------------- approvals (server functions only)
  {
    const A = mapById<T.Approval>(before.approvals);
    for (const ap of after.approvals as T.Approval[]) {
      const old = A.get(ap.id);
      if (!old) {
        ops.unshift(() => api.rpc('request_approval', { p_project: ap.projectId, p_kind: E.apKind.db(ap.kind), p_ref: isUuid(ap.refId) ? ap.refId : null, p_title: ap.title, p_contact: ap.contactId, p_due: ap.dueAt || null, p_amount: ap.amount ?? null }));
        continue;
      }
      if (old.status !== ap.status) {
        if (ap.status === 'ממתין') continue;
        if ((ap.status as any) === 'בוטל') ops.push(() => api.rpc('cancel_approval', { p_approval: ap.id }));
        else ops.unshift(() => api.rpc('decide_approval', { p_approval: ap.id, p_decision: E.apStatus.db(ap.status), p_comment: ap.comment || null }));
      }
    }
    const B = mapById<T.Approval>(after.approvals);
    for (const ap of before.approvals as T.Approval[]) if (!B.has(ap.id) && ap.status === 'ממתין') ops.push(() => api.rpc('cancel_approval', { p_approval: ap.id }));
  }

  // ---------------------------------------------------------- documents (+ versions)
  {
    const A = mapById<T.Doc>(before.documents), B = mapById<T.Doc>(after.documents);
    const verRow = (d: T.Doc, v: any) => withOffice({ document_id: d.id, version: v.v, file_path: v._path || null, size_bytes: v._size ?? (v.sizeKb || 0) * 1024, note: v.note, uploaded_by: me.id });
    for (const d of after.documents as T.Doc[]) {
      const old = A.get(d.id);
      if (!old) { ops.push(() => api.insert('documents', withOffice(toRow.doc(d)))); for (const v of d.versions) ops.push(() => api.insert('document_versions', verRow(d, v))); continue; }
      if (!changed(old, d)) continue;
      const patch = patchOf(toRow.doc(old), toRow.doc(d)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('documents', { id: d.id }, patch));
      const ov = new Set(old.versions.map((v) => v.v));
      for (const v of d.versions) if (!ov.has(v.v)) ops.push(() => api.insert('document_versions', verRow(d, v)));
    }
    for (const d of before.documents as T.Doc[]) if (!B.has(d.id)) ops.push(() => api.remove('documents', { id: d.id }));
  }

  // ---------------------------------------------------------- meetings (+ attendees, contacts, suppliers)
  {
    const A = mapById<T.Meeting>(before.meetings), B = mapById<T.Meeting>(after.meetings);
    const links = (ops2: Op[], m: T.Meeting, o?: T.Meeting) => {
      const sets: [keyof T.Meeting, string, string][] = [['attendeeIds', 'meeting_attendees', 'user_id'], ['contactIds', 'meeting_contacts', 'contact_id'], ['supplierIds', 'meeting_suppliers', 'supplier_id']];
      for (const [k, table, col] of sets) {
        const was = new Set((o?.[k] as string[]) || []), now = new Set((m[k] as string[]) || []);
        for (const x of now) if (!was.has(x)) ops2.push(() => api.insert(table, withOffice({ meeting_id: m.id, [col]: x })));
        for (const x of was) if (!now.has(x)) ops2.push(() => api.remove(table, { meeting_id: m.id, [col]: x }));
      }
    };
    for (const m of after.meetings as T.Meeting[]) {
      const old = A.get(m.id);
      if (!old) { ops.push(() => api.insert('meetings', withOffice({ ...toRow.meeting(m), created_by: me.id }))); links(ops, m); continue; }
      if (!changed(old, m)) continue;
      const patch = patchOf(toRow.meeting(old), toRow.meeting(m)); delete patch.id;
      if (Object.keys(patch).length) ops.push(() => api.update('meetings', { id: m.id }, patch));
      links(ops, m, old);
    }
    for (const m of before.meetings as T.Meeting[]) if (!B.has(m.id)) ops.push(() => api.remove('meetings', { id: m.id }));
  }

  // ---------------------------------------------------------- simple office tables
  simple(ops, api, before.absences, after.absences, 'absences', (x: any) => withOffice(toRow.absence(x)));
  simple(ops, api, before.suppliers, after.suppliers, 'suppliers', (x: any) => withOffice(toRow.supplier(x)));
  simple(ops, api, before.budgetLines, after.budgetLines, 'budget_lines', (x: any) => withOffice(toRow.budgetLine(x)));
  simple(ops, api, before.expenses, after.expenses, 'expenses', (x: any) => withOffice({ ...toRow.expense(x), created_by: me.id }), ['created_by']);
  simple(ops, api, before.feeMilestones, after.feeMilestones, 'fee_milestones', (x: any) => withOffice(toRow.fee(x)));

  // ---------------------------------------------------------- purchase orders (+ items)
  {
    const A = mapById<T.PurchaseOrder>(before.purchaseOrders), B = mapById<T.PurchaseOrder>(after.purchaseOrders);
    for (const o of after.purchaseOrders as T.PurchaseOrder[]) {
      const old = A.get(o.id);
      if (!old) { ops.push(() => api.insert('purchase_orders', withOffice({ ...toRow.po(o), created_by: me.id }))); if (o.items.length) ops.push(() => api.insert('purchase_order_items', o.items.map((i) => withOffice(toRow.poItem(i, o.id))))); continue; }
      if (!changed(old, o)) continue;
      const patch = patchOf(toRow.po(old), toRow.po(o)); delete patch.id;
      if (patch.status === 'sent') { ops.push(() => api.rpc('send_purchase_order', { p_po: o.id })); delete patch.status; }
      if (Object.keys(patch).length) ops.push(() => api.update('purchase_orders', { id: o.id }, patch));
      diffChildren(ops, api, old.items, o.items, 'purchase_order_items', (i) => withOffice(toRow.poItem(i, o.id)));
    }
    for (const o of before.purchaseOrders as T.PurchaseOrder[]) if (!B.has(o.id)) ops.push(() => api.remove('purchase_orders', { id: o.id }));
  }

  // ---------------------------------------------------------- messages, notifications
  {
    const A = new Set((before.messages as T.Message[]).map((m) => m.id));
    for (const m of after.messages as T.Message[]) if (!A.has(m.id)) ops.push(() => api.insert('messages', withOffice({ id: m.id, project_id: m.projectId, author_id: me.id, side: m.side, body: m.text })));
    const NA = mapById<T.Notification>(before.notifications), NB = mapById<T.Notification>(after.notifications);
    const toRead = (after.notifications as T.Notification[]).filter((n) => n.userId === me.id && n.read && NA.get(n.id) && !NA.get(n.id)!.read).map((n) => n.id);
    if (toRead.length > 1) ops.push(() => api.updateIn('notifications', 'id', toRead, { read_at: new Date().toISOString() }));
    else if (toRead.length === 1) ops.push(() => api.update('notifications', { id: toRead[0] }, { read_at: new Date().toISOString() }));
    for (const n of before.notifications as T.Notification[]) if (!NB.has(n.id) && n.userId === me.id) ops.push(() => api.remove('notifications', { id: n.id }));
  }

  // ---------------------------------------------------------- team: invitations and memberships
  {
    const A = mapById<T.Invitation>(before.invitations), B = mapById<T.Invitation>(after.invitations);
    for (const i of after.invitations as T.Invitation[]) if (!A.has(i.id)) ops.push(() => api.rpc('invite_member', { p_office: officeId, p_email: i.email, p_full_name: i.name, p_role: i.role }));
    for (const i of before.invitations as T.Invitation[]) if (!B.has(i.id) && i.status === 'ממתינה') ops.push(() => api.update('invitations', { id: i.id }, { status: 'revoked' }));
    const UA = mapById<T.User>(before.users);
    for (const u of after.users as T.User[]) {
      const o = UA.get(u.id);
      if (!o || u.role === 'client' || o.role === 'client') continue;
      const patch: any = {};
      if (o.role !== u.role && ['owner', 'admin', 'member'].includes(u.role)) patch.role = u.role;
      if (o.status !== u.status) patch.status = u.status === 'מושבת' ? 'disabled' : 'active';
      if (Object.keys(patch).length) ops.push(() => api.update('office_members', { office_id: officeId, user_id: u.id }, patch));
      if (u.id === me.id && (o.name !== u.name || o.phone !== u.phone || o.title !== u.title || o.color !== u.color)) ops.push(() => api.update('profiles', { id: me.id }, { full_name: u.name, phone: u.phone || null, title: u.title || null, avatar_color: u.color }));
    }
  }

  // ---------------------------------------------------------- office profile and settings
  if (officeId && changed(toRow.office(before.office), toRow.office(after.office))) ops.push(() => api.update('offices', { id: officeId }, patchOf(toRow.office(before.office), toRow.office(after.office))));
  if (officeId) {
    const s0 = before.settings, s1 = after.settings;
    const sp: any = {};
    if (s0.memberCanSeeFinance !== s1.memberCanSeeFinance) sp.member_can_see_finance = s1.memberCanSeeFinance;
    if (s0.memberSeesAllProjects !== s1.memberSeesAllProjects) sp.member_sees_all_projects = s1.memberSeesAllProjects;
    if (s0.clientSeesBudgetSummary !== s1.clientSeesBudgetSummary) sp.client_sees_budget_summary = s1.clientSeesBudgetSummary;
    if (s0.adminCanManageBilling !== s1.adminCanManageBilling) sp.admin_can_manage_billing = s1.adminCanManageBilling;
    if (s0.budgetWarnPct !== s1.budgetWarnPct) sp.budget_warn_pct = s1.budgetWarnPct;
    if (Object.keys(sp).length) ops.push(() => api.update('office_settings', { office_id: officeId }, sp));
  }
  {
    const kinds: Record<string, string> = { approvals: 'approval', tasks: 'task', meetings: 'meeting', budget: 'budget', comments: 'comment', digest: 'digest' };
    const rows = Object.entries(kinds).filter(([k]) => changed(before.settings.notif?.[k], after.settings.notif?.[k])).map(([k, kind]) => ({ user_id: me.id, kind, in_app: !!after.settings.notif[k].app, email: !!after.settings.notif[k].email }));
    if (rows.length) ops.push(() => api.upsert('notification_preferences', rows, 'user_id,kind'));
  }

  // ---------------------------------------------------------- support tickets
  {
    const A = mapById<T.Ticket>(before.tickets);
    for (const t of after.tickets as T.Ticket[]) {
      const old = A.get(t.id);
      if (!old) {
        ops.push(() => api.insert('support_tickets', { office_id: officeId, id: t.id, subject: t.subject, category: t.category, priority: E.ticketPriority.db(t.priority), created_by: me.id }));
        for (const m of t.messages) ops.push(() => api.insert('ticket_messages', { office_id: officeId, ticket_id: t.id, author_id: me.id, side: m.side, body: m.text }));
        continue;
      }
      if (t.messages.length > old.messages.length) for (const m of t.messages.slice(old.messages.length)) ops.push(() => api.insert('ticket_messages', { office_id: t.officeId, ticket_id: t.id, author_id: me.id, side: m.side, body: m.text }));
      const tp: any = {};
      if (old.status !== t.status) tp.status = E.ticketStatus.db(t.status);
      if (old.priority !== t.priority) tp.priority = E.ticketPriority.db(t.priority);
      if (Object.keys(tp).length) ops.push(() => api.update('support_tickets', { id: t.id }, tp));
    }
  }

  // ---------------------------------------------------------- platform (Super Admin)
  {
    const A = mapById<T.SubscriptionPlan>(before.subscriptionPlans as any);
    for (const p of after.subscriptionPlans as T.SubscriptionPlan[]) {
      const o = A.get(p.id); if (!o || !changed(o, p)) continue;
      const pp: any = {};
      if (o.priceMonthly !== p.priceMonthly) pp.price_monthly = p.priceMonthly;
      if (o.priceYearlyPerMonth !== p.priceYearlyPerMonth) pp.price_yearly_per_month = p.priceYearlyPerMonth;
      if (o.limits.users !== p.limits.users) pp.max_users = p.limits.users;
      if (o.limits.activeProjects !== p.limits.activeProjects) pp.max_active_projects = p.limits.activeProjects;
      if (o.limits.storageGb !== p.limits.storageGb) pp.storage_gb = p.limits.storageGb;
      if (Object.keys(pp).length) ops.push(() => api.update('subscription_plans', { id: p.id }, pp));
      const fr = Object.keys(p.features).filter((k) => o.features[k] !== p.features[k]).map((k) => ({ plan_id: p.id, feature_key: k, enabled: p.features[k] }));
      if (fr.length) ops.push(() => api.upsert('plan_features', fr, 'plan_id,feature_key'));
    }
    simple(ops, api, before.announcements, after.announcements, 'announcements', (x: any) => toRow.announcement(x));
  }

  // ---------------------------------------------------------- activity feed for ordinary edits
  if (officeId && !SERVER_LOGGED.has(c.action) && me.role !== 'client') {
    const known = new Set((before.activity as T.Activity[]).map((a) => a.id));
    for (const a of (after.activity as T.Activity[]).filter((x) => !known.has(x.id)).reverse()) {
      ops.push(() => api.rpc('app_log_activity', { p_office: officeId, p_project: isUuid(a.projectId) ? a.projectId : null, p_text: a.text, p_link: a.link || null }).catch(() => undefined));
    }
  }

  for (const op of ops) await op();
}

function simple(ops: Op[], api: Supa, before: any[] = [], after: any[] = [], table: string, row: (x: any) => any, insertOnlyCols: string[] = []) {
  const A = mapById(before), B = mapById(after);
  for (const x of after) {
    const o = A.get(x.id);
    if (!o) { ops.push(() => api.insert(table, row(x))); continue; }
    if (!changed(o, x)) continue;
    const patch = patchOf(row(o), row(x)); delete patch.id; delete patch.office_id; for (const k of insertOnlyCols) delete patch[k];
    if (Object.keys(patch).length) ops.push(() => api.update(table, { id: x.id }, patch));
  }
  for (const x of before) if (!B.has(x.id)) ops.push(() => api.remove(table, { id: x.id }));
}
function diffChildren<X extends { id: string }>(ops: Op[], api: Supa, before: X[] = [], after: X[] = [], table: string, row: (x: X) => any) {
  const A = mapById(before), B = mapById(after);
  for (const x of after) {
    const o = A.get(x.id);
    if (!o) { ops.push(() => api.insert(table, row(x))); continue; }
    if (!changed(o, x)) continue;
    const patch = patchOf(row(o), row(x)); delete patch.id; delete patch.office_id;
    if (Object.keys(patch).length) ops.push(() => api.update(table, { id: x.id }, patch));
  }
  for (const x of before) if (!B.has(x.id)) ops.push(() => api.remove(table, { id: x.id }));
}
