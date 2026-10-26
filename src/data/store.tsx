// Demo state container. In production this is replaced by Supabase queries;
// UI components only talk to `db` (read) and `run(action, ...)` (write).
import { celebrate } from './api';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as seed from './seed';
import type * as T from './types';

export function makeSeedDB() {
  return JSON.parse(JSON.stringify({
    office: seed.office, users: seed.users, memberships: seed.memberships, invitations: seed.invitations, clients: seed.clients,
    projects: seed.projects, assignments: seed.assignments, tasks: seed.tasks, templates: seed.templates, plans: seed.plans,
    annotations: seed.annotations, specItems: seed.specItems, specVersions: seed.specVersions, approvals: seed.approvals,
    documents: seed.documents, meetings: seed.meetings, absences: seed.absences, suppliers: seed.suppliers, purchaseOrders: seed.purchaseOrders,
    budgetLines: seed.budgetLines, expenses: seed.expenses, feeMilestones: seed.feeMilestones, notifications: seed.notifications,
    messages: seed.messages, emailLog: seed.emailLog, activity: seed.activity, subscriptionPlans: seed.subscriptionPlans,
    officeSubscription: seed.officeSubscription, invoices: seed.invoices, pricingChanges: seed.pricingChanges, platformOffices: seed.platformOffices,
    tickets: seed.tickets, auditLog: seed.auditLog, systemEvents: seed.systemEvents, announcements: seed.announcements,
    retentionPolicies: seed.retentionPolicies, helpArticles: seed.helpArticles, faqs: seed.faqs,
    settings: {
      memberCanSeeFinance: false, memberSeesAllProjects: false, clientSeesBudgetSummary: true, adminCanManageBilling: false,
      notif: { approvals: { app: true, email: true }, tasks: { app: true, email: false }, meetings: { app: true, email: true }, budget: { app: true, email: true }, comments: { app: true, email: false }, digest: { app: false, email: true } },
      calendar: { google: false, outlook: false }, budgetWarnPct: 90,
    },
  }));
}
export type DB = ReturnType<typeof makeSeedDB> & {
  office: T.Office; users: T.User[]; memberships: T.Membership[]; invitations: T.Invitation[]; clients: T.Client[]; projects: T.Project[];
  assignments: T.Assignment[]; tasks: T.Task[]; templates: T.WorkTemplate[]; plans: T.Plan[]; annotations: T.Annotation[]; specItems: T.SpecItem[];
  specVersions: T.SpecVersion[]; approvals: T.Approval[]; documents: T.Doc[]; meetings: T.Meeting[]; absences: T.Absence[]; suppliers: T.Supplier[];
  purchaseOrders: T.PurchaseOrder[]; budgetLines: T.BudgetLine[]; expenses: T.Expense[]; feeMilestones: T.FeeMilestone[]; notifications: T.Notification[];
  messages: T.Message[]; emailLog: T.EmailLog[]; activity: T.Activity[]; subscriptionPlans: T.SubscriptionPlan[]; officeSubscription: T.OfficeSubscription;
  invoices: T.Invoice[]; pricingChanges: T.PricingChange[]; platformOffices: T.PlatformOffice[]; tickets: T.Ticket[]; auditLog: T.AuditEntry[];
  systemEvents: T.SystemEvent[]; announcements: T.Announcement[];
};

const KEY = 'archiflow.demo.v3';
function load(): { db: DB; userId: string; path: string; theme?: string } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function save(v: any) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable: demo still works in memory */ } }

export interface Toast { id: number; text: string; kind: 'ok' | 'bad' | 'info'; undo?: () => void; }
export interface Ctx {
  db: DB; me: T.User; role: T.Role; path: string;
  nav: (to: string) => void; back: () => void;
  run: <A extends any[]>(fn: (db: DB, ctx: { me: T.User }, ...args: A) => any, ...args: A) => any;
  toast: (text: string, kind?: Toast['kind'], undo?: () => void) => void; toasts: Toast[]; dismissToast?: (id: number) => void;
  switchUser: (userId: string) => void; reset: () => void;
  theme: string; setTheme: (t: string) => void;
  /** present only in the site connected to the real database */
  live?: import('../live/store').LiveApi;
}
export const StoreCtx = createContext<Ctx>(null as any);
export const useStore = () => useContext(StoreCtx);

export function defaultPathFor(u: T.User) {
  if (u.role === 'client') return '/portal';
  if (u.role === 'super_admin') return '/admin';
  return '/dashboard';
}

function initialPath(fallback: string) {
  try {
    const h = location.hash.replace('#', '');
    if (h && /^[a-z0-9_.~-]+$/i.test(h)) return '/' + h.replace(/\./g, '/');
  } catch { /* ignore */ }
  return fallback;
}

export function StoreProvider({ children }: { children: any }) {
  const saved = useRef(load()).current;
  const [db, setDb] = useState<DB>(() => saved?.db || makeSeedDB());
  const [userId, setUserId] = useState<string>(() => saved?.userId || 'u_yoav');
  const [path, setPath] = useState<string>(() => initialPath(saved?.path || '/login'));
  const [history, setHistory] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setThemeState] = useState<string>(() => saved?.theme || 'system');

  useEffect(() => { save({ db, userId, path, theme }); }, [db, userId, path, theme]);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
  }, [theme]);

  const me = db.users.find((u) => u.id === userId) || db.users[1];
  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok', undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 6500 : 3600);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const nav = useCallback((to: string) => {
    setHistory((h) => [...h.slice(-30), path]);
    setPath(to);
    try { window.scrollTo({ top: 0 }); } catch { /* ignore */ }
  }, [path]);
  const back = useCallback(() => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev) setPath(prev);
      return h.slice(0, -1);
    });
  }, []);
  const run = useCallback((fn: any, ...args: any[]) => {
    celebrate(fn, args);
    let out: any;
    setDb((cur) => {
      const draft = structuredClone(cur);
      out = fn(draft, { me }, ...args);
      return draft;
    });
    return out;
  }, [me]);
  const switchUser = useCallback((id: string) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return;
    setUserId(id);
    setHistory([]);
    setPath(defaultPathFor(u));
    window.scrollTo({ top: 0 });
  }, [db.users]);
  const reset = useCallback(() => {
    setDb(makeSeedDB());
    setHistory([]);
    toast('נתוני ההדגמה אופסו למצב ההתחלתי', 'info');
  }, [toast]);

  const value = useMemo<Ctx>(() => ({ db, me, role: me.role, path, nav, back, run, toast, toasts, dismissToast, switchUser, reset, theme, setTheme: setThemeState }), [db, me, path, nav, back, run, toast, toasts, dismissToast, switchUser, reset, theme]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
