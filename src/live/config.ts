// Connection settings for the live site. Both values are public by design (RLS protects the data).
// A test harness may override them with window.__AF_CONFIG before the app script runs.
const override = (globalThis as any).__AF_CONFIG || {};
export const LIVE_CONFIG = {
  url: (): string => override.url || 'https://qbwaqngxdgmqgddxcuzv.supabase.co',
  key: override.key || 'sb_publishable_e44fG20gwT2_GPrICJGDKA_170V2Xxu',
  /** where e-mail links should send people back to (the page itself, without the #route) */
  appUrl: (): string => { try { return location.origin + location.pathname.replace(/index\.html$/, ''); } catch { return ''; } },
};
