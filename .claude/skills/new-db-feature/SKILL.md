---
name: new-db-feature
description: Use when an ArchiFlow feature needs new database tables, columns, server functions (RPC) or storage buckets – e.g. "add a table", "store X in the database", "new bucket for photos". Walks the full path from migration with RLS through security tests, live sync and demo data, so nothing is half-wired.
---

# יכולת חדשה במסד – מקצה לקצה

הסדר חשוב: מסד ובדיקות קודם, ממשק אחר כך. כללי המסד המלאים: `.claude/rules/database.md`.

## 1. מיגרציה
1. קובץ חדש: `supabase/migrations/<timestamp>_<name>.sql` (לא עורכים קובץ קיים).
2. לכל טבלה: `office_id`, RLS, ארבע מדיניות נפרדות, טריגר `same_office_check`, אינדקסים, `revoke … from anon`.
3. פעולות של לקוח או פעולות שולחות (מייל, התראה) – פונקציית `security definer` עם בדיקת הרשאה בשורה הראשונה.
4. דלי חדש – שלושה מקומות: `storage_can_read`, `storage_can_write`, ורשימת הדליים במדיניות `archiflow_read` / `archiflow_delete`.
5. הוספת הטבלאות ל-`office_tables` ב-`app_snapshot` (מעתיקים את הפונקציה הקיימת במלואה – לא כותבים מחדש מהזיכרון).

## 2. בדיקות אבטחה
מוסיפים בלוק ל-`supabase/tests/10_security_tests.sql` לפי ששת המקרים ב-`database.md`, ומריצים:
```bash
supabase/run_tests.sh | grep -E "FAIL|ERROR|passed"
```
בדיקה שעוברת "מהסיבה הלא נכונה" (למשל מפתח זר שלא קיים בכלל) – מתקנים אותה.

## 3. מודל הנתונים בממשק
- טיפוס ב-`src/data/types.ts`, נתוני דמו ב-`src/data/seed.ts`, מפתח ב-`makeSeedDB` וב-`DB` (`src/data/store.tsx`).
- פעולות ב-`A` (`src/data/api.ts`) – כל פעולה רושמת `logActivity` כשזה משמעותי ללקוח או לצוות.

## 4. הגרסה המחוברת
- `fromSnapshot` + `toRow` ב-`src/live/map.ts`.
- `simple(...)` ב-`push` (`src/live/sync.ts`), או `case` לפונקציית שרת.

## 5. אימות
```bash
sh tests/e2e/restart.sh && node tests/e2e/flows.mjs     # הגייטוויי צריך לרוץ: node tests/e2e/gateway.mjs &
```
מוסיפים ל-`tests/e2e/flows.mjs` זרימה שכותבת דרך המסך ובודקת בשאילתה שהשורה במסד.

## 6. לפני פריסה
- להעביר את המיגרציה לאישור בעלת המוצר, ואז `apply_migration` על הפרויקט `qbwaqngxdgmqgddxcuzv`.
- `get_advisors` (security) – אסור שגיאות.
- `generate_typescript_types` ← `supabase/types/database.types.ts`.
- לעדכן `docs/security.md` (טבלת ההרשאות) ו-`docs/testing.md` (מספרי הבדיקות).
