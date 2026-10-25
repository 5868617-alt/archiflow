// Maps database / auth / storage errors to Hebrew messages a person can act on.
export function friendlyError(e: { message?: string; code?: string; status?: number } | null | undefined): string {
  const m = String(e?.message || '');
  const code = String(e?.code || '');
  // auth
  if (/invalid login credentials|invalid_credentials|invalid_grant/i.test(m + code)) return 'המייל או הסיסמה שגויים.';
  if (/email not confirmed|email_not_confirmed/i.test(m + code)) return 'עוד לא אישרת את כתובת המייל. בדקו את תיבת הדואר (גם בספאם).';
  if (/user already registered|already been registered|user_already_exists/i.test(m + code)) return 'כבר קיים חשבון עם המייל הזה. אפשר להתחבר או לאפס סיסמה.';
  if (/password should be at least|weak_password|password is too weak/i.test(m + code)) return 'הסיסמה חלשה מדי. נדרשים לפחות 10 תווים, עם אותיות ומספרים.';
  if (/rate limit|over_email_send_rate_limit|too many requests/i.test(m + code) || e?.status === 429) return 'בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.';
  if (/signups not allowed|signup_disabled/i.test(m + code)) return 'ההרשמה סגורה כרגע.';
  if (/same_password|should be different/i.test(m + code)) return 'הסיסמה החדשה זהה לקודמת.';
  // business rules from the database
  if (m.startsWith('plan_limit:users')) return 'הגעתם למגבלת המשתמשים במסלול. שדרגו כדי להוסיף משתמשים.';
  if (m.startsWith('plan_limit:active_projects')) return 'הגעתם למגבלת הפרויקטים הפעילים במסלול.';
  if (m.startsWith('feature_not_in_plan')) return 'היכולת לא כלולה במסלול הנוכחי.';
  if (m.includes('a comment is required')) return 'יש להוסיף הערה.';
  if (m.includes('already decided')) return 'כבר התקבלה החלטה על הפריט הזה.';
  if (m.includes('invitation expired')) return 'תוקף ההזמנה פג. בקשו מהמשרד הזמנה חדשה.';
  if (m.includes('invitation not found')) return 'ההזמנה לא נמצאה או שכבר נעשה בה שימוש.';
  if (m.includes('different email')) return 'ההזמנה נשלחה לכתובת מייל אחרת. התחברו עם המייל שאליו נשלחה ההזמנה.';
  if (m.includes('already a member')) return 'המשתמש כבר חבר במשרד.';
  if (m.includes('only the owner')) return 'רק בעלי המשרד יכולים לבצע את הפעולה הזו.';
  if (m.includes('cannot change your own membership')) return 'אי אפשר לשנות את ההרשאות של עצמך.';
  if (m.includes('owner cannot be modified')) return 'אי אפשר לשנות את בעלי המשרד.';
  if (m.includes('can only be set by a client decision') || m.includes('only through a client decision')) return 'רק הלקוח יכול לאשר את הפריט, דרך הפורטל.';
  if (m.includes('use set_project_status')) return 'שינוי סטטוס נכשל. נסו שוב.';
  if (m.includes('is not an active member')) return 'אפשר לשייך רק אנשי צוות פעילים במשרד.';
  if (m.includes('cross-office')) return 'אי אפשר לקשר לרשומה של משרד אחר.';
  if (m.includes('due date is in the past')) return 'תאריך היעד כבר עבר.';
  if (m.includes('contact has no email')) return 'לאיש הקשר אין כתובת מייל.';
  if (m.includes('contact does not belong')) return 'איש הקשר לא שייך ללקוח של הפרויקט.';
  if (m.includes('too many offices')) return 'אפשר לפתוח עד 3 משרדים לחשבון.';
  if (m.includes('a note is required')) return 'יש לכתוב הערה לשינוי ידני.';
  if (m.includes('nothing to resume') || m.includes('cannot be cancelled')) return 'מצב המנוי לא מאפשר את הפעולה הזו.';
  if (m.includes('Direct deletion from storage')) return 'מחיקת קבצים מתבצעת דרך מנהלי המשרד.';
  if (/duplicate key|23505/.test(m + code)) return 'קיימת כבר רשומה זהה.';
  if (/violates check constraint|23514/.test(m + code)) return 'אחד השדות לא תקין. בדקו את הערכים ונסו שוב.';
  if (/violates foreign key|23503/.test(m + code)) return 'הרשומה מקושרת לנתונים אחרים ולא ניתן לבצע את הפעולה.';
  if (/mime type|invalid_mime_type|415/.test(m + code)) return 'סוג הקובץ לא נתמך.';
  if (/payload too large|maximum allowed size|413/i.test(m + code) || e?.status === 413) return 'הקובץ גדול מדי.';
  if (m.includes('row-level security') || code === '42501' || e?.status === 403) return 'אין לך הרשאה לפעולה הזו (או שהמנוי במצב קריאה בלבד).';
  if (m.includes('not authenticated') || e?.status === 401) return 'יש להתחבר מחדש.';
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'אין חיבור לשרת. בדקו את החיבור לאינטרנט ונסו שוב.';
  return 'הפעולה נכשלה. נסו שוב או פנו לתמיכה.';
}
