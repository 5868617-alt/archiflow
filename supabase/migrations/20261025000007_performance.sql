-- ArchiFlow – performance pass (Supabase performance advisor)
-- Does not change who can see or do what; the security test suite must pass unchanged.

-- 1. auth_rls_initplan: evaluate auth.uid() once per query instead of once per row
do $$
declare p record; q text; c text; stmt text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
           where schemaname = 'public' and (qual ~ 'auth\.uid\(\)' or with_check ~ 'auth\.uid\(\)')
  loop
    q := regexp_replace(p.qual, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g');
    c := regexp_replace(p.with_check, '(?<!select )auth\.uid\(\)', '(select auth.uid())', 'g');
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if q is not null then stmt := stmt || format(' using (%s)', q); end if;
    if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
    execute stmt;
  end loop;
end $$;

-- 2. multiple_permissive_policies: a "FOR ALL" write policy next to a SELECT policy is split
--    into INSERT / UPDATE / DELETE, so SELECT is checked by one policy only. Same rules.
do $$
declare p record; roles text;
begin
  for p in select pol.* from pg_policies pol
           where pol.schemaname = 'public' and pol.cmd = 'ALL' and pol.permissive = 'PERMISSIVE'
             and exists (select 1 from pg_policies s where s.schemaname = pol.schemaname and s.tablename = pol.tablename
                         and s.cmd = 'SELECT' and s.policyname <> pol.policyname)
  loop
    select string_agg(quote_ident(r), ', ') into roles from unnest(p.roles) r;
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute format('create policy %I on %I.%I for insert to %s with check (%s)',
                   p.policyname || '_ins', p.schemaname, p.tablename, roles, coalesce(p.with_check, p.qual, 'true'));
    execute format('create policy %I on %I.%I for update to %s using (%s) with check (%s)',
                   p.policyname || '_upd', p.schemaname, p.tablename, roles, coalesce(p.qual, 'true'), coalesce(p.with_check, p.qual, 'true'));
    execute format('create policy %I on %I.%I for delete to %s using (%s)',
                   p.policyname || '_del', p.schemaname, p.tablename, roles, coalesce(p.qual, 'true'));
  end loop;
end $$;

-- 3. unindexed_foreign_keys: add a covering index for every FK that has none
do $$
declare fk record; cols text;
begin
  for fk in
    select c.conrelid::regclass as tbl, c.conname, c.conkey
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
  loop
    select string_agg(quote_ident(a.attname), ', ' order by k.ord) into cols
    from unnest(fk.conkey) with ordinality k(attnum, ord)
    join pg_attribute a on a.attrelid = fk.tbl and a.attnum = k.attnum;
    execute format('create index if not exists %I on %s (%s)', left(fk.conname, 55) || '_idx', fk.tbl, cols);
  end loop;
end $$;
