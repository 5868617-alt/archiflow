// Pointer-based drag and drop for boards: works with mouse, pen and touch (long-press on touch so scrolling still works).
// Cards spread `handle(id)`; drop zones carry `data-drop="<key>"`. A floating copy of the card follows the pointer.
import { useCallback, useEffect, useRef, useState } from 'react';

type Opts = { onDrop: (id: string, key: string) => void; canDrag?: (id: string) => boolean };

export function usePointerDrag({ onDrop, canDrag }: Opts) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const st = useRef<any>(null);
  const suppressClick = useRef(false);
  const dropRef = useRef(onDrop); dropRef.current = onDrop;

  const cleanup = useCallback(() => {
    const s = st.current; if (!s) return;
    clearTimeout(s.timer);
    s.ghost?.remove();
    window.removeEventListener('pointermove', s.move); window.removeEventListener('pointerup', s.up); window.removeEventListener('pointercancel', s.cancel);
    window.removeEventListener('touchmove', s.block as any);
    document.body.classList.remove('dragging-now');
    st.current = null; setDragId(null); setOver(null);
  }, []);
  useEffect(() => cleanup, [cleanup]);

  const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-drop]')?.getAttribute('data-drop') || null;

  const handle = (id: string) => ({
    'data-drag-id': id,
    onClickCapture: (e: any) => { if (suppressClick.current) { e.stopPropagation(); e.preventDefault(); suppressClick.current = false; } },
    onPointerDown: (e: any) => {
      if (e.button !== 0 || (canDrag && !canDrag(id))) return;
      if ((e.target as HTMLElement).closest('select,input,textarea,a,button:not([data-drag-ok])')) return;
      const el = e.currentTarget as HTMLElement;
      const touch = e.pointerType === 'touch';
      const s: any = { id, x0: e.clientX, y0: e.clientY, active: false, el };
      const start = () => {
        s.active = true;
        const r = el.getBoundingClientRect();
        const g = el.cloneNode(true) as HTMLElement;
        g.classList.add('drag-ghost');
        Object.assign(g.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
        s.dx = s.x0 - r.left; s.dy = s.y0 - r.top;
        document.body.appendChild(g); s.ghost = g;
        document.body.classList.add('dragging-now');
        setDragId(id);
        if (touch && navigator.vibrate) { try { navigator.vibrate(12); } catch { /* not supported */ } }
      };
      s.move = (ev: PointerEvent) => {
        if (!s.active) {
          const dist = Math.hypot(ev.clientX - s.x0, ev.clientY - s.y0);
          if (touch) { if (dist > 8) cleanup(); return; } // finger moved before the long-press: it's a scroll
          if (dist > 6) start(); else return;
        }
        s.ghost.style.left = ev.clientX - s.dx + 'px'; s.ghost.style.top = ev.clientY - s.dy + 'px';
        s.ghost.style.display = 'none'; const k = zoneAt(ev.clientX, ev.clientY); s.ghost.style.display = '';
        s.over = k; setOver(k);
        // keep the board scrolling when dragging near its edges
        const sc = el.closest('.kanban') as HTMLElement | null;
        if (sc) { const b = sc.getBoundingClientRect(); if (ev.clientX < b.left + 40) sc.scrollLeft -= 14; else if (ev.clientX > b.right - 40) sc.scrollLeft += 14; }
      };
      s.up = () => {
        const was = s.active, k = s.over;
        if (was) { suppressClick.current = true; setTimeout(() => { suppressClick.current = false; }, 0); }
        cleanup();
        if (was && k) dropRef.current(id, k);
      };
      s.cancel = () => cleanup();
      s.block = (ev: TouchEvent) => { if (s.active) ev.preventDefault(); };
      st.current = s;
      window.addEventListener('pointermove', s.move); window.addEventListener('pointerup', s.up); window.addEventListener('pointercancel', s.cancel);
      if (touch) { window.addEventListener('touchmove', s.block, { passive: false }); s.timer = setTimeout(start, 260); }
    },
  });
  return { dragId, over, handle };
}
