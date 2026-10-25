import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuSend, LuBellRing, LuArrowLeft, LuCheck, LuX, LuMessageSquare, LuEye } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjectIds, visibleProjects, projectOf, clientOf, contactOf, userName, A, uid, byId, canChangeProjectStatus, simulateEmail, notify } from '../data/api';
import type * as T from '../data/types';
import { todayISO, D } from '../data/dates';
import { PageHead, Btn, Chips, Select, DataTable, StatusBadge, Badge, Modal, Field, Input, Textarea, Empty, Callout, Card, Drawer, KV, DemoTag, Stat } from '../ui/core';
import { ProjectLink, PersonCell, DueCell } from './shared';
import { date, ils } from '../lib/format';

export function refLink(a: T.Approval) {
  if (a.kind === 'מפרט') return a.refId.startsWith('sv') ? `/specs/${a.projectId}` : `/specs/${a.projectId}?item=${a.refId}`;
  if (a.kind === 'שרטוט') return `/plans/${a.refId}`;
  if (a.kind === 'מסמך' || a.kind === 'הצעת מחיר') return `/documents/${a.refId}`;
  return `/projects/${a.projectId}/budget`;
}

export function ApprovalsPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const pids = visibleProjectIds(db, me);
  const all = db.approvals.filter((a) => pids.has(a.projectId));
  const [status, setStatus] = useState('ממתין');
  const [project, setProject] = useState('');
  const [kind, setKind] = useState('');
  const [open, setOpen] = useState<string | null>(query.open || null);
  const [sending, setSending] = useState(!!query.new);
  useEffect(() => { if (query.open) setOpen(query.open); }, [query.open]);
  let list = all.filter((a) => status === 'all' || a.status === status);
  if (project) list = list.filter((a) => a.projectId === project);
  if (kind) list = list.filter((a) => a.kind === kind);
  const overdue = all.filter((a) => a.status === 'ממתין' && a.dueAt < todayISO).length;
  return (
    <div>
      <PageHead title="אישורי לקוח" sub="כל מה שנשלח ללקוחות לאישור: מפרטים, שרטוטים, מסמכים ושינויי תקציב." actions={<Btn kind="primary" icon={LuSend} onClick={() => setSending(true)}>שליחה לאישור</Btn>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="ממתינים" value={all.filter((a) => a.status === 'ממתין').length} onClick={() => setStatus('ממתין')} />
        <Stat label="עברו את מועד היעד" value={overdue} tone={overdue ? 'alert' : ''} onClick={() => setStatus('ממתין')} />
        <Stat label="בקשות שינוי פתוחות" value={all.filter((a) => a.status === 'בקשת שינוי').length} tone="warn" onClick={() => setStatus('בקשת שינוי')} />
        <Stat label="אושרו ב-30 הימים האחרונים" value={all.filter((a) => a.status === 'אושר' && a.decidedAt && a.decidedAt >= D(-30)).length} onClick={() => setStatus('אושר')} />
      </div>
      <div className="filters">
        <Chips value={status} onChange={setStatus} options={[{ value: 'ממתין', label: 'ממתין' }, { value: 'בקשת שינוי', label: 'בקשת שינוי' }, { value: 'אושר', label: 'אושר' }, { value: 'נדחה', label: 'נדחה' }, { value: 'all', label: 'הכול' }].map((o) => ({ ...o, count: o.value === 'all' ? all.length : all.filter((a) => a.status === o.value).length }))} />
        <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
        <Select value={kind} onChange={(e: any) => setKind(e.target.value)} placeholder="כל הסוגים" options={['מפרט', 'שרטוט', 'מסמך', 'הצעת מחיר', 'שינוי תקציב']} aria-label="סוג" />
      </div>
      <ApprovalTable rows={list} onOpen={(a: T.Approval) => setOpen(a.id)} />
      {open && byId(db.approvals, open) ? <ApprovalDrawer id={open} onClose={() => { setOpen(null); if (query.open) nav('/approvals'); }} /> : null}
      {sending ? <SendForApproval onClose={() => { setSending(false); if (query.new) nav('/approvals'); }} /> : null}
    </div>
  );
}

function ApprovalTable({ rows, onOpen, hideProject }: any) {
  const { db, live } = useStore();
  return (
    <div className="card">
      <DataTable rows={rows} onRow={onOpen} pageSize={12} initialSort={{ key: 'dueAt', dir: 1 }} empty={<Empty title="אין פריטים בסינון הזה" />} columns={[
        { key: 'title', label: 'פריט', render: (a: T.Approval) => <div className="col" style={{ gap: 0 }}><b>{a.title}</b><span className="xs muted">{a.kind}{a.amount ? ' · ' + ils(a.amount) : ''}</span></div> },
        ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', render: (a: T.Approval) => <ProjectLink id={a.projectId} /> }]),
        { key: 'contact', label: 'אצל', sortValue: (a: T.Approval) => contactOf(db, a.contactId)?.contact.name, render: (a: T.Approval) => contactOf(db, a.contactId)?.contact.name },
        { key: 'requestedBy', label: 'נשלח ע״י', render: (a: T.Approval) => <PersonCell id={a.requestedBy} sub={date(a.requestedAt)} /> },
        { key: 'dueAt', label: 'יעד', render: (a: T.Approval) => a.status === 'ממתין' ? <DueCell date={a.dueAt} /> : <span className="small muted">הוחלט {date(a.decidedAt)}</span> },
        { key: 'status', label: 'סטטוס', render: (a: T.Approval) => <StatusBadge s={a.status} /> },
      ]} />
    </div>
  );
}

export function ApprovalList({ projectId }: { projectId: string }) {
  const { db, live } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const rows = db.approvals.filter((a) => a.projectId === projectId);
  return (
    <div>
      <div className="filters"><span className="small muted">{rows.filter((a) => a.status === 'ממתין').length} ממתינים · {rows.filter((a) => a.status === 'אושר').length} אושרו</span><div className="grow" /><Btn kind="primary" icon={LuSend} onClick={() => setSending(true)}>שליחה לאישור</Btn></div>
      <ApprovalTable rows={rows} hideProject onOpen={(a: T.Approval) => setOpen(a.id)} />
      {open ? <ApprovalDrawer id={open} onClose={() => setOpen(null)} /> : null}
      {sending ? <SendForApproval projectId={projectId} onClose={() => setSending(false)} /> : null}
    </div>
  );
}

export function ApprovalDrawer({ id, onClose }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const a = byId(db.approvals, id)!;
  const ct = contactOf(db, a.contactId);
  const spec = a.kind === 'מפרט' ? byId(db.specItems, a.refId) : undefined;
  return (
    <Drawer title={a.title} sub={`${a.kind} · ${projectOf(db, a.projectId)?.name}`} onClose={onClose} foot={a.status === 'ממתין' ? (
      <>
        <Btn kind="navy" icon={LuBellRing} onClick={() => { if (live) { live.enqueue((api) => api.rpc('send_approval_reminder', { p_approval: a.id }), 'תזכורת נשלחה ללקוח (התראה בפורטל + מייל בתור)'); return; } run((d: any, c: any) => { simulateEmail(d, ct?.contact.email || '', `תזכורת: ${a.title} ממתין לאישורך`, 'approval_reminder', '/approvals'); if (ct?.contact.userId) notify(d, ct.contact.userId, { kind: 'approval', title: 'תזכורת: פריט ממתין לאישורך', body: a.title, link: '/portal/approvals' }); }); toast('תזכורת נרשמה (מייל מדומה – לא נשלח)', 'info'); }}>שליחת תזכורת</Btn>
        <Btn icon={LuEye} onClick={() => nav(refLink(a))}>לפריט המקור</Btn>
      </>
    ) : <Btn icon={LuEye} onClick={() => nav(refLink(a))}>לפריט המקור</Btn>}>
      <div className="stack-lg">
        <div className="row g8 wrap"><StatusBadge s={a.status} />{a.status === 'ממתין' && a.dueAt < todayISO ? <Badge tone="bad">עבר את מועד היעד</Badge> : null}</div>
        <KV items={[['פרויקט', <ProjectLink id={a.projectId} />], ['מאשר/ת', `${ct?.contact.name} (${ct?.client.name})`], ['נשלח', `${date(a.requestedAt)} ע״י ${userName(db, a.requestedBy)}`], ['יעד לתשובה', date(a.dueAt)], ...(a.amount ? [['סכום', ils(a.amount)] as [string, any]] : []), ...(a.decidedAt ? [['הוחלט', date(a.decidedAt)] as [string, any]] : [])]} />
        {spec ? <Callout kind="info" title={spec.name}>{spec.qty} {spec.unit} × {ils(spec.unitPrice)} = <b>{ils(spec.qty * spec.unitPrice)}</b>{spec.alternatives.length ? ` · ${spec.alternatives.length} חלופות מוצגות ללקוח` : ''}</Callout> : null}
        {a.comment ? <div className="comment client"><span className="av sm" style={{ background: 'var(--info)' }}>ל</span><div className="c-bubble"><b className="small">{ct?.contact.name}</b><div className="small">{a.comment}</div></div></div> : null}
        {a.status === 'ממתין' && live ? <Callout kind="info">ההחלטה מתקבלת רק אצל הלקוח, בפורטל. אחרי שהלקוח יחליט תגיע אליך התראה.</Callout> : null}
        {a.status === 'ממתין' && !live ? (
          <Card title="סימולציית תשובת לקוח" actions={<DemoTag />}>
            <p className="small soft mb8">בייצור, רק הלקוח יכול לאשר. כאן אפשר לדמות את התשובה כדי לראות את ההשפעה על המפרט, השרטוט וההתראות. אפשר גם להיכנס לפורטל כ"דנה כהן" מתפריט המשתמש.</p>
            <div className="row g8 wrap">
              <Btn size="sm" kind="ok" icon={LuCheck} onClick={() => { run(A.decideApproval, id, 'אושר', 'אושר (סימולציה מצד המשרד)'); toast('סומן כאושר (סימולציה)'); }}>אישור</Btn>
              <Btn size="sm" icon={LuMessageSquare} onClick={() => { run(A.decideApproval, id, 'בקשת שינוי', 'בקשת שינוי (סימולציה)'); toast('נרשמה בקשת שינוי (סימולציה)'); }}>בקשת שינוי</Btn>
              <Btn size="sm" kind="danger" icon={LuX} onClick={() => { run(A.decideApproval, id, 'נדחה', 'נדחה (סימולציה)'); toast('סומן כנדחה (סימולציה)'); }}>דחייה</Btn>
            </div>
          </Card>
        ) : null}
      </div>
    </Drawer>
  );
}

/** Send any record for client approval. Suggests (never forces) moving the project to "ממתין לאישור". */
export function SendForApproval({ projectId, kind, refId, title, amount, onClose, onSent }: { projectId?: string; kind?: T.Approval['kind']; refId?: string; title?: string; amount?: number; onClose: () => void; onSent?: () => void }) {
  const { db, me, run, toast, live } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'הושלם');
  const [pid, setPid] = useState(projectId || '');
  const p = projectOf(db, pid);
  const client = p ? clientOf(db, p.clientId) : undefined;
  const contacts = client?.contacts || [];
  const [f, setF] = useState({ kind: kind || 'מפרט', refId: refId || '', title: title || '', contactId: '', dueAt: D(5), message: '' });
  const [err, setErr] = useState<any>({});
  const [step, setStep] = useState<'form' | 'status'>('form');
  useEffect(() => { setF((x) => ({ ...x, contactId: contacts.find((c) => c.portal === 'פעיל')?.id || contacts[0]?.id || '' })); }, [pid]);
  const refOptions = !pid ? [] : f.kind === 'מפרט' ? db.specItems.filter((s) => s.projectId === pid && (s.status === 'טיוטה' || s.status === 'בקשת שינוי')).map((s) => ({ value: s.id, label: s.name })) : f.kind === 'שרטוט' ? db.plans.filter((x) => x.projectId === pid).map((x) => ({ value: x.id, label: `${x.number} ${x.title}` })) : db.documents.filter((d) => d.projectId === pid).map((d) => ({ value: d.id, label: d.name }));
  const contact = contacts.find((c) => c.id === f.contactId);
  const submit = () => {
    const e: any = {};
    if (!pid) e.pid = 'יש לבחור פרויקט';
    if (!f.title.trim()) e.title = 'יש להזין כותרת';
    if (!f.contactId) e.contactId = 'יש לבחור איש קשר';
    if (f.dueAt < todayISO) e.dueAt = 'מועד היעד חייב להיות היום או בעתיד';
    setErr(e); if (Object.keys(e).length) return;
    run(A.requestApproval, { id: uid('ap'), projectId: pid, kind: f.kind, refId: f.refId || 'manual', title: f.title, requestedBy: me.id, requestedAt: todayISO, dueAt: f.dueAt, status: 'ממתין', contactId: f.contactId, amount });
    if (f.kind === 'מפרט' && f.refId) run((d: any) => { const s = d.specItems.find((x: any) => x.id === f.refId); if (s) { s.status = 'ממתין לאישור לקוח'; s.sharedWithClient = true; } });
    if (f.kind === 'שרטוט' && f.refId) run((d: any) => { const pl = d.plans.find((x: any) => x.id === f.refId); if (pl) { pl.sharedWithClient = true; pl.versions[pl.versions.length - 1].status = 'נשלח ללקוח'; } });
    onSent?.();
    toast(IS_LIVE ? `נשלח לאישור ${contact?.name}${contact?.portal === 'פעיל' ? ' בפורטל' : ''}. המייל בתור לשליחה.` : `נשלח לאישור ${contact?.name}${contact?.portal === 'פעיל' ? ' בפורטל' : ''}. מייל מדומה – לא נשלח.`);
    if (p && p.status !== 'ממתין לאישור' && canChangeProjectStatus(me) && ['תכנון ראשוני', 'תכנון בפיתוח'].includes(p.status)) setStep('status'); else onClose();
  };
  if (step === 'status' && p) {
    return (
      <Modal title="לעדכן את סטטוס הפרויקט?" onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={() => { run(A.setProjectStatus, pid, 'ממתין לאישור', `נשלח לאישור: ${f.title}`); toast('סטטוס הפרויקט עודכן ל"ממתין לאישור"'); onClose(); }}>כן, לעדכן ל"ממתין לאישור"</Btn><Btn kind="ghost" onClick={onClose}>להשאיר "{p.status}"</Btn></>}>
        <p className="soft">הפריט נשלח ללקוח. הפרויקט נמצא כרגע בסטטוס <b>{p.status}</b>. המערכת לא משנה סטטוס לבד – רוצים לעדכן?</p>
      </Modal>
    );
  }
  return (
    <Modal title="שליחה לאישור לקוח" onClose={onClose} foot={<><Btn kind="primary" icon={LuSend} onClick={submit}>שליחה לאישור</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="פרויקט *" error={err.pid} htmlFor="sa-p"><Select id="sa-p" value={pid} disabled={!!projectId} invalid={err.pid} onChange={(e: any) => setPid(e.target.value)} placeholder="בחירת פרויקט" options={projects.map((x) => ({ value: x.id, label: x.name }))} /></Field>
        <Field label="סוג" htmlFor="sa-k"><Select id="sa-k" value={f.kind} disabled={!!kind} onChange={(e: any) => setF({ ...f, kind: e.target.value, refId: '' })} options={['מפרט', 'שרטוט', 'מסמך', 'הצעת מחיר', 'שינוי תקציב']} /></Field>
        {!refId && refOptions.length ? <Field label="פריט מקושר" full htmlFor="sa-r"><Select id="sa-r" value={f.refId} onChange={(e: any) => { const o = refOptions.find((x) => x.value === e.target.value); setF({ ...f, refId: e.target.value, title: f.title || o?.label || '' }); }} placeholder="ללא קישור" options={refOptions} /></Field> : null}
        <Field label="כותרת *" full error={err.title} htmlFor="sa-t"><Input id="sa-t" value={f.title} invalid={err.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="איש קשר מאשר *" error={err.contactId} htmlFor="sa-c"><Select id="sa-c" value={f.contactId} invalid={err.contactId} onChange={(e: any) => setF({ ...f, contactId: e.target.value })} placeholder="בחירה" options={contacts.map((c) => ({ value: c.id, label: `${c.name} · פורטל: ${c.portal}` }))} /></Field>
        <Field label="יעד לתשובה" error={err.dueAt} htmlFor="sa-d"><Input id="sa-d" type="date" value={f.dueAt} invalid={err.dueAt} onChange={(e: any) => setF({ ...f, dueAt: e.target.value })} /></Field>
        <Field label="הודעה ללקוח" full htmlFor="sa-m"><Textarea id="sa-m" rows={2} value={f.message} onChange={(e: any) => setF({ ...f, message: e.target.value })} placeholder="אופציונלי" /></Field>
      </div>
      {contact && contact.portal !== 'פעיל' ? <div className="mt16"><Callout kind="assume">ל{contact.name} אין גישה פעילה לפורטל. {IS_LIVE ? 'הבקשה תישלח במייל, אבל כדי לאשר בפורטל צריך קודם להזמין אותו לפורטל ממסך הלקוח.' : 'בייצור תישלח הזמנה במייל; בדמו ההזמנה רק נרשמת.'}</Callout></div> : null}
    </Modal>
  );
}
