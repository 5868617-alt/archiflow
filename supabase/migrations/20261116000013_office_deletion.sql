-- ArchiFlow – deleting an office (the owner asks, a 30-day grace period, then the platform owner deletes)
--
-- 1. offices.deletion_* columns, writable only through the functions below.
-- 2. request_office_deletion / cancel_office_deletion: the office owner only, the office name typed as confirmation.
-- 3. admin_deletion_requests / admin_delete_office: the Super Admin only, and only after the grace period.
--    The whole office is removed (every office table cascades from offices). The audit log keeps one summary row.
-- 4. Files: Storage files cannot be deleted from SQL. After the office is gone its files are "orphans";
--    admin_orphan_files lists them and the Super Admin console removes them through the Storage API.
--    The storage policies let only a Super Admin see/delete files whose office no longer exists.
-- 5. record_data_export: the owner's export is written to the audit log.
-- The 30 days are a demo assumption ("טעון אישור", docs/open-decisions.md).

-- ---------------------------------------------------------------- 1. columns
alter table public.offices
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id) on delete set null,
  add column deletion_due_at timestamptz;

create or replace function private.guard_office_deletion() returns trigger language plpgsql as $$
begin
  if (new.deletion_requested_at is distinct from old.deletion_requested_at
      or new.deletion_requested_by is distinct from old.deletion_requested_by
      or new.deletion_due_at is distinct from old.deletion_due_at)
     and not private.rpc_context() then
    raise exception 'deletion fields change only through request_office_deletion / cancel_office_deletion' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger guard_office_deletion before update on public.offices for each row execute function private.guard_office_deletion();

-- while one office is being deleted, its cascades may null office_id on kept rows (audit_log, system_events)
-- and do not write an audit row per deleted row (one summary row is written instead)
create or replace function private.immutable_office_id() returns trigger language plpgsql as $$
begin
  if new.office_id is distinct from old.office_id
     and not (new.office_id is null and old.office_id::text = coalesce(current_setting('archiflow.deleting_office', true), '')) then
    raise exception 'office_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; n jsonb; office uuid; rid text;
begin
  o := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  office := coalesce((coalesce(n, o) ->> 'office_id')::uuid, case when tg_table_name = 'offices' then (coalesce(n, o) ->> 'id')::uuid end);
  if office is not null and office::text = coalesce(current_setting('archiflow.deleting_office', true), '') then
    return coalesce(new, old);
  end if;
  rid := coalesce(coalesce(n, o) ->> 'id', coalesce(n, o) ->> 'user_id', coalesce(n, o) ->> 'office_id');
  -- never store secrets
  o := o - 'token_hash'; n := n - 'token_hash';
  insert into public.audit_log(office_id, actor_id, actor_is_super_admin, action, table_name, record_id, old_data, new_data)
  values (office, auth.uid(), private.is_super_admin(), lower(tg_op), tg_table_name, rid, o, n);
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------- 2. the owner asks / changes their mind
create or replace function public.request_office_deletion(p_office uuid, p_confirm_name text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); o record; due timestamptz := now() + interval '30 days';
begin
  if not private.is_owner(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into o from public.offices where id = p_office for update;
  if trim(coalesce(p_confirm_name, '')) <> trim(o.name) then raise exception 'office name does not match' using errcode = '22023'; end if;
  if o.deletion_requested_at is not null then raise exception 'deletion already requested' using errcode = '22023'; end if;
  perform private.rpc_on();
  update public.offices set deletion_requested_at = now(), deletion_requested_by = uid, deletion_due_at = due where id = p_office;
  perform private.rpc_off();
  insert into public.audit_log(office_id, actor_id, action, table_name, record_id, new_data)
  values (p_office, uid, 'deletion_requested', 'offices', p_office::text, jsonb_build_object('due_at', due));
  perform private.notify(p_office, m.user_id, 'system', 'המשרד מתוכנן למחיקה',
    'בעלת המשרד ביקשה למחוק את המשרד וכל הנתונים שלו. המחיקה תתבצע אחרי ' || to_char(due at time zone 'Asia/Jerusalem', 'DD.MM.YYYY') || ', אלא אם הבקשה תבוטל.', '/settings/data')
  from public.office_members m where m.office_id = p_office and m.status = 'active' and m.user_id is not null;
  return due;
end $$;

create or replace function public.cancel_office_deletion(p_office uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth();
begin
  if not private.is_owner(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.offices where id = p_office and deletion_requested_at is not null) then
    raise exception 'no deletion request' using errcode = '22023';
  end if;
  perform private.rpc_on();
  update public.offices set deletion_requested_at = null, deletion_requested_by = null, deletion_due_at = null where id = p_office;
  perform private.rpc_off();
  insert into public.audit_log(office_id, actor_id, action, table_name, record_id) values (p_office, uid, 'deletion_cancelled', 'offices', p_office::text);
  perform private.notify(p_office, m.user_id, 'system', 'מחיקת המשרד בוטלה', 'המשרד והנתונים שלו נשארים כמו שהם.', '/settings/data')
  from public.office_members m where m.office_id = p_office and m.status = 'active' and m.user_id is not null;
end $$;

-- ---------------------------------------------------------------- 3. the platform owner
create or replace function public.admin_deletion_requests()
returns table (id uuid, name text, owner_name text, owner_email text, requested_at timestamptz, due_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select o.id, o.name, pr.full_name, pr.email::text, o.deletion_requested_at, o.deletion_due_at
  from public.offices o left join public.profiles pr on pr.id = o.deletion_requested_by
  where o.deletion_requested_at is not null order by o.deletion_due_at;
end $$;

create or replace function public.admin_delete_office(p_office uuid, p_confirm_name text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); o record;
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into o from public.offices where id = p_office for update;
  if not found then raise exception 'office not found' using errcode = '22023'; end if;
  if o.deletion_requested_at is null then raise exception 'the owner has not asked to delete this office' using errcode = '22023'; end if;
  if o.deletion_due_at > now() then raise exception 'the grace period has not ended' using errcode = '22023'; end if;
  if trim(coalesce(p_confirm_name, '')) <> trim(o.name) then raise exception 'office name does not match' using errcode = '22023'; end if;
  insert into public.audit_log(office_id, actor_id, actor_is_super_admin, action, table_name, record_id, old_data)
  values (null, uid, true, 'office_deleted', 'offices', p_office::text,
          jsonb_build_object('name', o.name, 'requested_at', o.deletion_requested_at, 'requested_by', o.deletion_requested_by));
  perform set_config('archiflow.deleting_office', p_office::text, true);
  perform private.rpc_on();
  delete from public.offices where id = p_office;
  perform private.rpc_off();
  perform set_config('archiflow.deleting_office', '', true);
end $$;

-- files left behind by offices that no longer exist
create or replace function private.is_orphan_path(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.path_office(p_name) is not null and not exists (select 1 from public.offices o where o.id = private.path_office(p_name))
$$;

create or replace function public.admin_orphan_files()
returns table (bucket text, name text, size bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select so.bucket_id::text, so.name::text, coalesce((so.metadata ->> 'size')::bigint, 0)
  from storage.objects so
  where so.bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'invoices', 'site-photos', 'moodboard', 'library', 'branding')
    and private.is_orphan_path(so.name)
  order by so.bucket_id, so.name
  limit 1000;
end $$;

-- the storage policies: same buckets as before, plus "a Super Admin may see and delete orphaned files"
drop policy if exists archiflow_read on storage.objects;
drop policy if exists archiflow_delete on storage.objects;
create policy archiflow_read on storage.objects for select to authenticated
  using (bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'invoices', 'site-photos', 'moodboard', 'library', 'branding')
         and (private.storage_can_read(bucket_id, name) or ((select private.is_super_admin()) and private.is_orphan_path(name))));
create policy archiflow_delete on storage.objects for delete to authenticated
  using ((bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'site-photos', 'moodboard', 'library', 'branding') and private.is_manager(private.path_office(name)))
         or (bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'invoices', 'site-photos', 'moodboard', 'library', 'branding')
             and (select private.is_super_admin()) and private.is_orphan_path(name)));

-- ---------------------------------------------------------------- 5. data export is recorded (the export itself is built in the browser
-- from what the owner can already read, so this function only writes the audit row)
create or replace function public.record_data_export(p_office uuid, p_rows integer)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth();
begin
  if not private.is_owner(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.audit_log(office_id, actor_id, action, table_name, record_id, new_data)
  values (p_office, uid, 'data_export', 'offices', p_office::text, jsonb_build_object('rows', greatest(coalesce(p_rows, 0), 0)));
end $$;

-- ---------------------------------------------------------------- grants
revoke execute on function public.request_office_deletion(uuid, text), public.cancel_office_deletion(uuid),
  public.admin_deletion_requests(), public.admin_delete_office(uuid, text), public.admin_orphan_files(), public.record_data_export(uuid, integer) from public, anon;
grant execute on function public.request_office_deletion(uuid, text), public.cancel_office_deletion(uuid),
  public.admin_deletion_requests(), public.admin_delete_office(uuid, text), public.admin_orphan_files(), public.record_data_export(uuid, integer) to authenticated;
revoke execute on function private.guard_office_deletion(), private.is_orphan_path(text) from public, anon;
grant execute on function private.is_orphan_path(text) to authenticated;
