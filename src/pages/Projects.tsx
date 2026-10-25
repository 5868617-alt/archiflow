import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuLayoutGrid, LuTable, LuPlus, LuMapPin, LuCalendarClock, LuFolderKanban } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, clientOf, userName, A, uid, canSeeFinance, projectFinance, isOverdue } from '../data/api';
import { PROJECT_STATUSES, PHASES } from '../data/types';
import type * as T from '../data/types';
import { todayISO, D } from '../data/dates';
import { PageHead, Btn, Chips, SearchBox, Select, Segmented, DataTable, StatusBadge, Progress, AvatarStack, Modal, Field, Input, Textarea, Empty, Callout, useFakeLoad, Skeleton } from '../ui/core';
import { ProjectCover, PersonCell, DeadlineChip } from './shared';
import { ils, ilsShort, date } from '../lib/format';

export function ProjectsList({ query }: any) {
  const { db, me, nav, live } = useStore();
  const all = visibleProjects(db, me);
  const fin = canSeeFinance(db, me);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(query.status || 'active');
  const [lead, setLead] = useState('');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [sort, setSort] = useState('updated');
  const [editing, setEditing] = useState<T.Project | null>(null);
  const [creating, setCreating] = useState(!!query.new);
  const loading = useFakeLoad(350, []);
  useEffect(() => { if (query.new) setCreating(true); }, [query.new]);

  let list = all.filter((p) => (status === 'all' ? true : status === 'active' ? !['הושלם'].includes(p.status) : p.status === status));
  if (lead) list = list.filter((p) => p.leadId === lead);
  if (q.trim()) { const s = q.trim(); list = list.filter((p) => p.name.includes(s) || p.code.includes(s) || p.city.includes(s) || clientOf(db, p.clientId)?.name.includes(s)); }
  list = [...list].sort((a, b) => sort === 'due' ? a.dueDate.localeCompare(b.dueDate) : sort === 'name' ? a.name.localeCompare(b.name, 'he') : sort === 'progress' ? b.progress - a.progress : b.updatedAt.localeCompare(a.updatedAt));
  const counts = (s: string) => all.filter((p) => p.status === s).length;
  const statusOpts = [{ value: 'active', label: 'פעילים', count: all.filter((p) => p.status !== 'הושלם').length }, { value: 'all', label: 'הכול', count: all.length }, ...PROJECT_STATUSES.filter((s) => counts(s)).map((s) => ({ value: s, label: s, count: counts(s) }))];
  const leads = [...new Set(all.map((p) => p.leadId))];

  return (
    <div>
      <PageHead title="פרויקטים" sub={me.role === 'member' ? (IS_LIVE ? 'מוצגים רק פרויקטים שאת/ה משויך/ת אליהם.' : 'מוצגים רק פרויקטים שאת/ה משויך/ת אליהם (הנחת דמו להרשאות חבר צוות).') : `${all.length} פרויקטים במשרד, מליד ועד מסירה.`}
        actions={me.role !== 'member' ? <Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>פרויקט חדש</Btn> : null} />
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי שם, קוד, עיר או לקוח" id="proj-search" />
        <Select value={lead} onChange={(e: any) => setLead(e.target.value)} options={leads.map((id) => ({ value: id, label: userName(db, id) }))} placeholder="כל האחראים" aria-label="סינון לפי אחראי" />
        <Select value={sort} onChange={(e: any) => setSort(e.target.value)} options={[{ value: 'updated', label: 'מיון: עודכן לאחרונה' }, { value: 'due', label: 'מיון: תאריך יעד' }, { value: 'name', label: 'מיון: שם' }, { value: 'progress', label: 'מיון: התקדמות' }]} aria-label="מיון" />
        <div className="grow" />
        <Segmented value={view} onChange={setView} options={[{ value: 'grid', label: 'כרטיסים', icon: LuLayoutGrid }, { value: 'table', label: 'טבלה', icon: LuTable }]} />
      </div>
      <div style={{ marginBottom: 16 }}><Chips options={statusOpts} value={status} onChange={setStatus} /></div>

      {loading ? <div className="card"><Skeleton rows={5} /></div> : list.length === 0 ? (
        <div className="card"><Empty icon={LuFolderKanban} title="לא נמצאו פרויקטים" action={<Btn onClick={() => { setQ(''); setStatus('all'); setLead(''); }}>ניקוי סינון</Btn>}>אין פרויקטים שתואמים לסינון הנוכחי.</Empty></div>
      ) : view === 'grid' ? (
        <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
          {list.map((p) => {
            const team = db.assignments.filter((a) => a.projectId === p.id).map((a) => db.users.find((u) => u.id === a.userId)).filter(Boolean);
            const late = db.tasks.filter((t) => t.projectId === p.id && isOverdue(t)).length;
            const f = fin ? projectFinance(db, p.id) : null;
            return (
              <article key={p.id} className="card link" onClick={() => nav(`/projects/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/projects/${p.id}`)} aria-label={p.name}>
                <ProjectCover project={p} height={110} />
                <div className="card-body col g12">
                  <div className="row between g8 wrap"><StatusBadge s={p.status} />{late ? <span className="badge bad">{late} באיחור</span> : null}</div>
                  <div>
                    <div className="lg bold">{p.name}</div>
                    <div className="small muted row g4"><LuMapPin aria-hidden style={{ width: 13, height: 13 }} />{p.city} · {clientOf(db, p.clientId)?.name}</div>
                  </div>
                  <div><div className="meter-label xs"><span className="muted">{PHASES[p.phase]}</span><span className="num">{p.progress}%</span></div><Progress value={p.progress / 100} tone={p.status === 'הושלם' ? 'ok' : p.status === 'בהשהיה' ? '' : 'accent'} /></div>
                  <div className="row between g8">
                    <AvatarStack users={team} />
                    <span className="xs muted row g4"><LuCalendarClock aria-hidden style={{ width: 13, height: 13 }} />יעד {date(p.dueDate)}</span>
                  </div>
                  {f ? <div className="xs muted row between" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>ביצוע {ilsShort(f.actual)} / {ilsShort(f.planned)}</span><span>ש״ט {ilsShort(p.feeTotal)}</span></div> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <DataTable rows={list} onRow={(p: any) => nav(`/projects/${p.id}`)} pageSize={10} columns={[
            { key: 'code', label: 'קוד', render: (p: any) => <span className="code">{p.code}</span> },
            { key: 'name', label: 'פרויקט', render: (p: any) => <div className="col" style={{ gap: 0 }}><b>{p.name}</b><span className="xs muted">{p.type}</span></div> },
            { key: 'client', label: 'לקוח', sortValue: (p: any) => clientOf(db, p.clientId)?.name, render: (p: any) => clientOf(db, p.clientId)?.name },
            { key: 'status', label: 'סטטוס', sortValue: (p: any) => PROJECT_STATUSES.indexOf(p.status), render: (p: any) => <StatusBadge s={p.status} /> },
            { key: 'leadId', label: 'אחראי/ת', sortValue: (p: any) => userName(db, p.leadId), render: (p: any) => <PersonCell id={p.leadId} /> },
            { key: 'progress', label: 'התקדמות', render: (p: any) => <div className="row g8" style={{ minWidth: 110 }}><Progress value={p.progress / 100} /><span className="xs num">{p.progress}%</span></div> },
            { key: 'dueDate', label: 'יעד', render: (p: any) => <DeadlineChip date={p.dueDate} /> },
            ...(fin ? [{ key: 'execBudget', label: 'תקציב ביצוע', num: true, render: (p: any) => ils(p.execBudget) }, { key: 'feeTotal', label: 'שכר טרחה', num: true, render: (p: any) => ils(p.feeTotal) }] : []),
          ]} />
        </div>
      )}
      {creating ? <ProjectForm onClose={() => { setCreating(false); if (query.new) nav('/projects'); }} /> : null}
      {editing ? <ProjectForm project={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

export function ProjectForm({ project, onClose }: { project?: T.Project; onClose: () => void }) {
  const { db, run, toast, nav, live } = useStore();
  const isNew = !project;
  const [f, setF] = useState<any>(() => project ? { ...project } : {
    id: uid('p'), officeId: 'off_1', clientId: '', code: `LB-26-0${20 + db.projects.length}`, name: '', type: 'דירת מגורים – שיפוץ מלא', address: '', city: '', areaSqm: 100, status: 'ליד חדש', leadId: db.users.find((u) => u.role === 'owner')?.id,
    startDate: todayISO, dueDate: D(240), progress: 0, phase: 0, execBudget: 500000, feeTotal: 60000, feeType: 'סכום קבוע', description: '', tags: [], milestones: [], cover: 'apartment', updatedAt: todayISO,
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const staff = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status === 'פעיל');
  const save = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'יש להזין שם פרויקט';
    if (!f.clientId) e.clientId = 'יש לבחור לקוח';
    if (!f.city.trim()) e.city = 'יש להזין עיר';
    if (f.dueDate < f.startDate) e.dueDate = 'תאריך היעד חייב להיות אחרי תאריך ההתחלה';
    if (Number(f.execBudget) < 0) e.execBudget = 'סכום לא תקין';
    setErr(e);
    if (Object.keys(e).length) return;
    run(A.saveProject, { ...f, areaSqm: Number(f.areaSqm), execBudget: Number(f.execBudget), feeTotal: Number(f.feeTotal) }, isNew);
    toast(isNew ? `הפרויקט "${f.name}" נוצר` : 'פרטי הפרויקט נשמרו');
    onClose();
    if (isNew) nav(`/projects/${f.id}`);
  };
  return (
    <Modal title={isNew ? 'פרויקט חדש' : 'עריכת פרויקט'} onClose={onClose} size="wide" foot={<><Btn kind="primary" onClick={save}>{isNew ? 'יצירת פרויקט' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="שם הפרויקט *" error={err.name} htmlFor="pf-name"><Input id="pf-name" value={f.name} invalid={err.name} onChange={(e: any) => set('name', e.target.value)} placeholder="לדוגמה: דירת גן בהוד השרון" /></Field>
        <Field label="קוד פרויקט" htmlFor="pf-code"><Input id="pf-code" value={f.code} onChange={(e: any) => set('code', e.target.value)} className="ltr" /></Field>
        <Field label="לקוח *" error={err.clientId} htmlFor="pf-client"><Select id="pf-client" value={f.clientId} invalid={err.clientId} onChange={(e: any) => set('clientId', e.target.value)} placeholder="בחירת לקוח" options={db.clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="אחראי/ת פרויקט" htmlFor="pf-lead"><Select id="pf-lead" value={f.leadId} onChange={(e: any) => set('leadId', e.target.value)} options={staff.map((u) => ({ value: u.id, label: u.name }))} /></Field>
        <Field label="סוג פרויקט" htmlFor="pf-type"><Select id="pf-type" value={f.type} onChange={(e: any) => set('type', e.target.value)} options={['דירת מגורים – שיפוץ מלא', 'דירת מגורים – שיפוץ', 'בית פרטי – בנייה חדשה (פנים)', 'בית פרטי – עיצוב פנים מלא', 'מסחר – עיצוב בית קפה', 'משרדים – התאמת קומה', 'אירוח – מבנה לשימור', 'שיפוץ חלקי']} /></Field>
        <Field label="סטטוס" hint={isNew ? undefined : 'שינוי סטטוס נעשה מכרטיס הפרויקט עם אישור'} htmlFor="pf-status"><Select id="pf-status" value={f.status} disabled={!isNew} onChange={(e: any) => set('status', e.target.value)} options={[...PROJECT_STATUSES]} /></Field>
        <Field label="כתובת" htmlFor="pf-addr"><Input id="pf-addr" value={f.address} onChange={(e: any) => set('address', e.target.value)} /></Field>
        <Field label="עיר *" error={err.city} htmlFor="pf-city"><Input id="pf-city" value={f.city} invalid={err.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
        <Field label="שטח (מ״ר)" htmlFor="pf-area"><Input id="pf-area" type="number" min={0} value={f.areaSqm} onChange={(e: any) => set('areaSqm', e.target.value)} /></Field>
        <Field label="שלב נוכחי" htmlFor="pf-phase"><Select id="pf-phase" value={f.phase} onChange={(e: any) => set('phase', Number(e.target.value))} options={PHASES.map((p, i) => ({ value: i, label: p }))} /></Field>
        <Field label="תאריך התחלה" htmlFor="pf-start"><Input id="pf-start" type="date" value={f.startDate} onChange={(e: any) => set('startDate', e.target.value)} /></Field>
        <Field label="תאריך יעד" error={err.dueDate} htmlFor="pf-due"><Input id="pf-due" type="date" value={f.dueDate} invalid={err.dueDate} onChange={(e: any) => set('dueDate', e.target.value)} /></Field>
        <Field label="תקציב ביצוע (₪, לפני מע״מ)" hint="כספי הלקוח לקבלנים, ספקים ורכש" error={err.execBudget} htmlFor="pf-exec"><Input id="pf-exec" type="number" min={0} value={f.execBudget} onChange={(e: any) => set('execBudget', e.target.value)} /></Field>
        <Field label="שכר טרחה (₪, לפני מע״מ)" hint="התשלום למשרד" htmlFor="pf-fee"><Input id="pf-fee" type="number" min={0} value={f.feeTotal} onChange={(e: any) => set('feeTotal', e.target.value)} /></Field>
        <Field label="תיאור" full htmlFor="pf-desc"><Textarea id="pf-desc" value={f.description} onChange={(e: any) => set('description', e.target.value)} rows={3} /></Field>
      </div>
      {isNew ? <div className="mt16"><Callout kind="info">לאחר היצירה אפשר להחיל תבנית עבודה (למשל "פתיחת פרויקט מגורים") מלשונית המשימות.</Callout></div> : null}
    </Modal>
  );
}
