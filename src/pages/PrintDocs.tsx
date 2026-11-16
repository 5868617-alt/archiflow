// Branded printable documents: purchase order, meeting summary, fee request.
// The browser's print dialog saves them as PDF ("שמירה כ-PDF"). The studio logo and brand color come from Branding.
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LuPrinter } from 'react-icons/lu';
import { useStore } from '../data/store';
import type * as T from '../data/types';
import { projectOf, supplierOf, clientOf, contactOf, userName, poTotal, VAT } from '../data/api';
import { Btn, Modal } from '../ui/core';
import { BrandMark, brandVars } from './Branding';
import { date, ils } from '../lib/format';
import { todayISO } from '../data/dates';

/** a modal with the document and a print button; only the document is printed */
export function PrintModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal title={title} size="wide" onClose={onClose}
      foot={<><Btn kind="primary" icon={LuPrinter} onClick={() => window.print()}>הדפסה / שמירה כ-PDF</Btn><Btn kind="ghost" onClick={onClose}>סגירה</Btn></>}>
      <div className="print-preview">{children}</div>
      <p className="xs muted mt16">בחלון ההדפסה בחרו "שמירה כ-PDF" כדי לקבל קובץ.</p>
      {createPortal(<div className="print-root" dir="rtl">{children}</div>, document.body)}
    </Modal>
  );
}

/** letterhead: logo, office details, document type, number and date */
function PrintDoc({ kind, number, when, children, foot }: { kind: string; number?: string; when: string; children: ReactNode; foot?: ReactNode }) {
  const { db } = useStore();
  const o = db.office;
  return (
    <article className="pdoc" style={brandVars(db)}>
      <header className="pdoc-head">
        <BrandMark size={48} />
        <div className="grow">
          <div className="pdoc-office">{o.legalName || o.name}</div>
          <div className="xs muted">{[o.address, o.city].filter(Boolean).join(', ')}</div>
          <div className="xs muted pdoc-contact">{o.phone ? <bdi>{o.phone}</bdi> : null}{o.email ? <bdi>{o.email}</bdi> : null}{o.vatId ? <span>ח״פ / ע״מ <bdi>{o.vatId}</bdi></span> : null}</div>
        </div>
        <div className="pdoc-kind">
          <div className="pdoc-kind-t">{kind}</div>
          {number ? <div className="ltr bold">{number}</div> : null}
          <div className="small">{date(when)}</div>
        </div>
      </header>
      {children}
      {foot ? <footer className="pdoc-foot xs muted">{foot}</footer> : null}
    </article>
  );
}

function Parties({ items }: { items: [string, ReactNode][] }) {
  return <dl className="pdoc-parties">{items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

// ---------------------------------------------------------------- purchase order
export function PurchaseOrderDoc({ po, prices }: { po: T.PurchaseOrder; prices: boolean }) {
  const { db } = useStore();
  const sup = supplierOf(db, po.supplierId)!; const p = projectOf(db, po.projectId)!; const total = poTotal(po);
  return (
    <PrintDoc kind="הזמנת רכש" number={po.number} when={po.createdAt}
      foot={<>ההזמנה בתוקף לאחר אישור הספק בכתב. יש לציין את מספר ההזמנה בכל חשבונית ותעודת משלוח. תנאי תשלום: {sup.paymentTerms || 'לפי הסיכום עם הספק'}.</>}>
      <Parties items={[
        ['לכבוד', <><b>{sup.name}</b>{sup.contact ? <div>{sup.contact}</div> : null}<div className="ltr t-right">{[sup.phone, sup.email].filter(Boolean).join(' · ')}</div></>],
        ['פרויקט', <><b>{p.name}</b><div>{[p.address, p.city].filter(Boolean).join(', ')}</div></>],
        ['אספקה', <><div>עד {date(po.expectedDelivery)}</div><div>אתר הפרויקט, בתיאום מראש</div></>],
        ['תשלום', po.paidBy === 'לקוח ישירות' ? 'הלקוח משלם ישירות לספק' : 'התשלום דרך המשרד'],
      ]} />
      <table className="pdoc-table">
        <thead><tr><th>#</th><th>פריט</th><th className="num">כמות</th>{prices ? <><th className="num">מחיר יחידה</th><th className="num">סה״כ</th></> : null}</tr></thead>
        <tbody>{po.items.map((it, i) => <tr key={it.id}><td className="num">{i + 1}</td><td>{it.name}</td><td className="num">{it.qty} {it.unit}</td>{prices ? <><td className="num">{ils(it.unitPrice)}</td><td className="num">{ils(it.qty * it.unitPrice)}</td></> : null}</tr>)}</tbody>
        {prices ? <tfoot>
          <tr><td colSpan={4}>סה״כ לפני מע״מ</td><td className="num">{ils(total)}</td></tr>
          <tr><td colSpan={4}>מע״מ {Math.round(VAT * 100)}%</td><td className="num">{ils(total * VAT)}</td></tr>
          <tr className="pdoc-total"><td colSpan={4}>סה״כ לתשלום</td><td className="num">{ils(total * (1 + VAT))}</td></tr>
        </tfoot> : null}
      </table>
      {po.notes ? <section className="pdoc-sec"><h3>הערות</h3><p className="pre-wrap">{po.notes}</p></section> : null}
      <div className="pdoc-sign"><div><span>מזמין: {userName(db, po.createdBy)}</span><i /></div><div><span>אישור הספק (שם, חתימה ותאריך)</span><i /></div></div>
    </PrintDoc>
  );
}

// ---------------------------------------------------------------- meeting summary
export function MeetingSummaryDoc({ m }: { m: T.Meeting }) {
  const { db } = useStore();
  const p = m.projectId ? projectOf(db, m.projectId) : null;
  const team = m.attendeeIds.map((u) => userName(db, u));
  const clients = m.contactIds.map((c) => contactOf(db, c)?.contact.name).filter(Boolean) as string[];
  const sups = m.supplierIds.map((s) => supplierOf(db, s)?.name).filter(Boolean) as string[];
  const tasks = db.tasks.filter((t) => m.followUpTaskIds.includes(t.id) || (t.source?.kind === 'meeting' && t.source.id === m.id));
  return (
    <PrintDoc kind="סיכום פגישה" when={m.date} foot="לתיקונים או הערות על הסיכום – פנו למשרד. הסיכום משקף את מה שנאמר בפגישה ואינו מחליף הסכם, מפרט או היתר.">
      <h1 className="pdoc-title">{m.title}</h1>
      <Parties items={[
        ['מתי', <>{date(m.date)} · <span className="ltr">{m.start}–{m.end}</span></>],
        ['איפה', m.location || '—'],
        ['פרויקט', p ? <>{p.name}{p.address ? ` · ${p.address}` : ''}</> : 'פגישה כללית'],
        ['משתתפים', [team.length ? 'מהמשרד: ' + team.join(', ') : '', clients.length ? 'לקוחות: ' + clients.join(', ') : '', sups.length ? 'ספקים: ' + sups.join(', ') : ''].filter(Boolean).map((x) => <div key={x}>{x}</div>)],
      ]} />
      {m.agenda.length ? <section className="pdoc-sec"><h3>סדר יום</h3><ol>{m.agenda.map((a, i) => <li key={i}>{a}</li>)}</ol></section> : null}
      <section className="pdoc-sec"><h3>מה סוכם</h3>{m.summary ? <p className="pre-wrap">{m.summary}</p> : <p className="muted">עוד לא נכתב סיכום.</p>}</section>
      {tasks.length ? <section className="pdoc-sec"><h3>משימות המשך</h3>
        <table className="pdoc-table"><thead><tr><th>משימה</th><th>באחריות</th><th>עד</th></tr></thead>
          <tbody>{tasks.map((t) => <tr key={t.id}><td>{t.title}</td><td>{t.assigneeId ? userName(db, t.assigneeId) : '—'}</td><td>{t.dueDate ? date(t.dueDate) : '—'}</td></tr>)}</tbody></table>
      </section> : null}
    </PrintDoc>
  );
}

// ---------------------------------------------------------------- fee request
export function FeeRequestDoc({ f }: { f: T.FeeMilestone }) {
  const { db } = useStore();
  const p = projectOf(db, f.projectId)!; const cl = clientOf(db, p.clientId); const c = cl?.contacts[0];
  const phase = f.phaseId ? db.projectPhases.find((x) => x.id === f.phaseId) : null;
  const number = `${p.code || 'FR'}-${String(db.feeMilestones.filter((x) => x.projectId === p.id).findIndex((x) => x.id === f.id) + 1).padStart(2, '0')}`;
  const when = todayISO;
  return (
    <PrintDoc kind="דרישת תשלום" number={number} when={when}
      foot={<><b>זו דרישת תשלום ולא חשבונית מס.</b> חשבונית מס / קבלה תופק עם קבלת התשלום. לשאלות על הדרישה – פנו למשרד.</>}>
      <Parties items={[
        ['לכבוד', <><b>{cl?.name || '—'}</b>{c ? <div>{c.name}</div> : null}{c?.email ? <div className="ltr t-right">{c.email}</div> : null}</>],
        ['פרויקט', <><b>{p.name}</b><div>{[p.address, p.city].filter(Boolean).join(', ')}</div></>],
        ['הסכם', <>{p.feeType}{p.feeTotal ? <div>סך ההסכם: {ils(p.feeTotal)} לפני מע״מ</div> : null}</>],
        ['מועד תשלום', date(f.dueDate)],
      ]} />
      <table className="pdoc-table">
        <thead><tr><th>תיאור</th><th className="num">חלק מההסכם</th><th className="num">סכום</th></tr></thead>
        <tbody><tr><td><b>{f.title}</b>{phase ? <div className="xs muted">שלב: {phase.name}</div> : null}</td><td className="num">{f.pct}%</td><td className="num">{ils(f.amount)}</td></tr></tbody>
        <tfoot>
          <tr><td colSpan={2}>מע״מ {Math.round(VAT * 100)}%</td><td className="num">{ils(f.amount * VAT)}</td></tr>
          <tr className="pdoc-total"><td colSpan={2}>סה״כ לתשלום</td><td className="num">{ils(f.amount * (1 + VAT))}</td></tr>
        </tfoot>
      </table>
      <section className="pdoc-sec"><h3>פרטים לתשלום</h3><p>לתשלום לפקודת {db.office.legalName || db.office.name}. פרטי חשבון הבנק יימסרו על ידי המשרד.</p></section>
    </PrintDoc>
  );
}
