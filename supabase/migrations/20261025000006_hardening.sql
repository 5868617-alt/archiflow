-- ArchiFlow – hardening pass (mirrors the Supabase security advisor checks)
-- 1. pin search_path on every function we own in private/public (prevents search_path hijacking)
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('private', 'public') and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- skip extension functions
      and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop
    execute format('alter function %s set search_path = %L', f.sig, 'pg_catalog, public');
  end loop;
end $$;

-- 2. sanity checks that fail the migration if a table was left without RLS
do $$
declare missing text;
begin
  select string_agg(c.relname, ', ') into missing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if missing is not null then raise exception 'tables without RLS: %', missing; end if;
end $$;
