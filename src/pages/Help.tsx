import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuSearch, LuBookOpen, LuLifeBuoy, LuPlus, LuChevronDown, LuClock, LuTicket } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, byId } from '../data/api';
import type * as T from '../data/types';
import { nowStamp } from '../data/dates';
import { PageHead, Btn, Card, StatusBadge, Badge, Modal, Field, Input, Select, Textarea, Empty, Callout, DataTable, cx } from '../ui/core';
import { TicketConversation } from './Admin';
import { ago, date } from '../lib/format';

export function HelpCenter() {
  const { db, nav, live } = useStore();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(0);
  const arts = (db as any).helpArticles as any[];
  const faqs = (db as any).faqs as any[];
  const res = q.trim() ? arts.filter((a) => a.title.includes(q) || a.body.join(' ').includes(q) || a.category.includes(q)) : arts;
  const cats = [...new Set(arts.map((a) => a.category))];
  return (
    <div>
      <div className="portal-hero" style={{ marginBottom: 24 }}>
        <div className="stack" style={{ maxWidth: 640 }}>
          <h1 className="display" style={{ fontSize: 'var(--fs-3xl)' }}>מרכז העזרה</h1>
          <p style={{ color: 'var(--on-navy-2)' }}>מדריכים קצרים לעבודה עם ArchiFlow, שאלות נפוצות ופנייה לתמיכה.</p>
          <div className="search" style={{ maxWidth: 520 }}><LuSearch aria-hidden /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש: שרטוטים, אישור לקוח, מנוי…" aria-label="חיפוש במרכז העזרה" style={{ paddingLeft: 12 }} /></div>
        </div>
      </div>
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          {q.trim() ? <div className="small muted">{res.length} תוצאות עבור "{q}"</div> : null}
          {(q.trim() ? ['תוצאות'] : cats).map((c) => {
            const list = q.trim() ? res : arts.filter((a) => a.category === c);
            if (!list.length) return <Empty key={c} title="לא נמצאו מאמרים" action={<Btn onClick={() => nav('/support?new=1')}>פנייה לתמיכה</Btn>} />;
            return (
              <Card key={c} title={c} icon={LuBookOpen} pad={false}>
                <div className="list">{list.map((a) => <div key={a.id} className="li click" onClick={() => nav(`/help/${a.id}`)}><div className="li-main"><div className="li-title">{a.title}</div><div className="li-sub">{a.body[0]}</div></div><span className="xs muted nowrap row g4"><LuClock aria-hidden style={{ width: 12 }} />{a.minutes} דק׳</span></div>)}</div>
              </Card>
            );
          })}
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="שאלות נפוצות">
            <div className="col">{faqs.map((f, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <button type="button" className="row between w100" style={{ background: 'none', border: 0, padding: '10px 0', cursor: 'pointer', textAlign: 'right', font: 'inherit', color: 'inherit' }} onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}><b className="small">{f.q}</b><LuChevronDown aria-hidden style={{ width: 16, transform: open === i ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} /></button>
                {open === i ? <p className="small soft" style={{ paddingBottom: 10 }}>{f.a}</p> : null}
              </div>
            ))}</div>
          </Card>
          <Card title="לא מצאתם תשובה?" icon={LuLifeBuoy}>
            <p className="small soft mb8">צוות התמיכה עונה בימים א׳–ה׳, 09:00–17:00 {IS_LIVE ? '' : '(זמני תגובה – הנחת דמו)'}.</p>
            <div className="row g8"><Btn kind="primary" icon={LuPlus} onClick={() => nav('/support?new=1')}>פנייה חדשה</Btn><Btn icon={LuTicket} onClick={() => nav('/support')}>הפניות שלי</Btn></div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function HelpArticle({ id }: { id: string }) {
  const { db, nav, toast, live } = useStore();
  const a = ((db as any).helpArticles as any[]).find((x) => x.id === id);
  const [voted, setVoted] = useState(false);
  if (!a) return <Empty heading="h1" title="המאמר לא נמצא" action={<Btn onClick={() => nav('/help')}>למרכז העזרה</Btn>} />;
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHead crumbs={[{ label: 'מרכז העזרה', to: '/help' }, { label: a.category }]} title={a.title} sub={`${a.minutes} דקות קריאה`} />
      <div className="card pad"><div className="article">{a.body.map((p: string, i: number) => <p key={i}>{p}</p>)}</div></div>
      <div className="row g8 mt16 wrap"><span className="small muted">המאמר עזר?</span>{voted ? <span className="small ok-t">תודה על המשוב</span> : <><Btn size="sm" onClick={() => { setVoted(true); toast('תודה!'); }}>כן</Btn><Btn size="sm" onClick={() => { setVoted(true); nav('/support?new=1'); }}>לא – פנייה לתמיכה</Btn></>}</div>
    </div>
  );
}

export function SupportPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const [creating, setCreating] = useState(!!query.new);
  const mine = db.tickets.filter((t) => t.officeId === (IS_LIVE ? db.office.id : 'off_1') && (me.role === 'owner' || me.role === 'admin' || t.userId === me.id));
  return (
    <div>
      <PageHead crumbs={[{ label: 'מרכז העזרה', to: '/help' }, { label: 'תמיכה' }]} title="פניות תמיכה" sub={me.role === 'member' ? 'הפניות שפתחת.' : 'כל הפניות של המשרד.'} actions={<Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>פנייה חדשה</Btn>} />
      <div className="card"><DataTable rows={mine} onRow={(t: T.Ticket) => nav(`/support/${t.id}`)} initialSort={{ key: 'createdAt', dir: -1 }} empty={<Empty title="אין פניות" />} columns={[
        { key: 'number', label: 'מס׳', render: (t: T.Ticket) => <span className="code">{t.number}</span> },
        { key: 'subject', label: 'נושא', render: (t: T.Ticket) => <b>{t.subject}</b> },
        { key: 'category', label: 'קטגוריה' },
        { key: 'status', label: 'סטטוס', render: (t: T.Ticket) => <StatusBadge s={t.status} /> },
        { key: 'createdAt', label: 'נפתחה', render: (t: T.Ticket) => <span className="small">{ago(t.createdAt)}</span> },
      ]} /></div>
      {creating ? <NewTicket onClose={() => { setCreating(false); if (query.new) nav('/support'); }} /> : null}
    </div>
  );
}
function NewTicket({ onClose }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const [f, setF] = useState({ subject: '', category: 'שאלה כללית', priority: 'רגילה', text: '' });
  const [err, setErr] = useState<any>({});
  return (
    <Modal title="פנייה חדשה לתמיכה" onClose={onClose} foot={<><Btn kind="primary" onClick={() => {
      const e: any = {}; if (!f.subject.trim()) e.subject = 'יש להזין נושא'; if (f.text.trim().length < 10) e.text = 'נא לפרט לפחות 10 תווים'; setErr(e); if (Object.keys(e).length) return;
      const id = uid('tk'); run(A.createTicket, { id, number: `SUP-${1044 + db.tickets.length}`, officeId: IS_LIVE ? db.office.id : 'off_1', userId: me.id, subject: f.subject, category: f.category, priority: f.priority as any, status: 'פתוח', createdAt: nowStamp(), assignee: '—', messages: [{ side: 'user', name: me.name, text: f.text, at: nowStamp() }] });
      toast('הפנייה נפתחה. תוכלו לעקוב אחריה כאן.'); onClose(); nav(`/support/${id}`);
    }}>שליחה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="נושא *" full error={err.subject} htmlFor="nt-s"><Input id="nt-s" value={f.subject} invalid={err.subject} onChange={(e: any) => setF({ ...f, subject: e.target.value })} /></Field>
        <Field label="קטגוריה" htmlFor="nt-c"><Select id="nt-c" value={f.category} onChange={(e: any) => setF({ ...f, category: e.target.value })} options={['שאלה כללית', 'שרטוטים', 'פורטל לקוח', 'חיוב ומנוי', 'בקשת פיצ׳ר', 'תקלה']} /></Field>
        <Field label="דחיפות" htmlFor="nt-p"><Select id="nt-p" value={f.priority} onChange={(e: any) => setF({ ...f, priority: e.target.value })} options={['נמוכה', 'רגילה', 'גבוהה']} /></Field>
        <Field label="תיאור *" full error={err.text} htmlFor="nt-t"><Textarea id="nt-t" rows={5} value={f.text} invalid={err.text} onChange={(e: any) => setF({ ...f, text: e.target.value })} placeholder="מה קרה? באיזה מסך? מה ציפיתם שיקרה?" /></Field>
      </div>
    </Modal>
  );
}
export function TicketDetail({ id }: { id: string }) {
  const { db, nav, live } = useStore();
  const t = byId(db.tickets, id);
  if (!t || t.officeId !== (IS_LIVE ? db.office.id : 'off_1')) return <Empty heading="h1" title="הפנייה לא נמצאה" action={<Btn onClick={() => nav('/support')}>לפניות</Btn>} />;
  return (
    <div style={{ maxWidth: 900 }}>
      <PageHead crumbs={[{ label: 'תמיכה', to: '/support' }, { label: t.number }]} title={t.subject} badge={<StatusBadge s={t.status} />} sub={`${t.category} · נפתחה ${ago(t.createdAt)}`} />
      <Card><TicketConversation t={t} side="user" /></Card>
      <div className="mt16"><Callout kind="info">כדי לראות את הצד של צוות התמיכה, החליפו תפקיד ל"רון גבאי" ופתחו את הפנייה בקונסולה.</Callout></div>
    </div>
  );
}
