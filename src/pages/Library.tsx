// The studio's own materials and products library, with a one-click "add to a project's spec".
import { useMemo, useState } from 'react';
import { LuLibrary, LuPlus, LuPencil, LuTrash2, LuLayers, LuExternalLink } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, supplierOf, visibleProjects, hasFeature } from '../data/api';
import { LIBRARY_CATEGORIES } from '../data/architect';
import type * as T from '../data/types';
import { PageHead, Btn, Card, Badge, Empty, Modal, Field, Input, Select, Textarea, Chips, SearchBox, IconBtn, Confirm } from '../ui/core';
import { StoredImage, useStoreImage, ImagePick } from '../ui/StoredImage';
import { ils } from '../lib/format';

export function LibraryPage({ query }: any) {
  const { db, nav } = useStore();
  const [q, setQ] = useState(query.q || '');
  const [cat, setCat] = useState('all');
  const [edit, setEdit] = useState<T.LibraryItem | 'new' | null>(null);
  const [toSpec, setToSpec] = useState<T.LibraryItem | null>(null);
  const items = db.libraryItems;
  const cats = [...new Set([...items.map((i) => i.category).filter(Boolean)])];
  const shown = useMemo(() => items.filter((i) => (cat === 'all' || i.category === cat) && (!q || `${i.name} ${i.sku} ${i.tags.join(' ')} ${supplierOf(db, i.supplierId)?.name || ''}`.includes(q))), [items, cat, q, db]);
  return (
    <div>
      <PageHead title="ספריית חומרים" sub="החומרים, המוצרים והספקים שהמשרד עובד איתם – מוכנים להוספה למפרט של כל פרויקט." actions={<Btn kind="primary" icon={LuPlus} onClick={() => setEdit('new')}>פריט לספרייה</Btn>} />
      <div className="filters"><SearchBox value={q} onChange={setQ} placeholder="חיפוש בספרייה…" id="lib-q" /><Chips value={cat} onChange={setCat} options={[{ value: 'all', label: 'הכול', count: items.length }, ...cats.map((c) => ({ value: c, label: c, count: items.filter((i) => i.category === c).length }))]} /></div>
      {shown.length ? (
        <div className="lib-grid">
          {shown.map((i) => {
            const s = supplierOf(db, i.supplierId);
            return (
              <article key={i.id} className="card lib-card">
                <StoredImage bucket="library" src={i.image} alt={i.name} className="lib-img" />
                <div className="card-body stack" style={{ gap: 6 }}>
                  <div className="row between g4"><h2 className="lib-name">{i.name}</h2><IconBtn icon={LuPencil} label={`עריכת ${i.name}`} onClick={() => setEdit(i)} /></div>
                  <div className="xs muted">{[i.category, s?.name].filter(Boolean).join(' · ')}</div>
                  <div className="row between g8 wrap"><b className="num">{i.price != null ? `${ils(i.price)} / ${i.unit || 'יח׳'}` : 'ללא מחיר'}</b>{i.sku ? <span className="xs muted ltr">{i.sku}</span> : null}</div>
                  {i.tags.length ? <div className="row g4 wrap">{i.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div> : null}
                  <div className="row g4 wrap mt4">
                    <Btn size="sm" icon={LuLayers} onClick={() => setToSpec(i)}>למפרט של פרויקט</Btn>
                    {i.url ? <a className="btn sm ghost" href={i.url} target="_blank" rel="noopener noreferrer"><LuExternalLink aria-hidden />אתר הספק</a> : null}
                    {s && hasFeature(db, 'procurement') ? <Btn size="sm" kind="ghost" onClick={() => nav(`/suppliers/${s.id}`)}>הספק</Btn> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : <div className="card"><Empty icon={LuLibrary} title={items.length ? 'אין פריטים בסינון הזה' : 'הספרייה ריקה'} action={<Btn kind="primary" icon={LuPlus} onClick={() => setEdit('new')}>הוספת פריט ראשון</Btn>}>שמרו כאן חומרים ומוצרים שאתם חוזרים אליהם – אריחים, ברזים, גופי תאורה – עם מחיר, ספק ומק״ט.</Empty></div>}
      {edit ? <LibraryForm item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} /> : null}
      {toSpec ? <ToSpec item={toSpec} onClose={() => setToSpec(null)} /> : null}
    </div>
  );
}

function LibraryForm({ item, onClose }: { item: T.LibraryItem | null; onClose: () => void }) {
  const { db, run, toast } = useStore();
  const storeImage = useStoreImage();
  const [f, setF] = useState({ ...(item || { id: uid('lib'), name: '', category: LIBRARY_CATEGORIES[0], supplierId: '', sku: '', unit: 'יח׳', price: null, url: '', notes: '', tags: [] as string[] }), priceS: item?.price != null ? String(item.price) : '', tagsS: (item?.tags || []).join(', ') } as any);
  const [err, setErr] = useState<any>({}); const [busy, setBusy] = useState(false); const [del, setDel] = useState(false);
  const pick = async (file: File) => { setBusy(true); const p = await storeImage(file, 'library', null); setBusy(false); if (p) setF((x: any) => ({ ...x, image: p })); };
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = 'יש להזין שם';
    if (f.url && !/^https?:\/\//.test(f.url)) e.url = 'כתובת שמתחילה ב-https://';
    if (f.priceS !== '' && !(Number(f.priceS) >= 0)) e.price = 'מחיר לא תקין';
    setErr(e); if (Object.keys(e).length) return;
    const { priceS, tagsS, ...rest } = f;
    run(A.saveLibrary, { ...rest, name: f.name.trim(), price: priceS === '' ? null : Number(priceS), tags: tagsS.split(',').map((t: string) => t.trim()).filter(Boolean) }, !item);
    toast(item ? 'הפריט עודכן' : 'הפריט נוסף לספרייה'); onClose();
  };
  return (
    <Modal title={item ? 'עריכת פריט' : 'פריט חדש לספרייה'} onClose={onClose} foot={<>
      <Btn kind="primary" disabled={busy} onClick={save}>{busy ? 'מעלה…' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>
      {item ? <Btn kind="danger" icon={LuTrash2} style={{ marginInlineStart: 'auto' }} onClick={() => setDel(true)}>מחיקה</Btn> : null}</>}>
      <div className="form-grid">
        <Field label="שם *" full error={err.name} htmlFor="lf-n"><Input id="lf-n" value={f.name} invalid={err.name} onChange={(e: any) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="קטגוריה" htmlFor="lf-c"><Select id="lf-c" value={f.category} onChange={(e: any) => setF({ ...f, category: e.target.value })} options={[...new Set([...LIBRARY_CATEGORIES, f.category])].filter(Boolean)} /></Field>
        <Field label="ספק" htmlFor="lf-s"><Select id="lf-s" value={f.supplierId} placeholder="ללא ספק" onChange={(e: any) => setF({ ...f, supplierId: e.target.value })} options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="מק״ט" htmlFor="lf-k"><Input id="lf-k" className="ltr" value={f.sku} onChange={(e: any) => setF({ ...f, sku: e.target.value })} /></Field>
        <Field label="יחידה" htmlFor="lf-u"><Select id="lf-u" value={f.unit} onChange={(e: any) => setF({ ...f, unit: e.target.value })} options={['יח׳', 'מ״ר', 'מ״א', 'קומפלט', 'ליטר', 'ק״ג']} /></Field>
        <Field label="מחיר ליחידה (₪, לפני מע״מ)" error={err.price} htmlFor="lf-p"><Input id="lf-p" type="number" min={0} value={f.priceS} invalid={err.price} onChange={(e: any) => setF({ ...f, priceS: e.target.value })} /></Field>
        <Field label="קישור לאתר הספק" error={err.url} htmlFor="lf-url"><Input id="lf-url" className="ltr" type="url" value={f.url} invalid={err.url} onChange={(e: any) => setF({ ...f, url: e.target.value })} placeholder="https://" /></Field>
        <Field label="תגיות" full hint="מופרדות בפסיקים" htmlFor="lf-t"><Input id="lf-t" value={f.tagsS} onChange={(e: any) => setF({ ...f, tagsS: e.target.value })} placeholder="רחצה, פופולרי" /></Field>
        <Field label="הערות" full htmlFor="lf-no"><Textarea id="lf-no" rows={2} value={f.notes} onChange={(e: any) => setF({ ...f, notes: e.target.value })} placeholder="זמן אספקה, גימורים, הנחת משרד" /></Field>
        <div className="field full"><span className="lbl">תמונה</span><div className="row g8 wrap" style={{ alignItems: 'center' }}>{f.image ? <StoredImage bucket="library" src={f.image} alt="תמונת הפריט" className="finding-photo" /> : null}<ImagePick id="lf-img" onFile={pick} label={f.image ? 'החלפת תמונה' : 'בחירת תמונה'} /></div></div>
      </div>
      {del && item ? <Confirm title="מחיקת פריט" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deleteLibrary, item.id); toast('הפריט נמחק'); onClose(); }}>פריטי מפרט שכבר נוצרו ממנו לא יימחקו.</Confirm> : null}
    </Modal>
  );
}

function ToSpec({ item, onClose }: { item: T.LibraryItem; onClose: () => void }) {
  const { db, me, run, toast, nav } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'הושלם');
  const [f, setF] = useState({ projectId: projects[0]?.id || '', room: '', qty: '1' });
  const rooms = [...new Set(db.specItems.filter((s) => s.projectId === f.projectId).map((s) => s.room))];
  const [err, setErr] = useState<any>({});
  return (
    <Modal title="הוספה למפרט" sub={item.name} size="narrow" onClose={onClose} foot={<>
      <Btn kind="primary" onClick={() => {
        const e: any = {}; if (!f.projectId) e.p = 'יש לבחור פרויקט'; if (!f.room.trim()) e.room = 'יש לציין חדר / אזור'; if (!(Number(f.qty) > 0)) e.qty = 'כמות חייבת להיות גדולה מ-0';
        setErr(e); if (Object.keys(e).length) return;
        run(A.libraryToSpec, item.id, uid('s'), f.projectId, f.room.trim(), Number(f.qty));
        toast('נוסף למפרט כטיוטה', 'ok'); onClose(); nav(`/specs/${f.projectId}`);
      }}>הוספה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <Field label="פרויקט" error={err.p} htmlFor="ts-p"><Select id="ts-p" value={f.projectId} onChange={(e: any) => setF({ ...f, projectId: e.target.value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Field>
        <Field label="חדר / אזור" error={err.room} htmlFor="ts-r"><Input id="ts-r" list="ts-rooms" value={f.room} invalid={err.room} onChange={(e: any) => setF({ ...f, room: e.target.value })} placeholder="מטבח" /><datalist id="ts-rooms">{rooms.map((r) => <option key={r} value={r} />)}</datalist></Field>
        <Field label={`כמות (${item.unit || 'יח׳'})`} error={err.qty} htmlFor="ts-q"><Input id="ts-q" type="number" min={0} step="any" value={f.qty} invalid={err.qty} onChange={(e: any) => setF({ ...f, qty: e.target.value })} /></Field>
        <span className="xs muted">הפריט נכנס למפרט כטיוטה, עם הספק, המק״ט והמחיר מהספרייה. שליחה לאישור הלקוח – מהמפרט.</span>
      </div>
    </Modal>
  );
}
