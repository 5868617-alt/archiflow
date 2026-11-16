// The public home page of the live site (visitors who are not signed in).
// Only claims what really works today: no testimonials, no client logos, no e-mail promises.
import { useState } from 'react';
import { LuLayoutTemplate, LuClock, LuHardHat, LuClipboardList, LuLandmark, LuLayers, LuUsers, LuWallet, LuShieldCheck, LuAccessibility, LuLanguages, LuDownload, LuArrowLeft, LuCheck, LuPlay, LuChevronDown } from 'react-icons/lu';
import { useStore } from '../data/store';
import { Logo } from '../ui/charts';
import { AccessibilityMenu } from '../shells/A11y';
import { cx } from '../ui/core';

const FEATURES = [
  { icon: LuLayoutTemplate, t: 'שלבים ושכר טרחה לפי שלב', d: 'תבנית שלבים לכל סוג עבודה. כשמסיימים שלב, המערכת מציעה לשלוח את דרישת התשלום שלו.' },
  { icon: LuClock, t: 'שעות ורווחיות', d: 'רישום שעות לפי פרויקט ושלב, שעות מתוכננות מול בפועל, וכמה כל פרויקט באמת מרוויח.' },
  { icon: LuHardHat, t: 'פיקוח עליון מהאתר', d: 'ממצאים עם תמונה מהטלפון, אחראי ומועד, ודו״ח מסודר ללקוח – גם כ-PDF עם הלוגו שלך.' },
  { icon: LuClipboardList, t: 'שאלון פתיחה ולוח השראה', d: 'הלקוח ממלא את השאלון בקצב שלו ומסמן מה הוא אוהב בלוח ההשראה.' },
  { icon: LuLandmark, t: 'רישוי ויועצים', d: 'מעקב אחרי תיק הרישוי מתיק המידע ועד ההיתר, ומי מהיועצים כבר מסר תכניות.' },
  { icon: LuLayers, t: 'מפרטים ואישורי לקוח', d: 'מפרט לפי חדרים, חלופות, ואישור לקוח שנרשם עם תאריך – בלי "אבל אמרתי לך בוואטסאפ".' },
  { icon: LuWallet, t: 'תקציב ביצוע ורכש', d: 'תקציב לפי סעיפים, הוצאות וקבלות, הזמנות רכש לספקים. שכר הטרחה תמיד מוצג בנפרד.' },
  { icon: LuUsers, t: 'פורטל לקוח ממותג', d: 'כל לקוח רואה רק את הפרויקט שלו ורק מה ששיתפת – בצבעים ובלוגו של המשרד.' },
];
const KINDS = ['שיפוצים ועיצוב פנים', 'בתים פרטיים ובנייה חדשה', 'מסחרי ומשרדים', 'תב״ע ופרויקטים גדולים'];
const FAQ = [
  ['כמה זה עולה?', 'יש שני מסלולים, וכל משרד חדש מתחיל ב-14 ימי ניסיון. בשלב הזה לא גובים תשלום ולא מבקשים כרטיס אשראי. המחירים המלאים מופיעים בעמוד המחירים.'],
  ['האם הלקוחות שלי רואים הכול?', 'לא. לקוח רואה רק את הפרויקט שלו, ורק שרטוטים, מסמכים ופריטים שסימנת כמשותפים. ההגבלה נאכפת בשרת, לא רק במסך.'],
  ['אפשר לנסות לפני שנרשמים?', 'כן. בהדגמה יש משרד שלם עם פרויקטים, לקוחות ונתונים לדוגמה, ואפשר לנסות כל פעולה. שום דבר שם לא נשמר בשרת.'],
  ['זה עובד בטלפון?', 'כן. אפשר להתקין את האתר כאפליקציה, לצלם ממצא באתר הבנייה ישר מהמצלמה, ולעבוד בכל מסך גם מהטלפון.'],
  ['מה קורה עם הנתונים שלי?', 'כל משרד מבודד במסד הנתונים, הקבצים נשמרים באחסון פרטי ונפתחים רק בקישור זמני, ובעלי המשרד יכולים לייצא את כל הנתונים בכל רגע.'],
  ['ממצאי הפיקוח הם אישור הנדסי?', 'לא. ממצאים ודו״חות הם תיעוד עבודה של המתכנן, ולא מחליפים אישור של מהנדס או של יועץ.'],
];

export function Landing() {
  const { nav } = useStore();
  const [open, setOpen] = useState<number | null>(0);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="landing">
      <a href="#lp-main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('lp-main')?.focus(); }}>דילוג לתוכן</a>
      <header className="lp-top">
        <button type="button" className="lp-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="ArchiFlow – לראש העמוד"><Logo size={30} /><span className="ltr">Archi<span>Flow</span></span></button>
        <nav className="lp-nav hide-sm" aria-label="ניווט בעמוד">
          <button type="button" onClick={() => go('lp-features')}>יכולות</button>
          <button type="button" onClick={() => go('lp-portal')}>פורטל הלקוח</button>
          <button type="button" onClick={() => go('lp-faq')}>שאלות נפוצות</button>
          <button type="button" onClick={() => nav('/pricing')}>מחירים</button>
        </nav>
        <span className="grow" />
        <button type="button" className="btn ghost" onClick={() => nav('/login')}>כניסה</button>
        <button type="button" className="btn primary hide-sm" onClick={() => nav('/register')}>התחלת ניסיון</button>
      </header>

      <main id="lp-main" tabIndex={-1}>
        <section className="lp-hero">
          <div className="lp-hero-text">
            <span className="lp-eyebrow">לאדריכלים ולמעצבי פנים</span>
            <h1>כל המשרד במקום אחד. מהסקיצה הראשונה ועד המסירה.</h1>
            <p className="lp-lead">פרויקטים, שלבים ושכר טרחה, פיקוח עליון, מפרטים ואישורי לקוח – ופורטל ממותג שהלקוחות שלך יפתחו בשמחה. בעברית, מימין לשמאל, בנוי לאיך שמשרד ישראלי עובד.</p>
            <div className="lp-cta">
              <button type="button" className="btn primary lg" onClick={() => nav('/register')}>התחילו 14 ימי ניסיון<LuArrowLeft aria-hidden /></button>
              <a className="btn lg" href="/demo"><LuPlay aria-hidden />לראות הדגמה חיה</a>
            </div>
            <ul className="lp-ticks"><li><LuCheck aria-hidden />בלי כרטיס אשראי</li><li><LuCheck aria-hidden />הקמה בדקה</li><li><LuCheck aria-hidden />ייצוא הנתונים בכל רגע</li></ul>
          </div>
          <div className="lp-hero-visual" aria-hidden="true">
            <div className="lp-browser"><span className="lp-dots"><i /><i /><i /></span><img src="/landing-dashboard.webp" alt="" width="1600" height="961" /></div>
            <div className="lp-phone"><img src="/landing-portal.webp" alt="" width="780" height="1688" /></div>
          </div>
        </section>

        <section className="lp-kinds" aria-label="למי זה מתאים">
          <span>מתאים ל:</span>{KINDS.map((k) => <span key={k} className="lp-kind">{k}</span>)}
        </section>

        <section id="lp-features" className="lp-section">
          <div className="lp-head"><span className="lp-eyebrow">יכולות</span><h2>כל מה שמשרד אדריכלות צריך. בלי עשרה כלים שונים.</h2></div>
          <div className="lp-features">
            {FEATURES.map((f) => <article key={f.t} className="lp-feature"><span className="lp-ic"><f.icon aria-hidden /></span><h3>{f.t}</h3><p>{f.d}</p></article>)}
          </div>
        </section>

        <section className="lp-section lp-show">
          <div className="lp-show-text">
            <span className="lp-eyebrow">שלבים, שעות ורווחיות</span>
            <h2>לדעת בכל רגע איפה הפרויקט – ואם הוא מרוויח</h2>
            <ul className="lp-list">
              <li>תבנית שלבים לפי סוג העבודה, עם אחוזי שכר טרחה שאפשר לשנות</li>
              <li>סיום שלב מציע לשלוח את דרישת התשלום שלו</li>
              <li>שעות מתוכננות מול בפועל, ורווח צפוי לכל פרויקט</li>
            </ul>
          </div>
          <figure className="lp-shot"><img src="/landing-phases.webp" alt="מסך שלבי התכנון ורווחיות הפרויקט" width="1600" height="961" loading="lazy" /><figcaption>נתונים לדוגמה מתוך ההדגמה</figcaption></figure>
        </section>

        <section id="lp-portal" className="lp-section lp-show rev">
          <div className="lp-show-text">
            <span className="lp-eyebrow">פורטל הלקוח</span>
            <h2>הלקוחות רואים את הפרויקט שלהם. רק מה ששיתפת.</h2>
            <ul className="lp-list">
              <li>שלב נוכחי, אישורים שמחכים להם ודו״חות פיקוח</li>
              <li>שאלון פתיחה ולוח השראה שמסמנים בו מה אוהבים</li>
              <li>אישור או בקשת שינוי – נרשם עם תאריך ונשמר בהיסטוריה</li>
            </ul>
          </div>
          <figure className="lp-shot"><img src="/landing-brief.webp" alt="לוח השראה עם תגובות הלקוח" width="1600" height="961" loading="lazy" /><figcaption>נתונים לדוגמה מתוך ההדגמה</figcaption></figure>
        </section>

        <section className="lp-section lp-show">
          <div className="lp-show-text">
            <span className="lp-eyebrow">פיקוח עליון</span>
            <h2>מצלמים באתר. הדו״ח מוכן לפני שחוזרים לרכב.</h2>
            <ul className="lp-list">
              <li>ממצא עם תמונה, מיקום, אחראי ומועד תיקון</li>
              <li>ממצא הופך למשימה בלחיצה</li>
              <li>דו״ח ללקוח בפורטל, ו-PDF עם הלוגו שלך</li>
            </ul>
          </div>
          <figure className="lp-shot phone"><img src="/landing-site-m.webp" alt="מסך פיקוח עליון בטלפון" width="780" height="1688" loading="lazy" /></figure>
        </section>

        <section className="lp-section lp-trust">
          <div className="lp-head"><span className="lp-eyebrow">שקט נפשי</span><h2>בנוי ברצינות</h2></div>
          <div className="lp-trust-grid">
            <div><LuShieldCheck aria-hidden /><h3>כל משרד מבודד</h3><p>ההרשאות נאכפות במסד הנתונים עצמו ונבדקות במאות בדיקות אוטומטיות. אפשר להפעיל אימות דו-שלבי.</p></div>
            <div><LuAccessibility aria-hidden /><h3>נגיש</h3><p>לפי ת״י 5568, עם תפריט נגישות בכל מסך ומצב כהה.</p></div>
            <div><LuLanguages aria-hidden /><h3>עברית אמיתית</h3><p>מימין לשמאל, ₪ ותאריכים בפורמט ישראלי, ושלבי עבודה של משרד ישראלי.</p></div>
            <div><LuDownload aria-hidden /><h3>הנתונים שלך</h3><p>בעלי המשרד מייצאים את כל הנתונים בכל רגע, ויכולים לבקש למחוק את המשרד.</p></div>
          </div>
        </section>

        <section id="lp-faq" className="lp-section lp-faq">
          <div className="lp-head"><span className="lp-eyebrow">שאלות נפוצות</span><h2>מה שכדאי לדעת</h2></div>
          <div className="lp-qa">
            {FAQ.map(([q, a], i) => (
              <div key={q} className={cx('lp-q', open === i && 'open')}>
                <h3><button type="button" aria-expanded={open === i} aria-controls={'lpa' + i} id={'lpq' + i} onClick={() => setOpen(open === i ? null : i)}>{q}<LuChevronDown aria-hidden /></button></h3>
                <div id={'lpa' + i} role="region" aria-labelledby={'lpq' + i} hidden={open !== i}><p>{a}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <h2>מוכנים לסדר את המשרד?</h2>
          <p>פותחים משרד, מזמינים את הצוות ומתחילים. 14 ימי ניסיון, בלי כרטיס אשראי.</p>
          <div className="lp-cta"><button type="button" className="btn primary lg" onClick={() => nav('/register')}>התחלת ניסיון<LuArrowLeft aria-hidden /></button><a className="btn lg" href="/demo">להדגמה</a></div>
        </section>
      </main>

      <footer className="lp-foot">
        <span className="lp-brand static"><Logo size={24} /><span className="ltr">Archi<span>Flow</span></span></span>
        <nav aria-label="קישורים">
          <button type="button" onClick={() => nav('/pricing')}>מחירים</button>
          <a href="/demo">הדגמה</a>
          <button type="button" onClick={() => nav('/accessibility')}>הצהרת נגישות</button>
          <button type="button" onClick={() => nav('/login')}>כניסה</button>
        </nav>
        <span className="xs">© {new Date().getFullYear()} ArchiFlow</span>
      </footer>
      <AccessibilityMenu floating />
    </div>
  );
}
