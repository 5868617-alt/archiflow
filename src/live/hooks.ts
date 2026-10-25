// Small helpers for screens that behave differently on the live site.
import { useStore } from '../data/store';
import { friendlyError } from './errors';
import type { Supa } from './client';

export const useLive = () => useStore().live;

/** Runs a server call, shows a toast, reloads the data. Returns true on success. */
export function useAct() {
  const { live } = useStore();
  return (fn: (api: Supa) => Promise<any>, ok?: string, kind: 'ok' | 'info' = 'ok') => (live ? live.enqueue(fn, ok, kind) : Promise.resolve(false));
}

/** Opens a stored file (signed link, valid for a few minutes). */
export function useOpenFile() {
  const { live, toast } = useStore();
  return async (bucket: string, path: string | undefined | null, download?: string) => {
    if (!live || !path) { toast('אין קובץ שמור לגרסה הזו.', 'info'); return; }
    try { const url = await live.fileUrl(bucket, path, download); window.open(url, '_blank', 'noopener'); }
    catch (e: any) { toast(friendlyError(e), 'bad'); }
  };
}
