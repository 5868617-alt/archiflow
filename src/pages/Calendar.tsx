import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuChevronRight, LuChevronLeft, LuPlus, LuMapPin, LuUsers, LuClock, LuPencil, LuListChecks, LuSend, LuCalendarX, LuPlane, LuCalendarCheck, LuRefreshCw, LuTriangleAlert } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, clientOf, userName, A, uid, byId, supplierOf, simulateEmail, contactOf, isOverdue } from '../data/api';
import type * as T from '../data/types';
import { DEMO_TODAY, todayISO, iso, parseISO, D, daysFromToday } from '../data/dates';
import { PageHead, Btn, Segmented, Select, Card, KV, Modal, Field, Input, Textarea, Empty, Callout, Badge, StatusBadge, Avatar, Check, Switch, cx, FutureTag, DemoTag } from '../ui/core';
import { MeetingLine, ProjectLink, PersonCell, TaskLine } from './shared';
import { TaskForm } from './Tasks';
import { DOW, DOW_S, monthName, date, dateShort, relDay } from '../lib/format';

const KIND_LABEL: Record<string, string> = { client: 'פגישת לקוח', site: 'סיור באתר', team: 'פגישת צוות', supplier: 'פגישת ספק' };
const staff = (db: any) => db.users.filter((u: T.User) => u.officeId && u.role !== 'client' && u.status === 'פעיל');
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export function CalendarPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const [view, setView] = useState(query.view || 'week');
  const [cursor, setCursor] = useState(new Date(DEMO_TODAY));
  const [who, setWho] = useState('all');
  const [project, setProject] = useState(query.project && !query.new ? query.project : '');
  const [showTasks, setShowTasks] = useState(false);
  const [creating, setCreating] = useState<any>(query.new ? { projectId: query.project || null } : null);
  const [absence, setAbsence] = useState(false);
  useEffect(() => { if (query.new) setCreating({ projectId: query.project || null }); }, [query.new]);
  const pids = visibleProjectIds(db, me);
  let meetings = db.meetings.filter((m) => (m.projectId ? pids.has(m.projectId) : true) && m.status !== 'בוטלה');
  if (who === 'mine') meetings = meetings.filter((m) => m.attendeeIds.includes(me.id));
  else if (who !== 'all') meetings = meetings.filter((m) => m.attendeeIds.includes(who));
  if (project) meetings = meetings.filter((m) => m.projectId === project);
  const tasks = showTasks ? db.tasks.filter((t) => t.status !== 'הושלם' && (t.projectId ? pids.has(t.projectId) : true) && (who === 'all' || t.assigneeId === (who === 'mine' ? me.id : who)) && (!project || t.projectId === project)) : [];
  const absences = db.absences.filter((a) => who === 'all' || a.userId === (who === 'mine' ? me.id : who));
  const shift = (dir: number) => { const d = new Date(cursor); if (view === 'month') d.setMonth(d.getMonth() + dir); else if (view === 'week') d.setDate(d.getDate() + dir * 7); else d.setDate(d.getDate() + dir); setCursor(d); };
  const title = view === 'month' ? `${monthName(cursor.getMonth())} ${cursor.getFullYear()}` : view === 'week' ? (() => { const s = new Date(cursor); s.setDate(s.getDate() - s.getDay()); const e = new Date(s); e.setDate(s.getDate() + 4); return `${s.getDate()}–${e.getDate()} ב${monthName(e.getMonth())} ${e.getFullYear()}`; })() : `יום ${DOW[cursor.getDay()]}, ${cursor.getDate()} ב${monthName(cursor.getMonth())}`;
  return (
    <div>
      <PageHead title="יומן ופגישות" sub="פגישות לקוח, סיורים באתר, פגישות ספקים והיעדרויות צוות." actions={<><Btn icon={LuPlane} onClick={() => setAbsence(true)}>רישום היעדרות</Btn><Btn kind="primary" icon={LuPlus} onClick={() => setCreating({})}>פגישה חדשה</Btn></>} />
      <div className="grid-rail end">
        <div style={{ minWidth: 0 }}>
          <div className="filters">
            <div className="row g8"><Btn size="sm" icon={LuChevronRight} onClick={() => shift(-1)} aria-label="הקודם" /><b className="lg" style={{ minWidth: 180, textAlign: 'center' }}>{title}</b><Btn size="sm" icon={LuChevronLeft} onClick={() => shift(1)} aria-label="הבא" /></div>
            <Btn size="sm" onClick={() => setCursor(new Date(DEMO_TODAY))}>היום</Btn>
            <div className="grow" />
            <Segmented value={view} onChange={setView} options={[{ value: 'month', label: 'חודש' }, { value: 'week', label: 'שבוע' }, { value: 'day', label: 'יום' }]} />
          </div>
          <div className="filters">
            <Select value={who} onChange={(e: any) => setWho(e.target.value)} options={[{ value: 'all', label: 'כל הצוות' }, { value: 'mine', label: 'רק שלי' }, ...staff(db).map((u: any) => ({ value: u.id, label: u.name }))]} aria-label="אנשים" />
            <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
            <Check id="cal-tasks" checked={showTasks} onChange={setShowTasks} label="הצגת מועדי משימות" />
          </div>
          {view === 'month' ? <MonthView cursor={cursor} meetings={meetings} tasks={tasks} absences={absences} onDay={(d: Date) => { setCursor(d); setView('day'); }} /> : null}
          {view === 'week' ? <WeekView cursor={cursor} meetings={meetings} absences={absences} tasks={tasks} onSlot={(dateStr: string, start: string) => setCreating({ date: dateStr, start })} /> : null}
          {view === 'day' ? <DayView cursor={cursor} meetings={meetings} tasks={tasks} absences={absences} /> : null}
          <div className="legend mt16"><span><i style={{ background: 'var(--info)' }} />לקוח</span><span><i style={{ background: 'var(--warn)' }} />סיור באתר</span><span><i style={{ background: 'var(--violet)' }} />ספק</span><span><i style={{ background: 'var(--ink-3)' }} />צוות</span><span><i style={{ background: 'var(--bad)' }} />היעדרות</span>{showTasks ? <span><i style={{ background: 'var(--accent)' }} />מועד משימה</span> : null}<span className="muted">שבוע עבודה: א׳–ה׳</span></div>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="היעדרויות קרובות" icon={LuPlane} pad={false}>
            <div className="list">{db.absences.filter((a) => a.to >= todayISO).sort((a, b) => a.from.localeCompare(b.from)).map((a) => <div key={a.id} className="li"><PersonCell id={a.userId} sub={`${a.kind}${a.note ? ' · ' + a.note : ''}`} /><span className="xs muted nowrap">{dateShort(a.from)}{a.to !== a.from ? `–${dateShort(a.to)}` : ''}</span></div>)}{!db.absences.some((a) => a.to >= todayISO) ? <Empty title="אין היעדרויות קרובות" /> : null}</div>
          </Card>
          <CalendarSync />
        </div>
      </div>
      {creating ? <MeetingForm defaults={creating} onClose={() => { setCreating(null); if (query.new) nav('/calendar'); }} /> : null}
      {absence ? <AbsenceForm onClose={() => setAbsence(false)} /> : null}
    </div>
  );
}

export function CalendarSync() {
  const { db, run, toast, live } = useStore();
  return (
    <Card title="סנכרון יומן" icon={LuRefreshCw} actions={<FutureTag>אינטגרציה עתידית</FutureTag>}>
      <div className="stack small">
        {[['google', 'Google Calendar'], ['outlook', 'Microsoft Outlook']].map(([k, label]) => (
          <div key={k} className="row between g8"><span className="ltr">{label}</span><Switch id={'sync-' + k} checked={db.settings.calendar[k]} onChange={(v: boolean) => { run(A.setSetting, `calendar.${k}`, v); toast(v ? (IS_LIVE ? `סנכרון ${label} עדיין לא זמין – ההגדרה נשמרה כהעדפה בלבד` : `סנכרון ${label} סומן – לא מתבצע חיבור אמיתי בדמו`) : 'הסנכרון בוטל', 'info'); }} /></div>
        ))}
        <span className="xs muted">{IS_LIVE ? 'סנכרון יומן (Google / Outlook) הוא יכולת עתידית ועדיין לא מחובר.' : 'בייצור: OAuth לכל משתמש, סנכרון דו-כיווני של פגישות פרויקט. אין חיבור בדמו.'}</span>
      </div>
    </Card>
  );
}

function evClass(k: string) { return k === 'site' ? 'site' : k === 'team' ? 'team' : k === 'supplier' ? 'supplier' : ''; }
function MonthView({ cursor, meetings, tasks, absences, onDay }: any) {
  const { nav, live } = useStore();
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = new Date(first); start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div className="cal scroll-x">
      <div className="cal-grid" style={{ minWidth: 680 }}>
        {DOW_S.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {days.map((d) => {
          const k = iso(d);
          const ms = meetings.filter((m: T.Meeting) => m.date === k).sort((a: any, b: any) => a.start.localeCompare(b.start));
          const ab = absences.filter((a: T.Absence) => a.from <= k && a.to >= k);
          const ts = tasks.filter((t: T.Task) => t.dueDate === k);
          return (
            <div key={k} className={cx('cal-cell', d.getMonth() !== cursor.getMonth() && 'out', k === todayISO && 'today', (d.getDay() === 5 || d.getDay() === 6) && 'weekend')} onClick={() => onDay(d)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onDay(d)} aria-label={`${d.getDate()} – ${ms.length} פגישות`}>
              <span className="d">{d.getDate()}</span>
              {ab.slice(0, 1).map((a: T.Absence) => <AbsenceChip key={a.id} a={a} />)}
              {ms.slice(0, 3).map((m: T.Meeting) => <button key={m.id} type="button" className={cx('cal-ev', evClass(m.kind))} style={{ border: 0, textAlign: 'right' }} onClick={(e) => { e.stopPropagation(); nav(`/meetings/${m.id}`); }} title={m.title}><span className="num">{m.start}</span> {m.title}</button>)}
              {ts.slice(0, 2).map((t: T.Task) => <button key={t.id} type="button" className="cal-ev task" style={{ border: 0, textAlign: 'right' }} onClick={(e) => { e.stopPropagation(); nav(`/tasks?open=${t.id}`); }} title={t.title}>{t.title}</button>)}
              {ms.length > 3 || ts.length > 2 ? <span className="cal-more">+ עוד {Math.max(0, ms.length - 3) + Math.max(0, ts.length - 2)}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
function AbsenceChip({ a }: { a: T.Absence }) {
  const { db, live } = useStore();
  return <span className="cal-ev absence" title={`${userName(db, a.userId)} – ${a.kind}`}>{userName(db, a.userId).split(' ')[0]} · {a.kind}</span>;
}
function WeekView({ cursor, meetings, absences, tasks, onSlot }: any) {
  const { db, nav, live } = useStore();
  const s = new Date(cursor); s.setDate(s.getDate() - s.getDay());
  const days = Array.from({ length: 5 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  const hours = Array.from({ length: 13 }, (_, i) => 8 + i);
  const top = (t: string) => ((toMin(t) - 8 * 60) / 60) * 52;
  return (
    <div className="week" role="grid" aria-label="תצוגת שבוע">
      <div className="wk-h" style={{ borderInlineStart: 0 }} />
      {days.map((d) => { const k = iso(d); const ab = absences.filter((a: T.Absence) => a.from <= k && a.to >= k); const dueN = tasks.filter((t: T.Task) => t.dueDate === k).length; return <div key={k} className={cx('wk-h', k === todayISO && 'today')}><b>{DOW[d.getDay()]}</b> <span className="num">{d.getDate()}/{d.getMonth() + 1}</span>{ab.length ? <div className="xs bad-t">{ab.map((a: any) => userName(db, a.userId).split(' ')[0]).join(', ')} – היעדרות</div> : null}{dueN ? <div className="xs warn-t">{dueN} מועדי משימות</div> : null}</div>; })}
      <div>{hours.map((h) => <div key={h} className="wk-t">{String(h).padStart(2, '0')}:00</div>)}</div>
      {days.map((d) => {
        const k = iso(d);
        const ms = meetings.filter((m: T.Meeting) => m.date === k);
        return (
          <div key={k} className="wk-col">
            {hours.map((h) => <div key={h} className="wk-slot" onDoubleClick={() => onSlot(k, `${String(h).padStart(2, '0')}:00`)} title="לחיצה כפולה ליצירת פגישה" />)}
            {ms.map((m: T.Meeting) => (
              <button key={m.id} type="button" className={cx('wk-ev', evClass(m.kind))} style={{ top: top(m.start), height: Math.max(26, top(m.end) - top(m.start) - 2), border: 0, textAlign: 'right' }} onClick={() => nav(`/meetings/${m.id}`)}>
                <b>{m.title}</b><div className="num ltr" style={{ textAlign: 'right' }}>{m.start}–{m.end}</div><div className="ellipsis" style={{ opacity: .8 }}>{m.location}</div>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
function DayView({ cursor, meetings, tasks, absences }: any) {
  const { db, live } = useStore();
  const k = iso(cursor);
  const ms = meetings.filter((m: T.Meeting) => m.date === k).sort((a: any, b: any) => a.start.localeCompare(b.start));
  const ab = absences.filter((a: T.Absence) => a.from <= k && a.to >= k);
  const ts = db.tasks.filter((t) => t.dueDate === k && t.status !== 'הושלם');
  return (
    <div className="grid-2">
      <Card title={`פגישות (${ms.length})`} pad={false}>{ms.length ? <div className="list">{ms.map((m: T.Meeting) => <MeetingLine key={m.id} m={m} />)}</div> : <Empty title="אין פגישות ביום הזה" />}</Card>
      <div className="stack">
        {ab.length ? <Callout kind="assume" title="היעדרויות">{ab.map((a: T.Absence) => `${userName(db, a.userId)} – ${a.kind}`).join(' · ')}</Callout> : null}
        <Card title={`משימות למועד הזה (${ts.length})`} pad={false}>{ts.length ? <div className="list">{ts.map((t) => <TaskLine key={t.id} t={t} />)}</div> : <Empty title="אין משימות" />}</Card>
      </div>
    </div>
  );
}

export function MeetingForm({ meeting, defaults = {}, onClose }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const isNew = !meeting;
  const [f, setF] = useState<T.Meeting>(() => meeting ? structuredClone(meeting) : { id: uid('mt'), projectId: defaults.projectId ?? null, title: '', kind: 'client', date: defaults.date || D(1), start: defaults.start || '10:00', end: defaults.start ? `${String(Number(defaults.start.slice(0, 2)) + 1).padStart(2, '0')}:00` : '11:00', location: '', attendeeIds: [me.id], contactIds: [], supplierIds: [], agenda: [], summary: '', followUpTaskIds: [], sharedWithClient: true, status: 'מתוכננת' });
  const [agenda, setAgenda] = useState(f.agenda.join('\n'));
  const [err, setErr] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const proj = projectOf(db, f.projectId);
  const contacts = proj ? clientOf(db, proj.clientId)?.contacts || [] : [];
  const conflicts = f.attendeeIds.flatMap((uid2) => {
    const out: string[] = [];
    db.absences.filter((a) => a.userId === uid2 && a.from <= f.date && a.to >= f.date).forEach((a) => out.push(`${userName(db, uid2)} ב${a.kind} בתאריך הזה`));
    db.meetings.filter((m) => m.id !== f.id && m.date === f.date && m.status !== 'בוטלה' && m.attendeeIds.includes(uid2) && toMin(m.start) < toMin(f.end) && toMin(f.start) < toMin(m.end)).forEach((m) => out.push(`${userName(db, uid2)} כבר ב"${m.title}" (${m.start}–${m.end})`));
    return out;
  });
  const save = () => {
    const e: any = {};
    if (!f.title.trim()) e.title = 'יש להזין נושא';
    if (toMin(f.end) <= toMin(f.start)) e.end = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
    if (!f.attendeeIds.length) e.att = 'יש לבחור לפחות משתתף אחד מהצוות';
    setErr(e); if (Object.keys(e).length) return;
    run(A.saveMeeting, { ...f, agenda: agenda.split('\n').map((x) => x.trim()).filter(Boolean) }, isNew);
    if (isNew && f.contactIds.length && live) live.enqueue((api) => api.rpc('send_meeting_email', { p_meeting: f.id, p_kind: 'invite' }));
    else if (isNew && f.contactIds.length) run((d: any) => f.contactIds.forEach((cid) => { const c = contactOf(d, cid); if (c) simulateEmail(d, c.contact.email, `זימון: ${f.title} – ${date(f.date)} ${f.start}`, 'meeting_invite', `/meetings/${f.id}`); }));
    toast(isNew ? `הפגישה נקבעה${f.contactIds.length ? (live ? ' · זימון ללקוח נכנס לתור השליחה' : ' · זימון ללקוח נרשם (לא נשלח)') : ''}` : 'הפגישה עודכנה'); onClose(); if (isNew) nav(`/meetings/${f.id}`);
  };
  return (
    <Modal title={isNew ? 'פגישה חדשה' : 'עריכת פגישה'} onClose={onClose} size="wide" foot={<><Btn kind="primary" onClick={save}>{isNew ? 'קביעה' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="נושא *" full error={err.title} htmlFor="mf-t"><Input id="mf-t" value={f.title} invalid={err.title} onChange={(e: any) => set('title', e.target.value)} /></Field>
        <Field label="סוג" htmlFor="mf-k"><Select id="mf-k" value={f.kind} onChange={(e: any) => set('kind', e.target.value)} options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} /></Field>
        <Field label="פרויקט" htmlFor="mf-p"><Select id="mf-p" value={f.projectId || ''} onChange={(e: any) => { set('projectId', e.target.value || null); set('contactIds', []); }} options={[{ value: '', label: 'ללא פרויקט (משרד)' }, ...visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))]} /></Field>
        <Field label="תאריך" htmlFor="mf-d"><Input id="mf-d" type="date" value={f.date} onChange={(e: any) => set('date', e.target.value)} /></Field>
        <div className="row g8"><Field label="התחלה" htmlFor="mf-s"><Input id="mf-s" type="time" value={f.start} onChange={(e: any) => set('start', e.target.value)} /></Field><Field label="סיום" error={err.end} htmlFor="mf-e"><Input id="mf-e" type="time" value={f.end} invalid={err.end} onChange={(e: any) => set('end', e.target.value)} /></Field></div>
        <Field label="מיקום" full htmlFor="mf-l"><Input id="mf-l" value={f.location} onChange={(e: any) => set('location', e.target.value)} placeholder={proj ? `${proj.address}, ${proj.city}` : 'משרד / זום / כתובת'} /></Field>
        <Field label="משתתפים מהצוות *" full error={err.att}>
          <div className="row wrap g12">{staff(db).map((u: any) => <Check key={u.id} id={'mf-a' + u.id} checked={f.attendeeIds.includes(u.id)} onChange={(v: boolean) => set('attendeeIds', v ? [...f.attendeeIds, u.id] : f.attendeeIds.filter((x) => x !== u.id))} label={u.name} />)}</div>
        </Field>
        {contacts.length ? <Field label="משתתפים מצד הלקוח" full><div className="row wrap g12">{contacts.map((c) => <Check key={c.id} id={'mf-c' + c.id} checked={f.contactIds.includes(c.id)} onChange={(v: boolean) => set('contactIds', v ? [...f.contactIds, c.id] : f.contactIds.filter((x) => x !== c.id))} label={c.name} />)}</div></Field> : null}
        <Field label="ספקים / קבלנים" full htmlFor="mf-sup"><Select id="mf-sup" value="" onChange={(e: any) => e.target.value && !f.supplierIds.includes(e.target.value) && set('supplierIds', [...f.supplierIds, e.target.value])} placeholder={f.supplierIds.length ? f.supplierIds.map((s) => supplierOf(db, s)?.name).join(', ') : 'הוספת ספק'} options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="סדר יום" full hint="שורה לכל נושא" htmlFor="mf-ag"><Textarea id="mf-ag" rows={3} value={agenda} onChange={(e: any) => setAgenda(e.target.value)} /></Field>
        <div className="full"><Switch id="mf-sh" checked={f.sharedWithClient} onChange={(v: boolean) => set('sharedWithClient', v)} label="מוצג ללקוח בפורטל" /></div>
      </div>
      {conflicts.length ? <div className="mt16"><Callout kind="assume" icon={LuTriangleAlert} title="התנגשויות ביומן">{conflicts.join(' · ')}</Callout></div> : null}
    </Modal>
  );
}

function AbsenceForm({ onClose }: any) {
  const { db, me, run, toast, live } = useStore();
  const [f, setF] = useState<T.Absence>({ id: uid('ab'), userId: me.id, from: D(1), to: D(1), kind: 'חופשה', note: '' });
  const [err, setErr] = useState('');
  return (
    <Modal title="רישום היעדרות" onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={() => { if (f.to < f.from) { setErr('תאריך הסיום לפני תאריך ההתחלה'); return; } run(A.absence, f); toast('ההיעדרות נרשמה ותוצג ביומן'); onClose(); }}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <Field label="עובד/ת" htmlFor="ab-u"><Select id="ab-u" value={f.userId} disabled={me.role === 'member'} onChange={(e: any) => setF({ ...f, userId: e.target.value })} options={staff(db).map((u: any) => ({ value: u.id, label: u.name }))} /></Field>
        <Field label="סוג" htmlFor="ab-k"><Select id="ab-k" value={f.kind} onChange={(e: any) => setF({ ...f, kind: e.target.value })} options={['חופשה', 'מחלה', 'מילואים', 'השתלמות']} /></Field>
        <div className="row g8"><Field label="מתאריך" htmlFor="ab-f"><Input id="ab-f" type="date" value={f.from} onChange={(e: any) => setF({ ...f, from: e.target.value })} /></Field><Field label="עד תאריך" error={err} htmlFor="ab-t"><Input id="ab-t" type="date" value={f.to} invalid={err} onChange={(e: any) => setF({ ...f, to: e.target.value })} /></Field></div>
        <Field label="הערה" htmlFor="ab-n"><Input id="ab-n" value={f.note} onChange={(e: any) => setF({ ...f, note: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

export function MeetingDetail({ id }: { id: string }) {
  const { db, me, run, toast, nav, live } = useStore();
  const m = byId(db.meetings, id);
  const [edit, setEdit] = useState(false);
  const [summary, setSummary] = useState(m?.summary || '');
  const [task, setTask] = useState(false);
  useEffect(() => setSummary(m?.summary || ''), [m?.id]);
  if (!m || (m.projectId && !visibleProjectIds(db, me).has(m.projectId))) return <Empty title="הפגישה לא נמצאה או שאין גישה" action={<Btn onClick={() => nav('/calendar')}>ליומן</Btn>} />;
  const followUps = db.tasks.filter((t) => m.followUpTaskIds.includes(t.id) || (t.source?.kind === 'meeting' && t.source.id === m.id));
  const past = m.date < todayISO;
  return (
    <div>
      <PageHead crumbs={[{ label: 'יומן ופגישות', to: '/calendar' }, { label: m.title }]} title={m.title} badge={<><Badge tone={m.kind === 'site' ? 'warn' : m.kind === 'client' ? 'info' : m.kind === 'supplier' ? 'violet' : ''}>{KIND_LABEL[m.kind]}</Badge><StatusBadge s={m.status} /></>}
        sub={<span className="row wrap g12 small"><span className="row g4"><LuClock aria-hidden style={{ width: 14 }} />{relDay(m.date)} · {date(m.date)} · <span className="num ltr">{m.start}–{m.end}</span></span><span className="row g4"><LuMapPin aria-hidden style={{ width: 14 }} />{m.location || '—'}</span></span>}
        actions={<><Btn icon={LuPencil} onClick={() => setEdit(true)}>עריכה</Btn>{m.status === 'מתוכננת' ? <><Btn icon={LuCalendarCheck} onClick={() => { run(A.saveMeeting, { ...m, status: 'התקיימה' }, false); toast('סומנה כהתקיימה'); }}>סימון כהתקיימה</Btn><Btn kind="danger" icon={LuCalendarX} onClick={() => { run(A.saveMeeting, { ...m, status: 'בוטלה' }, false); toast('הפגישה בוטלה'); }}>ביטול פגישה</Btn></> : null}</>} />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="סדר יום">{m.agenda.length ? <ol style={{ margin: 0, paddingInlineStart: 20 }}>{m.agenda.map((a, i) => <li key={i} style={{ marginBottom: 6 }}>{a}</li>)}</ol> : <span className="small muted">לא הוגדר סדר יום.</span>}</Card>
          <Card title="סיכום פגישה" actions={m.summary ? <Btn size="sm" icon={LuSend} onClick={() => { if (live) { live.enqueue((api) => api.rpc('send_meeting_email', { p_meeting: m.id, p_kind: 'summary' }), 'הסיכום נכנס לתור השליחה ללקוחות שהשתתפו', 'info'); return; } run((d: any) => { m.contactIds.forEach((cid) => { const c = contactOf(d, cid); if (c) simulateEmail(d, c.contact.email, `סיכום: ${m.title}`, 'meeting_summary', `/meetings/${m.id}`); }); m.attendeeIds.forEach((u) => { const usr = d.users.find((x: any) => x.id === u); if (usr) simulateEmail(d, usr.email, `סיכום: ${m.title}`, 'meeting_summary', `/meetings/${m.id}`); }); }); toast('הסיכום נרשם לשליחה למשתתפים (מדומה – לא נשלח)', 'info'); }}>שליחה למשתתפים</Btn> : null}>
            <div className="stack">
              <Textarea id="mt-sum" rows={5} value={summary} onChange={(e: any) => setSummary(e.target.value)} placeholder={past ? 'מה סוכם בפגישה?' : 'אפשר לכתוב את הסיכום אחרי הפגישה'} aria-label="סיכום פגישה" />
              <div className="row g8"><Btn kind="navy" disabled={summary === m.summary} onClick={() => { run(A.saveMeeting, { ...m, summary }, false); toast('הסיכום נשמר'); }}>שמירת סיכום</Btn>{m.sharedWithClient ? <span className="xs muted">הסיכום יוצג ללקוח בפורטל</span> : <span className="xs muted">פגישה פנימית – לא מוצגת ללקוח</span>}</div>
            </div>
          </Card>
          <Card title="משימות המשך" icon={LuListChecks} pad={false} actions={<Btn size="sm" icon={LuPlus} onClick={() => setTask(true)}>משימת המשך</Btn>}>
            {followUps.length ? <div className="list">{followUps.map((t) => <TaskLine key={t.id} t={t} onOpen={() => nav(`/tasks?open=${t.id}`)} />)}</div> : <Empty title="אין משימות המשך" />}
          </Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פרטים">
            <KV items={[['פרויקט', <ProjectLink id={m.projectId} />], ['בפורטל', m.sharedWithClient ? 'מוצג ללקוח' : 'פנימי'], ['ספקים', m.supplierIds.map((s) => supplierOf(db, s)?.name).join(', ') || '—']]} />
          </Card>
          <Card title="משתתפים" icon={LuUsers} pad={false}>
            <div className="list">
              {m.attendeeIds.map((u) => <div key={u} className="li"><PersonCell id={u} sub="צוות" />{db.absences.some((a) => a.userId === u && a.from <= m.date && a.to >= m.date) ? <Badge tone="bad">בהיעדרות</Badge> : null}</div>)}
              {m.contactIds.map((c) => { const ct = contactOf(db, c); return <div key={c} className="li"><span className="av sm" style={{ background: 'var(--info)' }}>ל</span><div className="li-main"><div className="li-title">{ct?.contact.name}</div><div className="li-sub">לקוח · {ct?.client.name}</div></div></div>; })}
            </div>
          </Card>
        </div>
      </div>
      {edit ? <MeetingForm meeting={m} onClose={() => setEdit(false)} /> : null}
      {task ? <TaskForm defaults={{ projectId: m.projectId, source: { kind: 'meeting', id: m.id }, title: '' }} onClose={() => setTask(false)} /> : null}
    </div>
  );
}
