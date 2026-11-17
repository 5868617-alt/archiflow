-- Hardening (Supabase advisor 0011): pin the search_path of the two trigger functions changed in migration 13.
alter function private.immutable_office_id() set search_path = '';
alter function private.guard_office_deletion() set search_path = '';
