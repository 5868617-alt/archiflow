import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuBuilding2, LuUsers, LuCreditCard, LuTicket, LuTrendingUp, LuActivity, LuPlus, LuSend, LuMegaphone, LuShieldAlert, LuCircleAlert, LuInfo, LuTriangleAlert, LuSave, LuEye } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, byId, ROLE_SHORT } from '../data/api';
import { FEATURE_DEFS } from '../data/seed';
import type * as T from '../data/types';
import { todayISO, nowStamp, D } from '../data/dates';
import { PageHead, Btn, Card, KV, StatusBadge, Badge, Modal, Field, Input, Select, Textarea, Empty, Callout, Stat, Progress, DataTable, Chips, SearchBox, Switch, Tabs, cx, DemoTag, AssumeTag, FutureTag, Avatar, Confirm } from '../ui/core';
import { Columns, Donut, Spark } from '../ui/charts';
import { parseRoute } from '../lib/route';
import { date, dateTime, ago, ils, num } from '../lib/format';

const SUB_STATUSES: T.OfficeSubscription['status'][] = ['פעיל', 'תקופת ניסיון', 'חוב פתוח', 'יבוטל בסוף התקופה', 'בוטל', 'פג תוקף'];

export function AdminRouter() {
  const { path, live } = useStore();
  const { segs } = parseRoute(path);
  const [, page, id] = segs;
  switch (page) {
    case undefined: return <Overview />;
    case 'usage': return <Usage />;
    case 'offices': return id ? <OfficeDetail id={id} /> : <Offices />;
    case 'users': return id ? <UserDetail id={id} /> : <Users />;
    case 'subscriptions': return <Subscriptions />;
    case 'pricing': return <Pricing />;
    case 'pricing-log': return <PricingLog />;
    case 'tickets': return id ? <AdminTicket id={id} /> : <Tickets />;
    case 'announcements': return <Announcements />;
    case 'events': return <Events />;
    case 'audit': return <Audit />;
    case 'retention': return <Retention />;
    case 'settings': return <PlatformSettings />;
    default: return <Empty title="הדף לא נמצא" />;
  }
}

const mrrTrend = [1046, 1196, 1345, 1495, 1644, 1793, 1793, 0]; // last month = live MRR
function Overview() {
  const { db, nav, live } = useStore();
  const offs = db.platformOffices;
  const mrr = offs.filter((o) => ['פעיל', 'חוב פתוח', 'יבוטל בסוף התקופה'].includes(o.status)).reduce((a, o) => a + (o.planId === 'pro' ? db.subscriptionPlans[1].priceMonthly : db.subscriptionPlans[0].priceMonthly), 0);
  const users = offs.reduce((a, o) => a + o.users, 0);
  const openT = db.tickets.filter((t) => t.status !== 'נסגר');
  const parts = [{ label: 'Pro', value: offs.filter((o) => o.planId === 'pro' && !['בוטל', 'פג תוקף'].includes(o.status)).length, color: 'var(--navy-3)' }, { label: 'Starter', value: offs.filter((o) => o.planId === 'starter' && !['בוטל', 'פג תוקף'].includes(o.status)).length, color: 'var(--accent)' }];
  return (
    <div>
      <PageHead title="סקירת פלטפורמה" badge={IS_LIVE ? undefined : <DemoTag>נתוני פלטפורמה מדומים</DemoTag>} sub="מצב כל המשרדים, ההכנסות החודשיות והתמיכה." />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="משרדים פעילים" icon={LuBuilding2} value={offs.filter((o) => o.status === 'פעיל').length} meta={`${offs.length} סה״כ · ${offs.filter((o) => o.status === 'תקופת ניסיון').length} בניסיון`} onClick={() => nav('/admin/offices')} />
        <Stat label="הכנסה חודשית חוזרת (MRR)" icon={LuTrendingUp} value={ils(mrr)} meta={IS_LIVE ? 'לפי המחירים הזמניים, לפני מע״מ. אין עדיין חיוב בפועל.' : 'לפי מחירי דמו, לפני מע״מ'} onClick={() => nav('/admin/subscriptions')} />
        <Stat label="משתמשים" icon={LuUsers} value={users} meta="בכל המשרדים" onClick={() => nav('/admin/users')} />
        <Stat label="פניות פתוחות" icon={LuTicket} value={openT.length} meta={`${openT.filter((t) => t.priority === 'גבוהה' || t.priority === 'קריטית').length} בעדיפות גבוהה`} tone={openT.some((t) => t.priority === 'גבוהה') ? 'warn' : ''} onClick={() => nav('/admin/tickets')} />
      </div>
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="MRR – 8 חודשים אחרונים" actions={<DemoTag />}><Columns data={['מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳'].map((l, i) => ({ label: l, value: i === 7 ? mrr : Math.min(mrrTrend[i], mrr) }))} highlightLast /></Card>
          <Card title="דורשים טיפול" pad={false}>
            <div className="list">
              {offs.filter((o) => ['חוב פתוח', 'יבוטל בסוף התקופה'].includes(o.status) || (o.status === 'תקופת ניסיון')).map((o) => <div key={o.id} className="li click" onClick={() => nav(`/admin/offices/${o.id}`)}><span className={cx('li-ic', o.status === 'חוב פתוח' ? 'bad' : o.status === 'תקופת ניסיון' ? 'info' : 'warn')}><LuBuilding2 aria-hidden /></span><div className="li-main"><div className="li-title">{o.name}</div><div className="li-sub">{o.ownerName} · {o.planId === 'pro' ? 'Pro' : 'Starter'}</div></div><StatusBadge s={o.status} /></div>)}
            </div>
          </Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="חלוקת מסלולים"><Donut parts={parts} size={120} center={String(parts[0].value + parts[1].value)} sub="מנויים" /></Card>
          <Card title="אירועי מערכת אחרונים" pad={false} actions={<Btn size="sm" kind="ghost" onClick={() => nav('/admin/events')}>הכול</Btn>}>
            <div className="list">{db.systemEvents.slice(0, 4).map((e) => <div key={e.id} className="li"><span className={cx('li-ic', e.level === 'error' ? 'bad' : e.level === 'warn' ? 'warn' : 'info')}>{e.level === 'error' ? <LuCircleAlert aria-hidden /> : e.level === 'warn' ? <LuTriangleAlert aria-hidden /> : <LuInfo aria-hidden />}</span><div className="li-main"><div className="li-title small" style={{ whiteSpace: 'normal' }}>{e.message}</div><div className="li-sub">{e.service} · {ago(e.at)}</div></div></div>)}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Usage() {
  const { db, nav, live } = useStore();
  const adoption = [['פרויקטים ומשימות', 100], ['שרטוטים והערות', 83], ['מפרטים', 67], ['פורטל לקוח', 58], ['הזמנות רכש', 42], ['תקציב והוצאות', 50], ['שכר טרחה', 25]] as [string, number][];
  return (
    <div>
      <PageHead title="מדדי שימוש" badge={IS_LIVE ? undefined : <DemoTag>נתונים מדומים</DemoTag>} sub="אימוץ יכולות, אחסון ופעילות לפי משרד." />
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Card title="אימוץ יכולות (% מהמשרדים הפעילים)"><div className="col g12">{adoption.map(([l, v]) => <div key={l}><div className="meter-label"><span>{l}</span><span className="num">{v}%</span></div><Progress value={v / 100} /></div>)}</div></Card>
        <Card title="אחסון לפי משרד (GB)"><Columns data={[...db.platformOffices].sort((a, b) => b.storageGb - a.storageGb).slice(0, 8).map((o) => ({ label: o.name.split(' ')[0].slice(0, 6), value: o.storageGb }))} format={(n) => `${Math.round(n)}`} /></Card>
      </div>
      <div className="card">
        <DataTable rows={db.platformOffices} onRow={(o: T.PlatformOffice) => nav(`/admin/offices/${o.id}`)} columns={[
          { key: 'name', label: 'משרד', render: (o: T.PlatformOffice) => <b>{o.name}</b> },
          { key: 'users', label: 'משתמשים', num: true },
          { key: 'projects', label: 'פרויקטים', num: true },
          { key: 'storageGb', label: 'אחסון', num: true, render: (o: T.PlatformOffice) => `${o.storageGb}GB` },
          { key: 'trend', label: 'פעילות 8 שבועות', sortable: false, render: (o: T.PlatformOffice) => <Spark values={Array.from({ length: 8 }, (_, i) => Math.max(1, o.users * 10 + ((i * 7 + o.name.length) % 9) * (o.status === 'בוטל' ? -1 : 1)))} /> },
          { key: 'lastActive', label: 'פעילות אחרונה', render: (o: T.PlatformOffice) => <span className="small">{ago(o.lastActive)}</span> },
        ]} />
      </div>
    </div>
  );
}

function Offices() {
  const { db, nav, live } = useStore();
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  let list = db.platformOffices.filter((o) => status === 'all' || o.status === status);
  if (q.trim()) list = list.filter((o) => o.name.includes(q) || o.ownerName.includes(q) || o.city.includes(q));
  return (
    <div>
      <PageHead title="משרדים" sub={`${db.platformOffices.length} משרדים רשומים בפלטפורמה.`} />
      <div className="filters"><SearchBox value={q} onChange={setQ} placeholder="חיפוש משרד, בעלים או עיר" id="ao-s" /><Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'הכול', count: db.platformOffices.length }, ...SUB_STATUSES.map((s) => ({ value: s, label: s, count: db.platformOffices.filter((o) => o.status === s).length })).filter((x) => x.count)]} /></div>
      <div className="card"><DataTable rows={list} onRow={(o: T.PlatformOffice) => nav(`/admin/offices/${o.id}`)} pageSize={12} columns={[
        { key: 'name', label: 'משרד', render: (o: T.PlatformOffice) => <div className="col" style={{ gap: 0 }}><b>{o.name}</b><span className="xs muted">{o.city}</span></div> },
        { key: 'ownerName', label: 'בעלים', render: (o: T.PlatformOffice) => <div className="col" style={{ gap: 0 }}><span>{o.ownerName}</span><span className="xs muted ltr" style={{ textAlign: 'right' }}>{o.ownerEmail}</span></div> },
        { key: 'planId', label: 'מסלול', render: (o: T.PlatformOffice) => <Badge tone={o.planId === 'pro' ? 'navy' : 'accent'}>{o.planId === 'pro' ? 'Pro' : 'Starter'}</Badge> },
        { key: 'status', label: 'מצב מנוי', render: (o: T.PlatformOffice) => <StatusBadge s={o.status} /> },
        { key: 'users', label: 'משתמשים', num: true },
        { key: 'createdAt', label: 'נרשם', render: (o: T.PlatformOffice) => <span className="small">{date(o.createdAt)}</span> },
      ]} /></div>
    </div>
  );
}

function OfficeDetail({ id }: { id: string }) {
  const { db, run, toast, nav, live } = useStore();
  const o = byId(db.platformOffices, id);
  const [st, setSt] = useState<string | null>(null);
  if (!o) return <Empty title="המשרד לא נמצא" />;
  const isDemoOffice = id === 'off_1';
  const users = IS_LIVE ? db.users.filter((u) => u.officeId === id) : isDemoOffice ? db.users.filter((u) => u.officeId) : [];
  return (
    <div>
      <PageHead crumbs={[{ label: 'משרדים', to: '/admin/offices' }, { label: o.name }]} title={o.name} badge={<StatusBadge s={o.status} />} sub={`${o.city} · נרשם ${date(o.createdAt)}`}
        actions={<><Btn disabled title="החלטה פתוחה: האם Super Admin רשאי להתחבר כמשרד">כניסה כמשרד (לא ב-MVP)</Btn></>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="משתמשים" value={o.users} /><Stat label="פרויקטים" value={o.projects} /><Stat label="אחסון" value={`${o.storageGb}GB`} /><Stat label="MRR" value={ils(o.mrr)} meta={IS_LIVE ? 'מחיר זמני' : 'מחיר דמו'} />
      </div>
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="ניהול מנוי" icon={LuCreditCard} actions={IS_LIVE ? undefined : <DemoTag>שינוי מדומה</DemoTag>}>
            <div className="stack">
              <KV items={[['מסלול', o.planId === 'pro' ? 'Pro' : 'Starter'], ['מצב', <StatusBadge s={o.status} />], ['בעלים', `${o.ownerName} · ${o.ownerEmail}`]]} />
              <div className="row g8 wrap">{SUB_STATUSES.filter((s) => s !== o.status).map((s) => <Btn key={s} size="sm" onClick={() => setSt(s)}>העברה ל"{s}"</Btn>)}</div>
              {isDemoOffice && !IS_LIVE ? <span className="xs muted">זה המשרד שבו עובדים משתמשי הדמו – שינוי כאן ישפיע על הממשק שלהם.</span> : null}
            </div>
          </Card>
          <Card title="משתמשים" pad={false}>{users.length ? <div className="list">{users.map((u) => <div key={u.id} className="li click" onClick={() => nav(`/admin/users/${u.id}`)}><Avatar user={u} size="sm" /><div className="li-main"><div className="li-title">{u.name}</div><div className="li-sub">{ROLE_SHORT[u.role]} · {u.email}</div></div><StatusBadge s={u.status} /></div>)}</div> : <div className="card-body small muted">פירוט משתמשים זמין בדמו רק עבור משרד הדמו. כאן מוצג סיכום בלבד ({o.users} משתמשים).</div>}</Card>
          <Card title="יומן ביקורת למשרד" pad={false}><div className="list">{db.auditLog.filter((a) => a.officeId === id).slice(0, 8).map((a) => <div key={a.id} className="li"><div className="li-main"><div className="li-title small">{a.actor}: {a.action}</div><div className="li-sub">{a.target}</div></div><span className="xs muted">{ago(a.at)}</span></div>)}{!db.auditLog.some((a) => a.officeId === id) ? <Empty title="אין רשומות" /> : null}</div></Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Callout kind="assume" icon={LuShieldAlert} title="גישה לתוכן המשרד">ה-Super Admin רואה נתוני מנוי ושימוש בלבד, לא את תוכן הפרויקטים. התחזות למשרד לצורכי תמיכה היא החלטה פתוחה, ואם תאושר – כל כניסה תירשם ביומן הביקורת.</Callout>
          <Card title="פניות תמיכה">{db.tickets.filter((t) => t.officeId === id).map((t) => <div key={t.id} className="row between small" style={{ padding: '4px 0' }}><button type="button" className="linkish" onClick={() => nav(`/admin/tickets/${t.id}`)}>{t.subject}</button><StatusBadge s={t.status} /></div>)}{!db.tickets.some((t) => t.officeId === id) ? <span className="small muted">אין</span> : null}</Card>
        </div>
      </div>
      {st ? <Confirm title="שינוי מצב מנוי" onClose={() => setSt(null)} onConfirm={() => { run(A.setOfficeStatus, id, st); toast(`מצב המנוי של ${o.name} שונה ל"${st}" ונרשם ביומן הביקורת`); }}>להעביר את {o.name} למצב "{st}"? הפעולה תירשם ביומן הביקורת (בדמו – מדומה).</Confirm> : null}
    </div>
  );
}

function allPlatformUsers(db: any) {
  if (IS_LIVE) return db.users.map((u: T.User) => { const o = db.platformOffices.find((x: T.PlatformOffice) => x.id === u.officeId); return { id: u.id, name: u.name, email: u.email, role: u.role, office: o ? o.name : 'ללא משרד', officeId: u.officeId || null, status: u.status, lastActive: u.lastActive }; });
  const real = db.users.map((u: T.User) => ({ id: u.id, name: u.name, email: u.email, role: u.role, office: u.officeId ? db.office.name : u.clientId ? `${db.office.name} (לקוח)` : 'פלטפורמה', officeId: u.officeId || (u.clientId ? 'off_1' : null), status: u.status, lastActive: u.lastActive }));
  const owners = db.platformOffices.filter((o: T.PlatformOffice) => o.id !== 'off_1').map((o: T.PlatformOffice) => ({ id: 'ow_' + o.id, name: o.ownerName, email: o.ownerEmail, role: 'owner', office: o.name, officeId: o.id, status: ['בוטל', 'פג תוקף'].includes(o.status) ? 'מושבת' : 'פעיל', lastActive: o.lastActive }));
  return [...real, ...owners];
}
function Users() {
  const { db, nav, live } = useStore();
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  let list = allPlatformUsers(db).filter((u: any) => role === 'all' || u.role === role);
  if (q.trim()) list = list.filter((u: any) => u.name.includes(q) || u.email.includes(q) || u.office.includes(q));
  return (
    <div>
      <PageHead title="משתמשים" sub={IS_LIVE ? 'כל המשתמשים בפלטפורמה.' : 'כל המשתמשים בפלטפורמה. במשרדים שאינם משרד הדמו מוצגים הבעלים בלבד.'} />
      <div className="filters"><SearchBox value={q} onChange={setQ} placeholder="חיפוש שם, מייל או משרד" id="au-s" /><Chips value={role} onChange={setRole} options={[{ value: 'all', label: 'הכול' }, ...(['owner', 'admin', 'member', 'client', 'super_admin'] as T.Role[]).map((r) => ({ value: r, label: ROLE_SHORT[r] }))]} /></div>
      <div className="card"><DataTable rows={list} onRow={(u: any) => nav(`/admin/users/${u.id}`)} pageSize={15} columns={[
        { key: 'name', label: 'שם', render: (u: any) => <div className="col" style={{ gap: 0 }}><b>{u.name}</b><span className="xs muted ltr" style={{ textAlign: 'right' }}>{u.email}</span></div> },
        { key: 'role', label: 'תפקיד', render: (u: any) => <Badge tone={u.role === 'super_admin' ? 'accent' : u.role === 'owner' ? 'navy' : ''}>{ROLE_SHORT[u.role as T.Role]}</Badge> },
        { key: 'office', label: 'משרד' },
        { key: 'status', label: 'סטטוס', render: (u: any) => <StatusBadge s={u.status} /> },
        { key: 'lastActive', label: 'פעילות אחרונה', render: (u: any) => <span className="small">{ago(u.lastActive)}</span> },
      ]} /></div>
    </div>
  );
}
function UserDetail({ id }: { id: string }) {
  const { db, nav, toast, live } = useStore();
  const u = allPlatformUsers(db).find((x: any) => x.id === id);
  if (!u) return <Empty title="המשתמש לא נמצא" />;
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHead crumbs={[{ label: 'משתמשים', to: '/admin/users' }, { label: u.name }]} title={u.name} badge={<StatusBadge s={u.status} />} />
      <div className="grid-2">
        <Card title="פרטים"><KV items={[['מייל', <span className="ltr">{u.email}</span>], ['תפקיד', ROLE_SHORT[u.role as T.Role]], ['משרד', u.officeId ? <button type="button" className="linkish" onClick={() => nav(`/admin/offices/${u.officeId}`)}>{u.office}</button> : u.office], ['פעילות אחרונה', ago(u.lastActive)]]} /></Card>
        <Card title="פעולות תמיכה" actions={<DemoTag />}>
          <div className="col g8">
            <Btn size="sm" onClick={() => toast('קישור לאיפוס סיסמה נרשם ביומן המיילים (לא נשלח)', 'info')}>שליחת קישור לאיפוס סיסמה</Btn>
            {IS_LIVE ? <Btn size="sm" kind="danger" disabled title="נעילת חשבון מתבצעת כרגע מלוח הבקרה של Supabase (Authentication → Users)">נעילת חשבון</Btn> : <Btn size="sm" kind="danger" onClick={() => toast('המשתמש סומן לנעילה (הדמיה)', 'info')}>נעילת חשבון</Btn>}
            <span className="xs muted">בייצור – דרך Supabase Auth Admin, עם רישום ביומן הביקורת.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Subscriptions() {
  const { db, nav, live } = useStore();
  const [status, setStatus] = useState('all');
  const list = db.platformOffices.filter((o) => status === 'all' || o.status === status);
  return (
    <div>
      <PageHead title="מנויים" badge={IS_LIVE ? <AssumeTag>ספק סליקה טרם חובר</AssumeTag> : <DemoTag>חיובים מדומים</DemoTag>} sub="מצב המנוי של כל משרד. שינויים מתבצעים מכרטיס המשרד." />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {(['פעיל', 'תקופת ניסיון', 'חוב פתוח', 'יבוטל בסוף התקופה'] as const).map((s) => <Stat key={s} label={s} value={db.platformOffices.filter((o) => o.status === s).length} tone={s === 'חוב פתוח' ? 'alert' : s === 'יבוטל בסוף התקופה' ? 'warn' : ''} onClick={() => setStatus(s)} />)}
      </div>
      <div className="filters"><Chips value={status} onChange={setStatus} options={[{ value: 'all', label: 'הכול' }, ...SUB_STATUSES.map((s) => ({ value: s, label: s }))]} /></div>
      <div className="card"><DataTable rows={list} onRow={(o: any) => nav(`/admin/offices/${o.id}`)} columns={[
        { key: 'name', label: 'משרד', render: (o: T.PlatformOffice) => <b>{o.name}</b> },
        { key: 'planId', label: 'מסלול', render: (o: T.PlatformOffice) => o.planId === 'pro' ? 'Pro' : 'Starter' },
        { key: 'status', label: 'מצב', render: (o: T.PlatformOffice) => <StatusBadge s={o.status} /> },
        { key: 'mrr', label: 'MRR', num: true, render: (o: T.PlatformOffice) => ils(o.mrr) },
        { key: 'users', label: 'מושבים', num: true, render: (o: T.PlatformOffice) => `${o.users} / ${o.planId === 'pro' ? db.subscriptionPlans[1].limits.users : db.subscriptionPlans[0].limits.users}` },
      ]} /></div>
    </div>
  );
}

function Pricing() {
  const { db, run, toast, nav, live } = useStore();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [confirm, setConfirm] = useState<null | (() => void)>(null);
  const plans = db.subscriptionPlans;
  const val = (pid: string, k: string, fallback: any) => draft[pid + k] ?? fallback;
  return (
    <div>
      <PageHead title="מסלולים ותמחור" sub="עריכת מחירים, מגבלות ויכולות לכל מסלול. כל שינוי נרשם ביומן שינויי המחיר." actions={<Btn onClick={() => nav('/admin/pricing-log')}>יומן שינויים</Btn>} />
      <Callout kind="assume" title={IS_LIVE ? 'מחירים זמניים' : 'מחירי דמו'}>{IS_LIVE ? '₪149 ו-₪299 הם מחירים זמניים שטרם אושרו. שינוי כאן משפיע מיד על עמוד התמחור ועל מסכי המנוי. אחרי חיבור ספק סליקה, שינוי מחיר יחייב גם סנכרון מולו והחלטה לגבי מנויים קיימים.' : '₪149 ו-₪299 הם מחירים זמניים שטרם אושרו. שינוי כאן משפיע מיד על עמוד התמחור ועל מסכי המנוי בדמו. בייצור, שינוי מחיר יחייב סנכרון עם ספק הסליקה והחלטה לגבי מנויים קיימים.'}</Callout>
      <div className="grid-2 mt16">
        {plans.map((p) => (
          <Card key={p.id} title={p.name} actions={<Badge tone="warn">{p.priceConfirmed ? 'מאושר' : 'טיוטה – לא מאושר'}</Badge>}>
            <div className="stack">
              <div className="form-grid">
                <Field label="מחיר חודשי (₪)" htmlFor={`pr-m-${p.id}`}><Input id={`pr-m-${p.id}`} type="number" min={0} value={val(p.id, 'm', p.priceMonthly)} onChange={(e: any) => setDraft({ ...draft, [p.id + 'm']: e.target.value })} /></Field>
                <Field label="מחיר שנתי לחודש (₪)" htmlFor={`pr-y-${p.id}`}><Input id={`pr-y-${p.id}`} type="number" min={0} value={val(p.id, 'y', p.priceYearlyPerMonth)} onChange={(e: any) => setDraft({ ...draft, [p.id + 'y']: e.target.value })} /></Field>
                <Field label="משתמשים (ריק = ללא הגבלה)" htmlFor={`pr-u-${p.id}`}><Input id={`pr-u-${p.id}`} type="number" min={1} value={val(p.id, 'u', p.limits.users ?? '')} onChange={(e: any) => setDraft({ ...draft, [p.id + 'u']: e.target.value })} /></Field>
                <Field label="פרויקטים פעילים" htmlFor={`pr-p-${p.id}`}><Input id={`pr-p-${p.id}`} type="number" min={1} value={val(p.id, 'p', p.limits.activeProjects ?? '')} onChange={(e: any) => setDraft({ ...draft, [p.id + 'p']: e.target.value })} /></Field>
              </div>
              <Btn kind="primary" icon={LuSave} onClick={() => setConfirm(() => () => {
                const m = Number(val(p.id, 'm', p.priceMonthly)), y = Number(val(p.id, 'y', p.priceYearlyPerMonth));
                if (m !== p.priceMonthly) run(A.setPlanPrice, p.id, 'priceMonthly', m);
                if (y !== p.priceYearlyPerMonth) run(A.setPlanPrice, p.id, 'priceYearlyPerMonth', y);
                const u = val(p.id, 'u', p.limits.users ?? ''); const pr = val(p.id, 'p', p.limits.activeProjects ?? '');
                if (String(u) !== String(p.limits.users ?? '')) run(A.setPlanLimit, p.id, 'users', u === '' ? null : Number(u));
                if (String(pr) !== String(p.limits.activeProjects ?? '')) run(A.setPlanLimit, p.id, 'activeProjects', pr === '' ? null : Number(pr));
                setDraft({}); toast(`מסלול ${p.name} עודכן ונרשם ביומן`);
              })}>שמירת שינויים</Btn>
              <div><div className="eyebrow mb8">יכולות במסלול</div><div className="col g8">{FEATURE_DEFS.map((f) => <Switch key={f.key} id={`pf-${p.id}-${f.key}`} checked={p.features[f.key]} onChange={() => { run(A.togglePlanFeature, p.id, f.key); toast(`${f.label}: ${p.features[f.key] ? 'הוסר' : 'נוסף'} במסלול ${p.name}`); }} label={f.label} />)}</div></div>
            </div>
          </Card>
        ))}
      </div>
      {confirm ? <Confirm title="שינוי תמחור" onClose={() => setConfirm(null)} onConfirm={confirm}>השינוי ישפיע על כל המשרדים במסלול{IS_LIVE ? ' מיד' : ' (בדמו – מיידית)'} וירשם ביומן שינויי המחיר. להמשיך?</Confirm> : null}
    </div>
  );
}
function PricingLog() {
  const { db, live } = useStore();
  return (
    <div>
      <PageHead crumbs={[{ label: 'מסלולים ותמחור', to: '/admin/pricing' }, { label: 'יומן' }]} title="יומן שינויי מחיר" />
      <div className="card"><DataTable rows={db.pricingChanges} initialSort={{ key: 'at', dir: -1 }} columns={[
        { key: 'at', label: 'מועד', render: (c: T.PricingChange) => <span className="small">{dateTime(c.at)}</span> },
        { key: 'planId', label: 'מסלול', render: (c: T.PricingChange) => c.planId === 'pro' ? 'Pro' : 'Starter' },
        { key: 'field', label: 'שדה' },
        { key: 'from', label: 'מ', render: (c: T.PricingChange) => <span className="code">{c.from}</span> },
        { key: 'to', label: 'ל', render: (c: T.PricingChange) => <span className="code">{c.to}</span> },
        { key: 'by', label: 'ע״י' },
        { key: 'note', label: 'הערה', render: (c: T.PricingChange) => <span className="small soft">{c.note || '—'}</span> },
      ]} /></div>
    </div>
  );
}

function Tickets() {
  const { db, nav, live } = useStore();
  const [status, setStatus] = useState('open');
  const list = db.tickets.filter((t) => status === 'all' || (status === 'open' ? t.status !== 'נסגר' : t.status === status));
  return (
    <div>
      <PageHead title="פניות תמיכה" sub="פניות מכל המשרדים." />
      <div className="filters"><Chips value={status} onChange={setStatus} options={[{ value: 'open', label: 'פתוחות' }, { value: 'פתוח', label: 'חדשות' }, { value: 'בטיפול', label: 'בטיפול' }, { value: 'ממתין למשתמש', label: 'ממתין למשתמש' }, { value: 'נסגר', label: 'נסגרו' }, { value: 'all', label: 'הכול' }]} /></div>
      <div className="card"><DataTable rows={list} onRow={(t: T.Ticket) => nav(`/admin/tickets/${t.id}`)} initialSort={{ key: 'createdAt', dir: -1 }} columns={[
        { key: 'number', label: 'מס׳', render: (t: T.Ticket) => <span className="code">{t.number}</span> },
        { key: 'subject', label: 'נושא', render: (t: T.Ticket) => <div className="col" style={{ gap: 0 }}><b>{t.subject}</b><span className="xs muted">{t.category}</span></div> },
        { key: 'office', label: 'משרד', render: (t: T.Ticket) => byId(db.platformOffices, t.officeId)?.name },
        { key: 'priority', label: 'עדיפות', render: (t: T.Ticket) => <StatusBadge s={t.priority} dot={false} /> },
        { key: 'status', label: 'סטטוס', render: (t: T.Ticket) => <StatusBadge s={t.status} /> },
        { key: 'assignee', label: 'מטפל' },
        { key: 'createdAt', label: 'נפתח', render: (t: T.Ticket) => <span className="small">{ago(t.createdAt)}</span> },
      ]} /></div>
    </div>
  );
}
export function TicketConversation({ t, side }: { t: T.Ticket; side: 'user' | 'support' }) {
  const { run, toast, live } = useStore();
  const [text, setText] = useState('');
  return (
    <div className="stack">
      <div className="chat">{t.messages.map((m, i) => <div key={i} className={cx('comment', m.side === side ? 'mine' : 'client')}><span className="av sm" style={{ background: m.side === 'support' ? 'var(--navy-2)' : 'var(--info)' }}>{m.side === 'support' ? 'AF' : m.name[0]}</span><div className="c-bubble"><div className="row between g8"><b className="small">{m.name}</b><span className="xs muted">{ago(m.at)}</span></div><div className="small" style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div></div></div>)}</div>
      {t.status !== 'נסגר' ? <form className="row g8" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; run(A.ticketReply, t.id, text.trim(), side); setText(''); toast('התגובה נשלחה'); }}><input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="כתיבת תגובה…" aria-label="תגובה" /><Btn kind="navy" type="submit" icon={LuSend} disabled={!text.trim()}>שליחה</Btn></form> : <Callout kind="info">הפנייה נסגרה.</Callout>}
    </div>
  );
}
function AdminTicket({ id }: { id: string }) {
  const { db, run, toast, live } = useStore();
  const t = byId(db.tickets, id);
  if (!t) return <Empty title="הפנייה לא נמצאה" />;
  return (
    <div>
      <PageHead crumbs={[{ label: 'פניות תמיכה', to: '/admin/tickets' }, { label: t.number }]} title={t.subject} badge={<StatusBadge s={t.status} />} sub={`${byId(db.platformOffices, t.officeId)?.name} · ${t.category}`} />
      <div className="grid-main-side">
        <Card title="שיחה"><TicketConversation t={t} side="support" /></Card>
        <Card title="ניהול פנייה">
          <div className="stack">
            <Field label="סטטוס" htmlFor="tk-s"><Select id="tk-s" value={t.status} onChange={(e: any) => { run(A.setTicket, id, { status: e.target.value }); toast('הסטטוס עודכן'); }} options={['פתוח', 'בטיפול', 'ממתין למשתמש', 'נסגר']} /></Field>
            <Field label="עדיפות" htmlFor="tk-p"><Select id="tk-p" value={t.priority} onChange={(e: any) => run(A.setTicket, id, { priority: e.target.value })} options={['נמוכה', 'רגילה', 'גבוהה', 'קריטית']} /></Field>
            <Field label="מטפל" htmlFor="tk-a"><Select id="tk-a" value={t.assignee} onChange={(e: any) => run(A.setTicket, id, { assignee: e.target.value })} options={['—', 'רון גבאי', 'צוות תמיכה']} /></Field>
            <KV items={[['נפתח', dateTime(t.createdAt)], ['הודעות', t.messages.length]]} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Announcements() {
  const { db, run, toast, live } = useStore();
  const [edit, setEdit] = useState<T.Announcement | null>(null);
  return (
    <div>
      <PageHead title="הודעות מערכת" sub="באנרים והודעות שמוצגים למשרדים." actions={<Btn kind="primary" icon={LuPlus} onClick={() => setEdit({ id: uid('ann'), title: '', body: '', audience: 'כל המשרדים', status: 'טיוטה', at: nowStamp() })}>הודעה חדשה</Btn>} />
      <div className="col g12">{db.announcements.map((a) => (
        <Card key={a.id} title={a.title} icon={LuMegaphone} actions={<><StatusBadge s={a.status} /><Btn size="sm" onClick={() => setEdit(a)}>עריכה</Btn></>}>
          <p className="small">{a.body}</p><div className="xs muted mt8">{a.audience} · {dateTime(a.at)}</div>
        </Card>
      ))}</div>
      {edit ? (
        <Modal title={edit.title ? 'עריכת הודעה' : 'הודעה חדשה'} onClose={() => setEdit(null)} foot={<><Btn kind="primary" onClick={() => { if (!edit.title.trim()) { toast('יש להזין כותרת', 'bad'); return; } run(A.saveAnnouncement, edit, !db.announcements.some((x) => x.id === edit.id)); toast(edit.status === 'פורסם' ? 'ההודעה פורסמה (בדמו מוצגת רק כאן)' : 'ההודעה נשמרה'); setEdit(null); }}>שמירה</Btn><Btn kind="ghost" onClick={() => setEdit(null)}>ביטול</Btn></>}>
          <div className="stack">
            <Field label="כותרת" htmlFor="an-t"><Input id="an-t" value={edit.title} onChange={(e: any) => setEdit({ ...edit, title: e.target.value })} /></Field>
            <Field label="תוכן" htmlFor="an-b"><Textarea id="an-b" rows={3} value={edit.body} onChange={(e: any) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <div className="form-grid"><Field label="קהל יעד" htmlFor="an-a"><Select id="an-a" value={edit.audience} onChange={(e: any) => setEdit({ ...edit, audience: e.target.value })} options={['כל המשרדים', 'בעלי משרדים', 'מסלול Pro', 'מסלול Starter', 'משרדים בניסיון']} /></Field><Field label="סטטוס" htmlFor="an-s"><Select id="an-s" value={edit.status} onChange={(e: any) => setEdit({ ...edit, status: e.target.value })} options={['טיוטה', 'מתוזמן', 'פורסם']} /></Field></div>
            <div><div className="eyebrow mb8">תצוגה מקדימה</div><Callout kind="info" icon={LuMegaphone} title={edit.title || 'כותרת'}>{edit.body || 'תוכן ההודעה'}</Callout></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
function Events() {
  const { db, live } = useStore();
  const [lvl, setLvl] = useState('all');
  return (
    <div>
      <PageHead title="אירועי מערכת" badge={IS_LIVE ? undefined : <DemoTag>אירועים מדומים</DemoTag>} sub="עיבוד קבצים, התראות, גיבויים וחיוב." />
      <div className="filters"><Chips value={lvl} onChange={setLvl} options={[{ value: 'all', label: 'הכול' }, { value: 'error', label: 'שגיאות' }, { value: 'warn', label: 'אזהרות' }, { value: 'info', label: 'מידע' }]} /></div>
      <div className="card"><DataTable rows={db.systemEvents.filter((e) => lvl === 'all' || e.level === lvl)} initialSort={{ key: 'at', dir: -1 }} columns={[
        { key: 'at', label: 'מועד', render: (e: T.SystemEvent) => <span className="small nowrap">{dateTime(e.at)}</span> },
        { key: 'level', label: 'רמה', render: (e: T.SystemEvent) => <Badge tone={e.level === 'error' ? 'bad' : e.level === 'warn' ? 'warn' : 'info'}>{e.level}</Badge> },
        { key: 'service', label: 'שירות', render: (e: T.SystemEvent) => <span className="code">{e.service}</span> },
        { key: 'message', label: 'הודעה' },
      ]} /></div>
    </div>
  );
}
function Audit() {
  const { db, live } = useStore();
  const [q, setQ] = useState('');
  const list = db.auditLog.filter((a) => !q.trim() || a.actor.includes(q) || a.action.includes(q) || a.target.includes(q));
  return (
    <div>
      <PageHead title="יומן ביקורת" sub={IS_LIVE ? 'שינויים רגישים בכל הפלטפורמה, כפי שנרשמו במסד הנתונים.' : 'פעולות רגישות בכל הפלטפורמה. בדמו נרשמות גם פעולות שמבוצעות בממשק.'} />
      <div className="filters"><SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי מבצע, פעולה או יעד" id="au-q" /></div>
      <div className="card"><DataTable rows={list} pageSize={15} initialSort={{ key: 'at', dir: -1 }} columns={[
        { key: 'at', label: 'מועד', render: (a: T.AuditEntry) => <span className="small nowrap">{dateTime(a.at)}</span> },
        { key: 'actor', label: 'מבצע' },
        { key: 'officeId', label: 'משרד', render: (a: T.AuditEntry) => a.officeId ? byId(db.platformOffices, a.officeId)?.name : 'פלטפורמה' },
        { key: 'action', label: 'פעולה', render: (a: T.AuditEntry) => <b className="small">{a.action}</b> },
        { key: 'target', label: 'יעד', render: (a: T.AuditEntry) => <span className="small soft">{a.target}</span> },
        { key: 'ip', label: 'IP', render: (a: T.AuditEntry) => <span className="code">{a.ip}</span> },
      ]} /></div>
    </div>
  );
}
function Retention() {
  const { db, toast, run, live } = useStore();
  return (
    <div>
      <PageHead title="מדיניות שמירת מידע" badge={<AssumeTag>טיוטה</AssumeTag>} sub="כמה זמן נשמר כל סוג מידע ומה קורה בסוף התקופה." />
      <Callout kind="bad" title="לא ייעוץ משפטי">התקופות כאן הן טיוטה לדיון. נדרשת בדיקה מול חוק הגנת הפרטיות, תקנות אבטחת מידע ודרישות חשבונאיות לפני קביעה סופית.</Callout>
      <div className="card mt16"><DataTable rows={(db as any).retentionPolicies} columns={[
        { key: 'dataType', label: 'סוג מידע', render: (r: any) => <b>{r.dataType}</b> },
        { key: 'period', label: 'תקופה', render: (r: any) => <select className="select sm" style={{ width: 'auto' }} value={r.period} onChange={(e) => { run((d: any) => { d.retentionPolicies.find((x: any) => x.id === r.id).period = e.target.value; }); toast('התקופה עודכנה בטיוטה'); }} aria-label={`תקופה – ${r.dataType}`}>{[...new Set([r.period, '30 יום', '90 יום', '12 חודשים', '24 חודשים', '7 שנים'])].map((p) => <option key={p}>{p}</option>)}</select> },
        { key: 'action', label: 'פעולה בסוף התקופה' },
        { key: 'status', label: 'סטטוס', render: (r: any) => <Badge tone="warn">{r.status}</Badge> },
      ]} /></div>
    </div>
  );
}
function PlatformSettings() {
  const { toast, live } = useStore();
  const [s, setS] = useState({ maxFile: 250, trial: 14, maintenance: false, signups: true, autoAnalysis: false, sender: 'notifications@archiflow.example.com' });
  return (
    <div style={{ maxWidth: 820 }}>
      <PageHead title="הגדרות פלטפורמה" badge={<DemoTag>לא נשמר לשרת</DemoTag>} />
      <div className="stack-lg">
        <Card title="קבצים">
          <div className="form-grid"><Field label="גודל קובץ מרבי (MB)" htmlFor="ps-f"><Input id="ps-f" type="number" value={s.maxFile} onChange={(e: any) => setS({ ...s, maxFile: e.target.value })} /></Field><Field label="פורמטים מותרים"><div className="row g4 wrap">{['PDF', 'JPG', 'PNG', 'DWG', 'DXF', 'DOCX', 'XLSX', 'ZIP'].map((f) => <span key={f} className="code">{f}</span>)}</div></Field></div>
        </Card>
        <Card title="הרשמה ומנויים"><div className="col g12"><Switch id="ps-su" checked={s.signups} onChange={(v: boolean) => setS({ ...s, signups: v })} label="פתוח להרשמת משרדים חדשים" /><Field label="ימי ניסיון ברירת מחדל" htmlFor="ps-t"><Input id="ps-t" type="number" value={s.trial} onChange={(e: any) => setS({ ...s, trial: e.target.value })} style={{ maxWidth: 140 }} /></Field></div></Card>
        <Card title="תפעול"><div className="col g12"><Switch id="ps-m" checked={s.maintenance} onChange={(v: boolean) => setS({ ...s, maintenance: v })} label="מצב תחזוקה (הודעה לכל המשתמשים)" /><div className="row g8"><Switch id="ps-a" checked={s.autoAnalysis} onChange={(v: boolean) => setS({ ...s, autoAnalysis: v })} label="ניתוח שרטוטים אוטומטי" /><FutureTag /></div></div></Card>
        <Card title="מייל יוצא" actions={<FutureTag>Resend</FutureTag>}><Field label="כתובת שולח" htmlFor="ps-e" hint="בייצור: דומיין מאומת ב-Resend"><Input id="ps-e" className="ltr" value={s.sender} onChange={(e: any) => setS({ ...s, sender: e.target.value })} /></Field></Card>
        <div><Btn kind="primary" icon={LuSave} onClick={() => toast(IS_LIVE ? 'ההגדרות במסך הזה עדיין לא נשמרות בשרת' : 'ההגדרות נשמרו מקומית (הדמיה)', 'info')}>שמירה</Btn></div>
      </div>
    </div>
  );
}
