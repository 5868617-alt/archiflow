import { useState, useEffect, useRef } from 'react';
import { LuFolder, LuFolderOpen, LuUpload, LuEye, LuEyeOff, LuLock, LuHistory, LuSend, LuShieldCheck, LuDownload, LuFileArchive } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, userName, A, uid, byId, inScope } from '../data/api';
import { DOC_FOLDERS } from '../data/seed';
import type * as T from '../data/types';
import { todayISO } from '../data/dates';
import { CameraButton, PageHead, Btn, Select, SearchBox, DataTable, StatusBadge, Badge, Card, KV, Modal, Field, Input, Textarea, Empty, Callout, Switch, cx, DemoTag } from '../ui/core';
import { FileIcon } from '../ui/charts';
import { ProjectLink } from './shared';
import { SendForApproval } from './Approvals';
import { date, fileSize } from '../lib/format';
import { friendlyError } from '../live/errors';
import { useOpenFile } from '../live/hooks';

const DOC_EXT: Record<string, T.Doc['fileType']> = { PDF: 'PDF', DOCX: 'DOCX', XLSX: 'XLSX', JPG: 'JPG', JPEG: 'JPG', PNG: 'PNG', ZIP: 'ZIP', DWG: 'DWG' as any, DXF: 'DXF' as any };

const ACCESS: T.Doc['access'][] = ['צוות הפרויקט', 'כל המשרד', 'בעלים ומנהלים'];
function canSeeDoc(me: T.User, d: T.Doc) { return d.access !== 'בעלים ומנהלים' || me.role === 'owner' || me.role === 'admin'; }

export function DocumentsPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const ok = inScope(db, me);
  const all = db.documents.filter((d) => ok(d.projectId) && canSeeDoc(me, d));
  const hiddenByRole = db.documents.filter((d) => ok(d.projectId) && !canSeeDoc(me, d)).length;
  const [folder, setFolder] = useState('');
  const [project, setProject] = useState(query.project || '');
  const [type, setType] = useState('');
  const [shared, setShared] = useState('');
  const [q, setQ] = useState('');
  const [upload, setUpload] = useState(false);
  let list = all;
  if (folder) list = list.filter((d) => d.folder === folder);
  if (project) list = list.filter((d) => (project === 'office' ? d.projectId === null : d.projectId === project));
  if (type) list = list.filter((d) => d.fileType === type);
  if (shared) list = list.filter((d) => (shared === 'yes' ? d.sharedWithClient : !d.sharedWithClient));
  if (q.trim()) list = list.filter((d) => d.name.includes(q) || d.tags.some((t) => t.includes(q)));
  return (
    <div>
      <PageHead title="מסמכים" sub="חוזים, היתרים, הצעות מחיר, פרוטוקולים ותיעוד – עם גרסאות והרשאות." actions={<Btn kind="primary" icon={LuUpload} onClick={() => setUpload(true)}>העלאת מסמך</Btn>} />
      <div className="grid-rail" style={{ '--rail': '220px' } as any}>
        <Card pad={false} className="hide-sm">
          <div className="list" style={{ padding: 6 }}>
            <button type="button" className={cx('menu-item', !folder && 'on')} onClick={() => setFolder('')}><LuFolderOpen aria-hidden /><span className="grow">כל התיקיות</span><span className="xs muted num">{all.length}</span></button>
            {DOC_FOLDERS.map((f) => <button key={f} type="button" className={cx('menu-item', folder === f && 'on')} onClick={() => setFolder(f)}>{folder === f ? <LuFolderOpen aria-hidden /> : <LuFolder aria-hidden />}<span className="grow">{f}</span><span className="xs muted num">{all.filter((d) => d.folder === f).length}</span></button>)}
          </div>
        </Card>
        <div style={{ minWidth: 0 }}>
          <div className="filters">
            <SearchBox value={q} onChange={setQ} placeholder="חיפוש מסמך או תגית" id="doc-search" />
            <Select className="show-sm" value={folder} onChange={(e: any) => setFolder(e.target.value)} placeholder="כל התיקיות" options={DOC_FOLDERS} aria-label="תיקייה" />
            <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={[{ value: 'office', label: 'מסמכי משרד' }, ...visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))]} aria-label="פרויקט" />
            <Select value={type} onChange={(e: any) => setType(e.target.value)} placeholder="כל הסוגים" options={['PDF', 'DOCX', 'XLSX', 'JPG', 'ZIP']} aria-label="סוג קובץ" />
            <Select value={shared} onChange={(e: any) => setShared(e.target.value)} placeholder="שיתוף: הכול" options={[{ value: 'yes', label: 'משותף עם לקוח' }, { value: 'no', label: 'פנימי בלבד' }]} aria-label="שיתוף" />
          </div>
          <DocList docs={list} />
          {hiddenByRole ? <div className="mt8 xs muted row g4"><LuLock aria-hidden style={{ width: 12 }} />{hiddenByRole} מסמכים מוגבלים לבעלים ומנהלים אינם מוצגים לך.</div> : null}
        </div>
      </div>
      {upload ? <UploadDoc defaultProject={project && project !== 'office' ? project : ''} defaultFolder={folder} onClose={() => setUpload(false)} /> : null}
    </div>
  );
}

function DocList({ docs, hideProject }: any) {
  const { db, nav, live } = useStore();
  return (
    <div className="card">
      <DataTable rows={docs} onRow={(d: T.Doc) => nav(`/documents/${d.id}`)} pageSize={12} initialSort={{ key: 'updated', dir: -1 }} empty={<Empty title="אין מסמכים">נסו לשנות את הסינון או להעלות מסמך.</Empty>} columns={[
        { key: 'name', label: 'שם', render: (d: T.Doc) => <span className="row g12"><FileIcon type={d.fileType} /><span className="col" style={{ gap: 0 }}><b>{d.name}</b><span className="xs muted">{d.folder}{d.tags.length ? ' · ' + d.tags.join(', ') : ''}</span></span></span> },
        ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', sortValue: (d: T.Doc) => projectOf(db, d.projectId)?.name || 'א', render: (d: T.Doc) => <ProjectLink id={d.projectId} /> }]),
        { key: 'v', label: 'גרסה', sortValue: (d: T.Doc) => d.versions.length, render: (d: T.Doc) => <span className="num">v{d.versions.length}</span> },
        { key: 'updated', label: 'עודכן', sortValue: (d: T.Doc) => d.versions[d.versions.length - 1].date, render: (d: T.Doc) => <span className="small">{date(d.versions[d.versions.length - 1].date)} · {userName(db, d.versions[d.versions.length - 1].authorId)}</span> },
        { key: 'size', label: 'גודל', sortValue: (d: T.Doc) => d.versions[d.versions.length - 1].sizeKb, render: (d: T.Doc) => <span className="small num">{fileSize(d.versions[d.versions.length - 1].sizeKb)}</span> },
        { key: 'access', label: 'גישה', render: (d: T.Doc) => <span className="row g4">{d.sharedWithClient ? <Badge tone="info" icon={LuEye}>לקוח</Badge> : null}{d.access === 'בעלים ומנהלים' ? <Badge icon={LuLock}>מוגבל</Badge> : null}</span> },
      ]} />
    </div>
  );
}

export function DocTable({ projectId }: { projectId: string }) {
  const { db, me, live } = useStore();
  const [upload, setUpload] = useState(false);
  const docs = db.documents.filter((d) => d.projectId === projectId && canSeeDoc(me, d));
  return (
    <div>
      <div className="filters"><span className="small muted">{docs.length} מסמכים · {docs.filter((d) => d.sharedWithClient).length} משותפים עם הלקוח</span><div className="grow" /><Btn kind="primary" icon={LuUpload} onClick={() => setUpload(true)}>העלאת מסמך</Btn></div>
      <DocList docs={docs} hideProject />
      {upload ? <UploadDoc defaultProject={projectId} onClose={() => setUpload(false)} /> : null}
    </div>
  );
}

function UploadDoc({ defaultProject, defaultFolder, docId, onClose }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const realFile = useRef<File | null>(null);
  const existing = docId ? byId(db.documents, docId) : undefined;
  const [f, setF] = useState({ projectId: defaultProject || '', folder: defaultFolder || DOC_FOLDERS[0], name: '', description: '', shared: false, access: 'צוות הפרויקט' as T.Doc['access'], note: '' });
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [err, setErr] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const ref = useRef<any>(null);
  const submit = () => {
    const e: any = {};
    if (!file) e.file = 'יש לבחור קובץ';
    if (!existing && !f.name.trim()) e.name = 'יש להזין שם';
    setErr(e); if (Object.keys(e).length) return;
    setBusy(true);
    if (live) { liveSubmit(); return; }
    setTimeout(() => {
      if (existing) { run(A.addDocVersion, existing.id, f.note || 'גרסה חדשה'); toast('גרסה חדשה נשמרה'); onClose(); return; }
      const ext = (file!.name.split('.').pop() || 'pdf').toUpperCase();
      const ft = (['PDF', 'DOCX', 'XLSX', 'JPG', 'PNG', 'ZIP'].includes(ext) ? ext : 'PDF') as T.Doc['fileType'];
      const id = uid('doc');
      run(A.saveDoc, { id, projectId: f.projectId || null, folder: f.folder, name: f.name.trim(), fileType: ft, versions: [{ v: 1, date: todayISO, authorId: me.id, note: f.note || 'העלאה ראשונה', sizeKb: Math.max(1, Math.round(file!.size / 1024)) }], sharedWithClient: f.shared, access: f.access, tags: [], description: f.description }, true);
      toast('המסמך נשמר (הקובץ עצמו לא הועלה – הדמיה)'); onClose(); nav(`/documents/${id}`);
    }, 900);
  };
  const take = (fl: File) => {
    const ext = (fl.name.split('.').pop() || '').toUpperCase();
    if (live && !DOC_EXT[ext]) { setErr({ file: `סוג הקובץ ${ext || 'ללא סיומת'} לא נתמך. אפשר להעלות PDF, DOCX, XLSX, JPG, PNG, ZIP, DWG או DXF.` }); return; }
    if (fl.size > 100 * 1024 * 1024) { setErr({ file: 'הקובץ גדול מ-100MB.' }); return; }
    realFile.current = fl; setErr({}); setFile({ name: fl.name, size: fl.size }); if (!f.name) setF({ ...f, name: fl.name.replace(/\.[^.]+$/, '') });
  };
  const liveSubmit = async () => {
    try {
      const fl = realFile.current!;
      const pid = existing ? existing.projectId : f.projectId || null;
      const { path, size } = await live!.upload('documents', pid, fl);
      const ver: any = { v: 1, date: todayISO, authorId: me.id, note: f.note || 'העלאה ראשונה', sizeKb: Math.max(1, Math.round(size / 1024)), _path: path, _size: size };
      if (existing) {
        ver.v = existing.versions.length ? existing.versions[existing.versions.length - 1].v + 1 : 1; ver.note = f.note || 'גרסה חדשה';
        run((d: any) => { const x = d.documents.find((y: any) => y.id === existing.id); x.versions.push(ver); d.activity.unshift({ id: uid('a'), projectId: x.projectId, userId: me.id, text: `גרסה ${ver.v} למסמך ${x.name}`, at: todayISO, link: `/documents/${x.id}` }); });
        toast('גרסה חדשה נשמרה'); onClose(); return;
      }
      const ext = (fl.name.split('.').pop() || '').toUpperCase();
      const id = uid('doc');
      run(A.saveDoc, { id, projectId: f.projectId || null, folder: f.folder, name: f.name.trim(), fileType: DOC_EXT[ext], versions: [ver], sharedWithClient: f.shared && !!f.projectId, access: f.access, tags: [], description: f.description }, true);
      toast('המסמך הועלה ונשמר'); onClose(); nav(`/documents/${id}`);
    } catch (x: any) { setBusy(false); setErr({ file: friendlyError(x) }); }
  };
  return (
    <Modal title={existing ? `גרסה חדשה · ${existing.name}` : 'העלאת מסמך'} onClose={onClose} foot={<><Btn kind="primary" icon={LuUpload} onClick={submit} disabled={busy}>{busy ? 'שומר…' : 'העלאה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <div className="dropzone" role="button" tabIndex={0} onClick={() => ref.current?.click()} onKeyDown={(e) => e.key === 'Enter' && ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const fl = e.dataTransfer.files[0]; if (fl) take(fl); }}>
          <LuUpload aria-hidden />{file ? <><b>{file.name}</b><span className="small muted">{fileSize(Math.round(file.size / 1024))}</span></> : <b>גררו קובץ או לחצו לבחירה</b>}
          <input ref={ref} type="file" hidden onChange={(e) => { const fl = e.target.files?.[0]; if (fl) take(fl); }} />
        </div>
        <CameraButton onFile={take} label="צילום מסמך" />
        {err.file ? <Callout kind="bad">{err.file}</Callout> : null}
        {live ? null : <button type="button" className="linkish small" style={{ alignSelf: 'flex-start' }} onClick={() => { setFile({ name: 'הצעת מחיר ספק.pdf', size: 184000 }); if (!f.name) setF({ ...f, name: 'הצעת מחיר ספק' }); }}>שימוש בקובץ לדוגמה</button>}
        {!existing ? (
          <div className="form-grid">
            <Field label="שם המסמך *" full error={err.name} htmlFor="ud-n"><Input id="ud-n" value={f.name} invalid={err.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="פרויקט" htmlFor="ud-p"><Select id="ud-p" value={f.projectId} onChange={(e: any) => setF({ ...f, projectId: e.target.value })} options={[{ value: '', label: 'מסמך משרד (ללא פרויקט)' }, ...visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))]} /></Field>
            <Field label="תיקייה" htmlFor="ud-f"><Select id="ud-f" value={f.folder} onChange={(e: any) => setF({ ...f, folder: e.target.value })} options={DOC_FOLDERS} /></Field>
            <Field label="הרשאת גישה" htmlFor="ud-a"><Select id="ud-a" value={f.access} onChange={(e: any) => setF({ ...f, access: e.target.value })} options={ACCESS} /></Field>
            <div className="field" style={{ justifyContent: 'flex-end' }}><Switch id="ud-s" checked={f.shared} onChange={(v: boolean) => setF({ ...f, shared: v })} label="שיתוף עם הלקוח" /></div>
          </div>
        ) : <Field label="מה השתנה?" htmlFor="ud-note"><Input id="ud-note" value={f.note} onChange={(e: any) => setF({ ...f, note: e.target.value })} /></Field>}
        <span className="xs muted">{live ? 'הקובץ נשמר באחסון פרטי. ההרשאה למסמך קובעת גם מי יכול לפתוח את הקובץ.' : 'בדמו נשמרים רק שם הקובץ וגודלו. בייצור הקבצים יישמרו ב-Supabase Storage עם הרשאות לפי משרד ופרויקט.'}</span>
      </div>
    </Modal>
  );
}

export function LiveDocPreview({ d }: { d: T.Doc }) {
  const { live } = useStore();
  const cur: any = d.versions[d.versions.length - 1];
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const previewable = d.fileType === 'PDF' || d.fileType === 'JPG' || d.fileType === 'PNG';
  useEffect(() => {
    setUrl(null); setFailed(false); if (!previewable || !cur?._path || live!.saving) return;
    let alive = true; let timer: any;
    const attempt = (n: number) => live!.fileUrl('documents', cur._path).then((u) => alive && setUrl(u)).catch(() => { if (!alive) return; if (n < 5) timer = setTimeout(() => attempt(n + 1), 800 * (n + 1)); else setFailed(true); });
    attempt(0);
    return () => { alive = false; clearTimeout(timer); };
  }, [cur?._path, live!.saving]); // eslint-disable-line
  if (!previewable || failed || !cur?._path) return <div className="lock-panel" style={{ background: 'var(--surface-2)' }}><div className="lp-ic"><LuFileArchive aria-hidden /></div><b>{d.fileType}</b><span className="small muted">{failed ? 'לא הצלחנו לטעון את הקובץ.' : 'אין תצוגה מקדימה לסוג הקובץ הזה. אפשר להוריד אותו.'}</span></div>;
  if (!url) return <div className="card" style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><span className="row g8 small muted"><span className="spinner" />טוען…</span></div>;
  return d.fileType === 'PDF'
    ? <iframe title={d.name} src={url} style={{ width: '100%', minHeight: '72vh', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: '#fff' }} />
    : <div className="card" style={{ padding: 8 }}><img src={url} alt={d.name} style={{ display: 'block', maxWidth: '100%', margin: '0 auto' }} /></div>;
}

function DocPreview({ d }: { d: T.Doc }) {
  const { live } = useStore();
  if (live) return <LiveDocPreview d={d} />;
  if (d.fileType === 'XLSX') return (
    <div className="invoice-paper watermark" style={{ padding: 16 }}>
      <div className="table-wrap"><table className="tbl"><thead><tr>{['#', 'סעיף', 'כמות', 'יח׳', 'הערות'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{['עמדות עבודה', 'חדרי ישיבות', 'חדר שקט', 'מטבחון', 'קבלה', 'ארכיון'].map((r, i) => <tr key={r}><td className="num">{i + 1}</td><td>{r}</td><td className="num">{[42, 3, 1, 1, 1, 1][i]}</td><td>יח׳</td><td className="muted small">—</td></tr>)}</tbody></table></div>
    </div>
  );
  if (d.fileType === 'ZIP' || d.fileType === 'JPG' || d.fileType === 'PNG') return <div className="lock-panel" style={{ background: 'var(--surface-2)' }}><div className="lp-ic"><LuFileArchive aria-hidden /></div><b>{d.fileType === 'ZIP' ? 'ארכיון קבצים' : 'תמונה'}</b><span className="small muted">{d.description || 'אין תצוגה מקדימה לקובץ זה בדמו.'}</span></div>;
  return (
    <div className="invoice-paper watermark" style={{ fontSize: 13, lineHeight: 1.9 }}>
      <div className="row between"><b className="display" style={{ fontSize: 20 }}>{d.name}</b><span className="code">{d.fileType}</span></div>
      <hr className="sep" style={{ margin: '12px 0' }} />
      {['1. הצדדים', '2. היקף השירותים', '3. לוחות זמנים', '4. תמורה ותנאי תשלום', '5. אחריות ושינויים'].map((h, i) => (
        <div key={h} style={{ marginBottom: 10 }}><b>{h}</b>{[0, 1].map((j) => <div key={j} className="skel" style={{ height: 8, margin: '8px 0', width: `${92 - ((i + j) % 4) * 9}%`, animation: 'none' }} />)}</div>
      ))}
      <div className="xs muted">תצוגה סכמטית של מסמך – התוכן האמיתי לא נשמר בדמו.</div>
    </div>
  );
}

export function DocumentDetail({ id }: { id: string }) {
  const { db, me, run, toast, nav, live } = useStore();
  const openFile = useOpenFile();
  const d = byId(db.documents, id);
  const [upload, setUpload] = useState(false);
  const [send, setSend] = useState(false);
  if (!d || !inScope(db, me)(d.projectId)) return <Empty title="המסמך לא נמצא או שאין גישה" action={<Btn onClick={() => nav('/documents')}>לספריית המסמכים</Btn>} />;
  if (!canSeeDoc(me, d)) return <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}><Empty icon={LuLock} title="מסמך מוגבל">המסמך זמין לבעלים ולמנהלי המשרד בלבד.</Empty></div>;
  const cur = d.versions[d.versions.length - 1];
  const canEdit = me.role === 'owner' || me.role === 'admin' || me.role === 'member';
  return (
    <div>
      <PageHead crumbs={[{ label: 'מסמכים', to: '/documents' }, { label: d.folder }, { label: d.name }]} title={d.name} badge={<FileIcon type={d.fileType} />}
        actions={<>{live ? <Btn icon={LuDownload} onClick={() => openFile('documents', (cur as any)._path, `${d.name}.${d.fileType.toLowerCase()}`)}>הורדה</Btn> : <Btn icon={LuDownload} disabled title="הורדה אינה זמינה בדמו">הורדה</Btn>}<Btn icon={LuUpload} onClick={() => setUpload(true)}>גרסה חדשה</Btn>{d.projectId ? <Btn kind="primary" icon={LuSend} onClick={() => setSend(true)}>לאישור לקוח</Btn> : null}</>} />
      <div className="grid-main-side">
        <DocPreview d={d} />
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פרטי המסמך">
            <KV items={[['פרויקט', <ProjectLink id={d.projectId} />], ['תיקייה', d.folder], ['גרסה נוכחית', `v${cur.v} · ${date(cur.date)}`], ['הועלה ע״י', userName(db, cur.authorId)], ['גודל', fileSize(cur.sizeKb)], ['תיאור', d.description || '—']]} />
          </Card>
          <Card title="שיתוף והרשאות" icon={LuShieldCheck} actions={live ? null : <DemoTag>הרשאות מדומות</DemoTag>}>
            <div className="stack">
              {d.projectId ? <Switch id="dd-share" checked={d.sharedWithClient} onChange={() => { if (!canEdit) return; run(A.saveDoc, { ...d, sharedWithClient: !d.sharedWithClient }, false); toast(d.sharedWithClient ? 'המסמך הוסתר מהלקוח' : 'המסמך שותף עם הלקוח'); }} label="גלוי ללקוח בפורטל" /> : <span className="small muted">מסמך משרד – לא ניתן לשיתוף עם לקוח.</span>}
              <Field label="מי בצוות רואה" htmlFor="dd-acc"><Select id="dd-acc" value={d.access} disabled={me.role === 'member'} onChange={(e: any) => { run(A.saveDoc, { ...d, access: e.target.value }, false); toast('הרשאת הגישה עודכנה'); }} options={ACCESS} /></Field>
              <div className="xs muted">בעלים ומנהלים רואים תמיד. {live ? 'הכלל נאכף בשרת, גם על הקובץ עצמו.' : 'בייצור הכלל ייאכף במדיניות RLS ובהרשאות אחסון.'}</div>
            </div>
          </Card>
          <Card title="היסטוריית גרסאות" icon={LuHistory}>
            <div className="timeline">{[...d.versions].reverse().map((v, i) => <div key={v.v} className={cx('tl-item', i === 0 ? 'now' : 'done')}><div className="row between"><b>v{v.v}</b><span className="xs muted">{date(v.date)}</span></div><div className="small">{v.note || '—'}</div><div className="xs muted">{userName(db, v.authorId)} · {fileSize(v.sizeKb)}</div>{live && (v as any)._path ? <button type="button" className="linkish xs" onClick={() => openFile('documents', (v as any)._path, `${d.name}_v${v.v}.${d.fileType.toLowerCase()}`)}>הורדת גרסה זו</button> : null}</div>)}</div>
          </Card>
        </div>
      </div>
      {upload ? <UploadDoc docId={d.id} onClose={() => setUpload(false)} /> : null}
      {send ? <SendForApproval projectId={d.projectId!} kind={d.folder === 'הצעות מחיר' ? 'הצעת מחיר' : 'מסמך'} refId={d.id} title={d.name} onClose={() => setSend(false)} onSent={() => { if (!d.sharedWithClient) run(A.saveDoc, { ...d, sharedWithClient: true }, false); }} /> : null}
    </div>
  );
}
