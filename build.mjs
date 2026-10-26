// ArchiFlow demo build
// Production: React 18.3.1 UMD from cdnjs (page contract), app bundled inline.
// Test (--test): bundles the locally installed React so the page can be screenshotted offline.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);
// esbuild / react-icons: from this project's node_modules after `npm install`, otherwise from a global install
const firstExisting = (...paths) => paths.find((p) => fs.existsSync(p));
const esbuild = require(firstExisting(path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules/esbuild'), '/opt/npm-tools/node_modules/esbuild'));

const TEST = process.argv.includes('--test');
const LIVE = process.argv.includes('--live');
const GLOBAL_NM = firstExisting(path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules/react-icons')) ? path.join(path.dirname(new URL(import.meta.url).pathname), 'node_modules') : '/home/claude/.npm-global/lib/node_modules';
const root = path.dirname(new URL(import.meta.url).pathname);

const shimPlugin = {
  name: 'react-shim',
  setup(build) {
    if (TEST) {
      build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (a) => ({ path: require.resolve(path.join(GLOBAL_NM, a.path)) }));
    } else {
      build.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'shim' }));
      build.onResolve({ filter: /^react-dom(\/client)?$/ }, () => ({ path: 'react-dom', namespace: 'shim' }));
      // packages compiled with the automatic JSX runtime (react/jsx-runtime) must use the page's React 18 too,
      // otherwise they create React 19 elements that React 18 cannot render (minified error #31)
      build.onResolve({ filter: /^react\/jsx(-dev)?-runtime$/ }, () => ({ path: 'jsx-runtime', namespace: 'shim' }));
      build.onLoad({ filter: /.*/, namespace: 'shim' }, (a) => ({
        contents: a.path === 'react' ? 'module.exports = window.React;'
          : a.path === 'jsx-runtime'
            ? `var R = window.React;
function jsx(type, props, key) { var p = {}; for (var k in props) if (k !== 'children') p[k] = props[k]; if (key !== undefined) p.key = key;
  var c = props && props.children; return c === undefined ? R.createElement(type, p) : Array.isArray(c) ? R.createElement.apply(null, [type, p].concat(c)) : R.createElement(type, p, c); }
module.exports = { jsx: jsx, jsxs: jsx, jsxDEV: jsx, Fragment: R.Fragment };`
            : 'module.exports = window.ReactDOM;',
        loader: 'js',
      }));
    }
    build.onResolve({ filter: /^react-icons(\/.*)?$/ }, (a) => ({ path: path.join(GLOBAL_NM, a.path, a.path.includes('/') ? 'index.mjs' : 'index.mjs') }));
  },
};

const result = await esbuild.build({
  entryPoints: [path.join(root, LIVE ? 'src/live/main.tsx' : 'src/main.tsx')],
  bundle: true,
  write: false,
  format: 'iife',
  minify: !TEST,
  target: ['es2019'],
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  inject: [path.join(root, 'src/lib/react-inject.js')],
  plugins: [shimPlugin],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
  charset: 'utf8',
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readdirSync(path.join(root, 'src/styles')).sort().map((f) => fs.readFileSync(path.join(root, 'src/styles', f), 'utf8')).join('\n');

const head = `<title>ArchiFlow</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Hebrew:wght@300;400;500;600;700&display=swap">
<style>${css}</style>`;
const reactTags = TEST ? '' : `<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>`;
const bodyHtml = `<div id="root" dir="rtl" lang="he"></div>
${reactTags}
<script>${js}</script>`;

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
if (LIVE) {
  // Live site: a complete page. The flag must be set before the bundle evaluates (dates, ids).
  const cfg = TEST ? `window.__AF_CONFIG={url:location.origin,pdfjsModule:location.origin+'/_pdfjs/pdf.min.mjs',pdfjsWorker:location.origin+'/_pdfjs/pdf.worker.min.mjs'};window.__AF_DEBUG=true;` : '';
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="description" content="ArchiFlow – ניהול פרויקטים למשרדי אדריכלות ועיצוב פנים">
<meta name="theme-color" content="#3D2233">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="ArchiFlow">
<link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
${head}</head><body>
<script>window.__AF_LIVE=true;${cfg}</script>
${bodyHtml}${TEST ? '' : `<script>if('serviceWorker' in navigator&&location.protocol==='https:'){var hadSw=!!navigator.serviceWorker.controller,swReloaded=false;navigator.serviceWorker.addEventListener('controllerchange',function(){if(hadSw&&!swReloaded){swReloaded=true;location.reload()}});addEventListener('load',function(){navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(function(r){r.update()}).catch(function(){})})}</script>`}</body></html>`;
  const out = path.join(root, TEST ? 'dist/live-test' : 'dist/live');
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(path.join(root, 'public'))) {
    const src = path.join(root, 'public', f);
    if (f === 'sw.js') fs.writeFileSync(path.join(out, f), fs.readFileSync(src, 'utf8').replace('__BUILD__', Date.now().toString(36)));
    else fs.copyFileSync(src, path.join(out, f));
  }
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  if (!TEST) {
    // static hosting helpers (Netlify / Vercel): security headers and SPA fallback
    fs.writeFileSync(path.join(out, '_headers'), `/*\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=63072000; includeSubDomains\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://qbwaqngxdgmqgddxcuzv.supabase.co; connect-src 'self' https://qbwaqngxdgmqgddxcuzv.supabase.co; frame-src https://qbwaqngxdgmqgddxcuzv.supabase.co; worker-src 'self' blob: https://cdnjs.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'\n`);
    fs.writeFileSync(path.join(out, '_redirects'), '/*  /index.html  200\n');
    fs.writeFileSync(path.join(out, 'vercel.json'), JSON.stringify({ rewrites: [{ source: '/(.*)', destination: '/index.html' }], headers: [{ source: '/(.*)', headers: [
      { key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' } ] }] }, null, 2));
  }
  console.log('live build ok', TEST ? '(test)' : '', (html.length / 1024).toFixed(0) + 'KB');
} else if (TEST) {
  fs.writeFileSync(path.join(root, 'dist/test.html'), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${head}</head><body>${bodyHtml}</body></html>`);
  console.log('test build ok', (js.length / 1024).toFixed(0) + 'KB js');
} else {
  fs.writeFileSync(path.join(root, 'dist/archiflow.html'), head + '\n' + bodyHtml);
  // public demo next to the live site (/demo): the same app with sample data kept in the visitor's browser
  fs.writeFileSync(path.join(root, 'dist/demo.html'), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="הדגמה של ArchiFlow עם נתונים לדוגמה – ניהול פרויקטים למשרדי אדריכלות ועיצוב פנים">
<meta name="theme-color" content="#3D2233"><link rel="icon" href="/icon.svg" type="image/svg+xml">
${head.replace('<title>ArchiFlow</title>', '<title>ArchiFlow – הדגמה</title>')}</head><body>${bodyHtml}</body></html>`);
  console.log('prod build ok', (fs.statSync(path.join(root, 'dist/archiflow.html')).size / 1024).toFixed(0) + 'KB');
}
