// Accessibility statement (required for Israeli services under the Equal Rights for Persons with
// Disabilities regulations). Contact details of the accessibility coordinator are left for the
// product owner to fill in – they are marked as pending, never invented.
import { LuAccessibility, LuKeyboard, LuContrast, LuMonitorSmartphone, LuTriangleAlert, LuMail } from 'react-icons/lu';
import { useStore } from '../data/store';
import { AssumeTag, Btn, Callout } from '../ui/core';
import { defaultPathFor } from '../data/store';

export function AccessibilityStatement() {
  const { nav, me, live } = useStore();
  const signedIn = live ? live.status === 'ready' : !!me;
  return (
    <article className="statement">
      <div className="statement-head">
        <span className="statement-ic" aria-hidden><LuAccessibility /></span>
        <div>
          <h1 className="display">הצהרת נגישות</h1>
          <p className="soft">עודכנה לאחרונה: אוקטובר 2026</p>
        </div>
      </div>

      <p>אנחנו רוצים ש-ArchiFlow תהיה נוחה לשימוש לכל אחד ואחת, כולל אנשים עם מוגבלות. השקענו בהתאמת המערכת כך שאפשר לעבוד בה עם מקלדת בלבד, עם קורא מסך, בהגדלת טקסט ובטלפון.</p>

      <h2>רמת הנגישות</h2>
      <p>המערכת הותאמה לפי התקן הישראלי ת"י 5568, המבוסס על הנחיות WCAG 2.0 ברמה AA, ונבדקה גם מול דרישות מתוך WCAG 2.1 ו-2.2 (למשל גודל אזורי לחיצה בטלפון).</p>
      <Callout kind="assume" title="מה עוד חסר">הבדיקות נעשו בכלים אוטומטיים ובבדיקה ידנית של צוות הפיתוח. בדיקה של מורשה/ית נגישות עדיין לא בוצעה. <AssumeTag>טעון השלמה</AssumeTag></Callout>

      <h2>מה עשינו</h2>
      <ul className="statement-list">
        <li><LuKeyboard aria-hidden /><span><b>מקלדת:</b> כל פעולה זמינה מהמקלדת, עם סימון בולט של הרכיב הנבחר. קישור "דילוג לתוכן" בתחילת כל עמוד, וחלון חיפוש ופעולות שנפתח ב-Ctrl+K. גרירה בלוחות תמיד מלווה בתפריט בחירה שאפשר להפעיל בלי עכבר.</span></li>
        <li><LuContrast aria-hidden /><span><b>קריאות:</b> ניגודיות של 4.5:1 לפחות בכל טקסט רגיל, טקסט בסיס בגודל 15 פיקסלים ומרווח שורות נוח. מצב כהה לפי הגדרת המכשיר.</span></li>
        <li><LuMonitorSmartphone aria-hidden /><span><b>טלפון וטאבלט:</b> כל המסכים מותאמים לרוחב של טלפון, בלי גלילה הצידה, ואזורי לחיצה בגובה 28 פיקסלים לפחות.</span></li>
        <li><LuAccessibility aria-hidden /><span><b>קוראי מסך:</b> שפת העמוד (עברית) וכיוון הכתיבה מוגדרים, לכל שדה יש תווית, לכל כפתור יש שם, ולכל עמוד יש כותרת ראשית ומבנה כותרות מסודר.</span></li>
      </ul>

      <h2>תפריט הנגישות</h2>
      <p>הכפתור עם סמל הנגישות (בסרגל העליון, או בפינת המסך בעמודי הכניסה) פותח תפריט שבו אפשר להגדיל טקסט בשלוש דרגות, להפעיל ניגודיות גבוהה, להדגיש קישורים, לעבור לגופן פשוט לקריאה, לעצור אנימציות ולהציג סרגל קריאה. ההגדרות נשמרות במכשיר שלך.</p>

      <h2>מגבלות ידועות</h2>
      <ul className="statement-list">
        <li><LuTriangleAlert aria-hidden /><span><b>שרטוטים:</b> השרטוטים הם קבצים גרפיים שהמשרד מעלה, ולכן התוכן שלהם עצמו לא נגיש לקוראי מסך. ההערות, הממצאים והמדידות מוצגים גם כרשימה טקסטואלית ליד השרטוט.</span></li>
        <li><LuTriangleAlert aria-hidden /><span><b>קבצים שמשתמשים מעלים:</b> מסמכים, קבלות וקובצי PDF מגיעים מהמשתמשים, ואין לנו שליטה על הנגישות שלהם.</span></li>
      </ul>

      <h2>נתקלת בבעיה?</h2>
      <p>נשמח לשמוע ולתקן. אפשר לפנות לרכז/ת הנגישות:</p>
      <dl className="kv statement-contact">
        <dt>שם</dt><dd><AssumeTag>טעון השלמה</AssumeTag></dd>
        <dt>טלפון</dt><dd><AssumeTag>טעון השלמה</AssumeTag></dd>
        <dt>מייל</dt><dd><AssumeTag>טעון השלמה</AssumeTag></dd>
      </dl>
      <p className="small soft">כדי שנוכל לעזור מהר, ציינו באיזה עמוד הייתה הבעיה, מה ניסיתם לעשות, ובאיזה מכשיר ודפדפן השתמשתם.</p>
      {signedIn && ['owner', 'admin', 'member'].includes(me.role) ? <div className="row g8 wrap mt16"><Btn icon={LuMail} onClick={() => nav('/support')}>פנייה דרך מרכז התמיכה</Btn><Btn kind="ghost" onClick={() => nav(defaultPathFor(me))}>חזרה למערכת</Btn></div> : <div className="mt16"><Btn kind="ghost" onClick={() => nav(signedIn ? defaultPathFor(me) : '/login')}>{signedIn ? 'חזרה למערכת' : 'חזרה לכניסה'}</Btn></div>}
    </article>
  );
}
