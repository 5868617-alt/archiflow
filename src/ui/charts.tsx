import { ils, ilsShort, pct } from '../lib/format';
import { cx } from './core';

/** Horizontal planned-vs-actual bars (RTL friendly, HTML based). */
export function BudgetBars({ rows, warn = 0.9 }: { rows: { label: string; planned: number; actual: number; committed?: number }[]; warn?: number }) {
  return (
    <div className="col g12">
      {rows.map((r) => {
        const p = r.planned ? r.actual / r.planned : 0;
        const c = r.planned ? (r.committed || 0) / r.planned : 0;
        const tone = p > 1 ? 'var(--bad)' : p >= warn ? 'var(--warn)' : 'var(--navy-3)';
        return (
          <div key={r.label}>
            <div className="meter-label"><span className="bold">{r.label}</span><span className="num soft">{ils(r.actual)} <span className="muted">/ {ils(r.planned)}</span> · <b style={{ color: p > 1 ? 'var(--bad)' : p >= warn ? 'var(--warn)' : 'var(--ink)' }}>{pct(p)}</b></span></div>
            <div style={{ position: 'relative', height: 12, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }} role="img" aria-label={`${r.label}: ${pct(p)} נוצל`}>
              <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: `${Math.min(100, p * 100)}%`, background: tone, borderRadius: 6 }} />
              {c > 0 ? <div style={{ position: 'absolute', insetInlineStart: `${Math.min(100, p * 100)}%`, top: 0, bottom: 0, width: `${Math.min(100 - Math.min(100, p * 100), c * 100)}%`, background: 'repeating-linear-gradient(45deg, var(--accent) 0 4px, var(--accent-soft) 4px 8px)' }} /> : null}
              {p > 1 ? <div style={{ position: 'absolute', insetInlineStart: `${100 / p}%`, top: -2, bottom: -2, width: 2, background: 'var(--ink)' }} /> : null}
            </div>
          </div>
        );
      })}
      <div className="legend"><span><i style={{ background: 'var(--navy-3)' }} />בפועל</span><span><i style={{ background: 'repeating-linear-gradient(45deg, var(--accent) 0 3px, var(--accent-soft) 3px 6px)' }} />התחייבויות פתוחות (הזמנות רכש)</span><span><i style={{ background: 'var(--warn)' }} />מעל {Math.round(warn * 100)}%</span><span><i style={{ background: 'var(--bad)' }} />חריגה</span></div>
    </div>
  );
}

export function Donut({ parts, size = 150, stroke = 22, center, sub }: { parts: { label: string; value: number; color: string }[]; size?: number; stroke?: number; center?: string; sub?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="row g16 wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
          {parts.map((p) => { const len = (p.value / total) * c; const el = <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke} strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`} strokeDashoffset={-acc} />; acc += len; return el; })}
        </g>
        {center ? <text x="50%" y="48%" textAnchor="middle" fontSize={size / 7.5} fontWeight={600} fill="var(--ink)" style={{ fontVariantNumeric: 'tabular-nums' }}>{center}</text> : null}
        {sub ? <text x="50%" y="62%" textAnchor="middle" fontSize={size / 13} fill="var(--ink-3)">{sub}</text> : null}
      </svg>
      <div className="col g4 small" style={{ minWidth: 0 }}>
        {parts.map((p) => <div key={p.label} className="row g8"><i style={{ width: 10, height: 10, borderRadius: 2, background: p.color, display: 'inline-block', flex: '0 0 10px' }} /><span className="grow soft">{p.label}</span><span className="num bold">{Math.round((p.value / total) * 100)}%</span></div>)}
      </div>
    </div>
  );
}

/** Vertical columns. Values plotted with one linear scale from 0 to a rounded max. */
export function Columns({ data, height = 200, format = ilsShort, color = 'var(--navy-3)', highlightLast, series2, width = 640 }: { data: { label: string; value: number; value2?: number }[]; height?: number; format?: (n: number) => string; color?: string; highlightLast?: boolean; series2?: { color: string; label: string; label1: string }; width?: number }) {
  const W = width, H = height, padL = 52, padB = 26, padT = 12;
  const raw = Math.max(1, ...data.map((d) => Math.max(d.value, d.value2 || 0)));
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const max = Math.ceil(raw / mag) * mag;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const bw = (W - padL - 10) / data.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(', ')}>
        {ticks.map((t) => <g key={t}><line className="grid-l" x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} /><text x={padL - 8} y={y(t) + 4} textAnchor="end" direction="ltr">{format(t)}</text></g>)}
        {data.map((d, i) => {
          const x = padL + 6 + i * bw; const w = series2 ? (bw - 14) / 2 : bw - 14;
          const last = highlightLast && i === data.length - 1;
          return (
            <g key={d.label}>
              <rect x={x} y={y(d.value)} width={Math.max(2, w)} height={Math.max(0, y(0) - y(d.value))} rx={2} fill={last ? 'var(--accent)' : color} />
              {series2 ? <rect x={x + w + 2} y={y(d.value2 || 0)} width={Math.max(2, w)} height={Math.max(0, y(0) - y(d.value2 || 0))} rx={2} fill={series2.color} /> : null}
              <text x={x + (series2 ? w + 1 : w / 2)} y={H - 8} textAnchor="middle">{d.label}</text>
            </g>
          );
        })}
        <line className="axis-l" x1={padL} x2={W - 4} y1={y(0)} y2={y(0)} />
      </svg>
      {series2 ? <div className="legend mt8"><span><i style={{ background: color }} />{series2.label1}</span><span><i style={{ background: series2.color }} />{series2.label}</span></div> : null}
    </div>
  );
}

export function Spark({ values, w = 120, h = 34, color = 'var(--navy-3)' }: { values: number[]; w?: number; h?: number; color?: string }) {
  const max = Math.max(...values), min = Math.min(...values);
  const sx = (i: number) => (i / (values.length - 1)) * (w - 6) + 3;
  const sy = (v: number) => h - 4 - ((v - min) / (max - min || 1)) * (h - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${sx(i)} ${sy(v)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ display: 'block' }}>
      <path d={`${d} L ${sx(values.length - 1)} ${h} L ${sx(0)} ${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.8} />
      <circle cx={sx(values.length - 1)} cy={sy(values[values.length - 1])} r={3} fill={color} />
    </svg>
  );
}

/** Stacked horizontal bar for a total split into parts. */
export function StackBar({ parts, total }: { parts: { label: string; value: number; color: string }[]; total?: number }) {
  const t = total || parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--surface-3)' }} role="img" aria-label={parts.map((p) => `${p.label} ${ils(p.value)}`).join(', ')}>
        {parts.map((p) => <div key={p.label} style={{ width: `${(p.value / t) * 100}%`, background: p.color }} title={`${p.label}: ${ils(p.value)}`} />)}
      </div>
      <div className="legend mt8">{parts.map((p) => <span key={p.label}><i style={{ background: p.color }} />{p.label} · <b className="num">{ils(p.value)}</b></span>)}</div>
    </div>
  );
}

// ---------- small visual atoms ----------
export function Swatch({ color, pattern, size, label }: { color: string; pattern?: string; size?: string; label?: string }) {
  let overlay = '';
  if (pattern === 'wood') overlay = 'repeating-linear-gradient(95deg, rgba(0,0,0,.08) 0 2px, transparent 2px 9px), repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 23px)';
  if (pattern === 'stone') overlay = 'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,.35), transparent 40%), linear-gradient(120deg, transparent 45%, rgba(120,100,70,.25) 47%, transparent 50%), linear-gradient(160deg, transparent 60%, rgba(120,100,70,.18) 61%, transparent 63%)';
  if (pattern === 'tile') overlay = 'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)';
  if (pattern === 'fabric') overlay = 'repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,.05) 0 1px, transparent 1px 3px)';
  if (pattern === 'metal') overlay = 'linear-gradient(115deg, rgba(255,255,255,.45), transparent 40%, rgba(255,255,255,.25) 60%, transparent 80%)';
  if (pattern === 'glass') overlay = 'radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 35%)';
  const bgSize = pattern === 'tile' ? '14px 28px' : undefined;
  return <div className={cx('swatch', size)} style={{ backgroundColor: color, backgroundImage: overlay || undefined, backgroundSize: bgSize }} role="img" aria-label={label ? `דוגמת חומר: ${label}` : 'דוגמת חומר'} />;
}
const FT: Record<string, string> = { PDF: '#B13A3A', DWG: '#2D5C99', DXF: '#3E6A8A', JPG: '#2E7656', PNG: '#2E7656', DOCX: '#2B579A', XLSX: '#217346', ZIP: '#6A4C9C' };
export function FileIcon({ type }: { type: string }) {
  return <span className="file-ic" style={{ background: FT[type] || '#44607A' }} aria-label={`קובץ ${type}`}>{type}</span>;
}
export function Logo({ size = 30 }: any) {
  return (
    <svg className="sb-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="3" fill="none" stroke="var(--accent-bright)" strokeWidth="2" />
      <path d="M7 25 L16 7 L25 25" fill="none" stroke="var(--accent-bright)" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M10.5 18 H21.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="7" r="1.8" fill="currentColor" />
    </svg>
  );
}

// Project timeline: each project is a bar from start to target date, filled to its progress,
// with a "today" line. RTL: time runs from right (earlier) to left (later), like reading Hebrew.
export function ProjectTimeline({ rows, today, onOpen }: { rows: { id: string; name: string; start: string; end: string; progress: number; color: string; status: string; late?: boolean }[]; today: string; onOpen?: (id: string) => void }) {
  if (!rows.length) return null;
  const t = (d: string) => new Date(d + 'T00:00:00').getTime();
  const DAY = 86400000;
  const lo0 = Math.min(...rows.map((r) => t(r.start)), t(today) - 30 * DAY);
  const hi0 = Math.max(...rows.map((r) => t(r.end)), t(today) + 60 * DAY);
  const lo = new Date(new Date(lo0).getFullYear(), new Date(lo0).getMonth(), 1).getTime();
  const hiD = new Date(hi0); const hi = new Date(hiD.getFullYear(), hiD.getMonth() + 1, 1).getTime();
  const pos = (ms: number) => ((ms - lo) / (hi - lo)) * 100; // % from the right edge
  const months: { label: string; at: number; year?: number }[] = [];
  for (let d = new Date(lo); d.getTime() < hi; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push({ label: MONTHS_S[d.getMonth()], at: pos(d.getTime()), year: d.getFullYear() });
  const step = Math.ceil(months.length / 12);
  months.forEach((m, i) => { const prev = months[i - step]; if (step === 1 && m.label !== MONTHS_S[0] && i !== 0) m.year = undefined; else if (step > 1 && prev && prev.year === m.year) m.year = undefined; });
  const nowAt = pos(t(today));
  return (
    <div className="ptl" role="list" aria-label="ציר זמן פרויקטים">
      <div className="ptl-axis" aria-hidden>
        {months.map((m, i) => (i % step === 0 ? <span key={i} className="ptl-month" style={{ insetInlineStart: m.at + '%' }}>{m.label}{m.year ? <b> {String(m.year).slice(2)}</b> : null}</span> : null))}
      </div>
      <div className="ptl-body">
        <div className="ptl-layer" aria-hidden>
          {months.map((m, i) => (i % step === 0 ? <i key={i} className="ptl-gl" style={{ insetInlineStart: m.at + '%' }} /> : null))}
          <div className="ptl-today" style={{ insetInlineStart: nowAt + '%' }}><span>היום</span></div>
        </div>
        {rows.map((r) => {
          const a = pos(t(r.start)), b = pos(t(r.end));
          return (
            <button type="button" role="listitem" key={r.id} className="ptl-row" onClick={() => onOpen?.(r.id)} title={`${r.name} · ${r.status} · ${r.progress}%`}>
              <span className="ptl-name ellipsis">{r.name}</span>
              <span className="ptl-track">
                <span className={'ptl-bar' + (r.late ? ' late' : '')} style={{ insetInlineStart: a + '%', width: Math.max(1.5, b - a) + '%', ['--c' as any]: r.color }}>
                  <span className="ptl-fill" style={{ width: r.progress + '%' }} />
                  <span className="ptl-pct">{r.progress}%</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const MONTHS_S = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
