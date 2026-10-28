// Building permit tracking and the project's consultants.
import { useState } from 'react';
import { LuLandmark, LuPlus, LuPencil, LuArrowLeft, LuTrash2, LuPhone, LuMail, LuUsers, LuSparkles } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, projectOf } from '../data/api';
import { PERMIT_STAGES, PERMIT_REJECTED, permitLabel, REQUEST_TYPES, CONSULTANT_DISCIPLINES, CONSULTANT_STATUS, PHASE_TEMPLATES, guessTemplate } from '../data/architect';
import type * as T from '../data/types';
import { daysFromToday } from '../data/dates';
import { Btn, Card, Badge, Empty, Modal, Field, Input, Select, Textarea, Callout, KV, DataTable, IconBtn, Confirm, cx } from '../ui/core';
import { date, relDay } from '../lib/format';

export function ProjectPermit({ projectId }: { projectId: string }) {
  const { db, me } = useStore();
  const permits = db.permits.filter((p) => p.projectId === projectId);
  const [edit, setEdit] = useState<T.Permit | 'new' | null>(null);
  const staff = me.role !== 'client';
  return (
    <div className="stack-lg">
      {permits.length ? permits.map((pm) => <PermitCard key={pm.id} pm={pm} onEdit={() => setEdit(pm)} />) : (
        <div className="card"><Empty icon={LuLandmark} title="אין תיק רישוי לפרויקט" action={staff ? <Btn kind="primary" icon={LuPlus} onClick={() => setEdit('new')}>פתיחת תיק רישוי</Btn> : null}>
          מעקב אחרי בקשה להיתר: מתיק המידע ועד קבלת ההיתר, עם מספר תיק, מועדי ועדה ותנאים.
        </Empty></div>
      )}
      {permits.length && staff ? <div><Btn size="sm" icon={LuPlus} onClick={() => setEdit('new')}>בקשה נוספת</Btn></div> : null}
      <Consultants projectId={projectId} />
      <span className="xs muted">שלבי הרישוי כאן הם מבנה עבודה כללי למעקב. ההליך בפועל, המסמכים והמועדים נקבעים בוועדה ובמערכת רישוי זמין.</span>
      {edit ? <PermitForm projectId={projectId} pm={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

export function PermitStepper({ stage, compact }: { stage: T.PermitStage; compact?: boolean }) {
  const cur = stage === 'rejected' ? -1 : PERMIT_STAGES.findIndex((s) => s.id === stage);
  return (
    <ol className={cx('permit-steps', compact && 'compact')} aria-label={`שלב הרישוי: ${permitLabel(stage)}`}>
      {PERMIT_STAGES.map((s, i) => (
        <li key={s.id} className={cx(i < cur && 'done', i === cur && (s.id === 'granted' ? 'done now' : 'now'))} aria-current={i === cur ? 'step' : undefined}>
          <span className="ps-dot" aria-hidden />
          <span className="ps-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

function PermitCard({ pm, onEdit }: { pm: T.Permit; onEdit: () => void }) {
  const { me, run, toast } = useStore();
  const staff = me.role !== 'client';
  const i = PERMIT_STAGES.findIndex((s) => s.id === pm.stage);
  const next = pm.stage !== 'rejected' && i >= 0 && i < PERMIT_STAGES.length - 1 ? PERMIT_STAGES[i + 1] : null;
  const expSoon = pm.expiresOn && daysFromToday(pm.expiresOn) <= 90;
  return (
    <Card title={pm.requestType || 'בקשה להיתר'} icon={LuLandmark} actions={<>
      {pm.stage === 'rejected' ? <Badge tone="bad" dot>{PERMIT_REJECTED.label}</Badge> : <Badge tone={pm.stage === 'granted' ? 'ok' : 'info'} dot>{permitLabel(pm.stage)}</Badge>}
      {staff ? <IconBtn icon={LuPencil} label="עריכת תיק הרישוי" onClick={onEdit} /> : null}
    </>}>
      <div className="stack">
        <PermitStepper stage={pm.stage} />
        {pm.stage !== 'rejected' && PERMIT_STAGES[i] ? <p className="small muted">{PERMIT_STAGES[i].hint}</p> : null}
        <KV items={[
          ['רשות', pm.authority || '—'],
          ['מספר תיק / בקשה', pm.fileNumber ? <span className="ltr num">{pm.fileNumber}</span> : '—'],
          ['תיק מידע', pm.infoFileOn ? date(pm.infoFileOn) : '—'],
          ['הגשה', pm.submittedOn ? date(pm.submittedOn) : '—'],
          ['דיון בוועדה', pm.committeeOn ? <span className={cx(daysFromToday(pm.committeeOn) >= 0 && daysFromToday(pm.committeeOn) < 14 && 'bold')}>{date(pm.committeeOn)}{daysFromToday(pm.committeeOn) >= 0 && daysFromToday(pm.committeeOn) < 30 ? ` · ${relDay(pm.committeeOn)}` : ''}</span> : '—'],
          ['היתר התקבל', pm.grantedOn ? date(pm.grantedOn) : '—'],
          ...(pm.expiresOn ? [['תוקף עד', <span className={cx(expSoon && 'bad-t bold')}>{date(pm.expiresOn)}</span>] as [string, any]] : []),
        ]} />
        {pm.notes ? <Callout kind="info">{pm.notes}</Callout> : null}
        {staff ? (
          <div className="row g8 wrap">
            {next ? <Btn kind="primary" size="sm" icon={LuArrowLeft} onClick={() => { run(A.setPermitStage, pm.id, next.id); toast(`הרישוי עבר לשלב "${next.label}"`); }}>מעבר ל{next.label}</Btn> : null}
            <Select className="sm" style={{ width: 'auto' }} aria-label="שינוי שלב רישוי" value={pm.stage} onChange={(e: any) => { run(A.setPermitStage, pm.id, e.target.value); toast(`שלב הרישוי: ${permitLabel(e.target.value)}`); }} options={[...PERMIT_STAGES.map((s) => ({ value: s.id, label: s.label })), { value: 'rejected', label: PERMIT_REJECTED.label }]} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function PermitForm({ projectId, pm, onClose }: { projectId: string; pm: T.Permit | null; onClose: () => void }) {
  const { db, run, toast } = useStore();
  const p = projectOf(db, projectId)!;
  const [f, setF] = useState<T.Permit>(pm || { id: uid('pm'), projectId, authority: p.city ? `הוועדה המקומית ${p.city}` : '', fileNumber: '', requestType: REQUEST_TYPES[0], stage: 'info_file', notes: '' });
  const [del, setDel] = useState(false);
  const d = (k: keyof T.Permit) => ({ id: 'pf-' + k, type: 'date', value: (f[k] as string) || '', onChange: (e: any) => setF({ ...f, [k]: e.target.value || undefined }) });
  return (
    <Modal title={pm ? 'עריכת תיק רישוי' : 'תיק רישוי חדש'} sub={p.name} onClose={onClose} foot={<>
      <Btn kind="primary" onClick={() => { run(A.savePermit, f, !pm); toast(pm ? 'תיק הרישוי עודכן' : 'תיק הרישוי נפתח'); onClose(); }}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {pm ? <Btn kind="danger" icon={LuTrash2} style={{ marginInlineStart: 'auto' }} onClick={() => setDel(true)}>מחיקה</Btn> : null}</>}>
      <div className="form-grid">
        <Field label="סוג הבקשה" htmlFor="pf-t"><Select id="pf-t" value={f.requestType} onChange={(e: any) => setF({ ...f, requestType: e.target.value })} options={[...new Set([...REQUEST_TYPES, f.requestType])].filter(Boolean)} /></Field>
        <Field label="רשות / ועדה" htmlFor="pf-a"><Input id="pf-a" value={f.authority} onChange={(e: any) => setF({ ...f, authority: e.target.value })} /></Field>
        <Field label="מספר תיק / בקשה" htmlFor="pf-n"><Input id="pf-n" className="ltr" value={f.fileNumber} onChange={(e: any) => setF({ ...f, fileNumber: e.target.value })} /></Field>
        <Field label="שלב" htmlFor="pf-s"><Select id="pf-s" value={f.stage} onChange={(e: any) => setF({ ...f, stage: e.target.value })} options={[...PERMIT_STAGES.map((s) => ({ value: s.id, label: s.label })), { value: 'rejected', label: PERMIT_REJECTED.label }]} /></Field>
        <Field label="תיק מידע התקבל" htmlFor="pf-infoFileOn"><Input {...d('infoFileOn')} /></Field>
        <Field label="תאריך הגשה" htmlFor="pf-submittedOn"><Input {...d('submittedOn')} /></Field>
        <Field label="מועד דיון בוועדה" htmlFor="pf-committeeOn"><Input {...d('committeeOn')} /></Field>
        <Field label="היתר התקבל" htmlFor="pf-grantedOn"><Input {...d('grantedOn')} /></Field>
        <Field label="תוקף ההיתר עד" htmlFor="pf-expiresOn"><Input {...d('expiresOn')} /></Field>
        <Field label="הערות, תנאים ודרישות" full htmlFor="pf-notes"><Textarea id="pf-notes" rows={3} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
      {del && pm ? <Confirm title="מחיקת תיק רישוי" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deletePermit, pm.id); toast('תיק הרישוי נמחק'); onClose(); }}>המחיקה סופית.</Confirm> : null}
    </Modal>
  );
}

function Consultants({ projectId }: { projectId: string }) {
  const { db, me, run, toast } = useStore();
  const rows = db.consultants.filter((c) => c.projectId === projectId);
  const [edit, setEdit] = useState<T.Consultant | 'new' | null>(null);
  if (me.role === 'client') return null;
  const p = projectOf(db, projectId)!;
  const suggested = (PHASE_TEMPLATES.find((t) => t.id === guessTemplate(p.type))?.consultants || []).filter((d) => !rows.some((r) => r.discipline === d));
  const missing = rows.filter((r) => r.status === 'needed').length;
  return (
    <Card title="יועצים" icon={LuUsers} pad={false} actions={<>
      {missing ? <Badge tone="warn">{missing} עוד לא נבחרו</Badge> : null}
      {suggested.length ? <Btn size="sm" icon={LuSparkles} onClick={() => { run(A.addConsultants, projectId, suggested); toast(`נוספו ${suggested.length} יועצים נדרשים`); }}>הוספת היועצים המקובלים ({suggested.length})</Btn> : null}
      <Btn size="sm" icon={LuPlus} onClick={() => setEdit('new')}>יועץ</Btn>
    </>}>
      <DataTable rows={rows} empty={<Empty title="עוד לא נוספו יועצים">הוסיפו את היועצים שהפרויקט צריך ועקבו מי כבר מסר תכניות.</Empty>} columns={[
        { key: 'discipline', label: 'תחום', render: (c: T.Consultant) => <b>{c.discipline}</b> },
        { key: 'name', label: 'שם', render: (c: T.Consultant) => c.name ? <span className="col" style={{ gap: 2 }}><span>{c.name}</span><span className="xs muted row g8 wrap">{c.phone ? <a className="row g4 ltr" href={`tel:${c.phone}`}><LuPhone aria-hidden style={{ width: 12 }} />{c.phone}</a> : null}{c.email ? <a className="row g4 ltr" href={`mailto:${c.email}`}><LuMail aria-hidden style={{ width: 12 }} />{c.email}</a> : null}</span></span> : <span className="small muted">טרם נבחר</span> },
        { key: 'status', label: 'סטטוס', render: (c: T.Consultant) => <Select className="sm inline-edit" style={{ width: 'auto', minWidth: 140 }} aria-label={`סטטוס ${c.discipline}`} value={c.status} onChange={(e: any) => { run(A.saveConsultant, { ...c, status: e.target.value }, false); toast('הסטטוס עודכן'); }} options={Object.entries(CONSULTANT_STATUS).map(([v, x]) => ({ value: v, label: x.label }))} /> },
        { key: 'dueOn', label: 'מועד מסירה', render: (c: T.Consultant) => c.dueOn ? <span className={cx('small', c.status !== 'delivered' && daysFromToday(c.dueOn) < 0 && 'bad-t bold')}>{date(c.dueOn)}</span> : <span className="small muted">—</span> },
        { key: 'act', label: '', sortable: false, render: (c: T.Consultant) => <IconBtn icon={LuPencil} label={`עריכת ${c.discipline}`} onClick={() => setEdit(c)} /> },
      ]} />
      {edit ? <ConsultantForm projectId={projectId} c={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
    </Card>
  );
}

function ConsultantForm({ projectId, c, onClose }: { projectId: string; c: T.Consultant | null; onClose: () => void }) {
  const { run, toast } = useStore();
  const [f, setF] = useState<T.Consultant>(c || { id: uid('cs'), projectId, discipline: CONSULTANT_DISCIPLINES[0], name: '', phone: '', email: '', status: 'needed', notes: '' });
  const [err, setErr] = useState('');
  return (
    <Modal title={c ? 'עריכת יועץ' : 'יועץ חדש'} size="narrow" onClose={onClose} foot={<>
      <Btn kind="primary" onClick={() => { if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) { setErr('מייל לא תקין'); return; } run(A.saveConsultant, f, !c); toast(c ? 'היועץ עודכן' : 'היועץ נוסף'); onClose(); }}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {c ? <Btn kind="danger" icon={LuTrash2} style={{ marginInlineStart: 'auto' }} onClick={() => { run(A.deleteConsultant, c.id); toast('היועץ הוסר'); onClose(); }}>הסרה</Btn> : null}</>}>
      <div className="form-grid">
        <Field label="תחום" htmlFor="cf-d"><Select id="cf-d" value={f.discipline} onChange={(e: any) => setF({ ...f, discipline: e.target.value })} options={[...new Set([...CONSULTANT_DISCIPLINES, f.discipline])]} /></Field>
        <Field label="סטטוס" htmlFor="cf-s"><Select id="cf-s" value={f.status} onChange={(e: any) => setF({ ...f, status: e.target.value })} options={Object.entries(CONSULTANT_STATUS).map(([v, x]) => ({ value: v, label: x.label }))} /></Field>
        <Field label="שם היועץ / המשרד" full htmlFor="cf-n"><Input id="cf-n" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="טלפון" htmlFor="cf-p"><Input id="cf-p" className="ltr" type="tel" value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="מייל" error={err} htmlFor="cf-e"><Input id="cf-e" className="ltr" type="email" value={f.email} invalid={err} onChange={(e: any) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="מועד מסירת תכניות" htmlFor="cf-due"><Input id="cf-due" type="date" value={f.dueOn || ''} onChange={(e: any) => setF({ ...f, dueOn: e.target.value || undefined })} /></Field>
        <Field label="הערות" full htmlFor="cf-no"><Textarea id="cf-no" rows={2} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
