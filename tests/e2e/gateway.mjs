// TEST-ONLY local stand-in for Supabase's HTTP APIs (Auth, PostgREST, Storage) over the local
// Postgres test database. Every data request runs as role "authenticated" with the caller's JWT
// claims, exactly like PostgREST, so RLS, grants and triggers are the real ones from the migrations.
// Never deploy this; it has no real password hashing or token signing.
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SITE = path.join(ROOT, 'dist/live-test/index.html');
const PDFJS = ((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/pdfjs-dist/build');
const FILES = path.join(ROOT, 'tests/e2e/.storage');
fs.mkdirSync(FILES, { recursive: true });
const PG = ['-h', process.env.PGHOST || '/home/claude/pg', '-p', process.env.PGPORT || '54329', '-U', 'postgres', '-d', process.env.PGDB || 'af', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];

const passwords = new Map(); // email -> password
const refresh = new Map();   // refresh token -> user id
const signed = new Map();    // storage sign token -> {bucket, name}
export const mailbox = [];   // auth e-mails "sent" (confirmation / recovery links)
const DEFAULT_PW = 'Test-pass-1234';

function psql(sql) {
  return new Promise((resolve) => {
    const p = spawn('psql', PG);
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
    p.stdin.end('\\set VERBOSITY verbose\n' + sql);
  });
}
const lit = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const dq = (s) => { let tag = 'j' + crypto.randomBytes(4).toString('hex'); return `$${tag}$${s}$${tag}$`; };
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error('bad identifier ' + s); return `"${s}"`; };
function asRole(claims, body) {
  const role = claims ? 'authenticated' : 'anon';
  const c = claims ? JSON.stringify({ ...claims, role }) : JSON.stringify({ role: 'anon' });
  return `begin;\ndo $x$ begin perform set_config('request.jwt.claims', ${lit(c)}, true); perform set_config('role', ${lit(role)}, true); end $x$;\n${body};\ncommit;\n`;
}
function pgError(err) {
  const m = err.match(/ERROR:\s+([0-9A-Z]{5}):\s+([^\n]*)/) || err.match(/ERROR:\s+([^\n]*)/);
  if (!m) return { code: 'XX000', message: err.slice(0, 300) };
  return m.length === 3 ? { code: m[1], message: m[2] } : { code: 'XX000', message: m[1] };
}
function statusFor(code, authed) {
  if (code === '42501') return authed ? 403 : 401;
  if (code === '23505' || code === '23503') return 409;
  if (code === 'P0002' || code === '42883' || code === '42P01') return 404;
  if (code === '28000') return 403;
  return 400;
}
function jwt(user) {
  const b = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b({ alg: 'none', typ: 'JWT' })}.${b({ sub: user.id, email: user.email, role: 'authenticated', aal: user.aal || 'aal1', exp: Math.floor(Date.now() / 1000) + 3600, user_metadata: user.meta || {} })}.test`;
}
// ---- TOTP (RFC 6238), as Supabase Auth MFA: 30 s steps, 6 digits, SHA-1
const factorSecrets = new Map(); // factor id -> base32 secret
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32decode(s) { let bits = ''; for (const ch of s.replace(/=+$/, '').toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); }
export function totp(secret, t = Date.now()) {
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(Math.floor(t / 30000)));
  const h = crypto.createHmac('sha1', b32decode(secret)).update(ctr).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
function claimsOf(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { const p = JSON.parse(Buffer.from(h.slice(7).split('.')[1], 'base64url').toString()); if (p.exp < Date.now() / 1000) return 'expired'; return { sub: p.sub, email: p.email, aal: p.aal || 'aal1' }; } catch { return null; }
}
const send = (res, status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => r(Buffer.concat(ch))); });

async function userByEmail(email) {
  const r = await psql(`select coalesce((select row_to_json(u) from (select id, email, email_confirmed_at, raw_user_meta_data as meta from auth.users where lower(email) = lower(${lit(email)})) u)::text, '')`);
  return r.out ? JSON.parse(r.out) : null;
}
async function session(user) {
  const rt = crypto.randomBytes(16).toString('hex'); refresh.set(rt, user);
  return { access_token: jwt(user), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: rt, user: { id: user.id, email: user.email, user_metadata: user.meta || {} } };
}

// ---------------------------------------------------------------- auth
async function auth(req, res, url, body) {
  const route = url.pathname.replace('/auth/v1/', '');
  const j = body.length ? JSON.parse(body.toString()) : {};
  if (route === 'token' && url.searchParams.get('grant_type') === 'password') {
    const u = await userByEmail(j.email || '');
    const pw = passwords.get((j.email || '').toLowerCase()) || (u && u.id.startsWith('11111111-') ? DEFAULT_PW : null);
    if (!u || pw !== j.password) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    if (!u.email_confirmed_at && !u.id.startsWith('11111111-')) return send(res, 400, { code: 400, error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
    return send(res, 200, await session(u));
  }
  if (route === 'token' && url.searchParams.get('grant_type') === 'refresh_token') {
    const u = refresh.get(j.refresh_token); if (!u) return send(res, 400, { error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
    refresh.delete(j.refresh_token); return send(res, 200, await session(u));
  }
  if (route === 'signup') {
    if (await userByEmail(j.email)) return send(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    if (!j.password || j.password.length < 6) return send(res, 422, { error_code: 'weak_password', msg: 'Password should be at least 6 characters' });
    const id = crypto.randomUUID();
    const r = await psql(`set role supabase_auth_admin; insert into auth.users (id, email, raw_user_meta_data) values (${lit(id)}, ${lit(j.email)}, ${lit(JSON.stringify(j.data || {}))}::jsonb);`);
    if (r.code) return send(res, 500, { msg: r.err });
    passwords.set(j.email.toLowerCase(), j.password);
    const token = crypto.randomBytes(12).toString('hex');
    mailbox.push({ to: j.email, kind: 'confirm', token, redirect: url.searchParams.get('redirect_to') || '/' });
    return send(res, 200, { id, email: j.email, confirmation_sent_at: new Date().toISOString(), user_metadata: j.data || {} });
  }
  if (route === 'resend') return send(res, 200, {});
  if (route === 'recover') {
    const u = await userByEmail(j.email || '');
    if (u) mailbox.push({ to: j.email, kind: 'recovery', user: u, redirect: url.searchParams.get('redirect_to') || '/' });
    return send(res, 200, {});
  }
  if (route === 'logout') return send(res, 204);
  // ---- two-factor (Supabase Auth MFA subset)
  if (route === 'user' && req.method === 'GET') {
    const c = claimsOf(req); if (!c || c === 'expired') return send(res, 401, { msg: 'unauthorized' });
    const r = await psql(`select coalesce(json_agg(json_build_object('id', id, 'factor_type', factor_type, 'status', status, 'friendly_name', friendly_name, 'created_at', created_at)), '[]') from auth.mfa_factors where user_id = ${lit(c.sub)}`);
    return send(res, 200, { id: c.sub, email: c.email, factors: JSON.parse(r.out || '[]') });
  }
  if (route.startsWith('factors')) {
    const c = claimsOf(req); if (!c || c === 'expired') return send(res, 401, { msg: 'unauthorized' });
    const [, fid, step] = route.split('/');
    if (!fid && req.method === 'POST') {
      const secret = Array.from(crypto.randomBytes(20), (x) => B32[x & 31]).join('');
      const r = await psql(`insert into auth.mfa_factors (user_id, friendly_name, factor_type, status) values (${lit(c.sub)}, ${lit(j.friendly_name || '')}, 'totp', 'unverified') returning id`);
      const id = r.out.split('\n').pop(); factorSecrets.set(id, secret);
      const uri = `otpauth://totp/${encodeURIComponent(j.issuer || 'ArchiFlow')}:${encodeURIComponent(c.email)}?secret=${secret}&issuer=${encodeURIComponent(j.issuer || 'ArchiFlow')}`;
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#fff"/><rect x="20" y="20" width="140" height="140" fill="#000"/></svg>';
      return send(res, 200, { id, type: 'totp', totp: { qr_code: 'data:image/svg+xml;utf-8,' + encodeURIComponent(svg), secret, uri } });
    }
    const own = await psql(`select status from auth.mfa_factors where id = ${lit(fid)} and user_id = ${lit(c.sub)}`);
    if (!own.out) return send(res, 404, { error_code: 'mfa_factor_not_found', msg: 'Factor not found' });
    if (step === 'challenge') return send(res, 200, { id: crypto.randomUUID(), type: 'totp', expires_at: Math.floor(Date.now() / 1000) + 300 });
    if (step === 'verify') {
      const s = factorSecrets.get(fid); const now = Date.now();
      if (!s || ![now - 30000, now, now + 30000].some((t) => totp(s, t) === String(j.code))) return send(res, 422, { error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
      await psql(`update auth.mfa_factors set status = 'verified', updated_at = now() where id = ${lit(fid)}`);
      const u = await userByEmail(c.email); return send(res, 200, await session({ ...u, aal: 'aal2' }));
    }
    if (!step && req.method === 'DELETE') {
      if (own.out === 'verified' && c.aal !== 'aal2') return send(res, 403, { error_code: 'insufficient_aal', msg: 'AAL2 required to unenroll verified factor' });
      await psql(`delete from auth.mfa_factors where id = ${lit(fid)}`); factorSecrets.delete(fid);
      return send(res, 200, { id: fid });
    }
  }
  if (route === 'user' && req.method === 'PUT') {
    const c = claimsOf(req); if (!c || c === 'expired') return send(res, 401, { msg: 'unauthorized' });
    passwords.set(c.email.toLowerCase(), j.password); return send(res, 200, { id: c.sub, email: c.email });
  }
  return send(res, 404, { msg: 'not emulated: ' + route });
}

// ---------------------------------------------------------------- PostgREST subset
const procCache = new Map();
async function proc(fn) {
  if (procCache.has(fn)) return procCache.get(fn);
  const r = await psql(`select row_to_json(x) from (select p.proretset as setof, p.prorettype::regtype::text as ret, p.proargnames as names, array(select format_type(t, null) from unnest(p.proargtypes) t) as types from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = ${lit(fn)} limit 1) x`);
  const info = r.out ? JSON.parse(r.out) : null; procCache.set(fn, info); return info;
}
function where(url) {
  const out = [];
  for (const [k, v] of url.searchParams) {
    if (['select', 'on_conflict', 'order', 'limit'].includes(k)) continue;
    const col = 't.' + ident(k);
    if (v === 'is.null') out.push(`${col} is null`);
    else if (v.startsWith('eq.')) out.push(`${col} = ${lit(decodeURIComponent(v.slice(3)))}`);
    else if (v.startsWith('in.(')) out.push(`${col} in (${v.slice(4, -1).split(',').map((x) => lit(decodeURIComponent(x))).join(',')})`);
    else throw new Error('filter not emulated: ' + v);
  }
  return out.length ? ' where ' + out.join(' and ') : '';
}
async function rest(req, res, url, body) {
  const claims = claimsOf(req);
  if (claims === 'expired') return send(res, 401, { code: 'PGRST301', message: 'JWT expired' });
  const authed = !!claims;
  const rel = url.pathname.replace('/rest/v1/', '');
  const prefer = req.headers.prefer || '';
  let sql;
  try {
    if (rel.startsWith('rpc/')) {
      const fn = rel.slice(4); const info = await proc(fn);
      if (!info) return send(res, 404, { code: 'PGRST202', message: 'function not found' });
      const j = body.length ? JSON.parse(body.toString()) : {};
      const args = (info.names || []).map((n, i) => (n in j ? `${ident(n)} => ${j[n] === null ? 'null' : info.types[i] === 'jsonb' ? dq(JSON.stringify(j[n])) + '::jsonb' : `${lit(typeof j[n] === 'object' ? JSON.stringify(j[n]) : j[n])}::${info.types[i]}`}` : null)).filter(Boolean).join(', ');
      sql = info.setof ? `select coalesce(jsonb_agg(to_jsonb(r_)), '[]')::text from public.${ident(fn)}(${args}) r_` : info.ret === 'void' ? `select public.${ident(fn)}(${args}); select ''` : `select coalesce(to_jsonb(public.${ident(fn)}(${args}))::text, 'null')`;
    } else {
      const table = ident(rel);
      if (req.method === 'GET') sql = `select coalesce(jsonb_agg(to_jsonb(t)), '[]')::text from public.${table} t${where(url)}`;
      else if (req.method === 'POST') {
        const rows = [].concat(JSON.parse(body.toString()));
        const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].map(ident);
        let ins = `insert into public.${table} as t (${cols.join(',')}) select ${cols.join(',')} from jsonb_populate_recordset(null::public.${table}, ${dq(JSON.stringify(rows))}::jsonb)`;
        const oc = url.searchParams.get('on_conflict');
        if (oc) { const keys = oc.split(',').map(ident); const upd = cols.filter((c) => !keys.includes(c)); ins += ` on conflict (${keys.join(',')}) do ${upd.length ? 'update set ' + upd.map((c) => `${c} = excluded.${c}`).join(', ') : 'nothing'}`; }
        sql = prefer.includes('return=representation') ? `with r as (${ins} returning t.*) select coalesce(jsonb_agg(to_jsonb(r)), '[]')::text from r` : `${ins}; select ''`;
      } else if (req.method === 'PATCH') {
        const patch = JSON.parse(body.toString()); const cols = Object.keys(patch).map(ident);
        const upd = `update public.${table} t set ${cols.map((c) => `${c} = v.${c}`).join(', ')} from jsonb_populate_record(null::public.${table}, ${dq(JSON.stringify(patch))}::jsonb) v${where(url)}`;
        sql = prefer.includes('return=representation') ? `with r as (${upd} returning t.*) select coalesce(jsonb_agg(to_jsonb(r)), '[]')::text from r` : `${upd}; select ''`;
      } else if (req.method === 'DELETE') sql = `delete from public.${table} t${where(url)}; select ''`;
      else return send(res, 405, { message: 'method' });
    }
  } catch (e) { return send(res, 400, { code: 'PGRST100', message: String(e.message) }); }
  const r = await psql(asRole(claims && { sub: claims.sub, email: claims.email }, sql));
  if (r.code) { const e = pgError(r.err); if (process.env.GW_LOG) console.log('ERR', req.method, rel, e.code, e.message); return send(res, statusFor(e.code, authed), { code: e.code, message: e.message, details: null, hint: null }); }
  if (process.env.GW_LOG) console.log(req.method, rel, (r.out || '').length);
  const lines = r.out.split('\n'); const last = lines[lines.length - 1] || '';
  return last ? send(res, 200, last) : send(res, req.method === 'POST' && !rel.startsWith('rpc/') ? 201 : 204);
}

// ---------------------------------------------------------------- storage subset
async function storage(req, res, url, body) {
  const claims = claimsOf(req);
  const rel = decodeURIComponent(url.pathname.replace('/storage/v1/object/', ''));
  if (req.method === 'GET' && rel.startsWith('sign/')) {
    const t = signed.get(url.searchParams.get('token')); if (!t) return send(res, 400, { statusCode: '403', error: 'InvalidJWT', message: 'invalid signature' });
    const file = path.join(FILES, t.bucket, t.name); if (!fs.existsSync(file)) return send(res, 404, { message: 'missing' });
    res.writeHead(200, { 'Content-Type': t.mime || 'application/octet-stream' }); return fs.createReadStream(file).pipe(res);
  }
  if (!claims || claims === 'expired') return send(res, 400, { statusCode: '403', error: 'Unauthorized', message: 'unauthorized' });
  if (req.method === 'POST' && rel.startsWith('sign/')) {
    const [bucket, ...rest] = rel.slice(5).split('/'); const name = rest.join('/');
    const r = await psql(asRole(claims, `select coalesce((select coalesce(o.metadata->>'mimetype', 'application/octet-stream') from storage.objects o where o.bucket_id = ${lit(bucket)} and o.name = ${lit(name)}), '__none__')`));
    const last = r.out.split('\n').pop();
    if (r.code || last === '__none__') return send(res, 400, { statusCode: '404', error: 'not_found', message: 'Object not found' });
    const token = crypto.randomBytes(12).toString('hex'); signed.set(token, { bucket, name, mime: last });
    return send(res, 200, { signedURL: `/object/sign/${bucket}/${rest.map(encodeURIComponent).join('/')}?token=${token}` });
  }
  if (req.method === 'DELETE' && !rel.includes('/')) {
    // like Supabase: DELETE /object/{bucket} with {"prefixes": [...]} removes what the caller's policies allow
    const names = (JSON.parse(body.toString() || '{}').prefixes || []).map(String);
    const r = await psql(asRole(claims, `with d as (delete from storage.objects where bucket_id = ${lit(rel)} and name in (select jsonb_array_elements_text(${dq(JSON.stringify(names))}::jsonb)) returning name) select coalesce(json_agg(name), '[]') from d`));
    if (r.code) { const e = pgError(r.err); return send(res, 400, { statusCode: '403', error: 'Unauthorized', message: e.message }); }
    const gone = JSON.parse(r.out.split('\n').pop() || '[]');
    for (const n of gone) { try { fs.unlinkSync(path.join(FILES, rel, n)); } catch { /* not on disk */ } }
    return send(res, 200, gone.map((name) => ({ name, bucket_id: rel })));
  }
  if (req.method === 'POST') {
    const [bucket, ...rest] = rel.split('/'); const name = rest.join('/');
    const mime = req.headers['content-type'] || 'application/octet-stream';
    const b = await psql(`select coalesce((select row_to_json(x) from (select file_size_limit, allowed_mime_types from storage.buckets where id = ${lit(bucket)}) x)::text, '')`);
    if (!b.out) return send(res, 400, { statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' });
    const bk = JSON.parse(b.out);
    if (bk.allowed_mime_types && !bk.allowed_mime_types.includes(mime)) return send(res, 400, { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${mime} is not supported` });
    if (bk.file_size_limit && body.length > bk.file_size_limit) return send(res, 400, { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' });
    const r = await psql(asRole(claims, `insert into storage.objects (bucket_id, name, owner, metadata) values (${lit(bucket)}, ${lit(name)}, ${lit(claims.sub)}, ${dq(JSON.stringify({ size: body.length, mimetype: mime }))}::jsonb)`));
    if (r.code) { const e = pgError(r.err); return send(res, 400, { statusCode: '403', error: 'Unauthorized', message: e.message }); }
    const file = path.join(FILES, bucket, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body);
    return send(res, 200, { Key: `${bucket}/${name}`, Id: crypto.randomUUID() });
  }
  return send(res, 404, { message: 'not emulated' });
}

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    const body = await readBody(req);
    if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url, body);
    if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url, body);
    if (url.pathname.startsWith('/storage/v1/object/')) return await storage(req, res, url, body);
    if (url.pathname === '/__test/mailbox') return send(res, 200, mailbox);
    if (url.pathname === '/__test/totp') return send(res, 200, { code: totp(factorSecrets.get(url.searchParams.get('factor')) || '') });
    if (url.pathname === '/__test/confirm') { await psql(`update auth.users set email_confirmed_at = now() where lower(email) = lower(${lit(url.searchParams.get('email'))})`); const m = mailbox.find((x) => x.to === url.searchParams.get('email')); const u = await userByEmail(url.searchParams.get('email')); const s = await session(u); return send(res, 200, { link: `${m?.redirect || '/'}#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&type=signup` }); }
    if (url.pathname === '/__test/recovery') { const u = await userByEmail(url.searchParams.get('email')); const s = await session(u); return send(res, 200, { link: `/#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&type=recovery` }); }
    if (url.pathname === '/__test/sql') { const r = await psql(body.toString()); return send(res, 200, r); }
    if (url.pathname.startsWith('/_pdfjs/')) { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return fs.createReadStream(path.join(PDFJS, path.basename(url.pathname))).pipe(res); }
    const STATIC_TYPES = { '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml' };
    const sf = path.join(path.dirname(SITE), path.basename(url.pathname));
    if (req.method === 'GET' && STATIC_TYPES[path.extname(url.pathname)] && url.pathname.split('/').length === 2 && fs.existsSync(sf)) { res.writeHead(200, { 'Content-Type': STATIC_TYPES[path.extname(url.pathname)] }); return fs.createReadStream(sf).pipe(res); }
    if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(SITE)); }
    send(res, 404, {});
  } catch (e) { console.error(e); send(res, 500, { message: String(e) }); }
});
server.listen(PORT, () => { fs.writeFileSync('/tmp/claude-0/gw.pid', String(process.pid)); console.log('gateway on', PORT); });
