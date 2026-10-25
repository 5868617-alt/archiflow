import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuList, LuSquareKanban, LuCalendarDays, LuClipboardList, LuPlus, LuTrash2, LuLink, LuChevronRight, LuChevronLeft, LuWandSparkles, LuCopy } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, userName, projectOf, A, uid, isOverdue, byId } from '../data/api';
import { TASK_STATUSES, PRIORITIES } from '../data/types';
import type * as T from '../data/types';
import { todayISO, D, daysFromToday, iso, DEMO_TODAY, parseISO } from '../data/dates';
import { PageHead, Btn, Tabs, Chips, Select, SearchBox, DataTable, StatusBadge, Badge, Drawer, Modal, Field, Input, Textarea, Empty, Callout, Avatar, Card, cx, Segmented, Confirm } from '../ui/core';
import { PersonCell, ProjectLink, DueCell, CommentThread, TaskLine } from './shared';
import { date, DOW_S, monthName, dateShort } from '../lib/format';

const staffOf = (db: any) => db.users.filter((u: T.User) => u.officeId && u.role !== 'client' && u.status === 'פעיל');

export function TasksPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const [tab, setTab] = useState(query.tab || 'list');
  const [scope, setScope] = useState(query.view === 'today' || query.view === 'late' ? 'mine' : 'all');
  const [quick, setQuick] = useState(query.view || 'open');
  const [project, setProject] = useState(query.project || '');
  const [assignee, setAssignee] = useState('');
  const [prio, setPrio] = useState('');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(query.open || null);
  const [creating, setCreating] = useState(!!query.new);
  useEffect(() => { if (query.open) setOpenId(query.open); if (query.new) setCreating(true); }, [query.open, query.new]);
  const pids = visibleProjectIds(db, me);
  let tasks = db.tasks.filter((t) => (t.projectId ? pids.has(t.projectId) : me.role !== 'member' || t.assigneeId === me.id));
  if (scope === 'mine') tasks = tasks.filter((t) => t.assigneeId === me.id);
  if (project) tasks = tasks.filter((t) => t.projectId === project);
  if (assignee) tasks = tasks.filter((t) => t.assigneeId === assignee);
  if (prio) tasks = tasks.filter((t) => t.priority === prio);
  if (q.trim()) tasks = tasks.filter((t) => t.title.includes(q) || t.description.includes(q));
  const quickFilter = (t: T.Task) => quick === 'open' ? t.status !== 'הושלם' : quick === 'today' ? t.dueDate === todayISO && t.status !== 'הושלם' : quick === 'late' ? isOverdue(t) : quick === 'week' ? t.status !== 'הושלם' && daysFromToday(t.dueDate) >= 0 && daysFromToday(t.dueDate) <= 7 : quick === 'done' ? t.status === 'הושלם' : true;
  const listTasks = tasks.filter(quickFilter);
  const projects = visibleProjects(db, me);
  return (
    <div>
      <PageHead title="משימות" sub="כל המשימות של המשרד, לפי פרויקט, אחראי ומועד." actions={<Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>משימה חדשה</Btn>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'list', label: 'רשימה', icon: LuList }, { id: 'kanban', label: 'לוח קנבן', icon: LuSquareKanban }, { id: 'calendar', label: 'לוח שנה', icon: LuCalendarDays }, { id: 'templates', label: 'תבניות עבודה', icon: LuClipboardList, count: db.templates.length }]} />
      {tab !== 'templates' ? (
        <div className="filters">
          <Segmented value={scope} onChange={setScope} options={[{ value: 'mine', label: 'שלי' }, { value: 'all', label: 'כל הצוות' }]} />
          <SearchBox value={q} onChange={setQ} placeholder="חיפוש משימה" id="task-search" />
          <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={projects.map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
          {scope === 'all' ? <Select value={assignee} onChange={(e: any) => setAssignee(e.target.value)} placeholder="כל האחראים" options={staffOf(db).map((u: any) => ({ value: u.id, label: u.name }))} aria-label="אחראי" /> : null}
          <Select value={prio} onChange={(e: any) => setPrio(e.target.value)} placeholder="כל העדיפויות" options={[...PRIORITIES]} aria-label="עדיפות" />
        </div>
      ) : null}
      {tab === 'list' ? (
        <>
          <div style={{ marginBottom: 14 }}><Chips value={quick} onChange={setQuick} options={[
            { value: 'open', label: 'פתוחות', count: tasks.filter((t) => t.status !== 'הושלם').length }, { value: 'today', label: 'להיום', count: tasks.filter((t) => t.dueDate === todayISO && t.status !== 'הושלם').length },
            { value: 'late', label: 'באיחור', count: tasks.filter(isOverdue).length }, { value: 'week', label: '7 הימים הקרובים', count: tasks.filter((t) => t.status !== 'הושלם' && daysFromToday(t.dueDate) >= 0 && daysFromToday(t.dueDate) <= 7).length },
            { value: 'done', label: 'הושלמו', count: tasks.filter((t) => t.status === 'הושלם').length }, { value: 'all', label: 'הכול', count: tasks.length }]} /></div>
          <TaskTable tasks={listTasks} onOpen={(t: T.Task) => setOpenId(t.id)} />
        </>
      ) : null}
      {tab === 'kanban' ? <Kanban tasks={tasks} onOpen={(t: T.Task) => setOpenId(t.id)} /> : null}
      {tab === 'calendar' ? <TaskCalendar tasks={tasks} onOpen={(t: T.Task) => setOpenId(t.id)} /> : null}
      {tab === 'templates' ? <Templates /> : null}
      {openId && byId(db.tasks, openId) ? <TaskDrawer id={openId} onClose={() => { setOpenId(null); if (query.open) nav('/tasks'); }} /> : null}
      {creating ? <TaskForm defaults={{ projectId: project || null }} onClose={() => { setCreating(false); if (query.new) nav('/tasks'); }} /> : null}
    </div>
  );
}

export function TaskTable({ tasks, onOpen, hideProject }: any) {
  const { db, run, toast, live } = useStore();
  return (
    <div className="card">
      <DataTable rows={tasks} onRow={onOpen} pageSize={15} initialSort={{ key: 'dueDate', dir: 1 }} empty={<Empty title="אין משימות בתצוגה הזו">אפשר לשנות סינון או ליצור משימה חדשה.</Empty>} columns={[
        { key: 'done', label: '', sortable: false, width: 36, render: (t: T.Task) => <input type="checkbox" aria-label={`השלמת ${t.title}`} checked={t.status === 'הושלם'} onClick={(e) => e.stopPropagation()} onChange={() => { run(A.setTaskStatus, t.id, t.status === 'הושלם' ? 'לביצוע' : 'הושלם'); toast(t.status === 'הושלם' ? 'המשימה נפתחה מחדש' : 'המשימה הושלמה'); }} style={{ width: 16, height: 16, accentColor: 'var(--ok)' }} /> },
        { key: 'title', label: 'משימה', render: (t: T.Task) => <div className="col" style={{ gap: 0, maxWidth: 420 }}><span className={cx(t.status === 'הושלם' && 'muted')} style={{ textDecoration: t.status === 'הושלם' ? 'line-through' : undefined, fontWeight: 500 }}>{t.title}</span>{t.source ? <span className="xs muted row g4"><LuLink aria-hidden style={{ width: 11 }} />{t.source.kind === 'plan' ? 'מממצא בשרטוט' : t.source.kind === 'meeting' ? 'ממעקב פגישה' : t.source.kind === 'approval' ? 'מאישור לקוח' : 'מתבנית'}</span> : null}</div> },
        ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', sortValue: (t: T.Task) => projectOf(db, t.projectId)?.name || 'ת', render: (t: T.Task) => <ProjectLink id={t.projectId} /> }]),
        { key: 'assigneeId', label: 'אחראי/ת', sortValue: (t: T.Task) => userName(db, t.assigneeId), render: (t: T.Task) => <PersonCell id={t.assigneeId} /> },
        { key: 'priority', label: 'עדיפות', sortValue: (t: T.Task) => PRIORITIES.indexOf(t.priority), render: (t: T.Task) => <StatusBadge s={t.priority} dot={false} /> },
        { key: 'status', label: 'סטטוס', sortValue: (t: T.Task) => TASK_STATUSES.indexOf(t.status), render: (t: T.Task) => <StatusBadge s={t.status} /> },
        { key: 'dueDate', label: 'מועד', render: (t: T.Task) => <DueCell date={t.dueDate} done={t.status === 'הושלם'} /> },
      ]} />
    </div>
  );
}

export function Kanban({ tasks, onOpen }: any) {
  const { db, run, toast, live } = useStore();
  const [over, setOver] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  return (
    <div className="kanban" aria-label="לוח קנבן">
      {TASK_STATUSES.map((s) => {
        const col = tasks.filter((t: T.Task) => t.status === s).sort((a: T.Task, b: T.Task) => a.dueDate.localeCompare(b.dueDate));
        return (
          <div key={s} className={cx('k-col', over === s && 'drop')} onDragOver={(e) => { e.preventDefault(); setOver(s); }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); setOver(null); const t = byId(db.tasks, id); if (t && t.status !== s) { run(A.setTaskStatus, id, s); toast(`"${t.title}" הועברה ל"${s}"`); } }}>
            <div className="k-head"><span className="row g8"><StatusBadge s={s} />{s === 'הושלם' ? null : null}</span><span className="xs muted num">{col.length}</span></div>
            <div className="k-list">
              {col.length === 0 ? <div className="xs muted t-center" style={{ padding: 16, border: '1px dashed var(--line-strong)', borderRadius: 6 }}>גררו לכאן משימה</div> : null}
              {col.slice(0, s === 'הושלם' ? 8 : 40).map((t: T.Task) => (
                <div key={t.id} className={cx('k-card', drag === t.id && 'dragging')} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); setDrag(t.id); }} onDragEnd={() => setDrag(null)} onClick={() => onOpen(t)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}>
                  <div className="small bold">{t.title}</div>
                  <div className="xs muted ellipsis">{projectOf(db, t.projectId)?.name || 'משרד'}</div>
                  <div className="row between g8">
                    <Avatar user={db.users.find((u) => u.id === t.assigneeId)} size="sm" />
                    <span className="row g4">{t.priority === 'דחופה' || t.priority === 'גבוהה' ? <StatusBadge s={t.priority} dot={false} /> : null}<DueCell date={t.dueDate} done={t.status === 'הושלם'} /></span>
                  </div>
                  <select className="select sm show-sm" value={t.status} onClick={(e) => e.stopPropagation()} onChange={(e) => { run(A.setTaskStatus, t.id, e.target.value); toast('הסטטוס עודכן'); }} aria-label="שינוי סטטוס">{TASK_STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
                </div>
              ))}
              {s === 'הושלם' && col.length > 8 ? <div className="xs muted t-center">ועוד {col.length - 8} שהושלמו</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCalendar({ tasks, onOpen }: any) {
  const [cursor, setCursor] = useState(new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), 1));
  const first = new Date(cursor); const start = new Date(first); start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  return (
    <div>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row g8"><Btn size="sm" icon={LuChevronRight} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="חודש קודם" /><b className="lg">{monthName(cursor.getMonth())} {cursor.getFullYear()}</b><Btn size="sm" icon={LuChevronLeft} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="חודש הבא" /></div>
        <Btn size="sm" onClick={() => setCursor(new Date(DEMO_TODAY.getFullYear(), DEMO_TODAY.getMonth(), 1))}>היום</Btn>
      </div>
      <div className="cal scroll-x">
        <div className="cal-grid" style={{ minWidth: 640 }}>
          {DOW_S.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {days.map((d) => {
            const k = iso(d); const items = tasks.filter((t: T.Task) => t.dueDate === k);
            return (
              <div key={k} className={cx('cal-cell', d.getMonth() !== cursor.getMonth() && 'out', k === todayISO && 'today', (d.getDay() === 5 || d.getDay() === 6) && 'weekend')}>
                <span className="d">{d.getDate()}</span>
                {items.slice(0, 3).map((t: T.Task) => <button key={t.id} type="button" className={cx('cal-ev task', isOverdue(t) && 'absence')} style={{ border: 0, textAlign: 'right', textDecoration: t.status === 'הושלם' ? 'line-through' : undefined }} onClick={() => onOpen(t)} title={t.title}>{t.title}</button>)}
                {items.length > 3 ? <span className="cal-more">+{items.length - 3} נוספות</span> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TaskDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { db, me, run, toast, nav, live } = useStore();
  const t = byId(db.tasks, id)!;
  const [editing, setEditing] = useState(false);
  const [del, setDel] = useState(false);
  const src = t.source;
  const srcLink = src?.kind === 'plan' ? `/plans/${src.id}` : src?.kind === 'meeting' ? `/meetings/${src.id}` : src?.kind === 'approval' ? `/approvals?open=${src.id}` : null;
  return (
    <Drawer title={t.title} sub={projectOf(db, t.projectId)?.name || 'משימת משרד'} onClose={onClose} foot={<><Btn kind="primary" onClick={() => setEditing(true)}>עריכה</Btn>{t.status !== 'הושלם' ? <Btn kind="ok" onClick={() => { run(A.setTaskStatus, id, 'הושלם'); toast('המשימה הושלמה'); }}>סימון כהושלם</Btn> : null}<div className="grow" /><Btn kind="danger" icon={LuTrash2} onClick={() => setDel(true)}>מחיקה</Btn></>}>
      <div className="stack-lg">
        <div className="form-grid">
          <Field label="סטטוס" htmlFor="td-status"><Select id="td-status" value={t.status} onChange={(e: any) => { run(A.setTaskStatus, id, e.target.value); toast('הסטטוס עודכן'); }} options={[...TASK_STATUSES]} /></Field>
          <Field label="עדיפות" htmlFor="td-prio"><Select id="td-prio" value={t.priority} onChange={(e: any) => run(A.saveTask, { ...t, priority: e.target.value }, false)} options={[...PRIORITIES]} /></Field>
          <Field label="אחראי/ת" htmlFor="td-as"><Select id="td-as" value={t.assigneeId} onChange={(e: any) => { run(A.saveTask, { ...t, assigneeId: e.target.value }, false); toast(`שויך ל${userName(db, e.target.value)}`); }} options={staffOf(db).map((u: any) => ({ value: u.id, label: u.name }))} /></Field>
          <Field label="מועד" htmlFor="td-due"><Input id="td-due" type="date" value={t.dueDate} onChange={(e: any) => run(A.saveTask, { ...t, dueDate: e.target.value }, false)} /></Field>
        </div>
        {t.description ? <div><div className="eyebrow mb8">תיאור</div><p className="soft" style={{ whiteSpace: 'pre-wrap' }}>{t.description}</p></div> : null}
        <div className="row wrap g8 small">
          {t.projectId ? <Btn size="sm" onClick={() => nav(`/projects/${t.projectId}`)}>לפרויקט</Btn> : null}
          {srcLink ? <Btn size="sm" icon={LuLink} onClick={() => nav(srcLink)}>{src!.kind === 'plan' ? 'לשרטוט המקור' : src!.kind === 'meeting' ? 'לפגישה' : 'לאישור'}</Btn> : null}
          <span className="muted">נוצרה {date(t.createdAt)} ע״י {userName(db, t.createdBy)}</span>
        </div>
        {t.checklist.length ? (
          <div>
            <div className="eyebrow mb8">רשימת בדיקה · {t.checklist.filter((c) => c.done).length}/{t.checklist.length}</div>
            <div className="col g8">{t.checklist.map((c) => <label key={c.id} className="check" htmlFor={'ck' + c.id}><input id={'ck' + c.id} type="checkbox" checked={c.done} onChange={() => run(A.toggleCheck, id, c.id)} /><span style={{ textDecoration: c.done ? 'line-through' : undefined }} className={c.done ? 'muted' : ''}>{c.text}</span></label>)}</div>
          </div>
        ) : null}
        <div><div className="eyebrow mb8">תגובות</div><CommentThread comments={t.comments} onAdd={(text) => { run(A.addTaskComment, id, text); toast('התגובה נוספה'); }} /></div>
      </div>
      {editing ? <TaskForm task={t} onClose={() => setEditing(false)} /> : null}
      {del ? <Confirm title="מחיקת משימה" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deleteTask, id); toast('המשימה נמחקה'); onClose(); }}>למחוק את "{t.title}"? לא ניתן לבטל{IS_LIVE ? '.' : ' (בדמו – אפשר לאפס את הנתונים).'}</Confirm> : null}
    </Drawer>
  );
}

export function TaskForm({ task, defaults = {}, onClose }: { task?: T.Task; defaults?: any; onClose: () => void }) {
  const { db, me, run, toast, live } = useStore();
  const isNew = !task;
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'הושלם');
  const [f, setF] = useState<T.Task>(() => task ? structuredClone(task) : { id: uid('t'), projectId: defaults.projectId ?? (projects[0]?.id || null), title: '', description: '', status: 'לביצוע', priority: 'בינונית', assigneeId: me.id, dueDate: D(3), createdAt: todayISO, createdBy: me.id, tags: [], comments: [], checklist: [], ...defaults });
  const [err, setErr] = useState<any>({});
  const [check, setCheck] = useState('');
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = () => {
    const e: any = {};
    if (!f.title.trim()) e.title = 'יש להזין כותרת';
    if (f.title.length > 120) e.title = 'כותרת ארוכה מדי (עד 120 תווים)';
    if (!f.dueDate) e.dueDate = 'יש לבחור מועד';
    setErr(e); if (Object.keys(e).length) return;
    run(A.saveTask, f, isNew); toast(isNew ? 'המשימה נוצרה' : 'המשימה עודכנה'); onClose();
  };
  return (
    <Modal title={isNew ? 'משימה חדשה' : 'עריכת משימה'} onClose={onClose} foot={<><Btn kind="primary" onClick={save}>{isNew ? 'יצירה' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="כותרת *" error={err.title} full htmlFor="tf-title"><Input id="tf-title" value={f.title} invalid={err.title} onChange={(e: any) => set('title', e.target.value)} placeholder="מה צריך לעשות?" autoFocus /></Field>
        <Field label="פרויקט" htmlFor="tf-proj"><Select id="tf-proj" value={f.projectId || ''} onChange={(e: any) => set('projectId', e.target.value || null)} options={[{ value: '', label: 'משימת משרד (ללא פרויקט)' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} /></Field>
        <Field label="אחראי/ת" htmlFor="tf-as"><Select id="tf-as" value={f.assigneeId} onChange={(e: any) => set('assigneeId', e.target.value)} options={staffOf(db).map((u: any) => ({ value: u.id, label: u.name }))} /></Field>
        <Field label="מועד *" error={err.dueDate} htmlFor="tf-due"><Input id="tf-due" type="date" value={f.dueDate} invalid={err.dueDate} onChange={(e: any) => set('dueDate', e.target.value)} /></Field>
        <Field label="עדיפות" htmlFor="tf-prio"><Select id="tf-prio" value={f.priority} onChange={(e: any) => set('priority', e.target.value)} options={[...PRIORITIES]} /></Field>
        <Field label="תיאור" full htmlFor="tf-desc"><Textarea id="tf-desc" rows={3} value={f.description} onChange={(e: any) => set('description', e.target.value)} /></Field>
        <Field label="רשימת בדיקה" full hint="Enter להוספה" htmlFor="tf-check">
          <div className="col g4">
            {f.checklist.map((c) => <div key={c.id} className="row g8 small"><span className="grow">• {c.text}</span><button type="button" className="linkish xs" onClick={() => set('checklist', f.checklist.filter((x) => x.id !== c.id))}>הסרה</button></div>)}
            <Input id="tf-check" value={check} onChange={(e: any) => setCheck(e.target.value)} onKeyDown={(e: any) => { if (e.key === 'Enter' && check.trim()) { e.preventDefault(); set('checklist', [...f.checklist, { id: uid('k'), text: check.trim(), done: false }]); setCheck(''); } }} placeholder="פריט לבדיקה" />
          </div>
        </Field>
      </div>
    </Modal>
  );
}

function Templates() {
  const { db, me, run, toast, nav, live } = useStore();
  const [apply, setApply] = useState<T.WorkTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <div className="stack">
      <div className="row between wrap"><p className="soft">תבניות חוסכות הקמה ידנית של משימות חוזרות. החלה על פרויקט יוצרת את כל המשימות עם מועדים יחסיים להיום.</p><Btn icon={LuPlus} onClick={() => setCreating(true)}>תבנית חדשה</Btn></div>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {db.templates.map((tpl) => (
          <Card key={tpl.id} title={tpl.name} actions={<Badge>{tpl.category}</Badge>} foot={<><span className="xs muted">הוחלה {tpl.usedCount} פעמים</span><Btn size="sm" kind="navy" icon={LuWandSparkles} onClick={() => setApply(tpl)}>החלה על פרויקט</Btn></>}>
            <p className="small soft mb8">{tpl.description}</p>
            <ol className="small" style={{ margin: 0, paddingInlineStart: 18 }}>{tpl.tasks.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x.title} <span className="xs muted">· יום {x.offsetDays} · {x.role}</span></li>)}</ol>
          </Card>
        ))}
      </div>
      {apply ? <ApplyTemplate tpl={apply} onClose={() => setApply(null)} /> : null}
      {creating ? <NewTemplate onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
export function ApplyTemplate({ tpl, projectId, onClose }: any) {
  const { db, me, run, toast, live } = useStore();
  const [pid, setPid] = useState(projectId || '');
  const [as, setAs] = useState(me.id);
  const [tid, setTid] = useState(tpl?.id || db.templates[0].id);
  const chosen = byId(db.templates, tid)!;
  return (
    <Modal title={`החלת תבנית: ${chosen.name}`} onClose={onClose} size="narrow" foot={<><Btn kind="primary" disabled={!pid} onClick={() => { run(A.applyTemplate, tid, pid, as); toast(`${chosen.tasks.length} משימות נוצרו בפרויקט`); onClose(); }}>יצירת {chosen.tasks.length} משימות</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        {!tpl ? <Field label="תבנית" htmlFor="ap-t"><Select id="ap-t" value={tid} onChange={(e: any) => setTid(e.target.value)} options={db.templates.map((t) => ({ value: t.id, label: t.name }))} /></Field> : null}
        {!projectId ? <Field label="פרויקט" htmlFor="ap-p"><Select id="ap-p" value={pid} onChange={(e: any) => setPid(e.target.value)} placeholder="בחירת פרויקט" options={visibleProjects(db, me).filter((p) => p.status !== 'הושלם').map((p) => ({ value: p.id, label: p.name }))} /></Field> : null}
        <Field label="אחראי/ת ברירת מחדל" hint="ניתן לשנות לכל משימה בהמשך" htmlFor="ap-a"><Select id="ap-a" value={as} onChange={(e: any) => setAs(e.target.value)} options={staffOf(db).map((u: any) => ({ value: u.id, label: u.name }))} /></Field>
        <div className="small soft">{chosen.tasks.map((x: any) => `${x.title} (${dateShort(D(x.offsetDays))})`).join(' · ')}</div>
      </div>
    </Modal>
  );
}
function NewTemplate({ onClose }: any) {
  const { run, toast, live } = useStore();
  const [name, setName] = useState(''); const [cat, setCat] = useState('כללי'); const [lines, setLines] = useState('משימה ראשונה\nמשימה שנייה');
  const [err, setErr] = useState('');
  return (
    <Modal title="תבנית עבודה חדשה" onClose={onClose} foot={<><Btn kind="primary" onClick={() => { const ls = lines.split('\n').map((l) => l.trim()).filter(Boolean); if (!name.trim() || !ls.length) { setErr('יש להזין שם ולפחות משימה אחת'); return; } run(A.saveTemplate, { id: uid('tpl'), name, description: 'תבנית מותאמת', category: cat, usedCount: 0, tasks: ls.map((title, i) => ({ title, offsetDays: i * 2, role: 'צוות', priority: 'בינונית' })) }, true); toast('התבנית נשמרה'); onClose(); }}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        {err ? <Callout kind="bad">{err}</Callout> : null}
        <Field label="שם התבנית" htmlFor="nt-n"><Input id="nt-n" value={name} onChange={(e: any) => setName(e.target.value)} /></Field>
        <Field label="קטגוריה" htmlFor="nt-c"><Input id="nt-c" value={cat} onChange={(e: any) => setCat(e.target.value)} /></Field>
        <Field label="משימות (שורה לכל משימה)" hint="מועד כל משימה: יומיים אחרי הקודמת" htmlFor="nt-l"><Textarea id="nt-l" rows={6} value={lines} onChange={(e: any) => setLines(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function ProjectTasks({ projectId }: { projectId: string }) {
  const { db, live } = useStore();
  const [view, setView] = useState('list');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tpl, setTpl] = useState(false);
  const tasks = db.tasks.filter((t) => t.projectId === projectId);
  return (
    <div>
      <div className="filters">
        <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'רשימה', icon: LuList }, { value: 'kanban', label: 'קנבן', icon: LuSquareKanban }]} />
        <span className="small muted">{tasks.filter((t) => t.status !== 'הושלם').length} פתוחות · {tasks.filter(isOverdue).length} באיחור</span>
        <div className="grow" />
        <Btn icon={LuCopy} onClick={() => setTpl(true)}>החלת תבנית</Btn>
        <Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>משימה</Btn>
      </div>
      {view === 'list' ? <TaskTable tasks={tasks} hideProject onOpen={(t: T.Task) => setOpenId(t.id)} /> : <Kanban tasks={tasks} onOpen={(t: T.Task) => setOpenId(t.id)} />}
      {creating ? <TaskForm defaults={{ projectId }} onClose={() => setCreating(false)} /> : null}
      {openId && byId(db.tasks, openId) ? <TaskDrawer id={openId} onClose={() => setOpenId(null)} /> : null}
      {tpl ? <ApplyTemplate projectId={projectId} onClose={() => setTpl(false)} /> : null}
    </div>
  );
}
