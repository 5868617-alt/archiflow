// Site supervision: visits, findings with photos, a report for the client and a printable copy.
import { useState } from 'react';
import { LuHardHat, LuPlus, LuSend, LuPrinter, LuPencil, LuTrash2, LuListChecks, LuMapPin, LuUser, LuCalendarClock, LuCheck, LuArrowRight, LuCamera } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, projectOf, clientOf, openFindings } from '../data/api';
import { SEVERITY, FINDING_STATUS, NEXT_FINDING } from '../data/architect';
import type * as T from '../data/types';
import { todayISO, daysFromToday, IS_LIVE } from '../data/dates';
import { Btn, Card, Badge, Empty, Modal, Field, Input, Select, Textarea, Callout, IconBtn, Confirm, CameraButton, cx } from '../ui/core';
import { StoredImage, useStoreImage, ImagePick } from '../ui/StoredImage';
import { BrandMark } from './Branding';
import { date, dateTime } from '../lib/format';

export function ProjectSite({ projectId }: { projectId: string }) {
  const { db } = useStore();
  const visits = db.siteVisits.filter((v) => v.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date));
  const [sel, setSel] = useState<string | null>(null);
  const [newV, setNewV] = useState(false);
  const open = openFindings(db, projectId);
  const cur = visits.find((v) => v.id === sel);
  if (cur) return <VisitDetail v={cur} onBack={() => setSel(null)} />;
  return (
    <div className="grid-main-side">
      <Card title="ביקורי פיקוח" icon={LuHardHat} pad={false} actions={<Btn size="sm" kind="primary" icon={LuPlus} onClick={() => setNewV(true)}>ביקור חדש</Btn>}>
        {visits.length ? (
          <div className="list">
            {visits.map((v) => {
              const fs = db.siteFindings.filter((f) => f.visitId === v.id);
              const op = fs.filter((f) => f.status !== 'verified').length;
              return (
                <button key={v.id} type="button" className="li click" style={{ width: '100%', textAlign: 'right', font: 'inherit', color: 'inherit', background: 'none', border: 0 }} onClick={() => setSel(v.id)}>
                  <span className="li-ic accent"><LuHardHat aria-hidden /></span>
                  <div className="li-main"><div className="li-title">ביקור {date(v.date)}</div><div className="li-sub ellipsis">{v.summary || 'ללא סיכום'}</div></div>
                  <span className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge tone={v.status === 'sent' ? 'ok' : ''} dot>{v.status === 'sent' ? 'נשלח ללקוח' : 'טיוטה'}</Badge>
                    <span className="xs muted">{fs.length} ממצאים{op ? ` · ${op} פתוחים` : ''}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : <Empty icon={LuHardHat} title="עוד לא תועדו ביקורים באתר" action={<Btn kind="primary" icon={LuPlus} onClick={() => setNewV(true)}>תיעוד ביקור ראשון</Btn>}>בכל ביקור רושמים מי נכח, מה נבדק ואילו ממצאים צריך לתקן – עם תמונות מהאתר.</Empty>}
      </Card>
      <Card title={`ממצאים פתוחים (${open.length})`} pad={false}>
        {open.length ? <div className="list">{open.map((f) => <div key={f.id} className="li"><span className={cx('sev-dot', f.severity)} aria-hidden /><div className="li-main"><div className="li-title">{f.title}</div><div className="li-sub">{[f.location, f.responsible, f.dueOn ? 'עד ' + date(f.dueOn) : ''].filter(Boolean).join(' · ')}</div></div><Badge tone={FINDING_STATUS[f.status].tone}>{FINDING_STATUS[f.status].label}</Badge></div>)}</div> : <Empty icon={LuCheck} title="אין ממצאים פתוחים" />}
      </Card>
      {newV ? <VisitForm projectId={projectId} onClose={(id) => { setNewV(false); if (id) setSel(id); }} /> : null}
    </div>
  );
}

function VisitDetail({ v, onBack }: { v: T.SiteVisit; onBack: () => void }) {
  const { db, me, run, toast } = useStore();
  const fs = db.siteFindings.filter((f) => f.visitId === v.id);
  const [edit, setEdit] = useState(false);
  const [fEdit, setFEdit] = useState<T.SiteFinding | 'new' | null>(null);
  const [send, setSend] = useState(false);
  const [print, setPrint] = useState(false);
  const [del, setDel] = useState(false);
  const p = projectOf(db, v.projectId)!;
  const client = clientOf(db, p.clientId);
  const portal = client?.contacts.filter((c) => c.portal === 'פעיל') || [];
  return (
    <div className="stack-lg">
      <div className="row between wrap g8">
        <Btn kind="ghost" size="sm" icon={LuArrowRight} onClick={onBack}>לכל הביקורים</Btn>
        <div className="row g8 wrap">
          <Btn size="sm" icon={LuPrinter} onClick={() => setPrint(true)}>דו״ח להדפסה / PDF</Btn>
          {v.status === 'draft' ? <Btn size="sm" kind="primary" icon={LuSend} onClick={() => setSend(true)}>שליחה ללקוח</Btn> : <Badge tone="ok" dot>נשלח ללקוח {v.sentAt ? dateTime(v.sentAt) : ''}</Badge>}
        </div>
      </div>
      <Card title={`ביקור פיקוח · ${date(v.date)}`} icon={LuHardHat} actions={<><IconBtn icon={LuPencil} label="עריכת פרטי הביקור" onClick={() => setEdit(true)} /><IconBtn icon={LuTrash2} label="מחיקת הביקור" onClick={() => setDel(true)} /></>}>
        <div className="stack">
          {v.attendees ? <div className="small"><b>נכחו:</b> {v.attendees}</div> : null}
          <p className="pre-wrap">{v.summary || <span className="muted">אין סיכום עדיין.</span>}</p>
        </div>
      </Card>
      <Card title={`ממצאים (${fs.length})`} pad={false} actions={<Btn size="sm" kind="primary" icon={LuPlus} onClick={() => setFEdit('new')}>ממצא</Btn>}>
        {fs.length ? <div className="findings">{fs.map((f) => <FindingRow key={f.id} f={f} onEdit={() => setFEdit(f)} />)}</div> : <Empty title="אין ממצאים בביקור הזה" action={<Btn icon={LuCamera} onClick={() => setFEdit('new')}>הוספת ממצא עם תמונה</Btn>} />}
      </Card>
      {edit ? <VisitForm projectId={v.projectId} v={v} onClose={() => setEdit(false)} /> : null}
      {fEdit ? <FindingForm v={v} f={fEdit === 'new' ? null : fEdit} onClose={() => setFEdit(null)} /> : null}
      {send ? (
        <Confirm title="שליחת דו״ח הפיקוח ללקוח" confirmLabel="שליחה" onClose={() => setSend(false)} onConfirm={() => { run(A.sendSiteReport, v.id); toast(portal.length ? 'הדו״ח נשלח ללקוח' : 'הדו״ח סומן כנשלח'); setSend(false); }}>
          <div className="stack small">
            <span>הסיכום ו-{fs.length} הממצאים יוצגו ל{client?.name} בפורטל הלקוחות, כולל התמונות.</span>
            {portal.length ? <span>{IS_LIVE ? 'תישלח התראה בפורטל, ומייל ייכנס לתור השליחה.' : 'בדמו נרשמת התראה ומייל מדומה – שום מייל לא נשלח.'}</span> : <Callout kind="assume">ללקוח אין עדיין גישה פעילה לפורטל, ולכן הוא לא יראה את הדו״ח עד שיוזמן.</Callout>}
            <span className="muted">אחרי השליחה אפשר עדיין לעדכן סטטוס של ממצאים, והלקוח יראה את העדכון.</span>
          </div>
        </Confirm>
      ) : null}
      {print ? <ReportPreview v={v} onClose={() => setPrint(false)} /> : null}
      {del ? <Confirm title="מחיקת ביקור" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deleteVisit, v.id); toast('הביקור נמחק'); onBack(); }}>הביקור ו-{fs.length} הממצאים שלו יימחקו.{v.status === 'sent' ? ' הלקוח כבר קיבל את הדו״ח.' : ''}</Confirm> : null}
    </div>
  );
}

function FindingRow({ f, onEdit }: { f: T.SiteFinding; onEdit: () => void }) {
  const { db, me, run, toast } = useStore();
  const next = NEXT_FINDING[f.status];
  const task = db.tasks.find((t) => t.title === `פיקוח: ${f.title}`.slice(0, 90) && t.projectId === f.projectId);
  return (
    <article className="finding">
      {f.photo ? <StoredImage bucket="site-photos" src={f.photo} alt={`תמונה: ${f.title}`} className="finding-photo" /> : <span className={cx('finding-photo none', f.severity)} aria-hidden><LuHardHat /></span>}
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="row between wrap g8"><h3 className="finding-title">{f.title}</h3><span className="row g4"><Badge tone={SEVERITY[f.severity].tone}>חומרה {SEVERITY[f.severity].label}</Badge><Badge tone={FINDING_STATUS[f.status].tone} dot>{FINDING_STATUS[f.status].label}</Badge></span></div>
        <div className="xs muted row wrap g12 mt4">
          {f.location ? <span className="row g4"><LuMapPin aria-hidden style={{ width: 12 }} />{f.location}</span> : null}
          {f.responsible ? <span className="row g4"><LuUser aria-hidden style={{ width: 12 }} />{f.responsible}</span> : null}
          {f.dueOn ? <span className={cx('row g4', f.status === 'open' && daysFromToday(f.dueOn) < 0 && 'bad-t bold')}><LuCalendarClock aria-hidden style={{ width: 12 }} />עד {date(f.dueOn)}</span> : null}
        </div>
        <div className="row g4 wrap mt8">
          <Btn size="xs" kind={f.status === 'open' ? 'primary' : ''} icon={LuCheck} onClick={() => { run(A.setFindingStatus, f.id, next); toast(`הממצא סומן: ${FINDING_STATUS[next].label}`); }}>{f.status === 'open' ? 'סימון כתוקן' : f.status === 'fixed' ? 'אימות התיקון' : 'פתיחה מחדש'}</Btn>
          {task ? <span className="xs muted">יש משימה</span> : <Btn size="xs" icon={LuListChecks} onClick={() => { run(A.findingToTask, f.id, uid('t'), me.id); toast('נוצרה משימה מהממצא'); }}>משימה</Btn>}
          <IconBtn icon={LuPencil} label={`עריכת ${f.title}`} onClick={onEdit} />
        </div>
      </div>
    </article>
  );
}

function VisitForm({ projectId, v, onClose }: { projectId: string; v?: T.SiteVisit; onClose: (id?: string) => void }) {
  const { db, me, run, toast } = useStore();
  const team = db.assignments.filter((a) => a.projectId === projectId).map((a) => db.users.find((u) => u.id === a.userId)?.name).filter(Boolean);
  const [f, setF] = useState({ date: v?.date || todayISO, attendees: v?.attendees ?? me.name, summary: v?.summary || '' });
  return (
    <Modal title={v ? 'עריכת ביקור' : 'ביקור פיקוח חדש'} onClose={() => onClose()} foot={<>
      <Btn kind="primary" onClick={() => { const row: T.SiteVisit = v ? { ...v, ...f } : { id: uid('sv'), projectId, ...f, status: 'draft', createdBy: me.id }; run(A.saveVisit, row, !v); toast(v ? 'הביקור עודכן' : 'הביקור נשמר כטיוטה'); onClose(row.id); }}>שמירה</Btn>
      <Btn kind="ghost" onClick={() => onClose()}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="תאריך הביקור" htmlFor="vf-d"><Input id="vf-d" type="date" value={f.date} onChange={(e: any) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="נכחו" hint={team.length ? 'צוות: ' + team.join(', ') : undefined} htmlFor="vf-a"><Input id="vf-a" value={f.attendees} onChange={(e: any) => setF({ ...f, attendees: e.target.value })} /></Field>
        <Field label="סיכום הביקור" full hint="מה נבדק, מה המצב באתר ומה הצעד הבא" htmlFor="vf-s"><Textarea id="vf-s" rows={5} value={f.summary} maxLength={6000} onChange={(e: any) => setF({ ...f, summary: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function FindingForm({ v, f: f0, onClose }: { v: T.SiteVisit; f: T.SiteFinding | null; onClose: () => void }) {
  const { run, toast } = useStore();
  const storeImage = useStoreImage();
  const [f, setF] = useState<T.SiteFinding>(f0 || { id: uid('sf'), projectId: v.projectId, visitId: v.id, title: '', location: '', responsible: '', severity: 'medium', status: 'open' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const pick = async (file: File) => { setBusy(true); const p = await storeImage(file, 'site-photos', v.projectId); setBusy(false); if (p) setF((x) => ({ ...x, photo: p })); };
  return (
    <Modal title={f0 ? 'עריכת ממצא' : 'ממצא חדש'} onClose={onClose} foot={<>
      <Btn kind="primary" disabled={busy} onClick={() => { if (!f.title.trim()) { setErr('יש לתאר את הממצא'); return; } run(A.saveFinding, { ...f, title: f.title.trim() }, !f0); toast(f0 ? 'הממצא עודכן' : 'הממצא נוסף'); onClose(); }}>{busy ? 'מעלה תמונה…' : 'שמירה'}</Btn>
      <Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {f0 ? <Btn kind="danger" icon={LuTrash2} style={{ marginInlineStart: 'auto' }} onClick={() => { run(A.deleteFinding, f0.id); toast('הממצא נמחק'); onClose(); }}>מחיקה</Btn> : null}</>}>
      <div className="form-grid">
        <Field label="מה נמצא *" full error={err} htmlFor="ff-t"><Input id="ff-t" value={f.title} invalid={err} maxLength={200} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder="לדוגמה: חסר איטום בפינת המקלחת" /></Field>
        <Field label="מיקום" htmlFor="ff-l"><Input id="ff-l" value={f.location} onChange={(e: any) => setF({ ...f, location: e.target.value })} placeholder="חדר רחצה הורים" /></Field>
        <Field label="באחריות" htmlFor="ff-r"><Input id="ff-r" value={f.responsible} onChange={(e: any) => setF({ ...f, responsible: e.target.value })} placeholder="קבלן / ספק / יועץ" /></Field>
        <Field label="חומרה" htmlFor="ff-s"><Select id="ff-s" value={f.severity} onChange={(e: any) => setF({ ...f, severity: e.target.value })} options={Object.entries(SEVERITY).map(([k, x]) => ({ value: k, label: x.label }))} /></Field>
        <Field label="לתקן עד" htmlFor="ff-d"><Input id="ff-d" type="date" value={f.dueOn || ''} onChange={(e: any) => setF({ ...f, dueOn: e.target.value || undefined })} /></Field>
        <div className="field full">
          <span className="lbl">תמונה מהאתר</span>
          <div className="row g8 wrap" style={{ alignItems: 'center' }}>
            {f.photo ? <StoredImage bucket="site-photos" src={f.photo} alt="תמונת הממצא" className="finding-photo" /> : null}
            <CameraButton onFile={pick} />
            <ImagePick id="ff-photo" onFile={pick} label={f.photo ? 'החלפת תמונה' : 'בחירת תמונה'} />
            {f.photo ? <Btn size="sm" kind="ghost" onClick={() => setF({ ...f, photo: undefined })}>הסרה</Btn> : null}
          </div>
          <span className="hint">{IS_LIVE ? 'התמונה נשמרת באחסון פרטי של המשרד.' : 'בדמו התמונה מוקטנת ונשמרת רק בדפדפן הזה.'}</span>
        </div>
      </div>
    </Modal>
  );
}

/** the printable report: also what the client reads in the portal */
export function SiteReport({ v }: { v: T.SiteVisit }) {
  const { db } = useStore();
  const p = projectOf(db, v.projectId)!;
  const fs = db.siteFindings.filter((f) => f.visitId === v.id);
  return (
    <div className="site-report">
      <header className="sr-head">
        <BrandMark size={44} />
        <div className="grow"><div className="bold">{db.office.name}</div><div className="xs muted">{[db.office.address, db.office.city, db.office.phone].filter(Boolean).join(' · ')}</div></div>
        <div className="t-left"><div className="eyebrow">דו״ח פיקוח עליון</div><div className="bold">{date(v.date)}</div></div>
      </header>
      <h2 className="sr-title">{p.name}</h2>
      <div className="small muted">{p.address}, {p.city}{v.attendees ? ` · נכחו: ${v.attendees}` : ''}</div>
      {v.summary ? <p className="pre-wrap mt12">{v.summary}</p> : null}
      <h3 className="mt16">ממצאים ({fs.length})</h3>
      <ol className="sr-findings">
        {fs.map((f) => (
          <li key={f.id}>
            {f.photo ? <StoredImage bucket="site-photos" src={f.photo} alt={`תמונה: ${f.title}`} className="sr-photo" /> : null}
            <div><b>{f.title}</b><div className="small">{[f.location && 'מיקום: ' + f.location, f.responsible && 'באחריות: ' + f.responsible, f.dueOn && 'לתיקון עד ' + date(f.dueOn)].filter(Boolean).join(' · ')}</div><div className="xs">חומרה {SEVERITY[f.severity].label} · {FINDING_STATUS[f.status].label}</div></div>
          </li>
        ))}
      </ol>
      <footer className="sr-foot xs muted">דו״ח פיקוח עליון של המתכנן. אינו מהווה אישור הנדסי, אישור קונסטרוקטיבי או תחליף לפיקוח צמוד של הקבלן.</footer>
    </div>
  );
}

function ReportPreview({ v, onClose }: { v: T.SiteVisit; onClose: () => void }) {
  return (
    <Modal title="דו״ח פיקוח" size="wide" onClose={onClose} foot={<><Btn kind="primary" icon={LuPrinter} onClick={() => window.print()}>הדפסה / שמירה כ-PDF</Btn><Btn kind="ghost" onClick={onClose}>סגירה</Btn></>}>
      <div className="print-area"><SiteReport v={v} /></div>
    </Modal>
  );
}
