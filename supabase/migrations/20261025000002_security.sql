-- ArchiFlow – security layer
--   1. private helper functions (not exposed through the API)
--   2. integrity guards (tenant consistency, immutable office_id, guarded status columns)
--   3. Row Level Security on every table
--   4. column-level privileges
--
-- Model decisions (configurable per office in public.office_settings):
--   * owner/admin see every project of their office
--   * member sees assigned projects only (member_sees_all_projects = false)
--   * member sees budgets/expenses only if member_can_see_finance
--   * fee tracking is owner/admin only
--   * a client contact with portal_status = 'active' sees only records marked shared_with_client
--     in projects of their own client, and only while the office plan includes the client portal
--   * the Super Admin sees platform metadata (offices, members, subscriptions, tickets, audit)
--     but NOT project content
--   * a cancelled/expired office is read-only

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
-- Supabase Auth inserts into auth.users as supabase_auth_admin; it must be able to run the profile trigger
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema private to supabase_auth_admin';
  end if;
end $$;

-- ================================================================ 1. helpers
create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_super_admin from public.profiles p where p.id = auth.uid()), false)
$$;

create or replace function private.office_role(p_office uuid) returns public.office_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.office_members m
  where m.office_id = p_office and m.user_id = auth.uid() and m.status = 'active'
$$;

create or replace function private.is_staff(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.office_role(p_office) is not null
$$;

create or replace function private.is_manager(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.office_role(p_office) in ('owner', 'admin'), false)
$$;

create or replace function private.is_owner(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.office_role(p_office) = 'owner', false)
$$;

-- subscription is in a state that allows writes
create or replace function private.sub_active(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.office_subscriptions s
    where s.office_id = p_office
      and s.status in ('trialing', 'active', 'past_due', 'cancel_at_period_end')
      and (s.status <> 'trialing' or s.trial_ends_at is null or s.trial_ends_at > now())
  )
$$;

create or replace function private.has_feature(p_office uuid, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.sub_active(p_office) and exists (
    select 1 from public.office_subscriptions s
    join public.plan_features f on f.plan_id = s.plan_id
    where s.office_id = p_office and f.feature_key = p_key and f.enabled
  )
$$;

create or replace function private.can_write(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_staff(p_office) and private.sub_active(p_office)
$$;

create or replace function private.can_see_finance(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_manager(p_office) or (
    private.is_staff(p_office)
    and coalesce((select s.member_can_see_finance from public.office_settings s where s.office_id = p_office), false)
  )
$$;

-- staff visibility of a project
create or replace function private.can_view_project(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project and (
      private.is_manager(p.office_id)
      or (private.is_staff(p.office_id) and (
            coalesce((select s.member_sees_all_projects from public.office_settings s where s.office_id = p.office_id), false)
            or exists (select 1 from public.project_assignments a where a.project_id = p.id and a.user_id = auth.uid())
          ))
    )
  )
$$;

-- client portal visibility of a project
create or replace function private.is_project_client(p_project uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    join public.client_contacts c on c.client_id = p.client_id
    where p.id = p_project and c.user_id = auth.uid() and c.portal_status = 'active'
      and private.has_feature(p.office_id, 'client_portal')
  )
$$;

create or replace function private.is_client_of(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.client_contacts c where c.client_id = p_client and c.user_id = auth.uid() and c.portal_status = 'active')
$$;

create or replace function private.is_office_client(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.client_contacts c where c.office_id = p_office and c.user_id = auth.uid() and c.portal_status = 'active')
$$;

create or replace function private.can_view_client(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.clients c where c.id = p_client and (
      private.is_manager(c.office_id)
      or (private.is_staff(c.office_id) and exists (select 1 from public.projects p where p.client_id = c.id and private.can_view_project(p.id)))
    )
  )
$$;

create or replace function private.can_view_task(p_task uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tasks t where t.id = p_task and private.is_staff(t.office_id)
      and (case when t.project_id is null then true else private.can_view_project(t.project_id) end)
  )
$$;

create or replace function private.can_view_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plans p where p.id = p_plan and private.can_view_project(p.project_id))
$$;

create or replace function private.client_can_view_plan(p_plan uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.plans p where p.id = p_plan and p.shared_with_client and private.is_project_client(p.project_id))
$$;

create or replace function private.is_latest_plan_version(p_version uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plan_versions v
    where v.id = p_version and v.version = (select max(v2.version) from public.plan_versions v2 where v2.plan_id = v.plan_id)
  )
$$;

create or replace function private.can_view_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.documents d where d.id = p_doc and private.is_staff(d.office_id) and (
      case d.access
        when 'owners_admins' then private.is_manager(d.office_id)
        when 'office' then true
        else (d.project_id is null or private.can_view_project(d.project_id))
      end)
  )
$$;

create or replace function private.client_can_view_document(p_doc uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d where d.id = p_doc and d.shared_with_client and d.project_id is not null and private.is_project_client(d.project_id))
$$;

create or replace function private.can_view_meeting(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.meetings m where m.id = p_meeting and private.is_staff(m.office_id)
      and (m.project_id is null or private.can_view_project(m.project_id))
  )
$$;

create or replace function private.client_can_view_meeting(p_meeting uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.meetings m where m.id = p_meeting and m.shared_with_client and m.project_id is not null and private.is_project_client(m.project_id))
$$;

create or replace function private.can_view_spec(p_spec uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.spec_items s where s.id = p_spec and (
      private.can_view_project(s.project_id) or (s.shared_with_client and private.is_project_client(s.project_id))
    )
  )
$$;

create or replace function private.can_view_ticket(p_ticket uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.support_tickets t where t.id = p_ticket and (
      t.created_by = auth.uid() or private.is_manager(t.office_id) or private.is_super_admin()
    )
  )
$$;

-- profiles that appear next to the viewer (same office staff, or the studio team a client works with)
create or replace function private.can_view_profile(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user = auth.uid()
    or private.is_super_admin()
    or exists (
      select 1 from public.office_members mine join public.office_members theirs on theirs.office_id = mine.office_id
      where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = p_user
    )
    or exists (  -- office staff can see the client users of their office
      select 1 from public.client_contacts c join public.office_members m on m.office_id = c.office_id
      where c.user_id = p_user and m.user_id = auth.uid() and m.status = 'active'
    )
    or exists (  -- a client sees the studio team of projects shared with them
      select 1 from public.client_contacts c join public.office_members m on m.office_id = c.office_id
      where c.user_id = auth.uid() and c.portal_status = 'active' and m.user_id = p_user
    )
$$;

-- RPCs set this flag (transaction-local) to pass the guarded-column triggers
create or replace function private.rpc_context() returns boolean
language sql stable as $$ select coalesce(current_setting('archiflow.rpc', true), '') = 'on' $$;

grant execute on all functions in schema private to anon, authenticated, service_role;

-- ================================================================ 2. integrity guards
create or replace function private.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create or replace function private.immutable_office_id() returns trigger language plpgsql as $$
begin
  if new.office_id is distinct from old.office_id then
    raise exception 'office_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

-- TG_ARGV: pairs of (column, parent_table). Rejects rows whose parent belongs to another office.
create or replace function private.same_office_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  i int := 0; col text; tbl text; ref uuid; parent_office uuid;
begin
  while i < tg_nargs loop
    col := tg_argv[i]; tbl := tg_argv[i + 1];
    execute format('select ($1).%I::uuid', col) into ref using new;
    if ref is not null then
      execute format('select office_id from public.%I where id = $1', tbl) into parent_office using ref;
      if parent_office is null or parent_office <> new.office_id then
        raise exception 'cross-office reference rejected (%.% -> %)', tg_table_name, col, tbl using errcode = '42501';
      end if;
    end if;
    i := i + 2;
  end loop;
  return new;
end $$;

-- users referenced as assignee/lead/attendee must be active staff of the same office
create or replace function private.staff_ref_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare col text; ref uuid; i int := 0;
begin
  while i < tg_nargs loop
    col := tg_argv[i];
    execute format('select ($1).%I::uuid', col) into ref using new;
    if ref is not null and not exists (select 1 from public.office_members m where m.office_id = new.office_id and m.user_id = ref and m.status = 'active') then
      raise exception 'user % is not an active member of this office', ref using errcode = '42501';
    end if;
    i := i + 1;
  end loop;
  return new;
end $$;

-- statuses that only server-side RPCs may set
create or replace function private.guard_spec_status() returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.status in ('approved', 'rejected', 'change_requested'))
     or (tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('approved', 'rejected', 'change_requested'))
  then
    if not private.rpc_context() and auth.uid() is not null then
      raise exception 'spec status % can only be set by a client decision', new.status using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create or replace function private.guard_plan_version_status() returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved')
     and not private.rpc_context() and auth.uid() is not null then
    raise exception 'a plan version is approved only through a client decision' using errcode = '42501';
  end if;
  return new;
end $$;

create or replace function private.guard_project_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status and not private.rpc_context() and auth.uid() is not null then
    raise exception 'use set_project_status() to change a project status' using errcode = '42501';
  end if;
  return new;
end $$;

-- role changes: no self-changes, owner is untouchable, only the owner manages admins
create or replace function private.guard_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor public.office_role;
begin
  if private.rpc_context() or auth.uid() is null then return coalesce(new, old); end if;
  actor := private.office_role(coalesce(new.office_id, old.office_id));
  if tg_op = 'INSERT' then
    raise exception 'members join through accept_invitation()' using errcode = '42501';
  end if;
  if old.user_id = auth.uid() then raise exception 'you cannot change your own membership' using errcode = '42501'; end if;
  if old.role = 'owner' then raise exception 'the office owner cannot be modified' using errcode = '42501'; end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.office_id <> old.office_id then raise exception 'membership keys are immutable' using errcode = '42501'; end if;
    if new.role = 'owner' then raise exception 'ownership transfer is not supported here' using errcode = '42501'; end if;
    if (old.role = 'admin' or new.role = 'admin') and actor <> 'owner' then
      raise exception 'only the owner can grant or change admin roles' using errcode = '42501';
    end if;
  end if;
  return coalesce(new, old);
end $$;

-- plan limits
create or replace function private.enforce_user_limit(p_office uuid, p_extra int default 0) returns void
language plpgsql security definer set search_path = '' as $$
declare lim int; used int;
begin
  select p.max_users into lim from public.office_subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.office_id = p_office;
  if lim is null then return; end if;
  select (select count(*) from public.office_members m where m.office_id = p_office and m.status = 'active')
       + (select count(*) from public.invitations i where i.office_id = p_office and i.status = 'pending' and i.role <> 'client' and i.expires_at > now())
    into used;
  if used + p_extra > lim then
    raise exception 'plan_limit:users (% of %)', used + p_extra, lim using errcode = 'P0001', hint = 'upgrade_required';
  end if;
end $$;

create or replace function private.trg_user_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'invitations' then
    if new.role <> 'client' then perform private.enforce_user_limit(new.office_id, 1); end if;
  elsif new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    -- a pending invitation being accepted is already counted
    perform private.enforce_user_limit(new.office_id, case when exists (
      select 1 from public.invitations i where i.office_id = new.office_id and i.status = 'pending' and i.role <> 'client'
        and i.email = (select u.email from auth.users u where u.id = new.user_id)) then 0 else 1 end);
  end if;
  return new;
end $$;

create or replace function private.trg_project_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lim int; used int;
begin
  if new.status in ('completed', 'on_hold', 'lead') then return new; end if;
  if tg_op = 'UPDATE' and old.status not in ('completed', 'on_hold', 'lead') then return new; end if;
  select p.max_active_projects into lim from public.office_subscriptions s join public.subscription_plans p on p.id = s.plan_id where s.office_id = new.office_id;
  if lim is null then return new; end if;
  select count(*) into used from public.projects x where x.office_id = new.office_id and x.id <> new.id and x.status not in ('completed', 'on_hold', 'lead');
  if used + 1 > lim then
    raise exception 'plan_limit:active_projects (% of %)', used + 1, lim using errcode = 'P0001', hint = 'upgrade_required';
  end if;
  return new;
end $$;

-- audit
create or replace function private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o jsonb; n jsonb; office uuid; rid text;
begin
  o := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  n := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  office := coalesce((coalesce(n, o) ->> 'office_id')::uuid, case when tg_table_name = 'offices' then (coalesce(n, o) ->> 'id')::uuid end);
  rid := coalesce(coalesce(n, o) ->> 'id', coalesce(n, o) ->> 'user_id', coalesce(n, o) ->> 'office_id');
  -- never store secrets
  o := o - 'token_hash'; n := n - 'token_hash';
  insert into public.audit_log(office_id, actor_id, actor_is_super_admin, action, table_name, record_id, old_data, new_data)
  values (office, auth.uid(), private.is_super_admin(), lower(tg_op), tg_table_name, rid, o, n);
  return coalesce(new, old);
end $$;

create or replace function private.log_pricing_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.price_monthly is distinct from old.price_monthly then
    insert into public.pricing_changes(plan_id, field, old_value, new_value, changed_by) values (new.id, 'price_monthly', old.price_monthly::text, new.price_monthly::text, auth.uid());
  end if;
  if new.price_yearly_per_month is distinct from old.price_yearly_per_month then
    insert into public.pricing_changes(plan_id, field, old_value, new_value, changed_by) values (new.id, 'price_yearly_per_month', old.price_yearly_per_month::text, new.price_yearly_per_month::text, auth.uid());
  end if;
  if new.max_users is distinct from old.max_users then
    insert into public.pricing_changes(plan_id, field, old_value, new_value, changed_by) values (new.id, 'max_users', coalesce(old.max_users::text, 'unlimited'), coalesce(new.max_users::text, 'unlimited'), auth.uid());
  end if;
  if new.max_active_projects is distinct from old.max_active_projects then
    insert into public.pricing_changes(plan_id, field, old_value, new_value, changed_by) values (new.id, 'max_active_projects', coalesce(old.max_active_projects::text, 'unlimited'), coalesce(new.max_active_projects::text, 'unlimited'), auth.uid());
  end if;
  return new;
end $$;

create or replace function private.log_plan_feature_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.pricing_changes(plan_id, field, old_value, new_value, changed_by)
  values (new.plan_id, 'feature:' || new.feature_key, case when tg_op = 'UPDATE' then old.enabled::text end, new.enabled::text, auth.uid());
  return new;
end $$;

-- new auth user -> profile
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant execute on function private.handle_new_user() to supabase_auth_admin';
  end if;
end $$;

-- ---------------------------------------------------------------- attach triggers
do $$
declare t text;
begin
  -- updated_at
  foreach t in array array['profiles','offices','office_settings','clients','projects','tasks','plans','spec_items','documents','purchase_orders','office_subscriptions','support_tickets','subscription_plans','retention_policies'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
  -- immutable office_id on every tenant table
  for t in select c.table_name from information_schema.columns c
           where c.table_schema = 'public' and c.column_name = 'office_id'
             and c.table_name not in ('offices') and c.table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    execute format('create trigger immutable_office_id before update on public.%I for each row execute function private.immutable_office_id()', t);
  end loop;
end $$;

-- tenant consistency
create trigger same_office before insert or update on public.client_contacts for each row execute function private.same_office_check('client_id', 'clients');
create trigger same_office before insert or update on public.projects for each row execute function private.same_office_check('client_id', 'clients');
create trigger same_office before insert or update on public.project_assignments for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.milestones for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.tasks for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.task_checklist_items for each row execute function private.same_office_check('task_id', 'tasks');
create trigger same_office before insert or update on public.task_comments for each row execute function private.same_office_check('task_id', 'tasks');
create trigger same_office before insert or update on public.work_template_items for each row execute function private.same_office_check('template_id', 'work_templates');
create trigger same_office before insert or update on public.plans for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.plan_versions for each row execute function private.same_office_check('plan_id', 'plans');
create trigger same_office before insert or update on public.plan_annotations for each row execute function private.same_office_check('plan_id', 'plans', 'plan_version_id', 'plan_versions', 'task_id', 'tasks');
create trigger same_office before insert or update on public.spec_items for each row execute function private.same_office_check('project_id', 'projects', 'supplier_id', 'suppliers');
create trigger same_office before insert or update on public.spec_alternatives for each row execute function private.same_office_check('spec_item_id', 'spec_items', 'supplier_id', 'suppliers');
create trigger same_office before insert or update on public.spec_versions for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.documents for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.document_versions for each row execute function private.same_office_check('document_id', 'documents');
create trigger same_office before insert or update on public.approvals for each row execute function private.same_office_check('project_id', 'projects', 'contact_id', 'client_contacts');
create trigger same_office before insert or update on public.meetings for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.meeting_attendees for each row execute function private.same_office_check('meeting_id', 'meetings');
create trigger same_office before insert or update on public.meeting_contacts for each row execute function private.same_office_check('meeting_id', 'meetings', 'contact_id', 'client_contacts');
create trigger same_office before insert or update on public.meeting_suppliers for each row execute function private.same_office_check('meeting_id', 'meetings', 'supplier_id', 'suppliers');
create trigger same_office before insert or update on public.purchase_orders for each row execute function private.same_office_check('project_id', 'projects', 'supplier_id', 'suppliers');
create trigger same_office before insert or update on public.purchase_order_items for each row execute function private.same_office_check('po_id', 'purchase_orders', 'spec_item_id', 'spec_items');
create trigger same_office before insert or update on public.budget_lines for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.expenses for each row execute function private.same_office_check('project_id', 'projects', 'supplier_id', 'suppliers', 'po_id', 'purchase_orders');
create trigger same_office before insert or update on public.fee_milestones for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.messages for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.activity_log for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.ticket_messages for each row execute function private.same_office_check('ticket_id', 'support_tickets');
create trigger same_office before insert or update on public.invitations for each row execute function private.same_office_check('client_contact_id', 'client_contacts');

create trigger staff_refs before insert or update of lead_id on public.projects for each row execute function private.staff_ref_check('lead_id');
create trigger staff_refs before insert or update of assignee_id on public.tasks for each row execute function private.staff_ref_check('assignee_id');
create trigger staff_refs before insert or update on public.project_assignments for each row execute function private.staff_ref_check('user_id');
create trigger staff_refs before insert or update on public.meeting_attendees for each row execute function private.staff_ref_check('user_id');
create trigger staff_refs before insert or update on public.absences for each row execute function private.staff_ref_check('user_id');

create trigger guard_status before insert or update on public.spec_items for each row execute function private.guard_spec_status();
create trigger guard_status before insert or update on public.plan_versions for each row execute function private.guard_plan_version_status();
create trigger guard_status before update on public.projects for each row execute function private.guard_project_status();
create trigger guard_membership before insert or update or delete on public.office_members for each row execute function private.guard_membership();

create trigger user_limit before insert or update of status on public.office_members for each row execute function private.trg_user_limit();
create trigger user_limit before insert on public.invitations for each row execute function private.trg_user_limit();
create trigger project_limit before insert or update of status on public.projects for each row execute function private.trg_project_limit();

create trigger pricing_log after update on public.subscription_plans for each row execute function private.log_pricing_change();
create trigger pricing_log after insert or update on public.plan_features for each row execute function private.log_plan_feature_change();

-- audit trail on sensitive tables
create trigger audit after insert or update or delete on public.office_members for each row execute function private.audit_row();
create trigger audit after insert or update on public.invitations for each row execute function private.audit_row();
create trigger audit after update on public.office_settings for each row execute function private.audit_row();
create trigger audit after update of portal_status, user_id on public.client_contacts for each row execute function private.audit_row();
create trigger audit after update of status, exec_budget, fee_total on public.projects for each row execute function private.audit_row();
create trigger audit_delete after delete on public.projects for each row execute function private.audit_row();
create trigger audit after insert or update on public.approvals for each row execute function private.audit_row();
create trigger audit after update of access, shared_with_client on public.documents for each row execute function private.audit_row();
create trigger audit_delete after delete on public.documents for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.expenses for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.fee_milestones for each row execute function private.audit_row();
create trigger audit after update of status on public.purchase_orders for each row execute function private.audit_row();
create trigger audit after insert or update on public.office_subscriptions for each row execute function private.audit_row();
create trigger audit after update on public.subscription_plans for each row execute function private.audit_row();
create trigger audit after update of is_super_admin on public.profiles for each row execute function private.audit_row();

-- ================================================================ 3. Row Level Security
do $$
declare t text;
begin
  for t in select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- defence in depth: anonymous users get nothing except the public pricing catalogue
revoke all on all tables in schema public from anon;
grant select on public.subscription_plans, public.plan_features, public.feature_definitions to anon;

-- profiles
create policy profiles_select on public.profiles for select to authenticated using (private.can_view_profile(id));
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- offices
create policy offices_select on public.offices for select to authenticated
  using (private.is_staff(id) or private.is_office_client(id) or private.is_super_admin());
create policy offices_update on public.offices for update to authenticated
  using (private.is_manager(id) and private.sub_active(id)) with check (private.is_manager(id));

create policy settings_select on public.office_settings for select to authenticated using (private.is_staff(office_id));
create policy settings_update on public.office_settings for update to authenticated using (private.is_owner(office_id)) with check (private.is_owner(office_id));

create policy members_select on public.office_members for select to authenticated
  using (private.is_staff(office_id) or private.is_super_admin());
create policy members_update on public.office_members for update to authenticated
  using (private.is_manager(office_id)) with check (private.is_manager(office_id));
create policy members_delete on public.office_members for delete to authenticated using (private.is_manager(office_id));

create policy invitations_select on public.invitations for select to authenticated using (private.is_manager(office_id));
create policy invitations_update on public.invitations for update to authenticated
  using (private.is_manager(office_id)) with check (private.is_manager(office_id) and status in ('pending', 'revoked'));

-- clients
create policy clients_select on public.clients for select to authenticated
  using (private.can_view_client(id) or private.is_client_of(id));
create policy clients_insert on public.clients for insert to authenticated with check (private.is_manager(office_id) and private.sub_active(office_id));
create policy clients_update on public.clients for update to authenticated using (private.is_manager(office_id) and private.sub_active(office_id)) with check (private.is_manager(office_id));
create policy clients_delete on public.clients for delete to authenticated using (private.is_manager(office_id));

create policy contacts_select on public.client_contacts for select to authenticated
  using (private.can_view_client(client_id) or private.is_client_of(client_id));
create policy contacts_insert on public.client_contacts for insert to authenticated with check (private.is_manager(office_id) and private.sub_active(office_id) and portal_status = 'none' and user_id is null);
create policy contacts_update on public.client_contacts for update to authenticated using (private.is_manager(office_id) and private.sub_active(office_id)) with check (private.is_manager(office_id));
create policy contacts_delete on public.client_contacts for delete to authenticated using (private.is_manager(office_id));

-- projects
create policy projects_select on public.projects for select to authenticated
  using (private.can_view_project(id) or private.is_project_client(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (private.is_manager(office_id) and private.sub_active(office_id));
create policy projects_update on public.projects for update to authenticated
  using (private.can_view_project(id) and private.can_write(office_id)) with check (private.can_write(office_id));
create policy projects_delete on public.projects for delete to authenticated using (private.is_owner(office_id));

create policy psh_select on public.project_status_history for select to authenticated using (private.can_view_project(project_id));

create policy assignments_select on public.project_assignments for select to authenticated
  using (private.is_staff(office_id) or private.is_project_client(project_id));
create policy assignments_insert on public.project_assignments for insert to authenticated with check (private.is_manager(office_id) and private.sub_active(office_id));
create policy assignments_delete on public.project_assignments for delete to authenticated using (private.is_manager(office_id));

create policy milestones_select on public.milestones for select to authenticated using (private.can_view_project(project_id) or private.is_project_client(project_id));
create policy milestones_write on public.milestones for all to authenticated
  using (private.can_view_project(project_id) and private.can_write(office_id)) with check (private.can_view_project(project_id) and private.can_write(office_id));

-- tasks
create policy tasks_select on public.tasks for select to authenticated using (private.can_view_task(id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (private.can_write(office_id) and (project_id is null or private.can_view_project(project_id)));
create policy tasks_update on public.tasks for update to authenticated
  using (private.can_view_task(id) and private.can_write(office_id))
  with check (private.can_write(office_id) and (project_id is null or private.can_view_project(project_id)));
create policy tasks_delete on public.tasks for delete to authenticated
  using (private.can_view_task(id) and (private.is_manager(office_id) or created_by = auth.uid()));

create policy checklist_all on public.task_checklist_items for all to authenticated
  using (private.can_view_task(task_id)) with check (private.can_view_task(task_id) and private.can_write(office_id));
create policy comments_select on public.task_comments for select to authenticated using (private.can_view_task(task_id));
create policy comments_insert on public.task_comments for insert to authenticated
  with check (author_id = auth.uid() and private.can_view_task(task_id) and private.can_write(office_id));
create policy comments_update on public.task_comments for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_delete on public.task_comments for delete to authenticated using (author_id = auth.uid() or private.is_manager(office_id));

create policy templates_select on public.work_templates for select to authenticated using (private.is_staff(office_id));
create policy templates_write on public.work_templates for all to authenticated using (private.is_manager(office_id)) with check (private.is_manager(office_id) and private.sub_active(office_id));
create policy template_items_select on public.work_template_items for select to authenticated using (private.is_staff(office_id));
create policy template_items_write on public.work_template_items for all to authenticated using (private.is_manager(office_id)) with check (private.is_manager(office_id) and private.sub_active(office_id));

-- plans
create policy plans_select on public.plans for select to authenticated
  using (private.can_view_project(project_id) or (shared_with_client and private.is_project_client(project_id)));
create policy plans_write on public.plans for all to authenticated
  using (private.can_view_project(project_id) and private.can_write(office_id))
  with check (private.can_view_project(project_id) and private.can_write(office_id));

create policy plan_versions_select on public.plan_versions for select to authenticated
  using (private.can_view_plan(plan_id) or (private.client_can_view_plan(plan_id) and private.is_latest_plan_version(id)));
create policy plan_versions_write on public.plan_versions for all to authenticated
  using (private.can_view_plan(plan_id) and private.can_write(office_id))
  with check (private.can_view_plan(plan_id) and private.can_write(office_id));

create policy annotations_select on public.plan_annotations for select to authenticated using (private.can_view_plan(plan_id));
create policy annotations_insert on public.plan_annotations for insert to authenticated
  with check (private.can_view_plan(plan_id) and private.can_write(office_id) and author_id = auth.uid());
create policy annotations_update on public.plan_annotations for update to authenticated
  using (private.can_view_plan(plan_id) and private.can_write(office_id)) with check (private.can_view_plan(plan_id));
create policy annotations_delete on public.plan_annotations for delete to authenticated
  using (private.can_view_plan(plan_id) and (author_id = auth.uid() or private.is_manager(office_id)));

-- suppliers
create policy suppliers_select on public.suppliers for select to authenticated using (private.is_staff(office_id));
create policy suppliers_write on public.suppliers for all to authenticated using (private.can_write(office_id)) with check (private.can_write(office_id));

-- specs
create policy specs_select on public.spec_items for select to authenticated
  using (private.can_view_project(project_id) or (shared_with_client and private.is_project_client(project_id)));
create policy specs_write on public.spec_items for all to authenticated
  using (private.can_view_project(project_id) and private.can_write(office_id))
  with check (private.can_view_project(project_id) and private.can_write(office_id));
create policy spec_alt_select on public.spec_alternatives for select to authenticated using (private.can_view_spec(spec_item_id));
create policy spec_alt_write on public.spec_alternatives for all to authenticated
  using (private.can_write(office_id) and exists (select 1 from public.spec_items s where s.id = spec_item_id and private.can_view_project(s.project_id)))
  with check (private.can_write(office_id) and exists (select 1 from public.spec_items s where s.id = spec_item_id and private.can_view_project(s.project_id)));
create policy spec_versions_select on public.spec_versions for select to authenticated using (private.can_view_project(project_id));
create policy spec_versions_insert on public.spec_versions for insert to authenticated with check (private.can_view_project(project_id) and private.can_write(office_id));

-- documents
create policy documents_select on public.documents for select to authenticated
  using (private.can_view_document(id) or private.client_can_view_document(id));
create policy documents_insert on public.documents for insert to authenticated
  with check (private.can_write(office_id) and (project_id is null or private.can_view_project(project_id))
              and (access <> 'owners_admins' or private.is_manager(office_id)));
create policy documents_update on public.documents for update to authenticated
  using (private.can_view_document(id) and private.can_write(office_id))
  with check (private.can_write(office_id) and (access <> 'owners_admins' or private.is_manager(office_id)));
create policy documents_delete on public.documents for delete to authenticated using (private.is_manager(office_id));
create policy docver_select on public.document_versions for select to authenticated
  using (private.can_view_document(document_id) or private.client_can_view_document(document_id));
create policy docver_insert on public.document_versions for insert to authenticated
  with check (private.can_view_document(document_id) and private.can_write(office_id));

-- approvals: read-only for everyone; created/decided through RPCs only
create policy approvals_select on public.approvals for select to authenticated
  using (private.can_view_project(project_id) or private.is_project_client(project_id));

-- meetings
create policy meetings_select on public.meetings for select to authenticated using (private.can_view_meeting(id) or private.client_can_view_meeting(id));
create policy meetings_write on public.meetings for all to authenticated
  using (private.can_view_meeting(id) and private.can_write(office_id))
  with check (private.can_write(office_id) and (project_id is null or private.can_view_project(project_id)));
create policy m_att_select on public.meeting_attendees for select to authenticated using (private.can_view_meeting(meeting_id) or private.client_can_view_meeting(meeting_id));
create policy m_att_write on public.meeting_attendees for all to authenticated using (private.can_view_meeting(meeting_id) and private.can_write(office_id)) with check (private.can_view_meeting(meeting_id) and private.can_write(office_id));
create policy m_con_select on public.meeting_contacts for select to authenticated using (private.can_view_meeting(meeting_id) or private.client_can_view_meeting(meeting_id));
create policy m_con_write on public.meeting_contacts for all to authenticated using (private.can_view_meeting(meeting_id) and private.can_write(office_id)) with check (private.can_view_meeting(meeting_id) and private.can_write(office_id));
create policy m_sup_select on public.meeting_suppliers for select to authenticated using (private.can_view_meeting(meeting_id));
create policy m_sup_write on public.meeting_suppliers for all to authenticated using (private.can_view_meeting(meeting_id) and private.can_write(office_id)) with check (private.can_view_meeting(meeting_id) and private.can_write(office_id));

create policy absences_select on public.absences for select to authenticated using (private.is_staff(office_id));
create policy absences_write on public.absences for all to authenticated
  using (private.can_write(office_id) and (user_id = auth.uid() or private.is_manager(office_id)))
  with check (private.can_write(office_id) and (user_id = auth.uid() or private.is_manager(office_id)));

-- procurement (feature-gated)
create policy po_select on public.purchase_orders for select to authenticated
  using (private.can_view_project(project_id) and private.has_feature(office_id, 'procurement'));
create policy po_write on public.purchase_orders for all to authenticated
  using (private.can_view_project(project_id) and private.can_write(office_id) and private.has_feature(office_id, 'procurement'))
  with check (private.can_view_project(project_id) and private.can_write(office_id) and private.has_feature(office_id, 'procurement'));
create policy poi_select on public.purchase_order_items for select to authenticated
  using (exists (select 1 from public.purchase_orders p where p.id = po_id and private.can_view_project(p.project_id)) and private.has_feature(office_id, 'procurement'));
create policy poi_write on public.purchase_order_items for all to authenticated
  using (exists (select 1 from public.purchase_orders p where p.id = po_id and private.can_view_project(p.project_id)) and private.can_write(office_id) and private.has_feature(office_id, 'procurement'))
  with check (exists (select 1 from public.purchase_orders p where p.id = po_id and private.can_view_project(p.project_id)) and private.can_write(office_id) and private.has_feature(office_id, 'procurement'));

-- finance
create policy budget_select on public.budget_lines for select to authenticated using (private.can_see_finance(office_id) and private.can_view_project(project_id));
create policy budget_write on public.budget_lines for all to authenticated
  using (private.can_see_finance(office_id) and private.can_view_project(project_id) and private.sub_active(office_id))
  with check (private.can_see_finance(office_id) and private.can_view_project(project_id) and private.sub_active(office_id));
create policy expenses_select on public.expenses for select to authenticated using (private.can_see_finance(office_id) and private.can_view_project(project_id));
create policy expenses_write on public.expenses for all to authenticated
  using (private.can_see_finance(office_id) and private.can_view_project(project_id) and private.sub_active(office_id))
  with check (private.can_see_finance(office_id) and private.can_view_project(project_id) and private.sub_active(office_id));
create policy fees_select on public.fee_milestones for select to authenticated using (private.is_manager(office_id) and private.has_feature(office_id, 'fees'));
create policy fees_write on public.fee_milestones for all to authenticated
  using (private.is_manager(office_id) and private.has_feature(office_id, 'fees'))
  with check (private.is_manager(office_id) and private.has_feature(office_id, 'fees'));

-- messages
create policy messages_select on public.messages for select to authenticated
  using ((private.can_view_project(project_id) and private.has_feature(office_id, 'client_portal')) or private.is_project_client(project_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (author_id = auth.uid() and (
    (side = 'studio' and private.can_view_project(project_id) and private.can_write(office_id) and private.has_feature(office_id, 'client_portal'))
    or (side = 'client' and private.is_project_client(project_id) and private.sub_active(office_id))
  ));

-- notifications & preferences
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_delete on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy prefs_all on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy outbox_select on public.email_outbox for select to authenticated using (private.is_manager(office_id));

create policy activity_select on public.activity_log for select to authenticated
  using (private.is_staff(office_id) and (project_id is null or private.can_view_project(project_id)));

-- subscriptions & catalogue
create policy plans_cat_select on public.subscription_plans for select to anon, authenticated using (true);
create policy plans_cat_write on public.subscription_plans for update to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy feat_def_select on public.feature_definitions for select to anon, authenticated using (true);
create policy feat_def_write on public.feature_definitions for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy plan_feat_select on public.plan_features for select to anon, authenticated using (true);
create policy plan_feat_write on public.plan_features for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

create policy sub_select on public.office_subscriptions for select to authenticated using (private.is_staff(office_id) or private.is_super_admin());
create policy sub_admin_update on public.office_subscriptions for update to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy sub_events_select on public.subscription_events for select to authenticated using (private.is_manager(office_id) or private.is_super_admin());
create policy invoices_select on public.invoices for select to authenticated
  using (private.is_owner(office_id) or private.is_super_admin() or (private.is_manager(office_id)
         and coalesce((select s.admin_can_manage_billing from public.office_settings s where s.office_id = invoices.office_id), false)));
create policy pricing_changes_select on public.pricing_changes for select to authenticated using (private.is_super_admin());

-- support
create policy tickets_select on public.support_tickets for select to authenticated using (private.can_view_ticket(id));
create policy tickets_insert on public.support_tickets for insert to authenticated
  with check (created_by = auth.uid() and private.is_staff(office_id) and status = 'open' and assignee_id is null);
create policy tickets_update on public.support_tickets for update to authenticated
  using (private.is_super_admin() or private.is_manager(office_id)) with check (private.is_super_admin() or (private.is_manager(office_id) and status in ('open', 'closed')));
create policy tmsg_select on public.ticket_messages for select to authenticated using (private.can_view_ticket(ticket_id));
create policy tmsg_insert on public.ticket_messages for insert to authenticated
  with check (author_id = auth.uid() and private.can_view_ticket(ticket_id) and (
    (side = 'support' and private.is_super_admin()) or (side = 'user' and private.is_staff(office_id))
  ));

-- platform operations
create policy audit_select on public.audit_log for select to authenticated using (private.is_super_admin() or private.is_manager(office_id));
create policy events_select on public.system_events for select to authenticated using (private.is_super_admin());
create policy ann_select on public.announcements for select to authenticated using (private.is_super_admin() or (status = 'published' and (publish_at is null or publish_at <= now())));
create policy ann_write on public.announcements for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());
create policy retention_select on public.retention_policies for select to authenticated using (private.is_super_admin());
create policy retention_write on public.retention_policies for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

-- ================================================================ 4. column privileges
-- profiles: users may edit their own display fields only
revoke update on public.profiles from authenticated;
grant update (full_name, phone, title, avatar_color) on public.profiles to authenticated;

-- notifications: only the read marker
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- office members: managers change role/status only (guarded by trigger)
revoke update on public.office_members from authenticated;
grant update (role, status) on public.office_members to authenticated;

-- invitations: only revoke
revoke update on public.invitations from authenticated;
grant update (status) on public.invitations to authenticated;

-- outbox payload may contain invitation links
revoke select on public.email_outbox from authenticated;
grant select (id, office_id, to_email, template, subject, related_link, status, created_at, sent_at) on public.email_outbox to authenticated;

-- write-protected tables (RPC / service role only)
revoke insert, update, delete on public.approvals, public.project_status_history, public.activity_log, public.audit_log,
  public.office_members, public.invitations, public.notifications, public.email_outbox, public.subscription_events,
  public.invoices, public.pricing_changes, public.system_events, public.offices, public.office_subscriptions
  from authenticated;
grant update on public.offices to authenticated;                 -- managers edit profile (RLS)
grant update (role, status) on public.office_members to authenticated;
grant delete on public.office_members to authenticated;
grant update (status) on public.invitations to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;
grant update on public.office_subscriptions to authenticated;    -- super admin only (RLS)

-- subscription plan catalogue is edited by super admin only (RLS) – no inserts/deletes from the API
revoke insert, delete on public.subscription_plans from authenticated;
