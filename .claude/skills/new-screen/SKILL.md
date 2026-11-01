---
name: new-screen
description: Use when adding or redesigning an ArchiFlow screen, tab, modal or portal page – e.g. "add a page for X", "new tab in the project", "show this to the client in the portal". Covers Hebrew RTL layout, the design golden rules, demo and live modes, routing, navigation and the crawl/accessibility checks.
---

# מסך חדש

כללי העיצוב: `.claude/rules/design.md`. מערכת העיצוב: `docs/design-system.md`.

## לפני שכותבים
- איפה המסך יושב: עמוד (`src/pages/`), לשונית בפרויקט (`ProjectDetail.tsx`), או דף בפורטל (`Portal.tsx`).
- מה הפעולה הראשית היחידה במסך (כפתור `primary` אחד).
- מי רואה: בעלים / מנהל / צוות / לקוח. ההגבלה בממשק היא נוחות; האכיפה במסד.

## בנייה
1. רכיבים מ-`src/ui/core.tsx`: `PageHead`, `Card` (כותרת = `h2`), `DataTable`, `Modal`, `Field`, `Empty`, `Callout`, `Badge`.
2. מצב ריק עם הסבר ופעולה (`Empty`), לא מסך לבן.
3. כתיבה רק דרך `run(A.action, …)` ו-`toast(...)` בעברית.
4. תמונות של רשומות – `StoredImage` ו-`useStoreImage` (`src/ui/StoredImage.tsx`).
5. משהו מדומה בדמו – מסמנים (`DemoTag` / `AssumeTag`). באתר המחובר לא מציגים יכולת שלא קיימת.
6. ניתוב ב-`src/App.tsx`, ניווט ב-`useNavModel` (`src/shells/AppShell.tsx`), פעולה מהירה ב-`Palette.tsx` אם רלוונטי.

## בדיקה
```bash
node build.mjs --test
node tools/demo-crawl.mjs 400 && node tools/demo-crawl.mjs 1366   # מוסיפים את המסלול החדש לרשימה בקובץ
node tools/a11y-audit.mjs 400 && node tools/a11y-audit.mjs 1366 && THEME=dark node tools/a11y-audit.mjs 1366
node tools/demo-flows.mjs                                            # ומוסיפים זרימה לפעולה העיקרית
```
ואז צילום מסך בשני הרוחבים ומבט אמיתי: היררכיה ברורה, אין עומס, הטקסט העברי לא מתהפך.
