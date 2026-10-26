import { useEffect, useRef, useState } from 'react';
import { LuX, LuChevronLeft, LuChevronUp, LuChevronDown, LuChevronsUpDown, LuFlaskConical, LuSparkles, LuInfo, LuTriangleAlert, LuCircleCheck, LuCircleAlert, LuSearch, LuInbox, LuLock, LuArrowUpRight, LuCamera } from 'react-icons/lu';
import { useStore } from '../data/store';
import { initials } from '../lib/format';

export const cx = (...a: any[]) => a.filter(Boolean).join(' ');

// ---------- buttons ----------
export function Btn({ kind, size, icon: Icon, children, className, ...rest }: any) {
  return (
    <button type="button" className={cx('btn', kind, size, className)} {...rest}>
      {Icon ? <Icon aria-hidden /> : null}
      {children}
    </button>
  );
}
export function IconBtn({ icon: Icon, label, badge, className, ...rest }: any) {
  return (
    <button type="button" className={cx('icon-btn', className)} aria-label={label} title={label} {...rest}>
      <Icon aria-hidden />
      {badge ? <span className="dot">{badge > 9 ? '9+' : badge}</span> : null}
    </button>
  );
}
export function NavLink({ to, children, className }: any) {
  const { nav } = useStore();
  return <button type="button" className={cx('linkish', className)} onClick={(e) => { e.stopPropagation(); nav(to); }}>{children}</button>;
}

// ---------- badges ----------
const TONE: Record<string, string> = {
  'ליד חדש': 'violet', 'תכנון ראשוני': 'info', 'תכנון בפיתוח': 'info', 'ממתין לאישור': 'warn', 'תכנון מאושר': 'ok', 'ביצוע': 'navy', 'לקראת מסירה': 'accent', 'הושלם': 'ok', 'בהשהיה': '',
  'לביצוע': '', 'בתהליך': 'info', 'ממתין לאחר': 'warn',
  'נמוכה': '', 'בינונית': 'info', 'גבוהה': 'warn', 'דחופה': 'bad', 'רגילה': '', 'קריטית': 'bad',
  'ממתין': 'warn', 'אושר': 'ok', 'נדחה': 'bad', 'בקשת שינוי': 'violet',
  'טיוטה': '', 'ממתין לאישור לקוח': 'warn', 'מאושר': 'ok',
  'בבדיקה פנימית': 'info', 'נשלח ללקוח': 'warn', 'נדרשים תיקונים': 'bad', 'הוחלף': 'outline',
  'מוכן': 'ok', 'בעיבוד': 'info', 'נכשל': 'bad', 'תצוגה לא נתמכת': '',
  'נשלחה לספק': 'info', 'אושרה ע״י ספק': 'info', 'בייצור': 'violet', 'סופקה חלקית': 'warn', 'סופקה': 'ok', 'בוטלה': 'bad',
  'שולם': 'ok', 'ממתין לתשלום': 'warn', 'נשלחה דרישה': 'info', 'עתידי': '', 'באיחור': 'bad',
  'פעיל': 'ok', 'תקופת ניסיון': 'info', 'חוב פתוח': 'bad', 'יבוטל בסוף התקופה': 'warn', 'בוטל': '', 'פג תוקף': 'bad',
  'שולמה': 'ok', 'פתוחה': 'warn', 'נכשלה': 'bad', 'זוכתה': '',
  'פתוח': 'warn', 'ממתין למשתמש': 'violet', 'נסגר': '', 'טופל': 'ok',
  'הוזמן': 'info', 'ללא גישה': '', 'מושהה': 'warn', 'מושבת': '', 'ממתינה': 'info', 'התקבלה': 'ok', 'פגה': '',
  'מתוכננת': 'info', 'התקיימה': 'ok', 'פורסם': 'ok', 'מתוזמן': 'info',
};
export function Badge({ tone, children, dot, icon: Icon, title }: any) {
  return <span className={cx('badge', tone)} title={title}>{dot ? <i className="bd" /> : null}{Icon ? <Icon aria-hidden /> : null}{children}</span>;
}
// project statuses get their own hue so the nine stages read at a glance (same colors as the dashboard chart)
export const STATUS_COLORS: Record<string, string> = { 'ליד חדש': 'var(--violet)', 'תכנון ראשוני': '#5F8FD0', 'תכנון בפיתוח': 'var(--info)', 'ממתין לאישור': 'var(--warn)', 'תכנון מאושר': '#3E9A6E', 'ביצוע': 'var(--st-exec)', 'לקראת מסירה': '#C99400', 'הושלם': 'var(--ok)', 'בהשהיה': 'var(--ink-3)' };
export function StatusBadge({ s, dot = true, className }: { s: string; dot?: boolean; className?: string }) {
  if (STATUS_COLORS[s]) return <span className={cx('badge st', className)} style={{ ['--c' as any]: STATUS_COLORS[s] }}>{dot ? <i className="bd" /> : null}{s}</span>;
  return <span className={cx('badge', TONE[s] ?? '', className)}>{dot ? <i className="bd" /> : null}{s}</span>;
}
export const toneOf = (s: string) => TONE[s] ?? '';
export function DemoTag({ children = 'הדמיה', title }: any) {
  if ((globalThis as any).__AF_LIVE) return null; // the live site never shows simulated features
  return <span className="tag-demo" title={title || 'פעולה מדומה – לא מתבצעת במערכת אמיתית'}><LuFlaskConical aria-hidden />{children}</span>;
}
export function AssumeTag({ children = (globalThis as any).__AF_LIVE ? 'טעון אישור' : 'הנחת דמו' }: any) {
  return <span className="tag-demo" title="הנחה שטרם אושרה – ניתנת לשינוי"><LuInfo aria-hidden />{children}</span>;
}
export function FutureTag({ children = 'יכולת עתידית' }: any) {
  return <span className="tag-future" title="מוצג להמחשה בלבד"><LuSparkles aria-hidden />{children}</span>;
}

// ---------- callouts ----------
export function Callout({ kind = 'info', title, children, icon }: any) {
  const Ic = icon || ({ info: LuInfo, assume: LuTriangleAlert, bad: LuCircleAlert, ok: LuCircleCheck, future: LuSparkles } as any)[kind] || LuInfo;
  return (
    <div className={cx('callout', kind)} role={kind === 'bad' ? 'alert' : undefined}>
      <Ic aria-hidden />
      <div className="grow">{title ? <div className="c-title">{title}</div> : null}<div>{children}</div></div>
    </div>
  );
}

// ---------- layout ----------
export function PageHead({ title, sub, crumbs, actions, badge, art, className }: any) {
  const { nav } = useStore();
  return (
    <div className={cx('page-head', art && 'page-head-art', className)}>
      {art ? <div className="ph-art" aria-hidden>{art}</div> : null}
      <div className="grow">
        {crumbs ? (
          <nav className="crumbs" aria-label="פירורי לחם">
            {crumbs.map((c: any, i: number) => (
              <span key={i} className="row g4">
                {c.to ? <button type="button" onClick={() => nav(c.to)}>{c.label}</button> : <span>{c.label}</span>}
                {i < crumbs.length - 1 ? <LuChevronLeft aria-hidden /> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <div className="row wrap g12"><h1>{title}</h1>{badge}</div>
        {sub ? <p className="ph-sub">{sub}</p> : null}
      </div>
      {actions ? <div className="row wrap">{actions}</div> : null}
    </div>
  );
}
export function Card({ title, icon: Icon, actions, children, className, pad, foot, onClick, bodyClass }: any) {
  return (
    <section className={cx('card', onClick && 'link', className)} onClick={onClick}>
      {title ? (
        <div className="card-head">
          <h3>{Icon ? <Icon aria-hidden /> : null}{title}</h3>
          {actions ? <div className="row wrap g4">{actions}</div> : null}
        </div>
      ) : null}
      {pad === false ? children : <div className={cx(title ? 'card-body' : 'card-body', bodyClass)}>{children}</div>}
      {foot ? <div className="card-foot">{foot}</div> : null}
    </section>
  );
}
export function Stat({ label, value, meta, icon: Icon, tone, onClick }: any) {
  return (
    <div className={cx('card stat', tone, onClick && 'link')} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={(e: any) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}>
      <div className="s-label">{Icon ? <Icon aria-hidden /> : null}{label}</div>
      <div className="s-value">{value}</div>
      {meta ? <div className="s-meta">{meta}</div> : null}
      {onClick ? <LuArrowUpRight className="s-go" aria-hidden /> : null}
    </div>
  );
}
export function KV({ items }: { items: [string, any][] }) {
  return <dl className="kv">{items.flatMap(([k, v], i) => [<dt key={'k' + i}>{k}</dt>, <dd key={'v' + i}>{v ?? '—'}</dd>])}</dl>;
}

// ---------- avatars & progress ----------
export function Avatar({ user, size, title }: any) {
  if (!user) return null;
  return <span className={cx('av', size)} style={{ background: user.color || '#44607A' }} title={title || user.name} aria-label={user.name}>{initials(user.name)}</span>;
}
export function AvatarStack({ users, max = 4 }: any) {
  const shown = users.slice(0, max);
  return (
    <span className="av-stack">
      {shown.map((u: any) => <Avatar key={u.id} user={u} size="sm" />)}
      {users.length > max ? <span className="av sm" style={{ background: 'var(--ink-3)' }}>+{users.length - max}</span> : null}
    </span>
  );
}
export function Progress({ value, tone, size }: any) {
  const v = Math.max(0, Math.min(1, value));
  return <div className={cx('prog', tone, size)} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${v * 100}%` }} /></div>;
}
export function Ring({ value, size = 64, stroke = 7, color = 'var(--navy-3)', label }: any) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(1, value));
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${c * v} ${c}`} strokeLinecap="round" />
      </svg>
      <span className="ring-v" style={{ fontSize: size / 4.4 }}>{label ?? Math.round(v * 100) + '%'}</span>
    </span>
  );
}

// ---------- tabs & chips ----------
export function Tabs({ tabs, value, onChange }: any) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t: any) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={cx('tab', value === t.id && 'on')} onClick={() => onChange(t.id)}>
          {t.icon ? <t.icon aria-hidden /> : null}{t.label}{t.count != null ? <span className="t-n">{t.count}</span> : null}{t.lock ? <LuLock aria-hidden style={{ width: 12, height: 12, opacity: .6 }} /> : null}
        </button>
      ))}
    </div>
  );
}
export function Chips({ options, value, onChange }: any) {
  return (
    <div className="chips" role="group">
      {options.map((o: any) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} className={cx('chip', value === o.value && 'on')} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null ? <span className="c-n">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
export function Segmented({ options, value, onChange }: any) {
  return (
    <div className="btn-group" role="group">
      {options.map((o: any) => <button key={o.value} type="button" className={value === o.value ? 'on' : ''} aria-pressed={value === o.value} onClick={() => onChange(o.value)} title={o.label}>{o.icon ? <o.icon aria-hidden /> : null}<span className={o.icon ? 'hide-sm' : ''}>{o.label}</span></button>)}
    </div>
  );
}

// ---------- overlays ----------
export function Modal({ title, onClose, children, foot, size, sub }: any) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx('modal', size)} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div><h2>{title}</h2>{sub ? <div className="small muted">{sub}</div> : null}</div>
          <IconBtn icon={LuX} label="סגירה" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
        {foot ? <div className="modal-foot">{foot}</div> : null}
      </div>
    </div>
  );
}
export function Drawer({ title, onClose, children, foot, sub }: any) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><div className="grow"><h2 style={{ fontSize: 'var(--fs-xl)' }}>{title}</h2>{sub ? <div className="small muted">{sub}</div> : null}</div><IconBtn icon={LuX} label="סגירה" onClick={onClose} /></div>
        <div className="modal-body" style={{ flex: 1 }}>{children}</div>
        {foot ? <div className="modal-foot" style={{ borderRadius: 0 }}>{foot}</div> : null}
      </aside>
    </>
  );
}
export function Confirm({ title, children, confirmLabel = 'אישור', danger, onConfirm, onClose }: any) {
  return (
    <Modal title={title} onClose={onClose} size="narrow" foot={<><Btn kind={danger ? 'danger-solid' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="soft">{children}</div>
    </Modal>
  );
}
export function useOutside(ref: any, onOut: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [active, onOut, ref]);
}
export function Menu({ trigger, children, align }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<any>(null);
  useOutside(ref, () => setOpen(false), open);
  return (
    <div className="menu-anchor" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open ? <div className={cx('menu', align)} onClick={() => setOpen(false)}>{children}</div> : null}
    </div>
  );
}
export function MenuItem({ icon: Icon, children, onClick, on }: any) {
  return <button type="button" className={cx('menu-item', on && 'on')} onClick={onClick}>{Icon ? <Icon aria-hidden /> : null}<span className="grow">{children}</span></button>;
}

// ---------- forms ----------
export function Field({ label, hint, error, children, full, htmlFor }: any) {
  return (
    <div className={cx('field', full && 'full')}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
export function Input({ invalid, className, ...p }: any) { return <input className={cx('input', invalid && 'invalid', className)} {...p} />; }
export function Textarea({ invalid, className, ...p }: any) { return <textarea className={cx('textarea', invalid && 'invalid', className)} {...p} />; }
export function Select({ options, invalid, className, placeholder, ...p }: any) {
  return (
    <select className={cx('select', invalid && 'invalid', className)} {...p}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o: any) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export function Switch({ checked, onChange, label, id }: any) {
  return (
    <label className="row g12 clickable" htmlFor={id}>
      <span className="switch"><input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span /></span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
export function Check({ checked, onChange, label, id }: any) {
  return <label className="check" htmlFor={id}><input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
export function SearchBox({ value, onChange, placeholder = 'חיפוש…', id }: any) {
  return (
    <div className="search-in">
      <LuSearch aria-hidden />
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

// ---------- states ----------
export function Empty({ icon: Icon = LuInbox, title, children, action }: any) {
  return (
    <div className="empty">
      <div className="e-ic"><Icon aria-hidden /></div>
      <div className="e-title">{title}</div>
      {children ? <div className="small" style={{ maxWidth: 380 }}>{children}</div> : null}
      {action ? <div className="mt8">{action}</div> : null}
    </div>
  );
}
export function Skeleton({ rows = 4 }: any) {
  return <div className="col g12" style={{ padding: 16 }}>{Array.from({ length: rows }).map((_, i) => <div key={i} className="skel" style={{ height: 14, width: `${90 - i * 12}%` }} />)}</div>;
}
/** Short simulated latency so loading states are visible in the demo. */
export function useFakeLoad(ms = 450, deps: any[] = []) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); const t = setTimeout(() => setLoading(false), ms); return () => clearTimeout(t); }, deps);
  return loading;
}

// ---------- table ----------
export function DataTable({ columns, rows, onRow, pageSize = 0, initialSort, empty, footer, rowKey = 'id', groupBy }: any) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(initialSort || null);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  let data = [...rows];
  if (sort) {
    const col = columns.find((c: any) => c.key === sort.key);
    const get = col?.sortValue || ((r: any) => r[sort.key]);
    data.sort((a, b) => { const x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
  }
  const total = data.length;
  const pages = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  if (pageSize) data = data.slice(page * pageSize, page * pageSize + pageSize);
  let lastGroup: any = null;
  return (
    <div>
      <div className="table-wrap">
        <table className="tbl tbl-stack">
          <thead>
            <tr>
              {columns.map((c: any) => (
                <th key={c.key} className={cx(c.sortable !== false && 'sortable', c.num && 'num')} style={{ width: c.width }}
                  onClick={() => c.sortable !== false && setSort((s) => (s?.key === c.key ? { key: c.key, dir: (s.dir * -1) as 1 | -1 } : { key: c.key, dir: 1 }))}
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.label}
                  {c.sortable !== false ? (sort?.key === c.key ? (sort.dir === 1 ? <LuChevronUp className="sort-ic" /> : <LuChevronDown className="sort-ic" />) : <LuChevronsUpDown className="sort-ic" style={{ opacity: 0.35 }} />) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={columns.length}>{empty || <Empty title="אין תוצאות">נסו לשנות את הסינון או החיפוש.</Empty>}</td></tr>
            ) : data.map((r: any) => {
              const g = groupBy ? groupBy(r) : null;
              const head = groupBy && g !== lastGroup ? <tr className="group-row" key={'g' + g}><td colSpan={columns.length}>{g}</td></tr> : null;
              lastGroup = g;
              return [head, (
                <tr key={r[rowKey]} className={onRow ? 'click' : ''} onClick={onRow ? () => onRow(r) : undefined}>
                  {columns.map((c: any, ci: number) => <td key={c.key} data-label={typeof c.label === 'string' ? c.label : ''} className={cx(c.num && 'num', ci === 0 && 'td-first', !c.label && 'td-nolabel')}>{c.render ? c.render(r) : r[c.key]}</td>)}
                </tr>
              )];
            })}
          </tbody>
          {footer ? <tfoot>{footer}</tfoot> : null}
        </table>
      </div>
      {pageSize && total > pageSize ? (
        <div className="pager">
          <span>מציג {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} מתוך {total}</span>
          <div className="row g4">
            <Btn size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>הקודם</Btn>
            <span className="num">{page + 1} / {pages}</span>
            <Btn size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>הבא</Btn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// "take a photo" for phones and tablets: opens the rear camera directly (hidden on devices with a mouse)
export function CameraButton({ onFile, label = 'צילום במצלמה' }: { onFile: (f: File) => void; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="camera-only">
      <Btn size="sm" icon={LuCamera} onClick={(e: any) => { e.stopPropagation(); ref.current?.click(); }}>{label}</Btn>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </span>
  );
}
