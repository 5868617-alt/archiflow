-- ArchiFlow – tools made for an architecture / interior design studio:
--   project phases (with the studio fee per phase), building permit and consultants, time tracking and
--   profitability, site supervision (visits + findings with photos), client brief and mood board,
--   studio branding, and the studio's own materials library.
-- Same rules as everything else: RLS on every table, office isolation, clients see only what is shared
-- with them and change only their own answers through server functions.

-- ---------------------------------------------------------------- phases (no money here – fees stay in fee_milestones)
create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  idx int not null check (idx between 0 and 30),
  name text not null check (length(name) between 1 and 80),
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'done')),
  budget_hours numeric(7, 1) check (budget_hours is null or budget_hours >= 0),
  started_on date, done_on date,
  created_at timestamptz not null default now(),
  unique (project_id, idx)
);
alter table public.fee_milestones add column if not exists phase_id uuid references public.project_phases(id) on delete set null;

-- ---------------------------------------------------------------- building permit + consultants
create table public.permits (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  authority text not null default '' check (length(authority) <= 120),
  file_number text not null default '' check (length(file_number) <= 60),
  request_type text not null default '' check (length(request_type) <= 120),
  stage text not null default 'info_file' check (stage in ('info_file', 'preparing', 'submitted', 'review', 'committee', 'conditions', 'granted', 'rejected')),
  info_file_on date, submitted_on date, committee_on date, granted_on date, expires_on date,
  notes text not null default '' check (length(notes) <= 4000),
  created_at timestamptz not null default now()
);
create table public.project_consultants (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  discipline text not null check (length(discipline) between 1 and 80),
  name text not null default '' check (length(name) <= 120),
  phone text not null default '' check (length(phone) <= 40),
  email text not null default '' check (length(email) <= 160),
  status text not null default 'needed' check (status in ('needed', 'engaged', 'delivered')),
  due_on date,
  notes text not null default '' check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- time tracking + cost rates (rates: managers only)
create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  hours numeric(4, 2) not null check (hours > 0 and hours <= 24),
  phase_idx int check (phase_idx is null or phase_idx between 0 and 30),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now()
);
create table public.member_rates (
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hourly_cost numeric(8, 2) not null check (hourly_cost >= 0),
  primary key (office_id, user_id)
);

-- ---------------------------------------------------------------- site supervision
create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  visit_date date not null default current_date,
  attendees text not null default '' check (length(attendees) <= 500),
  summary text not null default '' check (length(summary) <= 6000),
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.site_findings (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  visit_id uuid not null references public.site_visits(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  location text not null default '' check (length(location) <= 120),
  responsible text not null default '' check (length(responsible) <= 120),
  due_on date,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'fixed', 'verified')),
  photo_path text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- client brief + mood board
create table public.client_briefs (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'submitted')),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object' and length(answers::text) <= 20000),
  sent_at timestamptz, submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id)
);
create table public.mood_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'color', 'note')),
  title text not null default '' check (length(title) <= 120),
  note text not null default '' check (length(note) <= 1000),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  image_path text,
  shared boolean not null default false,
  reaction text check (reaction is null or reaction in ('love', 'maybe', 'no')),
  client_comment text not null default '' check (length(client_comment) <= 1000),
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- the studio's materials library
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null check (length(name) between 1 and 160),
  category text not null default '' check (length(category) <= 80),
  supplier_id uuid references public.suppliers(id) on delete set null,
  sku text not null default '' check (length(sku) <= 80),
  unit text not null default '' check (length(unit) <= 30),
  price numeric(12, 2) check (price is null or price >= 0),
  image_path text,
  url text not null default '' check (length(url) <= 500 and (url = '' or url ~ '^https?://')),
  notes text not null default '' check (length(notes) <= 2000),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- branding
alter table public.office_settings add column if not exists brand_color text check (brand_color is null or brand_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.office_settings add column if not exists logo_path text;

-- ---------------------------------------------------------------- integrity
create trigger same_office before insert or update on public.project_phases for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.permits for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.project_consultants for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.time_entries for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.site_visits for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.site_findings for each row execute function private.same_office_check('project_id', 'projects', 'visit_id', 'site_visits');
create trigger same_office before insert or update on public.client_briefs for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.mood_items for each row execute function private.same_office_check('project_id', 'projects');
create trigger same_office before insert or update on public.library_items for each row execute function private.same_office_check('supplier_id', 'suppliers');

-- a fee milestone's phase must belong to the same project; a finding must belong to its visit's project
create or replace function private.phase_project_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.phase_id is not null and not exists (select 1 from public.project_phases ph where ph.id = new.phase_id and ph.project_id = new.project_id) then
    raise exception 'phase belongs to another project' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger phase_project before insert or update of phase_id, project_id on public.fee_milestones for each row execute function private.phase_project_check();
create or replace function private.finding_visit_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.site_visits v where v.id = new.visit_id and v.project_id = new.project_id) then
    raise exception 'finding belongs to another project' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger finding_visit before insert or update on public.site_findings for each row execute function private.finding_visit_check();
-- time entries: only for yourself, unless a manager corrects them
create or replace function private.time_entry_owner_check() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id <> auth.uid() and not private.is_manager(new.office_id) then
    raise exception 'time can only be logged for yourself' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger staff_ref before insert or update on public.time_entries for each row execute function private.staff_ref_check('user_id');
create trigger staff_ref before insert or update on public.member_rates for each row execute function private.staff_ref_check('user_id');
create trigger time_owner before insert or update on public.time_entries for each row execute function private.time_entry_owner_check();
create trigger audit after insert or update or delete on public.member_rates for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.permits for each row execute function private.audit_row();

create index on public.project_phases (office_id); create index on public.fee_milestones (phase_id);
create index on public.permits (project_id); create index on public.permits (office_id);
create index on public.project_consultants (project_id); create index on public.project_consultants (office_id);
create index on public.time_entries (project_id); create index on public.time_entries (office_id); create index on public.time_entries (user_id);
create index on public.member_rates (user_id);
create index on public.site_visits (project_id); create index on public.site_visits (office_id); create index on public.site_visits (created_by);
create index on public.site_findings (visit_id); create index on public.site_findings (project_id); create index on public.site_findings (office_id);
create index on public.client_briefs (office_id);
create index on public.mood_items (project_id); create index on public.mood_items (office_id);
create index on public.library_items (office_id); create index on public.library_items (supplier_id);

-- ---------------------------------------------------------------- RLS
alter table public.project_phases enable row level security;
alter table public.permits enable row level security;
alter table public.project_consultants enable row level security;
alter table public.time_entries enable row level security;
alter table public.member_rates enable row level security;
alter table public.site_visits enable row level security;
alter table public.site_findings enable row level security;
alter table public.client_briefs enable row level security;
alter table public.mood_items enable row level security;
alter table public.library_items enable row level security;

-- phases: staff of the project; clients see the names and progress of their own project
create policy phases_select on public.project_phases for select to authenticated
  using ((select private.can_view_project(project_id)) or (select private.is_project_client(project_id)));
create policy phases_insert on public.project_phases for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy phases_update on public.project_phases for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy phases_delete on public.project_phases for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- permit: staff of the project; the client follows its stage
create policy permits_select on public.permits for select to authenticated
  using ((select private.can_view_project(project_id)) or (select private.is_project_client(project_id)));
create policy permits_insert on public.permits for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy permits_update on public.permits for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy permits_delete on public.permits for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- consultants: staff only
create policy consultants_select on public.project_consultants for select to authenticated using ((select private.can_view_project(project_id)));
create policy consultants_insert on public.project_consultants for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy consultants_update on public.project_consultants for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy consultants_delete on public.project_consultants for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- time: everyone sees their own; managers see the whole office
create policy time_select on public.time_entries for select to authenticated
  using (user_id = (select auth.uid()) and (select private.is_staff(office_id)) or (select private.is_manager(office_id)));
create policy time_insert on public.time_entries for insert to authenticated
  with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy time_update on public.time_entries for update to authenticated
  using ((user_id = (select auth.uid()) or (select private.is_manager(office_id))) and (select private.can_write(office_id)))
  with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy time_delete on public.time_entries for delete to authenticated
  using ((user_id = (select auth.uid()) or (select private.is_manager(office_id))) and (select private.can_write(office_id)));

-- cost rates: owners and office managers only
create policy rates_select on public.member_rates for select to authenticated using ((select private.is_manager(office_id)));
create policy rates_insert on public.member_rates for insert to authenticated with check ((select private.is_manager(office_id)) and (select private.sub_active(office_id)));
create policy rates_update on public.member_rates for update to authenticated using ((select private.is_manager(office_id))) with check ((select private.is_manager(office_id)) and (select private.sub_active(office_id)));
create policy rates_delete on public.member_rates for delete to authenticated using ((select private.is_manager(office_id)));

-- site visits / findings: staff; the client sees reports that were sent
create policy visits_select on public.site_visits for select to authenticated
  using ((select private.can_view_project(project_id)) or (status = 'sent' and (select private.is_project_client(project_id))));
create policy visits_insert on public.site_visits for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy visits_update on public.site_visits for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy visits_delete on public.site_visits for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy findings_select on public.site_findings for select to authenticated
  using ((select private.can_view_project(project_id))
         or ((select private.is_project_client(project_id)) and exists (select 1 from public.site_visits v where v.id = visit_id and v.status = 'sent')));
create policy findings_insert on public.site_findings for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy findings_update on public.site_findings for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy findings_delete on public.site_findings for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- brief: staff write; the client reads it once sent and answers only through submit_client_brief()
create policy briefs_select on public.client_briefs for select to authenticated
  using ((select private.can_view_project(project_id)) or (status in ('sent', 'submitted') and (select private.is_project_client(project_id))));
create policy briefs_insert on public.client_briefs for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy briefs_update on public.client_briefs for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy briefs_delete on public.client_briefs for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- mood board: staff write; the client sees shared items and reacts through react_mood_item()
create policy mood_select on public.mood_items for select to authenticated
  using ((select private.can_view_project(project_id)) or (shared and (select private.is_project_client(project_id))));
create policy mood_insert on public.mood_items for insert to authenticated with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy mood_update on public.mood_items for update to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id))) with check ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));
create policy mood_delete on public.mood_items for delete to authenticated using ((select private.can_view_project(project_id)) and (select private.can_write(office_id)));

-- library: the whole studio team
create policy library_select on public.library_items for select to authenticated using ((select private.is_staff(office_id)));
create policy library_insert on public.library_items for insert to authenticated with check ((select private.can_write(office_id)));
create policy library_update on public.library_items for update to authenticated using ((select private.can_write(office_id))) with check ((select private.can_write(office_id)));
create policy library_delete on public.library_items for delete to authenticated using ((select private.can_write(office_id)));

grant select, insert, update, delete on public.project_phases, public.permits, public.project_consultants, public.time_entries, public.member_rates,
  public.site_visits, public.site_findings, public.client_briefs, public.mood_items, public.library_items to authenticated;
revoke all on public.project_phases, public.permits, public.project_consultants, public.time_entries, public.member_rates,
  public.site_visits, public.site_findings, public.client_briefs, public.mood_items, public.library_items from anon;

-- ---------------------------------------------------------------- client-side actions

-- the client fills in the brief (draft save or final submit); staff are told when it is submitted
create or replace function public.submit_client_brief(p_brief uuid, p_answers jsonb, p_final boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare b record; p record;
begin
  perform private.require_auth();
  select * into b from public.client_briefs where id = p_brief for update;
  if b.id is null or not private.is_project_client(b.project_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if b.status <> 'sent' then raise exception 'the brief is not open for answers' using errcode = '22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or length(p_answers::text) > 20000 then raise exception 'invalid answers' using errcode = '22023'; end if;
  perform set_config('archiflow.rpc', 'on', true);
  update public.client_briefs set answers = p_answers, updated_at = now(),
    status = case when p_final then 'submitted' else status end, submitted_at = case when p_final then now() else submitted_at end
  where id = b.id;
  if p_final then
    select * into p from public.projects where id = b.project_id;
    perform private.notify(b.office_id, p.lead_id, 'approval', 'הלקוח מילא את שאלון הפתיחה', p.name, '/projects/' || p.id || '/brief');
    perform private.log_activity(b.office_id, b.project_id, 'note', jsonb_build_object('text', 'הלקוח שלח את שאלון הפתיחה'), '/projects/' || p.id || '/brief');
  end if;
end $$;

-- the client reacts to a shared mood board item
create or replace function public.react_mood_item(p_item uuid, p_reaction text, p_comment text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  perform private.require_auth();
  select * into m from public.mood_items where id = p_item;
  if m.id is null or not m.shared or not private.is_project_client(m.project_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_reaction is not null and p_reaction not in ('love', 'maybe', 'no') then raise exception 'invalid reaction' using errcode = '22023'; end if;
  if length(coalesce(p_comment, '')) > 1000 then raise exception 'comment too long' using errcode = '22023'; end if;
  update public.mood_items set reaction = p_reaction, client_comment = coalesce(p_comment, '') where id = m.id;
end $$;

-- send a site report to the client contacts of the project (status → sent, e-mail queued)
create or replace function public.send_site_report(p_visit uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v record; p record; c record; n int := 0;
begin
  perform private.require_auth();
  select * into v from public.site_visits where id = p_visit for update;
  if v.id is null or not private.can_view_project(v.project_id) or not private.can_write(v.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into p from public.projects where id = v.project_id;
  update public.site_visits set status = 'sent', sent_at = now() where id = v.id;
  for c in select ct.* from public.client_contacts ct where ct.client_id = p.client_id and ct.email is not null and ct.portal_status = 'active' loop
    perform private.enqueue_email(v.office_id, c.email, 'site_report', 'דו"ח פיקוח: ' || p.name || ' – ' || to_char(v.visit_date, 'DD.MM.YYYY'),
      jsonb_build_object('project', p.name, 'date', v.visit_date), '/portal/site');
    perform private.notify(v.office_id, c.user_id, 'meeting', 'דו"ח פיקוח חדש', p.name, '/portal/site');
    n := n + 1;
  end loop;
  perform private.log_activity(v.office_id, v.project_id, 'note', jsonb_build_object('text', 'נשלח דו"ח פיקוח מ-' || to_char(v.visit_date, 'DD.MM.YYYY')), '/projects/' || p.id || '/site');
  return n;
end $$;

-- open the brief to the client (creates it when missing), notify the client contacts and queue an e-mail
create or replace function public.send_client_brief(p_project uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare p record; c record; bid uuid;
begin
  perform private.require_auth();
  select * into p from public.projects where id = p_project;
  if p.id is null or not private.can_view_project(p.id) or not private.can_write(p.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.client_briefs (office_id, project_id, status, sent_at) values (p.office_id, p.id, 'sent', now())
  on conflict (project_id) do update set status = 'sent', sent_at = now(), updated_at = now()
  returning id into bid;
  for c in select ct.* from public.client_contacts ct where ct.client_id = p.client_id and ct.portal_status = 'active' loop
    if c.email is not null then
      perform private.enqueue_email(p.office_id, c.email, 'client_brief', 'שאלון פתיחה לפרויקט ' || p.name, jsonb_build_object('project', p.name), '/portal/brief');
    end if;
    perform private.notify(p.office_id, c.user_id, 'approval', 'שאלון פתיחה מחכה לך', p.name, '/portal/brief');
  end loop;
  perform private.log_activity(p.office_id, p.id, 'note', jsonb_build_object('text', 'שאלון הפתיחה נשלח ללקוח'), '/projects/' || p.id || '/brief');
  return bid;
end $$;

-- name, color and logo of a studio for its staff and its clients (clients cannot read office_settings)
create or replace function public.office_branding(p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not (private.is_staff(p_office) or private.is_office_client(p_office) or private.is_super_admin()) then return null; end if;
  select jsonb_build_object('name', o.name, 'brand_color', s.brand_color, 'logo_path', s.logo_path) into r
  from public.offices o left join public.office_settings s on s.office_id = o.id where o.id = p_office;
  return r;
end $$;

revoke execute on function public.send_client_brief(uuid), public.submit_client_brief(uuid, jsonb, boolean), public.react_mood_item(uuid, text, text), public.send_site_report(uuid), public.office_branding(uuid) from public, anon;
grant execute on function public.send_client_brief(uuid), public.submit_client_brief(uuid, jsonb, boolean), public.react_mood_item(uuid, text, text), public.send_site_report(uuid), public.office_branding(uuid) to authenticated;
revoke execute on function private.phase_project_check(), private.finding_visit_check(), private.time_entry_owner_check() from public, anon;

-- ---------------------------------------------------------------- storage: site photos, mood board, library and logo
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('site-photos', 'site-photos', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'image/heic']),
  ('moodboard', 'moodboard', false, 15728640, array['image/png', 'image/jpeg', 'image/webp']),
  ('library', 'library', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('branding', 'branding', false, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

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
    when 'site-photos' then exists (
      select 1 from public.site_findings f where f.photo_path = p_name and (private.can_view_project(f.project_id)
        or (private.is_project_client(f.project_id) and exists (select 1 from public.site_visits v where v.id = f.visit_id and v.status = 'sent'))))
    when 'moodboard' then exists (
      select 1 from public.mood_items m where m.image_path = p_name and (private.can_view_project(m.project_id) or (m.shared and private.is_project_client(m.project_id))))
    when 'library' then exists (
      select 1 from public.library_items l where l.image_path = p_name and private.is_staff(l.office_id))
    when 'branding' then exists (
      select 1 from public.office_settings s where s.logo_path = p_name and (private.is_staff(s.office_id) or private.is_office_client(s.office_id)))
    else false
  end
$$;

create or replace function private.storage_can_write(p_bucket text, p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  with parts as (select private.path_office(p_name) as office_id, private.path_project(p_name) as project_id, split_part(p_name, '/', 2) as second)
  select p_bucket in ('plans', 'documents', 'receipts', 'spec-images', 'site-photos', 'moodboard', 'library', 'branding')
     and parts.office_id is not null
     and private.can_write(parts.office_id)
     and (
       (parts.second = 'office' and p_bucket in ('documents', 'library', 'branding'))
       or (parts.project_id is not null and p_bucket not in ('library', 'branding')
           and exists (select 1 from public.projects pr where pr.id = parts.project_id and pr.office_id = parts.office_id)
           and private.can_view_project(parts.project_id))
     )
     and (p_bucket <> 'receipts' or private.can_see_finance(parts.office_id))
     and (p_bucket <> 'branding' or private.is_manager(parts.office_id))
     and position('..' in p_name) = 0
  from parts
$$;

-- the storage policies name their buckets: add the new ones
drop policy if exists archiflow_read on storage.objects;
drop policy if exists archiflow_delete on storage.objects;
create policy archiflow_read on storage.objects for select to authenticated
  using (bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'invoices', 'site-photos', 'moodboard', 'library', 'branding') and private.storage_can_read(bucket_id, name));
create policy archiflow_delete on storage.objects for delete to authenticated
  using (bucket_id in ('plans', 'documents', 'receipts', 'spec-images', 'site-photos', 'moodboard', 'library', 'branding') and private.is_manager(private.path_office(name)));

-- studio branding: owners and office managers (office_settings itself stays owner-only)
create or replace function public.set_office_branding(p_office uuid, p_color text, p_logo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_auth();
  if not private.is_manager(p_office) or not private.sub_active(p_office) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_color is not null and p_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid color' using errcode = '22023'; end if;
  if p_logo is not null and (split_part(p_logo, '/', 1) <> p_office::text or split_part(p_logo, '/', 2) <> 'office' or position('..' in p_logo) > 0) then
    raise exception 'invalid logo path' using errcode = '22023';
  end if;
  update public.office_settings set brand_color = p_color, logo_path = p_logo where office_id = p_office;
end $$;
revoke execute on function public.set_office_branding(uuid, text, text) from public, anon;
grant execute on function public.set_office_branding(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- one-call load includes the new tables and the studio branding
create or replace function public.app_snapshot(p_office uuid default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  out jsonb := '{}';
  t text; q text; rows jsonb;
  office_tables text[] := array[
    'office_settings', 'office_members', 'invitations', 'clients', 'client_contacts', 'projects', 'project_assignments', 'milestones',
    'tasks', 'task_checklist_items', 'task_comments', 'work_templates', 'work_template_items', 'plans', 'plan_versions', 'plan_annotations',
    'suppliers', 'spec_items', 'spec_alternatives', 'spec_versions', 'documents', 'document_versions', 'approvals',
    'meetings', 'meeting_attendees', 'meeting_contacts', 'meeting_suppliers', 'absences', 'purchase_orders', 'purchase_order_items',
    'budget_lines', 'expenses', 'fee_milestones', 'messages', 'office_subscriptions', 'invoices', 'support_tickets', 'ticket_messages',
    'project_phases', 'permits', 'project_consultants', 'time_entries', 'member_rates', 'site_visits', 'site_findings',
    'client_briefs', 'mood_items', 'library_items'];
  global_tables text[] := array['subscription_plans', 'plan_features', 'feature_definitions', 'announcements', 'retention_policies'];
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  foreach t in array office_tables loop
    q := format('select coalesce(jsonb_agg(to_jsonb(r_)), ''[]'') from public.%I r_', t);
    if p_office is not null then q := q || ' where r_.office_id = $1'; end if;
    execute q into rows using p_office;
    out := out || jsonb_build_object(t, rows);
  end loop;
  foreach t in array global_tables loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r_)), ''[]'') from public.%I r_', t) into rows;
    out := out || jsonb_build_object(t, rows);
  end loop;

  out := out || jsonb_build_object(
    'offices', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.offices o where p_office is null or o.id = p_office),
    'profiles', (select coalesce(jsonb_agg(to_jsonb(p)), '[]') from public.profiles p),
    'notifications', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc), '[]')
                      from (select * from public.notifications n where n.user_id = auth.uid() and (p_office is null or n.office_id = p_office or n.office_id is null)
                            order by n.created_at desc limit 200) n),
    'notification_preferences', (select coalesce(jsonb_agg(to_jsonb(np)), '[]') from public.notification_preferences np where np.user_id = auth.uid()),
    'activity_log', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]')
                     from (select * from public.activity_log a where p_office is null or a.office_id = p_office order by a.created_at desc limit 300) a),
    'audit_log', (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]')
                  from (select a.id, a.office_id, a.actor_id, a.actor_is_super_admin, a.action, a.table_name, a.record_id, a.created_at
                        from public.audit_log a where p_office is null or a.office_id = p_office order by a.created_at desc limit 300) a),
    'email_outbox', (select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc), '[]')
                     from (select e.id, e.office_id, e.to_email, e.template, e.subject, e.related_link, e.status, e.created_at, e.sent_at
                           from public.email_outbox e where p_office is null or e.office_id = p_office order by e.created_at desc limit 100) e),
    'subscription_events', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at), '[]')
                            from public.subscription_events s where p_office is null or s.office_id = p_office),
    'pricing_changes', (select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]') from (select * from public.pricing_changes order by created_at desc limit 200) c),
    'system_events', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]') from (select * from public.system_events order by created_at desc limit 200) s),
    'branding', case when p_office is null then null else public.office_branding(p_office) end
  );
  return out;
end $$;
