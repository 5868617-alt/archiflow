import { IS_LIVE } from '../data/dates';
import { LuListChecks, LuClock, LuCalendarDays, LuBadgeCheck, LuWallet, LuPlus, LuUpload, LuReceipt, LuCalendarPlus, LuSend, LuArrowLeft, LuFolderKanban, LuTriangleAlert, LuCoins } from 'react-icons/lu';
import { useStore } from '../data/store';
import { hasFeature, visibleProjects, visibleProjectIds, isOverdue, isToday, projectAlerts, canSeeFinance, projectFinance, budgetHealth, contactOf, projectOf } from '../data/api';
import { DEMO_TODAY, todayISO, daysFromToday } from '../data/dates';
import { PROJECT_STATUSES } from '../data/types';
import { Card, Btn, Badge, StatusBadge, Empty, AssumeTag, Progress, cx, STATUS_COLORS } from '../ui/core';
import { Donut, Columns, ProjectTimeline } from '../ui/charts';
import { TaskLine, ActivityFeed, MeetingLine } from './shared';
import { DOW, monthName, ils, pct, relDay } from '../lib/format';


export function Dashboard() {
  const { db, me, nav, live } = useStore();
  const pids = visibleProjectIds(db, me);
  const projects = visibleProjects(db, me);
  const fin = canSeeFinance(db, me);
  const mine = db.tasks.filter((t) => t.assigneeId === me.id);
  const today = mine.filter(isToday);
  const late = mine.filter(isOverdue);
  const meetingsToday = db.meetings.filter((m) => m.date === todayISO && m.status !== 'בוטלה' && (m.attendeeIds.includes(me.id) || (m.projectId && pids.has(m.projectId))));
  const upcoming = db.meetings.filter((m) => m.status === 'מתוכננת' && daysFromToday(m.date) >= 0 && daysFromToday(m.date) <= 7 && (m.attendeeIds.includes(me.id) || (m.projectId && pids.has(m.projectId)))).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const pendingAp = db.approvals.filter((a) => pids.has(a.projectId) && a.status === 'ממתין').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const alerts = projectAlerts(db, me);
  const activeProjects = projects.filter((p) => !['הושלם', 'ליד חדש'].includes(p.status));
  const budgetRows = fin ? activeProjects.filter((p) => p.status !== 'בהשהיה').map((p) => ({ p, f: projectFinance(db, p.id) })).filter((x) => x.f.actual > 0).sort((a, b) => b.f.pct - a.f.pct) : [];
  const budgetAlerts = budgetRows.filter((x) => x.f.pct >= db.settings.budgetWarnPct / 100 || x.f.byCat.some((c) => c.pct > 1));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
  const statusParts = PROJECT_STATUSES.map((s) => ({ label: s, value: projects.filter((p) => p.status === s).length, color: STATUS_COLORS[s] })).filter((x) => x.value);
  const timeline = activeProjects.filter((p) => p.startDate && p.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 8)
    .map((p) => ({ id: p.id, name: p.name, start: p.startDate, end: p.dueDate, progress: p.progress, color: STATUS_COLORS[p.status], status: p.status, late: p.dueDate < todayISO && p.status !== 'הושלם' }));
  const showFees = fin && hasFeature(db, 'fees');
  const feeMonths = showFees ? Array.from({ length: 6 }, (_, i) => {
    const d = new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth() + i - 2, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ms = db.feeMilestones.filter((f) => pids.has(f.projectId));
    return {
      label: monthName(d.getMonth()).slice(0, 3),
      value: ms.filter((f) => f.status === 'שולם' && (f.paidAt || f.dueDate).startsWith(key)).reduce((a, f) => a + f.amount, 0),
      value2: ms.filter((f) => f.status !== 'שולם' && f.dueDate.startsWith(key)).reduce((a, f) => a + f.amount, 0),
    };
  }) : [];
  const myActivity = db.activity.filter((a) => a.projectId === null ? me.role !== 'member' : pids.has(a.projectId));

  return (
    <div className="stack-lg">
      <section className="hero" aria-label="סיכום היום">
        <div className="hero-in">
          <div style={{ minWidth: 0 }}>
            <div className="hero-date">יום {DOW[DEMO_TODAY.getDay()]}, {DEMO_TODAY.getDate()} ב{monthName(DEMO_TODAY.getMonth())} {DEMO_TODAY.getFullYear()} <AssumeTag>תאריך הדגמה קבוע</AssumeTag></div>
            <h1 className="hero-title">{greet}, {me.name.split(' ')[0]}</h1>
            <p className="hero-sub">{today.length + late.length ? `יש לך ${today.length} משימות להיום${late.length ? ` ו-${late.length} באיחור` : ''}` : 'אין משימות פתוחות להיום'}{meetingsToday.length ? `, ${meetingsToday.length} פגישות` : ''}{pendingAp.length ? ` ו-${pendingAp.length} פריטים שממתינים ללקוחות` : ''}.</p>
          </div>
          <div className="hero-actions">
            <Btn kind="primary" icon={LuPlus} onClick={() => nav('/tasks?new=1')}>משימה</Btn>
            <Btn icon={LuCalendarPlus} onClick={() => nav('/calendar?new=1')}>פגישה</Btn>
            <Btn icon={LuUpload} onClick={() => nav('/plans?upload=1')}>שרטוט</Btn>
            {fin ? <Btn icon={LuReceipt} onClick={() => nav('/expenses?new=1')}>הוצאה</Btn> : null}
            <Btn icon={LuSend} onClick={() => nav('/approvals?new=1')}>שליחה לאישור</Btn>
          </div>
        </div>
        <div className="hero-strip">
          <HeroCell label="משימות להיום" icon={LuListChecks} value={today.length} meta="משויכות אליך" onClick={() => nav('/tasks?view=today')} />
          <HeroCell label="משימות באיחור" icon={LuClock} value={late.length} meta={late[0] ? `הוותיקה: ${relDay([...late].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0].dueDate)}` : 'הכול בזמן'} tone={late.length ? 'bad' : ''} onClick={() => nav('/tasks?view=late')} />
          <HeroCell label="פגישות היום" icon={LuCalendarDays} value={meetingsToday.length} meta={meetingsToday[0] ? `הבאה: ${[...meetingsToday].sort((a, b) => a.start.localeCompare(b.start))[0].start}` : 'אין פגישות'} onClick={() => nav('/calendar?view=day')} />
          <HeroCell label="ממתין לאישור לקוח" icon={LuBadgeCheck} value={pendingAp.length} meta={`${pendingAp.filter((a) => a.dueAt < todayISO).length} עברו את היעד`} tone={pendingAp.some((a) => a.dueAt < todayISO) ? 'warn' : ''} onClick={() => nav('/approvals')} />
          {fin ? <HeroCell label="התראות תקציב" icon={LuWallet} value={budgetAlerts.length} meta="מעל הסף או בחריגת סעיף" tone={budgetAlerts.length ? 'bad' : ''} onClick={() => nav('/budget')} /> : null}
        </div>
      </section>

      {timeline.length ? (
        <Card title="ציר זמן פרויקטים" icon={LuFolderKanban} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/projects')}>לכל הפרויקטים<LuArrowLeft aria-hidden /></Btn>}>
          <div className="scroll-x"><div style={{ minWidth: 560 }}><ProjectTimeline rows={timeline} today={todayISO} onOpen={(id) => nav(`/projects/${id}`)} /></div></div>
          <div className="legend mt16">{[...new Set(timeline.map((r) => r.status))].map((st) => <span key={st}><i style={{ background: STATUS_COLORS[st] }} />{st}</span>)}<span className="muted">· המילוי מראה את אחוז ההתקדמות</span></div>
        </Card>
      ) : null}

      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="המשימות שלי" icon={LuListChecks} pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/tasks')}>לכל המשימות<LuArrowLeft aria-hidden /></Btn>}>
            {late.length + today.length === 0 ? <Empty title="אין משימות להיום">כל הכבוד. אפשר לעבור למשימות של השבוע.</Empty> : (
              <div className="list">
                {late.length ? <div className="li" style={{ background: 'var(--bad-soft)', padding: '6px 18px' }}><span className="small bold bad-t">באיחור ({late.length})</span></div> : null}
                {late.map((t) => <TaskLine key={t.id} t={t} onOpen={() => nav(`/tasks?open=${t.id}`)} />)}
                {today.length ? <div className="li" style={{ background: 'var(--surface-2)', padding: '6px 18px' }}><span className="small bold">היום ({today.length})</span></div> : null}
                {today.map((t) => <TaskLine key={t.id} t={t} onOpen={() => nav(`/tasks?open=${t.id}`)} />)}
              </div>
            )}
          </Card>

          <Card title="פרויקטים שדורשים תשומת לב" icon={LuTriangleAlert} pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/projects')}>לכל הפרויקטים<LuArrowLeft aria-hidden /></Btn>}>
            {alerts.length === 0 ? <Empty title="הכול תחת שליטה">אין פרויקטים עם חריגות כרגע.</Empty> : (
              <div className="list">
                {alerts.slice(0, 6).map(({ project, reasons }) => (
                  <div key={project.id} className="li click" onClick={() => nav(`/projects/${project.id}`)} style={{ alignItems: 'flex-start' }}>
                    <div className="li-main">
                      <div className="row g8 wrap"><span className="bold">{project.name}</span><StatusBadge s={project.status} /></div>
                      <div className="row wrap g4 mt8">
                        {reasons.map((r, i) => <button key={i} type="button" className={cx('badge', r.tone)} style={{ border: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); nav(r.link); }}>{r.text}</button>)}
                      </div>
                    </div>
                    <div className="col hide-sm" style={{ width: 120, gap: 4 }}><span className="xs muted">התקדמות {project.progress}%</span><Progress value={project.progress / 100} /></div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="פעילות אחרונה" actions={<span className="xs muted">בפרויקטים שלך</span>}>
            <ActivityFeed items={myActivity} max={7} />
          </Card>
        </div>

        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פגישות קרובות" icon={LuCalendarDays} pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/calendar')}>ליומן</Btn>}>
            {upcoming.length === 0 ? <Empty title="אין פגישות השבוע" /> : <div className="list">{upcoming.slice(0, 5).map((m) => <MeetingLine key={m.id} m={m} />)}</div>}
          </Card>

          <Card title="ממתין לאישור לקוח" icon={LuBadgeCheck} pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/approvals')}>הכול</Btn>}>
            {pendingAp.length === 0 ? <Empty title="אין אישורים פתוחים" /> : (
              <div className="list">
                {pendingAp.slice(0, 5).map((a) => (
                  <div key={a.id} className="li click" onClick={() => nav(`/approvals?open=${a.id}`)}>
                    <div className="li-main"><div className="li-title">{a.title}</div><div className="li-sub">{contactOf(db, a.contactId)?.contact.name} · {projectOf(db, a.projectId)?.name}</div></div>
                    <Badge tone={a.dueAt < todayISO ? 'bad' : 'warn'}>{a.dueAt < todayISO ? 'עבר יעד' : relDay(a.dueAt)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {fin ? (
            <Card title="ניצול תקציב ביצוע" icon={LuWallet} actions={IS_LIVE ? undefined : <span className="tag-demo">נתונים מדומים</span>}>
              <div className="col g12">
                {budgetRows.slice(0, 5).map(({ p, f }) => {
                  const h = f.byCat.some((c) => c.pct > 1) ? 'bad' : budgetHealth(f.pct, db.settings.budgetWarnPct / 100);
                  return (
                    <button key={p.id} type="button" className="col g4" style={{ background: 'none', border: 0, padding: 0, textAlign: 'right', cursor: 'pointer' }} onClick={() => nav(`/projects/${p.id}/budget`)}>
                      <div className="meter-label"><span className="ellipsis">{p.name}</span><span className={cx('num bold', h === 'bad' ? 'bad-t' : h === 'warn' ? 'warn-t' : '')}>{pct(f.pct)}</span></div>
                      <Progress value={f.pct} tone={h === 'ok' ? '' : h} />
                      <span className="xs muted">{ils(f.actual)} מתוך {ils(f.planned)}{f.byCat.some((c) => c.pct > 1) ? ' · חריגה בסעיף' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {showFees ? (
            <Card title="שכר טרחה: גבייה לפי חודש" icon={LuCoins} actions={IS_LIVE ? undefined : <span className="tag-demo">נתונים מדומים</span>}>
              <Columns data={[...feeMonths].reverse()} height={170} width={330} color="var(--ok)" series2={{ color: 'var(--accent)', label: 'צפוי לגבייה', label1: 'נגבה' }} />
              <div className="row between mt8 xs muted"><span>נגבה ב-6 החודשים: <b className="num" style={{ color: 'var(--ink)' }}>{ils(feeMonths.reduce((a, m) => a + m.value, 0))}</b></span><button type="button" className="linkish xs" onClick={() => nav('/fees')}>לשכר טרחה</button></div>
            </Card>
          ) : null}

          <Card title="פרויקטים לפי סטטוס" icon={LuFolderKanban}>
            <Donut parts={statusParts} size={130} stroke={20} center={String(projects.length)} sub="פרויקטים" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function HeroCell({ label, icon: Icon, value, meta, tone, onClick }: any) {
  return (
    <button type="button" className={cx('hero-cell', tone)} onClick={onClick}>
      <span className="hc-k"><Icon aria-hidden />{label}</span>
      <span className="hc-v" style={{ display: 'block' }}>{value}</span>
      <span className="hc-m">{meta}</span>
    </button>
  );
}
