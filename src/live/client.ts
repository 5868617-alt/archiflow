// Minimal Supabase client (Auth + PostgREST + Storage) over fetch.
// Uses only the public, documented HTTP APIs so the page needs no extra library.
// The publishable key is public by design: every request is still checked by RLS on the server.

export interface Session { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email: string; user_metadata?: any } }
export interface ApiError { message: string; code?: string; status?: number; details?: string; hint?: string }

const SKEY = 'archiflow.session.v1';

export class Supa {
  url: string; key: string; session: Session | null = null;
  private refreshing: Promise<void> | null = null;
  private listeners = new Set<(s: Session | null) => void>();

  constructor(url: string, key: string) {
    this.url = url.replace(/\/$/, ''); this.key = key;
    try { const raw = localStorage.getItem(SKEY); if (raw) this.session = JSON.parse(raw); } catch { /* storage unavailable */ }
  }
  onAuth(fn: (s: Session | null) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private setSession(s: Session | null) {
    this.session = s;
    try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch { /* ignore */ }
    this.listeners.forEach((f) => f(s));
  }
  private baseHeaders(auth = true): Record<string, string> {
    const h: Record<string, string> = { apikey: this.key };
    if (auth && this.session) h.Authorization = `Bearer ${this.session.access_token}`;
    return h;
  }
  private static async err(r: Response): Promise<ApiError> {
    let body: any = {};
    try { body = await r.json(); } catch { /* not json */ }
    const message = body.message || body.msg || body.error_description || body.error || `HTTP ${r.status}`;
    return { message: String(message), code: body.code || body.error_code, status: r.status, details: body.details, hint: body.hint };
  }

  // ------------------------------------------------------------------ auth
  private async auth(path: string, body: any, query = ''): Promise<any> {
    const r = await fetch(`${this.url}/auth/v1/${path}${query}`, { method: 'POST', headers: { ...this.baseHeaders(false), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw await Supa.err(r);
    return r.status === 204 ? null : r.json();
  }
  private toSession(d: any): Session {
    return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: d.user };
  }
  async signIn(email: string, password: string) {
    const d = await this.auth('token', { email, password }, '?grant_type=password');
    this.setSession(this.toSession(d));
    return this.session!;
  }
  /** returns 'confirm' when the project requires e-mail confirmation (no session yet) */
  async signUp(email: string, password: string, fullName: string, redirectTo: string): Promise<'confirm' | 'session'> {
    const d = await this.auth('signup', { email, password, data: { full_name: fullName } }, `?redirect_to=${encodeURIComponent(redirectTo)}`);
    if (d && d.access_token) { this.setSession(this.toSession(d)); return 'session'; }
    return 'confirm';
  }
  async recover(email: string, redirectTo: string) { await this.auth('recover', { email }, `?redirect_to=${encodeURIComponent(redirectTo)}`); }
  async resend(email: string, redirectTo: string) { await this.auth('resend', { type: 'signup', email }, `?redirect_to=${encodeURIComponent(redirectTo)}`); }
  async updatePassword(password: string) {
    await this.ensureFresh();
    const r = await fetch(`${this.url}/auth/v1/user`, { method: 'PUT', headers: { ...this.baseHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!r.ok) throw await Supa.err(r);
  }
  async signOut() {
    try { if (this.session) await fetch(`${this.url}/auth/v1/logout`, { method: 'POST', headers: this.baseHeaders() }); } catch { /* offline: still clear locally */ }
    this.setSession(null);
  }
  /** Reads tokens that Supabase Auth puts in the URL fragment after e-mail confirmation / password recovery links. */
  consumeUrlTokens(): { type?: string; error?: string } {
    const h = location.hash.replace(/^#\/?/, '');
    if (!/(^|&)(access_token|error_description|error)=/.test(h)) return {};
    const p = new URLSearchParams(h);
    history.replaceState(null, '', location.pathname + location.search);
    if (p.get('error') || p.get('error_description')) return { error: p.get('error_description') || p.get('error') || 'error' };
    const access = p.get('access_token'); const refresh = p.get('refresh_token');
    if (access && refresh) {
      let user: any = {};
      try { const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); user = { id: payload.sub, email: payload.email, user_metadata: payload.user_metadata }; } catch { /* keep empty */ }
      this.setSession({ access_token: access, refresh_token: refresh, expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600), user });
    }
    return { type: p.get('type') || undefined };
  }
  async ensureFresh() {
    const s = this.session;
    if (!s) return;
    if (s.expires_at - 60 > Date.now() / 1000) return;
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try { const d = await this.auth('token', { refresh_token: s.refresh_token }, '?grant_type=refresh_token'); this.setSession(this.toSession(d)); }
        catch (e: any) { if (e.status && e.status < 500) this.setSession(null); else throw e; }
        finally { this.refreshing = null; }
      })();
    }
    await this.refreshing;
  }

  // ------------------------------------------------------------------ data
  private async rest(method: string, path: string, body?: any, prefer = 'return=representation'): Promise<any> {
    await this.ensureFresh();
    const h: Record<string, string> = { ...this.baseHeaders(), 'Content-Type': 'application/json' };
    if (prefer) h.Prefer = prefer;
    const r = await fetch(`${this.url}/rest/v1/${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) throw await Supa.err(r);
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }
  static filter(match: Record<string, any>) {
    return Object.entries(match).map(([k, v]) => `${encodeURIComponent(k)}=${v === null ? 'is.null' : 'eq.' + encodeURIComponent(String(v))}`).join('&');
  }
  rpc(fn: string, args: Record<string, any> = {}) { return this.rest('POST', `rpc/${fn}`, args, ''); }
  // return=minimal: RLS select policies that look the row up by id can't see a row inside the same
  // statement, so asking for the row back would fail. Use insertReturning only where the row is needed.
  insert(table: string, rows: any | any[]) { return this.rest('POST', table, rows, 'return=minimal'); }
  insertReturning(table: string, rows: any | any[]) { return this.rest('POST', table, rows); }
  update(table: string, match: Record<string, any>, patch: any) { return this.rest('PATCH', `${table}?${Supa.filter(match)}`, patch, 'return=minimal'); }
  updateIn(table: string, col: string, values: string[], patch: any) { return this.rest('PATCH', `${table}?${encodeURIComponent(col)}=in.(${values.map(encodeURIComponent).join(',')})`, patch, 'return=minimal'); }
  remove(table: string, match: Record<string, any>) { return this.rest('DELETE', `${table}?${Supa.filter(match)}`, undefined, 'return=minimal'); }
  upsert(table: string, rows: any | any[], onConflict: string) { return this.rest('POST', `${table}?on_conflict=${onConflict}`, rows, 'return=minimal,resolution=merge-duplicates'); }

  // ------------------------------------------------------------------ storage
  private static objPath(p: string) { return p.split('/').map(encodeURIComponent).join('/'); }
  async upload(bucket: string, path: string, file: Blob, contentType?: string) {
    await this.ensureFresh();
    const r = await fetch(`${this.url}/storage/v1/object/${bucket}/${Supa.objPath(path)}`, {
      method: 'POST', headers: { ...this.baseHeaders(), 'Content-Type': contentType || file.type || 'application/octet-stream', 'x-upsert': 'false', 'cache-control': 'max-age=3600' }, body: file,
    });
    if (!r.ok) throw await Supa.err(r);
    return path;
  }
  async signedUrl(bucket: string, path: string, expiresIn = 300, download?: string): Promise<string> {
    await this.ensureFresh();
    const r = await fetch(`${this.url}/storage/v1/object/sign/${bucket}/${Supa.objPath(path)}`, { method: 'POST', headers: { ...this.baseHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn }) });
    if (!r.ok) throw await Supa.err(r);
    const d = await r.json();
    const rel: string = d.signedURL || d.signedUrl;
    const full = rel.startsWith('http') ? rel : `${this.url}/storage/v1${rel.startsWith('/') ? '' : '/'}${rel}`;
    return download ? `${full}&download=${encodeURIComponent(download)}` : full;
  }
}
