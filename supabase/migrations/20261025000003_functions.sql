-- ArchiFlow – server-side operations (RPC) and side-effect triggers.
-- Every function is SECURITY DEFINER with an empty search_path and checks permissions explicitly.
-- Functions that write guarded columns switch on the transaction-local flag `archiflow.rpc`.

-- ---------------------------------------------------------------- small internal helpers
create or replace function private.rpc_on() returns void language sql as $$ select set_config('archiflow.rpc', 'on', true) $$;
-- must be called before every return of a function that called rpc_on(), so the flag never outlives the call
create or replace function private.rpc_off() returns void language sql as $$ select set_config('archiflow.rpc', '', true) $$;

create or replace function private.notify(p_office uuid, p_user uuid, p_kind public.notification_kind, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications(office_id, user_id, kind, title, body, link)
  select p_office, p_user, p_kind, p_title, p_body, p_link
  where p_user is not null
    and coalesce((select np.in_app from public.notification_preferences np where np.user_id = p_user and np.kind = p_kind::text), true)
$$;

create or replace function private.enqueue_email(p_office uuid, p_to text, p_template text, p_subject text, p_payload jsonb, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox(office_id, to_email, template, subject, payload, related_link)
  select p_office, p_to, p_template, p_subject, coalesce(p_payload, '{}'), p_link
  where p_to is not null and p_to <> ''
$$;

create or replace function private.log_activity(p_office uuid, p_project uuid, p_action text, p_details jsonb, p_link text)
returns void language sql security definer set search_path = '' as $$
  insert into public.activity_log(office_id, project_id, actor_id, action, details, link)
  values (p_office, p_project, auth.uid(), p_action, coalesce(p_details, '{}'), p_link)
$$;

create or replace function private.require_auth() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  return auth.uid();
end $$;

-- pgcrypto lives in "extensions" on Supabase and in "public" in plain Postgres; resolve once
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'gen_random_bytes' and n.nspname = 'extensions') then
    execute 'create or replace function private.random_hex(n int) returns text language sql volatile as $f$ select encode(extensions.gen_random_bytes(n), ''hex'') $f$';
    execute 'create or replace function private.sha256_hex(t text) returns text language sql immutable as $f$ select encode(extensions.digest(t, ''sha256''), ''hex'') $f$';
  else
    execute 'create or replace function private.random_hex(n int) returns text language sql volatile as $f$ select encode(public.gen_random_bytes(n), ''hex'') $f$';
    execute 'create or replace function private.sha256_hex(t text) returns text language sql immutable as $f$ select encode(public.digest(t, ''sha256''), ''hex'') $f$';
  end if;
end $$;

-- ================================================================ offices & membership
create or replace function public.create_office(p_name text, p_city text default null, p_plan text default 'pro')
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); oid uuid; trial int;
begin
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'office name is required' using errcode = '22023'; end if;
  if not exists (select 1 from public.subscription_plans where id = p_plan and is_active) then raise exception 'unknown plan' using errcode = '22023'; end if;
  if (select count(*) from public.office_members where user_id = uid and role = 'owner') >= 3 then
    raise exception 'too many offices for one owner' using errcode = '54000';
  end if;
  perform private.rpc_on();
  insert into public.offices(name, city, created_by) values (trim(p_name), p_city, uid) returning id into oid;
  insert into public.office_settings(office_id) values (oid);
  select trial_days into trial from public.subscription_plans where id = p_plan;
  insert into public.office_subscriptions(office_id, plan_id, status, trial_ends_at, current_period_end)
  values (oid, p_plan, 'trialing', now() + make_interval(days => trial), now() + make_interval(days => trial));
  insert into public.office_members(office_id, user_id, role) values (oid, uid, 'owner');
  insert into public.subscription_events(office_id, event, details, actor_id) values (oid, 'trial_started', jsonb_build_object('plan', p_plan), uid);
  perform private.rpc_off();
  return oid;
end $$;

create or replace function public.invite_member(p_office uuid, p_email text, p_full_name text, p_role public.invite_role)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); tok text; inv uuid; office_name text;
begin
  if not private.is_manager(p_office) or not private.sub_active(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role = 'client' then raise exception 'use invite_client_contact() for clients' using errcode = '22023'; end if;
  if p_role = 'admin' and not private.is_owner(p_office) then raise exception 'only the owner can invite admins' using errcode = '42501'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid email' using errcode = '22023'; end if;
  if exists (select 1 from public.office_members m join auth.users u on u.id = m.user_id where m.office_id = p_office and lower(u.email) = lower(p_email)) then
    raise exception 'already a member' using errcode = '23505';
  end if;
  tok := private.random_hex(24);
  insert into public.invitations(office_id, email, full_name, role, token_hash, invited_by)
  values (p_office, lower(p_email), p_full_name, p_role, private.sha256_hex(tok), uid) returning id into inv;
  select name into office_name from public.offices where id = p_office;
  perform private.enqueue_email(p_office, lower(p_email), 'team_invite', 'הוזמנת להצטרף ל' || office_name || ' ב-ArchiFlow',
          jsonb_build_object('token', tok, 'office', office_name, 'role', p_role, 'invitation_id', inv), '/accept-invite');
  return inv;
end $$;

create or replace function public.invite_client_contact(p_contact uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); c record; tok text; inv uuid; office_name text;
begin
  select * into c from public.client_contacts where id = p_contact;
  if c.id is null or not private.is_manager(c.office_id) or not private.sub_active(c.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not private.has_feature(c.office_id, 'client_portal') then raise exception 'feature_not_in_plan:client_portal' using errcode = 'P0001'; end if;
  if c.email is null then raise exception 'contact has no email' using errcode = '22023'; end if;
  update public.invitations set status = 'revoked' where client_contact_id = p_contact and status = 'pending';
  tok := private.random_hex(24);
  insert into public.invitations(office_id, email, full_name, role, client_contact_id, token_hash, invited_by)
  values (c.office_id, lower(c.email), c.name, 'client', p_contact, private.sha256_hex(tok), uid) returning id into inv;
  update public.client_contacts set portal_status = 'invited' where id = p_contact;
  select name into office_name from public.offices where id = c.office_id;
  perform private.enqueue_email(c.office_id, c.email, 'portal_invite', 'הוזמנת לפורטל הלקוחות של ' || office_name,
          jsonb_build_object('token', tok, 'office', office_name, 'invitation_id', inv), '/accept-invite');
  return inv;
end $$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); inv record; my_email text;
begin
  select * into inv from public.invitations where token_hash = private.sha256_hex(coalesce(p_token, '')) for update;
  if inv.id is null or inv.status <> 'pending' then raise exception 'invitation not found or already used' using errcode = 'P0002'; end if;
  if inv.expires_at < now() then
    update public.invitations set status = 'expired' where id = inv.id;
    raise exception 'invitation expired' using errcode = 'P0002';
  end if;
  select lower(email) into my_email from auth.users where id = uid;
  if my_email is distinct from lower(inv.email) then raise exception 'invitation was sent to a different email address' using errcode = '42501'; end if;
  perform private.rpc_on();
  if inv.role = 'client' then
    update public.client_contacts set user_id = uid, portal_status = 'active' where id = inv.client_contact_id;
  else
    insert into public.office_members(office_id, user_id, role) values (inv.office_id, uid, inv.role::text::public.office_role)
    on conflict (office_id, user_id) do update set status = 'active';
  end if;
  update public.invitations set status = 'accepted' where id = inv.id;
  perform private.notify(inv.office_id, inv.invited_by, 'system', 'הזמנה התקבלה', coalesce(inv.full_name, inv.email) || ' הצטרף/ה', case when inv.role = 'client' then '/clients' else '/team' end);
  perform private.rpc_off();
  return inv.office_id;
end $$;

-- ================================================================ projects
create or replace function public.set_project_status(p_project uuid, p_status public.project_status, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); p record;
begin
  select * into p from public.projects where id = p_project for update;
  if p.id is null or not private.is_manager(p.office_id) or not private.sub_active(p.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p.status = p_status then return; end if;
  perform private.rpc_on();
  update public.projects set status = p_status, status_note = nullif(trim(coalesce(p_note, '')), ''),
         progress = case when p_status = 'completed' then 100 else progress end
   where id = p_project;
  insert into public.project_status_history(office_id, project_id, from_status, to_status, note, changed_by)
  values (p.office_id, p_project, p.status, p_status, p_note, uid);
  perform private.log_activity(p.office_id, p_project, 'project_status_changed', jsonb_build_object('from', p.status, 'to', p_status, 'note', p_note), '/projects/' || p_project);
  perform private.notify(p.office_id, a.user_id, 'system', 'סטטוס פרויקט עודכן', p.name, '/projects/' || p_project)
     from public.project_assignments a where a.project_id = p_project and a.user_id <> uid;
  perform private.rpc_off();
end $$;

-- ================================================================ approvals
create or replace function public.request_approval(
  p_project uuid, p_kind public.approval_kind, p_ref uuid, p_title text, p_contact uuid,
  p_due date default null, p_amount numeric default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); p record; c record; ap uuid;
begin
  select * into p from public.projects where id = p_project;
  if p.id is null or not private.can_view_project(p_project) or not private.can_write(p.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not private.has_feature(p.office_id, 'client_portal') then raise exception 'feature_not_in_plan:client_portal' using errcode = 'P0001'; end if;
  select * into c from public.client_contacts where id = p_contact and client_id = p.client_id;
  if c.id is null then raise exception 'contact does not belong to this project''s client' using errcode = '22023'; end if;
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'title is required' using errcode = '22023'; end if;
  if p_due is not null and p_due < current_date then raise exception 'due date is in the past' using errcode = '22023'; end if;

  perform private.rpc_on();
  if p_kind = 'spec' and p_ref is not null then
    update public.spec_items set status = 'pending_client', shared_with_client = true where id = p_ref and project_id = p_project;
    if not found then raise exception 'spec item not in project' using errcode = '22023'; end if;
  elsif p_kind = 'plan' and p_ref is not null then
    update public.plans set shared_with_client = true where id = p_ref and project_id = p_project;
    if not found then raise exception 'plan not in project' using errcode = '22023'; end if;
    update public.plan_versions set status = 'sent_to_client'
     where plan_id = p_ref and version = (select max(version) from public.plan_versions where plan_id = p_ref);
  elsif p_kind in ('document', 'quote') and p_ref is not null then
    update public.documents set shared_with_client = true where id = p_ref and project_id = p_project;
    if not found then raise exception 'document not in project' using errcode = '22023'; end if;
  end if;

  insert into public.approvals(office_id, project_id, kind, ref_id, title, amount, requested_by, due_at, contact_id)
  values (p.office_id, p_project, p_kind, p_ref, trim(p_title), p_amount, uid, p_due, p_contact) returning id into ap;
  perform private.notify(p.office_id, c.user_id, 'approval', 'פריט חדש ממתין לאישורך', p_title, '/portal/approvals');
  perform private.enqueue_email(p.office_id, c.email, 'approval_request', 'ממתין לאישורך: ' || p_title,
          jsonb_build_object('project', p.name, 'title', p_title, 'approval_id', ap, 'portal_active', c.portal_status = 'active'), '/portal/approvals');
  perform private.log_activity(p.office_id, p_project, 'approval_requested', jsonb_build_object('title', p_title, 'kind', p_kind), '/approvals');
  perform private.rpc_off();
  return ap;
end $$;

create or replace function public.decide_approval(p_approval uuid, p_decision public.approval_status, p_comment text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); a record; c record; p record;
begin
  if p_decision not in ('approved', 'rejected', 'change_requested') then raise exception 'invalid decision' using errcode = '22023'; end if;
  select * into a from public.approvals where id = p_approval for update;
  if a.id is null then raise exception 'not found' using errcode = 'P0002'; end if;
  select * into c from public.client_contacts where id = a.contact_id;
  -- only the client contact the approval was addressed to, with an active portal
  if c.user_id is distinct from uid or c.portal_status <> 'active' or not private.is_project_client(a.project_id) then
    raise exception 'only the addressed client can decide' using errcode = '42501';
  end if;
  if a.status <> 'pending' then raise exception 'already decided' using errcode = '22023'; end if;
  if p_decision <> 'approved' and length(trim(coalesce(p_comment, ''))) = 0 then raise exception 'a comment is required' using errcode = '22023'; end if;
  if length(coalesce(p_comment, '')) > 2000 then raise exception 'comment too long' using errcode = '22001'; end if;

  perform private.rpc_on();
  update public.approvals set status = p_decision, decided_by = uid, decided_at = now(), client_comment = nullif(trim(coalesce(p_comment, '')), '') where id = a.id;
  if a.kind = 'spec' and a.ref_id is not null then
    update public.spec_items set status = case p_decision when 'approved' then 'approved' when 'rejected' then 'rejected' else 'change_requested' end::public.spec_status
     where id = a.ref_id;
  elsif a.kind = 'plan' and a.ref_id is not null then
    update public.plan_versions set status = case when p_decision = 'approved' then 'approved' else 'changes_required' end::public.plan_status
     where plan_id = a.ref_id and version = (select max(version) from public.plan_versions where plan_id = a.ref_id);
  end if;
  select * into p from public.projects where id = a.project_id;
  perform private.notify(a.office_id, a.requested_by, 'approval', c.name || ': ' || p_decision::text, a.title || coalesce(' – "' || p_comment || '"', ''), '/approvals');
  if p.lead_id is distinct from a.requested_by then
    perform private.notify(a.office_id, p.lead_id, 'approval', 'החלטת לקוח: ' || p_decision::text, a.title, '/approvals');
  end if;
  perform private.log_activity(a.office_id, a.project_id, 'approval_decided', jsonb_build_object('title', a.title, 'decision', p_decision, 'comment', p_comment), '/approvals');
  perform private.rpc_off();
end $$;

create or replace function public.cancel_approval(p_approval uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  perform private.require_auth();
  select * into a from public.approvals where id = p_approval for update;
  if a.id is null or not private.can_view_project(a.project_id) or not private.can_write(a.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'only pending approvals can be cancelled' using errcode = '22023'; end if;
  update public.approvals set status = 'cancelled' where id = a.id;
end $$;

-- client portal budget summary (only if the office chose to share it)
create or replace function public.client_budget_summary(p_project uuid)
returns table (planned numeric, actual numeric) language plpgsql stable security definer set search_path = '' as $$
declare p record;
begin
  select * into p from public.projects where id = p_project;
  if p.id is null then return; end if;
  if not (private.can_see_finance(p.office_id) and private.can_view_project(p_project))
     and not (private.is_project_client(p_project) and coalesce((select s.client_sees_budget_summary from public.office_settings s where s.office_id = p.office_id), false)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query select
    coalesce((select sum(b.planned) from public.budget_lines b where b.project_id = p_project), p.exec_budget),
    coalesce((select sum(e.amount) from public.expenses e where e.project_id = p_project), 0);
end $$;

-- ================================================================ tasks
create or replace function public.apply_template(p_template uuid, p_project uuid, p_assignee uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare t record; n int;
begin
  perform private.require_auth();
  select * into t from public.work_templates where id = p_template;
  if t.id is null or not private.can_view_project(p_project) or not private.can_write(t.office_id)
     or (select office_id from public.projects where id = p_project) <> t.office_id then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.tasks(office_id, project_id, title, description, priority, assignee_id, due_date, source_kind, source_id)
  select t.office_id, p_project, i.title, 'נוצר מתבנית "' || t.name || '"', i.priority, p_assignee, current_date + i.offset_days, 'template', t.id
    from public.work_template_items i where i.template_id = p_template order by i.position;
  get diagnostics n = row_count;
  update public.work_templates set used_count = used_count + 1 where id = p_template;
  perform private.log_activity(t.office_id, p_project, 'template_applied', jsonb_build_object('template', t.name, 'tasks', n), '/tasks');
  return n;
end $$;

create or replace function public.annotation_to_task(p_annotation uuid, p_assignee uuid, p_due date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a record; pl record; tid uuid;
begin
  perform private.require_auth();
  select * into a from public.plan_annotations where id = p_annotation;
  if a.id is null or not private.can_view_plan(a.plan_id) or not private.can_write(a.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into pl from public.plans where id = a.plan_id;
  insert into public.tasks(office_id, project_id, title, description, priority, assignee_id, due_date, source_kind, source_id, tags)
  values (a.office_id, pl.project_id, left(pl.number || ': ' || a.body, 120), a.body,
          case when a.severity = 'high' then 'high' else 'medium' end::public.priority, p_assignee, coalesce(p_due, current_date + 3), 'plan', pl.id, array['ממצא שרטוט'])
  returning id into tid;
  update public.plan_annotations set task_id = tid where id = p_annotation;
  perform private.notify(a.office_id, p_assignee, 'task', 'משימה חדשה מממצא בשרטוט', pl.number || ': ' || left(a.body, 80), '/tasks');
  return tid;
end $$;

-- ================================================================ subscriptions (no money moves here)
-- Plan changes are *requested* here; the billing provider webhook (service role) applies them.
create or replace function private.can_manage_billing(p_office uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_owner(p_office) or (private.is_manager(p_office)
    and coalesce((select s.admin_can_manage_billing from public.office_settings s where s.office_id = p_office), false))
$$;

create or replace function public.request_plan_change(p_office uuid, p_plan text, p_cycle public.billing_cycle)
returns text language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); s record;
begin
  if not private.can_manage_billing(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.subscription_plans where id = p_plan and is_active) then raise exception 'unknown plan' using errcode = '22023'; end if;
  select * into s from public.office_subscriptions where office_id = p_office for update;
  update public.office_subscriptions set pending_plan_id = case when p_plan = s.plan_id then null else p_plan end where office_id = p_office;
  insert into public.subscription_events(office_id, event, details, actor_id)
  values (p_office, 'plan_change_requested', jsonb_build_object('from', s.plan_id, 'to', p_plan, 'cycle', p_cycle), uid);
  return 'checkout_required';   -- the app sends the user to the provider's hosted checkout / portal
end $$;

create or replace function public.request_cancellation(p_office uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth();
begin
  if not private.can_manage_billing(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'a reason is required' using errcode = '22023'; end if;
  update public.office_subscriptions set status = 'cancel_at_period_end', cancel_at = current_period_end
   where office_id = p_office and status in ('trialing', 'active', 'past_due');
  if not found then raise exception 'subscription cannot be cancelled in its current state' using errcode = '22023'; end if;
  insert into public.subscription_events(office_id, event, details, actor_id) values (p_office, 'cancellation_requested', jsonb_build_object('reason', p_reason), uid);
end $$;

create or replace function public.resume_subscription(p_office uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth();
begin
  if not private.can_manage_billing(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.office_subscriptions set status = 'active', cancel_at = null where office_id = p_office and status = 'cancel_at_period_end';
  if not found then raise exception 'nothing to resume' using errcode = '22023'; end if;
  insert into public.subscription_events(office_id, event, actor_id) values (p_office, 'cancellation_reverted', uid);
end $$;

-- support tool for the platform owner (logged by the audit trigger)
create or replace function public.admin_set_subscription_status(p_office uuid, p_status public.sub_status, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth();
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'a note is required for manual changes' using errcode = '22023'; end if;
  update public.office_subscriptions set status = p_status where office_id = p_office;
  insert into public.subscription_events(office_id, event, details, actor_id) values (p_office, 'manual_status_change', jsonb_build_object('status', p_status, 'note', p_note), uid);
end $$;

-- ================================================================ side-effect triggers
create or replace function private.on_message_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; author text;
begin
  select * into p from public.projects where id = new.project_id;
  select coalesce(nullif(full_name, ''), 'משתמש') into author from public.profiles where id = new.author_id;
  if new.side = 'client' then
    perform private.notify(p.office_id, p.lead_id, 'comment', author || ' כתב/ה בפורטל', left(new.body, 120), '/projects/' || p.id || '/messages');
  else
    perform private.notify(p.office_id, c.user_id, 'comment', 'הודעה חדשה מהמשרד', left(new.body, 120), '/portal/messages')
      from public.client_contacts c where c.client_id = p.client_id and c.portal_status = 'active';
  end if;
  return new;
end $$;
create trigger notify_on_message after insert on public.messages for each row execute function private.on_message_insert();

create or replace function private.on_expense_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare planned numeric; actual numeric; p record;
begin
  select b.planned into planned from public.budget_lines b where b.project_id = new.project_id and b.category = new.category;
  if planned is null then return new; end if;
  select sum(e.amount) into actual from public.expenses e where e.project_id = new.project_id and e.category = new.category;
  if actual > planned then
    select * into p from public.projects where id = new.project_id;
    if not exists (select 1 from public.notifications n where n.user_id = p.lead_id and n.kind = 'budget'
                   and n.title = 'חריגה בסעיף ' || new.category and n.created_at > now() - interval '1 day') then
      perform private.notify(p.office_id, p.lead_id, 'budget', 'חריגה בסעיף ' || new.category,
              p.name || ': ' || round(actual / planned * 100) || '% מהסעיף', '/projects/' || p.id || '/budget');
    end if;
  end if;
  return new;
end $$;
create trigger budget_alert after insert or update of amount, category on public.expenses for each row execute function private.on_expense_change();

-- assignee notification
create or replace function private.on_task_assigned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.assignee_id is not null and new.assignee_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform private.notify(new.office_id, new.assignee_id, 'task', 'משימה חדשה שויכה אליך', new.title, '/tasks?open=' || new.id);
  end if;
  return new;
end $$;
create trigger notify_assignee after insert or update of assignee_id on public.tasks for each row execute function private.on_task_assigned();

-- ================================================================ reporting view (respects RLS of the caller)
create or replace view public.project_finance with (security_invoker = true) as
select p.id as project_id, p.office_id, p.name,
  coalesce((select sum(b.planned) from public.budget_lines b where b.project_id = p.id), p.exec_budget) as planned,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id), 0) as actual,
  coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id and e.status = 'paid'), 0) as paid,
  coalesce((select sum(i.qty * i.unit_price) from public.purchase_orders o join public.purchase_order_items i on i.po_id = o.id
            where o.project_id = p.id and o.status not in ('draft', 'cancelled')), 0)
    - coalesce((select sum(e.amount) from public.expenses e where e.project_id = p.id and e.po_id is not null), 0) as committed,
  p.fee_total,
  coalesce((select sum(f.amount) from public.fee_milestones f where f.project_id = p.id and f.status = 'paid'), 0) as fee_paid
from public.projects p
where private.can_see_finance(p.office_id);

-- ================================================================ execution rights
revoke execute on function public.create_office, public.invite_member, public.invite_client_contact, public.accept_invitation,
  public.set_project_status, public.request_approval, public.decide_approval, public.cancel_approval, public.client_budget_summary,
  public.apply_template, public.annotation_to_task, public.request_plan_change, public.request_cancellation, public.resume_subscription,
  public.admin_set_subscription_status from public, anon;
grant execute on function public.create_office, public.invite_member, public.invite_client_contact, public.accept_invitation,
  public.set_project_status, public.request_approval, public.decide_approval, public.cancel_approval, public.client_budget_summary,
  public.apply_template, public.annotation_to_task, public.request_plan_change, public.request_cancellation, public.resume_subscription,
  public.admin_set_subscription_status to authenticated;
revoke all on public.project_finance from anon;
grant select on public.project_finance to authenticated;
