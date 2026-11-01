---
paths:
  - "supabase/**"
  - "src/live/**"
  - "src/data/api.ts"
---

# מסד נתונים, אבטחה וסנכרון – ArchiFlow

## מיגרציות
- כל שינוי הוא קובץ חדש `supabase/migrations/YYYYMMDDHHMMSS_name.sql`. **לא עורכים מיגרציה שכבר הותקנה** (גם לא כדי "לתקן קצת").
- טבלה חדשה מקבלת תמיד, באותה מיגרציה:
  - `office_id uuid not null references public.offices(id) on delete cascade`
  - `alter table … enable row level security` ומדיניות נפרדת ל-select / insert / update / delete
  - טריגר `private.same_office_check(...)` לכל מפתח זר לטבלה של משרד
  - אינדקס לכל מפתח זר
  - `revoke all … from anon`
  - הוספה לרשימת `office_tables` ב-`public.app_snapshot`
- מדיניות כותבים בצורה `(select private.can_view_project(project_id)) and (select private.can_write(office_id))` – עם `select` סביב הפונקציה (ביצועים).
- פונקציית `security definer`: תמיד `set search_path = ''`, `perform private.require_auth()` ובדיקת הרשאה **בשורה הראשונה**, `revoke … from public, anon` ו-`grant … to authenticated`.
- כל מה שלקוח (portal) משנה – רק דרך פונקציית שרת שבודקת שהפריט שייך לו. לעולם לא מדיניות update ללקוח.

## אחסון
- דליים פרטיים בלבד. נתיב: `{office}/{project|office}/{uuid}/{name}`.
- דלי חדש = שלושה מקומות: `private.storage_can_read`, `private.storage_can_write`, **ורשימת הדליים במדיניות `archiflow_read` / `archiflow_delete` על `storage.objects`**. (פעם שכחנו את השלישי – הבדיקות עברו, האתר נחסם.)
- בדיקת אבטחה לקבצים קוראת דרך `storage.objects` עצמה, לא רק דרך `storage_can_read`.

## בדיקות אבטחה (חובה לכל שינוי)
`supabase/tests/10_security_tests.sql`, בלוק `begin … rollback` לכל נושא, עם `tests.login`, `tests.allowed`, `tests.denied`, `tests.ok`.
לכל טבלה או פונקציה חדשה בודקים לפחות:
1. מי שמורשה – מצליח.
2. חבר צוות לא משויך – חסום.
3. לקוח – רואה רק את מה ששותף איתו, ולא כותב ישירות.
4. משרד אחר – לא רואה כלום (`avital`).
5. anon – חסום.
6. מפתח זר למשרד אחר – נדחה.

הרצה: `npm run test:db` (PostgreSQL מקומי). אסור שיהיה `FAIL`.

## סנכרון בגרסה המחוברת
- טבלה חדשה: קריאה ב-`fromSnapshot` (`src/live/map.ts`), כתיבה ב-`toRow`, ושורת `simple(...)` ב-`push` (`src/live/sync.ts`).
- פעולה שעוברת דרך פונקציית שרת: `case 'actionName':` בתחילת `push`, ואז `return`.
- מזהים נוצרים בצד הלקוח (`uid()` מחזיר UUID בגרסה המחוברת).
- אחרי החלה על הפרויקט האמיתי: `get_advisors` (security) – אסור שיישארו שגיאות; ועדכון `supabase/types/database.types.ts`.
