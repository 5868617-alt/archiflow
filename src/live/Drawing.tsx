// Renders the real uploaded drawing inside the same 1000×720 SVG coordinate space the viewer uses,
// so pins, findings and measurements work unchanged. Images are shown directly; PDFs are rendered
// (first page) with pdf.js in the browser. DWG/DXF have no browser preview.
import { useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { PLAN_FILES } from './map';

const cache = new Map<string, Promise<{ url: string; w: number; h: number }>>();
const PDFJS_UMD = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
let pdfjsP: Promise<any> | null = null;
function pdfjs(): Promise<any> {
  if (pdfjsP) return pdfjsP;
  const cfg = (globalThis as any).__AF_CONFIG || {};
  pdfjsP = (async () => {
    if (cfg.pdfjsModule) {
      const lib = await (new Function('u', 'return import(u)'))(cfg.pdfjsModule);
      lib.GlobalWorkerOptions.workerSrc = cfg.pdfjsWorker;
      return lib;
    }
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((res, rej) => { const s = document.createElement('script'); s.src = PDFJS_UMD; s.onload = () => res(); s.onerror = () => rej(new Error('pdf.js failed to load')); document.head.appendChild(s); });
    }
    const lib = (window as any).pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return lib;
  })();
  pdfjsP.catch(() => { pdfjsP = null; });
  return pdfjsP;
}

async function render(getUrl: () => Promise<string>, fileType: string) {
  const url = await getUrl();
  if (fileType === 'PDF') {
    const lib = await pdfjs();
    const data = await (await fetch(url)).arrayBuffer();
    const doc = await lib.getDocument({ data }).promise;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, 2000 / Math.max(base.width, base.height));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas'); canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
    return { url: URL.createObjectURL(blob), w: canvas.width, h: canvas.height };
  }
  const dims: { w: number; h: number } = await new Promise((res) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 1000, h: 720 }); im.src = url; });
  return { url, ...dims };
}

export function useDrawing(planId: string, rev: number) {
  const { live } = useStore();
  const files = PLAN_FILES[planId] || {};
  const f = files[rev] || files[Math.max(0, ...Object.keys(files).map(Number))];
  const [st, setSt] = useState<{ state: 'loading' | 'ready' | 'error' | 'none'; url?: string }>({ state: f ? 'loading' : 'none' });
  useEffect(() => {
    if (!f || !live) { setSt({ state: 'none' }); return; }
    if (live.saving && !cache.has(f.path)) { setSt({ state: 'loading' }); return; } // wait until the upload's records are written
    if (!['PDF', 'JPG', 'PNG'].includes(f.fileType)) { setSt({ state: 'none' }); return; }
    let alive = true; let timer: any;
    const key = f.path;
    // a just-uploaded file may not be signable for a moment (its record is still being written): retry a few times
    const attempt = (n: number) => {
      if (!cache.has(key)) { const p = render(() => live.fileUrl('plans', f.path), f.fileType); cache.set(key, p); p.catch(() => cache.delete(key)); }
      cache.get(key)!.then((r) => alive && setSt({ state: 'ready', url: r.url })).catch(() => { if (!alive) return; if (n < 5) timer = setTimeout(() => attempt(n + 1), 800 * (n + 1)); else setSt({ state: 'error' }); });
    };
    setSt({ state: 'loading' });
    attempt(0);
    return () => { alive = false; clearTimeout(timer); };
  }, [f?.path, live?.saving]); // eslint-disable-line
  return { ...st, file: f };
}

export function LiveDrawing({ planId, rev, className, children, style, svgRef, onClick, onMouseMove }: any) {
  const d = useDrawing(planId, rev);
  return (
    <svg ref={svgRef} onClick={onClick} onMouseMove={onMouseMove} viewBox="0 0 1000 720" className={className} style={{ display: 'block', width: '100%', height: 'auto', background: '#fff', ...style }} role="img" aria-label="שרטוט">
      {d.state === 'ready' ? <image href={d.url} x={0} y={0} width={1000} height={720} preserveAspectRatio="xMidYMid meet" /> : null}
      {d.state === 'loading' ? <text x={500} y={360} textAnchor="middle" fontSize={22} fill="#7A8296">טוען שרטוט…</text> : null}
      {d.state === 'error' ? <text x={500} y={360} textAnchor="middle" fontSize={22} fill="#B4572E">לא הצלחנו להציג את הקובץ</text> : null}
      {d.state === 'none' ? <text x={500} y={360} textAnchor="middle" fontSize={22} fill="#7A8296">{d.file?.fileType || ''} · אין תצוגה מקדימה</text> : null}
      {children}
    </svg>
  );
}
