# תפעול ופריסה

## מצב נוכחי

| רכיב | מצב |
|---|---|
| פרויקט Supabase | ArchiFlow, `qbwaqngxdgmqgddxcuzv`. כל 11 המיגרציות הותקנו |
| נתונים | ריק, מלבד מסלולים, יכולות ומדיניות שמירה |
| Super Admin ראשון | `shirameren2434@gmail.com` – ממתין להרשמה ולאימות מייל |
| משימות מתוזמנות | `archiflow-hourly`, `archiflow-daily`, `archiflow-emails` פעילות |
| Edge Function `send-emails` | פרוסה. לא שולחת כלום עד שמגדירים `RESEND_API_KEY` |
| אתר | `site/index.html` בנוי. ממתין לחיבור ל-Vercel |

## 1. Vercel
1. ב-vercel.com/new: Import לריפו `5868617-alt/archiflow`.
2. **Framework Preset:** Other. שאר ההגדרות נקראות מ-`vercel.json`:
   - אין install ואין build.
   - תיקיית הפלט: `site`.
   - כותרות אבטחה.
3. Deploy. מתקבלת כתובת מהצורה `https://archiflow-xxxx.vercel.app`.

## 2. Auth ב-Supabase
Dashboard ← Authentication ← URL Configuration:
- **Site URL:** כתובת ה-Vercel.
- **Redirect URLs:** `https://<הכתובת>/**`, ובנוסף כתובות preview, אם רוצים.

Authentication ← Providers ← Email, ו-Policies:
- Confirm email: פעיל.
- Minimum password length: 10.
- Leaked password protection: פעיל.

**חשוב:** מיילי האימות של Supabase נשלחים מהשרת המובנה שלהם, שמוגבל לכמה מיילים בשעה. לעבודה אמיתית מחברים SMTP מותאם (Resend) ב-Authentication ← Emails ← SMTP.

## 3. כתובת האתר למיילים
אחרי שיש כתובת, מריצים ב-SQL Editor:
```sql
select vault.create_secret('https://<הכתובת>', 'archiflow_app_url', 'ArchiFlow: public site URL');
-- אופציונלי, אחרי אימות דומיין ב-Resend:
select vault.create_secret('ArchiFlow <notifications@your-domain.co.il>', 'archiflow_email_from', 'ArchiFlow: sender');
```

## 4. ה-Super Admin הראשון
נרשמים באתר עם `shirameren2434@gmail.com` ומאמתים את המייל.
טריגר במסד מעניק את ההרשאה ברגע האימות, ואז מוחק את הרשומה הממתינה. אין דרך להעניק Super Admin מתוך האפליקציה.

## 5. מיילים (Resend)
1. ב-Resend: מאמתים דומיין (SPF/DKIM) ויוצרים API key.
2. Supabase Dashboard ← Edge Functions ← Secrets: מגדירים `RESEND_API_KEY`.
3. מהדקה הבאה, המיילים שבתור נשלחים. אפשר לעקוב ב-`email_outbox` (`status`).

## 6. בדיקת אבטחה על הפרויקט האמיתי
```bash
python3 supabase/tests/make_remote_suite.py     # יוצר supabase/tests/remote_suite.sql
```
1. מדביקים את הקובץ ב-SQL Editor ומריצים.
2. התוצאה מגיעה כ"שגיאה" שמתחילה ב-`ARCHIFLOW_RESULTS`. זה מכוון: השגיאה מבטלת את כל הנתונים שהבדיקה יצרה.
3. אסור שתופיע שורת `FAIL`.

## שינוי במסד
1. כותבים מיגרציה חדשה ב-`supabase/migrations/`, עם תאריך ומספר עוקב.
2. מוסיפים בדיקות ב-`supabase/tests/10_security_tests.sql`. מריצים `npm run test:db`.
3. מתקינים על הפרויקט: `supabase db push`, או מדביקים ב-SQL Editor.
4. מריצים Advisors (Security ו-Performance).
5. מעדכנים טיפוסים: `supabase gen types typescript --project-id qbwaqngxdgmqgddxcuzv > supabase/types/database.types.ts`.

## עדכון האתר
`npm run build:site`, ואז commit ו-push. Vercel מפרסם אוטומטית מ-`main`.
