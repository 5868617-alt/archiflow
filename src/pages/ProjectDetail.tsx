import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuPencil, LuMapPin, LuRuler, LuCalendarClock, LuUser, LuPhone, LuMail, LuListChecks, LuPencilRuler, LuLayers, LuFileText, LuCalendarDays, LuShoppingCart, LuWallet, LuCoins, LuBadgeCheck, LuUsers, LuMessageCircle, LuActivity, LuLayoutDashboard, LuPlus, LuCheck, LuFlag, LuX, LuEye } from 'react-icons/lu';
import { useStore } from '../data/store';
import { projectOf, clientOf, userName, visibleProjectIds, canSeeFinance, projectFinance, hasFeature, A, isOverdue, canManageTeam } from '../data/api';
import { PHASES } from '../data/types';
import { todayISO, daysFromToday } from '../data/dates';
import { PageHead, Btn, Tabs, Card, KV, StatusBadge, Badge, Progress, Avatar, Empty, Modal, Field, Input, Select, Callout, IconBtn, cx } from '../ui/core';
import { StackBar } from '../ui/charts';
import { ProjectStatusControl, ActivityFeed, MeetingLine, PersonCell, LockedFeature, COVER_LAYOUT } from './shared';
import { PlanSvg } from '../ui/PlanSvg';
import { ProjectForm } from './Projects';
import { ProjectTasks } from './Tasks';
import { PlanGrid } from './Plans';
import { SpecEditor } from './Specs';
import { DocTable } from './Documents';
import { ApprovalList } from './Approvals';
import { POTable } from './Procurement';
import { ProjectBudget, ProjectFees } from './Finance';
import { ProjectThread } from './Comms';
import { date, ils, ilsShort, pct, relDay } from '../lib/format';

export function ProjectDetail({ id, tab }: { id: string; tab: string }) {
  const { db, me, nav, live } = useStore();
  const p = projectOf(db, id);
  const [editing, setEditing] = useState(false);
  if (!p) return <Empty heading="h1" title="הפרויקט לא נמצא" action={<Btn onClick={() => nav('/projects')}>לרשימת הפרויקטים</Btn>} />;
  if (!visibleProjectIds(db, me).has(p.id)) return <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}><Empty heading="h1" title="אין לך גישה לפרויקט הזה">חברי צוות רואים רק פרויקטים שהם משויכים אליהם{IS_LIVE ? '.' : ' (הנחת דמו).'} פנו למנהל/ת המשרד לשיוך.</Empty></div>;
  const fin = canSeeFinance(db, me);
  const client = clientOf(db, p.clientId);
  const c = {
    tasks: db.tasks.filter((t) => t.projectId === id && t.status !== 'הושלם').length,
    plans: db.plans.filter((x) => x.projectId === id).length,
    specs: db.specItems.filter((x) => x.projectId === id).length,
    docs: db.documents.filter((x) => x.projectId === id).length,
    meetings: db.meetings.filter((x) => x.projectId === id && x.date >= todayISO).length,
    pos: db.purchaseOrders.filter((x) => x.projectId === id).length,
    ap: db.approvals.filter((x) => x.projectId === id && x.status === 'ממתין').length,
    team: db.assignments.filter((x) => x.projectId === id).length,
    msgs: db.messages.filter((x) => x.projectId === id).length,
  };
  const tabs = [
    { id: 'overview', label: 'סקירה', icon: LuLayoutDashboard },
    { id: 'tasks', label: 'משימות', icon: LuListChecks, count: c.tasks },
    { id: 'plans', label: 'שרטוטים', icon: LuPencilRuler, count: c.plans },
    { id: 'specs', label: 'מפרט', icon: LuLayers, count: c.specs },
    { id: 'documents', label: 'מסמכים', icon: LuFileText, count: c.docs },
    { id: 'meetings', label: 'פגישות', icon: LuCalendarDays, count: c.meetings },
    { id: 'procurement', label: 'רכש', icon: LuShoppingCart, count: c.pos, lock: !hasFeature(db, 'procurement') },
    ...(fin ? [{ id: 'budget', label: 'תקציב ביצוע', icon: LuWallet }, { id: 'fees', label: 'שכר טרחה', icon: LuCoins, lock: !hasFeature(db, 'fees') }] : []),
    { id: 'approvals', label: 'אישורים', icon: LuBadgeCheck, count: c.ap },
    { id: 'team', label: 'צוות', icon: LuUsers, count: c.team },
    { id: 'messages', label: 'שיחה עם הלקוח', icon: LuMessageCircle, count: c.msgs, lock: !hasFeature(db, 'client_portal') },
    { id: 'activity', label: 'פעילות', icon: LuActivity },
  ];
  const go = (t: string) => nav(`/projects/${id}${t === 'overview' ? '' : '/' + t}`);
  return (
    <div>
      <PageHead
        crumbs={[{ label: 'פרויקטים', to: '/projects' }, { label: p.name }]}
        title={p.name}
        badge={<span className="code">{p.code}</span>}
        art={<PlanSvg layout={COVER_LAYOUT[p.cover] || 'apartment'} />}
        sub={<span className="row wrap g12 small"><span className="row g4"><LuMapPin aria-hidden style={{ width: 14 }} />{p.address}, {p.city}</span><span className="row g4"><LuRuler aria-hidden style={{ width: 14 }} />{p.areaSqm} מ״ר</span><span className="row g4"><LuUser aria-hidden style={{ width: 14 }} />{client?.name}</span><span className="row g4"><LuCalendarClock aria-hidden style={{ width: 14 }} />יעד {date(p.dueDate)}</span></span>}
        actions={<><ProjectStatusControl project={p} />{me.role !== 'client' ? <Btn icon={LuPencil} onClick={() => setEditing(true)}>עריכה</Btn> : null}</>}
      />
      {p.statusNote ? <div style={{ marginTop: -8, marginBottom: 16 }}><Callout kind={p.status === 'בהשהיה' ? 'assume' : 'info'}>{p.status}: {p.statusNote}</Callout></div> : null}
      <Tabs tabs={tabs} value={tab} onChange={go} />
      {tab === 'overview' ? <Overview id={id} go={go} /> : null}
      {tab === 'tasks' ? <ProjectTasks projectId={id} /> : null}
      {tab === 'plans' ? <PlanGrid projectId={id} /> : null}
      {tab === 'specs' ? <SpecEditor projectId={id} embedded /> : null}
      {tab === 'documents' ? <DocTable projectId={id} /> : null}
      {tab === 'meetings' ? <ProjectMeetings id={id} /> : null}
      {tab === 'procurement' ? (hasFeature(db, 'procurement') ? <POTable projectId={id} /> : <LockedFeature feature="procurement" inline />) : null}
      {tab === 'budget' && fin ? <ProjectBudget projectId={id} /> : null}
      {tab === 'fees' && fin ? (hasFeature(db, 'fees') ? <ProjectFees projectId={id} /> : <LockedFeature feature="fees" inline />) : null}
      {tab === 'approvals' ? <ApprovalList projectId={id} /> : null}
      {tab === 'team' ? <ProjectTeam id={id} /> : null}
      {tab === 'messages' ? (hasFeature(db, 'client_portal') ? <ProjectThread projectId={id} /> : <LockedFeature feature="client_portal" inline />) : null}
      {tab === 'activity' ? <Card title="יומן פעילות"><ActivityFeed items={db.activity.filter((a) => a.projectId === id)} max={50} /></Card> : null}
      {editing ? <ProjectForm project={p} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}

function Overview({ id, go }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const p = projectOf(db, id)!;
  const client = clientOf(db, p.clientId);
  const fin = canSeeFinance(db, me);
  const f = fin ? projectFinance(db, id) : null;
  const [addMs, setAddMs] = useState(false);
  const team = db.assignments.filter((a) => a.projectId === id);
  const late = db.tasks.filter((t) => t.projectId === id && isOverdue(t));
  const meetings = db.meetings.filter((m) => m.projectId === id && m.date >= todayISO && m.status === 'מתוכננת').sort((a, b) => a.date.localeCompare(b.date));
  const links = [
    { k: 'tasks', label: 'משימות פתוחות', v: db.tasks.filter((t) => t.projectId === id && t.status !== 'הושלם').length, sub: late.length ? `${late.length} באיחור` : 'אין איחורים', tone: late.length ? 'bad-t' : '', icon: LuListChecks },
    { k: 'plans', label: 'שרטוטים', v: db.plans.filter((x) => x.projectId === id).length, sub: `${db.annotations.filter((a) => a.kind === 'issue' && a.status === 'פתוח' && db.plans.find((pl) => pl.id === a.planId)?.projectId === id).length} ממצאים פתוחים`, icon: LuPencilRuler },
    { k: 'specs', label: 'פריטי מפרט', v: db.specItems.filter((x) => x.projectId === id).length, sub: `${db.specItems.filter((x) => x.projectId === id && x.status === 'מאושר').length} מאושרים`, icon: LuLayers },
    { k: 'approvals', label: 'אישורים ממתינים', v: db.approvals.filter((x) => x.projectId === id && x.status === 'ממתין').length, sub: 'אצל הלקוח', icon: LuBadgeCheck },
    { k: 'documents', label: 'מסמכים', v: db.documents.filter((x) => x.projectId === id).length, sub: `${db.documents.filter((x) => x.projectId === id && x.sharedWithClient).length} משותפים`, icon: LuFileText },
    { k: 'procurement', label: 'הזמנות רכש', v: db.purchaseOrders.filter((x) => x.projectId === id).length, sub: `${db.purchaseOrders.filter((x) => x.projectId === id && !['סופקה', 'בוטלה'].includes(x.status)).length} פתוחות`, icon: LuShoppingCart },
  ];
  return (
    <div className="grid-main-side">
      <div className="stack-lg" style={{ minWidth: 0 }}>
        <Card title="התקדמות ושלבים" actions={<span className="bold num">{p.progress}%</span>}>
          <div className="phases" style={{ overflowX: 'auto' }}>
            {PHASES.map((ph, i) => <div key={ph} className={cx('phase', i < p.phase && 'done', i === p.phase && p.status !== 'הושלם' && 'now', p.status === 'הושלם' && 'done')}><div className="bar" /><div className="ph-label" title={ph}>{ph}</div></div>)}
          </div>
          <p className="small soft mt16">{p.description}</p>
        </Card>

        <div className="grid-3">
          {links.map((l) => (
            <button key={l.k} type="button" className="card link stat" style={{ textAlign: 'right', font: 'inherit', color: 'inherit' }} onClick={() => go(l.k)}>
              <div className="s-label"><l.icon aria-hidden />{l.label}</div>
              <div className="s-value" style={{ fontSize: '1.5rem' }}>{l.v}</div>
              <div className={cx('s-meta', l.tone)}>{l.sub}</div>
            </button>
          ))}
        </div>

        <Card title="אבני דרך ומועדים" icon={LuFlag} actions={<Btn size="sm" icon={LuPlus} onClick={() => setAddMs(true)}>אבן דרך</Btn>}>
          <div className="timeline">
            {p.milestones.map((m) => {
              const lateMs = !m.done && m.date < todayISO;
              const isNext = !m.done && p.milestones.find((x) => !x.done)?.id === m.id;
              return (
                <div key={m.id} className={cx('tl-item', m.done && 'done', isNext && 'now', lateMs && 'late')}>
                  <div className="row between g8">
                    <label className="row g8 clickable" htmlFor={'ms-' + m.id}>
                      <input id={'ms-' + m.id} type="checkbox" checked={m.done} onChange={() => { run(A.toggleMilestone, id, m.id); toast(m.done ? 'אבן הדרך נפתחה מחדש' : 'אבן הדרך סומנה כהושלמה'); }} style={{ accentColor: 'var(--ok)' }} />
                      <span className={cx(m.done && 'muted')} style={{ textDecoration: m.done ? 'line-through' : undefined }}>{m.title}</span>
                    </label>
                    <span className={cx('small nowrap', lateMs ? 'bad-t bold' : 'muted')}>{date(m.date)}{!m.done && daysFromToday(m.date) >= 0 && daysFromToday(m.date) < 7 ? ` · ${relDay(m.date)}` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="פעילות אחרונה" actions={<Btn size="sm" kind="ghost" onClick={() => go('activity')}>הכול</Btn>}>
          <ActivityFeed items={db.activity.filter((a) => a.projectId === id)} max={5} />
        </Card>
      </div>

      <div className="stack-lg" style={{ minWidth: 0 }}>
        {f ? (
          <Card title="תמונה כספית" icon={LuWallet} actions={IS_LIVE ? undefined : <span className="tag-demo">מדומה</span>}>
            <div className="stack">
              <div>
                <div className="eyebrow mb8">תקציב ביצוע (כספי הלקוח)</div>
                <div className="row between"><span className="lg bold num">{ils(f.actual)}</span><span className="small muted">מתוך {ils(f.planned)}</span></div>
                <div className="mt8"><Progress value={f.pct} tone={f.byCat.some((x) => x.pct > 1) ? 'bad' : f.pct > 0.9 ? 'warn' : ''} /></div>
                <div className="xs muted mt8">{pct(f.pct)} נוצל · {ilsShort(f.committed)} התחייבויות פתוחות · {ilsShort(f.remaining)} יתרה{f.byCat.some((x) => x.pct > 1) ? ' · ' : ''}{f.byCat.some((x) => x.pct > 1) ? <b className="bad-t">חריגה בסעיף</b> : null}</div>
              </div>
              <hr className="sep" />
              <div>
                <div className="eyebrow mb8">שכר טרחה (המשרד)</div>
                <StackBar total={f.feeTotal} parts={[{ label: 'שולם', value: f.feePaid, color: 'var(--ok)' }, { label: 'בדרישה', value: f.feeBilled, color: 'var(--info)' }, { label: 'עתידי', value: Math.max(0, f.feeTotal - f.feePaid - f.feeBilled), color: 'var(--line-strong)' }]} />
              </div>
              <hr className="sep" />
              <KV items={[['היקף כולל לפרויקט', <b className="num">{ils(f.planned + f.feeTotal)}</b>], ['ביצוע + שכר טרחה ששולמו', <span className="num">{ils(f.paid + f.feePaid)}</span>], ['מפרט מתומחר', <span className="num">{ils(f.specTotal)}</span>]]} />
              <div className="row g8"><Btn size="sm" onClick={() => go('budget')}>פירוט תקציב</Btn><Btn size="sm" kind="ghost" onClick={() => go('fees')}>שכר טרחה</Btn></div>
            </div>
          </Card>
        ) : null}

        <Card title="לקוח" icon={LuUser} actions={<Btn size="sm" kind="ghost" onClick={() => nav(`/clients/${client?.id}`)}>לכרטיס</Btn>}>
          <div className="stack">
            <div className="bold">{client?.name}</div>
            {client?.contacts.map((ct) => (
              <div key={ct.id} className="col g4">
                <div className="row between"><span>{ct.name} <span className="xs muted">· {ct.role}</span></span><StatusBadge s={ct.portal} /></div>
                <div className="xs muted row g12 wrap"><span className="row g4 ltr"><LuPhone aria-hidden style={{ width: 12 }} />{ct.phone}</span><span className="row g4 ltr"><LuMail aria-hidden style={{ width: 12 }} />{ct.email}</span></div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="צוות הפרויקט" icon={LuUsers} pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => go('team')}>ניהול</Btn>}>
          <div className="list">{team.map((a) => <div key={a.id} className="li"><PersonCell id={a.userId} sub={a.roleInProject} />{a.userId === p.leadId ? <Badge tone="accent">אחראי/ת</Badge> : null}</div>)}</div>
        </Card>

        <Card title="פגישות קרובות" icon={LuCalendarDays} pad={false}>
          {meetings.length ? <div className="list">{meetings.slice(0, 4).map((m) => <MeetingLine key={m.id} m={m} />)}</div> : <Empty title="אין פגישות מתוכננות" action={<Btn size="sm" onClick={() => nav(`/calendar?new=1&project=${id}`)}>קביעת פגישה</Btn>} />}
        </Card>
      </div>
      {addMs ? <AddMilestone id={id} onClose={() => setAddMs(false)} /> : null}
    </div>
  );
}

function AddMilestone({ id, onClose }: any) {
  const { run, toast, live } = useStore();
  const [t, setT] = useState(''); const [d, setD] = useState(todayISO); const [err, setErr] = useState('');
  return (
    <Modal title="אבן דרך חדשה" onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={() => { if (!t.trim()) { setErr('יש להזין שם'); return; } run(A.addMilestone, id, t.trim(), d); toast('אבן הדרך נוספה'); onClose(); }}>הוספה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack"><Field label="שם" error={err} htmlFor="ms-t"><Input id="ms-t" value={t} invalid={err} onChange={(e: any) => setT(e.target.value)} /></Field><Field label="תאריך" htmlFor="ms-d"><Input id="ms-d" type="date" value={d} onChange={(e: any) => setD(e.target.value)} /></Field></div>
    </Modal>
  );
}

function ProjectMeetings({ id }: any) {
  const { db, nav, live } = useStore();
  const ms = db.meetings.filter((m) => m.projectId === id).sort((a, b) => b.date.localeCompare(a.date));
  const up = ms.filter((m) => m.date >= todayISO).reverse(); const past = ms.filter((m) => m.date < todayISO);
  return (
    <div className="grid-2">
      <Card title="פגישות קרובות" pad={false} actions={<Btn size="sm" kind="primary" icon={LuPlus} onClick={() => nav(`/calendar?new=1&project=${id}`)}>פגישה</Btn>}>{up.length ? <div className="list">{up.map((m) => <MeetingLine key={m.id} m={m} />)}</div> : <Empty title="אין פגישות קרובות" />}</Card>
      <Card title="פגישות שהתקיימו" pad={false}>{past.length ? <div className="list">{past.map((m) => <MeetingLine key={m.id} m={m} />)}</div> : <Empty title="אין היסטוריה" />}</Card>
    </div>
  );
}

function ProjectTeam({ id }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const p = projectOf(db, id)!;
  const team = db.assignments.filter((a) => a.projectId === id);
  const others = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status === 'פעיל' && !team.some((a) => a.userId === u.id));
  const [uidSel, setUid] = useState(''); const [role, setRole] = useState('אדריכל/ית');
  const can = canManageTeam(me);
  const client = clientOf(db, p.clientId);
  return (
    <div className="grid-main-side">
      <Card title="חברי צוות משויכים" pad={false}>
        <div className="list">
          {team.map((a) => {
            const u = db.users.find((x) => x.id === a.userId)!;
            const open = db.tasks.filter((t) => t.projectId === id && t.assigneeId === u.id && t.status !== 'הושלם').length;
            return (
              <div key={a.id} className="li">
                <Avatar user={u} />
                <div className="li-main"><div className="li-title"><button type="button" className="linkish" onClick={() => nav(`/team/${u.id}`)}>{u.name}</button></div><div className="li-sub">{a.roleInProject} · {u.title}</div></div>
                <span className="xs muted">{open} משימות פתוחות</span>
                {a.userId === p.leadId ? <Badge tone="accent">אחראי/ת</Badge> : can ? <IconBtn icon={LuX} label={`הסרת ${u.name} מהפרויקט`} onClick={() => { run(A.unassign, id, u.id); toast(`${u.name} הוסר/ה מהפרויקט`); }} /> : null}
              </div>
            );
          })}
        </div>
        {can ? (
          <div className="card-foot" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
            <Select className="sm" style={{ width: 'auto' }} value={uidSel} onChange={(e: any) => setUid(e.target.value)} placeholder="הוספת חבר/ת צוות" options={others.map((u) => ({ value: u.id, label: u.name }))} aria-label="בחירת חבר צוות" />
            <Select className="sm" style={{ width: 'auto' }} value={role} onChange={(e: any) => setRole(e.target.value)} options={['אדריכל/ית', 'מעצב/ת פנים', 'שרטוט', 'פיקוח', 'מנהל/ת פרויקט', 'ליווי']} aria-label="תפקיד בפרויקט" />
            <Btn size="sm" kind="navy" icon={LuCheck} disabled={!uidSel} onClick={() => { run(A.assign, id, uidSel, role); toast('חבר/ת הצוות שויך/ה'); setUid(''); }}>שיוך</Btn>
          </div>
        ) : null}
      </Card>
      <Card title="גישת לקוח לפרויקט" icon={LuEye}>
        <div className="stack small">
          {client?.contacts.map((ct) => <div key={ct.id} className="row between"><span>{ct.name}</span><StatusBadge s={ct.portal} /></div>)}
          <Callout kind="info">הלקוח רואה רק שרטוטים, מסמכים, פריטי מפרט ופגישות שסומנו "משותף". ניהול גישה בכרטיס הלקוח.</Callout>
          <Btn size="sm" onClick={() => nav(`/clients/${client?.id}`)}>לכרטיס הלקוח</Btn>
        </div>
      </Card>
    </div>
  );
}
