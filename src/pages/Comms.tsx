import { IS_LIVE } from '../data/dates';
import { useState, useEffect, useRef } from 'react';
import { LuBell, LuCheckCheck, LuMails, LuSlidersHorizontal, LuSend, LuPaperclip, LuMessageCircle, LuCircleCheck, LuListChecks, LuUsers, LuCircleAlert, LuInfo, LuPencilRuler, LuEye } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, clientOf, A, byId } from '../data/api';
import type * as T from '../data/types';
import { PageHead, Btn, Tabs, Chips, DataTable, Badge, Card, Modal, Empty, Callout, Switch, DemoTag, FutureTag, cx, Avatar } from '../ui/core';
import { ago, dateTime } from '../lib/format';

const NK: any = { approval: [LuCircleCheck, 'warn', 'אישורים'], task: [LuListChecks, 'info', 'משימות'], meeting: [LuUsers, 'info', 'פגישות'], budget: [LuCircleAlert, 'bad', 'תקציב'], comment: [LuMessageCircle, 'violet', 'תגובות'], system: [LuInfo, '', 'מערכת'], plan: [LuPencilRuler, 'accent', 'שרטוטים'] };

export function NotificationList({ items, onGo }: any) {
  const { run, live } = useStore();
  if (!items.length) return <Empty icon={LuBell} title="אין התראות">התראות על אישורים, משימות, פגישות ותקציב יופיעו כאן.</Empty>;
  return (
    <div className="list">
      {items.map((n: T.Notification) => {
        const [Ic, tone] = NK[n.kind] || NK.system;
        return (
          <div key={n.id} className="li click" onClick={() => { run(A.markRead, n.id); onGo(n.link); }} style={{ background: n.read ? undefined : 'color-mix(in srgb, var(--accent-soft) 45%, transparent)' }}>
            <span className={cx('li-ic', tone)}><Ic aria-hidden /></span>
            <div className="li-main"><div className={cx('li-title', !n.read && 'bold')}>{n.title}</div><div className="li-sub">{n.body}</div></div>
            <span className="xs muted nowrap">{ago(n.at)}</span>
            {!n.read ? <span className="notif-dot" aria-label="לא נקרא" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function NotificationsPage() {
  const { db, me, run, toast, nav, path, live } = useStore();
  const [tab, setTab] = useState(path.includes('tab=email') ? 'email' : path.includes('tab=prefs') ? 'prefs' : 'all');
  const [kind, setKind] = useState('all');
  const mine = db.notifications.filter((n) => n.userId === me.id && (kind === 'all' || (kind === 'unread' ? !n.read : n.kind === kind)));
  const unread = db.notifications.filter((n) => n.userId === me.id && !n.read).length;
  return (
    <div>
      <PageHead title="התראות ותקשורת" sub="התראות באפליקציה, העדפות והיסטוריית המיילים האוטומטיים." actions={unread ? <Btn icon={LuCheckCheck} onClick={() => { run(A.markAllRead); toast('כל ההתראות סומנו כנקראו'); }}>סימון הכול כנקרא</Btn> : null} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'התראות', icon: LuBell, count: unread }, { id: 'prefs', label: 'העדפות', icon: LuSlidersHorizontal }, { id: 'email', label: 'יומן מיילים', icon: LuMails, count: db.emailLog.length }]} />
      {tab === 'all' ? (
        <>
          <div className="filters"><Chips value={kind} onChange={setKind} options={[{ value: 'all', label: 'הכול' }, { value: 'unread', label: 'לא נקראו' }, ...Object.entries(NK).map(([k, v]: any) => ({ value: k, label: v[2] }))]} /></div>
          <Card pad={false}><NotificationList items={mine} onGo={nav} /></Card>
        </>
      ) : null}
      {tab === 'prefs' ? <Prefs /> : null}
      {tab === 'email' ? <EmailLog /> : null}
    </div>
  );
}

function Prefs() {
  const { db, run, toast, live } = useStore();
  const rows: [string, string, string][] = [['approvals', 'אישורי לקוח', 'החלטות לקוח ותזכורות על אישורים פתוחים'], ['tasks', 'משימות', 'שיוך משימה, מועד מתקרב ואיחור'], ['meetings', 'פגישות', 'תזכורת יום לפני ושעה לפני'], ['budget', 'התראות תקציב', `ניצול מעל ${db.settings.budgetWarnPct}% וחריגת סעיף`], ['comments', 'תגובות והודעות', 'הודעות לקוח בפורטל ותגובות במשימות'], ['digest', 'סיכום יומי', 'מייל בוקר עם משימות ופגישות היום']];
  return (
    <div className="stack-lg">
      <Card title="העדפות התראה" actions={<span className="xs muted">חלות על המשתמש הנוכחי</span>}>
        <div className="table-wrap"><table className="tbl"><thead><tr><th>סוג</th><th className="t-center">באפליקציה</th><th className="t-center">במייל</th></tr></thead><tbody>
          {rows.map(([k, label, hint]) => <tr key={k}><td><b>{label}</b><div className="xs muted">{hint}</div></td>{['app', 'email'].map((ch) => <td key={ch} className="t-center"><span style={{ display: 'inline-block' }}><Switch id={`pref-${k}-${ch}`} checked={db.settings.notif[k][ch]} onChange={(v: boolean) => { run(A.setSetting, `notif.${k}.${ch}`, v); toast('ההעדפה נשמרה'); }} /></span></td>)}</tr>)}
        </tbody></table></div>
      </Card>
      {IS_LIVE ? <Callout kind="assume" title="שליחת מיילים">מיילים אוטומטיים נכנסים לתור ונשלחים מצד השרת דרך Resend, עם קישור חזרה לרשומה. עד שחשבון Resend מחובר, המיילים נשארים בתור במצב "בתור לשליחה".</Callout> : <Callout kind="future" title="מוכנות ל-Resend">מיילים אוטומטיים מתועדים ביומן המיילים עם שם תבנית. בייצור כל תבנית תישלח דרך Resend מצד השרת, עם קישור חזרה לרשומה. בדמו לא נשלח אף מייל.</Callout>}
    </div>
  );
}

const TPL: Record<string, string> = { approval_request: 'בקשת אישור', approval_reminder: 'תזכורת אישור', team_invite: 'הזמנה לצוות', portal_invite: 'הזמנה לפורטל', daily_digest: 'סיכום יומי', budget_alert: 'התראת תקציב', purchase_order: 'הזמנת רכש לספק', meeting_invite: 'זימון לפגישה', meeting_summary: 'סיכום פגישה', fee_request: 'דרישת תשלום' };
function EmailLog() {
  const { db, nav, live } = useStore();
  const [open, setOpen] = useState<T.EmailLog | null>(null);
  return (
    <div className="stack">
      {IS_LIVE ? null : <div className="row g8 wrap"><DemoTag>שום מייל לא נשלח בפועל</DemoTag><FutureTag>Resend – חיבור עתידי</FutureTag></div>}
      <div className="card">
        <DataTable rows={db.emailLog} onRow={setOpen} pageSize={12} initialSort={{ key: 'at', dir: -1 }} columns={[
          { key: 'at', label: 'מועד', render: (e: T.EmailLog) => <span className="small nowrap">{dateTime(e.at)}</span> },
          { key: 'to', label: 'נמען', render: (e: T.EmailLog) => <span className="ltr small">{e.to}</span> },
          { key: 'subject', label: 'נושא', render: (e: T.EmailLog) => <b className="small">{e.subject}</b> },
          { key: 'template', label: 'תבנית', render: (e: T.EmailLog) => <Badge tone="outline">{TPL[e.template] || e.template}</Badge> },
          { key: 'status', label: 'סטטוס', render: (e: T.EmailLog) => <Badge tone="warn">{e.status}</Badge> },
        ]} />
      </div>
      {open ? (
        <Modal title={IS_LIVE ? 'פרטי המייל' : 'תצוגת מייל (הדמיה)'} onClose={() => setOpen(null)} foot={<><Btn onClick={() => { setOpen(null); nav(open.relatedLink || '/dashboard'); }}>לרשומה המקושרת</Btn><Btn kind="ghost" onClick={() => setOpen(null)}>סגירה</Btn></>}>
          <div className="stack">
            <div className="small"><span className="muted">אל: </span><span className="ltr">{open.to}</span></div>
            <div className="small"><span className="muted">נושא: </span><b>{open.subject}</b></div>
            <div className="invoice-paper watermark" style={{ padding: 24 }}>
              <div className="row g8"><span className="portal-logo" style={{ width: 32, height: 32, flex: '0 0 32px', fontSize: 13 }}>{db.office.logoText}</span><b>{db.office.name}</b></div>
              <hr className="sep" style={{ margin: '14px 0' }} />
              <p style={{ marginBottom: 10 }}>שלום,</p>
              <p style={{ marginBottom: 14 }}>{open.subject}. לפרטים ולפעולה יש להיכנס לחשבון ArchiFlow.</p>
              <span className="btn primary sm" aria-hidden>מעבר ל-ArchiFlow</span>
              <p className="xs muted mt16">תבנית: {open.template} · נשלח דרך Resend (בייצור)</p>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function ChatThread({ projectId, viewerSide }: { projectId: string; viewerSide: 'studio' | 'client' }) {
  const { db, me, run, toast, live } = useStore();
  const [text, setText] = useState('');
  const endRef = useRef<any>(null);
  const msgs = db.messages.filter((m) => m.projectId === projectId).sort((a, b) => a.at.localeCompare(b.at));
  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [msgs.length]);
  return (
    <div className="stack">
      <div className="chat" style={{ maxHeight: 460, overflowY: 'auto', padding: 4 }}>
        {msgs.length === 0 ? <Empty icon={LuMessageCircle} title="אין הודעות עדיין">כתבו את ההודעה הראשונה.</Empty> : null}
        {msgs.map((m) => {
          const u = db.users.find((x) => x.id === m.authorId);
          const mine = m.side === viewerSide;
          return (
            <div key={m.id} className={cx('comment', mine ? 'mine' : m.side === 'client' && 'client')}>
              <Avatar user={u || { name: m.authorName, color: '#3E6A8A' }} size="sm" />
              <div className="c-bubble"><div className="row between g8"><b className="small">{m.authorName}{m.side === 'client' && viewerSide === 'studio' ? <span className="xs muted"> · לקוח</span> : null}</b><span className="xs muted">{ago(m.at)}</span></div><div className="small" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div></div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="row g8" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; run(A.sendMessage, projectId, text.trim()); setText(''); toast(viewerSide === 'client' ? 'ההודעה נשלחה למשרד' : 'ההודעה נשלחה ללקוח בפורטל'); }}>
        <button type="button" className="icon-btn" title={IS_LIVE ? 'צירוף קבצים להודעות יתווסף בהמשך. בינתיים אפשר לשתף מסמך מלשונית המסמכים.' : 'צירוף קובץ אינו זמין בדמו'} aria-label="צירוף קובץ (לא זמין)" disabled><LuPaperclip /></button>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={viewerSide === 'client' ? 'כתיבת הודעה למשרד…' : 'כתיבת הודעה ללקוח (גלויה בפורטל)…'} aria-label="הודעה" />
        <Btn kind="navy" type="submit" icon={LuSend} disabled={!text.trim()}>שליחה</Btn>
      </form>
    </div>
  );
}

export function ProjectThread({ projectId }: { projectId: string }) {
  const { db, live } = useStore();
  const p = projectOf(db, projectId)!;
  const c = clientOf(db, p.clientId)!;
  return (
    <div className="grid-main-side">
      <Card title={`שיחה עם ${c.name}`} icon={LuMessageCircle}><ChatThread projectId={projectId} viewerSide="studio" /></Card>
      <div className="stack">
        <Callout kind="info" icon={LuEye}>כל הודעה כאן גלויה ללקוח בפורטל. להערות פנימיות השתמשו בתגובות על משימות.</Callout>
        <Card title="משתתפים מצד הלקוח">{c.contacts.map((ct) => <div key={ct.id} className="row between small" style={{ padding: '4px 0' }}><span>{ct.name}</span><Badge tone={ct.portal === 'פעיל' ? 'ok' : ''}>{ct.portal}</Badge></div>)}</Card>
      </div>
    </div>
  );
}

export function MessagesPage({ query }: any) {
  const { db, me, live } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'ליד חדש');
  const withMsgs = projects.map((p) => ({ p, last: db.messages.filter((m) => m.projectId === p.id).sort((a, b) => b.at.localeCompare(a.at))[0] })).sort((a, b) => (b.last?.at || '').localeCompare(a.last?.at || ''));
  const [sel, setSel] = useState(query.project || withMsgs[0]?.p.id);
  const cur = projectOf(db, sel);
  return (
    <div>
      <PageHead title="הודעות לקוחות" sub="שיחות עם לקוחות לפי פרויקט – אותן הודעות שהלקוח רואה בפורטל." />
      <div className="grid-rail" style={{ '--rail': '300px' } as any}>
        <Card pad={false}>
          <div className="list">
            {withMsgs.map(({ p, last }) => (
              <button key={p.id} type="button" className={cx('li click')} style={{ background: sel === p.id ? 'var(--accent-soft)' : undefined, border: 0, borderBottom: '1px solid var(--line)', width: '100%', textAlign: 'right', font: 'inherit', color: 'inherit' }} onClick={() => setSel(p.id)}>
                <div className="li-main"><div className="li-title">{p.name}</div><div className="li-sub">{last ? `${last.authorName}: ${last.text}` : 'אין הודעות'}</div></div>
                {last ? <span className="xs muted nowrap">{ago(last.at)}</span> : null}
              </button>
            ))}
          </div>
        </Card>
        {cur ? <Card title={`${cur.name} · ${clientOf(db, cur.clientId)?.name}`} icon={LuMessageCircle}><ChatThread projectId={cur.id} viewerSide="studio" /></Card> : <Empty title="בחרו שיחה" />}
      </div>
    </div>
  );
}
