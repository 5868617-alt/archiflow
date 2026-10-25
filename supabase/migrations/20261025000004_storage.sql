-- ArchiFlow – private file storage
-- Path convention (all buckets): {office_id}/{project_id | "office"}/{random}/{file name}
-- Reading a file requires a metadata row that points at it AND permission to see that row.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('plans', 'plans', false, 262144000, array['application/pdf', 'image/png', 'image/jpeg', 'image/vnd.dwg', 'application/acad', 'application/dxf', 'image/vnd.dxf', 'application/octet-stream']),
  ('documents', 'documents', false, 104857600, null),
  ('receipts', 'receipts', false, 20971520, array['application/pdf', 'image/png', 'image/jpeg']),
  ('spec-images', 'spec-images', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('invoices', 'invoices', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.path_office(p_name text) returns uuid language sql immutable as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p_name, '/', 1)::uuid end
$$;
create or replace function private.path_project(p_name text) returns uuid language sql immutable as $$
  select case when split_part(p_name, '/', 2) ~ '^[0-9a-f-]{36}$' then split_part(p_name, '/', 2)::uuid end
$$;

create or replace function private.storage_can_read(p_bucket text, p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_bucket
    when 'plans' then exists (
      select 1 from public.plan_versions v where v.file_path = p_name and (
        private.can_view_plan(v.plan_id) or (private.client_can_view_plan(v.plan_id) and private.is_latest_plan_version(v.id))))
    when 'documents' then exists (
      select 1 from public.document_versions v where v.file_path = p_name and (
        private.can_view_document(v.document_id) or private.client_can_view_document(v.document_id)))
    when 'receipts' then exists (
      select 1 from public.expenses e where e.receipt_path = p_name and private.can_see_finance(e.office_id) and private.can_view_project(e.project_id))
    when 'spec-images' then exists (
      select 1 from public.spec_items s where s.image_path = p_name and private.can_view_spec(s.id))
    when 'invoices' then exists (
      select 1 from public.invoices i where i.pdf_path = p_name and (private.is_owner(i.office_id) or private.is_super_admin()))
    else false
  end
$$;

create or replace function private.storage_can_write(p_bucket text, p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  with parts as (select private.path_office(p_name) as office_id, private.path_project(p_name) as project_id, split_part(p_name, '/', 2) as second)
  select p_bucket in ('plans', 'documents', 'receipts', 'spec-images')
     and parts.office_id is not null
     and private.can_write(parts.office_id)
     and (
       (parts.second = 'office' and p_bucket = 'documents')
       or (parts.project_id is not null
           and exists (select 1 from public.projects pr where pr.id = parts.project_id and pr.office_id = parts.office_id)
           and private.can_view_project(parts.project_id))
     )
     and (p_bucket <> 'receipts' or private.can_see_finance(parts.office_id))
     and position('..' in p_name) = 0
  from parts
$$;
grant execute on function private.path_office, private.path_project, private.storage_can_read, private.storage_can_write to authenticated, anon;

drop policy if exists archiflow_read on storage.objects;
drop policy if exists archiflow_insert on storage.objects;
drop policy if exists archiflow_delete on storage.objects;
create policy archiflow_read on storage.objects for select to authenticated
  using (bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'invoices') and private.storage_can_read(bucket_id, name));
create policy archiflow_insert on storage.objects for insert to authenticated
  with check (private.storage_can_write(bucket_id, name));
create policy archiflow_delete on storage.objects for delete to authenticated
  using (bucket_id in ('plans', 'documents', 'receipts', 'spec-images') and private.is_manager(private.path_office(name)));
-- no update policy: new versions are new objects, existing files are immutable
