// Accessibility audit of every demo screen (WCAG 2.1 AA / IS 5568 subset, no external libraries):
// text contrast, accessible names for buttons/links/fields, image alt text, page language and direction,
// one h1 and no skipped heading levels, duplicate ids, touch target size on phones, visible focus.
// Usage: node tools/a11y-audit.mjs [width=1366] [--all]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/playwright'); } })();
import fs from 'fs';

const src = fs.readFileSync(new URL('./demo-crawl.mjs', import.meta.url), 'utf8');
const routes = (new Function(src.slice(src.indexOf('const routes = '), src.indexOf('};', src.indexOf('const routes = ')) + 2) + '; return routes;'))();
const width = Number(process.argv[2] || 1366);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: process.env.THEME === 'dark' ? 'dark' : 'light' });
await page.goto(new URL('../dist/test.html', import.meta.url).href);

function audit(mobile) {
  const out = [];
  const add = (rule, el, extra = '') => out.push({ rule, what: describe(el) + (extra ? ' ' + extra : '') });
  const describe = (el) => { if (!el) return ''; const t = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 40); return `<${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}> "${t}"`; };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; // a picture behind text: skip
      if (/gradient/.test(s.backgroundImage)) {
        // solid gradients (e.g. the primary buttons): judge against the average of their opaque color stops
        const stops = [...s.backgroundImage.matchAll(/rgba?\(([^)]+)\)/g)].map((m) => m[1].split(',').map(parseFloat)).filter((p) => p.length === 3 || p[3] >= 1);
        if (stops.length) { const avg = (i) => stops.reduce((a, p) => a + p[i], 0) / stops.length; layers.push({ r: avg(0), g: avg(1), b: avg(2), a: 1 }); break; }
      }
      const c = parse(s.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg);
    return bg;
  };
  const html = document.documentElement;
  if (html.lang !== 'he') add('lang', html, html.lang);
  if (html.dir !== 'rtl' && document.body.dir !== 'rtl' && !document.querySelector('#root[dir=rtl]')) add('dir', html);
  // contrast: every element that directly holds visible text
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest('svg') || el.closest('[aria-hidden="true"]')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const s = getComputedStyle(el);
    if ((s.webkitBackgroundClip || s.backgroundClip) === 'text') continue; // gradient-filled text is checked by its colors, not by 'transparent'
    const fg = parse(s.color); const bg = bgOf(el); if (!fg || !bg) continue;
    const c = blend({ ...fg, a: fg.a * Number(s.opacity || 1) }, bg);
    const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const disabled = el.closest('button:disabled,[aria-disabled=true],input:disabled,select:disabled');
    if (ratio < need && !disabled) { const key = el.className + '|' + s.color + '|' + s.backgroundColor; if (!seen.has(key)) { seen.add(key); add('contrast', el, `${ratio.toFixed(2)}:1 (צריך ${need})`); } }
  }
  // names
  const nameOf = (el) => (el.getAttribute('aria-label') || '').trim() || (el.getAttribute('aria-labelledby') ? (document.getElementById(el.getAttribute('aria-labelledby'))?.innerText || '').trim() : '') || (el.innerText || '').trim() || (el.getAttribute('title') || '').trim() || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ').trim();
  for (const el of document.querySelectorAll('button, a[href], [role=button], [role=tab], [role=menuitem], [role=option]')) { if (visible(el) && !nameOf(el)) add('name', el); }
  for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!visible(el) && !el.closest('.inline-edit')) continue;
    const id = el.id; const lab = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || el.closest('label');
    if (!lab && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')) add('label', el);
  }
  for (const el of document.querySelectorAll('img')) { if (!el.hasAttribute('alt')) add('alt', el); }
  for (const el of document.querySelectorAll('svg[role=img]')) { if (!el.getAttribute('aria-label') && !el.querySelector('title')) add('svg-name', el); }
  // headings
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible);
  const h1 = hs.filter((h) => h.tagName === 'H1').length;
  if (h1 === 0) add('h1-missing', document.body); if (h1 > 1) add('h1-multiple', hs.find((h) => h.tagName === 'H1'), `(${h1})`);
  let prev = 0; for (const h of hs) { const lv = Number(h.tagName[1]); if (prev && lv > prev + 1) add('heading-skip', h, `h${prev}→h${lv}`); prev = lv; }
  // duplicate ids
  const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [k, v] of Object.entries(ids)) if (v > 1) out.push({ rule: 'dup-id', what: `#${k} ×${v}` });
  // main landmark
  if (!document.querySelector('main, [role=main]')) add('no-main', document.body);
  // touch targets on phones (WCAG 2.5.8: 24px minimum; we aim for 40)
  if (mobile) for (const el of document.querySelectorAll('button, a[href], select, input:not([type=hidden]):not([type=checkbox]):not([type=radio])')) {
    if (!visible(el) || el.closest('.tbl-stack td') && el.tagName === 'A') continue;
    const r = el.getBoundingClientRect(); if (r.height < 24 || r.width < 24) add('target', el, `${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return out;
}

const totals = {}; const lines = [];
for (const [user, list] of Object.entries(routes)) {
  for (const r of list) {
    await page.evaluate(([u, path]) => { localStorage.setItem('archiflow.demo.v3', JSON.stringify({ ...(JSON.parse(localStorage.getItem('archiflow.demo.v3') || '{}')), userId: u === 'anon' ? 'u_yoav' : u, path })); }, [user, r]);
    await page.reload(); await page.waitForTimeout(r.includes("projects") && !r.includes("/p_") ? 1000 : 750);
    const res = await page.evaluate(audit, width < 700);
    for (const x of res) { totals[x.rule] = (totals[x.rule] || 0) + 1; lines.push(`${user} ${r} · ${x.rule} · ${x.what}`); }
  }
}
// keyboard focus is visible on a sample of controls
await page.evaluate(() => { localStorage.setItem('archiflow.demo.v3', JSON.stringify({ ...(JSON.parse(localStorage.getItem('archiflow.demo.v3') || '{}')), userId: 'u_yoav', path: '/dashboard' })); }); await page.reload(); await page.waitForTimeout(300);
let noFocus = 0;
for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); const ok = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return true; const s = getComputedStyle(a); return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none'; }); if (!ok) noFocus++; }
if (noFocus) { totals['focus'] = noFocus; lines.push(`u_yoav /dashboard · focus · ${noFocus} of 25 tab stops without a visible focus ring`); }
const uniq = [...new Set(lines)];
console.log(process.argv.includes('--all') ? uniq.join('\n') : uniq.slice(0, 120).join('\n'));
console.log('\nTOTAL', JSON.stringify(totals), `(${uniq.length} unique)`);
await browser.close();
