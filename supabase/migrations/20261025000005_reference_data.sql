-- ArchiFlow – reference data required in every environment.
-- Prices are DEMO prices pending business approval (price_confirmed = false).

insert into public.feature_definitions (key, label, grp) values
  ('projects', 'ניהול פרויקטים ולקוחות', 'בסיס'),
  ('tasks', 'משימות, קנבן ותבניות עבודה', 'בסיס'),
  ('calendar', 'יומן ופגישות', 'בסיס'),
  ('documents', 'מסמכים וגרסאות', 'בסיס'),
  ('plans_viewer', 'ספריית שרטוטים וצפייה', 'שרטוטים'),
  ('plans_annotations', 'הערות, ממצאים ומדידה ידנית', 'שרטוטים'),
  ('plans_compare', 'השוואת גרסאות שרטוט', 'שרטוטים'),
  ('specs', 'מפרטים וחלופות', 'מפרטים ורכש'),
  ('procurement', 'ספקים והזמנות רכש', 'מפרטים ורכש'),
  ('budget', 'תקציב ביצוע והוצאות', 'כספים'),
  ('fees', 'מעקב שכר טרחה', 'כספים'),
  ('client_portal', 'פורטל לקוח ואישורים מקוונים', 'לקוחות'),
  ('advanced_reports', 'דוחות מתקדמים וייצוא', 'כספים'),
  ('calendar_sync', 'סנכרון יומן (עתידי)', 'אינטגרציות'),
  ('custom_roles', 'הרשאות מותאמות לפי פרויקט', 'צוות'),
  ('priority_support', 'תמיכה בעדיפות', 'תמיכה')
on conflict (key) do nothing;

insert into public.subscription_plans (id, name, tagline, price_monthly, price_yearly_per_month, vat_included, price_confirmed, max_users, max_active_projects, storage_gb, trial_days) values
  ('starter', 'Starter', 'לסטודיו קטן שמתחיל לעבוד מסודר', 149, 124, false, false, 3, 10, 20, 14),
  ('pro', 'Pro', 'למשרד עם צוות, לקוחות פעילים ורכש', 299, 249, false, false, 10, null, 200, 14)
on conflict (id) do nothing;

insert into public.plan_features (plan_id, feature_key, enabled)
select p.id, f.key,
  case when p.id = 'pro' then true
       else f.key in ('projects', 'tasks', 'calendar', 'documents', 'plans_viewer', 'plans_annotations', 'specs', 'budget') end
from public.subscription_plans p cross join public.feature_definitions f
on conflict do nothing;

insert into public.retention_policies (data_type, period, action) values
  ('נתוני משרד לאחר ביטול מנוי', '90 יום', 'קריאה בלבד, ולאחר מכן מחיקה'),
  ('קבצי שרטוטים ומסמכים', 'כל עוד המנוי פעיל + 90 יום', 'מחיקה מאחסון'),
  ('יומן ביקורת', '7 שנים', 'ארכוב'),
  ('חשבוניות ונתוני חיוב', '7 שנים', 'שמירה'),
  ('פניות תמיכה', '24 חודשים', 'אנונימיזציה'),
  ('משתמשי לקוח לא פעילים', '12 חודשים ללא כניסה', 'השבתת גישה לפורטל')
on conflict (data_type) do nothing;
