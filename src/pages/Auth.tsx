import { useState } from 'react';
import { LuLogIn, LuMail, LuArrowRight, LuCheck, LuCrown, LuHouse, LuBriefcase, LuUserCog, LuShieldAlert, LuPlus, LuX } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, ROLE_SHORT, uid } from '../data/api';
import { todayISO } from '../data/dates';
import { Btn, Field, Input, Select, Callout, Check, cx, Segmented } from '../ui/core';
import { PlanSvg } from '../ui/PlanSvg';
import { Logo } from '../ui/charts';
import { PERSONAS } from '../shells/common';

export function AuthLayout({ children, title, sub }: any) {
  const { nav, live } = useStore();
  return (
    <div className="auth-wrap">
      <div className="auth-form">
        <div className="auth-card stack-lg">
          <button type="button" className="row g8" style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink)', padding: 0 }} onClick={() => nav('/pricing')}><Logo /><span className="display" style={{ fontSize: '1.4rem' }}>Archi<span style={{ color: 'var(--accent-hover)' }}>Flow</span></span></button>
          <div><h1 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>{title}</h1>{sub ? <p className="soft mt8">{sub}</p> : null}</div>
          {children}
        </div>
      </div>
      <div className="auth-art">
        <div style={{ position: 'absolute', inset: '10% -14% auto -6%', opacity: 0.5, ['--plan-paper' as any]: 'transparent', ['--plan-ink' as any]: 'rgba(169,179,201,.55)', ['--plan-fill' as any]: 'transparent', ['--blueprint' as any]: 'rgba(242,183,5,.6)' }} aria-hidden><PlanSvg layout="villa-ground" /></div>
        <div style={{ position: 'relative' }}>{live ? null : <span className="admin-badge">גרסת הדגמה</span>}</div>
        <div style={{ position: 'relative', maxWidth: 440 }}>
          <div className="display" style={{ fontSize: '2.2rem', lineHeight: 1.2, color: 'var(--on-navy)' }}>כל הפרויקט, משרטוט ראשון ועד מסירת מפתח.</div>
          <p style={{ color: 'var(--on-navy-2)', marginTop: 12 }}>שרטוטים עם גרסאות והערות, מפרטים שהלקוח מאשר בפורטל, רכש ותקציב – במקום אחד.</p>
        </div>
      </div>
    </div>
  );
}

const DemoNote = () => <Callout kind="assume" icon={LuShieldAlert} title="התחברות מדומה">אין כאן אימות אמיתי: כל סיסמה תתקבל, ואין לשמור או להזין פרטים אמיתיים. בייצור – Supabase Auth.</Callout>;

export function Login() {
  const { db, nav, switchUser, live } = useStore();
  const [email, setEmail] = useState('yoav@levibarak.example.co.il');
  const [pw, setPw] = useState('demo1234');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = (e: any) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('כתובת המייל לא תקינה'); return; }
    if (!pw) { setErr('יש להזין סיסמה'); return; }
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) { setErr('לא נמצא משתמש עם המייל הזה בנתוני ההדגמה. נסו אחד מהמשתמשים למטה.'); return; }
    if (u.status === 'מושבת') { setErr('המשתמש הושבת ע״י מנהל המשרד.'); return; }
    setErr(''); setBusy(true);
    setTimeout(() => { setBusy(false); switchUser(u.id); }, 700);
  };
  return (
    <AuthLayout title="כניסה לחשבון" sub="ברוכים השבים.">
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="מייל" htmlFor="lg-e"><Input id="lg-e" className="ltr" type="email" autoComplete="off" value={email} onChange={(e: any) => setEmail(e.target.value)} invalid={!!err} /></Field>
        <Field label="סיסמה" htmlFor="lg-p"><Input id="lg-p" type="password" autoComplete="off" value={pw} onChange={(e: any) => setPw(e.target.value)} /></Field>
        {err ? <Callout kind="bad">{err}</Callout> : null}
        <div className="row between"><Check id="lg-r" checked onChange={() => {}} label="זכירת המכשיר" /><button type="button" className="linkish small" onClick={() => nav('/forgot')}>שכחתי סיסמה</button></div>
        <Btn kind="primary" size="lg" block type="submit" icon={busy ? undefined : LuLogIn} disabled={busy}>{busy ? <><span className="spinner" style={{ width: 16, height: 16 }} />מתחבר…</> : 'כניסה'}</Btn>
        <div className="small t-center">אין חשבון? <button type="button" className="linkish" onClick={() => nav('/register')}>פתיחת משרד חדש</button></div>
      </form>
      <DemoNote />
      <div>
        <div className="eyebrow mb8">כניסה מהירה לפי תפקיד</div>
        <div className="col g8">
          {PERSONAS.map((p) => {
            const u = db.users.find((x) => x.id === p.id)!;
            const Ic = u.role === 'super_admin' ? LuCrown : u.role === 'client' ? LuHouse : u.role === 'owner' ? LuBriefcase : LuUserCog;
            return <button key={p.id} type="button" className="card link row g12" style={{ padding: '10px 12px', textAlign: 'right', font: 'inherit', color: 'inherit' }} onClick={() => switchUser(p.id)}><span className="li-ic"><Ic aria-hidden /></span><span className="grow"><b className="small">{u.name} · {ROLE_SHORT[u.role]}</b><span className="xs muted" style={{ display: 'block' }}>{p.note}</span></span></button>;
          })}
        </div>
      </div>
    </AuthLayout>
  );
}

export function Register() {
  const { nav, path, live } = useStore();
  const plan = path.includes('plan=starter') ? 'starter' : 'pro';
  const [f, setF] = useState({ office: '', name: '', email: '', pw: '', plan, terms: false });
  const [err, setErr] = useState<any>({});
  return (
    <AuthLayout title="פתיחת משרד ב-ArchiFlow" sub="14 ימי ניסיון. בלי כרטיס אשראי (הנחת דמו).">
      <form className="stack" noValidate onSubmit={(e) => {
        e.preventDefault(); const x: any = {};
        if (!f.office.trim()) x.office = 'יש להזין שם משרד'; if (!f.name.trim()) x.name = 'יש להזין שם'; if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'מייל לא תקין'; if (f.pw.length < 8) x.pw = 'לפחות 8 תווים'; if (!f.terms) x.terms = 'יש לאשר את התנאים';
        setErr(x); if (Object.keys(x).length) return; nav(`/onboarding?office=${encodeURIComponent(f.office)}&plan=${f.plan}`);
      }}>
        <Field label="שם המשרד *" error={err.office} htmlFor="rg-o"><Input id="rg-o" value={f.office} invalid={err.office} onChange={(e: any) => setF({ ...f, office: e.target.value })} /></Field>
        <Field label="שם מלא *" error={err.name} htmlFor="rg-n"><Input id="rg-n" value={f.name} invalid={err.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="מייל *" error={err.email} htmlFor="rg-e"><Input id="rg-e" className="ltr" autoComplete="off" value={f.email} invalid={err.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="סיסמה *" error={err.pw} hint="לפחות 8 תווים" htmlFor="rg-p"><Input id="rg-p" type="password" autoComplete="new-password" value={f.pw} invalid={err.pw} onChange={(e: any) => setF({ ...f, pw: e.target.value })} /></Field>
        <Field label="מסלול לניסיון"><Segmented value={f.plan} onChange={(v: string) => setF({ ...f, plan: v })} options={[{ value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }]} /></Field>
        <div><Check id="rg-t" checked={f.terms} onChange={(v: boolean) => setF({ ...f, terms: v })} label="אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות (טקסט לדוגמה)" />{err.terms ? <div className="xs bad-t">{err.terms}</div> : null}</div>
        <Btn kind="primary" size="lg" block type="submit">יצירת חשבון והמשך</Btn>
        <div className="small t-center">כבר יש חשבון? <button type="button" className="linkish" onClick={() => nav('/login')}>כניסה</button></div>
      </form>
      <DemoNote />
    </AuthLayout>
  );
}

export function Forgot() {
  const { nav, live } = useStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  return (
    <AuthLayout title="שחזור סיסמה" sub="נשלח קישור לאיפוס לכתובת המייל של החשבון.">
      {sent ? (
        <div className="stack">
          <Callout kind="ok" title="אם קיים חשבון עם הכתובת הזו – נשלח אליו קישור">בדמו לא נשלח מייל בפועל. ההודעה מנוסחת כך שלא תחשוף אם הכתובת רשומה.</Callout>
          <Btn icon={LuArrowRight} onClick={() => nav('/login')}>חזרה לכניסה</Btn>
        </div>
      ) : (
        <form className="stack" noValidate onSubmit={(e) => { e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('כתובת המייל לא תקינה'); return; } setSent(true); }}>
          <Field label="מייל" error={err} htmlFor="fg-e"><Input id="fg-e" className="ltr" value={email} invalid={err} onChange={(e: any) => setEmail(e.target.value)} /></Field>
          <Btn kind="primary" size="lg" block type="submit" icon={LuMail}>שליחת קישור</Btn>
          <button type="button" className="linkish small" onClick={() => nav('/login')}>חזרה לכניסה</button>
        </form>
      )}
    </AuthLayout>
  );
}

export function Onboarding() {
  const { db, path, nav, switchUser, run, toast, live } = useStore();
  const q = new URLSearchParams(path.split('?')[1] || '');
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ office: q.get('office') || db.office.name, city: 'תל אביב-יפו', size: '2–5', specialties: ['דירות יוקרה'] as string[], template: 'tpl_1', invites: [''] as string[], plan: q.get('plan') || 'pro' });
  const steps = ['פרטי המשרד', 'תחומי עבודה', 'הזמנת צוות', 'סיום'];
  const specs = ['דירות יוקרה', 'וילות', 'שיפוצים', 'מסחר ואירוח', 'משרדים', 'מבנים לשימור', 'נוף'];
  const finish = () => {
    run((d: any) => { d.office.name = f.office; d.office.city = f.city; d.office.specialties = f.specialties; });
    f.invites.filter((e) => /^\S+@\S+\.\S+$/.test(e)).forEach((e) => run(A.invite, { id: uid('inv'), officeId: 'off_1', email: e, name: e.split('@')[0], role: 'member', sentAt: todayISO, sentBy: 'u_michal', status: 'ממתינה' }));
    toast('המשרד הוגדר. לצורך ההדגמה נכנסת כבעלת המשרד עם נתוני הדוגמה.', 'info');
    switchUser('u_michal');
  };
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px max(16px, env(safe-area-inset-left, 0px)) 64px max(16px, env(safe-area-inset-right, 0px))' }}>
      <div className="row g8 mb8"><Logo /><b className="display" style={{ fontSize: '1.3rem' }}>הקמת המשרד</b></div>
      <div className="steps">{steps.map((s, i) => <span key={s} className="row" style={{ gap: 0 }}><span className={cx('step', i < step && 'done', i === step && 'on')}><span className="s-n">{i < step ? '✓' : i + 1}</span>{s}</span>{i < steps.length - 1 ? <span className="step-line" /> : null}</span>)}</div>
      <div className="card pad stack-lg">
        {step === 0 ? (
          <div className="form-grid">
            <Field label="שם המשרד" full htmlFor="ob-o"><Input id="ob-o" value={f.office} onChange={(e: any) => setF({ ...f, office: e.target.value })} /></Field>
            <Field label="עיר" htmlFor="ob-c"><Input id="ob-c" value={f.city} onChange={(e: any) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="גודל הצוות" htmlFor="ob-s"><Select id="ob-s" value={f.size} onChange={(e: any) => setF({ ...f, size: e.target.value })} options={['רק אני', '2–5', '6–10', '11+']} /></Field>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="stack">
            <Field label="במה המשרד מתמחה?"><div className="chips">{specs.map((s) => <button key={s} type="button" className={cx('chip', f.specialties.includes(s) && 'on')} aria-pressed={f.specialties.includes(s)} onClick={() => setF({ ...f, specialties: f.specialties.includes(s) ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] })}>{s}</button>)}</div></Field>
            <Field label="תבנית עבודה לפרויקט חדש" htmlFor="ob-t"><Select id="ob-t" value={f.template} onChange={(e: any) => setF({ ...f, template: e.target.value })} options={db.templates.map((t) => ({ value: t.id, label: t.name }))} /></Field>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="stack">
            <p className="soft">אפשר להזמין עכשיו או לדלג ולעשות זאת מאוחר יותר. בדמו ההזמנות נרשמות בלבד.</p>
            {f.invites.map((e, i) => <div key={i} className="row g8"><Input className="ltr" value={e} placeholder="name@studio.co.il" aria-label={`מייל ${i + 1}`} onChange={(ev: any) => { const a = [...f.invites]; a[i] = ev.target.value; setF({ ...f, invites: a }); }} />{f.invites.length > 1 ? <button type="button" className="icon-btn" aria-label="הסרה" onClick={() => setF({ ...f, invites: f.invites.filter((_, j) => j !== i) })}><LuX /></button> : null}</div>)}
            <div><Btn size="sm" icon={LuPlus} onClick={() => setF({ ...f, invites: [...f.invites, ''] })}>עוד מייל</Btn></div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="stack">
            <Callout kind="ok" icon={LuCheck} title="הכול מוכן">{f.office} · {f.city} · מסלול {f.plan === 'pro' ? 'Pro' : 'Starter'} בתקופת ניסיון · {f.invites.filter(Boolean).length} הזמנות.</Callout>
            <Callout kind="assume">בגרסה האמיתית תתחילו עם משרד ריק. בהדגמה תיכנסו למשרד עם נתוני דוגמה כדי לראות את המערכת בפעולה.</Callout>
          </div>
        ) : null}
        <div className="row between">
          {step > 0 ? <Btn kind="ghost" onClick={() => setStep(step - 1)}>חזרה</Btn> : <Btn kind="ghost" onClick={() => nav('/login')}>ביטול</Btn>}
          {step < 3 ? <Btn kind="primary" disabled={step === 0 && !f.office.trim()} onClick={() => setStep(step + 1)}>{step === 2 ? 'המשך' : 'הבא'}</Btn> : <Btn kind="primary" onClick={finish}>כניסה למערכת</Btn>}
        </div>
      </div>
    </div>
  );
}
