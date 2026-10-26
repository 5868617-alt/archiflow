import { useState, useEffect, useRef } from 'react';
import { LuUpload, LuMousePointer2, LuMove, LuMessageSquare, LuTriangleAlert, LuRuler, LuZoomIn, LuZoomOut, LuMaximize, LuGitCompare, LuHistory, LuInfo, LuSparkles, LuShare2, LuSend, LuListChecks, LuTrash2, LuCheck, LuEye, LuEyeOff, LuLayoutGrid, LuTable, LuFileWarning, LuRefreshCw, LuPlus } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, userName, A, uid, byId, hasFeature } from '../data/api';
import type * as T from '../data/types';
import { todayISO, nowStamp } from '../data/dates';
import { CameraButton, PageHead, Btn, Select, SearchBox, Chips, StatusBadge, Badge, Card, KV, Tabs, Modal, Field, Input, Textarea, Empty, Callout, FutureTag, DemoTag, Segmented, DataTable, Switch, cx, Confirm, Stat } from '../ui/core';
import { PlanSvg, NoPreview } from '../ui/PlanSvg';
import { FileIcon } from '../ui/charts';
import { ProjectLink, PersonCell, LockedFeature } from './shared';
import { SendForApproval } from './Approvals';
import { date, ago } from '../lib/format';
import { PLAN_FILES } from '../live/map';
import { friendlyError } from '../live/errors';
import { useOpenFile } from '../live/hooks';

const CATEGORIES = ['תכנית קומה', 'תכנית העמדה', 'תכנית חשמל', 'תכנית תקרה', 'חתך', 'חזית / פריסה', 'פרט', 'מדידה', 'הדמיה'];
const PLAN_STATUSES: T.PlanStatus[] = ['טיוטה', 'בבדיקה פנימית', 'נשלח ללקוח', 'מאושר', 'נדרשים תיקונים', 'הוחלף'];
const RENDERABLE = (ft: string) => ft === 'PDF' || ft === 'JPG' || ft === 'PNG';
export const latest = (p: T.Plan) => p.versions[p.versions.length - 1];
const M_PER_UNIT: Record<string, number> = { apartment: 0.016, 'apartment-elec': 0.016, 'apartment-ceiling': 0.016, existing: 0.016, 'villa-ground': 0.025, 'villa-first': 0.025, cafe: 0.016, office: 0.04, 'office-partitions': 0.04, 'kitchen-detail': 0.01, bath: 0.005, section: 0.0116, elevation: 0.01, 'bar-detail': 0.00167 };
const CHANGES: Record<string, Record<number, { x: number; y: number; w: number; h: number; note: string }[]>> = {
  pl_cohen_floor: { 2: [{ x: 540, y: 60, w: 90, h: 280, note: 'הזזת קיר הסוויטה 40 ס״מ' }, { x: 360, y: 120, w: 150, h: 120, note: 'שולחן אוכל ל-8' }], 3: [{ x: 130, y: 160, w: 220, h: 100, note: 'אי 2.80 מ׳' }], 4: [{ x: 730, y: 400, w: 70, h: 90, note: 'היפוך פתיחת דלת' }] },
  pl_fried_layout: { 2: [{ x: 40, y: 60, w: 440, h: 200, note: 'הגדלת חדר ישיבות ראשי' }] },
  pl_cohen_kitchen: { 2: [{ x: 390, y: 340, w: 120, h: 170, note: 'עדכון מגירות' }] },
};

export function planMeta(db: any, p: T.Plan, v?: T.PlanVersion) {
  const ver = v || latest(p);
  return { project: projectOf(db, p.projectId)?.name, number: p.number, v: ver.v, scale: p.scale };
}

export function PlanThumb({ plan, rev }: { plan: T.Plan; rev?: number }) {
  const { db, live } = useStore();
  const v = rev ? plan.versions.find((x) => x.v === rev)! : latest(plan);
  const show = RENDERABLE(v.fileType) && v.processing === 'מוכן';
  return <div className="plan-thumb">{show ? <PlanSvg layout={plan.layout} rev={v.v} meta={planMeta(db, plan, v)} /> : v.processing === 'בעיבוד' ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><span className="row g8 small muted"><span className="spinner" />בעיבוד…</span></div> : <NoPreview fileType={v.fileType} processing={v.processing} />}</div>;
}

export function PlansLibrary({ query }: any) {
  const { db, me, nav, live } = useStore();
  const pids = visibleProjectIds(db, me);
  const all = db.plans.filter((p) => pids.has(p.projectId));
  const [project, setProject] = useState(query.project || '');
  const [cat, setCat] = useState('');
  const [ft, setFt] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState('grid');
  const [upload, setUpload] = useState(!!query.upload);
  useEffect(() => { if (query.upload) setUpload(true); }, [query.upload]);
  let list = all;
  if (project) list = list.filter((p) => p.projectId === project);
  if (cat) list = list.filter((p) => p.category === cat);
  if (ft) list = list.filter((p) => latest(p).fileType === ft);
  if (status) list = list.filter((p) => latest(p).status === status);
  if (q.trim()) list = list.filter((p) => p.title.includes(q) || p.number.toLowerCase().includes(q.toLowerCase()));
  const openIssues = db.annotations.filter((a) => a.kind === 'issue' && a.status === 'פתוח' && all.some((p) => p.id === a.planId));
  return (
    <div>
      <PageHead title="שרטוטים ותכניות" sub="ספריית שרטוטים עם גרסאות, הערות, ממצאים ואישורי לקוח." actions={<Btn kind="primary" icon={LuUpload} onClick={() => setUpload(true)}>העלאת שרטוט</Btn>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="שרטוטים" value={all.length} meta={`${all.reduce((s, p) => s + p.versions.length, 0)} גרסאות`} />
        <Stat label="ממתינים ללקוח" value={all.filter((p) => latest(p).status === 'נשלח ללקוח').length} tone="warn" onClick={() => setStatus('נשלח ללקוח')} />
        <Stat label="ממצאים פתוחים" value={openIssues.length} meta={`${openIssues.filter((a) => a.severity === 'גבוהה').length} בחומרה גבוהה`} tone={openIssues.some((a) => a.severity === 'גבוהה') ? 'alert' : ''} />
        <Stat label="בעיבוד / ללא תצוגה" value={all.filter((p) => latest(p).processing !== 'מוכן').length} meta="DWG/DXF נשמרים ללא תצוגה" />
      </div>
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי מספר או שם" id="pl-search" />
        <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
        <Select value={cat} onChange={(e: any) => setCat(e.target.value)} placeholder="כל הסוגים" options={CATEGORIES} aria-label="סוג" />
        <Select value={ft} onChange={(e: any) => setFt(e.target.value)} placeholder="כל הפורמטים" options={['PDF', 'DWG', 'DXF', 'JPG', 'PNG']} aria-label="פורמט" />
        <Select value={status} onChange={(e: any) => setStatus(e.target.value)} placeholder="כל הסטטוסים" options={PLAN_STATUSES} aria-label="סטטוס" />
        <div className="grow" />
        <Segmented value={view} onChange={setView} options={[{ value: 'grid', label: 'תצוגה', icon: LuLayoutGrid }, { value: 'table', label: 'טבלה', icon: LuTable }]} />
      </div>
      <PlanCollection plans={list} view={view} />
      {upload ? <UploadPlan defaultProject={project} onClose={() => { setUpload(false); if (query.upload) nav('/plans'); }} /> : null}
    </div>
  );
}

function PlanCollection({ plans, view, hideProject }: any) {
  const { db, nav, live } = useStore();
  if (!plans.length) return <div className="card"><Empty heading="h1" title="אין שרטוטים בסינון הזה">העלו שרטוט ראשון או נקו את הסינון.</Empty></div>;
  if (view === 'table') {
    return (
      <div className="card">
        <DataTable rows={plans} onRow={(p: any) => nav(`/plans/${p.id}`)} pageSize={15} columns={[
          { key: 'number', label: 'מס׳', render: (p: T.Plan) => <span className="code">{p.number}</span> },
          { key: 'title', label: 'שם', render: (p: T.Plan) => <b>{p.title}</b> },
          ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', render: (p: T.Plan) => <ProjectLink id={p.projectId} /> }]),
          { key: 'category', label: 'סוג' },
          { key: 'v', label: 'גרסה', sortValue: (p: T.Plan) => latest(p).v, render: (p: T.Plan) => <span className="num">v{latest(p).v}</span> },
          { key: 'ft', label: 'קובץ', sortValue: (p: T.Plan) => latest(p).fileType, render: (p: T.Plan) => <span className="row g8"><span className="code">{latest(p).fileType}</span>{latest(p).processing !== 'מוכן' ? <StatusBadge s={latest(p).processing} /> : null}</span> },
          { key: 'status', label: 'סטטוס', sortValue: (p: T.Plan) => latest(p).status, render: (p: T.Plan) => <StatusBadge s={latest(p).status} /> },
          { key: 'issues', label: 'ממצאים', sortValue: (p: T.Plan) => db.annotations.filter((a) => a.planId === p.id && a.kind === 'issue' && a.status === 'פתוח').length, render: (p: T.Plan) => { const n = db.annotations.filter((a) => a.planId === p.id && a.kind === 'issue' && a.status === 'פתוח').length; return n ? <Badge tone="bad">{n}</Badge> : <span className="muted">—</span>; } },
          { key: 'date', label: 'עודכן', sortValue: (p: T.Plan) => latest(p).date, render: (p: T.Plan) => <span className="small">{date(latest(p).date)}</span> },
        ]} />
      </div>
    );
  }
  return (
    <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {plans.map((p: T.Plan) => {
        const v = latest(p);
        const issues = db.annotations.filter((a) => a.planId === p.id && a.kind === 'issue' && a.status === 'פתוח').length;
        return (
          <article key={p.id} className="card link" onClick={() => nav(`/plans/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && nav(`/plans/${p.id}`)} aria-label={`${p.number} ${p.title}`}>
            <div style={{ position: 'relative' }}>
              <PlanThumb plan={p} />
              <div className="pt-badges" style={{ position: 'absolute', top: 8, insetInlineStart: 8, display: 'flex', gap: 4 }}><span className="code" style={{ background: 'var(--surface)' }}>{p.number}</span>{p.sharedWithClient ? <Badge tone="info">משותף</Badge> : null}</div>
            </div>
            <div className="card-body col g8">
              <div className="bold">{p.title}</div>
              {!hideProject ? <div className="xs muted">{projectOf(db, p.projectId)?.name}</div> : null}
              <div className="row between g8 wrap"><StatusBadge s={v.status} /><span className="row g4"><FileIcon type={v.fileType} /><span className="xs muted num">v{v.v} · {p.scale}</span></span></div>
              <div className="row between xs muted"><span>{p.category}</span>{issues ? <span className="bad-t bold">{issues} ממצאים פתוחים</span> : <span>{ago(v.date)}</span>}</div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function PlanGrid({ projectId }: { projectId: string }) {
  const { db, live } = useStore();
  const [view, setView] = useState('grid');
  const [upload, setUpload] = useState(false);
  const plans = db.plans.filter((p) => p.projectId === projectId);
  return (
    <div>
      <div className="filters"><span className="small muted">{plans.length} שרטוטים · {plans.filter((p) => p.sharedWithClient).length} משותפים עם הלקוח</span><div className="grow" /><Segmented value={view} onChange={setView} options={[{ value: 'grid', label: 'תצוגה', icon: LuLayoutGrid }, { value: 'table', label: 'טבלה', icon: LuTable }]} /><Btn kind="primary" icon={LuUpload} onClick={() => setUpload(true)}>העלאה</Btn></div>
      <PlanCollection plans={plans} view={view} hideProject />
      {upload ? <UploadPlan defaultProject={projectId} onClose={() => setUpload(false)} /> : null}
    </div>
  );
}

export function UploadPlan({ defaultProject, planId, onClose }: { defaultProject?: string; planId?: string; onClose: () => void }) {
  const { db, me, run, toast, nav, live } = useStore();
  const realFile = useRef<File | null>(null);
  const existing = planId ? byId(db.plans, planId) : undefined;
  const [mode, setMode] = useState(existing ? 'version' : 'new');
  const [pid, setPid] = useState(existing?.projectId || defaultProject || '');
  const [target, setTarget] = useState(planId || '');
  const [f, setF] = useState({ number: '', title: '', category: 'תכנית קומה', scale: '1:50', note: '' });
  const [file, setFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<any>({});
  const [over, setOver] = useState(false);
  const inputRef = useRef<any>(null);
  const ext = file?.name.split('.').pop()?.toUpperCase() || '';
  const takeFile = (fl: File | undefined) => {
    if (!fl) return;
    const e = fl.name.split('.').pop()?.toUpperCase() || '';
    if (!['PDF', 'DWG', 'DXF', 'JPG', 'JPEG', 'PNG'].includes(e)) { setErr({ file: `פורמט ${e} לא נתמך. ניתן להעלות PDF, JPG, PNG, DWG או DXF.` }); return; }
    if (fl.size > 250 * 1024 * 1024) { setErr({ file: live ? 'הקובץ גדול מ-250MB.' : 'הקובץ גדול מ-250MB (מגבלת דמו).' }); return; }
    realFile.current = fl;
    setErr({}); setFile({ name: fl.name, size: fl.size, type: e === 'JPEG' ? 'JPG' : e });
    if (!f.title) setF((x) => ({ ...x, title: fl.name.replace(/\.[^.]+$/, '') }));
  };
  const submit = () => {
    const e: any = {};
    if (!pid) e.pid = 'יש לבחור פרויקט';
    if (!file) e.file = 'יש לבחור קובץ';
    if (mode === 'new' && !f.number.trim()) e.number = 'יש להזין מספר גיליון';
    if (mode === 'new' && !f.title.trim()) e.title = 'יש להזין שם';
    if (mode === 'version' && !target) e.target = 'יש לבחור שרטוט קיים';
    setErr(e); if (Object.keys(e).length) return;
    if (live) { liveSubmit(); return; }
    setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 20; setProgress(p);
      if (p >= 100) {
        clearInterval(iv);
        const ft = file!.type as T.PlanVersion['fileType'];
        const processing: T.PlanVersion['processing'] = RENDERABLE(ft) ? 'בעיבוד' : 'תצוגה לא נתמכת';
        let id = target;
        let vnum = 1;
        if (mode === 'new') {
          id = uid('pl');
          const proj = projectOf(db, pid)!;
          const layout: T.PlanLayout = f.category === 'פרט' ? 'kitchen-detail' : f.category === 'חתך' ? 'section' : f.category === 'חזית / פריסה' ? 'elevation' : proj.cover === 'office' ? 'office' : proj.cover === 'cafe' ? 'cafe' : proj.cover === 'villa' ? 'villa-ground' : 'existing';
          run(A.createPlan, { id, projectId: pid, number: f.number.trim(), title: f.title.trim(), category: f.category, scale: f.scale, layout, sharedWithClient: false, tags: [], versions: [{ v: 1, date: todayISO, authorId: me.id, note: f.note || 'העלאה ראשונה', fileType: ft, sizeMb: Math.max(0.1, Math.round((file!.size / 1048576) * 10) / 10), processing, status: 'טיוטה' }] });
        } else {
          const pl = byId(db.plans, target)!; vnum = latest(pl).v + 1;
          run(A.addPlanVersion, target, { v: vnum, date: todayISO, authorId: me.id, note: f.note || 'גרסה מעודכנת', fileType: ft, sizeMb: Math.max(0.1, Math.round((file!.size / 1048576) * 10) / 10), processing, status: 'טיוטה' });
        }
        if (processing === 'בעיבוד') setTimeout(() => { run(A.finishProcessing, id, vnum); toast('עיבוד הקובץ הסתיים – התצוגה זמינה (סימולציה)', 'info'); }, 3500);
        toast(processing === 'בעיבוד' ? 'הקובץ נקלט ונמצא בעיבוד (סימולציה)' : `${ft} נשמר. תצוגה מקדימה לא זמינה לפורמט הזה בדמו.`, processing === 'בעיבוד' ? 'ok' : 'info');
        onClose(); nav(`/plans/${id}`);
      }
    }, 220);
  };
  const liveSubmit = async () => {
    const fl = realFile.current; if (!fl) { setErr({ file: 'יש לבחור קובץ' }); return; }
    setProgress(15);
    try {
      const { path, size } = await live!.upload('plans', pid, fl);
      setProgress(90);
      const ft = file!.type as T.PlanVersion['fileType'];
      const processing: T.PlanVersion['processing'] = RENDERABLE(ft) ? 'מוכן' : 'תצוגה לא נתמכת';
      const ver: any = { v: 1, date: todayISO, authorId: me.id, note: f.note || 'העלאה ראשונה', fileType: ft, sizeMb: Math.max(0.1, Math.round((size / 1048576) * 10) / 10), processing, status: 'טיוטה', _path: path, _size: size };
      let id = target;
      if (mode === 'new') {
        id = uid('pl');
        run(A.createPlan, { id, projectId: pid, number: f.number.trim(), title: f.title.trim(), category: f.category, scale: f.scale, layout: ('live:' + id) as any, sharedWithClient: false, tags: [], versions: [ver] });
      } else {
        const pl = byId(db.plans, target)!; ver.v = latest(pl).v + 1; ver.note = f.note || 'גרסה מעודכנת';
        run(A.addPlanVersion, target, ver);
      }
      (PLAN_FILES[id] ||= {})[ver.v] = { path, fileType: ft };
      toast(processing === 'מוכן' ? 'השרטוט הועלה ונשמר' : `${ft} נשמר עם היסטוריית גרסאות. לקובץ הזה אין תצוגה בדפדפן – מומלץ להעלות גם ייצוא PDF.`, processing === 'מוכן' ? 'ok' : 'info');
      onClose(); nav(`/plans/${id}`);
    } catch (x: any) { setProgress(null); setErr({ file: friendlyError(x) }); }
  };
  const projectPlans = db.plans.filter((p) => p.projectId === pid);
  return (
    <Modal title={existing ? `גרסה חדשה ל-${existing.number}` : 'העלאת שרטוט'} onClose={onClose} foot={progress === null ? <><Btn kind="primary" icon={LuUpload} onClick={submit}>העלאה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></> : null}>
      {progress !== null ? (
        <div className="stack t-center" style={{ padding: 20 }}>
          <div className="bold">מעלה את {file?.name}…</div>
          <div className="prog lg"><i style={{ width: progress + '%' }} /></div>
          <div className="small muted">{progress}%{live ? ' · שומר באחסון המאובטח של המשרד' : ' · הדמיה – הקובץ לא נשמר בשרת'}</div>
        </div>
      ) : (
        <div className="stack">
          {!existing ? <Segmented value={mode} onChange={setMode} options={[{ value: 'new', label: 'שרטוט חדש' }, { value: 'version', label: 'גרסה חדשה לשרטוט קיים' }]} /> : null}
          <Field label="פרויקט *" error={err.pid} htmlFor="up-p"><Select id="up-p" value={pid} disabled={!!existing} invalid={err.pid} onChange={(e: any) => { setPid(e.target.value); setTarget(''); }} placeholder="בחירת פרויקט" options={visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))} /></Field>
          {mode === 'version' && !existing ? <Field label="שרטוט *" error={err.target} htmlFor="up-t"><Select id="up-t" value={target} invalid={err.target} onChange={(e: any) => setTarget(e.target.value)} placeholder={pid ? 'בחירה' : 'בחרו פרויקט קודם'} options={projectPlans.map((p) => ({ value: p.id, label: `${p.number} ${p.title} (v${latest(p).v})` }))} /></Field> : null}
          {mode === 'new' ? (
            <div className="form-grid">
              <Field label="מספר גיליון *" error={err.number} htmlFor="up-n"><Input id="up-n" className="ltr" value={f.number} invalid={err.number} onChange={(e: any) => setF({ ...f, number: e.target.value })} placeholder="A-102" /></Field>
              <Field label="קנה מידה" htmlFor="up-s"><Select id="up-s" value={f.scale} onChange={(e: any) => setF({ ...f, scale: e.target.value })} options={['1:10', '1:20', '1:25', '1:50', '1:100', '1:200', '—']} /></Field>
              <Field label="שם *" full error={err.title} htmlFor="up-ti"><Input id="up-ti" value={f.title} invalid={err.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="סוג" full htmlFor="up-c"><Select id="up-c" value={f.category} onChange={(e: any) => setF({ ...f, category: e.target.value })} options={CATEGORIES} /></Field>
            </div>
          ) : null}
          <Field label="הערת גרסה" htmlFor="up-note"><Input id="up-note" value={f.note} onChange={(e: any) => setF({ ...f, note: e.target.value })} placeholder="מה השתנה?" /></Field>
          <div className={cx('dropzone', over && 'over')} role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); takeFile(e.dataTransfer.files[0]); }}>
            <LuUpload aria-hidden />
            {file ? <><b>{file.name}</b><span className="small muted">{(file.size / 1048576).toFixed(2)}MB · {file.type}</span></> : <><b>גררו קובץ לכאן או לחצו לבחירה</b><span className="small muted">PDF, JPG, PNG, DWG, DXF · עד 250MB</span></>}
            <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf" hidden onChange={(e) => takeFile(e.target.files?.[0])} />
          </div>
          <CameraButton onFile={(fl) => takeFile(fl)} label="צילום סקיצה או שרטוט" />
          {err.file ? <Callout kind="bad">{err.file}</Callout> : null}
          {live ? null : <div className="row g8 wrap"><span className="small muted">אין קובץ בהישג יד?</span><button type="button" className="linkish small" onClick={() => { setFile({ name: 'A-110_kitchen_rev.pdf', size: 2.4 * 1048576, type: 'PDF' }); setErr({}); if (!f.title) setF((x) => ({ ...x, title: 'מטבח – עדכון' })); }}>קובץ PDF לדוגמה</button><button type="button" className="linkish small" onClick={() => { setFile({ name: 'survey_existing.dwg', size: 1.1 * 1048576, type: 'DWG' }); setErr({}); if (!f.title) setF((x) => ({ ...x, title: 'מדידת מצב קיים' })); }}>קובץ DWG לדוגמה</button></div>}
          {file && !RENDERABLE(file.type) ? <Callout kind="assume" title="DWG / DXF">הקובץ יישמר עם היסטוריית גרסאות ומטא-דאטה, אך {live ? 'אין עדיין המרה לתצוגה בדפדפן' : 'בדמו אין המרה לתצוגה'}. מומלץ להעלות גם ייצוא PDF.</Callout> : null}
          <span className="xs muted">{live ? 'הקובץ נשמר באחסון פרטי של המשרד. רק מי שמורשה לפרויקט יכול לפתוח אותו.' : 'הקובץ לא עוזב את הדפדפן – בדמו נשמרים רק שם, גודל ופורמט.'}</span>
        </div>
      )}
    </Modal>
  );
}

type Tool = 'select' | 'pan' | 'comment' | 'issue' | 'measure';
export function PlanViewer({ id, query }: { id: string; query: any }) {
  const { db, me, run, toast, nav, live } = useStore();
  const openFile = useOpenFile();
  const [calib, setCalib] = useState<number | null>(null);
  const plan = byId(db.plans, id);
  const [ver, setVer] = useState<number>(() => (plan ? latest(plan).v : 1));
  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<any>(null);
  const [panel, setPanel] = useState(query.tab || 'findings');
  const [sel, setSel] = useState<string | null>(null);
  const [pending, setPending] = useState<any>(null);
  const [mStart, setMStart] = useState<any>(null);
  const [cursor, setCursor] = useState<any>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [upload, setUpload] = useState(false);
  const [sendAp, setSendAp] = useState(false);
  const svgRef = useRef<any>(null);
  useEffect(() => { if (plan) setVer(latest(plan).v); }, [plan?.versions.length]);
  if (!plan || !visibleProjectIds(db, me).has(plan.projectId)) return <Empty heading="h1" title="השרטוט לא נמצא או שאין גישה" action={<Btn onClick={() => nav('/plans')}>לספרייה</Btn>} />;
  const v = plan.versions.find((x) => x.v === ver) || latest(plan);
  const isLatest = v.v === latest(plan).v;
  const renderable = RENDERABLE(v.fileType) && v.processing === 'מוכן';
  const anns = db.annotations.filter((a) => a.planId === id && a.version === v.v && (showResolved || a.status === 'פתוח'));
  const allAnns = db.annotations.filter((a) => a.planId === id);
  const calTag = live ? plan.tags.find((t) => t.startsWith(`cal:${v.v}:`)) : undefined;
  const mpu = live ? (calTag ? Number(calTag.split(':')[2]) : 0) : M_PER_UNIT[plan.layout] || 0.016;
  const pt = (e: any) => { const r = svgRef.current.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 720 }; };
  const onSvgClick = (e: any) => {
    if (!renderable) return;
    if (tool === 'comment' || tool === 'issue') { const p = pt(e); setPending({ kind: tool, x: p.x / 1000, y: p.y / 720 }); }
    if (tool === 'measure') {
      const p = pt(e);
      if (!mStart) setMStart(p);
      else if (live && !mpu) { setCalib(Math.hypot(p.x - mStart.x, p.y - mStart.y)); setMStart(null); }
      else { const dist = Math.hypot(p.x - mStart.x, p.y - mStart.y) * mpu; setPending({ kind: 'measure', x: mStart.x / 1000, y: mStart.y / 720, x2: p.x / 1000, y2: p.y / 720, text: `${dist.toFixed(2)} מ׳ (מידה מהשרטוט)` }); setMStart(null); }
    }
  };
  const tools: { id: Tool; label: string; icon: any }[] = [{ id: 'select', label: 'בחירה', icon: LuMousePointer2 }, { id: 'pan', label: 'הזזה', icon: LuMove }, { id: 'comment', label: 'הערה', icon: LuMessageSquare }, { id: 'issue', label: 'ממצא', icon: LuTriangleAlert }, { id: 'measure', label: 'מדידה', icon: LuRuler }];
  const num = (a: T.Annotation) => allAnns.filter((x) => x.kind !== 'measure').indexOf(a) + 1;
  return (
    <div>
      <PageHead crumbs={[{ label: 'שרטוטים', to: '/plans' }, { label: projectOf(db, plan.projectId)?.name, to: `/projects/${plan.projectId}/plans` }, { label: plan.number }]} title={`${plan.number} · ${plan.title}`} badge={<StatusBadge s={v.status} />}
        actions={<>
          <Select className="sm" style={{ width: 'auto' }} value={ver} onChange={(e: any) => { setVer(Number(e.target.value)); setSel(null); }} aria-label="גרסה" options={[...plan.versions].reverse().map((x) => ({ value: x.v, label: `גרסה ${x.v}${x.v === latest(plan).v ? ' (אחרונה)' : ''} · ${date(x.date)}` }))} />
          <Btn icon={LuGitCompare} onClick={() => nav(`/plans/${id}/compare`)} disabled={plan.versions.length < 2} title={plan.versions.length < 2 ? 'נדרשות לפחות 2 גרסאות' : undefined}>השוואת גרסאות</Btn>
          <Btn icon={LuUpload} onClick={() => setUpload(true)}>גרסה חדשה</Btn>
          <Btn kind="primary" icon={LuSend} onClick={() => setSendAp(true)}>לאישור לקוח</Btn>
        </>} />
      {!isLatest ? <div style={{ marginBottom: 12 }}><Callout kind="assume">מוצגת גרסה {v.v} שהוחלפה. הערות חדשות יתווספו לגרסה זו. <button type="button" className="linkish" onClick={() => setVer(latest(plan).v)}>מעבר לגרסה האחרונה</button></Callout></div> : null}
      <div className="pv">
        <div className="pv-stage">
          <div className="pv-toolbar" role="toolbar" aria-label="כלי שרטוט">
            {tools.map((t) => <button key={t.id} type="button" className={cx('tool', tool === t.id && 'on')} onClick={() => { setTool(t.id); setMStart(null); }} aria-pressed={tool === t.id} title={t.label} aria-label={t.label} disabled={!renderable && t.id !== 'select'}><t.icon aria-hidden /><span className="hide-sm">{t.label}</span></button>)}
            <span className="tool-sep" />
            <button type="button" className="tool" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} aria-label="הגדלה"><LuZoomIn aria-hidden /></button>
            <span className="small num" style={{ minWidth: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" className="tool" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="הקטנה"><LuZoomOut aria-hidden /></button>
            <button type="button" className="tool" onClick={() => { setZoom(1); setOff({ x: 0, y: 0 }); }} aria-label="התאמה למסך"><LuMaximize aria-hidden /></button>
            <span className="tool-sep" />
            <button type="button" className={cx('tool', showResolved && 'on')} onClick={() => setShowResolved((s) => !s)} aria-pressed={showResolved} aria-label="הצגת הערות שטופלו" title="הצגת הערות שטופלו">{showResolved ? <LuEye aria-hidden /> : <LuEyeOff aria-hidden />}<span className="hide-sm">שטופלו</span></button>
          </div>
          <div className={cx('pv-canvas', tool === 'pan' ? 'mode-pan' : ['comment', 'issue', 'measure'].includes(tool) ? 'mode-add' : '', drag && 'dragging')}
            onMouseDown={(e) => { if (tool === 'pan') setDrag({ x: e.clientX - off.x, y: e.clientY - off.y }); }}
            onMouseMove={(e) => { if (drag) setOff({ x: e.clientX - drag.x, y: e.clientY - drag.y }); }}
            onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}
            onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(4, Math.max(0.5, z - e.deltaY * 0.002))); } }}>
            {v.processing === 'בעיבוד' ? <div className="processing-overlay"><div className="col t-center g8"><span className="spinner" style={{ margin: '0 auto' }} /><b>הקובץ בעיבוד</b><span className="small muted">יצירת תצוגה מקדימה (סימולציה, כמה שניות)</span><Btn size="sm" icon={LuRefreshCw} onClick={() => { run(A.finishProcessing, id, v.v); toast('העיבוד הושלם (סימולציה)', 'info'); }}>סיום עיבוד עכשיו</Btn></div></div> : null}
            <div className={cx('pv-inner', drag && 'dragging')} style={{ transform: `translate(${off.x}px, ${off.y}px) scale(${zoom})` }}>
              {renderable || v.processing === 'בעיבוד' ? (
                <PlanSvg layout={plan.layout} rev={v.v} meta={planMeta(db, plan, v)} svgRef={svgRef} onClick={onSvgClick} onMouseMove={(e: any) => { if (svgRef.current) setCursor(pt(e)); }}>
                  {anns.map((a) => a.kind === 'measure' ? (
                    <g key={a.id} className={cx('pin', sel === a.id && 'sel')} onClick={(e) => { e.stopPropagation(); setSel(a.id); setPanel('findings'); }}>
                      <line x1={a.x * 1000} y1={a.y * 720} x2={(a.x2 || a.x) * 1000} y2={(a.y2 || a.y) * 720} stroke="var(--accent-hover)" strokeWidth={3} />
                      {[[a.x, a.y], [a.x2 || a.x, a.y2 || a.y]].map(([x, y], i) => <circle key={i} cx={x * 1000} cy={y * 720} r={5} fill="var(--accent)" stroke="var(--plan-ink)" />)}
                      <rect x={((a.x + (a.x2 || a.x)) / 2) * 1000 - 70} y={((a.y + (a.y2 || a.y)) / 2) * 720 - 26} width={140} height={20} rx={3} fill="var(--accent)" />
                      <text x={((a.x + (a.x2 || a.x)) / 2) * 1000} y={((a.y + (a.y2 || a.y)) / 2) * 720 - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--accent-ink)">{a.text.split(' (')[0]}</text>
                    </g>
                  ) : (
                    <g key={a.id} className={cx('pin', sel === a.id && 'sel')} onClick={(e) => { e.stopPropagation(); setSel(a.id); setPanel('findings'); }}>
                      <circle className="halo" cx={a.x * 1000} cy={a.y * 720} r={26} fill={a.kind === 'issue' ? 'var(--bad)' : 'var(--info)'} />
                      <circle cx={a.x * 1000} cy={a.y * 720} r={14} fill={a.status === 'טופל' ? 'var(--ok)' : a.kind === 'issue' ? 'var(--bad)' : 'var(--info)'} stroke="#fff" strokeWidth={2.5} opacity={a.status === 'טופל' ? 0.6 : 1} />
                      <text x={a.x * 1000} y={a.y * 720 + 4.5} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{a.simulated ? '✦' : num(a)}</text>
                    </g>
                  ))}
                  {mStart ? <g><circle cx={mStart.x} cy={mStart.y} r={5} fill="var(--accent)" />{cursor ? <><line x1={mStart.x} y1={mStart.y} x2={cursor.x} y2={cursor.y} stroke="var(--accent-hover)" strokeWidth={2} strokeDasharray="6 4" /><text x={cursor.x + 10} y={cursor.y - 10} fontSize={12} fontWeight={600} fill="var(--accent-hover)">{(Math.hypot(cursor.x - mStart.x, cursor.y - mStart.y) * mpu).toFixed(2)} מ׳</text></> : null}</g> : null}
                </PlanSvg>
              ) : (
                <div className="stack">
                  <NoPreview fileType={v.fileType} processing={v.processing} />
                  <Callout kind={v.processing === 'נכשל' ? 'bad' : 'assume'} icon={LuFileWarning} title={v.processing === 'נכשל' ? 'עיבוד הקובץ נכשל' : `אין תצוגה מקדימה ל-${v.fileType}`}>
                    {v.processing === 'נכשל' ? 'אין המרת DXF/DWG. מומלץ לייצא PDF מתוכנת השרטוט ולהעלות כגרסה חדשה.' : 'הקובץ שמור עם היסטוריית גרסאות ומטא-דאטה. רינדור DWG/DXF בדפדפן הוא יכולת עתידית שתדרוש המרה בצד השרת.'}
                    <div className="mt8 row g8 wrap"><Btn size="sm" icon={LuUpload} onClick={() => setUpload(true)}>העלאת ייצוא PDF</Btn>{live ? <Btn size="sm" onClick={() => openFile('plans', (v as any)._path, `${plan.number}_v${v.v}.${v.fileType.toLowerCase()}`)}>הורדת הקובץ</Btn> : null}</div>
                  </Callout>
                </div>
              )}
            </div>
          </div>
          <div className="pv-status">
            <span>{tool === 'comment' ? 'לחצו על השרטוט כדי להוסיף הערה' : tool === 'issue' ? 'לחצו על השרטוט כדי לסמן ממצא' : tool === 'measure' ? (mStart ? 'לחצו על נקודת הסיום' : 'לחצו על נקודת ההתחלה') : tool === 'pan' ? 'גררו כדי להזיז' : 'בחרו כלי מסרגל הכלים'}</span>
            <span className="grow" />
            {cursor && renderable ? <span className="ltr">x {(cursor.x * mpu).toFixed(2)} · y {(cursor.y * mpu).toFixed(2)} m</span> : null}
            <span>קנ״מ {plan.scale}</span>
            {tool === 'measure' ? (live ? <span className="row g8">{mpu ? <span>מכויל</span> : <span className="warn-t">יש לכייל: מתחו קו על מידה ידועה</span>}{mpu ? <button type="button" className="linkish xs" onClick={() => run((d: any) => { const pl = d.plans.find((x: any) => x.id === plan.id); pl.tags = pl.tags.filter((t: string) => !t.startsWith(`cal:${v.v}:`)); })}>כיול מחדש</button> : null}</span> : <DemoTag>מדידה ידנית לפי קנ״מ – הדמיה</DemoTag>) : null}
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div style={{ padding: '4px 12px 0' }}>
            <Tabs value={panel} onChange={setPanel} tabs={[{ id: 'findings', label: 'ממצאים והערות', count: allAnns.filter((a) => a.status === 'פתוח').length }, { id: 'info', label: 'פרטים', icon: LuInfo }, { id: 'versions', label: 'גרסאות', icon: LuHistory, count: plan.versions.length }, { id: 'auto', label: 'בדיקה אוטומטית', icon: LuSparkles }]} />
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            {panel === 'findings' ? <FindingsPanel plan={plan} version={v.v} sel={sel} setSel={setSel} showResolved={showResolved} /> : null}
            {panel === 'info' ? <InfoPanel plan={plan} v={v} /> : null}
            {panel === 'versions' ? <VersionsPanel plan={plan} current={v.v} onPick={(n: number) => setVer(n)} /> : null}
            {panel === 'auto' ? <AutoPanel plan={plan} version={v.v} renderable={renderable} /> : null}
          </div>
        </div>
      </div>
      {calib !== null ? <CalibrateModal units={calib} onClose={() => setCalib(null)} onSave={(meters: number) => { const r = meters / calib; run((d: any) => { const pl = d.plans.find((x: any) => x.id === plan.id); pl.tags = [...pl.tags.filter((t: string) => !t.startsWith(`cal:${v.v}:`)), `cal:${v.v}:${r.toPrecision(6)}`]; }); toast('הכיול נשמר. אפשר למדוד.'); setCalib(null); }} /> : null}
      {pending ? <AddAnnotation plan={plan} version={v.v} pending={pending} onClose={() => setPending(null)} onAdded={(aid: string) => { setSel(aid); setPanel('findings'); setTool('select'); }} /> : null}
      {upload ? <UploadPlan planId={id} onClose={() => setUpload(false)} /> : null}
      {sendAp ? <SendForApproval projectId={plan.projectId} kind="שרטוט" refId={plan.id} title={`${plan.number} ${plan.title} – גרסה ${latest(plan).v}`} onClose={() => setSendAp(false)} /> : null}
    </div>
  );
}

function AddAnnotation({ plan, version, pending, onClose, onAdded }: any) {
  const { me, run, toast, live } = useStore();
  const [text, setText] = useState(pending.kind === 'measure' ? pending.text : '');
  const [sev, setSev] = useState('בינונית');
  const [err, setErr] = useState('');
  const title = pending.kind === 'issue' ? 'ממצא חדש' : pending.kind === 'measure' ? 'שמירת מדידה' : 'הערה חדשה';
  const save = () => {
    if (!text.trim()) { setErr('יש להזין טקסט'); return; }
    const id = uid('an');
    run(A.addAnnotation, { id, planId: plan.id, version, kind: pending.kind, x: pending.x, y: pending.y, x2: pending.x2, y2: pending.y2, text: text.trim(), authorId: me.id, at: nowStamp(), status: 'פתוח', severity: pending.kind === 'issue' ? sev : undefined });
    toast(`${title.replace(' חדש', '').replace(' חדשה', '')} נוסף/ה לשרטוט`); onAdded(id); onClose();
  };
  return (
    <Modal title={title} onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <Field label={pending.kind === 'measure' ? 'תיאור המדידה' : 'תוכן'} error={err} htmlFor="an-t"><Textarea id="an-t" rows={3} value={text} invalid={err} onChange={(e: any) => setText(e.target.value)} autoFocus /></Field>
        {pending.kind === 'issue' ? <Field label="חומרה" htmlFor="an-s"><Select id="an-s" value={sev} onChange={(e: any) => setSev(e.target.value)} options={['נמוכה', 'בינונית', 'גבוהה']} /></Field> : null}
        {pending.kind === 'measure' ? <Callout kind="assume">המידה מחושבת מקנה המידה שהוגדר לשרטוט ({plan.scale}). היא לא מחליפה מדידה בשטח.</Callout> : null}
      </div>
    </Modal>
  );
}

function FindingsPanel({ plan, version, sel, setSel, showResolved }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const [filter, setFilter] = useState('open');
  const [toTask, setToTask] = useState<T.Annotation | null>(null);
  const [del, setDel] = useState<string | null>(null);
  let list = db.annotations.filter((a: T.Annotation) => a.planId === plan.id);
  if (filter === 'open') list = list.filter((a) => a.status === 'פתוח');
  if (filter === 'issue') list = list.filter((a) => a.kind === 'issue');
  if (filter === 'this') list = list.filter((a) => a.version === version);
  const nonMeasure = db.annotations.filter((a: T.Annotation) => a.planId === plan.id && a.kind !== 'measure');
  return (
    <div className="stack">
      <Chips value={filter} onChange={setFilter} options={[{ value: 'open', label: 'פתוחים' }, { value: 'issue', label: 'ממצאים' }, { value: 'this', label: `גרסה ${version}` }, { value: 'all', label: 'הכול' }]} />
      {list.length === 0 ? <Empty title="אין פריטים">בחרו בכלי "הערה" או "ממצא" ולחצו על השרטוט.</Empty> : null}
      {list.map((a) => {
        const u = db.users.find((x) => x.id === a.authorId);
        const n = nonMeasure.indexOf(a) + 1;
        return (
          <div key={a.id} className={cx('card pad', sel === a.id && 'tinted')} style={{ padding: 12, borderColor: sel === a.id ? 'var(--accent)' : undefined, cursor: 'pointer' }} onClick={() => setSel(a.id)}>
            <div className="row g8 wrap">
              {a.kind !== 'measure' ? <span className="av sm" style={{ background: a.status === 'טופל' ? 'var(--ok)' : a.kind === 'issue' ? 'var(--bad)' : 'var(--info)' }}>{a.simulated ? '✦' : n}</span> : <LuRuler aria-hidden style={{ width: 16, color: 'var(--warn)' }} />}
              <Badge tone={a.kind === 'issue' ? 'bad' : a.kind === 'measure' ? 'accent' : 'info'}>{a.kind === 'issue' ? 'ממצא' : a.kind === 'measure' ? 'מדידה' : 'הערה'}</Badge>
              {a.severity ? <StatusBadge s={a.severity} dot={false} /> : null}
              {a.simulated ? <DemoTag>הדמיה – לא אישור הנדסי</DemoTag> : null}
              <span className="grow" />
              <span className="xs muted">v{a.version}</span>
            </div>
            <div className="small mt8" style={{ textDecoration: a.status === 'טופל' ? 'line-through' : undefined }}>{a.text}</div>
            <div className="xs muted mt8">{u?.name} · {ago(a.at)}</div>
            <div className="row g4 wrap mt8">
              <Btn size="xs" icon={LuCheck} onClick={(e: any) => { e.stopPropagation(); run(A.resolveAnnotation, a.id); toast(a.status === 'פתוח' ? 'סומן כטופל' : 'נפתח מחדש'); }}>{a.status === 'פתוח' ? 'סימון כטופל' : 'פתיחה מחדש'}</Btn>
              {a.taskId ? <Btn size="xs" icon={LuListChecks} onClick={(e: any) => { e.stopPropagation(); nav(`/tasks?open=${a.taskId}`); }}>למשימה</Btn> : a.kind !== 'measure' ? <Btn size="xs" icon={LuListChecks} onClick={(e: any) => { e.stopPropagation(); setToTask(a); }}>יצירת משימה</Btn> : null}
              {a.authorId === me.id || me.role === 'owner' || me.role === 'admin' ? <Btn size="xs" kind="ghost" icon={LuTrash2} onClick={(e: any) => { e.stopPropagation(); setDel(a.id); }} aria-label="מחיקה" /> : null}
            </div>
          </div>
        );
      })}
      {toTask ? <ToTaskModal ann={toTask} plan={plan} onClose={() => setToTask(null)} /> : null}
      {del ? <Confirm title="מחיקת פריט" danger confirmLabel="מחיקה" onClose={() => setDel(null)} onConfirm={() => { run(A.deleteAnnotation, del); toast('נמחק'); }}>למחוק את ההערה מהשרטוט?</Confirm> : null}
    </div>
  );
}
function ToTaskModal({ ann, plan, onClose }: any) {
  const { db, run, toast, nav, live } = useStore();
  const team = db.assignments.filter((a) => a.projectId === plan.projectId).map((a) => db.users.find((u) => u.id === a.userId)!).filter(Boolean);
  const [as, setAs] = useState(team.find((u) => u.title.includes('שרטוט') || u.id === 'u_shira')?.id || team[0]?.id);
  return (
    <Modal title="יצירת משימה מממצא" onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={() => { const tid = uid('t'); run(A.annotationToTask, ann.id, tid, as); toast('המשימה נוצרה ומקושרת לשרטוט'); onClose(); }}>יצירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack"><Callout kind="info">{ann.text}</Callout><Field label="אחראי/ת" htmlFor="tt-a"><Select id="tt-a" value={as} onChange={(e: any) => setAs(e.target.value)} options={team.map((u) => ({ value: u.id, label: u.name }))} /></Field><span className="xs muted">מועד: בעוד 3 ימים · עדיפות לפי חומרת הממצא</span></div>
    </Modal>
  );
}

function InfoPanel({ plan, v }: any) {
  const { db, me, run, toast, live } = useStore();
  const openFile = useOpenFile();
  return (
    <div className="stack">
      {live ? <div className="row g8 wrap"><Btn size="sm" onClick={() => openFile('plans', v._path)}>פתיחת הקובץ המקורי</Btn><Btn size="sm" kind="ghost" onClick={() => openFile('plans', v._path, `${plan.number}_v${v.v}.${String(v.fileType).toLowerCase()}`)}>הורדה</Btn></div> : null}
      <KV items={[['פרויקט', <ProjectLink id={plan.projectId} />], ['מספר', <span className="code">{plan.number}</span>], ['סוג', plan.category], ['קנה מידה', plan.scale], ['פורמט', <span className="row g8"><FileIcon type={v.fileType} />{v.sizeMb}MB</span>], ['עיבוד', <StatusBadge s={v.processing} />], ['גרסה', `v${v.v} מתוך ${plan.versions.length}`], ['הועלה', `${date(v.date)} · ${userName(db, v.authorId)}`], ['הערת גרסה', v.note]]} />
      <Field label="סטטוס הגרסה האחרונה" htmlFor="pl-st"><Select id="pl-st" value={latest(plan).status} onChange={(e: any) => { run(A.setPlanStatus, plan.id, e.target.value); toast('סטטוס השרטוט עודכן'); }} options={live ? PLAN_STATUSES.filter((x) => x !== 'מאושר' || latest(plan).status === 'מאושר') : PLAN_STATUSES} /></Field>
      <div className="card tinted pad" style={{ padding: 12 }}>
        <Switch id="pl-share" checked={plan.sharedWithClient} onChange={() => { run(A.togglePlanShare, plan.id); toast(plan.sharedWithClient ? 'השרטוט הוסתר מהלקוח' : 'השרטוט שותף עם הלקוח בפורטל'); }} label="משותף עם הלקוח בפורטל" />
        <div className="xs muted mt8">הלקוח רואה את הגרסה האחרונה בלבד, ללא הערות פנימיות{live ? '.' : ' (הנחת דמו).'}</div>
      </div>
      <div><div className="eyebrow mb8">משימות מקושרות</div>{db.tasks.filter((t) => t.source?.kind === 'plan' && t.source.id === plan.id).map((t) => <div key={t.id} className="small row between g8" style={{ padding: '4px 0' }}><span className="ellipsis">{t.title}</span><StatusBadge s={t.status} /></div>)}{!db.tasks.some((t) => t.source?.kind === 'plan' && t.source.id === plan.id) ? <span className="small muted">אין</span> : null}</div>
      <div><div className="eyebrow mb8">אישורים</div>{db.approvals.filter((a) => a.refId === plan.id).map((a) => <div key={a.id} className="small row between g8" style={{ padding: '4px 0' }}><span className="ellipsis">{a.title}</span><StatusBadge s={a.status} /></div>)}{!db.approvals.some((a) => a.refId === plan.id) ? <span className="small muted">לא נשלח לאישור</span> : null}</div>
    </div>
  );
}
function VersionsPanel({ plan, current, onPick }: any) {
  const { db, nav, live } = useStore();
  return (
    <div className="timeline">
      {[...plan.versions].reverse().map((x: T.PlanVersion) => (
        <div key={x.v} className={cx('tl-item', x.v === current && 'now', x.status === 'מאושר' && x.v !== current && 'done')}>
          <div className="row between g8"><button type="button" className="linkish bold" onClick={() => onPick(x.v)}>גרסה {x.v}</button><StatusBadge s={x.status} /></div>
          <div className="small">{x.note}</div>
          <div className="xs muted row g8 wrap"><span>{date(x.date)}</span><span>{userName(db, x.authorId)}</span><span className="code">{x.fileType} · {x.sizeMb}MB</span>{x.processing !== 'מוכן' ? <StatusBadge s={x.processing} /> : null}</div>
          <div className="xs muted">{db.annotations.filter((a) => a.planId === plan.id && a.version === x.v).length} הערות וממצאים</div>
        </div>
      ))}
      {plan.versions.length > 1 ? <Btn size="sm" icon={LuGitCompare} onClick={() => nav(`/plans/${plan.id}/compare`)}>השוואה בין גרסאות</Btn> : null}
    </div>
  );
}
function AutoPanel({ plan, version, renderable }: any) {
  const { db, me, run, toast, live } = useStore();
  const [running, setRunning] = useState(false);
  const sims = db.annotations.filter((a) => a.planId === plan.id && a.simulated);
  const go = () => {
    setRunning(true);
    setTimeout(() => {
      const items = [
        { x: 0.3, y: 0.55, text: '[הדמיה] חלל ללא חלון חיצוני – לבדוק אוורור', severity: 'בינונית' },
        { x: 0.7, y: 0.22, text: '[הדמיה] רוחב מעבר משוער קטן מ-90 ס״מ', severity: 'נמוכה' },
        { x: 0.48, y: 0.8, text: '[הדמיה] מידה כוללת לא תואמת לסכום מידות חלקיות', severity: 'נמוכה' },
      ];
      items.forEach((it) => run(A.addAnnotation, { id: uid('an'), planId: plan.id, version, kind: 'issue', x: it.x, y: it.y, text: it.text, authorId: me.id, at: nowStamp(), status: 'פתוח', severity: it.severity as any, simulated: true }));
      setRunning(false); toast('נוספו 3 ממצאים מדומים לבדיקה', 'info');
    }, 1600);
  };
  return (
    <div className="stack">
      <div className="row g8 wrap"><FutureTag>ניתוח שרטוט אוטומטי – עתידי</FutureTag></div>
      <Callout kind="future" title="מה תעשה היכולת בעתיד">זיהוי חללים ומידות מתוך PDF וקבצי CAD, השוואת מידות, ואיתור חוסר עקביות בין גיליונות. {live ? 'היכולת עוד לא פעילה.' : 'כרגע זו הדמיה בלבד שמוסיפה ממצאים קבועים לדוגמה.'}</Callout>
      <Callout kind="bad" title="לא אישור הנדסי">ממצאים אוטומטיים, גם בגרסה העתידית, הם עזר לבדיקה ואינם מחליפים בדיקה של אדריכל, מהנדס או בעל מקצוע מוסמך.</Callout>
      {live ? null : <Btn kind="navy" icon={running ? undefined : LuSparkles} disabled={!renderable || running} onClick={go}>{running ? <><span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--accent)' }} />מריץ הדמיה…</> : 'הרצת בדיקה מדומה'}</Btn>}
      {!renderable && !live ? <span className="xs muted">זמין רק לגרסאות עם תצוגה.</span> : null}
      {sims.length ? <span className="small muted">{sims.length} ממצאים מדומים קיימים בשרטוט (מסומנים ✦).</span> : null}
    </div>
  );
}

export function PlanCompare({ id }: { id: string }) {
  const { db, nav, live } = useStore();
  const plan = byId(db.plans, id);
  const [a, setA] = useState(() => (plan ? plan.versions[Math.max(0, plan.versions.length - 2)].v : 1));
  const [b, setB] = useState(() => (plan ? latest(plan).v : 1));
  const [mode, setMode] = useState('side');
  const [opacity, setOpacity] = useState(50);
  if (!plan) return <Empty heading="h1" title="השרטוט לא נמצא" />;
  if (!hasFeature(db, 'plans_compare')) return <LockedFeature feature="plans_compare" />;
  const va = plan.versions.find((x) => x.v === a)!; const vb = plan.versions.find((x) => x.v === b)!;
  const can = (v: T.PlanVersion) => RENDERABLE(v.fileType) && v.processing === 'מוכן';
  const clouds = Object.entries(CHANGES[plan.id] || {}).filter(([v]) => Number(v) > Math.min(a, b) && Number(v) <= Math.max(a, b)).flatMap(([v, arr]) => arr.map((c) => ({ ...c, v: Number(v) })));
  const Cloud = () => <>{clouds.map((c, i) => <g key={i}><rect x={c.x} y={c.y} width={c.w} height={c.h} rx={18} fill="none" stroke="var(--bad)" strokeWidth={3} strokeDasharray="10 6" /><rect x={c.x} y={c.y - 22} width={Math.max(120, c.note.length * 7)} height={20} rx={3} fill="var(--bad)" /><text x={c.x + 6} y={c.y - 8} fontSize={11} fill="#fff" fontWeight={600}>v{c.v}: {c.note}</text></g>)}</>;
  const opts = plan.versions.map((x) => ({ value: x.v, label: `גרסה ${x.v} · ${date(x.date)}` }));
  return (
    <div>
      <PageHead crumbs={[{ label: 'שרטוטים', to: '/plans' }, { label: plan.number, to: `/plans/${id}` }, { label: 'השוואה' }]} title={`השוואת גרסאות · ${plan.number} ${plan.title}`}
        actions={<Segmented value={mode} onChange={setMode} options={[{ value: 'side', label: 'זו לצד זו' }, { value: 'overlay', label: 'שכבות' }]} />} />
      <div className="filters">
        <Field label="גרסה קודמת" htmlFor="cmp-a"><Select id="cmp-a" className="sm" value={a} onChange={(e: any) => setA(Number(e.target.value))} options={opts} /></Field>
        <Field label="גרסה להשוואה" htmlFor="cmp-b"><Select id="cmp-b" className="sm" value={b} onChange={(e: any) => setB(Number(e.target.value))} options={opts} /></Field>
        {mode === 'overlay' ? <Field label={`שקיפות גרסה ${b}: ${opacity}%`} htmlFor="cmp-o"><input id="cmp-o" type="range" min={0} max={100} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} /></Field> : null}
        <div className="grow" />
        <AssumeChanges />
      </div>
      {!can(va) || !can(vb) ? <Callout kind="assume">אחת הגרסאות היא {!can(va) ? va.fileType : vb.fileType} ללא תצוגה. השוואה חזותית אפשרית רק בין גרסאות עם תצוגה.</Callout> : mode === 'side' ? (
        <div className="compare">
          <Card title={`גרסה ${a}`} actions={<StatusBadge s={va.status} />} pad={false}><PlanSvg layout={plan.layout} rev={a} meta={planMeta(db, plan, va)} /><div className="card-foot small soft">{va.note}</div></Card>
          <Card title={`גרסה ${b}`} actions={<StatusBadge s={vb.status} />} pad={false}><PlanSvg layout={plan.layout} rev={b} meta={planMeta(db, plan, vb)}><Cloud /></PlanSvg><div className="card-foot small soft">{vb.note}</div></Card>
        </div>
      ) : (
        <div className="card" style={{ padding: 12 }}>
          <div className="overlay-stack">
            <div><PlanSvg layout={plan.layout} rev={a} /></div>
            <div style={{ opacity: opacity / 100, mixBlendMode: 'multiply', filter: 'hue-rotate(180deg) saturate(3)' }}><PlanSvg layout={plan.layout} rev={b} style={{ background: 'transparent' }}><Cloud /></PlanSvg></div>
          </div>
        </div>
      )}
      <div className="mt16"><Card title="שינויים שתועדו בין הגרסאות">{clouds.length ? <ul className="small" style={{ margin: 0, paddingInlineStart: 18 }}>{clouds.map((c, i) => <li key={i}>גרסה {c.v}: {c.note}</li>)}</ul> : <span className="small muted">לא תועדו שינויים בין הגרסאות שנבחרו.</span>}</Card></div>
    </div>
  );
}
function AssumeChanges() { return <span className="tag-future" title="זיהוי שינויים אוטומטי הוא יכולת עתידית"><LuSparkles aria-hidden />סימוני השינוי ידניים · זיהוי אוטומטי עתידי</span>; }

function CalibrateModal({ units, onClose, onSave }: { units: number; onClose: () => void; onSave: (m: number) => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  return (
    <Modal title="כיול קנה מידה" size="narrow" onClose={onClose} foot={<><Btn kind="primary" onClick={() => { const m = Number(val.replace(',', '.')); if (!(m > 0)) { setErr('יש להזין אורך חיובי במטרים'); return; } onSave(m); }}>שמירת כיול</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <p className="small soft">מה האורך האמיתי של הקו שסימנתם? לדוגמה: מידת קיר או קו מידה שמופיע בשרטוט. הכיול נשמר לגרסה הזו של השרטוט ומשמש את כל הצוות.</p>
        <Field label="אורך במטרים" error={err} htmlFor="cal-m"><Input id="cal-m" className="ltr" inputMode="decimal" value={val} invalid={err} onChange={(e: any) => setVal(e.target.value)} autoFocus placeholder="3.60" /></Field>
        <Callout kind="assume">מדידה מתוך שרטוט היא עזר בלבד ואינה מחליפה מדידה בשטח.</Callout>
      </div>
    </Modal>
  );
}
