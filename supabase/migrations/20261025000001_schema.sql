-- ArchiFlow – core schema
-- Conventions:
--   * every business table carries office_id (tenant key, enforced by RLS in the next migration)
--   * enum values are English codes; the UI maps them to Hebrew labels
--   * money is numeric(14,2), amounts are before VAT unless the column says otherwise

-- On Supabase extensions live in the "extensions" schema (keeps "public" clean; security advisor 0014)
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
set local search_path = public, extensions;

-- ---------------------------------------------------------------- enums
create type public.office_role as enum ('owner', 'admin', 'member');
create type public.member_status as enum ('active', 'disabled');
create type public.invite_role as enum ('admin', 'member', 'client');
create type public.invite_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.client_type as enum ('private', 'business');
create type public.portal_status as enum ('none', 'invited', 'active', 'suspended');
create type public.project_status as enum (
  'lead',                -- ליד חדש
  'initial_design',      -- תכנון ראשוני
  'design_development',  -- תכנון בפיתוח
  'pending_approval',    -- ממתין לאישור
  'design_approved',     -- תכנון מאושר
  'execution',           -- ביצוע
  'pre_handover',        -- לקראת מסירה
  'completed',           -- הושלם
  'on_hold'              -- בהשהיה
);
create type public.fee_type as enum ('fixed', 'percent_of_execution', 'hourly');
create type public.task_status as enum ('todo', 'in_progress', 'waiting', 'done');
create type public.priority as enum ('low', 'medium', 'high', 'urgent');
create type public.plan_status as enum ('draft', 'internal_review', 'sent_to_client', 'approved', 'changes_required', 'superseded');
create type public.processing_status as enum ('ready', 'processing', 'failed', 'unsupported');
create type public.file_kind as enum ('PDF', 'DWG', 'DXF', 'JPG', 'PNG', 'DOCX', 'XLSX', 'ZIP');
create type public.annotation_kind as enum ('comment', 'issue', 'measure');
create type public.severity as enum ('low', 'medium', 'high');
create type public.open_status as enum ('open', 'resolved');
create type public.spec_status as enum ('draft', 'pending_client', 'approved', 'change_requested', 'rejected');
create type public.approval_kind as enum ('spec', 'plan', 'document', 'quote', 'budget_change');
create type public.approval_status as enum ('pending', 'approved', 'rejected', 'change_requested', 'cancelled');
create type public.doc_access as enum ('project_team', 'office', 'owners_admins');
create type public.meeting_kind as enum ('client', 'site', 'team', 'supplier');
create type public.meeting_status as enum ('scheduled', 'held', 'cancelled');
create type public.absence_kind as enum ('vacation', 'sick', 'reserve_duty', 'training');
create type public.supplier_kind as enum ('supplier', 'contractor', 'tradesperson');
create type public.po_status as enum ('draft', 'sent', 'confirmed', 'in_production', 'partially_delivered', 'delivered', 'cancelled');
create type public.payer as enum ('client_direct', 'via_office');
create type public.expense_status as enum ('paid', 'pending_payment');
create type public.fee_status as enum ('paid', 'requested', 'future', 'overdue');
create type public.message_side as enum ('studio', 'client');
create type public.notification_kind as enum ('approval', 'task', 'meeting', 'budget', 'comment', 'system', 'plan');
create type public.email_status as enum ('queued', 'sent', 'failed', 'cancelled');
create type public.sub_status as enum ('trialing', 'active', 'past_due', 'cancel_at_period_end', 'cancelled', 'expired');
create type public.billing_cycle as enum ('monthly', 'yearly');
create type public.invoice_status as enum ('paid', 'open', 'failed', 'refunded');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'critical');
create type public.ticket_status as enum ('open', 'in_progress', 'waiting_user', 'closed');
create type public.ticket_side as enum ('user', 'support');
create type public.announcement_status as enum ('draft', 'scheduled', 'published');
create type public.event_level as enum ('info', 'warn', 'error');

-- ---------------------------------------------------------------- platform & identity
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email citext,
  phone text,
  title text,
  avatar_color text default '#2B3E68',
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  legal_name text,
  vat_id text check (vat_id is null or vat_id ~ '^[0-9]{9}$'),
  city text,
  address text,
  phone text,
  email citext,
  logo_text text check (logo_text is null or length(logo_text) <= 3),
  specialties text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Configurable permission assumptions (see "החלטות פתוחות")
create table public.office_settings (
  office_id uuid primary key references public.offices(id) on delete cascade,
  member_can_see_finance boolean not null default false,
  member_sees_all_projects boolean not null default false,
  admin_can_manage_billing boolean not null default false,
  client_sees_budget_summary boolean not null default false,
  budget_warn_pct int not null default 90 check (budget_warn_pct between 50 and 100),
  updated_at timestamptz not null default now()
);

create table public.office_members (
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.office_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  primary key (office_id, user_id)
);
create unique index office_one_owner on public.office_members(office_id) where role = 'owner';
create index office_members_user on public.office_members(user_id);

-- ---------------------------------------------------------------- clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type public.client_type not null default 'private',
  city text, address text, source text, notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.clients(office_id);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role_title text,
  phone text,
  email citext,
  portal_status public.portal_status not null default 'none',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);
create index on public.client_contacts(office_id);
create index on public.client_contacts(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  email citext not null,
  full_name text,
  role public.invite_role not null,
  client_contact_id uuid references public.client_contacts(id) on delete cascade,
  token_hash text not null unique,
  invited_by uuid references auth.users(id),
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  check ((role = 'client') = (client_contact_id is not null))
);
create unique index invitations_one_pending on public.invitations(office_id, email) where status = 'pending';

-- ---------------------------------------------------------------- projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  code text not null,
  name text not null check (length(trim(name)) > 0),
  type text,
  address text, city text,
  area_sqm numeric(10,2) check (area_sqm is null or area_sqm >= 0),
  status public.project_status not null default 'lead',
  status_note text,
  lead_id uuid references auth.users(id),
  start_date date,
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  phase int not null default 0 check (phase between 0 and 6),
  exec_budget numeric(14,2) not null default 0 check (exec_budget >= 0),
  fee_total numeric(14,2) not null default 0 check (fee_total >= 0),
  fee_type public.fee_type not null default 'fixed',
  description text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, code),
  check (due_date is null or start_date is null or due_date >= start_date)
);
create index on public.projects(office_id, status);
create index on public.projects(client_id);

create table public.project_status_history (
  id bigint generated always as identity primary key,
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  from_status public.project_status,
  to_status public.project_status not null,
  note text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create table public.project_assignments (
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_in_project text,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on public.project_assignments(user_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_date date not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.milestones(project_id);

-- ---------------------------------------------------------------- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  description text,
  status public.task_status not null default 'todo',
  priority public.priority not null default 'medium',
  assignee_id uuid references auth.users(id),
  due_date date,
  created_by uuid references auth.users(id) default auth.uid(),
  source_kind text check (source_kind in ('plan', 'meeting', 'approval', 'template')),
  source_id uuid,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks(office_id, assignee_id, status);
create index on public.tasks(project_id);

create table public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  body text not null,
  done boolean not null default false,
  position int not null default 0
);
create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references auth.users(id) default auth.uid(),
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table public.work_templates (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null, description text, category text,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);
create table public.work_template_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  template_id uuid not null references public.work_templates(id) on delete cascade,
  title text not null,
  offset_days int not null default 0,
  role_label text,
  priority public.priority not null default 'medium',
  position int not null default 0
);

-- ---------------------------------------------------------------- plans & drawings
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  number text not null,
  title text not null,
  category text,
  scale text,
  shared_with_client boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  version int not null check (version > 0),
  file_path text,                       -- storage path in bucket "plans"
  file_type public.file_kind not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  note text,
  status public.plan_status not null default 'draft',
  processing public.processing_status not null default 'processing',
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);
create table public.plan_annotations (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete cascade,
  plan_version_id uuid not null references public.plan_versions(id) on delete cascade,
  kind public.annotation_kind not null,
  x numeric(6,5) not null check (x between 0 and 1),
  y numeric(6,5) not null check (y between 0 and 1),
  x2 numeric(6,5) check (x2 between 0 and 1),
  y2 numeric(6,5) check (y2 between 0 and 1),
  body text not null,
  severity public.severity,
  status public.open_status not null default 'open',
  author_id uuid references auth.users(id) default auth.uid(),
  task_id uuid references public.tasks(id) on delete set null,
  is_simulated boolean not null default false,   -- automated findings: never an engineering certification
  created_at timestamptz not null default now()
);
create index on public.plan_annotations(plan_id);

-- ---------------------------------------------------------------- suppliers (needed by specs)
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null,
  kind public.supplier_kind not null default 'supplier',
  category text, contact_name text, phone text, email citext, city text,
  rating numeric(2,1) check (rating is null or rating between 1 and 5),
  payment_terms text, notes text,
  created_at timestamptz not null default now()
);
create index on public.suppliers(office_id);

-- ---------------------------------------------------------------- specifications
create table public.spec_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  room text not null,
  category text,
  name text not null,
  supplier_id uuid references public.suppliers(id),
  sku text,
  qty numeric(12,2) not null check (qty > 0),
  unit text not null default 'יח׳',
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  notes text,
  status public.spec_status not null default 'draft',
  shared_with_client boolean not null default false,
  lead_time_weeks int check (lead_time_weeks is null or lead_time_weeks >= 0),
  image_path text,
  swatch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.spec_items(project_id);
create table public.spec_alternatives (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  spec_item_id uuid not null references public.spec_items(id) on delete cascade,
  name text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  supplier_id uuid references public.suppliers(id),
  note text
);
create table public.spec_versions (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  version int not null,
  summary text not null,
  total numeric(14,2) not null default 0,
  snapshot jsonb,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

-- ---------------------------------------------------------------- documents
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  folder text not null,
  name text not null,
  file_type public.file_kind not null,
  shared_with_client boolean not null default false,
  access public.doc_access not null default 'project_team',
  description text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not (shared_with_client and project_id is null))
);
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  file_path text,
  size_bytes bigint,
  note text,
  uploaded_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

-- ---------------------------------------------------------------- approvals
create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  kind public.approval_kind not null,
  ref_id uuid,                       -- spec_items / plans / documents id (by kind)
  title text not null,
  amount numeric(14,2),
  requested_by uuid references auth.users(id) default auth.uid(),
  requested_at timestamptz not null default now(),
  due_at date,
  status public.approval_status not null default 'pending',
  contact_id uuid not null references public.client_contacts(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  client_comment text
);
create index on public.approvals(project_id, status);

-- ---------------------------------------------------------------- meetings & absences
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  kind public.meeting_kind not null default 'client',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  agenda text[] not null default '{}',
  summary text,
  shared_with_client boolean not null default false,
  status public.meeting_status not null default 'scheduled',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.meetings(office_id, starts_at);
create table public.meeting_attendees (
  office_id uuid not null references public.offices(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (meeting_id, user_id)
);
create table public.meeting_contacts (
  office_id uuid not null references public.offices(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  contact_id uuid not null references public.client_contacts(id) on delete cascade,
  primary key (meeting_id, contact_id)
);
create table public.meeting_suppliers (
  office_id uuid not null references public.offices(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  primary key (meeting_id, supplier_id)
);
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  kind public.absence_kind not null,
  note text,
  check (to_date >= from_date)
);

-- ---------------------------------------------------------------- procurement & finance
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id),
  number text not null,
  status public.po_status not null default 'draft',
  expected_delivery date,
  paid_by public.payer not null default 'client_direct',
  notes text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, number)
);
create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  spec_item_id uuid references public.spec_items(id) on delete set null,
  name text not null,
  qty numeric(12,2) not null check (qty > 0),
  unit text not null default 'יח׳',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  received_qty numeric(12,2) not null default 0 check (received_qty >= 0),
  check (received_qty <= qty)
);
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  planned numeric(14,2) not null check (planned >= 0),
  unique (project_id, category)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  expense_date date not null,
  category text not null,
  description text not null,
  supplier_id uuid references public.suppliers(id),
  po_id uuid references public.purchase_orders(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  receipt_path text,                    -- storage path in bucket "receipts"
  status public.expense_status not null default 'paid',
  paid_by public.payer not null default 'client_direct',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.expenses(project_id, category);
create table public.fee_milestones (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  pct numeric(5,2) check (pct is null or pct between 0 and 100),
  amount numeric(14,2) not null check (amount >= 0),
  due_date date,
  status public.fee_status not null default 'future',
  paid_at date
);

-- ---------------------------------------------------------------- communication
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) default auth.uid(),
  side public.message_side not null,
  body text not null check (length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index on public.messages(project_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references public.offices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, read_at);

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  in_app boolean not null default true,
  email boolean not null default true,
  primary key (user_id, kind)
);

-- Outbox consumed by an Edge Function that sends through Resend (service role only)
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references public.offices(id) on delete cascade,
  to_email citext not null,
  template text not null,
  subject text not null,
  payload jsonb not null default '{}',
  related_link text,
  status public.email_status not null default 'queued',
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index on public.email_outbox(status, created_at);

create table public.activity_log (
  id bigint generated always as identity primary key,
  office_id uuid not null references public.offices(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}',
  link text,
  created_at timestamptz not null default now()
);
create index on public.activity_log(office_id, created_at desc);

-- ---------------------------------------------------------------- subscriptions & billing
create table public.subscription_plans (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null,
  tagline text,
  price_monthly numeric(10,2) not null check (price_monthly >= 0),
  price_yearly_per_month numeric(10,2) check (price_yearly_per_month >= 0),
  currency text not null default 'ILS',
  vat_included boolean not null default false,
  price_confirmed boolean not null default false,   -- false = demo price, requires approval
  max_users int check (max_users > 0),               -- null = unlimited
  max_active_projects int check (max_active_projects > 0),
  storage_gb int not null default 20,
  trial_days int not null default 14,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.feature_definitions (
  key text primary key,
  label text not null,
  grp text not null
);
create table public.plan_features (
  plan_id text not null references public.subscription_plans(id) on delete cascade,
  feature_key text not null references public.feature_definitions(key) on delete cascade,
  enabled boolean not null default false,
  primary key (plan_id, feature_key)
);
create table public.office_subscriptions (
  office_id uuid primary key references public.offices(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status public.sub_status not null default 'trialing',
  billing_cycle public.billing_cycle not null default 'monthly',
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null default now() + interval '14 days',
  trial_ends_at timestamptz,
  cancel_at timestamptz,
  pending_plan_id text references public.subscription_plans(id),
  provider text,                         -- billing provider: not chosen yet
  provider_customer_id text,
  provider_subscription_id text,
  updated_at timestamptz not null default now()
);
create table public.subscription_events (
  id bigint generated always as identity primary key,
  office_id uuid not null references public.offices(id) on delete cascade,
  event text not null,
  details jsonb not null default '{}',
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  number text not null unique,
  issued_at date not null,
  period_from date, period_to date,
  plan_id text references public.subscription_plans(id),
  amount numeric(10,2) not null,
  vat numeric(10,2) not null,
  status public.invoice_status not null,
  provider_invoice_id text,
  pdf_path text
);
create table public.pricing_changes (
  id bigint generated always as identity primary key,
  plan_id text not null references public.subscription_plans(id),
  field text not null,
  old_value text,
  new_value text,
  changed_by uuid references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- support & platform ops
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  number bigint generated always as identity (start with 1001) unique,
  created_by uuid not null references auth.users(id) default auth.uid(),
  subject text not null check (length(trim(subject)) > 0),
  category text,
  priority public.ticket_priority not null default 'normal',
  status public.ticket_status not null default 'open',
  assignee_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.offices(id) on delete cascade,
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null references auth.users(id) default auth.uid(),
  side public.ticket_side not null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  office_id uuid references public.offices(id) on delete set null,
  actor_id uuid,
  actor_is_super_admin boolean not null default false,
  action text not null,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log(office_id, created_at desc);
create table public.system_events (
  id bigint generated always as identity primary key,
  level public.event_level not null default 'info',
  service text not null,
  message text not null,
  office_id uuid references public.offices(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  status public.announcement_status not null default 'draft',
  publish_at timestamptz,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.retention_policies (
  id uuid primary key default gen_random_uuid(),
  data_type text not null unique,
  period text not null,
  action text not null,
  is_draft boolean not null default true,     -- requires legal review
  updated_at timestamptz not null default now()
);
