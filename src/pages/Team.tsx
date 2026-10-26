import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuUserPlus, LuMail, LuPhone, LuCheck, LuX, LuShieldCheck, LuRefreshCw, LuTrash2, LuUserX, LuUserCheck } from 'react-icons/lu';
import { useStore } from '../data/store';
import { canManageTeam, ROLE_LABEL, ROLE_SHORT, A, uid, byId, projectOf, currentPlan, isOverdue, visibleProjects } from '../data/api';
import type * as T from '../data/types';
import { todayISO } from '../data/dates';
import { PageHead, Btn, Tabs, DataTable, StatusBadge, Badge, Card, KV, Modal, Field, Input, Select, Empty, Callout, Avatar, Switch, AssumeTag, Progress, cx, Confirm } from '../ui/core';
import { ActivityFeed, TaskLine, ProjectLink } from './shared';
import { date, ago } from '../lib/format';

const PERMS: { group: string; rows: [string, Record<string, boolean | string>][] }[] = [
  { group: 'פרויקטים', rows: [
    ['צפייה בכל פרויקטי המשרד', { owner: true, admin: true, member: 'משויכים בלבד', client: 'שלו בלבד' }],
    ['יצירת פרויקט', { owner: true, admin: true, member: false, client: false }],
    ['שינוי סטטוס פרויקט', { owner: true, admin: true, member: false, client: false }],
    ['משימות, שרטוטים, מפרטים ומסמכים', { owner: true, admin: true, member: true, client: 'צפייה במשותף' }],
  ] },
  { group: 'כספים', rows: [
    ['תקציב ביצוע והוצאות', { owner: true, admin: true, member: 'לפי הגדרה', client: 'סיכום (לפי הגדרה)' }],
    ['שכר טרחה', { owner: true, admin: true, member: false, client: false }],
    ['הזמנות רכש', { owner: true, admin: true, member: true, client: false }],
  ] },
  { group: 'לקוחות ואישורים', rows: [
    ['שליחה לאישור לקוח', { owner: true, admin: true, member: true, client: false }],
    ['אישור / דחייה / בקשת שינוי', { owner: false, admin: false, member: false, client: true }],
    ['ניהול גישה לפורטל', { owner: true, admin: true, member: false, client: false }],
  ] },
  { group: 'משרד', rows: [
    ['הזמנת משתמשים ושינוי תפקידים', { owner: true, admin: true, member: false, client: false }],
    ['מנוי וחיוב', { owner: true, admin: 'צפייה (לפי הגדרה)', member: false, client: false }],
    ['הגדרות משרד', { owner: true, admin: true, member: false, client: false }],
  ] },
];

export function TeamPage({ query }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const [tab, setTab] = useState(query.tab || 'members');
  const [invite, setInvite] = useState(false);
  const staff = db.users.filter((u) => u.officeId && u.role !== 'client');
  const can = canManageTeam(me);
  const plan = currentPlan(db);
  const pendingInv = db.invitations.filter((i) => i.status === 'ממתינה' && i.role !== 'client');
  const seats = staff.filter((u) => u.status !== 'מושבת').length;
  const limit = plan.limits.users;
  return (
    <div>
      <PageHead title={can ? 'צוות והרשאות' : 'צוות'} sub="חברי המשרד, תפקידים, שיוך לפרויקטים והזמנות." actions={can ? <Btn kind="primary" icon={LuUserPlus} onClick={() => setInvite(true)}>הזמנת חבר/ת צוות</Btn> : null} />
      <div className="card pad row wrap g16" style={{ marginBottom: 20 }}>
        <div className="grow" style={{ minWidth: 220 }}>
          <div className="meter-label"><span className="bold">משתמשים במסלול {plan.name}</span><span className="num ltr">{seats + pendingInv.length} / {limit ?? '∞'}</span></div>
          <Progress value={limit ? (seats + pendingInv.length) / limit : 0.2} tone={limit && seats + pendingInv.length >= limit ? 'warn' : ''} />
          <div className="xs muted mt8">{seats} פעילים · {pendingInv.length} הזמנות ממתינות נספרות במכסה{IS_LIVE ? '' : ' (הנחת דמו)'}</div>
        </div>
        {limit && seats + pendingInv.length >= limit ? <Callout kind="assume">הגעתם למגבלת המשתמשים. <button type="button" className="linkish" onClick={() => nav('/billing/change?plan=pro')}>שדרוג</button></Callout> : null}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'members', label: 'חברי צוות', count: staff.length }, { id: 'invites', label: 'הזמנות', count: db.invitations.filter((i) => i.status === 'ממתינה').length }, { id: 'assign', label: 'שיוך לפרויקטים' }, { id: 'perms', label: 'תפקידים והרשאות', icon: LuShieldCheck }]} />
      {tab === 'members' ? (
        <div className="card">
          <DataTable rows={staff} onRow={(u: T.User) => nav(`/team/${u.id}`)} columns={[
            { key: 'name', label: 'שם', render: (u: T.User) => <span className="row g12"><Avatar user={u} /><span className="col" style={{ gap: 0 }}><b>{u.name}{u.id === me.id ? ' (את/ה)' : ''}</b><span className="xs muted">{u.title}</span></span></span> },
            { key: 'role', label: 'תפקיד מערכת', render: (u: T.User) => can && u.role !== 'owner' && u.id !== me.id ? <select className="select sm" style={{ width: 'auto' }} value={u.role} onClick={(e) => e.stopPropagation()} onChange={(e) => { run(A.setUserRole, u.id, e.target.value); toast(`התפקיד של ${u.name} עודכן`); }} aria-label={`תפקיד ${u.name}`}><option value="admin">{ROLE_SHORT.admin}</option><option value="member">{ROLE_SHORT.member}</option></select> : <Badge tone={u.role === 'owner' ? 'navy' : u.role === 'admin' ? 'info' : ''}>{ROLE_SHORT[u.role]}</Badge> },
            { key: 'projects', label: 'פרויקטים', sortValue: (u: T.User) => db.assignments.filter((a) => a.userId === u.id).length, render: (u: T.User) => <span className="num">{db.assignments.filter((a) => a.userId === u.id).length}</span> },
            { key: 'tasks', label: 'משימות פתוחות', sortValue: (u: T.User) => db.tasks.filter((t) => t.assigneeId === u.id && t.status !== 'הושלם').length, render: (u: T.User) => { const open = db.tasks.filter((t) => t.assigneeId === u.id && t.status !== 'הושלם'); const late = open.filter(isOverdue).length; return <span className="num">{open.length}{late ? <span className="bad-t"> · {late} באיחור</span> : null}</span>; } },
            { key: 'lastActive', label: 'פעילות אחרונה', render: (u: T.User) => <span className="small">{ago(u.lastActive)}</span> },
            { key: 'status', label: 'סטטוס', render: (u: T.User) => <StatusBadge s={u.status} /> },
          ]} />
        </div>
      ) : null}
      {tab === 'invites' ? <Invites /> : null}
      {tab === 'assign' ? <AssignMatrix /> : null}
      {tab === 'perms' ? <PermMatrix /> : null}
      {invite ? <InviteForm onClose={() => setInvite(false)} /> : null}
    </div>
  );
}

function Invites() {
  const { db, me, run, toast, live } = useStore();
  const can = canManageTeam(me);
  return (
    <div className="card">
      <DataTable rows={db.invitations} empty={<Empty title="אין הזמנות" />} columns={[
        { key: 'name', label: 'מוזמן/ת', render: (i: T.Invitation) => <div className="col" style={{ gap: 0 }}><b>{i.name}</b><span className="xs muted ltr" style={{ textAlign: 'right' }}>{i.email}</span></div> },
        { key: 'role', label: 'תפקיד', render: (i: T.Invitation) => ROLE_SHORT[i.role] },
        { key: 'sentAt', label: 'נשלחה', render: (i: T.Invitation) => <span className="small">{date(i.sentAt)} · {db.users.find((u) => u.id === i.sentBy)?.name}</span> },
        { key: 'status', label: 'סטטוס', render: (i: T.Invitation) => <StatusBadge s={i.status} /> },
        { key: 'act', label: '', sortable: false, render: (i: T.Invitation) => can && i.status !== 'התקבלה' ? (
          <div className="row g4 wrap">
            <Btn size="xs" icon={LuRefreshCw} onClick={() => { if (live) { live.enqueue((api) => api.rpc('resend_invitation', { p_invitation: i.id }), 'נוצרה הזמנה חדשה ונכנסה לתור השליחה. הקישור הקודם בוטל.', 'info'); return; } run((d: any) => { const x = d.invitations.find((y: any) => y.id === i.id); x.status = 'ממתינה'; x.sentAt = todayISO; d.emailLog.unshift({ id: uid('em'), to: i.email, subject: `תזכורת: הוזמנת להצטרף ל${d.office.name}`, template: 'team_invite', at: todayISO + 'T09:00', status: 'הודמה – לא נשלח', relatedLink: '/team' }); }); toast('ההזמנה נשלחה שוב (מדומה)', 'info'); }}>שליחה חוזרת</Btn>
            {i.status === 'ממתינה' && i.role !== 'client' && !live ? <Btn size="xs" icon={LuCheck} onClick={() => { run(A.acceptInvite, i.id); toast(`${i.name} הצטרף/ה (סימולציה)`); }}>סימולציית הצטרפות</Btn> : null}
            <Btn size="xs" kind="ghost" icon={LuTrash2} onClick={() => { run(A.revokeInvite, i.id); toast('ההזמנה בוטלה'); }} aria-label="ביטול הזמנה" />
          </div>
        ) : null },
      ]} />
    </div>
  );
}

function InviteForm({ onClose }: any) {
  const { db, me, run, toast, live } = useStore();
  const [f, setF] = useState({ name: '', email: '', role: 'member' as T.Role, projects: [] as string[] });
  const [err, setErr] = useState<any>({});
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = 'יש להזין שם';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'כתובת מייל לא תקינה';
    if (db.users.some((u) => u.email === f.email) || db.invitations.some((i) => i.email === f.email && i.status === 'ממתינה')) e.email = 'כבר קיים משתמש או הזמנה למייל הזה';
    setErr(e); if (Object.keys(e).length) return;
    run(A.invite, { id: uid('inv'), officeId: 'off_1', email: f.email.trim(), name: f.name.trim(), role: f.role, sentAt: todayISO, sentBy: me.id, status: 'ממתינה' });
    toast(IS_LIVE ? `ההזמנה ל${f.name} נוצרה והמייל בתור לשליחה.` : `ההזמנה ל${f.name} נרשמה. מייל מדומה – לא נשלח.`, 'info'); onClose();
  };
  return (
    <Modal title="הזמנת חבר/ת צוות" onClose={onClose} foot={<><Btn kind="primary" icon={LuMail} onClick={save}>שליחת הזמנה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="שם מלא *" error={err.name} htmlFor="iv-n"><Input id="iv-n" value={f.name} invalid={err.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="מייל *" error={err.email} htmlFor="iv-e"><Input id="iv-e" className="ltr" value={f.email} invalid={err.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="תפקיד" full htmlFor="iv-r" hint={f.role === 'admin' ? 'מנהל/ת משרד: ניהול מלא של פרויקטים, צוות והגדרות' : 'חבר/ת צוות: עבודה בפרויקטים שאליהם משויך/ת'}><Select id="iv-r" value={f.role} onChange={(e: any) => setF({ ...f, role: e.target.value })} options={[{ value: 'member', label: ROLE_LABEL.member }, { value: 'admin', label: ROLE_LABEL.admin }]} /></Field>
      </div>
      <div className="mt16"><Callout kind="info">לקוחות מוזמנים מכרטיס הלקוח. ספקים וקבלנים אינם מקבלים חשבון ב-MVP.</Callout></div>
    </Modal>
  );
}

function AssignMatrix() {
  const { db, me, run, toast, live } = useStore();
  const staff = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status === 'פעיל');
  const projects = db.projects.filter((p) => p.status !== 'הושלם');
  const can = canManageTeam(me);
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>פרויקט</th>{staff.map((u) => <th key={u.id} className="t-center"><span className="col" style={{ alignItems: 'center', gap: 2 }}><Avatar user={u} size="sm" /><span className="xs">{u.name.split(' ')[0]}</span></span></th>)}</tr></thead>
          <tbody>{projects.map((p) => (
            <tr key={p.id}>
              <td><ProjectLink id={p.id} /></td>
              {staff.map((u) => {
                const on = db.assignments.some((a) => a.projectId === p.id && a.userId === u.id);
                const lead = p.leadId === u.id;
                return <td key={u.id} className="t-center"><input type="checkbox" checked={on} disabled={!can || lead} title={lead ? 'אחראי/ת הפרויקט' : undefined} onChange={() => { run(on ? A.unassign : A.assign, p.id, u.id, 'צוות'); toast(`${u.name} ${on ? 'הוסר/ה מ' : 'שויך/ה ל'}${p.name}`); }} aria-label={`${u.name} ב${p.name}`} style={{ width: 16, height: 16, accentColor: lead ? 'var(--accent)' : 'var(--navy-2)' }} /></td>;
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card-foot xs muted">חברי צוות רואים רק פרויקטים שאליהם הם משויכים{IS_LIVE ? ' (ניתן לשנות בלשונית ההרשאות).' : ' (הנחת דמו – ניתן לשנות בלשונית ההרשאות).'}</div>
    </div>
  );
}

function PermMatrix() {
  const { db, me, run, toast, live } = useStore();
  const can = me.role === 'owner';
  const cell = (v: boolean | string) => v === true ? <LuCheck aria-label="מותר" style={{ width: 18, color: 'var(--ok)' }} /> : v === false ? <LuX aria-label="לא מותר" style={{ width: 16, color: 'var(--ink-3)' }} /> : <span className="xs warn-t">{v}</span>;
  const toggles: [string, string][] = [['memberSeesAllProjects', 'חברי צוות רואים את כל פרויקטי המשרד'], ['memberCanSeeFinance', 'חברי צוות רואים תקציב והוצאות'], ['adminCanManageBilling', 'מנהלי משרד יכולים לנהל מנוי וחיוב'], ['clientSeesBudgetSummary', 'לקוחות רואים סיכום תקציב ביצוע בפורטל']];
  return (
    <div className="stack-lg">
      <Callout kind="assume" title={IS_LIVE ? 'מטריצת הרשאות' : 'מטריצת הרשאות – הנחת דמו'}>החלוקה מבוססת על חמשת התפקידים שהוגדרו. השורות המסומנות בצהוב תלויות בהגדרות למטה. {IS_LIVE ? 'ההרשאות נאכפות בשרת (RLS), לא רק בממשק. חלוקת ברירת המחדל עדיין טעונה אישור עסקי.' : 'בייצור ההרשאות ייאכפו ב-RLS של Supabase ולא רק בממשק.'}</Callout>
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>יכולת</th><th className="t-center">בעלים</th><th className="t-center">מנהל/ת משרד</th><th className="t-center">חבר/ת צוות</th><th className="t-center">לקוח</th></tr></thead>
            <tbody>{PERMS.flatMap((g) => [<tr key={g.group} className="group-row"><td colSpan={5}>{g.group}</td></tr>, ...g.rows.map(([label, v]) => <tr key={label}><td>{label}</td>{['owner', 'admin', 'member', 'client'].map((r) => <td key={r} className="t-center">{cell(v[r])}</td>)}</tr>)])}</tbody>
          </table>
        </div>
        <div className="card-foot xs muted">Super Admin פועל בקונסולה נפרדת ואינו חבר במשרד.</div>
      </div>
      <Card title="הגדרות הרשאה גמישות" actions={<AssumeTag />}>
        <div className="col g12">
          {toggles.map(([k, label]) => <Switch key={k} id={'perm-' + k} checked={db.settings[k]} onChange={(v: boolean) => { if (!can) { toast('רק בעלי המשרד יכולים לשנות הרשאות', 'bad'); return; } run(A.setSetting, k, v); toast('ההגדרה עודכנה – נסו להחליף תפקיד ולראות את ההבדל'); }} label={label} />)}
          {!can ? <span className="xs muted">רק בעלים יכולים לשנות.</span> : null}
        </div>
      </Card>
    </div>
  );
}

export function MemberDetail({ id }: { id: string }) {
  const { db, me, run, toast, nav, live } = useStore();
  const u = byId(db.users, id);
  const [dis, setDis] = useState(false);
  if (!u || !u.officeId) return <Empty heading="h1" title="המשתמש לא נמצא" action={<Btn onClick={() => nav('/team')}>לצוות</Btn>} />;
  const as = db.assignments.filter((a) => a.userId === id);
  const tasks = db.tasks.filter((t) => t.assigneeId === id && t.status !== 'הושלם').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const can = canManageTeam(me) && u.role !== 'owner' && u.id !== me.id;
  return (
    <div>
      <PageHead crumbs={[{ label: 'צוות', to: '/team' }, { label: u.name }]} title={u.name} badge={<><Badge tone={u.role === 'owner' ? 'navy' : u.role === 'admin' ? 'info' : ''}>{ROLE_SHORT[u.role]}</Badge><StatusBadge s={u.status} /></>} sub={u.title}
        actions={can ? (u.status === 'מושבת' ? <Btn icon={LuUserCheck} onClick={() => { run(A.setUserStatus, id, 'פעיל'); toast('המשתמש הופעל מחדש'); }}>הפעלה מחדש</Btn> : <Btn kind="danger" icon={LuUserX} onClick={() => setDis(true)}>השבתת משתמש</Btn>) : null} />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title={`משימות פתוחות (${tasks.length})`} pad={false}>{tasks.length ? <div className="list">{tasks.map((t) => <TaskLine key={t.id} t={t} onOpen={() => nav(`/tasks?open=${t.id}`)} />)}</div> : <Empty title="אין משימות פתוחות" />}</Card>
          <Card title="היסטוריית פעילות"><ActivityFeed items={db.activity.filter((a) => a.userId === id)} max={15} /></Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פרטים">
            <div className="stack">
              <div className="row g12"><Avatar user={u} size="lg" /><div className="col" style={{ gap: 2 }}><b>{u.name}</b><span className="small muted">{ROLE_LABEL[u.role]}</span></div></div>
              <KV items={[['מייל', <span className="ltr">{u.email}</span>], ['טלפון', <span className="ltr">{u.phone || '—'}</span>], ['במשרד מאז', date(u.joinedAt)], ['פעילות אחרונה', ago(u.lastActive)]]} />
            </div>
          </Card>
          <Card title={`פרויקטים (${as.length})`} pad={false}><div className="list">{as.map((a) => <div key={a.id} className="li click" onClick={() => nav(`/projects/${a.projectId}`)}><div className="li-main"><div className="li-title">{projectOf(db, a.projectId)?.name}</div><div className="li-sub">{a.roleInProject}</div></div><StatusBadge s={projectOf(db, a.projectId)!.status} /></div>)}</div></Card>
          <Card title="היעדרויות">{db.absences.filter((a) => a.userId === id).map((a) => <div key={a.id} className="small row between" style={{ padding: '4px 0' }}><span>{a.kind}{a.note ? ' · ' + a.note : ''}</span><span className="muted">{date(a.from)}</span></div>)}{!db.absences.some((a) => a.userId === id) ? <span className="small muted">אין</span> : null}</Card>
        </div>
      </div>
      {dis ? <Confirm title={`השבתת ${u.name}`} danger confirmLabel="השבתה" onClose={() => setDis(false)} onConfirm={() => { run(A.setUserStatus, id, 'מושבת'); toast(IS_LIVE ? 'המשתמש הושבת – הגישה למשרד נחסמה' : 'המשתמש הושבת – הגישה נחסמה (בדמו)'); }}>המשתמש לא יוכל להיכנס. המשימות והפעילות שלו יישמרו. ניתן להפעיל מחדש.</Confirm> : null}
    </div>
  );
}
