// Accessibility menu (per IS 5568 practice): text size, high contrast, highlighted links, plain font,
// stop motion, reading guide line. Choices are remembered on this device only and applied as
// attributes on <html>, so every screen (office, portal, admin, public) follows them.
import { useEffect, useRef, useState } from 'react';
import { LuAccessibility, LuX, LuRotateCcw, LuType, LuContrast, LuLink, LuPause, LuALargeSmall, LuRuler } from 'react-icons/lu';
import { useStore } from '../data/store';
import { cx } from '../ui/core';

type Prefs = { size: 0 | 1 | 2 | 3; contrast: boolean; links: boolean; plain: boolean; still: boolean; guide: boolean };
const KEY = 'archiflow.a11y';
const DEFAULTS: Prefs = { size: 0, contrast: false, links: false, plain: false, still: false, guide: false };

export function readPrefs(): Prefs { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULTS; } }
export function applyPrefs(p: Prefs) {
  const h = document.documentElement;
  h.dataset.textSize = String(p.size);
  const flag = (k: string, on: boolean) => { if (on) h.setAttribute(k, ''); else h.removeAttribute(k); };
  flag('data-hc', p.contrast); flag('data-links', p.links); flag('data-plain', p.plain); flag('data-still', p.still); flag('data-guide', p.guide);
}
// apply as early as possible so the first paint already has the user's settings
try { applyPrefs(readPrefs()); } catch { /* storage unavailable */ }

function ReadingGuide() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const m = (e: PointerEvent) => { if (ref.current) ref.current.style.transform = `translateY(${e.clientY}px)`; };
    window.addEventListener('pointermove', m); return () => window.removeEventListener('pointermove', m);
  }, []);
  return <div className="reading-guide" ref={ref} aria-hidden />;
}

export function AccessibilityMenu({ floating }: { floating?: boolean }) {
  const { nav } = useStore();
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Prefs>(readPrefs);
  const panel = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { applyPrefs(p); try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ } }, [p]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>('button')?.focus();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    const out = (e: MouseEvent) => { if (panel.current && !panel.current.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', k); window.addEventListener('mousedown', out);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('mousedown', out); };
  }, [open]);
  const set = (k: keyof Prefs, v: any) => setP((x) => ({ ...x, [k]: v }));
  const changed = JSON.stringify(p) !== JSON.stringify(DEFAULTS);
  const Toggle = ({ k, icon: Icon, label }: { k: 'contrast' | 'links' | 'plain' | 'still' | 'guide'; icon: any; label: string }) => (
    <button type="button" className={cx('a11y-opt', p[k] && 'on')} aria-pressed={p[k]} onClick={() => set(k, !p[k])}><Icon aria-hidden /><span>{label}</span></button>
  );
  return (
    <div className={cx('a11y', floating && 'a11y-floating')}>
      <button ref={btn} type="button" className={cx(floating ? 'a11y-fab' : 'icon-btn', changed && 'a11y-active')} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog" aria-label="תפריט נגישות" title="נגישות">
        <LuAccessibility aria-hidden />
      </button>
      {open ? (
        <div ref={panel} className="a11y-panel" role="dialog" aria-label="התאמות נגישות">
          <div className="a11y-head"><b>התאמות נגישות</b><button type="button" className="icon-btn" onClick={() => { setOpen(false); btn.current?.focus(); }} aria-label="סגירה"><LuX aria-hidden /></button></div>
          <div className="a11y-size" role="group" aria-label="גודל טקסט">
            <span className="small soft row g4"><LuALargeSmall aria-hidden />גודל טקסט</span>
            <div className="a11y-steps">{[0, 1, 2, 3].map((n) => <button key={n} type="button" className={cx('a11y-step', p.size === n && 'on')} aria-pressed={p.size === n} onClick={() => set('size', n)} aria-label={['רגיל', 'גדול', 'גדול מאוד', 'ענק'][n]} style={{ fontSize: 13 + n * 3 }}>א</button>)}</div>
          </div>
          <div className="a11y-grid">
            <Toggle k="contrast" icon={LuContrast} label="ניגודיות גבוהה" />
            <Toggle k="links" icon={LuLink} label="הדגשת קישורים" />
            <Toggle k="plain" icon={LuType} label="גופן פשוט לקריאה" />
            <Toggle k="still" icon={LuPause} label="עצירת אנימציות" />
            <Toggle k="guide" icon={LuRuler} label="סרגל קריאה" />
          </div>
          <div className="a11y-foot">
            <button type="button" className="linkish small" onClick={() => setP(DEFAULTS)} disabled={!changed}><LuRotateCcw aria-hidden style={{ width: 14, height: 14 }} /> איפוס</button>
            <button type="button" className="linkish small" onClick={() => { setOpen(false); nav('/accessibility'); }}>הצהרת נגישות</button>
          </div>
        </div>
      ) : null}
      {p.guide ? <ReadingGuide /> : null}
    </div>
  );
}
