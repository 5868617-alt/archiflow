// Project phases with the studio fee tied to each phase, hours per phase and profitability.
import { useState } from 'react';
import { LuPlay, LuCheck, LuPlus, LuPencil, LuTrash2, LuSend, LuClock, LuRotateCcw, LuLayoutTemplate, LuTrendingUp, LuLink2 } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, phasesOf, canSeeFinance, canSeeRates, projectProfit, projectOf, clientOf, simulateEmail, uid, hasFeature } from '../data/api';
import { PHASE_TEMPLATES, PHASE_STATUS, guessTemplate } from '../data/architect';
import type * as T from '../data/types';
import { todayISO } from '../data/dates';
import { useAct } from '../live/hooks';
import { Btn, Card, Badge, Empty, Modal, Field, Input, Select, Callout, Progress, StatusBadge, Check, Stat, AssumeTag, cx, IconBtn, Confirm } from '../ui/core';
import { date, ils, num } from '../lib/format';
import { TimeEntryModal } from './Time';

/** sends a fee request: server function on the live site, simulated e-mail in the demo */
export function useFeeRequest() {
  const { run, toast, live } = useStore();
  const act = useAct();
  return (f: T.FeeMilestone) => {
    if (live) { act((api) => api.rpc('send_fee_request', { p_fee: f.id }), 'דרישת התשלום נשלחה ללקוח (חשבונית לא מופקת מכאן)'); return; }
    run(A.setFeeStatus, f.id, 'נשלחה דרישה');
    run((d: any) => { const p = projectOf(d, f.projectId)!; const c = clientOf(d, p.clientId)?.contacts[0]; if (c) simulateEmail(d, c.email, `דרישת תשלום: ${f.title} – ${p.name}`, 'fee_request', `/projects/${p.id}/fees`); });
    toast('דרישת תשלום נרשמה (מדומה – לא הופקה חשבונית)', 'info');
  };
}

export function ProjectPhases({ projectId }: { projectId: string }) {
  const { db, me } = useStore();
  const phases = phasesOf(db, projectId);
  const fin = canSeeFinance(db, me) && hasFeature(db, 'fees');
  const mgr = canSeeRates(me);
  const [tpl, setTpl] = useState(false);
  const [edit, setEdit] = useState<T.ProjectPhase | 'new' | null>(null);
  const [finish, setFinish] = useState<T.ProjectPhase | null>(null);
  const [log, setLog] = useState<number | null | undefined>(undefined);
  const prof = projectProfit(db, projectId);
  const canEdit = me.role !== 'client';
  if (!phases.length) return <SetupPhases projectId={projectId} />;
  const fees = db.feeMilestones.filter((f) => f.projectId === projectId);
  const unlinked = fees.filter((f) => !f.phaseId || !phases.some((p) => p.id === f.phaseId));
  const myHours = (idx: number) => db.timeEntries.filter((e) => e.projectId === projectId && e.userId === me.id && e.phaseIdx === idx).reduce((s, e) => s + e.hours, 0);
  const done = phases.filter((p) => p.status === 'done').length;
  return (
    <div className="grid-main-side">
      <div className="stack-lg" style={{ minWidth: 0 }}>
        <Card title="שלבי התכנון" icon={LuLayoutTemplate} actions={<>
          <span className="small muted">{done}/{phases.length} הושלמו</span>
          {canEdit ? <Btn size="sm" icon={LuPlus} onClick={() => setEdit('new')}>שלב</Btn> : null}
          {canEdit ? <Btn size="sm" kind="ghost" onClick={() => setTpl(true)}>החלפת תבנית</Btn> : null}
        </>} pad={false}>
          <ol className="phase-list">
            {phases.map((ph) => {
              const r = prof.phases.find((x) => x.id === ph.id)!;
              const pf = fees.filter((f) => f.phaseId === ph.id);
              const over = mgr && ph.budgetHours ? r.hours > ph.budgetHours : false;
              return (
                <li key={ph.id} className={cx('phase-row', ph.status)}>
                  <span className="pr-n" aria-hidden>{ph.status === 'done' ? <LuCheck /> : ph.idx + 1}</span>
                  <div className="pr-main">
                    <div className="row between wrap g8">
                      <h3 className="pr-name">{ph.name}</h3>
                      <Badge tone={PHASE_STATUS[ph.status].tone} dot>{PHASE_STATUS[ph.status].label}</Badge>
                    </div>
                    <div className="xs muted row wrap g12">
                      {ph.startedOn ? <span>התחיל {date(ph.startedOn)}</span> : null}
                      {ph.doneOn ? <span>הושלם {date(ph.doneOn)}</span> : null}
                      {mgr ? <span className={cx(over && 'bad-t bold')}>{num(r.hours)} ש׳{ph.budgetHours ? ` מתוך ${num(ph.budgetHours)} מתוכננות` : ''}</span> : <span>השעות שלי: {num(myHours(ph.idx))}</span>}
                    </div>
                    {mgr && ph.budgetHours ? <div className="mt8" style={{ maxWidth: 320 }}><Progress size="sm" value={Math.min(1, r.hours / ph.budgetHours)} tone={over ? 'bad' : r.hours / ph.budgetHours > 0.85 ? 'warn' : ''} /></div> : null}
                    {fin && pf.length ? (
                      <div className="pr-fees">
                        {pf.map((f) => <span key={f.id} className="row g8 wrap"><span className="small">שכ״ט: <b className="num">{ils(f.amount)}</b>{f.pct ? <span className="muted"> ({f.pct}%)</span> : null}</span><StatusBadge s={f.status} /></span>)}
                      </div>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <div className="pr-act row g4 wrap">
                      {ph.status === 'active' ? <Btn size="sm" kind="primary" icon={LuCheck} onClick={() => setFinish(ph)}>סיום שלב</Btn> : null}
                      {ph.status === 'upcoming' ? <PhaseStart ph={ph} /> : null}
                      {ph.status === 'done' ? <PhaseReopen ph={ph} /> : null}
                      <IconBtn icon={LuClock} label={`רישום שעות – ${ph.name}`} onClick={() => setLog(ph.idx)} />
                      <IconBtn icon={LuPencil} label={`עריכת ${ph.name}`} onClick={() => setEdit(ph)} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </Card>
        {fin && unlinked.length ? <UnlinkedFees fees={unlinked} phases={phases} /> : null}
      </div>
      <div className="stack-lg" style={{ minWidth: 0 }}>
        {mgr ? <ProfitCard projectId={projectId} /> : null}
        {canEdit ? <Card title="השעות שלי בפרויקט" icon={LuClock}><div className="stack"><div className="lg bold num">{num(db.timeEntries.filter((e) => e.projectId === projectId && e.userId === me.id).reduce((s, e) => s + e.hours, 0))} שעות</div><Btn icon={LuPlus} onClick={() => setLog(phases.find((p) => p.status === 'active')?.idx ?? null)}>רישום שעות</Btn></div></Card> : null}
      </div>
      {tpl ? <TemplateModal projectId={projectId} replacing onClose={() => setTpl(false)} /> : null}
      {edit ? <PhaseForm projectId={projectId} phase={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
      {finish ? <FinishPhase ph={finish} onClose={() => setFinish(null)} /> : null}
      {log !== undefined ? <TimeEntryModal projectId={projectId} phaseIdx={log} onClose={() => setLog(undefined)} /> : null}
    </div>
  );
}

function PhaseStart({ ph }: { ph: T.ProjectPhase }) {
  const { run, toast } = useStore();
  return <Btn size="sm" icon={LuPlay} onClick={() => { run(A.startPhase, ph.id); toast(`השלב "${ph.name}" התחיל`); }}>התחלה</Btn>;
}
function PhaseReopen({ ph }: { ph: T.ProjectPhase }) {
  const { run, toast } = useStore();
  return <Btn size="sm" kind="ghost" icon={LuRotateCcw} onClick={() => { run(A.reopenPhase, ph.id); toast('השלב נפתח מחדש'); }}>פתיחה מחדש</Btn>;
}

function FinishPhase({ ph, onClose }: { ph: T.ProjectPhase; onClose: () => void }) {
  const { db, me, run, toast } = useStore();
  const fin = canSeeFinance(db, me) && hasFeature(db, 'fees');
  const fees = db.feeMilestones.filter((f) => f.phaseId === ph.id && (f.status === 'עתידי' || f.status === 'באיחור'));
  const [send, setSend] = useState(true);
  const feeRequest = useFeeRequest();
  const next = phasesOf(db, ph.projectId).find((x) => x.idx > ph.idx && x.status === 'upcoming');
  return (
    <Modal title={`סיום שלב: ${ph.name}`} size="narrow" onClose={onClose} foot={<>
      <Btn kind="primary" icon={LuCheck} onClick={() => { run(A.completePhase, ph.id); if (fin && send) fees.forEach(feeRequest); toast(next ? `השלב הושלם. עוברים ל"${next.name}"` : 'כל השלבים הושלמו'); onClose(); }}>סיום השלב</Btn>
      <Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <p className="small">השלב יסומן כהושלם{next ? <> והשלב הבא, <b>{next.name}</b>, ייפתח לעבודה</> : ''}. סטטוס הפרויקט לא משתנה.</p>
        {fin && fees.length ? (
          <div className="card tinted pad">
            <Check id="fp-send" checked={send} onChange={setSend} label={<span>לשלוח ללקוח דרישת תשלום: {fees.map((f) => <b key={f.id} className="num"> {ils(f.amount)}</b>)}</span>} />
            <div className="xs muted mt8">הדרישה נרשמת ונשלחת במייל כשהשליחה מחוברת. חשבונית מס לא מופקת מכאן.</div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

function UnlinkedFees({ fees, phases }: { fees: T.FeeMilestone[]; phases: T.ProjectPhase[] }) {
  const { run, toast } = useStore();
  return (
    <Card title="אבני דרך לתשלום שלא שויכו לשלב" icon={LuLink2}>
      <div className="stack">
        <p className="small muted">שייכו כל תשלום לשלב שבסופו הוא נדרש, וכשתסיימו את השלב המערכת תציע לשלוח את הדרישה.</p>
        {fees.map((f) => (
          <div key={f.id} className="row between wrap g8">
            <span className="small"><b>{f.title}</b> · <span className="num">{ils(f.amount)}</span></span>
            <Select className="sm" style={{ width: 'auto' }} aria-label={`שיוך ${f.title} לשלב`} value="" placeholder="שיוך לשלב…" options={phases.map((p) => ({ value: p.id, label: `${p.idx + 1}. ${p.name}` }))} onChange={(e: any) => { if (!e.target.value) return; run(A.linkFeeToPhase, f.id, e.target.value); toast('התשלום שויך לשלב'); }} />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ProfitCard({ projectId }: { projectId: string }) {
  const { db, nav } = useStore();
  const r = projectProfit(db, projectId);
  const margin = r.feeTotal ? r.profit / r.feeTotal : 0;
  return (
    <Card title="רווחיות הפרויקט" icon={LuTrendingUp} actions={<AssumeTag>לפי תעריפי עלות</AssumeTag>}>
      <div className="stack">
        <div className="grid-2 g12">
          <div><div className="xs muted">שכר טרחה</div><b className="num">{ils(r.feeTotal)}</b></div>
          <div><div className="xs muted">עלות שעות</div><b className="num">{ils(r.cost)}</b></div>
          <div><div className="xs muted">שעות שנרשמו</div><b className="num">{num(r.hours)}{r.budgetHours ? <span className="xs muted"> / {num(r.budgetHours)}</span> : null}</b></div>
          <div><div className="xs muted">הכנסה לשעה</div><b className="num">{r.hours ? ils(r.effRate) : '—'}</b></div>
        </div>
        <div className={cx('profit-line', r.profit < 0 ? 'bad' : margin < 0.25 ? 'warn' : 'ok')}>
          <span>{r.profit >= 0 ? 'רווח צפוי' : 'הפסד צפוי'}</span><b className="num">{ils(r.profit)}</b>{r.feeTotal ? <span className="xs">({Math.round(margin * 100)}%)</span> : null}
        </div>
        {r.budgetHours ? <div><div className="xs muted mb8">ניצול שעות מתוכננות</div><Progress value={Math.min(1, r.hours / r.budgetHours)} tone={r.hours > r.budgetHours ? 'bad' : r.hours / r.budgetHours > 0.85 ? 'warn' : ''} /></div> : null}
        {r.missingRates.length ? <Callout kind="assume">ל-{r.missingRates.length} מחברי הצוות אין תעריף עלות, ולכן העלות חסרה. <button type="button" className="linkish" onClick={() => nav('/time?tab=rates')}>הגדרת תעריפים</button></Callout> : null}
        <span className="xs muted">עלות = שעות × תעריף עלות פנימי שהגדרתם לכל אחד (לא שכר בפועל). רק בעלים ומנהלים רואים את הנתונים האלה.</span>
      </div>
    </Card>
  );
}

function SetupPhases({ projectId }: { projectId: string }) {
  const { me } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <Empty icon={LuLayoutTemplate} title="עוד לא הוגדרו שלבי תכנון" action={me.role !== 'client' ? <Btn kind="primary" icon={LuLayoutTemplate} onClick={() => setOpen(true)}>בחירת תבנית שלבים</Btn> : null}>
        בחרו תבנית לפי סוג העבודה – שיפוץ ועיצוב פנים, בית פרטי, מסחרי או תב״ע – ותוכלו לקשור כל תשלום לשלב שבסופו הוא נדרש.
      </Empty>
      {open ? <TemplateModal projectId={projectId} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function TemplateModal({ projectId, replacing, onClose }: { projectId: string; replacing?: boolean; onClose: () => void }) {
  const { db, me, run, toast } = useStore();
  const p = projectOf(db, projectId)!;
  const [sel, setSel] = useState(guessTemplate(p.type));
  const fees = db.feeMilestones.filter((f) => f.projectId === projectId);
  const fin = canSeeFinance(db, me) && hasFeature(db, 'fees');
  const [withFees, setWithFees] = useState(fin && fees.length === 0 && p.feeTotal > 0);
  const t = PHASE_TEMPLATES.find((x) => x.id === sel)!;
  return (
    <Modal title={replacing ? 'החלפת תבנית שלבים' : 'תבנית שלבים לפרויקט'} sub={p.name} onClose={onClose} foot={<>
      <Btn kind="primary" onClick={() => { run(A.applyPhaseTemplate, projectId, sel, withFees); toast(`הוגדרו ${t.phases.length} שלבים`); onClose(); }}>{replacing ? 'החלפה' : 'הגדרת השלבים'}</Btn>
      <Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <div className="tpl-grid" role="radiogroup" aria-label="סוג העבודה">
          {PHASE_TEMPLATES.map((x) => (
            <label key={x.id} className={cx('tpl-opt', sel === x.id && 'on')}>
              <input type="radio" name="tpl" className="sr-only" checked={sel === x.id} onChange={() => setSel(x.id)} />
              <b>{x.label}</b><span className="xs muted">{x.hint}</span>
            </label>
          ))}
        </div>
        <ol className="tpl-preview small">{t.phases.map((ph) => <li key={ph.name}><span>{ph.name}</span><span className="muted num">{fin ? `${ph.feePct}% · ` : ''}{ph.hours} ש׳</span></li>)}</ol>
        {fin ? (fees.length ? <Callout kind="info">לפרויקט כבר יש {fees.length} אבני דרך לתשלום. הן לא ישתנו, ותוכלו לשייך אותן לשלבים אחר כך.</Callout>
          : p.feeTotal > 0 ? <Check id="tpl-fees" checked={withFees} onChange={setWithFees} label={`ליצור אבני דרך לתשלום לפי האחוזים (מתוך ${ils(p.feeTotal)})`} /> : null) : null}
        {replacing ? <Callout kind="warn">השלבים הנוכחיים יוחלפו. שעות שכבר נרשמו נשארות, אבל ייתכן שיצטרכו שיוך מחדש לשלב.</Callout> : null}
        <span className="xs muted">האחוזים והשעות הם הצעה מקובלת בענף <AssumeTag /> – אפשר לערוך כל שלב אחרי ההגדרה.</span>
      </div>
    </Modal>
  );
}

function PhaseForm({ projectId, phase, onClose }: { projectId: string; phase: T.ProjectPhase | null; onClose: () => void }) {
  const { db, run, toast } = useStore();
  const phases = phasesOf(db, projectId);
  const [f, setF] = useState({ name: phase?.name || '', hours: phase?.budgetHours != null ? String(phase.budgetHours) : '' });
  const [err, setErr] = useState(''); const [del, setDel] = useState(false);
  const save = () => {
    if (!f.name.trim()) { setErr('יש להזין שם'); return; }
    const hours = f.hours === '' ? null : Math.max(0, Number(f.hours));
    if (phase) run(A.savePhase, { ...phase, name: f.name.trim(), budgetHours: hours }, false);
    else run(A.savePhase, { id: uid('ph'), projectId, idx: phases.length ? Math.max(...phases.map((p) => p.idx)) + 1 : 0, name: f.name.trim(), status: 'upcoming', budgetHours: hours }, true);
    toast(phase ? 'השלב עודכן' : 'השלב נוסף'); onClose();
  };
  return (
    <Modal title={phase ? 'עריכת שלב' : 'שלב חדש'} size="narrow" onClose={onClose} foot={<>
      <Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {phase ? <Btn kind="danger" icon={LuTrash2} onClick={() => setDel(true)} style={{ marginInlineStart: 'auto' }}>מחיקה</Btn> : null}</>}>
      <div className="stack">
        <Field label="שם השלב *" error={err} htmlFor="ph-n"><Input id="ph-n" value={f.name} invalid={err} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="שעות מתוכננות" hint="לבקרת רווחיות. אפשר להשאיר ריק." htmlFor="ph-h"><Input id="ph-h" type="number" min={0} step={1} value={f.hours} onChange={(e: any) => setF({ ...f, hours: e.target.value })} /></Field>
      </div>
      {del && phase ? <Confirm title="מחיקת שלב" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deletePhase, phase.id); toast('השלב נמחק'); onClose(); }}>תשלומים ששויכו לשלב יישארו, בלי שיוך.</Confirm> : null}
    </Modal>
  );
}

/** compact phase strip for the project overview and the client portal */
export function PhaseStrip({ projectId, onDark }: { projectId: string; onDark?: boolean }) {
  const { db } = useStore();
  const phases = phasesOf(db, projectId);
  if (!phases.length) return null;
  return (
    <div className={cx('phases', onDark && 'on-dark')} style={{ overflowX: 'auto' }}>
      {phases.map((ph) => <div key={ph.id} className={cx('phase', ph.status === 'done' && 'done', ph.status === 'active' && 'now')}><div className="bar" /><div className="ph-label" title={ph.name}>{ph.name}</div></div>)}
    </div>
  );
}
export const activePhaseName = (db: any, projectId: string) => phasesOf(db, projectId).find((p) => p.status === 'active')?.name;
