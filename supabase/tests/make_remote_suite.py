#!/usr/bin/env python3
"""Builds tests/remote_suite.sql: seed + the full security suite in ONE DO block that always
rolls back (it ends with RAISE EXCEPTION carrying the results). Safe to run on a real
Supabase project through the SQL editor / execute_sql: nothing is left behind.

Each test block runs in its own sub-transaction (BEGIN ... EXCEPTION), which also resets the role.
Results are collected in a plpgsql variable, which survives sub-transaction rollbacks."""
import re, pathlib

here = pathlib.Path(__file__).parent
seed = (here.parent / "seed.sql").read_text()
suite = (here / "10_security_tests.sql").read_text().splitlines()

HELPERS = r"""
execute 'create schema tests';
execute 'grant usage on schema tests to anon, authenticated';
execute $h$create function tests.email(p uuid) returns text language sql security definer set search_path = '' as $f$ select email from auth.users where id = p $f$$h$;
execute $h$create function tests.login(p_user text) returns void language plpgsql as $f$
declare ids jsonb := '{"michal":"11111111-0000-4000-8000-000000000001","yoav":"11111111-0000-4000-8000-000000000002",
  "noa":"11111111-0000-4000-8000-000000000003","ori":"11111111-0000-4000-8000-000000000004",
  "shira":"11111111-0000-4000-8000-000000000005","dana":"11111111-0000-4000-8000-000000000021",
  "yael":"11111111-0000-4000-8000-000000000022","ronit":"11111111-0000-4000-8000-000000000023",
  "avital":"11111111-0000-4000-8000-000000000031","zvi":"11111111-0000-4000-8000-000000000032",
  "ron":"11111111-0000-4000-8000-000000000099"}'; uid text; mail text;
begin
  if p_user = 'anon' then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true); perform set_config('role', 'anon', true); return;
  end if;
  uid := ids ->> p_user; mail := tests.email(uid::uuid);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', mail)::text, true);
  perform set_config('role', 'authenticated', true);
end $f$$h$;
execute $h$create function tests.ok(cond boolean, name text) returns text language sql as $f$
  select case when coalesce(cond, false) then 'PASS ' else 'FAIL ' end || name $f$$h$;
execute $h$create function tests.n(q text) returns bigint language plpgsql as $f$
declare r bigint; begin execute 'select count(*) from (' || q || ') x' into r; return r; end $f$$h$;
execute $h$create function tests.denied(q text, name text) returns text language plpgsql as $f$
declare rc bigint;
begin
  execute q; get diagnostics rc = row_count;
  return case when rc = 0 then 'PASS ' else 'FAIL ' end || name || case when rc = 0 then ' (0 rows)' else ' (succeeded: ' || rc || ' rows)' end;
exception when others then return 'PASS ' || name || ' (' || left(sqlerrm, 80) || ')';
end $f$$h$;
execute $h$create function tests.allowed(q text, name text) returns text language plpgsql as $f$
declare rc bigint;
begin
  execute q; get diagnostics rc = row_count;
  return case when rc > 0 or q ilike 'select%' then 'PASS ' else 'FAIL ' end || name || ' (' || rc || ' rows)';
exception when others then return 'FAIL ' || name || ' (' || sqlerrm || ')';
end $f$$h$;
execute 'grant execute on all functions in schema tests to anon, authenticated';
"""

def statements(lines):
    buf = []
    for line in lines:
        s = line.strip()
        if not buf and (not s or s.startswith("--")):
            continue
        buf.append(line)
        if s.endswith(";") or s.endswith(r"\gset"):
            yield "\n".join(buf).strip()
            buf = []

def convert(stmt):
    stmt = stmt.replace(":'tok'", "tok")
    if stmt.endswith(r"\gset"):            # select payload ->> 'token' as tok from ... \gset
        body = stmt[:-5].strip()
        m = re.match(r"select (.+?) as tok from (.+)$", body, re.S)
        return f"select {m.group(1)} into tok from {m.group(2)};"
    if re.match(r"select tests\.(ok|denied|allowed)\(", stmt):
        return "out := out || " + stmt[len("select "):].rstrip(";") + " || chr(10);"
    if stmt.lower().startswith("select "):
        return "perform " + stmt[len("select "):]
    if re.match(r"(reset|set) ", stmt, re.I):
        return f"execute $s${stmt.rstrip(';')}$s$;"
    return stmt                              # plain insert / update / delete

body = ["declare out text := ''; tok text;", "begin", HELPERS, "-- seed", seed]
in_block = False
for stmt in statements([l for l in suite if not l.startswith("\\set")]):
    if stmt.startswith("\\echo"):
        label = re.match(r"\\echo '(.*)'", stmt.split("\n")[0]).group(1)
        quoted = "'" + label.replace("'", "''") + "'"
        body.append(f"out := out || {quoted} || chr(10);")
        rest = stmt.split("\n", 1)
        if len(rest) > 1:
            stmt = rest[1].strip()
        else:
            continue
    if not in_block:
        if stmt == "begin;":
            in_block = True
            body.append("begin")
        continue   # helper definitions before the first block are replaced by HELPERS
    if stmt == "rollback;":
        in_block = False
        body.append("  raise exception 'END_BLOCK';\nexception when others then\n  if sqlerrm <> 'END_BLOCK' then out := out || 'ERROR ' || sqlerrm || chr(10); end if;\nend;")
        continue
    body.append("  " + convert(stmt))

body.append("raise exception 'ARCHIFLOW_RESULTS%', chr(10) || out;")
body.append("end")
sql = "do $archiflow_tests$\n" + "\n".join(body) + "\n$archiflow_tests$;\n"
(here / "remote_suite.sql").write_text(sql)
print(len(sql), "bytes")
