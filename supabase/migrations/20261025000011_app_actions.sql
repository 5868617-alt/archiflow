-- ArchiFlow – small server actions the app screens need (all go through permission checks and the e-mail outbox).

-- reminder to the client about a pending approval (studio staff on the project)
create or replace function public.send_approval_reminder(p_approval uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record; c record; p record;
begin
  perform private.require_auth();
  select * into a from public.approvals where id = p_approval;
  if a.id is null or not private.can_view_project(a.project_id) or not private.can_write(a.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if a.status <> 'pending' then raise exception 'already decided' using errcode = '22023'; end if;
  select * into c from public.client_contacts where id = a.contact_id;
  select * into p from public.projects where id = a.project_id;
  perform private.notify(a.office_id, c.user_id, 'approval', 'תזכורת: ממתין לאישורך', a.title, '/portal/approvals');
  perform private.enqueue_email(a.office_id, c.email, 'approval_reminder', 'תזכורת: ממתין לאישורך – ' || a.title,
          jsonb_build_object('project', p.name, 'title', a.title, 'approval_id', a.id), '/portal/approvals');
  perform private.log_activity(a.office_id, a.project_id, 'note', jsonb_build_object('text', 'תזכורת ללקוח: ' || a.title), '/approvals');
end $$;

-- meeting invitation / summary to the client contacts linked to the meeting
create or replace function public.send_meeting_email(p_meeting uuid, p_kind text)
returns int language plpgsql security definer set search_path = '' as $$
declare m record; n int := 0; c record; office_name text;
begin
  perform private.require_auth();
  select * into m from public.meetings where id = p_meeting;
  if m.id is null or not private.can_view_meeting(m.id) or not private.can_write(m.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_kind not in ('invite', 'summary') then raise exception 'invalid kind' using errcode = '22023'; end if;
  if p_kind = 'summary' and length(trim(coalesce(m.summary, ''))) = 0 then raise exception 'meeting has no summary' using errcode = '22023'; end if;
  select name into office_name from public.offices where id = m.office_id;
  for c in select ct.* from public.meeting_contacts mc join public.client_contacts ct on ct.id = mc.contact_id where mc.meeting_id = m.id and ct.email is not null loop
    perform private.enqueue_email(m.office_id, c.email, 'meeting_' || p_kind,
      case when p_kind = 'invite' then 'זימון: ' || m.title || ' – ' || to_char(m.starts_at at time zone 'Asia/Jerusalem', 'DD.MM.YYYY HH24:MI') else 'סיכום פגישה: ' || m.title end,
      jsonb_build_object('office', office_name, 'title', m.title, 'location', m.location, 'summary', case when p_kind = 'summary' then m.summary end), '/portal');
    perform private.notify(m.office_id, c.user_id, 'meeting', case when p_kind = 'invite' then 'זימון לפגישה' else 'סיכום פגישה' end, m.title, '/portal')
      where c.portal_status = 'active';
    n := n + 1;
  end loop;
  return n;
end $$;

-- fee payment request to the client's first contact with an e-mail (owners/admins)
create or replace function public.send_fee_request(p_fee uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare f record; p record; c record;
begin
  perform private.require_auth();
  select * into f from public.fee_milestones where id = p_fee for update;
  if f.id is null or not private.is_manager(f.office_id) or not private.sub_active(f.office_id) or not private.has_feature(f.office_id, 'fees') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into p from public.projects where id = f.project_id;
  select * into c from public.client_contacts where client_id = p.client_id and email is not null order by created_at limit 1;
  update public.fee_milestones set status = 'requested' where id = f.id and status in ('future', 'overdue');
  perform private.enqueue_email(f.office_id, c.email, 'fee_request', 'דרישת תשלום: ' || f.title || ' – ' || p.name,
          jsonb_build_object('project', p.name, 'title', f.title, 'amount', f.amount), '/portal');
  perform private.log_activity(f.office_id, f.project_id, 'note', jsonb_build_object('text', 'דרישת תשלום נשלחה: ' || f.title), '/projects/' || p.id || '/fees');
end $$;

-- purchase order to the supplier: marks it as sent and queues the e-mail
create or replace function public.send_purchase_order(p_po uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare o record; s record; p record;
begin
  perform private.require_auth();
  select * into o from public.purchase_orders where id = p_po for update;
  if o.id is null or not private.can_view_project(o.project_id) or not private.can_write(o.office_id) or not private.has_feature(o.office_id, 'procurement') then raise exception 'not allowed' using errcode = '42501'; end if;
  select * into s from public.suppliers where id = o.supplier_id;
  select * into p from public.projects where id = o.project_id;
  update public.purchase_orders set status = 'sent' where id = o.id;
  perform private.enqueue_email(o.office_id, s.email, 'purchase_order', 'הזמנת רכש ' || o.number || ' – ' || p.name,
          jsonb_build_object('project', p.name, 'number', o.number), '/procurement/' || o.id);
end $$;

-- invitation e-mail again (new token; the old link stops working)
create or replace function public.resend_invitation(p_invitation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare i record;
begin
  perform private.require_auth();
  select * into i from public.invitations where id = p_invitation;
  if i.id is null or not private.is_manager(i.office_id) then raise exception 'not allowed' using errcode = '42501'; end if;
  if i.status not in ('pending', 'expired') then raise exception 'invitation not found or already used' using errcode = 'P0002'; end if;
  update public.invitations set status = 'revoked' where id = i.id;
  if i.role = 'client' then return public.invite_client_contact(i.client_contact_id); end if;
  return public.invite_member(i.office_id, i.email::text, i.full_name, i.role);
end $$;

revoke execute on function public.send_approval_reminder(uuid), public.send_meeting_email(uuid, text), public.send_fee_request(uuid),
  public.send_purchase_order(uuid), public.resend_invitation(uuid) from public, anon;
grant execute on function public.send_approval_reminder(uuid), public.send_meeting_email(uuid, text), public.send_fee_request(uuid),
  public.send_purchase_order(uuid), public.resend_invitation(uuid) to authenticated;
