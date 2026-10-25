-- ArchiFlow – one-call data load for the web app.
-- SECURITY INVOKER: every row passes through the caller's RLS policies and column grants exactly as
-- if each table had been queried separately. It only saves round-trips; it grants nothing.
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
    'budget_lines', 'expenses', 'fee_milestones', 'messages', 'office_subscriptions', 'invoices', 'support_tickets', 'ticket_messages'];
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
    'system_events', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at desc), '[]') from (select * from public.system_events order by created_at desc limit 200) s)
  );
  return out;
end $$;
revoke execute on function public.app_snapshot(uuid) from public, anon;
grant execute on function public.app_snapshot(uuid) to authenticated;

-- activity feed entries written by the app for ordinary edits ("task created", "expense recorded" …).
-- Staff only, own office, project must be visible; text is length-limited. Structured events
-- (status changes, approvals) are still logged by their RPCs.
create or replace function public.app_log_activity(p_office uuid, p_project uuid, p_text text, p_link text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_auth();
  if not private.is_staff(p_office) or (p_project is not null and not private.can_view_project(p_project))
     or (p_project is not null and (select office_id from public.projects where id = p_project) is distinct from p_office) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_text, ''))) = 0 then return; end if;
  insert into public.activity_log(office_id, project_id, actor_id, action, details, link)
  values (p_office, p_project, auth.uid(), 'note', jsonb_build_object('text', left(p_text, 300)), left(p_link, 200));
end $$;
revoke execute on function public.app_log_activity(uuid, uuid, text, text) from public, anon;
grant execute on function public.app_log_activity(uuid, uuid, text, text) to authenticated;
