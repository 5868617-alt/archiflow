# בדיקות

## 1. בדיקות אבטחה של המסד
- **קבצים:**
  - `supabase/tests/00_supabase_emulation.sql` מדמה את מה ש-Supabase מספק: `auth.users`, `auth.uid()`, תפקידי anon/authenticated, `storage`.
  - `supabase/tests/10_security_tests.sql` מכיל את 168 הבדיקות.
- **הרצה:**
  ```bash
  npm run test:db        # reset_test_db.sh + run_tests.sh
  ```
  דורש PostgreSQL 16 מקומי. ברירת המחדל: socket `/home/claude/pg`, פורט 54329, מסד `af`. אפשר לשנות עם `PGHOST` ו-`PGPORT`.
- **מה נבדק:**
  - בידוד בין משרדים.
  - הרשאות לפי תפקיד.
  - חסימת עדכון סטטוס ישיר.
  - אישורי לקוח.
  - מגבלות מסלול.
  - הזמנות.
  - אחסון.
  - משימות מתוזמנות.
  - `app_snapshot`.
  - פעולות השרת החדשות.
  - ה-bootstrap של Super Admin.
- **על הפרויקט האמיתי:** ראו [operations.md](operations.md#6-בדיקת-אבטחה-על-הפרויקט-האמיתי).

## 2. בדיקות דפדפן מקצה לקצה (האתר המחובר)
`tests/e2e/gateway.mjs` הוא שרת קטן שמדמה את Auth, PostgREST ו-Storage של Supabase מעל מסד הבדיקה המקומי. כך האתר האמיתי רץ מול אותן מיגרציות ואותו RLS.

```bash
npm run test:e2e:setup      # בונה את האתר לבדיקה, מאפס את המסד, מכין קבצי PDF אמיתיים
npm run test:e2e:gateway &  # http://localhost:8787
npm run test:e2e:crawl      # כל המסכים, בשני רוחבים: שגיאות קונסול, overflow, placeholders
npm run test:e2e:flows      # 44 זרימות כתיבה, כל אחת מאומתת מול המסד
```

- **בפעם האחרונה:**
  - 116 מסלולים נקיים ב-1366px וב-400px.
  - 44 מתוך 44 זרימות עברו.
- **כיסוי הזרימות:**
  - הרשמה ואימות.
  - פתיחת משרד והזמנות.
  - שינוי סטטוס.
  - אישור לקוח מהפורטל.
  - העלאת שרטוט PDF, נעצים, כיול ומדידה.
  - מסמכים וקבלות.
  - שכר טרחה ורכש.
  - חסימות הרשאה.

## 3. גרסת ההדגמה
```bash
npm run build:demo && npm run test:demo   # 127 מסלולים × 6 תפקידים, ו-22 זרימות
```

## תלויות
Playwright (עם Chromium), pdf-lib ו-pdfjs-dist. אם אין `node_modules` מקומי, הסקריפטים מחפשים אותן בנתיב `NODE_GLOBAL`.
