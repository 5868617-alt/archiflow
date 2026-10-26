// A short burst of confetti in the palette colors, e.g. when a task is completed.
// Skipped when the person prefers reduced motion or turned animations off in the accessibility menu.
const COLORS = ['#EFB0A1', '#F4AFB4', '#D9A5C9', '#FDECE8', '#93465F'];

export const motionOff = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-still'); } catch { return true; }
};

export function confetti(x?: number, y?: number, count = 26) {
  if (motionOff() || typeof document === 'undefined') return;
  const cx = x ?? window.innerWidth / 2, cy = y ?? window.innerHeight / 3;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('i');
    el.className = 'confetti-piece';
    el.style.left = cx + 'px'; el.style.top = cy + 'px';
    el.style.background = COLORS[i % COLORS.length];
    document.body.appendChild(el);
    const angle = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 120;
    const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist - 60;
    const anim = el.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${(Math.random() - 0.5) * 540}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx * 1.2}px, ${dy + 140}px) rotate(${(Math.random() - 0.5) * 900}deg)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' });
    anim.onfinish = () => el.remove();
  }
}

// counts a number up from 0 when it first appears
import { useEffect, useState } from 'react';
export function useCountUp(value: number, ms = 750) {
  const [v, setV] = useState(() => (motionOff() || !Number.isFinite(value) ? value : 0));
  useEffect(() => {
    if (motionOff() || !Number.isFinite(value) || value === 0) { setV(value); return; }
    let raf = 0; const t0 = performance.now(); const from = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / ms); const e = 1 - Math.pow(1 - k, 3); setV(Math.round(from + (value - from) * e)); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]); // eslint-disable-line
  return v;
}
