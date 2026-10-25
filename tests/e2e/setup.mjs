// Puts real files behind the seed's storage rows so previews and downloads can be tested.
import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFDocument, rgb, StandardFonts } = (() => { try { return require('pdf-lib'); } catch { return require((process.env.NODE_GLOBAL || '/home/claude/.npm-global/lib/node_modules') + '/pdf-lib'); } })();
const FILES = path.resolve(path.dirname(new URL(import.meta.url).pathname), '.storage');
async function pdf(label, rooms) {
  const d = await PDFDocument.create(); const p = d.addPage([1190, 842]); const f = await d.embedFont(StandardFonts.Helvetica);
  p.drawRectangle({ x: 40, y: 40, width: 1110, height: 762, borderColor: rgb(0.1, 0.13, 0.23), borderWidth: 3 });
  rooms.forEach(([x, y, w, h, n]) => { p.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.1, 0.13, 0.23), borderWidth: 2 }); p.drawText(n, { x: x + 10, y: y + h - 24, size: 16, font: f }); });
  p.drawText(label, { x: 60, y: 60, size: 22, font: f, color: rgb(0.7, 0.3, 0.1) });
  return Buffer.from(await d.save());
}
const put = (bucket, name, buf) => { const fp = path.join(FILES, bucket, name); fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, buf); };
const O = 'a0000000-0000-4000-8000-000000000001', P = 'e0000000-0000-4000-8000-000000000001';
put('plans', `${O}/${P}/v1/A-101.pdf`, await pdf('A-101 v1', [[100, 300, 400, 400, 'LIVING'], [520, 300, 300, 400, 'KITCHEN']]));
put('plans', `${O}/${P}/v2/A-101.pdf`, await pdf('A-101 v2', [[100, 300, 400, 400, 'LIVING'], [520, 300, 300, 200, 'KITCHEN'], [520, 520, 300, 180, 'BATH']]));
put('plans', `${O}/${P}/e1/E-201.dwg`, Buffer.from('AC1027 fake dwg'));
put('documents', `${O}/${P}/d1/contract.pdf`, await pdf('CONTRACT', [[100, 500, 900, 200, 'AGREEMENT']]));
put('documents', `${O}/${P}/d2/quote.pdf`, await pdf('QUOTE', [[100, 500, 900, 200, 'QUOTE']]));
const sql = `insert into storage.objects (bucket_id, name, metadata) values
 ('documents', '${O}/${P}/d1/contract.pdf', '{"mimetype":"application/pdf","size":2000}'), ('documents', '${O}/${P}/d2/quote.pdf', '{"mimetype":"application/pdf","size":2000}') on conflict do nothing;
 update storage.objects set metadata = '{"mimetype":"application/pdf","size":3000}' where bucket_id = 'plans' and name like '%.pdf';`;
const r = await fetch('http://localhost:8787/__test/sql', { method: 'POST', body: sql }); console.log('setup', (await r.json()).code === 0 ? 'ok' : 'failed');
