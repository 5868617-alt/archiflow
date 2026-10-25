import { IS_LIVE } from '../data/dates';
import { useEffect, useState } from 'react';
import { useOpenFile } from '../live/hooks';
import { LuCheck, LuX, LuMessageSquare, LuCalendarDays, LuMapPin, LuFileText, LuPencilRuler, LuEyeOff, LuArrowLeft, LuShieldCheck, LuClock, LuSend, LuWallet } from 'react-icons/lu';
import { useStore } from '../data/store';
import { clientVisible, contactOf, clientOf, projectOf, A, byId, specLineTotal, projectFinance, supplierOf, userName } from '../data/api';
import { PHASES } from '../data/types';
import type * as T from '../data/types';
import { todayISO, daysFromToday } from '../data/dates';
import { Btn, Card, StatusBadge, Badge, Modal, Field, Textarea, Empty, Callout, Ring, Progress, cx, KV } from '../ui/core';
import { Swatch, FileIcon } from '../ui/charts';
import { PlanSvg } from '../ui/PlanSvg';
import { ChatThread, NotificationList } from './Comms';
import { parseRoute } from '../lib/route';
import { date, relDay, ils, ago, monthName } from '../lib/format';
import { DEMO_TODAY } from '../data/dates';

const latestV = (p: T.Plan) => p.versions[p.versions.length - 1];

export function PortalRouter() {
  const { db, me, path, nav, live } = useStore();
  const { segs } = parseRoute(path);
  const vis = clientVisible(db, me);
  const [pid, setPid] = useState(vis.projects.find((p) => p.status !== 'הושלם')?.id || vis.projects[0]?.id);
  const project = projectOf(db, pid);
  if (!project) return <Empty title="אין פרויקטים פעילים">המשרד עדיין לא שיתף איתך פרויקט.</Empty>;
  const page = segs[1] || '';
  return (
    <div className="stack-lg">
      {vis.projects.length > 1 ? <div className="row g8"><span className="small muted">פרויקט:</span><select className="select sm" style={{ width: 'auto' }} value={pid} onChange={(e) => setPid(e.target.value)} aria-label="בחירת פרויקט">{vis.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div> : null}
      {page === '' ? <Home project={project} /> : null}
      {page === 'approvals' ? <Approvals project={project} /> : null}
      {page === 'drawings' ? <Drawings project={project} id={segs[2]} /> : null}
      {page === 'documents' ? <Docs project={project} /> : null}
      {page === 'meetings' ? <Meetings project={project} /> : null}
      {page === 'messages' ? <Card title={`שיחה עם ${db.office.name}`}><ChatThread projectId={project.id} viewerSide="client" /></Card> : null}
      {page === 'history' ? <History project={project} /> : null}
      {page === 'notifications' ? <Card title="התראות" pad={false}><NotificationList items={db.notifications.filter((n) => n.userId === me.id)} onGo={nav} /></Card> : null}
    </div>
  );
}

function HiddenNote({ project }: { project: T.Project }) {
  const { db, me, live } = useStore();
  const v = clientVisible(db, me);
  const n = v.hidden.plans + v.hidden.docs + v.hidden.specs + v.hidden.meetings;
  if (!n) return null;
  return <div className="privacy-note"><LuEyeOff aria-hidden /><span><b>הדגמת הגבלת גישה:</b> בפרויקט קיימים עוד {v.hidden.plans} שרטוטים, {v.hidden.docs} מסמכים, {v.hidden.specs} פריטי מפרט ו-{v.hidden.meetings} פגישות פנימיות שלא שותפו איתך ולכן אינם מוצגים.</span></div>;
}

function Home({ project }: { project: T.Project }) {
  const { db, me, nav, live } = useStore();
  const v = clientVisible(db, me);
  const pending = v.approvals.filter((a) => a.projectId === project.id && a.status === 'ממתין');
  const next = project.milestones.find((m) => !m.done);
  const meet = v.meetings.filter((m) => m.projectId === project.id && m.date >= todayISO && m.status === 'מתוכננת').sort((a, b) => a.date.localeCompare(b.date))[0];
  const updates = [
    ...v.plans.filter((p) => p.projectId === project.id).map((p) => ({ at: latestV(p).date, text: `עודכן שרטוט: ${p.title} (גרסה ${latestV(p).v})`, to: `/portal/drawings/${p.id}`, icon: LuPencilRuler })),
    ...v.docs.filter((d) => d.projectId === project.id).map((d) => ({ at: d.versions[d.versions.length - 1].date, text: `מסמך: ${d.name}`, to: '/portal/documents', icon: LuFileText })),
    ...v.meetings.filter((m) => m.projectId === project.id && m.summary).map((m) => ({ at: m.date, text: `סיכום פגישה: ${m.title}`, to: '/portal/meetings', icon: LuCalendarDays })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const liveFin = useClientBudget(project.id);
  const fin = IS_LIVE ? liveFin : db.settings.clientSeesBudgetSummary ? projectFinance(db, project.id) : null;
  return (
    <>
      <section className="portal-hero">
        <div className="row wrap g24" style={{ alignItems: 'center' }}>
          <div className="grow" style={{ minWidth: 240 }}>
            <div className="small" style={{ color: 'var(--on-navy-2)' }}>שלום {me.name.split(' ')[0]}, זה הפרויקט שלך</div>
            <h1 className="display" style={{ fontSize: 'var(--fs-3xl)', margin: '6px 0' }}>{project.name}</h1>
            <div className="small" style={{ color: 'var(--on-navy-2)' }}>{project.address}, {project.city} · שלב נוכחי: <b style={{ color: 'var(--accent)' }}>{PHASES[project.phase]}</b></div>
            <div className="phases mt16" style={{ maxWidth: 560 }}>{PHASES.map((ph, i) => <div key={ph} className={cx('phase', i < project.phase && 'done', i === project.phase && 'now')}><div className="bar" style={{ background: i < project.phase ? 'var(--ok)' : i === project.phase ? 'var(--accent)' : 'rgba(255,255,255,.15)' }} /><div className="ph-label" style={{ color: i === project.phase ? 'var(--accent)' : 'var(--on-navy-2)' }}>{ph}</div></div>)}</div>
          </div>
          <div className="col t-center" style={{ alignItems: 'center' }}><Ring value={project.progress / 100} size={104} stroke={9} color="var(--accent)" /><span className="xs" style={{ color: 'var(--on-navy-2)' }}>התקדמות כללית</span></div>
        </div>
      </section>
      <HiddenNote project={project} />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title={`ממתין להחלטה שלך (${pending.length})`} actions={pending.length ? <Btn size="sm" kind="primary" onClick={() => nav('/portal/approvals')}>לכל האישורים<LuArrowLeft aria-hidden /></Btn> : null}>
            {pending.length ? <div className="col g12">{pending.slice(0, 4).map((a) => <ApprovalRow key={a.id} a={a} compact />)}</div> : <Empty icon={LuCheck} title="אין פריטים שמחכים לך">נעדכן כשיהיה משהו חדש.</Empty>}
          </Card>
          <Card title="עדכונים אחרונים" pad={false}>
            {updates.length ? <div className="list">{updates.map((u, i) => <div key={i} className="li click" onClick={() => nav(u.to)}><span className="li-ic"><u.icon aria-hidden /></span><div className="li-main"><div className="li-title">{u.text}</div><div className="li-sub">{relDay(u.at)}</div></div></div>)}</div> : <Empty title="אין עדכונים" />}
          </Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          {next ? <Card title="אבן הדרך הבאה"><div className="lg bold">{next.title}</div><div className="small muted">{date(next.date)}{daysFromToday(next.date) >= 0 && daysFromToday(next.date) < 7 ? ' · ' + relDay(next.date) : ''}</div><div className="xs muted mt8">מסירה משוערת: {date(project.dueDate)}</div></Card> : null}
          <Card title="הפגישה הבאה" icon={LuCalendarDays}>{meet ? <div className="stack small"><b className="lg">{meet.title}</b><span className="row g4"><LuClock aria-hidden style={{ width: 14 }} />{relDay(meet.date)} · <span className="ltr">{meet.start}–{meet.end}</span></span><span className="row g4"><LuMapPin aria-hidden style={{ width: 14 }} />{meet.location}</span></div> : <span className="small muted">אין פגישה מתוכננת.</span>}</Card>
          {fin ? (
            <Card title="סיכום תקציב ביצוע" icon={LuWallet} actions={IS_LIVE ? undefined : <span className="tag-demo">מדומה</span>}>
              <div className="stack small">
                <div className="row between"><span className="muted">נוצל עד כה</span><b className="num">{ils(fin.actual)}</b></div>
                <Progress value={fin.pct} />
                <div className="row between"><span className="muted">תקציב מאושר</span><span className="num">{ils(fin.planned)}</span></div>
                <span className="xs muted">{IS_LIVE ? 'המשרד בחר להציג לך את סיכום התקציב.' : 'הצגת תקציב ללקוח היא הנחת דמו שהמשרד יכול לכבות.'}</span>
              </div>
            </Card>
          ) : null}
          <Card title="צוות הפרויקט">{db.assignments.filter((a) => a.projectId === project.id).slice(0, 3).map((a) => <div key={a.id} className="small row between" style={{ padding: '4px 0' }}><span>{userName(db, a.userId)}</span><span className="muted">{a.roleInProject}</span></div>)}<div className="mt8"><Btn size="sm" icon={LuMessageSquare} onClick={() => nav('/portal/messages')}>שליחת הודעה</Btn></div></Card>
        </div>
      </div>
    </>
  );
}

function ApprovalRow({ a, compact }: { a: T.Approval; compact?: boolean }) {
  const { db, nav, live } = useStore();
  const [act, setAct] = useState<null | 'אושר' | 'בקשת שינוי' | 'נדחה'>(null);
  const spec = a.kind === 'מפרט' ? byId(db.specItems, a.refId) : undefined;
  const plan = a.kind === 'שרטוט' ? byId(db.plans, a.refId) : undefined;
  return (
    <div className="card pad" style={{ padding: compact ? 14 : 18 }}>
      <div className="row g16" style={{ alignItems: 'flex-start' }}>
        {spec ? <Swatch color={spec.swatch} pattern={spec.pattern} label={spec.name} /> : plan ? <span className="li-ic accent"><LuPencilRuler aria-hidden /></span> : <span className="li-ic"><LuFileText aria-hidden /></span>}
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row between g8 wrap"><b>{a.title}</b><Badge tone={a.dueAt < todayISO ? 'bad' : 'warn'}>{a.dueAt < todayISO ? 'עבר מועד היעד' : `עד ${relDay(a.dueAt)}`}</Badge></div>
          <div className="small muted">{a.kind} · נשלח ע״י {userName(db, a.requestedBy)} ב-{date(a.requestedAt)}</div>
          {spec && !compact ? (
            <div className="stack small mt8">
              <div>{spec.room} · {spec.category} · {supplierOf(db, spec.supplierId)?.name}</div>
              <div><b className="num">{spec.qty} {spec.unit} × {ils(spec.unitPrice)} = {ils(specLineTotal(spec))}</b> <span className="muted">(לפני מע״מ)</span></div>
              {spec.notes ? <div className="muted">{spec.notes}</div> : null}
              {spec.alternatives.length ? <div className="card tinted pad" style={{ padding: 10 }}><b className="xs">חלופות שהמשרד הציע:</b>{spec.alternatives.map((alt, i) => <div key={i} className="row between g8 xs mt8"><span>{alt.name}{alt.note ? ` – ${alt.note}` : ''}</span><span className="num">{ils(alt.unitPrice * spec.qty)}</span></div>)}<div className="xs muted mt8">לבחירת חלופה – בקשו שינוי וציינו איזו.</div></div> : null}
            </div>
          ) : null}
          {a.amount && !spec ? <div className="small mt8 num">סכום: {ils(a.amount)}</div> : null}
          {plan ? <div className="mt8"><Btn size="sm" icon={LuPencilRuler} onClick={() => nav(`/portal/drawings/${plan.id}`)}>צפייה בשרטוט</Btn></div> : null}
          <div className="row g8 wrap mt12" style={{ marginTop: 12 }}>
            <Btn size="sm" kind="ok" icon={LuCheck} onClick={() => setAct('אושר')}>אישור</Btn>
            <Btn size="sm" icon={LuMessageSquare} onClick={() => setAct('בקשת שינוי')}>בקשת שינוי</Btn>
            <Btn size="sm" kind="ghost" icon={LuX} onClick={() => setAct('נדחה')}>דחייה</Btn>
          </div>
        </div>
      </div>
      {act ? <Decide a={a} status={act} onClose={() => setAct(null)} /> : null}
    </div>
  );
}

function Decide({ a, status, onClose }: any) {
  const { run, toast, live } = useStore();
  const [c, setC] = useState('');
  const [err, setErr] = useState('');
  const need = status !== 'אושר';
  return (
    <Modal title={status === 'אושר' ? 'אישור פריט' : status === 'נדחה' ? 'דחיית פריט' : 'בקשת שינוי'} sub={a.title} onClose={onClose} size="narrow" foot={<><Btn kind={status === 'אושר' ? 'ok' : status === 'נדחה' ? 'danger-solid' : 'primary'} icon={LuSend} onClick={() => { if (need && !c.trim()) { setErr('נשמח לדעת מה לשנות או למה'); return; } run(A.decideApproval, a.id, status, c.trim() || undefined); toast(status === 'אושר' ? 'תודה! האישור נשלח למשרד' : 'התגובה נשלחה למשרד'); onClose(); }}>שליחה למשרד</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <Field label={need ? 'הערה למשרד *' : 'הערה (לא חובה)'} error={err} htmlFor="dc-c"><Textarea id="dc-c" rows={3} value={c} invalid={err} onChange={(e: any) => setC(e.target.value)} placeholder={status === 'בקשת שינוי' ? 'לדוגמה: אפשר לבדוק את החלופה בגוון כהה?' : ''} /></Field>
        <span className="xs muted">ההחלטה תירשם בהיסטוריה עם התאריך והשם שלך.{IS_LIVE ? ' זו אינה חתימה דיגיטלית.' : ' בדמו – אין חתימה דיגיטלית או אימות זהות.'}</span>
      </div>
    </Modal>
  );
}

function Approvals({ project }: { project: T.Project }) {
  const { db, me, live } = useStore();
  const v = clientVisible(db, me);
  const pending = v.approvals.filter((a) => a.projectId === project.id && a.status === 'ממתין').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>לאישורך</h1><p className="soft">המשרד מבקש את החלטתך על הפריטים הבאים. אפשר לאשר, לבקש שינוי או לדחות.</p></div>
      {pending.length ? <div className="col g12">{pending.map((a) => <ApprovalRow key={a.id} a={a} />)}</div> : <div className="card"><Empty icon={LuCheck} title="הכול מאושר">אין כרגע פריטים שממתינים לך.</Empty></div>}
    </>
  );
}

function Drawings({ project, id }: { project: T.Project; id?: string }) {
  const { db, me, nav, live } = useStore();
  const v = clientVisible(db, me);
  const plans = v.plans.filter((p) => p.projectId === project.id);
  const sel = id ? plans.find((p) => p.id === id) : undefined;
  if (id && !sel) return <Callout kind="bad">השרטוט לא שותף איתך או שאינו קיים.</Callout>;
  if (sel) {
    const lv = latestV(sel);
    const ok = ['PDF', 'JPG', 'PNG'].includes(lv.fileType) && lv.processing === 'מוכן';
    return (
      <>
        <div className="row between wrap g8"><div><button type="button" className="linkish small" onClick={() => nav('/portal/drawings')}>← לכל השרטוטים</button><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>{sel.number} · {sel.title}</h1><div className="small muted">גרסה {lv.v} · {date(lv.date)} · {lv.note}</div></div><StatusBadge s={lv.status} /></div>
        <div className="card" style={{ padding: 12 }}>{ok ? <PlanSvg layout={sel.layout} rev={lv.v} meta={{ project: project.name, number: sel.number, v: lv.v, scale: sel.scale }} /> : <Callout kind="assume">אין תצוגה זמינה לקובץ זה.</Callout>}</div>
        <div className="privacy-note"><LuShieldCheck aria-hidden /><span>מוצגת הגרסה האחרונה בלבד. הערות פנימיות של הצוות ({db.annotations.filter((a) => a.planId === sel.id).length}) אינן מוצגות בפורטל.</span></div>
        <Card title="שאלה על השרטוט?"><Btn icon={LuMessageSquare} onClick={() => nav('/portal/messages')}>כתיבה למשרד</Btn></Card>
      </>
    );
  }
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>שרטוטים</h1><p className="soft">שרטוטים שהמשרד שיתף איתך.</p></div>
      <HiddenNote project={project} />
      <div className="grid-auto">{plans.map((p) => { const lv = latestV(p); const ok = ['PDF', 'JPG', 'PNG'].includes(lv.fileType) && lv.processing === 'מוכן'; return (
        <article key={p.id} className="card link" onClick={() => nav(`/portal/drawings/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/portal/drawings/${p.id}`)}>
          <div className="plan-thumb">{ok ? <PlanSvg layout={p.layout} rev={lv.v} /> : null}</div>
          <div className="card-body col g4"><b>{p.title}</b><div className="row between"><span className="xs muted">{p.number} · גרסה {lv.v}</span><StatusBadge s={lv.status} /></div></div>
        </article>
      ); })}</div>
    </>
  );
}

function Docs({ project }: { project: T.Project }) {
  const { db, me, live } = useStore();
  const v = clientVisible(db, me);
  const docs = v.docs.filter((d) => d.projectId === project.id);
  const [open, setOpen] = useState<T.Doc | null>(null);
  const openFile = useOpenFile();
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>מסמכים</h1><p className="soft">הסכמים, היתרים, הדמיות ודוחות שהמשרד שיתף.</p></div>
      <Card pad={false}>{docs.length ? <div className="list">{docs.map((d) => <div key={d.id} className="li click" onClick={() => setOpen(d)}><FileIcon type={d.fileType} /><div className="li-main"><div className="li-title">{d.name}</div><div className="li-sub">{d.folder} · עודכן {date(d.versions[d.versions.length - 1].date)}</div></div></div>)}</div> : <Empty title="אין מסמכים משותפים" />}</Card>
      {open ? <Modal title={open.name} onClose={() => setOpen(null)} foot={<Btn kind="ghost" onClick={() => setOpen(null)}>סגירה</Btn>}><div className="stack"><KV items={[['תיקייה', open.folder], ['גרסה', `v${open.versions.length}`], ['תאריך', date(open.versions[open.versions.length - 1].date)]]} />{IS_LIVE ? <Btn kind="primary" onClick={() => openFile('documents', (open.versions[open.versions.length - 1] as any)._path)}>פתיחת המסמך</Btn> : <Callout kind="assume">בדמו אין קובץ אמיתי לצפייה או להורדה.</Callout>}</div></Modal> : null}
    </>
  );
}

function Meetings({ project }: { project: T.Project }) {
  const { db, me, live } = useStore();
  const v = clientVisible(db, me);
  const ms = v.meetings.filter((m) => m.projectId === project.id).sort((a, b) => b.date.localeCompare(a.date));
  const up = ms.filter((m) => m.date >= todayISO && m.status === 'מתוכננת').reverse(); const past = ms.filter((m) => m.date < todayISO || m.status !== 'מתוכננת');
  const M = ({ m }: { m: T.Meeting }) => (
    <div className="card pad">
      <div className="row between wrap g8"><b className="lg">{m.title}</b><StatusBadge s={m.status} /></div>
      <div className="small muted row wrap g12 mt8"><span>{date(m.date)} · <span className="ltr">{m.start}–{m.end}</span></span><span>{m.location}</span></div>
      {m.agenda.length ? <div className="small mt8"><b>סדר יום:</b> {m.agenda.join(' · ')}</div> : null}
      {m.summary ? <div className="callout info mt8"><div><div className="c-title">סיכום</div><div>{m.summary}</div></div></div> : null}
    </div>
  );
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>פגישות</h1></div>
      <div className="section-title">קרובות</div>
      {up.length ? <div className="col g12">{up.map((m) => <M key={m.id} m={m} />)}</div> : <span className="small muted">אין פגישות מתוכננות.</span>}
      <div className="section-title">היסטוריה</div>
      {past.length ? <div className="col g12">{past.map((m) => <M key={m.id} m={m} />)}</div> : <span className="small muted">אין.</span>}
    </>
  );
}

function History({ project }: { project: T.Project }) {
  const { db, me, live } = useStore();
  const v = clientVisible(db, me);
  const done = v.approvals.filter((a) => a.projectId === project.id && a.status !== 'ממתין').sort((a, b) => (b.decidedAt || '').localeCompare(a.decidedAt || ''));
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>היסטוריית החלטות</h1><p className="soft">כל מה שאושר, נדחה או נשלח לשינוי – עם תאריך והערה.</p></div>
      <Card>{done.length ? <div className="timeline">{done.map((a) => <div key={a.id} className={cx('tl-item', a.status === 'אושר' ? 'done' : a.status === 'נדחה' ? 'late' : 'now')}><div className="row between g8 wrap"><b>{a.title}</b><StatusBadge s={a.status} /></div><div className="small muted">{date(a.decidedAt)} · {contactOf(db, a.contactId)?.contact.name}{a.amount ? ` · ${ils(a.amount)}` : ''}</div>{a.comment ? <div className="small">"{a.comment}"</div> : null}</div>)}</div> : <Empty title="עדיין אין החלטות" />}</Card>
    </>
  );
}

/** live site: the client's budget summary comes from a server function that checks the office setting */
function useClientBudget(projectId: string) {
  const { live } = useStore();
  const [fin, setFin] = useState<{ planned: number; actual: number; pct: number } | null>(null);
  useEffect(() => {
    if (!live) return;
    let alive = true;
    live.api.rpc('client_budget_summary', { p_project: projectId }).then((r: any) => {
      const row = Array.isArray(r) ? r[0] : r;
      if (alive && row) { const planned = Number(row.planned) || 0, actual = Number(row.actual) || 0; setFin({ planned, actual, pct: planned ? actual / planned : 0 }); }
    }).catch(() => alive && setFin(null));
    return () => { alive = false; };
  }, [projectId]); // eslint-disable-line
  return fin;
}
