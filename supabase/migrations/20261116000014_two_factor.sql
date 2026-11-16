-- ArchiFlow – two-factor sign-in (TOTP, Supabase Auth MFA), enforced in the database, not only on screen.
--
-- A user who turned on two-factor and signed in with a password only (session level aal1) gets no office
-- role and no Super Admin rights until the code is entered (aal2). Every office permission goes through
-- private.office_role, so one check covers all tables, files and functions of the office.
-- Users without two-factor are not affected. Clients of the portal are not affected (offered to staff only).
-- If someone loses the phone, the Super Admin can remove the factor (admin_reset_mfa, logged).

create or replace function private.mfa_ok() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status::text = 'verified')
$$;

create or replace function private.office_role(p_office uuid) returns public.office_role
language sql stable security definer set search_path = '' as $$
  select m.role from public.office_members m
  where m.office_id = p_office and m.user_id = auth.uid() and m.status = 'active' and private.mfa_ok()
$$;

create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_super_admin from public.profiles p where p.id = auth.uid()), false) and private.mfa_ok()
$$;

-- lost phone: the platform owner removes the user's factors so they can sign in with the password again
create or replace function public.admin_reset_mfa(p_user uuid, p_note text)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_auth(); n integer;
begin
  if not private.is_super_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_note, ''))) = 0 then raise exception 'a note is required for manual changes' using errcode = '22023'; end if;
  delete from auth.mfa_factors where user_id = p_user;
  get diagnostics n = row_count;
  insert into public.audit_log(office_id, actor_id, actor_is_super_admin, action, table_name, record_id, new_data)
  values (null, uid, true, 'mfa_reset', 'auth.mfa_factors', p_user::text, jsonb_build_object('factors_removed', n, 'note', p_note));
  return n;
end $$;

revoke execute on function public.admin_reset_mfa(uuid, text) from public, anon;
grant execute on function public.admin_reset_mfa(uuid, text) to authenticated;
