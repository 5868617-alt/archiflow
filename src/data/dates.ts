// Demo clock. The whole dataset is anchored to this date so relationships
// (overdue, today, upcoming) stay consistent no matter when the demo is opened.
export const IS_LIVE = !!(globalThis as any).__AF_LIVE;
// live site: the real date. demo: fixed date.
export const DEMO_TODAY = IS_LIVE ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })() : new Date(2026, 9, 25); // demo: Sunday 25 Oct 2026

const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = iso(DEMO_TODAY);
export function D(offsetDays: number): string {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() + offsetDays);
  return iso(d);
}
export function DT(offsetDays: number, time = '09:00'): string {
  return `${D(offsetDays)}T${time}`;
}
export function parseISO(s: string): Date {
  const [datePart, timePart] = s.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (timePart) {
    const [hh, mm] = timePart.split(':').map(Number);
    dt.setHours(hh || 0, mm || 0);
  }
  return dt;
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
export const daysFromToday = (s: string) => daysBetween(todayISO, s.slice(0, 10));
export function nowStamp(): string {
  // demo "now" keeps the demo date but uses the real clock time
  const t = new Date();
  return `${todayISO}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
