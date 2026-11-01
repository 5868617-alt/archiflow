---
name: release
description: Use when shipping ArchiFlow – "deploy", "publish", "push to the site", "release". Runs every test suite, builds the static site, applies pending database migrations only after the owner approves, then commits and pushes so Vercel deploys.
---

# שחרור גרסה

האתר: https://archiflow-topaz.vercel.app (Vercel מפרסם אוטומטית מ-`main`). Vercel לא בונה – `site/` נבנה כאן ונכנס ל-commit.

## 1. בדיקות (כולן חייבות לעבור)
```bash
npm run test:db                                   # אבטחת המסד – אין FAIL
node tests/e2e/gateway.mjs &                      # אם לא רץ
sh tests/e2e/restart.sh && node tests/e2e/crawl.mjs && node tests/e2e/flows.mjs
node build.mjs --test && node tools/demo-crawl.mjs 400 && node tools/demo-flows.mjs
npm run test:a11y                                 # 0 ממצאים בשלושת המצבים
```

## 2. מסד נתונים
אם יש מיגרציה חדשה שעוד לא הוחלה (`list_migrations` מול `supabase/migrations/`):
1. **לעצור ולבקש אישור מבעלת המוצר.** לא מחילים בלי "כן".
2. `apply_migration` עם תוכן הקובץ המדויק.
3. `get_advisors` (security) – אין שגיאות.
4. `generate_typescript_types` ← `supabase/types/database.types.ts`.

**חשוב:** לא דוחפים קוד שתלוי במיגרציה לפני שהיא הוחלה – האתר החי ייכשל בשמירה.

## 3. בנייה, commit ו-push
```bash
npm run -s build:site
git add -A
git -c user.name="5868617-alt" -c user.email="5868617@gmail.com" commit -m "<מה השתנה ולמה>"
git push origin main
```
## 4. אחרי הפריסה
- לפתוח את האתר, להתחבר, לבדוק את המסך שהשתנה.
- לעדכן את `docs/` אם השתנו מספרי בדיקות, הרשאות או החלטות פתוחות.
