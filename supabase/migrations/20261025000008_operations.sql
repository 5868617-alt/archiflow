-- ArchiFlow – operations: first Super Admin, scheduled jobs, platform overview for the Super Admin console.
set local search_path = public, extensions;

-- ================================================================ 1. first Super Admin (one-time bootstrap)
-- The listed address becomes Super Admin the moment it signs up AND confirms its email.
-- The row is consumed on use, so the grant happens once. Add more addresses here only via SQL.
create table if not exists private.bootstrap_super_admins (email extensions.citext primary key, added_at timestamptz default now());
revoke all on private.bootstrap_super_admins from public, anon, authenticated;
insert into private.bootstrap_super_admins(email) values ('shirameren2434@gmail.com') on conflict do nothing;

create or replace function private.apply_bootstrap_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null
     and exists (select 1 from private.bootstrap_super_admins b where b.email = new.email::extensions.citext) then
    update public.profiles set is_super_admin = true where id = new.id;
    delete from private.bootstrap_super_admins where email = new.email::extensions.citext;
  end if;
  return new;
end $$;
drop trigger if exists zz_bootstrap_super_admin on auth.users;
create trigger zz_bootstrap_super_admin after insert or update of email_confirmed_at on auth.users
  for each row execute function private.apply_bootstrap_admin();
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant execute on function private.apply_bootstrap_admin() to supabase_auth_admin';
  end if;
end $$;

-- ================================================================ 2. scheduled jobs (called by pg_cron, see 009)
-- trials that ended and cancellations that reached the period end
create or replace function private.job_subscription_lifecycle() returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record;
begin
  for r in select office_id, status from public.office_subscriptions
           where (status = 'trialing' and trial_ends_at < now())
              or (status = 'cancel_at_period_end' and coalesce(cancel_at, current_period_end) < now())
  loop
    update public.office_subscriptions set status = case when r.status = 'trialing' then 'expired' else 'cancelled' end::public.sub_status
     where office_id = r.office_id;
    insert into public.subscription_events(office_id, event, details) values
      (r.office_id, case when r.status = 'trialing' then 'trial_expired' else 'cancelled_at_period_end' end, '{}');
    perform private.notify(r.office_id, m.user_id, 'system',
      case when r.status = 'trialing' then 'תקופת הניסיון הסתיימה' else 'המנוי הסתיים' end,
      'המשרד עבר למצב קריאה בלבד. אפשר לחדש מנוי בעמוד המנוי.', '/billing')
      from public.office_members m where m.office_id = r.office_id and m.role = 'owner';
    n := n + 1;
  end loop;
  -- downgrades requested earlier take effect once the paid period is over
  for r in select office_id, plan_id, pending_plan_id from public.office_subscriptions
           where pending_plan_id is not null and current_period_end < now() and status in ('active', 'past_due')
  loop
    update public.office_subscriptions set plan_id = r.pending_plan_id, pending_plan_id = null where office_id = r.office_id;
    insert into public.subscription_events(office_id, event, details) values
      (r.office_id, 'downgrade_applied', jsonb_build_object('from', r.plan_id, 'to', r.pending_plan_id));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function private.job_expire_invitations() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.invitations set status = 'expired' where status = 'pending' and expires_at < now();
  get diagnostics n = row_count;
  -- invite tokens of expired/accepted invitations are useless; make sure none linger in the outbox
  update public.email_outbox set payload = payload - 'token'
   where payload ? 'token' and (status <> 'queued' or created_at < now() - interval '15 days');
  return n;
end $$;

create or replace function private.job_overdue_fees() returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; f record;
begin
  for f in update public.fee_milestones set status = 'overdue'
           where status = 'requested' and due_date < current_date returning *
  loop
    perform private.notify(f.office_id, m.user_id, 'budget', 'דרישת שכר טרחה באיחור', f.title, '/projects/' || f.project_id || '/fees')
      from public.office_members m where m.office_id = f.office_id and m.role in ('owner', 'admin') and m.status = 'active';
    n := n + 1;
  end loop;
  return n;
end $$;

-- one reminder per pending approval per day, from the day before the due date
create or replace function private.job_approval_reminders() returns int
language plpgsql security definer set search_path = '' as $$
declare n int := 0; a record;
begin
  for a in
    select ap.*, c.user_id as contact_user, c.email as contact_email, c.portal_status, p.name as project_name
    from public.approvals ap
    join public.client_contacts c on c.id = ap.contact_id
    join public.projects p on p.id = ap.project_id
    where ap.status = 'pending' and ap.due_at is not null and ap.due_at <= current_date + 1
      and private.sub_active(ap.office_id)
      and not exists (select 1 from public.email_outbox o where o.template = 'approval_reminder'
                      and o.payload ->> 'approval_id' = ap.id::text and o.created_at > now() - interval '20 hours')
  loop
    perform private.notify(a.office_id, a.contact_user, 'approval',
      case when a.due_at < current_date then 'אישור ממתין באיחור' else 'תזכורת: ממתין לאישורך' end, a.title, '/portal/approvals');
    perform private.enqueue_email(a.office_id, a.contact_email, 'approval_reminder', 'תזכורת: ממתין לאישורך – ' || a.title,
      jsonb_build_object('project', a.project_name, 'title', a.title, 'approval_id', a.id), '/portal/approvals');
    perform private.notify(a.office_id, a.requested_by, 'approval', 'הלקוח עדיין לא החליט', a.title, '/approvals')
      where a.due_at < current_date;
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function private.run_hourly_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return jsonb_build_object('subscriptions', private.job_subscription_lifecycle(), 'invitations', private.job_expire_invitations());
end $$;
create or replace function private.run_daily_jobs() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return jsonb_build_object('fees', private.job_overdue_fees(), 'approval_reminders', private.job_approval_reminders());
end $$;
revoke execute on function private.job_subscription_lifecycle, private.job_expire_invitations, private.job_overdue_fees,
  private.job_approval_reminders, private.run_hourly_jobs, private.run_daily_jobs from public, anon, authenticated;

-- ================================================================ 3. Super Admin console: offices overview (metadata only)
create or replace function public.admin_offices_overview()
returns table (id uuid, name text, city text, owner_name text, owner_email text, plan_id text, status public.sub_status,
               users bigint, projects bigint, storage_bytes bigint, created_at timestamptz, last_activity timestamptz, mrr numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select o.id, o.name, o.city, ow.full_name, ow.email::text, s.plan_id, s.status,
    (select count(*) from public.office_members m where m.office_id = o.id and m.status = 'active'),
    (select count(*) from public.projects p where p.office_id = o.id and p.status <> 'completed'),
    coalesce((select sum((so.metadata ->> 'size')::bigint) from storage.objects so where split_part(so.name, '/', 1) = o.id::text), 0)::bigint,
    o.created_at,
    (select max(a.created_at) from public.activity_log a where a.office_id = o.id),
    case when s.status in ('active', 'past_due', 'cancel_at_period_end')
         then case when s.billing_cycle = 'yearly' then coalesce(sp.price_yearly_per_month, sp.price_monthly) else sp.price_monthly end
         else 0 end
  from public.offices o
  left join public.office_subscriptions s on s.office_id = o.id
  left join public.subscription_plans sp on sp.id = s.plan_id
  left join lateral (select pr.full_name, pr.email from public.office_members m join public.profiles pr on pr.id = m.user_id
                     where m.office_id = o.id and m.role = 'owner' limit 1) ow on true
  order by o.created_at desc;
end $$;
revoke execute on function public.admin_offices_overview() from public, anon;
grant execute on function public.admin_offices_overview() to authenticated;

-- ================================================================ 4. the signed-in user's context in one call (used by the app shell)
create or replace function public.my_context()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'is_super_admin', private.is_super_admin(),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('office_id', m.office_id, 'role', m.role, 'office_name', o.name))
                             from public.office_members m join public.offices o on o.id = m.office_id
                             where m.user_id = auth.uid() and m.status = 'active'), '[]'),
    'client_contacts', coalesce((select jsonb_agg(jsonb_build_object('contact_id', c.id, 'client_id', c.client_id, 'office_id', c.office_id, 'office_name', o.name))
                                 from public.client_contacts c join public.offices o on o.id = c.office_id
                                 where c.user_id = auth.uid() and c.portal_status = 'active'), '[]'))
  where auth.uid() is not null
$$;
revoke execute on function public.my_context() from public, anon;
grant execute on function public.my_context() to authenticated;

-- pin search_path on anything new (same rule as 006)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('private', 'public') and p.prokind = 'f'
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
             and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
  loop execute format('alter function %s set search_path = %L', f.sig, 'pg_catalog, public'); end loop;
end $$;
