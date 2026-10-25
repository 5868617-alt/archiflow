import { IS_LIVE } from '../data/dates';
import { pwProblem } from '../live/AuthLive';
import { friendlyError } from '../live/errors';
import { useState } from 'react';
import { LuBuilding2, LuPlug, LuWallet, LuShieldCheck, LuDatabase, LuSave, LuRotateCcw, LuUsers, LuBell } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, ROLE_LABEL } from '../data/api';
import { PageHead, Btn, Card, KV, Tabs, Field, Input, Select, Textarea, Callout, Switch, Badge, FutureTag, DemoTag, Avatar, Confirm } from '../ui/core';
import { CalendarSync } from './Calendar';
import { date } from '../lib/format';

export function SettingsPage({ query }: any) {
  const { db, me, run, toast, nav, reset, live } = useStore();
  const [tab, setTab] = useState(query.tab || 'office');
  const can = me.role === 'owner' || me.role === 'admin';
  const [o, setO] = useState({ ...db.office, specialties: db.office.specialties.join(', ') });
  const [err, setErr] = useState<any>({});
  const [warn, setWarn] = useState(db.settings.budgetWarnPct);
  const [resetC, setResetC] = useState(false);
  const integrations = [
    ['Supabase', 'מסד נתונים, התחברות, אחסון קבצים ו-RLS', 'שלב הייצור'],
    ['Resend', 'שליחת מיילים: אישורים, תזכורות, הזמנות', 'שלב הייצור'],
    ['Make.com', 'אוטומציות (למשל: ליד חדש מטופס אתר)', 'עתידי'],
    ['Google Calendar / Outlook', 'סנכרון פגישות', 'עתידי'],
    ['ספק סליקה', 'חיוב מנויים', 'טרם נבחר'],
    ['מערכת חשבוניות', 'הפקת חשבוניות מס', 'טרם נבחר'],
  ];
  return (
    <div>
      <PageHead title="הגדרות משרד" sub="פרופיל המשרד, תקציב, אינטגרציות ונתוני הדגמה." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'office', label: 'פרופיל משרד', icon: LuBuilding2 }, { id: 'budget', label: 'תקציבים', icon: LuWallet }, { id: 'integrations', label: 'אינטגרציות', icon: LuPlug }, { id: 'security', label: 'אבטחה ופרטיות', icon: LuShieldCheck }, { id: 'data', label: 'נתוני הדגמה', icon: LuDatabase }]} />
      {tab === 'office' ? (
        <div className="grid-main-side">
          <Card title="פרטי המשרד">
            <div className="form-grid">
              <Field label="שם המשרד *" error={err.name} htmlFor="of-n"><Input id="of-n" value={o.name} disabled={!can} invalid={err.name} onChange={(e: any) => setO({ ...o, name: e.target.value })} /></Field>
              <Field label="שם משפטי" htmlFor="of-l"><Input id="of-l" value={o.legalName} disabled={!can} onChange={(e: any) => setO({ ...o, legalName: e.target.value })} /></Field>
              <Field label="ח.פ. / ע.מ." error={err.vat} htmlFor="of-v"><Input id="of-v" className="ltr" value={o.vatId} disabled={!can} invalid={err.vat} onChange={(e: any) => setO({ ...o, vatId: e.target.value })} /></Field>
              <Field label="טלפון" htmlFor="of-p"><Input id="of-p" className="ltr" value={o.phone} disabled={!can} onChange={(e: any) => setO({ ...o, phone: e.target.value })} /></Field>
              <Field label="מייל" error={err.email} htmlFor="of-e"><Input id="of-e" className="ltr" value={o.email} disabled={!can} invalid={err.email} onChange={(e: any) => setO({ ...o, email: e.target.value })} /></Field>
              <Field label="עיר" htmlFor="of-c"><Input id="of-c" value={o.city} disabled={!can} onChange={(e: any) => setO({ ...o, city: e.target.value })} /></Field>
              <Field label="כתובת" full htmlFor="of-a"><Input id="of-a" value={o.address} disabled={!can} onChange={(e: any) => setO({ ...o, address: e.target.value })} /></Field>
              <Field label="תחומי התמחות" full hint="מופרדים בפסיקים" htmlFor="of-s"><Input id="of-s" value={o.specialties} disabled={!can} onChange={(e: any) => setO({ ...o, specialties: e.target.value })} /></Field>
              <Field label="ראשי תיבות ללוגו" htmlFor="of-lg" hint="מוצג בפורטל הלקוחות"><Input id="of-lg" value={o.logoText} maxLength={3} disabled={!can} onChange={(e: any) => setO({ ...o, logoText: e.target.value })} /></Field>
            </div>
            {can ? <div className="mt16"><Btn kind="primary" icon={LuSave} onClick={() => {
              const e: any = {}; if (!o.name.trim()) e.name = 'שדה חובה'; if (!/^\d{9}$/.test(o.vatId)) e.vat = 'יש להזין 9 ספרות'; if (!/^\S+@\S+\.\S+$/.test(o.email)) e.email = 'מייל לא תקין'; setErr(e); if (Object.keys(e).length) return;
              run(A.updateOffice, { ...o, specialties: o.specialties.split(',').map((x: string) => x.trim()).filter(Boolean) }); toast('פרטי המשרד נשמרו');
            }}>שמירה</Btn></div> : <div className="mt16 small muted">רק בעלים ומנהלים יכולים לערוך.</div>}
          </Card>
          <div className="stack-lg">
            <Card title="תצוגה בפורטל"><div className="row g12"><span className="portal-logo">{o.logoText}</span><div><b>{o.name}</b><div className="xs muted">כך יופיע המשרד ללקוחות</div></div></div></Card>
            <Card title="קיצורי דרך"><div className="col g8"><Btn icon={LuUsers} onClick={() => nav('/team')}>צוות והרשאות</Btn><Btn icon={LuBell} onClick={() => nav('/notifications?tab=prefs')}>העדפות התראה</Btn><Btn onClick={() => nav('/billing')}>מנוי וחיוב</Btn><Btn onClick={() => nav('/onboarding')}>{IS_LIVE ? 'פתיחת משרד נוסף' : 'אשף הקמת משרד (תצוגה)'}</Btn></div></Card>
          </div>
        </div>
      ) : null}
      {tab === 'budget' ? (
        <Card title="התראות תקציב" actions={IS_LIVE ? undefined : <DemoTag />}>
          <div className="stack" style={{ maxWidth: 480 }}>
            <Field label={`סף התראה: ${warn}% מתקציב הפרויקט`} htmlFor="bw"><input id="bw" type="range" min={50} max={100} step={5} value={warn} disabled={!can} onChange={(e) => setWarn(Number(e.target.value))} /></Field>
            <span className="small soft">חריגה בסעיף בודד תמיד מתריעה, ללא קשר לסף.</span>
            {can ? <div><Btn kind="primary" onClick={() => { run(A.setSetting, 'budgetWarnPct', warn); toast('סף ההתראה עודכן'); }}>שמירה</Btn></div> : null}
          </div>
        </Card>
      ) : null}
      {tab === 'integrations' ? (
        <div className="grid-main-side">
          <Card title="אינטגרציות" pad={false} actions={<FutureTag>{IS_LIVE ? 'עדיין לא מחוברות' : 'אף אחת לא מחוברת בדמו'}</FutureTag>}>
            <div className="list">{integrations.map(([n, d, s]) => <div key={n} className="li"><span className="li-ic"><LuPlug aria-hidden /></span><div className="li-main"><div className="li-title ltr" style={{ textAlign: 'right' }}>{n}</div><div className="li-sub">{d}</div></div><Badge tone={s === 'שלב הייצור' ? 'info' : s === 'עתידי' ? 'violet' : 'warn'}>{s}</Badge><Btn size="sm" disabled title={IS_LIVE ? 'יתווסף בהמשך' : 'לא זמין בדמו'}>חיבור</Btn></div>)}</div>
          </Card>
          <CalendarSync />
        </div>
      ) : null}
      {tab === 'security' ? (
        <div className="stack-lg">
          {IS_LIVE ? <Callout kind="ok" title="האבטחה נאכפת בשרת">התחברות אמיתית, הרשאות לפי תפקיד ושיוך לפרויקט, והפרדה מלאה בין משרדים – הכול נאכף במסד הנתונים ולא רק בממשק.</Callout> : <Callout kind="bad" title="אין אבטחה אמיתית בדמו">ההתחברות, ההרשאות והגבלות הגישה מדומות בדפדפן. כל אחד שפותח את הקישור יכול להחליף תפקיד. אין להזין מידע אמיתי.</Callout>}
          <Card title={IS_LIVE ? 'מה נאכף' : 'מה יאכף בייצור'}>
            <ul className="small" style={{ margin: 0, paddingInlineStart: 18, lineHeight: 2 }}>
              <li>{IS_LIVE ? 'התחברות דרך Supabase Auth עם אימות מייל. אימות דו-שלבי – בשלב הבא.' : 'התחברות דרך Supabase Auth (מייל + סיסמה / קישור קסם), אימות דו-שלבי לבעלים – לשיקול.'}</li>
              <li>Row Level Security לכל טבלה לפי office_id ושיוך לפרויקט; לקוח רואה רק רשומות עם shared_with_client.</li>
              <li>אחסון קבצים בדליים פרטיים עם קישורים חתומים לזמן מוגבל.</li>
              <li>יומן ביקורת לפעולות רגישות: הרשאות, מחיקות, ייצוא, גישת Super Admin.</li>
            </ul>
          </Card>
        </div>
      ) : null}
      {tab === 'data' ? (
        <Card title="נתוני הדגמה">
          <div className="stack">
            <KV items={[['פרויקטים', db.projects.length], ['משימות', db.tasks.length], ['שרטוטים', db.plans.length], ['פריטי מפרט', db.specItems.length], ['הוצאות', db.expenses.length], ['נשמר', 'בדפדפן הזה בלבד']]} />
            <div><Btn kind="danger" icon={LuRotateCcw} onClick={() => setResetC(true)}>איפוס כל נתוני ההדגמה</Btn></div>
          </div>
        </Card>
      ) : null}
      {resetC ? <Confirm title="איפוס נתוני הדגמה" danger confirmLabel="איפוס" onClose={() => setResetC(false)} onConfirm={reset}>כל השינויים שביצעתם יימחקו והנתונים יחזרו למצב ההתחלתי.</Confirm> : null}
    </div>
  );
}

export function ProfilePage() {
  const { db, me, run, toast, live } = useStore();
  const [f, setF] = useState({ name: me.name, phone: me.phone || '', title: me.title });
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHead title="הפרופיל שלי" />
      <div className="stack-lg">
        <Card>
          <div className="row g16 wrap"><Avatar user={me} size="xl" /><div><b className="lg">{me.name}</b><div className="small muted">{ROLE_LABEL[me.role]}</div><div className="xs muted">במשרד מאז {date(me.joinedAt)}</div></div></div>
          <div className="form-grid mt16">
            <Field label="שם" htmlFor="pf-n"><Input id="pf-n" value={f.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="תפקיד במשרד" htmlFor="pf-t"><Input id="pf-t" value={f.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="טלפון" htmlFor="pf-p"><Input id="pf-p" className="ltr" value={f.phone} onChange={(e: any) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="מייל" htmlFor="pf-e" hint={IS_LIVE ? 'לשינוי מייל פנו לתמיכה' : 'שינוי מייל ידרוש אימות (בייצור)'}><Input id="pf-e" className="ltr" value={me.email} disabled /></Field>
          </div>
          <div className="mt16"><Btn kind="primary" onClick={() => { if (!f.name.trim()) return; run((d: any, c: any) => Object.assign(d.users.find((u: any) => u.id === c.me.id), f)); toast('הפרופיל נשמר'); }}>שמירה</Btn></div>
        </Card>
        {IS_LIVE ? <PasswordCard /> : <Card title="סיסמה ואבטחה"><div className="row g8 wrap"><Btn disabled title="לא זמין בדמו">שינוי סיסמה</Btn><Btn disabled title="לא זמין בדמו">אימות דו-שלבי</Btn><DemoTag>אין התחברות אמיתית בדמו</DemoTag></div></Card>}
      </div>
    </div>
  );
}

function PasswordCard() {
  const { live, toast } = useStore();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const save = async () => {
    const p = pwProblem(pw); if (p) { setErr(p); return; } if (pw !== pw2) { setErr('הסיסמאות לא זהות'); return; }
    setBusy(true); setErr('');
    try { await live!.api.updatePassword(pw); setPw(''); setPw2(''); toast('הסיסמה עודכנה'); } catch (x: any) { setErr(friendlyError(x)); } finally { setBusy(false); }
  };
  return (
    <Card title="סיסמה ואבטחה">
      <div className="form-grid">
        <Field label="סיסמה חדשה" hint="לפחות 10 תווים, אותיות ומספרים" htmlFor="pw-1"><Input id="pw-1" type="password" autoComplete="new-password" value={pw} onChange={(e: any) => setPw(e.target.value)} /></Field>
        <Field label="אימות סיסמה" htmlFor="pw-2"><Input id="pw-2" type="password" autoComplete="new-password" value={pw2} onChange={(e: any) => setPw2(e.target.value)} /></Field>
      </div>
      {err ? <div className="mt8"><Callout kind="bad">{err}</Callout></div> : null}
      <div className="row g8 wrap mt16"><Btn kind="primary" onClick={save} disabled={busy}>{busy ? 'שומר…' : 'עדכון סיסמה'}</Btn><Btn kind="ghost" onClick={() => live!.signOut()}>התנתקות</Btn><FutureTag>אימות דו-שלבי – בשלב הבא</FutureTag></div>
    </Card>
  );
}
