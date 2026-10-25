-- ArchiFlow – security test suite.
-- Each block logs in as a user (exactly like PostgREST: role + JWT claims), runs reads/writes,
-- and asserts the result. Everything is rolled back. Output: lines starting with PASS / FAIL.

\set QUIET on
\set ON_ERROR_STOP on
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.email(p uuid) returns text language sql security definer set search_path = '' as $$ select email from auth.users where id = p $$;

create or replace function tests.login(p_user text) returns void language plpgsql as $$
declare ids jsonb := '{
  "michal":"11111111-0000-4000-8000-000000000001","yoav":"11111111-0000-4000-8000-000000000002",
  "noa":"11111111-0000-4000-8000-000000000003","ori":"11111111-0000-4000-8000-000000000004",
  "shira":"11111111-0000-4000-8000-000000000005","dana":"11111111-0000-4000-8000-000000000021",
  "yael":"11111111-0000-4000-8000-000000000022","ronit":"11111111-0000-4000-8000-000000000023",
  "avital":"11111111-0000-4000-8000-000000000031","zvi":"11111111-0000-4000-8000-000000000032",
  "ron":"11111111-0000-4000-8000-000000000099"}';
declare uid text; mail text;
begin
  if p_user = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
    return;
  end if;
  uid := ids ->> p_user;
  mail := tests.email(uid::uuid);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', mail)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function tests.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  raise notice '%', case when coalesce(cond, false) then 'PASS ' else 'FAIL ' end || name;
end $$;

create or replace function tests.n(q text) returns bigint language plpgsql as $$
declare r bigint; begin execute 'select count(*) from (' || q || ') x' into r; return r; end $$;

-- runs a statement that must fail (permission error, RLS violation, trigger, or affects 0 rows)
create or replace function tests.denied(q text, name text) returns void language plpgsql as $$
declare rc bigint;
begin
  execute q; get diagnostics rc = row_count;
  raise notice '%', case when rc = 0 then 'PASS ' else 'FAIL ' end || name || case when rc = 0 then ' (0 rows affected)' else ' (statement succeeded: ' || rc || ' rows)' end;
exception when others then
  raise notice 'PASS % (%)', name, left(sqlerrm, 90);
end $$;

-- runs a statement that must succeed
create or replace function tests.allowed(q text, name text) returns void language plpgsql as $$
declare rc bigint;
begin
  execute q; get diagnostics rc = row_count;
  raise notice '%', case when rc > 0 or q ilike 'select%' then 'PASS ' else 'FAIL ' end || name || ' (' || rc || ' rows)';
exception when others then
  raise notice 'FAIL % (%)', name, sqlerrm;
end $$;
grant execute on all functions in schema tests to anon, authenticated;

\echo '--- anonymous visitor'
begin;
select tests.login('anon');
select tests.ok(tests.n('select * from public.subscription_plans') = 2, 'anon reads the public pricing catalogue');
select tests.denied('select * from public.projects', 'anon cannot read projects');
select tests.denied('select * from public.profiles', 'anon cannot read profiles');
select tests.denied('select * from storage.objects', 'anon cannot list files');
select tests.denied($$select public.create_office('x')$$, 'anon cannot call RPCs');
rollback;

\echo '--- office owner (Michal)'
begin;
select tests.login('michal');
select tests.ok(tests.n('select * from public.projects') = 3, 'owner sees all 3 projects of her office');
select tests.ok(tests.n('select * from public.projects where office_id = ''a0000000-0000-4000-8000-000000000002''') = 0, 'owner sees nothing of another office');
select tests.ok(tests.n('select * from public.expenses') = 2, 'owner sees expenses');
select tests.ok(tests.n('select * from public.fee_milestones') = 2, 'owner sees fee milestones');
select tests.ok(tests.n('select * from public.documents') = 3, 'owner sees owners-only documents');
select tests.ok(tests.n('select * from public.invoices') = 0 and tests.n('select * from public.office_subscriptions') = 1, 'owner sees her subscription only');
select tests.ok(tests.n('select * from public.audit_log where office_id <> ''a0000000-0000-4000-8000-000000000001''') = 0, 'owner audit log is scoped to her office');
select tests.allowed($$update public.office_settings set member_can_see_finance = true where office_id = 'a0000000-0000-4000-8000-000000000001'$$, 'owner changes office permission settings');
select tests.denied($$insert into public.tasks(office_id, project_id, title) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000011', 'cross-office')$$, 'cannot attach a task to another office''s project');
select tests.denied($$insert into public.tasks(office_id, title) values ('a0000000-0000-4000-8000-000000000002', 'into other office')$$, 'cannot write into another office');
select tests.denied($$update public.projects set office_id = 'a0000000-0000-4000-8000-000000000002' where id = 'e0000000-0000-4000-8000-000000000001'$$, 'office_id is immutable');
select tests.denied($$update public.projects set status = 'completed' where id = 'e0000000-0000-4000-8000-000000000001'$$, 'project status cannot be changed directly');
select tests.allowed($$select public.set_project_status('e0000000-0000-4000-8000-000000000003', 'pending_approval', 'נשלח לאישור')$$, 'owner changes status through set_project_status()');
select tests.ok(tests.n($$select * from public.project_status_history where project_id = 'e0000000-0000-4000-8000-000000000003'$$) = 1, 'status change written to history');
select tests.denied($$update public.spec_items set status = 'approved' where id = '50000000-0000-4000-8000-000000000008'$$, 'staff cannot mark a spec as client-approved');
select tests.denied($$update public.plan_versions set status = 'approved' where id = '71000000-0000-4000-8000-000000000002'$$, 'staff cannot mark a plan as client-approved');
select tests.denied($$insert into public.approvals(office_id, project_id, kind, title, contact_id, status) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'spec', 'fake', 'd0000000-0000-4000-8000-000000000001', 'approved')$$, 'approvals cannot be inserted directly');
select tests.denied($$update public.office_subscriptions set plan_id = 'pro', status = 'active'$$, 'owner cannot change her own subscription row');
select tests.denied($$update public.profiles set is_super_admin = true where id = auth.uid()$$, 'cannot grant herself super admin');
rollback;

\echo '--- office admin (Yoav)'
begin;
select tests.login('yoav');
select tests.ok(tests.n('select * from public.projects') = 3, 'admin sees all office projects');
select tests.denied($$update public.office_members set role = 'admin' where user_id = '11111111-0000-4000-8000-000000000005'$$, 'admin cannot grant admin (owner only)');
select tests.denied($$update public.office_members set role = 'member' where user_id = '11111111-0000-4000-8000-000000000001'$$, 'admin cannot demote the owner');
select tests.denied($$update public.office_members set status = 'disabled' where user_id = '11111111-0000-4000-8000-000000000002'$$, 'nobody changes their own membership');
select tests.allowed($$update public.office_members set status = 'disabled' where user_id = '11111111-0000-4000-8000-000000000006'$$, 'admin disables a member');
select tests.denied($$update public.office_settings set member_can_see_finance = true$$, 'admin cannot change permission settings (owner only)');
select tests.denied($$select public.invite_member('a0000000-0000-4000-8000-000000000001', 'new.admin@example.com', 'x', 'admin')$$, 'admin cannot invite another admin');
select tests.allowed($$select public.invite_member('a0000000-0000-4000-8000-000000000001', 'adi@example.com', 'עדי גולן', 'member')$$, 'admin invites a member');
select tests.ok(tests.n($$select id from public.email_outbox where template = 'team_invite'$$) = 1, 'invitation email queued in the outbox');
select tests.denied($$select payload from public.email_outbox$$, 'outbox payload (invite token) is not readable');
select tests.ok(tests.n('select * from public.invoices') = 0, 'admin does not see invoices by default');
select tests.denied($$select public.request_cancellation('a0000000-0000-4000-8000-000000000001', 'test')$$, 'admin cannot cancel the subscription by default');
rollback;

\echo '--- team member (Shira): assigned to 2 of 3 projects, no finance'
begin;
select tests.login('shira');
select tests.ok(tests.n('select * from public.projects') = 2, 'member sees only her 2 assigned projects');
select tests.ok(tests.n($$select * from public.projects where id = 'e0000000-0000-4000-8000-000000000002'$$) = 0, 'member does not see an unassigned project');
select tests.ok(tests.n($$select * from public.tasks where project_id = 'e0000000-0000-4000-8000-000000000002'$$) = 0, 'member does not see tasks of unassigned project');
select tests.ok(tests.n('select * from public.expenses') = 0 and tests.n('select * from public.budget_lines') = 0, 'member sees no budgets or expenses');
select tests.ok(tests.n('select * from public.fee_milestones') = 0, 'member sees no fees');
select tests.ok(tests.n('select * from public.project_finance') = 0, 'member gets nothing from the finance view');
select tests.ok(tests.n('select * from public.documents') = 1, 'member sees team document only, not owners-only documents');
select tests.ok(tests.n('select * from public.audit_log') = 0, 'member cannot read the audit log');
select tests.allowed($$insert into public.tasks(office_id, project_id, title, assignee_id) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'משימה חדשה', '11111111-0000-4000-8000-000000000004')$$, 'member creates a task in her project');
select tests.ok(tests.n($$select * from public.notifications where user_id = '11111111-0000-4000-8000-000000000004'$$) = 0, 'member cannot read colleagues'' notifications');
select tests.denied($$insert into public.tasks(office_id, project_id, title) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'x')$$, 'member cannot write into an unassigned project');
select tests.denied($$insert into public.tasks(office_id, project_id, title, assignee_id) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'x', '11111111-0000-4000-8000-000000000031')$$, 'cannot assign a task to a user outside the office');
select tests.denied($$select public.set_project_status('e0000000-0000-4000-8000-000000000001', 'completed')$$, 'member cannot change project status');
select tests.denied($$update public.office_members set role = 'admin' where user_id = auth.uid()$$, 'member cannot promote herself');
select tests.denied($$insert into public.office_members(office_id, user_id, role) values ('a0000000-0000-4000-8000-000000000002', auth.uid(), 'owner')$$, 'member cannot join another office');
select tests.denied($$insert into public.expenses(office_id, project_id, expense_date, category, description, amount) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', current_date, 'x', 'x', 10)$$, 'member cannot record expenses');
select tests.denied($$select * from public.client_budget_summary('e0000000-0000-4000-8000-000000000001')$$, 'member cannot read budget summary RPC');
rollback;

\echo '--- configurable assumption: owner allows members to see finance'
begin;
update public.office_settings set member_can_see_finance = true where office_id = 'a0000000-0000-4000-8000-000000000001';
select tests.login('shira');
select tests.ok(tests.n('select * from public.expenses') = 2, 'member sees finance once the owner enables it');
select tests.ok(tests.n('select * from public.fee_milestones') = 0, 'fees stay owner/admin only');
rollback;

\echo '--- client (Dana): active portal user of the Cohen project'
begin;
select tests.login('dana');
select tests.ok(tests.n('select * from public.projects') = 1, 'client sees only her own project');
select tests.ok(tests.n('select * from public.plans') = 1, 'client sees only shared plans');
select tests.ok(tests.n('select * from public.plan_versions') = 1, 'client sees only the latest version of a shared plan');
select tests.ok(tests.n('select * from public.plan_annotations') = 0, 'client never sees internal annotations');
select tests.ok(tests.n('select * from public.spec_items') = 2, 'client sees shared spec items only');
select tests.ok(tests.n('select * from public.spec_alternatives') = 1, 'client sees alternatives of shared items');
select tests.ok(tests.n('select * from public.documents') = 1, 'client sees the shared document only');
select tests.ok(tests.n('select * from public.tasks') = 0, 'client sees no internal tasks');
select tests.ok(tests.n('select * from public.expenses') = 0 and tests.n('select * from public.budget_lines') = 0, 'client sees no expenses or budget lines');
select tests.ok(tests.n('select * from public.purchase_orders') = 0 and tests.n('select * from public.suppliers') = 0, 'client sees no procurement data');
select tests.ok(tests.n('select * from public.fee_milestones') = 0, 'client sees no fee data');
select tests.ok(tests.n('select * from public.clients') = 1, 'client sees only her own client record');
select tests.ok(tests.n('select * from public.approvals') = 1, 'client sees approvals of her project only');
select tests.ok(tests.n('select * from public.messages') = 2, 'client sees her project conversation');
select tests.ok(tests.n('select * from public.profiles') >= 7, 'client sees studio team names');
select tests.ok(tests.n('select * from public.office_members') = 0, 'client cannot list office membership');
select tests.denied($$select * from public.client_budget_summary('e0000000-0000-4000-8000-000000000001')$$, 'budget summary hidden while the office has not enabled it');
select tests.denied($$update public.approvals set status = 'approved' where id = '60000000-0000-4000-8000-000000000001'$$, 'client cannot update an approval row directly');
select tests.denied($$update public.spec_items set status = 'approved'$$, 'client cannot update spec items');
select tests.denied($$select public.decide_approval('60000000-0000-4000-8000-000000000001', 'change_requested', '')$$, 'change request requires a comment');
select tests.denied($$insert into public.messages(office_id, project_id, author_id, side, body) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', auth.uid(), 'studio', 'spoof')$$, 'client cannot post as the studio');
select tests.denied($$insert into public.messages(office_id, project_id, author_id, side, body) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002', 'client', 'spoof')$$, 'client cannot post under someone else''s name');
select tests.denied($$insert into public.messages(office_id, project_id, author_id, side, body) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', auth.uid(), 'client', 'x')$$, 'client cannot post into another client''s project');
select tests.allowed($$insert into public.messages(office_id, project_id, author_id, side, body) values ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', auth.uid(), 'client', 'שאלה על התכנית')$$, 'client posts in her project conversation');
select tests.allowed($$select public.decide_approval('60000000-0000-4000-8000-000000000001', 'approved', 'מאשרים')$$, 'client approves through decide_approval()');
select tests.ok((select status::text from public.spec_items where id = '50000000-0000-4000-8000-000000000003') = 'approved', 'approval updates the spec item status');
select tests.denied($$select public.decide_approval('60000000-0000-4000-8000-000000000001', 'rejected', 'שינוי דעה')$$, 'a decision cannot be changed after the fact');
-- storage
select tests.ok(tests.n($$select * from storage.objects where name like '%/v2/A-101.pdf'$$) = 1, 'client can read the latest shared plan file');
select tests.ok(tests.n($$select * from storage.objects where name like '%/v1/A-101.pdf'$$) = 0, 'client cannot read superseded plan files');
select tests.ok(tests.n($$select * from storage.objects where name like '%E-201.dwg'$$) = 0, 'client cannot read internal plan files');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('plans', 'a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001/x/hack.pdf')$$, 'client cannot upload into project storage');
rollback;

\echo '--- side effects of the client decision (studio view)'
begin;
select tests.login('dana');
select public.decide_approval('60000000-0000-4000-8000-000000000001', 'change_requested', 'אפשר בגוון כהה יותר?');
select tests.login('ori');
select tests.ok(tests.n($$select * from public.notifications where title like '%change_requested%'$$) = 1, 'requester notified of the client decision');
select tests.ok(tests.n($$select * from public.activity_log where action = 'approval_decided'$$) = 1, 'decision recorded in the activity log');
select tests.login('michal');
select tests.ok(tests.n($$select * from public.audit_log where table_name = 'approvals' and action = 'update'$$) >= 1, 'decision recorded in the audit log');
rollback;

\echo '--- other clients'
begin;
select tests.login('yael');
select tests.ok(tests.n('select * from public.projects') = 1, 'Yael sees only the Friedman project');
select tests.ok(tests.n($$select * from public.approvals where id = '60000000-0000-4000-8000-000000000001'$$) = 0, 'Yael cannot see Dana''s approvals');
select tests.denied($$select public.decide_approval('60000000-0000-4000-8000-000000000001', 'approved', null)$$, 'Yael cannot decide Dana''s approval');
select tests.login('ronit');
select tests.ok(tests.n('select * from public.projects') = 0, 'suspended portal user sees nothing');
select tests.login('zvi');
select tests.ok(tests.n('select * from public.projects') = 0, 'client of an office on Starter (no portal) sees nothing');
rollback;

\echo '--- feature gating by plan (office 2 is on Starter)'
begin;
select tests.login('avital');
select tests.ok(tests.n('select * from public.projects') = 1, 'Starter owner sees her own project');
select tests.ok(tests.n('select * from public.tasks') = 1, 'Starter owner sees only her own tasks');
select tests.denied($$insert into public.purchase_orders(office_id, project_id, supplier_id, number) select 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000011', id, 'PO-1' from public.suppliers limit 1$$, 'procurement blocked on Starter');
select tests.denied($$select public.invite_client_contact('d0000000-0000-4000-8000-000000000011')$$, 'client portal invitations blocked on Starter');
select tests.allowed($$select public.invite_member('a0000000-0000-4000-8000-000000000002', 'a@example.com', 'A', 'member')$$, 'Starter: 2nd user allowed');
select tests.allowed($$select public.invite_member('a0000000-0000-4000-8000-000000000002', 'b@example.com', 'B', 'member')$$, 'Starter: 3rd user allowed');
select tests.denied($$select public.invite_member('a0000000-0000-4000-8000-000000000002', 'c@example.com', 'C', 'member')$$, 'Starter: 4th user blocked by plan limit');
rollback;

\echo '--- read-only after cancellation'
begin;
update public.office_subscriptions set status = 'expired' where office_id = 'a0000000-0000-4000-8000-000000000002';
select tests.login('avital');
select tests.ok(tests.n('select * from public.projects') = 1, 'expired office can still read its data');
select tests.denied($$insert into public.tasks(office_id, title) values ('a0000000-0000-4000-8000-000000000002', 'x')$$, 'expired office cannot write');
rollback;

\echo '--- invitation flow'
begin;
-- owner invites, then the invitee signs up with the same email and accepts using the token from the email
select tests.login('michal');
select public.invite_member('a0000000-0000-4000-8000-000000000001', 'newbie@example.com', 'חדשה', 'member');
reset role;
insert into auth.users (id, email) values ('11111111-0000-4000-8000-000000000077', 'newbie@example.com');
select payload ->> 'token' as tok from public.email_outbox where to_email = 'newbie@example.com' \gset
select set_config('request.jwt.claims', json_build_object('sub', '11111111-0000-4000-8000-000000000077', 'role', 'authenticated', 'email', 'newbie@example.com')::text, true);
select set_config('role', 'authenticated', true);
select tests.denied($$select public.accept_invitation('wrong-token')$$, 'wrong invitation token rejected');
select tests.allowed($$select public.accept_invitation('$$ || :'tok' || $$')$$, 'invitee accepts with the emailed token');
select tests.ok(tests.n('select * from public.projects') = 0, 'new member starts with no project access');
select tests.denied($$select public.accept_invitation('$$ || :'tok' || $$')$$, 'token cannot be reused');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', '11111111-0000-4000-8000-000000000031', 'role', 'authenticated', 'email', 'avital@kav.example.com')::text, true);
select set_config('role', 'authenticated', true);
rollback;

\echo '--- super admin (Ron)'
begin;
select tests.login('ron');
select tests.ok(tests.n('select * from public.offices') = 2, 'super admin sees all offices');
select tests.ok(tests.n('select * from public.office_subscriptions') = 2, 'super admin sees all subscriptions');
select tests.ok(tests.n('select * from public.projects') = 0, 'super admin does NOT see project content');
select tests.ok(tests.n('select * from public.expenses') = 0 and tests.n('select * from public.messages') = 0, 'super admin does NOT see finance or client conversations');
select tests.ok(tests.n('select * from public.support_tickets') = 1, 'super admin sees support tickets');
select tests.allowed($$update public.subscription_plans set price_monthly = 159 where id = 'starter'$$, 'super admin edits a plan price');
select tests.ok(tests.n($$select * from public.pricing_changes where plan_id = 'starter' and new_value = '159.00'$$) = 1, 'price change automatically logged');
select tests.denied($$select public.admin_set_subscription_status('a0000000-0000-4000-8000-000000000002', 'past_due', '')$$, 'manual subscription change requires a note');
select tests.allowed($$select public.admin_set_subscription_status('a0000000-0000-4000-8000-000000000002', 'past_due', 'חיוב נכשל – בדיקה מול הלקוח')$$, 'super admin changes a subscription status with a note');
select tests.ok(tests.n($$select * from public.audit_log where table_name = 'office_subscriptions' and actor_is_super_admin$$) = 1, 'super admin action is audited');
rollback;

\echo '--- regular users cannot use platform powers'
begin;
select tests.login('michal');
select tests.denied($$update public.subscription_plans set price_monthly = 1$$, 'office owner cannot change platform prices');
select tests.denied($$select public.admin_set_subscription_status('a0000000-0000-4000-8000-000000000001', 'active', 'free')$$, 'office owner cannot use super admin RPCs');
select tests.ok(tests.n('select * from public.pricing_changes') = 0, 'office owner cannot read the pricing log');
rollback;

\echo '--- file uploads by staff'
begin;
select tests.login('shira');
select tests.allowed($$insert into storage.objects(bucket_id, name) values ('plans', 'a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001/r1/A-102.pdf')$$, 'member uploads a plan into her assigned project');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('plans', 'a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000002/r1/x.pdf')$$, 'member cannot upload into an unassigned project');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('plans', 'a0000000-0000-4000-8000-000000000002/e0000000-0000-4000-8000-000000000011/r1/x.pdf')$$, 'member cannot upload into another office');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('plans', 'a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000011/r1/x.pdf')$$, 'path mixing office and foreign project rejected');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('receipts', 'a0000000-0000-4000-8000-000000000001/e0000000-0000-4000-8000-000000000001/r1/r.pdf')$$, 'member without finance cannot upload receipts');
select tests.denied($$insert into storage.objects(bucket_id, name) values ('invoices', 'a0000000-0000-4000-8000-000000000001/office/r1/i.pdf')$$, 'nobody uploads into the invoices bucket from the app');
select tests.denied($$delete from storage.objects where bucket_id = 'plans'$$, 'member cannot delete stored files');
select tests.ok(tests.n($$select * from storage.objects where name like '%E-201.dwg'$$) = 1, 'member reads internal files of her project');
rollback;

\echo '--- sign-up through Supabase Auth'
begin;
set local role supabase_auth_admin;
insert into auth.users (id, email, raw_user_meta_data) values ('11111111-0000-4000-8000-000000000088', 'signup@example.com', '{"full_name":"משתמשת חדשה"}');
reset role;
select tests.ok((select full_name from public.profiles where id = '11111111-0000-4000-8000-000000000088') = 'משתמשת חדשה', 'sign-up as supabase_auth_admin creates the profile');
select tests.ok((select is_super_admin from public.profiles where id = '11111111-0000-4000-8000-000000000088') = false, 'new users are never super admins');
rollback;

\echo '--- first Super Admin bootstrap'
begin;
set local role supabase_auth_admin;
insert into auth.users (id, email) values ('11111111-0000-4000-8000-000000000066', 'shirameren2434@gmail.com');
reset role;
select tests.ok((select is_super_admin from public.profiles where id = '11111111-0000-4000-8000-000000000066') = false, 'bootstrap address is not admin before email confirmation');
set local role supabase_auth_admin;
update auth.users set email_confirmed_at = now() where id = '11111111-0000-4000-8000-000000000066';
reset role;
select tests.ok((select is_super_admin from public.profiles where id = '11111111-0000-4000-8000-000000000066') = true, 'bootstrap address becomes Super Admin once the email is confirmed');
select tests.ok((select count(*) from private.bootstrap_super_admins) = 0, 'bootstrap entry is consumed (one-time)');
set local role supabase_auth_admin;
insert into auth.users (id, email, email_confirmed_at) values ('11111111-0000-4000-8000-000000000067', 'someone.else@example.com', now());
reset role;
select tests.ok((select is_super_admin from public.profiles where id = '11111111-0000-4000-8000-000000000067') = false, 'other confirmed users do not become Super Admin');
rollback;

\echo '--- scheduled jobs'
begin;
update public.office_subscriptions set status = 'trialing', trial_ends_at = now() - interval '1 hour' where office_id = 'a0000000-0000-4000-8000-000000000002';
update public.office_subscriptions set pending_plan_id = 'starter', current_period_end = now() - interval '1 hour' where office_id = 'a0000000-0000-4000-8000-000000000001';
update public.fee_milestones set due_date = current_date - 3 where status = 'requested';
update public.approvals set due_at = current_date where status = 'pending';
select private.run_hourly_jobs();
select private.run_daily_jobs();
select tests.ok((select status::text from public.office_subscriptions where office_id = 'a0000000-0000-4000-8000-000000000002') = 'expired', 'ended trial becomes expired (read-only)');
select tests.ok((select plan_id from public.office_subscriptions where office_id = 'a0000000-0000-4000-8000-000000000001') = 'starter', 'pending downgrade applied after the period end');
select tests.ok((select count(*) from public.fee_milestones where status = 'overdue') = 1, 'requested fee past its due date becomes overdue');
select tests.ok((select count(*) from public.email_outbox where template = 'approval_reminder') = 2, 'approval reminders queued for pending approvals');
select private.run_daily_jobs();
select tests.ok((select count(*) from public.email_outbox where template = 'approval_reminder') = 2, 'reminders are not duplicated on the same day');
select tests.login('michal');
select tests.denied('select private.run_daily_jobs()', 'users cannot run scheduled jobs');
rollback;

\echo '--- platform overview and user context'
begin;
select tests.login('ron');
select tests.ok(tests.n('select * from public.admin_offices_overview()') = 2, 'super admin gets the offices overview');
select tests.ok((select owner_email from public.admin_offices_overview() where id = 'a0000000-0000-4000-8000-000000000001') = 'michal@levibarak.example.co.il', 'overview names the office owner');
select tests.login('michal');
select tests.denied('select * from public.admin_offices_overview()', 'office owner cannot read the platform overview');
select tests.ok((public.my_context() -> 'memberships' -> 0 ->> 'role') = 'owner', 'my_context returns the membership role');
select tests.login('dana');
select tests.ok(jsonb_array_length(public.my_context() -> 'client_contacts') = 1 and jsonb_array_length(public.my_context() -> 'memberships') = 0, 'my_context identifies a portal client');
select tests.login('anon');
select tests.denied('select public.my_context()', 'anon has no context');
rollback;

\echo '--- app snapshot respects RLS'
begin;
select tests.login('shira');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'projects') = 2, 'snapshot: member gets only her 2 projects');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'expenses') = 0, 'snapshot: member gets no finance');
select tests.login('michal');
select public.invite_member('a0000000-0000-4000-8000-000000000001', 'snap@example.com', 'S', 'member');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'email_outbox') = 1
  and not (public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'email_outbox' -> 0 ? 'payload'), 'snapshot never exposes outbox payloads (invite tokens)');
select tests.login('dana');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'plan_versions') = 1, 'snapshot: client gets only the latest shared plan version');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'tasks') = 0, 'snapshot: client gets no internal tasks');
select tests.login('avital');
select tests.ok(jsonb_array_length(public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'projects') = 0, 'snapshot: asking for another office returns nothing');
select tests.login('ron');
select tests.ok(jsonb_array_length(public.app_snapshot(null) -> 'projects') = 0 and jsonb_array_length(public.app_snapshot(null) -> 'offices') = 2, 'snapshot: super admin gets offices but no project content');
select tests.login('anon');
select tests.denied('select public.app_snapshot(null)', 'anon cannot call the snapshot');
rollback;

\echo '--- app activity log'
begin;
select tests.login('shira');
select tests.allowed($$select public.app_log_activity('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'יצירת משימה: בדיקה', '/tasks')$$, 'member logs activity in her project');
select tests.denied($$select public.app_log_activity('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'x', null)$$, 'member cannot log into an unassigned project');
select tests.denied($$select public.app_log_activity('a0000000-0000-4000-8000-000000000002', null, 'x', null)$$, 'cannot log into another office');
select tests.login('dana');
select tests.denied($$select public.app_log_activity('a0000000-0000-4000-8000-000000000001', null, 'x', null)$$, 'clients cannot write the studio activity log');
rollback;

\echo '--- app actions'
begin;
select tests.login('ori');
select tests.allowed($$select public.send_approval_reminder('60000000-0000-4000-8000-000000000001')$$, 'project member sends an approval reminder');
select tests.login('shira');
select tests.denied($$select public.send_fee_request((select id from public.fee_milestones limit 1))$$, 'members cannot send fee requests');
select tests.allowed($$select public.send_purchase_order('30000000-0000-4000-8000-000000000001')$$, 'member sends a purchase order of her project');
select tests.login('michal');
select tests.allowed($$select public.send_fee_request((select id from public.fee_milestones where status = 'requested' limit 1))$$, 'owner sends a fee request');
select tests.ok((select count(*) from public.email_outbox where template in ('approval_reminder', 'purchase_order', 'fee_request')) = 3, 'all three e-mails queued');
select public.invite_member('a0000000-0000-4000-8000-000000000001', 'again@example.com', 'A', 'member');
select tests.allowed($$select public.resend_invitation((select id from public.invitations where email = 'again@example.com'))$$, 'owner resends an invitation');
select tests.ok((select count(*) from public.invitations where email = 'again@example.com' and status = 'pending') = 1
  and (select count(*) from public.invitations where email = 'again@example.com' and status = 'revoked') = 1, 'old invitation revoked, one new pending');
select tests.login('avital');
select tests.denied($$select public.send_approval_reminder('60000000-0000-4000-8000-000000000002')$$, 'another office cannot send reminders');
select tests.login('dana');
select tests.denied($$select public.send_approval_reminder('60000000-0000-4000-8000-000000000001')$$, 'clients cannot send reminders');
rollback;

\echo '--- snapshot rows are whole records'
begin;
select tests.login('yoav');
select tests.ok((public.app_snapshot('a0000000-0000-4000-8000-000000000001') -> 'plan_annotations' -> 0 ->> 'body') is not null, 'snapshot returns annotation records (not a column named x)');
rollback;
