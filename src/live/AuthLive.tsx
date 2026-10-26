// Real sign-in, sign-up, password recovery, invitation acceptance and office creation.
import { useEffect, useState } from 'react';
import { LuLogIn, LuMail, LuArrowRight, LuCheck, LuPlus, LuX, LuMailCheck, LuKeyRound, LuBuilding2, LuLogOut } from 'react-icons/lu';
import { useStore } from '../data/store';
import { Btn, Field, Input, Select, Callout, Check, cx, Segmented } from '../ui/core';
import { Logo } from '../ui/charts';
import { AuthLayout } from '../pages/Auth';
import { friendlyError } from './errors';
import { parseRoute } from '../lib/route';

const okEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
export const pwProblem = (pw: string) => (pw.length < 10 ? 'לפחות 10 תווים' : !/[A-Za-z֐-׿]/.test(pw) || !/\d/.test(pw) ? 'צריך לשלב אותיות ומספרים' : '');
const Spin = () => <span className="spinner" style={{ width: 16, height: 16 }} />;
const pendingInvite = () => { try { return localStorage.getItem('archiflow.invite') || ''; } catch { return ''; } };

export function LiveLogin() {
  const { nav, live, path } = useStore();
  const q = parseRoute(path).query;
  const [email, setEmail] = useState(q.email || '');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const submit = async (e: any) => {
    e.preventDefault();
    if (!okEmail(email)) { setErr('כתובת המייל לא תקינה'); return; }
    if (!pw) { setErr('יש להזין סיסמה'); return; }
    setErr(''); setBusy(true); setUnconfirmed(false);
    try { await live!.api.signIn(email.trim(), pw); await live!.afterAuth(); }
    catch (x: any) { setErr(friendlyError(x)); setUnconfirmed(/confirm/i.test(x?.message || '') || x?.code === 'email_not_confirmed'); }
    finally { setBusy(false); }
  };
  return (
    <AuthLayout title="כניסה לחשבון" sub={pendingInvite() ? 'התחברו כדי להצטרף למשרד שהזמין אתכם.' : 'ברוכים השבים.'}>
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="מייל" htmlFor="lg-e"><Input id="lg-e" className="ltr" type="email" autoComplete="email" value={email} onChange={(e: any) => setEmail(e.target.value)} invalid={!!err} /></Field>
        <Field label="סיסמה" htmlFor="lg-p"><Input id="lg-p" type="password" autoComplete="current-password" value={pw} onChange={(e: any) => setPw(e.target.value)} /></Field>
        {err ? <Callout kind="bad">{err}{unconfirmed ? <div className="mt8"><button type="button" className="linkish" onClick={async () => { try { await live!.api.resend(email.trim(), live!.appUrl); setErr('שלחנו שוב מייל אימות.'); } catch (x: any) { setErr(friendlyError(x)); } }}>שליחת מייל האימות שוב</button></div> : null}</Callout> : null}
        <div className="row between"><span /><button type="button" className="linkish small" onClick={() => nav('/forgot')}>שכחתי סיסמה</button></div>
        <Btn kind="primary" size="lg" block type="submit" icon={busy ? undefined : LuLogIn} disabled={busy}>{busy ? <><Spin />מתחבר…</> : 'כניסה'}</Btn>
        <div className="small t-center">אין חשבון? <button type="button" className="linkish" onClick={() => nav('/register')}>{pendingInvite() ? 'הרשמה' : 'פתיחת משרד חדש'}</button></div>
      </form>
    </AuthLayout>
  );
}

export function LiveRegister() {
  const { nav, live, path } = useStore();
  const q = parseRoute(path).query;
  const invited = !!pendingInvite();
  const [f, setF] = useState({ name: '', email: q.email || '', pw: '', terms: false });
  const [err, setErr] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const submit = async (e: any) => {
    e.preventDefault(); const x: any = {};
    if (!f.name.trim()) x.name = 'יש להזין שם'; if (!okEmail(f.email)) x.email = 'מייל לא תקין'; const pp = pwProblem(f.pw); if (pp) x.pw = pp; if (!f.terms) x.terms = 'יש לאשר את התנאים';
    setErr(x); if (Object.keys(x).length) return;
    setBusy(true);
    try {
      const r = await live!.api.signUp(f.email.trim(), f.pw, f.name.trim(), live!.appUrl);
      if (r === 'session') await live!.afterAuth(); else setSent(f.email.trim());
    } catch (x2: any) { setErr({ form: friendlyError(x2) }); } finally { setBusy(false); }
  };
  if (sent) return (
    <AuthLayout title="כמעט סיימנו" sub="נשאר לאשר את כתובת המייל.">
      <Callout kind="ok" icon={LuMailCheck} title={`שלחנו מייל אימות ל-${sent}`}>לחצו על הקישור במייל כדי להפעיל את החשבון. אם המייל לא הגיע תוך כמה דקות, בדקו גם בתיקיית הספאם.</Callout>
      <Btn onClick={async () => { try { await live!.api.resend(sent, live!.appUrl); } catch { /* rate limited */ } }} icon={LuMail}>שליחה חוזרת</Btn>
      <button type="button" className="linkish small" onClick={() => nav('/login?email=' + encodeURIComponent(sent))}>כבר אישרתי – לכניסה</button>
    </AuthLayout>
  );
  return (
    <AuthLayout title={invited ? 'יצירת חשבון להצטרפות' : 'פתיחת חשבון ב-ArchiFlow'} sub={invited ? 'הירשמו עם המייל שאליו נשלחה ההזמנה.' : 'אחרי אימות המייל תקימו את המשרד ותקבלו 14 ימי ניסיון.'}>
      <form className="stack" noValidate onSubmit={submit}>
        <Field label="שם מלא *" error={err.name} htmlFor="rg-n"><Input id="rg-n" value={f.name} invalid={err.name} autoComplete="name" onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="מייל *" error={err.email} htmlFor="rg-e"><Input id="rg-e" className="ltr" type="email" autoComplete="email" value={f.email} invalid={err.email} onChange={(e: any) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="סיסמה *" error={err.pw} hint="לפחות 10 תווים, אותיות ומספרים" htmlFor="rg-p"><Input id="rg-p" type="password" autoComplete="new-password" value={f.pw} invalid={err.pw} onChange={(e: any) => setF({ ...f, pw: e.target.value })} /></Field>
        <div><Check id="rg-t" checked={f.terms} onChange={(v: boolean) => setF({ ...f, terms: v })} label="אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות" />{err.terms ? <div className="xs bad-t">{err.terms}</div> : null}</div>
        {err.form ? <Callout kind="bad">{err.form}</Callout> : null}
        <Btn kind="primary" size="lg" block type="submit" disabled={busy}>{busy ? <><Spin />יוצר חשבון…</> : 'יצירת חשבון'}</Btn>
        <div className="small t-center">כבר יש חשבון? <button type="button" className="linkish" onClick={() => nav('/login')}>כניסה</button></div>
      </form>
    </AuthLayout>
  );
}

export function LiveForgot() {
  const { nav, live } = useStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <AuthLayout title="שחזור סיסמה" sub="נשלח קישור לאיפוס לכתובת המייל של החשבון.">
      {sent ? (
        <div className="stack">
          <Callout kind="ok" title="אם קיים חשבון עם הכתובת הזו – נשלח אליו קישור">הקישור תקף לזמן קצר. בדקו גם בתיקיית הספאם.</Callout>
          <Btn icon={LuArrowRight} onClick={() => nav('/login')}>חזרה לכניסה</Btn>
        </div>
      ) : (
        <form className="stack" noValidate onSubmit={async (e) => {
          e.preventDefault(); if (!okEmail(email)) { setErr('כתובת המייל לא תקינה'); return; }
          setBusy(true); setErr('');
          try { await live!.api.recover(email.trim(), live!.appUrl); setSent(true); } catch (x: any) { if (x?.status === 429) setErr(friendlyError(x)); else setSent(true); } finally { setBusy(false); }
        }}>
          <Field label="מייל" error={err} htmlFor="fg-e"><Input id="fg-e" className="ltr" type="email" value={email} invalid={err} onChange={(e: any) => setEmail(e.target.value)} /></Field>
          <Btn kind="primary" size="lg" block type="submit" icon={LuMail} disabled={busy}>{busy ? 'שולח…' : 'שליחת קישור'}</Btn>
          <button type="button" className="linkish small" onClick={() => nav('/login')}>חזרה לכניסה</button>
        </form>
      )}
    </AuthLayout>
  );
}

export function LiveResetPassword() {
  const { live, nav, toast } = useStore();
  const [pw, setPw] = useState(''); const [pw2, setPw2] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (!live!.session) return <AuthLayout title="הקישור לא תקף"><Callout kind="bad">הקישור לאיפוס פג תוקף או כבר נוצל.</Callout><Btn onClick={() => nav('/forgot')}>שליחת קישור חדש</Btn></AuthLayout>;
  return (
    <AuthLayout title="בחירת סיסמה חדשה">
      <form className="stack" noValidate onSubmit={async (e) => {
        e.preventDefault(); const p = pwProblem(pw); if (p) { setErr(p); return; } if (pw !== pw2) { setErr('הסיסמאות לא זהות'); return; }
        setBusy(true);
        try { await live!.api.updatePassword(pw); toast('הסיסמה עודכנה'); await live!.afterAuth(); } catch (x: any) { setErr(friendlyError(x)); } finally { setBusy(false); }
      }}>
        <Field label="סיסמה חדשה" hint="לפחות 10 תווים, אותיות ומספרים" htmlFor="rp-1"><Input id="rp-1" type="password" autoComplete="new-password" value={pw} onChange={(e: any) => setPw(e.target.value)} /></Field>
        <Field label="אימות סיסמה" htmlFor="rp-2"><Input id="rp-2" type="password" autoComplete="new-password" value={pw2} onChange={(e: any) => setPw2(e.target.value)} /></Field>
        {err ? <Callout kind="bad">{err}</Callout> : null}
        <Btn kind="primary" size="lg" block type="submit" icon={LuKeyRound} disabled={busy}>שמירת סיסמה</Btn>
      </form>
    </AuthLayout>
  );
}

/** /accept-invite?token=… – the token stays in this browser tab until the invitee is signed in. */
export function LiveAcceptInvite() {
  const { live, path, nav, toast } = useStore();
  const q = parseRoute(path).query;
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [err, setErr] = useState('');
  useEffect(() => { if (q.token) { try { localStorage.setItem('archiflow.invite', q.token); } catch { /* ignore */ } } }, [q.token]);
  const token = q.token || pendingInvite();
  const accept = async () => {
    setState('busy');
    try { await live!.api.rpc('accept_invitation', { p_token: token }); try { localStorage.removeItem('archiflow.invite'); } catch { /* ignore */ } toast('הצטרפת בהצלחה'); await live!.afterAuth(); }
    catch (x: any) { setErr(friendlyError(x)); setState('error'); }
  };
  useEffect(() => { if (live!.session && token && state === 'idle') accept(); }, [live!.session]); // eslint-disable-line
  if (!token) return <AuthLayout title="הזמנה"><Callout kind="bad">לא נמצא קוד הזמנה בקישור.</Callout><Btn onClick={() => nav('/login')}>לכניסה</Btn></AuthLayout>;
  if (!live!.session) return (
    <AuthLayout title="הוזמנת ל-ArchiFlow" sub="כדי להצטרף, התחברו או צרו חשבון עם כתובת המייל שאליה נשלחה ההזמנה.">
      <Btn kind="primary" size="lg" block onClick={() => nav('/register')}>יצירת חשבון</Btn>
      <Btn size="lg" block onClick={() => nav('/login')}>כבר יש לי חשבון</Btn>
    </AuthLayout>
  );
  return (
    <AuthLayout title="מצטרפים…">
      {state === 'error' ? <><Callout kind="bad">{err}</Callout><Btn onClick={() => live!.signOut()} icon={LuLogOut}>התחברות עם מייל אחר</Btn></> : <div className="row g8"><Spin />מאשרים את ההזמנה…</div>}
    </AuthLayout>
  );
}

const SPECS = ['דירות יוקרה', 'וילות', 'שיפוצים', 'מסחר ואירוח', 'משרדים', 'מבנים לשימור', 'נוף'];
export function LiveOnboarding() {
  const { live, toast } = useStore();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ office: '', city: '', specialties: [] as string[], plan: 'pro', invites: [''] as string[] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { const t = pendingInvite(); if (t && live!.session) { location.hash = '/accept-invite?token=' + encodeURIComponent(t); } }, []); // eslint-disable-line
  const steps = ['פרטי המשרד', 'תחומי עבודה', 'הזמנת צוות', 'סיום'];
  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const officeId: string = await live!.api.rpc('create_office', { p_name: f.office.trim(), p_city: f.city.trim() || null, p_plan: f.plan });
      if (f.specialties.length) await live!.api.update('offices', { id: officeId }, { specialties: f.specialties });
      let sent = 0;
      for (const e of f.invites.map((x) => x.trim()).filter(okEmail)) {
        try { await live!.api.rpc('invite_member', { p_office: officeId, p_email: e, p_full_name: e.split('@')[0], p_role: 'member' }); sent++; } catch (x: any) { toast(`${e}: ${friendlyError(x)}`, 'bad'); }
      }
      try { localStorage.setItem('archiflow.context.v1', 'o:' + officeId); } catch { /* ignore */ }
      toast(sent ? `המשרד נפתח. ${sent} הזמנות נוספו לתור השליחה.` : 'המשרד נפתח. תקופת הניסיון התחילה.');
      await live!.afterAuth();
    } catch (x: any) { setErr(friendlyError(x)); } finally { setBusy(false); }
  };
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px max(16px, env(safe-area-inset-left, 0px)) 64px max(16px, env(safe-area-inset-right, 0px))' }}>
      <div className="row g8 mb8"><Logo /><b className="display" style={{ fontSize: '1.3rem' }}>הקמת המשרד</b><span className="grow" /><Btn size="sm" kind="ghost" icon={LuLogOut} onClick={() => live!.signOut()}>יציאה</Btn></div>
      <div className="steps">{steps.map((s, i) => <span key={s} className="row" style={{ gap: 0 }}><span className={cx('step', i < step && 'done', i === step && 'on')}><span className="s-n">{i < step ? '✓' : i + 1}</span>{s}</span>{i < steps.length - 1 ? <span className="step-line" /> : null}</span>)}</div>
      <div className="card pad stack-lg">
        {step === 0 ? (
          <div className="form-grid">
            <Field label="שם המשרד *" full htmlFor="ob-o"><Input id="ob-o" value={f.office} onChange={(e: any) => setF({ ...f, office: e.target.value })} /></Field>
            <Field label="עיר" htmlFor="ob-c"><Input id="ob-c" value={f.city} onChange={(e: any) => setF({ ...f, city: e.target.value })} /></Field>
            <Field label="מסלול לתקופת הניסיון"><Segmented value={f.plan} onChange={(v: string) => setF({ ...f, plan: v })} options={[{ value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }]} /></Field>
          </div>
        ) : null}
        {step === 1 ? <Field label="במה המשרד מתמחה?"><div className="chips">{SPECS.map((s) => <button key={s} type="button" className={cx('chip', f.specialties.includes(s) && 'on')} aria-pressed={f.specialties.includes(s)} onClick={() => setF({ ...f, specialties: f.specialties.includes(s) ? f.specialties.filter((x) => x !== s) : [...f.specialties, s] })}>{s}</button>)}</div></Field> : null}
        {step === 2 ? (
          <div className="stack">
            <p className="soft">אפשר להזמין עכשיו או לדלג ולעשות זאת מאוחר יותר במסך הצוות.</p>
            {f.invites.map((e, i) => <div key={i} className="row g8"><Input className="ltr" value={e} placeholder="name@studio.co.il" aria-label={`מייל ${i + 1}`} onChange={(ev: any) => { const a = [...f.invites]; a[i] = ev.target.value; setF({ ...f, invites: a }); }} />{f.invites.length > 1 ? <button type="button" className="icon-btn" aria-label="הסרה" onClick={() => setF({ ...f, invites: f.invites.filter((_, j) => j !== i) })}><LuX /></button> : null}</div>)}
            <div><Btn size="sm" icon={LuPlus} onClick={() => setF({ ...f, invites: [...f.invites, ''] })}>עוד מייל</Btn></div>
            <Callout kind="assume" title="שליחת מיילים">ההזמנות נשמרות בתור. המיילים יישלחו בפועל אחרי חיבור שירות המייל (Resend). עד אז אפשר לשלוח לחברי הצוות את קישור ההרשמה ידנית.</Callout>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="stack">
            <Callout kind="ok" icon={LuCheck} title="הכול מוכן">{f.office} {f.city ? '· ' + f.city : ''} · מסלול {f.plan === 'pro' ? 'Pro' : 'Starter'} · 14 ימי ניסיון · {f.invites.filter(okEmail).length} הזמנות.</Callout>
            <Callout kind="assume">המחירים עדיין בגדר הנחה ולא אושרו. בסוף תקופת הניסיון המשרד יעבור למצב קריאה בלבד עד שיחובר ספק סליקה ויוסדר מנוי.</Callout>
            {err ? <Callout kind="bad">{err}</Callout> : null}
          </div>
        ) : null}
        <div className="row between">
          {step > 0 ? <Btn kind="ghost" onClick={() => setStep(step - 1)} disabled={busy}>חזרה</Btn> : <span />}
          {step < 3 ? <Btn kind="primary" disabled={step === 0 && f.office.trim().length < 2} onClick={() => setStep(step + 1)}>{step === 2 ? 'המשך' : 'הבא'}</Btn> : <Btn kind="primary" icon={busy ? undefined : LuBuilding2} onClick={finish} disabled={busy}>{busy ? <><Spin />פותח משרד…</> : 'פתיחת המשרד'}</Btn>}
        </div>
      </div>
    </div>
  );
}

export function LiveLoading({ text = 'טוען נתונים…' }: { text?: string }) {
  return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><div className="row g8 soft"><Spin />{text}</div></div>;
}
export function LiveError() {
  const { live } = useStore();
  return (
    <div style={{ maxWidth: 520, margin: '15vh auto', padding: 16 }} className="stack">
      <Callout kind="bad" title="לא הצלחנו לטעון את הנתונים">{live?.error}</Callout>
      <div className="row g8"><Btn kind="primary" onClick={() => location.reload()}>ניסיון חוזר</Btn><Btn icon={LuLogOut} onClick={() => live!.signOut()}>יציאה</Btn></div>
    </div>
  );
}

// Landing page after the sign-up confirmation link: a real page, not just a toast.
export function LiveVerified() {
  const { live, nav } = useStore();
  const lv = live!;
  const first = (lv.landing?.name || '').trim().split(/\s+/)[0];
  const loading = lv.status === 'boot' || lv.status === 'loading';
  const needsOffice = lv.status === 'no-context';
  const admin = lv.current?.kind === 'admin' && lv.contexts.length === 1;
  const invite = pendingInvite();
  const go = () => { lv.clearLanding(); if (invite) nav('/accept-invite?token=' + encodeURIComponent(invite)); else if (needsOffice) nav('/onboarding'); };
  return (
    <AuthLayout title={first ? `ברוכים הבאים, ${first}!` : 'ברוכים הבאים!'} sub="כתובת המייל אומתה והחשבון שלך פעיל.">
      <div className="verified-badge" aria-hidden><LuMailCheck /></div>
      {lv.landing?.email ? <p className="small soft">החשבון: <b className="ltr">{lv.landing.email}</b></p> : null}
      {invite ? <Callout kind="info" title="הוזמנת להצטרף למשרד">בשלב הבא נצרף אותך למשרד שהזמין אותך.</Callout> : null}
      {needsOffice && !invite ? (
        <div className="stack">
          <div className="section-title" style={{ marginBottom: 0 }}>מה עכשיו</div>
          <ol className="next-steps">
            <li><b>פתיחת המשרד</b><span>שם המשרד ופרטים בסיסיים. לוקח דקה.</span></li>
            <li><b>הזמנת הצוות</b><span>אפשר עכשיו או בכל זמן אחר מתוך המערכת.</span></li>
            <li><b>הפרויקט הראשון</b><span>לקוח, כתובת, תקציב ביצוע ושכר טרחה.</span></li>
          </ol>
        </div>
      ) : null}
      <Btn kind="primary" size="lg" className="block" icon={loading ? undefined : invite || needsOffice ? LuBuilding2 : LuLogIn} disabled={loading} onClick={go}>
        {loading ? <><Spin />מכינים את החשבון…</> : invite ? 'להצטרפות למשרד' : needsOffice ? 'לפתיחת המשרד' : admin ? 'כניסה לניהול המערכת' : 'כניסה ל-ArchiFlow'}
      </Btn>
      {lv.status === 'error' ? <Callout kind="bad">{lv.error || 'לא הצלחנו לטעון את החשבון.'} נסו לרענן את הדף.</Callout> : null}
    </AuthLayout>
  );
}

// Landing page for an old, used or broken e-mail link, with a way to get a new one.
export function LiveLinkExpired() {
  const { live, nav } = useStore();
  const lv = live!;
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [err, setErr] = useState('');
  const resend = async (e: any) => {
    e.preventDefault();
    if (!okEmail(email)) { setErr('כתובת המייל לא תקינה'); return; }
    setErr(''); setState('busy');
    try { await lv.api.resend(email.trim(), lv.appUrl); setState('sent'); }
    catch (x: any) { setState('idle'); setErr(friendlyError(x)); }
  };
  return (
    <AuthLayout title="הקישור כבר לא בתוקף" sub="קישור אימות עובד פעם אחת ולזמן מוגבל.">
      <Callout kind="info" title="כבר אישרת את המייל?">אם לחצת על הקישור קודם, החשבון כבר פעיל ואפשר פשוט להיכנס.</Callout>
      <Btn kind="primary" className="block" icon={LuLogIn} onClick={() => { lv.clearLanding(); nav('/login'); }}>לכניסה</Btn>
      <div className="sep" />
      {state === 'sent' ? (
        <Callout kind="ok" icon={LuMailCheck} title={`שלחנו קישור חדש ל-${email.trim()}`}>הקישור החדש תקף לזמן מוגבל. אם הוא לא מגיע תוך כמה דקות, בדקו בתיקיית הספאם.</Callout>
      ) : (
        <form className="stack" noValidate onSubmit={resend}>
          <Field label="לא אישרת עדיין? נשלח קישור חדש" error={err} htmlFor="lx-e"><Input id="lx-e" type="email" dir="ltr" autoComplete="email" value={email} invalid={err} onChange={(e: any) => setEmail(e.target.value)} placeholder="name@example.com" /></Field>
          <Btn type="submit" icon={LuMail} disabled={state === 'busy'}>{state === 'busy' ? 'שולח…' : 'שליחת קישור חדש'}</Btn>
        </form>
      )}
    </AuthLayout>
  );
}
