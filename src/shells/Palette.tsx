// Command palette (Ctrl/⌘+K or "/"): one place to search everything, jump to any screen and start any action.
// Plus a few two-key shortcuts ("g" then a letter) and a "?" overlay that lists them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { LuSearch, LuFolderKanban, LuUsers, LuListChecks, LuPencilRuler, LuFileText, LuTruck, LuPlus, LuCalendarPlus, LuUpload, LuReceipt, LuShoppingCart, LuSend, LuCornerDownLeft, LuKeyboard, LuClock } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, inScope, canSeeFinance, hasFeature } from '../data/api';
import { cx } from '../ui/core';
import { useNavModel } from './AppShell';

type Item = { id: string; label: string; sub?: string; icon: any; to: string; group: string; keys?: string };

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
export const MOD = isMac ? '⌘' : 'Ctrl';
const typing = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable); };

const GO_KEYS: Record<string, string> = { d: '/dashboard', p: '/projects', t: '/tasks', c: '/calendar', l: '/clients', s: '/plans', a: '/approvals', b: '/budget' };

export function useCommandPalette() {
  const { nav } = useStore();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    let g = 0;
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) { e.preventDefault(); setOpen((o) => !o); return; }
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); setOpen(true); return; }
      if (e.key === '?') { e.preventDefault(); setHelp((x) => !x); return; }
      if (e.key === 'g' || e.code === 'KeyG') { g = Date.now(); return; }
      if (g && Date.now() - g < 1200) {
        const k = (e.code.startsWith('Key') ? e.code.slice(3) : e.key).toLowerCase();
        if (GO_KEYS[k]) { e.preventDefault(); nav(GO_KEYS[k]); }
        g = 0;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);
  return { open, setOpen, help, setHelp };
}

export function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="search search-trigger" onClick={onOpen} aria-label="חיפוש ופעולות מהירות" aria-keyshortcuts="Control+K">
      <LuSearch aria-hidden />
      <span className="st-text">חיפוש, מעבר למסך או פעולה…</span>
      <kbd className="ltr">{MOD} K</kbd>
    </button>
  );
}

export function CommandPalette({ onClose, onHelp }: { onClose: () => void; onHelp: () => void }) {
  const { db, me, nav } = useStore();
  const groups = useNavModel();
  const fin = canSeeFinance(db, me);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const actions: Item[] = useMemo(() => [
    ...(me.role !== 'member' ? [{ id: 'a-proj', label: 'פרויקט חדש', icon: LuFolderKanban, to: '/projects?new=1', group: 'פעולות' }] : []),
    { id: 'a-task', label: 'משימה חדשה', icon: LuPlus, to: '/tasks?new=1', group: 'פעולות' },
    { id: 'a-meet', label: 'קביעת פגישה', icon: LuCalendarPlus, to: '/calendar?new=1', group: 'פעולות' },
    { id: 'a-plan', label: 'העלאת שרטוט', icon: LuUpload, to: '/plans?upload=1', group: 'פעולות' },
    { id: 'a-appr', label: 'שליחה לאישור לקוח', icon: LuSend, to: '/approvals?new=1', group: 'פעולות' },
    ...(hasFeature(db, 'procurement') ? [{ id: 'a-po', label: 'הזמנת רכש חדשה', icon: LuShoppingCart, to: '/procurement?new=1', group: 'פעולות' }] : []),
    ...(fin ? [{ id: 'a-exp', label: 'רישום הוצאה', icon: LuReceipt, to: '/expenses?new=1', group: 'פעולות' }] : []),
  ], [db, me, fin]);
  const screens: Item[] = useMemo(() => groups.flatMap((g: any) => g.items.filter((it: any) => !it.lock).map((it: any) => ({ id: 'n' + it.to, label: it.label, sub: g.title, icon: it.icon, to: it.to, group: 'מעבר למסך', keys: Object.entries(GO_KEYS).find(([, v]) => v === it.to)?.[0] }))), [groups]);
  const recent: Item[] = useMemo(() => [...visibleProjects(db, me)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4).map((p) => ({ id: 'r' + p.id, label: p.name, sub: p.status, icon: LuClock, to: `/projects/${p.id}`, group: 'פרויקטים אחרונים' })), [db, me]);

  const items: Item[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [...recent, ...actions, ...screens];
    const m = (x?: string) => !!x && x.toLowerCase().includes(s);
    const ok = inScope(db, me);
    const projs = visibleProjects(db, me);
    const data: Item[] = [
      ...projs.filter((p) => m(p.name) || m(p.code) || m(p.city)).slice(0, 5).map((p) => ({ id: 'p' + p.id, label: p.name, sub: `${p.code} · ${p.status}`, icon: LuFolderKanban, to: `/projects/${p.id}`, group: 'פרויקטים' })),
      ...db.clients.filter((c) => projs.some((p) => p.clientId === c.id) && (m(c.name) || c.contacts.some((x) => m(x.name)))).slice(0, 4).map((c) => ({ id: 'c' + c.id, label: c.name, sub: c.city, icon: LuUsers, to: `/clients/${c.id}`, group: 'לקוחות' })),
      ...db.tasks.filter((t) => ok(t.projectId) && m(t.title)).slice(0, 5).map((t) => ({ id: 't' + t.id, label: t.title, sub: t.status, icon: LuListChecks, to: `/tasks?open=${t.id}`, group: 'משימות' })),
      ...db.plans.filter((p) => ok(p.projectId) && (m(p.title) || m(p.number))).slice(0, 4).map((p) => ({ id: 's' + p.id, label: `${p.number} ${p.title}`, sub: db.projects.find((x) => x.id === p.projectId)?.name, icon: LuPencilRuler, to: `/plans/${p.id}`, group: 'שרטוטים' })),
      ...db.documents.filter((d) => ok(d.projectId) && m(d.name)).slice(0, 4).map((d) => ({ id: 'd' + d.id, label: d.name, sub: d.folder, icon: LuFileText, to: `/documents/${d.id}`, group: 'מסמכים' })),
      ...db.suppliers.filter((x) => m(x.name) || m(x.category)).slice(0, 3).map((x) => ({ id: 'u' + x.id, label: x.name, sub: x.category, icon: LuTruck, to: `/suppliers/${x.id}`, group: 'ספקים' })),
    ];
    return [...actions.filter((a) => m(a.label)), ...screens.filter((a) => m(a.label)), ...data];
  }, [q, db, me, actions, screens, recent]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[data-on="1"]')?.scrollIntoView({ block: 'nearest' }); }, [sel]);
  const go = (it?: Item) => { if (!it) return; onClose(); nav(it.to); };
  const onKey = (e: any) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[sel]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  let last = '';
  return (
    <div className="scrim palette-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="חיפוש ופעולות מהירות">
        <div className="pal-input">
          <LuSearch aria-hidden />
          <input ref={inputRef} id="global-search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="חיפוש פרויקט, לקוח, שרטוט, משימה – או פעולה" aria-label="חיפוש כללי"
            role="combobox" aria-expanded="true" aria-controls="pal-list" aria-activedescendant={items[sel] ? 'pal-' + items[sel].id : undefined} autoComplete="off" />
          <kbd>Esc</kbd>
        </div>
        <div className="pal-list" id="pal-list" role="listbox" ref={listRef}>
          {items.length === 0 ? <div className="pal-empty">לא נמצא דבר עבור "{q}". נסו שם של פרויקט, לקוח או מספר שרטוט.</div> : items.map((it, i) => {
            const head = it.group !== last ? (last = it.group) : null;
            return (
              <div key={it.id}>
                {head ? <div className="sr-group">{head}</div> : null}
                <button type="button" id={'pal-' + it.id} role="option" aria-selected={i === sel} data-on={i === sel ? '1' : '0'} className={cx('sr-item', i === sel && 'on')} onMouseMove={() => sel !== i && setSel(i)} onClick={() => go(it)}>
                  <it.icon aria-hidden /><span className="grow ellipsis">{it.label}</span>
                  {it.sub ? <span className="xs muted ellipsis" style={{ maxWidth: 180 }}>{it.sub}</span> : null}
                  {it.keys ? <kbd className="pal-kbd ltr">g {it.keys}</kbd> : null}
                  {i === sel ? <LuCornerDownLeft className="pal-enter" aria-hidden /> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="pal-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> בחירה</span><span><kbd>Enter</kbd> פתיחה</span>
          <button type="button" className="linkish" onClick={() => { onClose(); onHelp(); }}><LuKeyboard aria-hidden style={{ width: 14, height: 14, verticalAlign: -2 }} /> כל קיצורי המקלדת</button>
        </div>
      </div>
    </div>
  );
}

export function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const rows: [string, string][] = [
    [`${MOD} K`, 'חיפוש ופעולות מהירות'], ['/', 'חיפוש ופעולות מהירות'], ['?', 'הצגת הרשימה הזו'],
    ['g d', 'היום שלי'], ['g p', 'פרויקטים'], ['g t', 'משימות'], ['g c', 'יומן ופגישות'], ['g l', 'לקוחות'], ['g s', 'שרטוטים'], ['g a', 'אישורי לקוח'], ['g b', 'תקציב ביצוע'],
    ['Esc', 'סגירת חלון'],
  ];
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="קיצורי מקלדת">
        <div className="modal-head"><h2>קיצורי מקלדת</h2></div>
        <div className="modal-body">
          <dl className="kv shortcuts">{rows.flatMap(([k, v]) => [<dt key={k + v + 'k'}><kbd className="ltr">{k}</kbd></dt>, <dd key={k + v}>{v}</dd>])}</dl>
          <p className="xs muted mt16">"g" ואחריה אות: לוחצים על g, משחררים, ואז על האות.</p>
        </div>
        <div className="modal-foot"><button type="button" className="btn" onClick={onClose}>סגירה</button></div>
      </div>
    </div>
  );
}
