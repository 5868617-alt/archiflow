// Live store: same context shape the screens already use (db, me, run, nav …), backed by Supabase.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as T from '../data/types';
import { StoreCtx, type Ctx, type Toast, defaultPathFor, makeSeedDB } from '../data/store';
import { A } from '../data/api';
import { Supa, type Session } from './client';
import { fromSnapshot, E, stamp, day } from './map';
import { push, DEMO_ONLY } from './sync';
import { friendlyError } from './errors';
import { LIVE_CONFIG } from './config';

export interface LiveContext { key: string; kind: 'office' | 'client' | 'admin'; officeId: string | null; officeName: string; role: T.Role; clientId?: string; contactId?: string }
export interface LiveApi {
  api: Supa; session: Session | null; status: 'boot' | 'anon' | 'loading' | 'ready' | 'no-context' | 'error'; error?: string;
  contexts: LiveContext[]; current: LiveContext | null; switchContext: (key: string) => void;
  signOut: () => Promise<void>; reload: () => Promise<void>; afterAuth: () => Promise<void>; saving: boolean;
  landing: null | { kind: 'verified' | 'expired'; name?: string; email?: string }; clearLanding: () => void;
  upload: (bucket: string, projectId: string | null, file: File) => Promise<{ path: string; size: number }>;
  fileUrl: (bucket: string, path: string, download?: string) => Promise<string>;
  appUrl: string;
  /** queue a server call after any pending writes (keeps order with run()) */
  enqueue: (fn: (api: Supa) => Promise<any>, ok?: string, kind?: Toast['kind']) => Promise<boolean>;
}

const ACTION_NAMES = new Map<any, string>(Object.entries(A).map(([k, f]) => [f, k]));
const CTX_KEY = 'archiflow.context.v1';
const PUBLIC = new Set(['login', 'register', 'forgot', 'reset-password', 'accept-invite', 'confirm', 'pricing']);

function readPathFromUrl(): string | null {
  try {
    const h = location.hash.replace(/^#/, '');
    if (h.startsWith('/')) return h;
    const p = location.pathname.replace(/\/index\.html$/, '');
    if (p && p !== '/' && /^\/[a-z]/.test(p)) { const route = p + location.search; history.replaceState(null, '', '/#' + route); return route; }
  } catch { /* ignore */ }
  return null;
}
const safeName = (name: string) => {
  const m = name.match(/\.([A-Za-z0-9]{1,8})$/); const ext = m ? m[1].toLowerCase() : 'bin';
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${base || 'file'}.${ext}`;
};

export function LiveStoreProvider({ children }: { children: any }) {
  const api = useRef(new Supa(LIVE_CONFIG.url(), LIVE_CONFIG.key)).current;
  const empty = useMemo(() => emptyDB(), []);
  const [db, setDb] = useState<any>(empty);
  const dbRef = useRef<any>(empty);
  const [session, setSession] = useState<Session | null>(api.session);
  const [status, setStatus] = useState<LiveApi['status']>('boot');
  const [error, setError] = useState<string>();
  const [contexts, setContexts] = useState<LiveContext[]>([]);
  const [ctxKey, setCtxKey] = useState<string | null>(() => { try { return localStorage.getItem(CTX_KEY); } catch { return null; } });
  const [path, setPath] = useState<string>(() => readPathFromUrl() || '/login');
  const [history, setHistory] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // what the user arrived from an e-mail link: shown as a full landing page before entering the app
  const [landing, setLanding] = useState<null | { kind: 'verified' | 'expired'; name?: string; email?: string }>(null);
  const [theme, setThemeState] = useState<string>(() => { try { return localStorage.getItem('archiflow.theme') || 'system'; } catch { return 'system'; } });
  const [saving, setSaving] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const meRef = useRef<T.User | null>(null);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok', undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'bad' ? 6000 : undo ? 6500 : 3600);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const noteLanding = (t: { type?: string; error?: string }) => {
    const u: any = api.session?.user || {};
    if (t.error) setLanding({ kind: 'expired' });
    else if (t.type === 'signup' || t.type === 'email') setLanding({ kind: 'verified', name: u.user_metadata?.full_name, email: u.email });
  };
  const go = useCallback((to: string, replace = false) => {
    setPath(to);
    try { const url = '#' + to; if (replace) history_replace(url); else window.history.pushState(null, '', url); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const f = () => {
      if (/access_token=|error_description=/.test(location.hash)) { const t = api.consumeUrlTokens(); if (t.type === 'recovery') { go('/reset-password', true); return; } noteLanding(t); bootRef.current({ landing: true }); return; }
      const p = readPathFromUrl(); if (p) setPath(p);
    };
    window.addEventListener('popstate', f); window.addEventListener('hashchange', f);
    return () => { window.removeEventListener('popstate', f); window.removeEventListener('hashchange', f); };
  }, []); // eslint-disable-line
  useEffect(() => { try { localStorage.setItem('archiflow.theme', theme); } catch { /* ignore */ } const el = document.documentElement; if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => api.onAuth((s) => setSession(s)), [api]);

  const current = contexts.find((c) => c.key === ctxKey) || contexts[0] || null;

  const load = useCallback(async (cx: LiveContext | null, uid: string) => {
    if (!cx) return;
    const snap = await api.rpc('app_snapshot', { p_office: cx.officeId });
    const data: any = fromSnapshot(snap, { userId: uid, officeId: cx.officeId, role: cx.role, clientId: cx.clientId, contactId: cx.contactId, isSuperAdmin: cx.kind === 'admin' });
    if (cx.kind === 'admin') {
      const rows: any[] = (await api.rpc('admin_offices_overview')) || [];
      data.platformOffices = rows.map((o) => ({ id: o.id, name: o.name, city: o.city || '', ownerName: o.owner_name || '—', ownerEmail: o.owner_email || '', planId: o.plan_id || 'starter', status: E.sub.ui(o.status) as any, users: Number(o.users), projects: Number(o.projects),
        storageGb: Math.round((Number(o.storage_bytes) / 1073741824) * 10) / 10, createdAt: day(o.created_at), lastActive: stamp(o.last_activity) || stamp(o.created_at), mrr: Number(o.mrr) || 0 }));
      data.officeSubscription = { ...data.officeSubscription, status: 'פעיל' };
    }
    dbRef.current = data; setDb(data);
  }, [api]);

  const resolveContexts = useCallback(async (): Promise<{ list: LiveContext[]; uid: string } | null> => {
    const c: any = await api.rpc('my_context');
    if (!c) return null;
    const list: LiveContext[] = [];
    for (const m of c.memberships || []) list.push({ key: 'o:' + m.office_id, kind: 'office', officeId: m.office_id, officeName: m.office_name, role: m.role });
    for (const ct of c.client_contacts || []) list.push({ key: 'c:' + ct.contact_id, kind: 'client', officeId: ct.office_id, officeName: ct.office_name, role: 'client', clientId: ct.client_id, contactId: ct.contact_id });
    if (c.is_super_admin) list.push({ key: 'admin', kind: 'admin', officeId: null, officeName: 'ArchiFlow – ניהול פלטפורמה', role: 'super_admin' });
    return { list, uid: c.user_id };
  }, [api]);

  const boot = useCallback(async (opts: { landing?: boolean } = {}) => {
    if (!api.session) { setStatus('anon'); setContexts([]); const seg = path.split(/[/?]/)[1] || ''; if (!PUBLIC.has(seg)) go('/login', true); return; }
    setStatus('loading');
    try {
      const r = await resolveContexts();
      if (!r) { await api.signOut(); setStatus('anon'); go('/login', true); return; }
      setContexts(r.list);
      if (!r.list.length) { setStatus('no-context'); const seg = path.split(/[/?]/)[1]; if (seg !== 'accept-invite') go('/onboarding', true); return; }
      const cx = r.list.find((x) => x.key === ctxKey) || r.list[0];
      setCtxKey(cx.key);
      await load(cx, r.uid);
      setStatus('ready');
      const seg = path.split(/[/?]/)[1] || '';
      if (opts.landing || PUBLIC.has(seg) || seg === 'onboarding' || !seg) go(defaultPathFor({ role: cx.role } as any), true);
    } catch (e: any) {
      if (e?.status === 401) { await api.signOut(); setStatus('anon'); go('/login', true); return; }
      setError(friendlyError(e)); setStatus('error');
    }
  }, [api, ctxKey, load, resolveContexts, go, path]);

  const bootRef = useRef(boot); bootRef.current = boot;
  // first run: tokens from e-mail links, then load
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return; booted.current = true;
    const t = api.consumeUrlTokens();
    if (t.type === 'recovery') { setStatus(api.session ? 'ready' : 'anon'); go('/reset-password', true); return; }
    noteLanding(t);
    boot({ landing: !!t.type && !readPathFromUrl()?.startsWith('/accept-invite') });
  }, []); // eslint-disable-line

  const reload = useCallback(async () => {
    if (!api.session || !current || pending.current > 0) return;
    const r = await resolveContexts().catch(() => null);
    if (r) setContexts(r.list);
    const cx = r?.list.find((x) => x.key === current.key) || r?.list[0] || null;
    if (!cx) { setStatus('no-context'); go('/onboarding', true); return; }
    await load(cx, r!.uid).catch((e) => toast(friendlyError(e), 'bad'));
  }, [api, current, load, resolveContexts, toast, go]);

  // refresh when the tab regains focus, and every 2 minutes while visible
  useEffect(() => {
    if (status !== 'ready') return;
    const onFocus = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onFocus);
    const iv = setInterval(onFocus, 120000);
    return () => { document.removeEventListener('visibilitychange', onFocus); clearInterval(iv); };
  }, [status, reload]);

  const me: T.User = useMemo(() => {
    const uid = api.session?.user?.id;
    const u = (db.users as T.User[]).find((x) => x.id === uid);
    return u || { id: uid || 'anon', name: api.session?.user?.user_metadata?.full_name || api.session?.user?.email || 'אורח/ת', email: api.session?.user?.email || '', title: '', color: '#3E6A8A', role: current?.role || 'member', status: 'פעיל', joinedAt: '', lastActive: '', officeId: current?.officeId || undefined, clientId: current?.clientId };
  }, [db.users, session, current]); // eslint-disable-line
  meRef.current = me;

  const run = useCallback((fn: any, ...args: any[]) => {
    const name = ACTION_NAMES.get(fn) || 'inline';
    if (DEMO_ONLY.has(name)) { toast('הפעולה הזו קיימת רק בגרסת ההדגמה.', 'info'); return undefined; }
    const before = dbRef.current;
    const draft = structuredClone(before);
    const out = fn(draft, { me: meRef.current }, ...args);
    dbRef.current = draft; setDb(draft);
    pending.current++; setSaving(true);
    queue.current = queue.current.then(async () => {
      try { await push({ api, officeId: current?.officeId || null, me: meRef.current!, action: name, args }, before, draft); }
      catch (e: any) { toast(friendlyError(e), 'bad'); if ((globalThis as any).__AF_DEBUG) console.error('[archiflow] write failed', name, e); }
      finally {
        pending.current--;
        if (pending.current === 0) { setSaving(false); await reload(); }
      }
    });
    return out;
  }, [api, current, toast, reload]);

  const nav = useCallback((to: string) => { setHistory((h) => [...h.slice(-30), path]); go(to); try { window.scrollTo({ top: 0 }); } catch { /* ignore */ } }, [path, go]);
  const back = useCallback(() => { setHistory((h) => { const prev = h[h.length - 1]; if (prev) go(prev); return h.slice(0, -1); }); }, [go]);

  const switchContext = useCallback((key: string) => {
    const cx = contexts.find((c) => c.key === key); if (!cx) return;
    setCtxKey(key); try { localStorage.setItem(CTX_KEY, key); } catch { /* ignore */ }
    setStatus('loading');
    load(cx, api.session!.user.id).then(() => { setStatus('ready'); go(defaultPathFor({ role: cx.role } as any)); }).catch((e) => { setError(friendlyError(e)); setStatus('error'); });
  }, [contexts, load, api, go]);

  const signOut = useCallback(async () => { await api.signOut(); dbRef.current = empty; setDb(empty); setContexts([]); setStatus('anon'); go('/login', true); }, [api, empty, go]);

  const live: LiveApi = {
    api, session, status, error, contexts, current, switchContext, signOut, reload, saving,
    landing, clearLanding: () => setLanding(null),
    afterAuth: () => boot({ landing: true }),
    upload: async (bucket, projectId, file) => {
      const office = current?.officeId; if (!office) throw { message: 'no office' };
      const path = `${office}/${projectId || 'office'}/${crypto.randomUUID()}/${safeName(file.name)}`;
      await api.upload(bucket, path, file, file.type || undefined);
      return { path, size: file.size };
    },
    fileUrl: (bucket, p, download) => api.signedUrl(bucket, p, 600, download),
    enqueue: (fn, ok, kind = 'ok') => new Promise<boolean>((resolve) => {
      pending.current++; setSaving(true);
      queue.current = queue.current.then(async () => {
        let okFlag = false;
        try { await fn(api); okFlag = true; if (ok) toast(ok, kind); } catch (e: any) { toast(friendlyError(e), 'bad'); }
        finally { pending.current--; if (pending.current === 0) { setSaving(false); await reload(); } resolve(okFlag); }
      });
    }),
    appUrl: LIVE_CONFIG.appUrl(),
  };

  const value = useMemo<Ctx>(() => ({
    db, me, role: me.role, path, nav, back, run, toast, toasts, dismissToast,
    switchUser: (k: string) => switchContext(k), reset: () => reload(), theme, setTheme: setThemeState, live,
  } as any), [db, me, path, nav, back, run, toast, toasts, dismissToast, switchContext, reload, theme, live]); // eslint-disable-line
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

function history_replace(url: string) { window.history.replaceState(null, '', url); }

function emptyDB() {
  const d: any = makeSeedDB();
  for (const k of Object.keys(d)) if (Array.isArray(d[k]) && !['helpArticles', 'faqs', 'subscriptionPlans'].includes(k)) d[k] = [];
  d.office = { id: '', name: '', legalName: '', city: '', address: '', phone: '', email: '', vatId: '', createdAt: '', logoText: 'AF', specialties: [] };
  d.officeSubscription = { ...d.officeSubscription, history: [], seatsUsed: 0, storageUsedGb: 0 };
  return d;
}
