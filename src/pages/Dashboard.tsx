import { IS_LIVE } from '../data/dates';
import { LuListChecks, LuClock, LuCalendarDays, LuBadgeCheck, LuWallet, LuPlus, LuUpload, LuReceipt, LuCalendarPlus, LuSend, LuArrowLeft, LuFolderKanban, LuTriangleAlert } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, isOverdue, isToday, projectAlerts, canSeeFinance, projectFinance, budgetHealth, contactOf, projectOf } from '../data/api';
import { DEMO_TODAY, todayISO, daysFromToday } from '../data/dates';
import { PROJECT_STATUSES } from '../data/types';
import { Card, Stat, Btn, Badge, StatusBadge, Empty, AssumeTag, Progress, cx } from '../ui/core';
import { Donut } from '../ui/charts';
import { TaskLine, ActivityFeed, MeetingLine } from './shared';
import { DOW, monthName, ils, pct, relDay } from '../lib/format';

const STATUS_COLORS: Record<string, string> = { 'ליד חדש': 'var(--violet)', 'תכנון ראשוני': '#7FA3D6', 'תכנון בפיתוח': 'var(--info)', 'ממתין לאישור': 'var(--warn)', 'תכנון מאושר': '#5DAF86', 'ביצוע': 'var(--navy-3)', 'לקראת מסירה': 'var(--accent)', 'הושלם': 'var(--ok)', 'בהשהיה': 'var(--ink-3)' };

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
  const myActivity = db.activity.filter((a) => a.projectId === null ? me.role !== 'member' : pids.has(a.projectId));

  return (
    <div className="stack-lg">
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="grow">
          <div className="eyebrow">יום {DOW[DEMO_TODAY.getDay()]}, {DEMO_TODAY.getDate()} ב{monthName(DEMO_TODAY.getMonth())} {DEMO_TODAY.getFullYear()} <AssumeTag>תאריך הדגמה קבוע</AssumeTag></div>
          <h1 className="display" style={{ fontSize: 'var(--fs-3xl)', marginTop: 6 }}>{greet}, {me.name.split(' ')[0]}</h1>
          <p className="ph-sub">{today.length + late.length ? `יש לך ${today.length} משימות להיום${late.length ? ` ו-${late.length} באיחור` : ''}` : 'אין משימות פתוחות להיום'}{meetingsToday.length ? `, ${meetingsToday.length} פגישות` : ''}{pendingAp.length ? ` ו-${pendingAp.length} פריטים שממתינים ללקוחות` : ''}.</p>
        </div>
        <div className="row wrap">
          <Btn icon={LuPlus} onClick={() => nav('/tasks?new=1')}>משימה</Btn>
          <Btn icon={LuCalendarPlus} onClick={() => nav('/calendar?new=1')}>פגישה</Btn>
          <Btn icon={LuUpload} onClick={() => nav('/plans?upload=1')}>שרטוט</Btn>
          {fin ? <Btn icon={LuReceipt} onClick={() => nav('/expenses?new=1')}>הוצאה</Btn> : null}
          <Btn icon={LuSend} onClick={() => nav('/approvals?new=1')}>שליחה לאישור</Btn>
        </div>
      </div>

      <div className="grid-4" style={fin ? { gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' } : undefined}>
        <Stat label="משימות להיום" icon={LuListChecks} value={today.length} meta="משויכות אליך" onClick={() => nav('/tasks?view=today')} />
        <Stat label="משימות באיחור" icon={LuClock} value={late.length} meta={late[0] ? `הוותיקה: ${relDay(late.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0].dueDate)}` : 'הכול בזמן'} tone={late.length ? 'alert' : ''} onClick={() => nav('/tasks?view=late')} />
        <Stat label="פגישות היום" icon={LuCalendarDays} value={meetingsToday.length} meta={meetingsToday[0] ? `הבאה: ${meetingsToday.sort((a, b) => a.start.localeCompare(b.start))[0].start}` : '—'} onClick={() => nav('/calendar?view=day')} />
        <Stat label="ממתין לאישור לקוח" icon={LuBadgeCheck} value={pendingAp.length} meta={`${pendingAp.filter((a) => a.dueAt < todayISO).length} עברו את היעד`} tone={pendingAp.some((a) => a.dueAt < todayISO) ? 'warn' : ''} onClick={() => nav('/approvals')} />
        {fin ? <Stat label="התראות תקציב" icon={LuWallet} value={budgetAlerts.length} meta="פרויקטים מעל הסף או בחריגת סעיף" tone={budgetAlerts.length ? 'alert' : ''} onClick={() => nav('/budget')} /> : null}
      </div>

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

          <Card title="פרויקטים לפי סטטוס" icon={LuFolderKanban}>
            <Donut parts={statusParts} size={130} stroke={20} center={String(projects.length)} sub="פרויקטים" />
          </Card>
        </div>
      </div>
    </div>
  );
}
