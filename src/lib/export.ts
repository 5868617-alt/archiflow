// Office data export: one ZIP with every table as CSV (opens in Excel, Hebrew included) and one data.json.
// Built in the browser from what the signed-in owner can already read; no extra server access.
// The ZIP writer stores files without compression (method 0), which every unzip tool and Windows/macOS open.

const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array): number { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

export function zip(files: { name: string; data: string | Uint8Array }[], when = new Date()): Blob {
  const enc = new TextEncoder();
  const dosTime = ((when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate()) & 0xFFFF;
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name); const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data; const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint16(8, 0, true); local.setUint16(10, dosTime, true); local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true); cd.setUint16(12, dosTime, true); cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true); cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type: 'application/zip' });
}

const cell = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // keep spreadsheet formulas from running when the file is opened (CSV injection)
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? "'" + s : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export function toCsv(rows: Record<string, any>[]): string {
  const cols: string[] = []; for (const r of rows) for (const k of Object.keys(r)) if (!cols.includes(k)) cols.push(k);
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
}

/** Hebrew names for the files, so the owner knows what each one holds. Unlisted tables keep their key. */
const NAMES: Record<string, string> = {
  office: 'פרטי משרד', users: 'צוות ומשתמשים', memberships: 'חברות במשרד', invitations: 'הזמנות לצוות', clients: 'לקוחות', projects: 'פרויקטים',
  assignments: 'שיוך לפרויקטים', tasks: 'משימות', templates: 'תבניות עבודה', plans: 'שרטוטים', annotations: 'הערות על שרטוטים',
  specItems: 'פריטי מפרט', specVersions: 'גרסאות מפרט', approvals: 'אישורים', documents: 'מסמכים', meetings: 'פגישות', absences: 'היעדרויות',
  suppliers: 'ספקים', purchaseOrders: 'הזמנות רכש', budgetLines: 'תקציב', expenses: 'הוצאות', feeMilestones: 'שכר טרחה', messages: 'הודעות',
  emailLog: 'יומן מיילים', activity: 'פעילות', invoices: 'חשבוניות מנוי', projectPhases: 'שלבים', permits: 'רישוי', consultants: 'יועצים',
  timeEntries: 'שעות', memberRates: 'תעריפי צוות', siteVisits: 'ביקורי פיקוח', siteFindings: 'ממצאי פיקוח', clientBriefs: 'שאלוני פתיחה',
  moodItems: 'לוחות השראה', libraryItems: 'ספרייה', officeSubscription: 'מנוי', branding: 'מיתוג',
};
// platform-wide or demo-only collections that are not the office's own data
const SKIP = new Set(['platformOffices', 'subscriptionPlans', 'pricingChanges', 'tickets', 'auditLog', 'announcements', 'systemEvents', 'notifications', 'faqs', 'helpArticles', 'retentionPolicies']);

export function buildOfficeExport(db: Record<string, any>, officeName: string, when = new Date()) {
  const tables: Record<string, any[]> = {};
  for (const [k, v] of Object.entries(db)) {
    if (SKIP.has(k)) continue;
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) tables[k] = v;
    else if (['office', 'officeSubscription', 'branding'].includes(k) && v && typeof v === 'object' && !Array.isArray(v)) tables[k] = [v];
  }
  const rows = Object.values(tables).reduce((a, t) => a + t.length, 0);
  const stamp = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
  const files: { name: string; data: string }[] = [];
  const used = new Set<string>();
  for (const [k, list] of Object.entries(tables)) {
    let n = (NAMES[k] || k).replace(/[\\/:*?"<>|]/g, '-'); if (used.has(n)) n = `${n} (${k})`; used.add(n);
    files.push({ name: `csv/${n}.csv`, data: toCsv(list) });
  }
  files.unshift({ name: 'data.json', data: JSON.stringify({ exported_at: when.toISOString(), office: officeName, tables }, null, 2) });
  files.unshift({ name: 'קרא אותי.txt', data: [
    `ייצוא נתוני המשרד: ${officeName}`, `תאריך: ${stamp}`, '',
    'data.json – כל הנתונים בקובץ אחד, למעבר למערכת אחרת או לגיבוי.',
    'csv – טבלה לכל סוג מידע (פרויקטים, לקוחות, משימות, תקציב ועוד). נפתח באקסל ובגוגל שיטס.', '',
    'קבצים מצורפים (שרטוטים, מסמכים, תמונות) לא נכללים בקובץ הזה.',
    'הם נשמרים במערכת, ואפשר להוריד כל אחד מהם מתוך הפרויקט.', '',
    'הקובץ מכיל מידע אישי של לקוחות וצוות. שמרו אותו במקום מאובטח.',
  ].join('\r\n') });
  return { blob: zip(files, when), rows, tables: Object.keys(tables).length, fileName: `archiflow-export-${stamp}.zip` };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
