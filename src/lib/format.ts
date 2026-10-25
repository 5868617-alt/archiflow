import { parseISO, daysFromToday, todayISO } from '../data/dates';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
export const num = (n: number) => nf.format(Math.round(n));
export const ils = (n: number) => `${n < 0 ? '−' : ''}₪${nf.format(Math.abs(Math.round(n)))}`;
export const ils2 = (n: number) => `₪${nf2.format(n)}`;
export function ilsShort(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `₪${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 2).replace(/\.?0+$/, '')}M`;
  if (a >= 10_000) return `₪${Math.round(n / 1000)}K`;
  return ils(n);
}
export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const MONTHS_S = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
export const DOW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DOW_S = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const monthName = (m: number) => MONTHS[m];

export function date(s?: string) {
  if (!s) return '—';
  const d = parseISO(s);
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`;
}
export function dateShort(s?: string) {
  if (!s) return '—';
  const d = parseISO(s);
  const sameYear = s.slice(0, 4) === todayISO.slice(0, 4);
  return `${d.getDate()} ${MONTHS_S[d.getMonth()]}${sameYear ? '' : ' ' + String(d.getFullYear()).slice(2)}`;
}
export function dateNum(s?: string) {
  if (!s) return '—';
  const d = parseISO(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
export const time = (s?: string) => (s && s.includes('T') ? s.split('T')[1].slice(0, 5) : '');
export function dateTime(s?: string) { return s ? `${dateShort(s)}, ${time(s)}` : '—'; }
export function relDay(s?: string) {
  if (!s) return '—';
  const n = daysFromToday(s);
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n === -1) return 'אתמול';
  if (n > 1 && n <= 30) return `בעוד ${n} ימים`;
  if (n < -1 && n >= -30) return `לפני ${-n} ימים`;
  return dateShort(s);
}
export function ago(s?: string) {
  if (!s) return '—';
  const n = daysFromToday(s);
  if (n === 0) return 'היום ' + time(s);
  if (n === -1) return 'אתמול ' + time(s);
  if (n < 0 && n > -7) return `לפני ${-n} ימים`;
  return dateShort(s);
}
export const initials = (name: string) => name.replace(/["׳״']/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
export const fileSize = (kb: number) => (kb >= 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb}KB`);
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);
