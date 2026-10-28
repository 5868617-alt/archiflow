// Client brief (opening questionnaire) and the project's mood board – the studio's side and the client's side.
import { useState } from 'react';
import { LuClipboardList, LuSend, LuPlus, LuImage, LuPalette, LuStickyNote, LuEye, LuEyeOff, LuTrash2, LuPencil, LuSave, LuCheck, LuHeart, LuRotateCcw } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, projectOf, clientOf } from '../data/api';
import { BRIEF_SECTIONS, BRIEF_STATUS, briefProgress, REACTIONS } from '../data/architect';
import type * as T from '../data/types';
import { IS_LIVE } from '../data/dates';
import { Btn, Card, Badge, Empty, Modal, Field, Input, Textarea, Callout, Progress, Switch, IconBtn, Confirm, cx } from '../ui/core';
import { StoredImage, useStoreImage, ImagePick } from '../ui/StoredImage';
import { BrandMark } from './Branding';
import { date } from '../lib/format';

// ---------------------------------------------------------------- studio side
export function ProjectBrief({ projectId }: { projectId: string }) {
  return <div className="stack-lg"><BriefCard projectId={projectId} /><MoodBoard projectId={projectId} /></div>;
}

function BriefCard({ projectId }: { projectId: string }) {
  const { db, run, toast } = useStore();
  const b = db.clientBriefs.find((x) => x.projectId === projectId);
  const p = projectOf(db, projectId)!;
  const portal = clientOf(db, p.clientId)?.contacts.filter((c) => c.portal === 'פעיל') || [];
  const [send, setSend] = useState(false);
  const prog = briefProgress(b);
  return (
    <Card title="שאלון פתיחה ללקוח" icon={LuClipboardList} actions={<>
      {b ? <Badge tone={BRIEF_STATUS[b.status].tone} dot>{BRIEF_STATUS[b.status].label}</Badge> : null}
      {!b || b.status === 'draft' ? <Btn size="sm" kind="primary" icon={LuSend} onClick={() => setSend(true)}>שליחה ללקוח</Btn> : null}
      {b?.status === 'submitted' ? <Btn size="sm" icon={LuRotateCcw} onClick={() => setSend(true)}>פתיחה מחדש ללקוח</Btn> : null}
    </>}>
      {!b || b.status === 'draft' ? (
        <div className="stack">
          <p className="small">שאלון של {BRIEF_SECTIONS.reduce((n, s) => n + s.questions.length, 0)} שאלות על מי גר בבית, אילו חללים נחוצים, סגנון, תקציב ולוחות זמנים. הלקוח ממלא אותו בפורטל בקצב שלו, וכשהוא שולח – התשובות מופיעות כאן.</p>
          <div className="row g8 wrap">{BRIEF_SECTIONS.map((s) => <Badge key={s.title}>{s.title}</Badge>)}</div>
        </div>
      ) : (
        <div className="stack">
          <div className="row g12" style={{ alignItems: 'center' }}><div className="grow"><Progress value={prog} tone={b.status === 'submitted' ? 'ok' : ''} /></div><span className="small num">{Math.round(prog * 100)}% נענו</span></div>
          <div className="xs muted">{b.sentAt ? `נשלח ${date(b.sentAt)}` : ''}{b.submittedAt ? ` · הוחזר ${date(b.submittedAt)}` : ''}</div>
          {b.status === 'sent' && prog === 0 ? <span className="small muted">הלקוח עוד לא התחיל למלא.</span> : <BriefAnswers b={b} />}
        </div>
      )}
      {send ? (
        <Confirm title="שליחת שאלון הפתיחה" confirmLabel="שליחה" onClose={() => setSend(false)} onConfirm={() => { run(A.sendBrief, projectId); toast('השאלון נשלח ללקוח'); }}>
          {portal.length ? <span>{portal.map((c) => c.name).join(', ')} יראו את השאלון בפורטל{IS_LIVE ? ' ויקבלו התראה. המייל נכנס לתור השליחה.' : '. בדמו – התראה ומייל מדומים.'}</span>
            : <Callout kind="assume">ללקוח אין עדיין גישה פעילה לפורטל. השאלון יחכה לו שם אחרי שיוזמן.</Callout>}
        </Confirm>
      ) : null}
    </Card>
  );
}

export function BriefAnswers({ b }: { b: T.ClientBrief }) {
  return (
    <div className="brief-answers">
      {BRIEF_SECTIONS.map((s) => {
        const qs = s.questions.filter((q) => { const a = b.answers[q.id]; return Array.isArray(a) ? a.length : a && String(a).trim(); });
        if (!qs.length) return null;
        return (
          <section key={s.title}>
            <h3>{s.title}</h3>
            <dl>{qs.map((q) => { const a = b.answers[q.id]; return [<dt key={q.id + 'q'}>{q.q}</dt>, <dd key={q.id + 'a'}>{Array.isArray(a) ? <span className="row g4 wrap">{a.map((x) => <Badge key={x} tone="accent">{x}</Badge>)}</span> : a}</dd>]; })}</dl>
          </section>
        );
      })}
    </div>
  );
}

function MoodBoard({ projectId }: { projectId: string }) {
  const { db, run, toast } = useStore();
  const items = db.moodItems.filter((m) => m.projectId === projectId).sort((a, b) => a.sort - b.sort);
  const [edit, setEdit] = useState<T.MoodItem | T.MoodItem['kind'] | null>(null);
  const shared = items.filter((m) => m.shared).length;
  const loves = items.filter((m) => m.reaction === 'love').length;
  return (
    <Card title="לוח השראה" icon={LuPalette} actions={<>
      <span className="small muted">{shared} משותפים{loves ? ` · ${loves} ♥` : ''}</span>
      <Btn size="sm" icon={LuImage} onClick={() => setEdit('image')}>תמונה</Btn>
      <Btn size="sm" icon={LuPalette} onClick={() => setEdit('color')}>צבע</Btn>
      <Btn size="sm" icon={LuStickyNote} onClick={() => setEdit('note')}>הערה</Btn>
    </>}>
      {items.length ? (
        <div className="mood-grid">
          {items.map((m) => (
            <article key={m.id} className={cx('mood', m.kind, !m.shared && 'private')}>
              <MoodVisual m={m} />
              <div className="mood-body">
                <div className="row between g4"><b className="ellipsis">{m.title || (m.kind === 'note' ? 'הערה' : 'ללא שם')}</b><IconBtn icon={LuPencil} label={`עריכת ${m.title || 'פריט'}`} onClick={() => setEdit(m)} /></div>
                {m.note && m.kind !== 'note' ? <div className="xs muted">{m.note}</div> : null}
                {m.reaction ? <div className="row g4 wrap"><Badge tone={REACTIONS[m.reaction].tone}>{REACTIONS[m.reaction].emoji} {REACTIONS[m.reaction].label}</Badge></div> : null}
                {m.clientComment ? <div className="xs mood-comment">“{m.clientComment}”</div> : null}
                <Switch id={'ms-' + m.id} checked={m.shared} onChange={() => { run(A.toggleMoodShare, m.id); toast(m.shared ? 'הוסתר מהלקוח' : 'משותף עם הלקוח'); }} label={<span className="xs">{m.shared ? <><LuEye aria-hidden style={{ width: 12 }} /> הלקוח רואה</> : <><LuEyeOff aria-hidden style={{ width: 12 }} /> פנימי</>}</span>} />
              </div>
            </article>
          ))}
        </div>
      ) : <Empty icon={LuPalette} title="הלוח ריק">הוסיפו תמונות, צבעים והערות, ושתפו עם הלקוח את מה שמוכן. הלקוח יכול לסמן מה הוא אוהב ולהגיב.</Empty>}
      {edit ? <MoodForm projectId={projectId} item={typeof edit === 'string' ? null : edit} kind={typeof edit === 'string' ? edit : edit.kind} count={items.length} onClose={() => setEdit(null)} /> : null}
    </Card>
  );
}

function MoodVisual({ m }: { m: T.MoodItem }) {
  if (m.kind === 'image') return <StoredImage bucket="moodboard" src={m.image} alt={m.title || 'תמונת השראה'} className="mood-img" />;
  if (m.kind === 'color') return <div className="mood-img mood-color" style={{ background: m.color }}><span className="ltr" style={{ color: inkFor(m.color) }}>{m.color}</span></div>;
  return <div className="mood-img mood-note"><p>{m.note}</p></div>;
}
const inkFor = (hex?: string) => { if (!hex) return '#000'; const n = parseInt(hex.slice(1), 16); const L = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return L > 0.6 ? '#1E1A1C' : '#FFFFFF'; };

function MoodForm({ projectId, item, kind, count, onClose }: { projectId: string; item: T.MoodItem | null; kind: T.MoodItem['kind']; count: number; onClose: () => void }) {
  const { run, toast } = useStore();
  const storeImage = useStoreImage();
  const [f, setF] = useState<T.MoodItem>(item || { id: uid('mi'), projectId, kind, title: '', note: '', color: kind === 'color' ? '#D9C3B0' : undefined, shared: false, clientComment: '', sort: count });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = async (file: File) => { setBusy(true); const p = await storeImage(file, 'moodboard', projectId); setBusy(false); if (p) setF((x) => ({ ...x, image: p })); };
  const save = () => {
    if (f.kind === 'image' && !f.image) { setErr('יש לבחור תמונה'); return; }
    if (f.kind === 'note' && !f.note.trim()) { setErr('יש לכתוב הערה'); return; }
    run(A.saveMood, f, !item); toast(item ? 'הפריט עודכן' : 'נוסף ללוח'); onClose();
  };
  const title = { image: 'תמונת השראה', color: 'צבע', note: 'הערה' }[f.kind];
  return (
    <Modal title={item ? `עריכת ${title}` : `${title} חדשה`} size="narrow" onClose={onClose} foot={<>
      <Btn kind="primary" disabled={busy} onClick={save}>{busy ? 'מעלה…' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {item ? <Btn kind="danger" icon={LuTrash2} style={{ marginInlineStart: 'auto' }} onClick={() => { run(A.deleteMood, item.id); toast('הפריט הוסר'); onClose(); }}>הסרה</Btn> : null}</>}>
      <div className="stack">
        {f.kind === 'image' ? (
          <div className="stack">
            {f.image ? <StoredImage bucket="moodboard" src={f.image} alt="תצוגה מקדימה" className="mood-img" style={{ maxHeight: 200 }} /> : null}
            <div className="row g8"><ImagePick id="mf-img" onFile={pick} label={f.image ? 'החלפת תמונה' : 'בחירת תמונה'} /></div>
            {err ? <span className="err" role="alert">{err}</span> : null}
            <span className="xs muted">השתמשו בתמונות שצילמתם או שיש לכם זכות להשתמש בהן.</span>
          </div>
        ) : null}
        {f.kind === 'color' ? <Field label="צבע" htmlFor="mf-c"><span className="row g8"><input id="mf-c" type="color" value={f.color || '#D9C3B0'} onChange={(e) => setF({ ...f, color: e.target.value })} style={{ width: 56, height: 40 }} /><Input aria-label="קוד צבע" className="ltr" style={{ maxWidth: 120 }} value={f.color || ''} onChange={(e: any) => setF({ ...f, color: e.target.value })} /></span></Field> : null}
        <Field label="כותרת" htmlFor="mf-t"><Input id="mf-t" value={f.title} maxLength={120} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder={f.kind === 'color' ? 'לדוגמה: חול חם לקירות' : 'לדוגמה: אריח למקלחת'} /></Field>
        <Field label={f.kind === 'note' ? 'ההערה *' : 'הערה'} error={f.kind === 'note' ? err : ''} htmlFor="mf-n"><Textarea id="mf-n" rows={3} value={f.note} maxLength={1000} onChange={(e: any) => setF({ ...f, note: e.target.value })} /></Field>
        <Switch id="mf-s" checked={f.shared} onChange={(v: boolean) => setF({ ...f, shared: v })} label="להציג ללקוח בפורטל" />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- client side (portal)
export function PortalBrief({ project }: { project: T.Project }) {
  const { db, run, toast } = useStore();
  const b = db.clientBriefs.find((x) => x.projectId === project.id && x.status !== 'draft');
  const [ans, setAns] = useState<T.ClientBrief['answers']>(() => ({ ...(b?.answers || {}) }));
  const [sub, setSub] = useState(false);
  if (!b) return <><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>שאלון פתיחה</h1><div className="card"><Empty icon={LuClipboardList} title="אין שאלון פתוח">כשהמשרד ישלח שאלון, הוא יופיע כאן.</Empty></div></>;
  if (b.status === 'submitted') return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>שאלון פתיחה</h1><p className="soft">תודה! התשובות נשלחו ל{db.office.name} ב-{date(b.submittedAt)}.</p></div>
      <Card title="התשובות שלך"><BriefAnswers b={b} /></Card>
      <span className="small muted">רוצים לשנות משהו? כתבו למשרד, והם יכולים לפתוח את השאלון מחדש.</span>
    </>
  );
  const set = (id: string, v: string | string[]) => setAns((a) => ({ ...a, [id]: v }));
  const prog = briefProgress({ ...b, answers: ans });
  return (
    <>
      <div className="brief-hero">
        <BrandMark size={40} />
        <div className="grow"><h1 className="display" style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>שאלון פתיחה</h1><p className="soft" style={{ margin: 0 }}>כמה שאלות שיעזרו ל{db.office.name} להכיר אתכם. אפשר לשמור ולחזור בכל זמן.</p></div>
      </div>
      <div className="row g12" style={{ alignItems: 'center' }}><div className="grow"><Progress value={prog} /></div><span className="small num">{Math.round(prog * 100)}%</span></div>
      {BRIEF_SECTIONS.map((s, si) => (
        <Card key={s.title} title={`${si + 1}. ${s.title}`}>
          <div className="stack-lg">
            {s.questions.map((q) => {
              const v = ans[q.id];
              const id = 'bq-' + q.id;
              if (q.type === 'choice' || q.type === 'multi') return (
                <fieldset key={q.id} className="brief-q">
                  <legend>{q.q}</legend>
                  <div className="chips">{q.options!.map((o) => {
                    const on = q.type === 'multi' ? Array.isArray(v) && v.includes(o) : v === o;
                    return <button key={o} type="button" className={cx('chip', on && 'on')} aria-pressed={on} onClick={() => q.type === 'multi' ? set(q.id, on ? (v as string[]).filter((x) => x !== o) : [...((Array.isArray(v) ? v : []) as string[]), o]) : set(q.id, on ? '' : o)}>{on ? <LuCheck aria-hidden style={{ width: 14 }} /> : null}{o}</button>;
                  })}</div>
                </fieldset>
              );
              return <Field key={q.id} label={q.q} hint={q.hint} htmlFor={id}>{q.type === 'long' ? <Textarea id={id} rows={3} value={(v as string) || ''} maxLength={1500} onChange={(e: any) => set(q.id, e.target.value)} /> : <Input id={id} value={(v as string) || ''} maxLength={300} onChange={(e: any) => set(q.id, e.target.value)} />}</Field>;
            })}
          </div>
        </Card>
      ))}
      <div className="row g8 wrap sticky-actions">
        <Btn kind="primary" icon={LuSend} onClick={() => setSub(true)}>שליחה למשרד</Btn>
        <Btn icon={LuSave} onClick={() => { run(A.saveBriefAnswers, b.id, ans, false); toast('נשמר. אפשר להמשיך אחר כך'); }}>שמירה והמשך אחר כך</Btn>
      </div>
      {sub ? <Confirm title="שליחת השאלון" confirmLabel="שליחה" onClose={() => setSub(false)} onConfirm={() => { run(A.saveBriefAnswers, b.id, ans, true); toast('תודה! השאלון נשלח למשרד'); }}>{prog < 1 ? `ענית על ${Math.round(prog * 100)}% מהשאלות. אפשר לשלוח גם כך.` : 'כל השאלות נענו.'} אחרי השליחה השאלון ננעל לעריכה.</Confirm> : null}
    </>
  );
}

export function PortalInspiration({ project }: { project: T.Project }) {
  const { db } = useStore();
  const items = db.moodItems.filter((m) => m.projectId === project.id && m.shared).sort((a, b) => a.sort - b.sort);
  return (
    <>
      <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>לוח השראה</h1><p className="soft">חומרים, צבעים ורעיונות ש{db.office.name} מציעים. סמנו מה אתם אוהבים – זה עוזר לנו לדייק.</p></div>
      {items.length ? <div className="mood-grid">{items.map((m) => <ClientMood key={m.id} m={m} />)}</div> : <div className="card"><Empty icon={LuHeart} title="הלוח עוד ריק">המשרד יוסיף כאן השראה בקרוב.</Empty></div>}
      <span className="xs muted">התגובות שלכם הן העדפה ולא אישור רשמי. אישור פריט לביצוע נעשה במסך "לאישורי".</span>
    </>
  );
}

function ClientMood({ m }: { m: T.MoodItem }) {
  const { run, toast } = useStore();
  const [c, setC] = useState(m.clientComment);
  const [open, setOpen] = useState(false);
  const react = (r: T.MoodItem['reaction']) => { const next = m.reaction === r ? null : r; run(A.reactMood, m.id, next, c); toast(next ? `סימנת: ${REACTIONS[next].label}` : 'הסימון בוטל'); };
  return (
    <article className="mood">
      <MoodVisual m={m} />
      <div className="mood-body">
        <b>{m.title || 'השראה'}</b>
        {m.note && m.kind !== 'note' ? <div className="xs muted">{m.note}</div> : null}
        <div className="row g4 wrap" role="group" aria-label={`התגובה שלך ל${m.title || 'פריט'}`}>
          {(Object.keys(REACTIONS) as NonNullable<T.MoodItem['reaction']>[]).map((r) => <button key={r} type="button" className={cx('react-btn', r, m.reaction === r && 'on')} aria-pressed={m.reaction === r} onClick={() => react(r)}><span aria-hidden>{REACTIONS[r].emoji}</span>{REACTIONS[r].label}</button>)}
        </div>
        {open ? (
          <div className="stack" style={{ gap: 6 }}>
            <Textarea aria-label="הערה למשרד" rows={2} value={c} maxLength={1000} onChange={(e: any) => setC(e.target.value)} />
            <div className="row g4"><Btn size="xs" kind="primary" onClick={() => { run(A.reactMood, m.id, m.reaction || null, c.trim()); toast('ההערה נשלחה למשרד'); setOpen(false); }}>שליחה</Btn><Btn size="xs" kind="ghost" onClick={() => setOpen(false)}>ביטול</Btn></div>
          </div>
        ) : <button type="button" className="linkish xs" onClick={() => setOpen(true)}>{m.clientComment ? `“${m.clientComment}” · עריכה` : 'הוספת הערה'}</button>}
      </div>
    </article>
  );
}
