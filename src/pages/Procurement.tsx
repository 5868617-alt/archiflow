import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuPlus, LuPhone, LuMail, LuMapPin, LuStar, LuSend, LuPackageCheck, LuReceipt, LuPencil, LuTrash2, LuX, LuTruck, LuShoppingCart } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, supplierOf, userName, A, uid, byId, poTotal, canSeeFinance, VAT } from '../data/api';
import type * as T from '../data/types';
import { todayISO, D, daysFromToday } from '../data/dates';
import { PageHead, Btn, Select, SearchBox, Chips, DataTable, StatusBadge, Badge, Card, KV, Modal, Field, Input, Textarea, Empty, Callout, Stat, Progress, cx, Confirm } from '../ui/core';
import { ProjectLink, PersonCell } from './shared';
import { ExpenseForm } from './Finance';
import { ils, date, relDay } from '../lib/format';

const PO_FLOW: T.POStatus[] = ['טיוטה', 'נשלחה לספק', 'אושרה ע״י ספק', 'בייצור', 'סופקה חלקית', 'סופקה'];
const Stars = ({ n }: { n: number }) => <span className="row g4 small" aria-label={`דירוג ${n} מתוך 5`}><LuStar aria-hidden style={{ width: 14, color: 'var(--accent-hover)', fill: 'var(--accent)' }} /><span className="num">{n.toFixed(1)}</span></span>;

export function SuppliersList({ query }: any) {
  const { db, me, nav, live } = useStore();
  const [kind, setKind] = useState('all');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const fin = canSeeFinance(db, me);
  let list = db.suppliers.filter((s) => kind === 'all' || s.kind === kind);
  if (q.trim()) list = list.filter((s) => s.name.includes(q) || s.category.includes(q) || s.contact.includes(q) || s.city.includes(q));
  return (
    <div>
      <PageHead title="ספקים וקבלנים" sub={IS_LIVE ? 'ספקים, קבלנים ובעלי מקצוע. אין להם חשבון משתמש במערכת.' : 'ספקים, קבלנים ובעלי מקצוע. בשלב ה-MVP אין להם חשבון משתמש (הנחת דמו).'} actions={<Btn kind="primary" icon={LuPlus} onClick={() => setAdding(true)}>ספק חדש</Btn>} />
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="חיפוש לפי שם, תחום, עיר" id="sup-search" />
        <Chips value={kind} onChange={setKind} options={[{ value: 'all', label: 'הכול', count: db.suppliers.length }, ...['ספק', 'קבלן', 'בעל מקצוע'].map((k) => ({ value: k, label: k, count: db.suppliers.filter((s) => s.kind === k).length }))]} />
      </div>
      <div className="card">
        <DataTable rows={list} onRow={(s: T.Supplier) => nav(`/suppliers/${s.id}`)} columns={[
          { key: 'name', label: 'שם', render: (s: T.Supplier) => <div className="col" style={{ gap: 0 }}><b>{s.name}</b><span className="xs muted">{s.category}</span></div> },
          { key: 'kind', label: 'סוג', render: (s: T.Supplier) => <Badge tone={s.kind === 'קבלן' ? 'warn' : s.kind === 'בעל מקצוע' ? 'violet' : 'info'}>{s.kind}</Badge> },
          { key: 'contact', label: 'איש קשר', render: (s: T.Supplier) => <div className="col" style={{ gap: 0 }}><span>{s.contact}</span><span className="xs muted ltr" style={{ textAlign: 'right' }}>{s.phone}</span></div> },
          { key: 'city', label: 'עיר' },
          { key: 'rating', label: 'דירוג פנימי', render: (s: T.Supplier) => <Stars n={s.rating} /> },
          { key: 'open', label: 'הזמנות פתוחות', sortValue: (s: T.Supplier) => db.purchaseOrders.filter((o) => o.supplierId === s.id && !['סופקה', 'בוטלה'].includes(o.status)).length, render: (s: T.Supplier) => <span className="num">{db.purchaseOrders.filter((o) => o.supplierId === s.id && !['סופקה', 'בוטלה'].includes(o.status)).length}</span> },
          ...(fin ? [{ key: 'spend', label: 'היקף הוצאות', num: true, sortValue: (s: T.Supplier) => db.expenses.filter((e) => e.supplierId === s.id).reduce((a, e) => a + e.amount, 0), render: (s: T.Supplier) => ils(db.expenses.filter((e) => e.supplierId === s.id).reduce((a, e) => a + e.amount, 0)) }] : []),
        ]} />
      </div>
      {adding ? <SupplierForm onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

function SupplierForm({ supplier, onClose }: any) {
  const { run, toast, nav, live } = useStore();
  const isNew = !supplier;
  const [f, setF] = useState<T.Supplier>(() => supplier ? { ...supplier } : { id: uid('sup'), officeId: 'off_1', name: '', kind: 'ספק', category: '', contact: '', phone: '', email: '', city: '', rating: 4, paymentTerms: 'שוטף + 30', notes: '' });
  const [err, setErr] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = 'יש להזין שם';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'מייל לא תקין';
    setErr(e); if (Object.keys(e).length) return;
    run(A.saveSupplier, f, isNew); toast(isNew ? 'הספק נוסף' : 'פרטי הספק עודכנו'); onClose(); if (isNew) nav(`/suppliers/${f.id}`);
  };
  return (
    <Modal title={isNew ? 'ספק / קבלן חדש' : 'עריכת ספק'} onClose={onClose} foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="שם *" full error={err.name} htmlFor="sp-n"><Input id="sp-n" value={f.name} invalid={err.name} onChange={(e: any) => set('name', e.target.value)} /></Field>
        <Field label="סוג" htmlFor="sp-k"><Select id="sp-k" value={f.kind} onChange={(e: any) => set('kind', e.target.value)} options={['ספק', 'קבלן', 'בעל מקצוע']} /></Field>
        <Field label="תחום" htmlFor="sp-c"><Input id="sp-c" value={f.category} onChange={(e: any) => set('category', e.target.value)} /></Field>
        <Field label="איש קשר" htmlFor="sp-ct"><Input id="sp-ct" value={f.contact} onChange={(e: any) => set('contact', e.target.value)} /></Field>
        <Field label="טלפון" htmlFor="sp-ph"><Input id="sp-ph" className="ltr" value={f.phone} onChange={(e: any) => set('phone', e.target.value)} /></Field>
        <Field label="מייל" error={err.email} htmlFor="sp-em"><Input id="sp-em" className="ltr" value={f.email} invalid={err.email} onChange={(e: any) => set('email', e.target.value)} /></Field>
        <Field label="עיר" htmlFor="sp-ci"><Input id="sp-ci" value={f.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
        <Field label="תנאי תשלום" htmlFor="sp-pt"><Input id="sp-pt" value={f.paymentTerms} onChange={(e: any) => set('paymentTerms', e.target.value)} /></Field>
        <Field label="דירוג פנימי (1–5)" htmlFor="sp-r"><Input id="sp-r" type="number" min={1} max={5} step={0.1} value={f.rating} onChange={(e: any) => set('rating', Number(e.target.value))} /></Field>
        <Field label="הערות" full htmlFor="sp-no"><Textarea id="sp-no" rows={2} value={f.notes} onChange={(e: any) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function SupplierDetail({ id }: { id: string }) {
  const { db, me, nav, live } = useStore();
  const s = byId(db.suppliers, id);
  const [edit, setEdit] = useState(false);
  if (!s) return <Empty heading="h1" title="הספק לא נמצא" action={<Btn onClick={() => nav('/suppliers')}>לרשימה</Btn>} />;
  const pids = visibleProjectIds(db, me);
  const pos = db.purchaseOrders.filter((o) => o.supplierId === id && pids.has(o.projectId));
  const specs = db.specItems.filter((x) => x.supplierId === id && pids.has(x.projectId));
  const fin = canSeeFinance(db, me);
  const exps = db.expenses.filter((e) => e.supplierId === id && pids.has(e.projectId));
  const projIds = [...new Set([...pos.map((o) => o.projectId), ...specs.map((x) => x.projectId), ...exps.map((e) => e.projectId)])];
  return (
    <div>
      <PageHead crumbs={[{ label: 'ספקים וקבלנים', to: '/suppliers' }, { label: s.name }]} title={s.name} badge={<Badge tone={s.kind === 'קבלן' ? 'warn' : 'info'}>{s.kind}</Badge>} sub={s.category}
        actions={<><Btn icon={LuPencil} onClick={() => setEdit(true)}>עריכה</Btn><Btn kind="primary" icon={LuShoppingCart} onClick={() => nav(`/procurement?new=1&supplier=${id}`)}>הזמנת רכש</Btn></>} />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title={`הזמנות רכש (${pos.length})`} pad={false}><POTableRows rows={pos} /></Card>
          <Card title={`פריטי מפרט מהספק (${specs.length})`} pad={false}>
            {specs.length ? <div className="list">{specs.map((x) => <div key={x.id} className="li click" onClick={() => nav(`/specs/${x.projectId}?item=${x.id}`)}><div className="li-main"><div className="li-title">{x.name}</div><div className="li-sub">{projectOf(db, x.projectId)?.name} · {x.room}</div></div>{fin ? <span className="small num">{ils(x.qty * x.unitPrice)}</span> : null}<StatusBadge s={x.status} /></div>)}</div> : <Empty title="אין פריטים" />}
          </Card>
          {fin ? <Card title={`הוצאות (${exps.length})`} pad={false}>{exps.length ? <div className="list">{exps.map((e) => <div key={e.id} className="li"><div className="li-main"><div className="li-title">{e.description}</div><div className="li-sub">{date(e.date)} · {projectOf(db, e.projectId)?.name}</div></div><span className="num bold">{ils(e.amount)}</span><StatusBadge s={e.status} /></div>)}</div> : <Empty title="אין הוצאות" />}</Card> : null}
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פרטי קשר">
            <div className="stack small">
              <b>{s.contact}</b>
              <span className="row g8"><LuPhone aria-hidden style={{ width: 14 }} /><span className="ltr">{s.phone}</span></span>
              <span className="row g8"><LuMail aria-hidden style={{ width: 14 }} /><span className="ltr" style={{ userSelect: 'all' }}>{s.email}</span></span>
              <span className="row g8"><LuMapPin aria-hidden style={{ width: 14 }} />{s.city}</span>
            </div>
          </Card>
          <Card title="תנאים">
            <KV items={[['תנאי תשלום', s.paymentTerms], ['דירוג פנימי', <Stars n={s.rating} />], ['פרויקטים', projIds.map((p) => projectOf(db, p)?.name).join(', ') || '—'], ['הערות', s.notes || '—']]} />
          </Card>
          <Callout kind="assume">{IS_LIVE ? 'ספקים וקבלנים אינם מקבלים חשבון במערכת. הזמנות רכש נשלחות אליהם במייל.' : 'ספקים וקבלנים אינם מקבלים חשבון במערכת ב-MVP. הזמנות נשלחות אליהם כ-PDF במייל (בדמו – מדומה).'}</Callout>
        </div>
      </div>
      {edit ? <SupplierForm supplier={s} onClose={() => setEdit(false)} /> : null}
    </div>
  );
}

function POTableRows({ rows, hideProject }: any) {
  const { db, me, nav, live } = useStore();
  const fin = canSeeFinance(db, me);
  return (
    <DataTable rows={rows} onRow={(o: T.PurchaseOrder) => nav(`/procurement/${o.id}`)} pageSize={12} initialSort={{ key: 'createdAt', dir: -1 }} empty={<Empty title="אין הזמנות רכש" />} columns={[
      { key: 'number', label: 'מס׳ הזמנה', render: (o: T.PurchaseOrder) => <span className="code">{o.number}</span> },
      ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', render: (o: T.PurchaseOrder) => <ProjectLink id={o.projectId} /> }]),
      { key: 'supplierId', label: 'ספק', sortValue: (o: T.PurchaseOrder) => supplierOf(db, o.supplierId)?.name, render: (o: T.PurchaseOrder) => supplierOf(db, o.supplierId)?.name },
      { key: 'items', label: 'פריטים', sortValue: (o: T.PurchaseOrder) => o.items.length, render: (o: T.PurchaseOrder) => <span className="small">{o.items.length} · {o.items[0]?.name}{o.items.length > 1 ? '…' : ''}</span> },
      ...(fin ? [{ key: 'total', label: 'סה״כ', num: true, sortValue: poTotal, render: (o: T.PurchaseOrder) => ils(poTotal(o)) }] : []),
      { key: 'received', label: 'התקבל', sortValue: (o: T.PurchaseOrder) => o.items.reduce((a, i) => a + i.received / i.qty, 0) / o.items.length, render: (o: T.PurchaseOrder) => { const r = o.items.reduce((a, i) => a + Math.min(1, i.received / i.qty), 0) / o.items.length; return <div className="row g8" style={{ minWidth: 90 }}><Progress value={r} tone={r >= 1 ? 'ok' : r > 0 ? 'warn' : ''} /><span className="xs num">{Math.round(r * 100)}%</span></div>; } },
      { key: 'expectedDelivery', label: 'אספקה צפויה', render: (o: T.PurchaseOrder) => { const late = o.expectedDelivery < todayISO && !['סופקה', 'בוטלה'].includes(o.status); return <span className={cx('small nowrap', late && 'bad-t bold')}>{late ? 'באיחור · ' : ''}{date(o.expectedDelivery)}</span>; } },
      { key: 'status', label: 'סטטוס', sortValue: (o: T.PurchaseOrder) => PO_FLOW.indexOf(o.status), render: (o: T.PurchaseOrder) => <StatusBadge s={o.status} /> },
    ]} />
  );
}

export function POList({ query }: any) {
  const { db, me, nav, live } = useStore();
  const pids = visibleProjectIds(db, me);
  const all = db.purchaseOrders.filter((o) => pids.has(o.projectId));
  const [status, setStatus] = useState('open');
  const [project, setProject] = useState('');
  const [supplier, setSupplier] = useState('');
  const [creating, setCreating] = useState<any>(query.new ? { supplierId: query.supplier } : null);
  useEffect(() => { if (query.new) setCreating({ supplierId: query.supplier }); }, [query.new]);
  let list = all.filter((o) => status === 'all' ? true : status === 'open' ? !['סופקה', 'בוטלה'].includes(o.status) : o.status === status);
  if (project) list = list.filter((o) => o.projectId === project);
  if (supplier) list = list.filter((o) => o.supplierId === supplier);
  const open = all.filter((o) => !['סופקה', 'בוטלה', 'טיוטה'].includes(o.status));
  const late = all.filter((o) => o.expectedDelivery < todayISO && !['סופקה', 'בוטלה'].includes(o.status));
  const fin = canSeeFinance(db, me);
  return (
    <div>
      <PageHead title="הזמנות רכש" sub="מעקב הזמנות מספקים: שליחה, ייצור, אספקה וקבלה." actions={<Btn kind="primary" icon={LuPlus} onClick={() => setCreating({})}>הזמנה חדשה</Btn>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="הזמנות פתוחות" value={open.length} onClick={() => setStatus('open')} />
        <Stat label="טיוטות לאישור" value={all.filter((o) => o.status === 'טיוטה').length} tone="warn" onClick={() => setStatus('טיוטה')} />
        <Stat label="אספקה באיחור" value={late.length} tone={late.length ? 'alert' : ''} meta={late[0] ? `${late[0].number}` : 'אין'} />
        {fin ? <Stat label="שווי הזמנות פתוחות" value={ils(open.reduce((a, o) => a + poTotal(o), 0))} meta={IS_LIVE ? 'לפני מע״מ' : 'לפני מע״מ · מדומה'} /> : <Stat label="סופקו החודש" value={all.filter((o) => o.status === 'סופקה').length} />}
      </div>
      <div className="filters">
        <Chips value={status} onChange={setStatus} options={[{ value: 'open', label: 'פתוחות' }, ...PO_FLOW.map((s) => ({ value: s, label: s, count: all.filter((o) => o.status === s).length })), { value: 'all', label: 'הכול', count: all.length }]} />
      </div>
      <div className="filters">
        <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={visibleProjects(db, me).map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
        <Select value={supplier} onChange={(e: any) => setSupplier(e.target.value)} placeholder="כל הספקים" options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} aria-label="ספק" />
      </div>
      <div className="card"><POTableRows rows={list} /></div>
      {creating ? <POForm defaults={creating} onClose={() => { setCreating(null); if (query.new) nav('/procurement'); }} /> : null}
    </div>
  );
}

export function POTable({ projectId }: { projectId: string }) {
  const { db, live } = useStore();
  const [creating, setCreating] = useState(false);
  const rows = db.purchaseOrders.filter((o) => o.projectId === projectId);
  return (
    <div>
      <div className="filters"><span className="small muted">{rows.length} הזמנות · {rows.filter((o) => !['סופקה', 'בוטלה'].includes(o.status)).length} פתוחות</span><div className="grow" /><Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>הזמנת רכש</Btn></div>
      <div className="card"><POTableRows rows={rows} hideProject /></div>
      {creating ? <POForm defaults={{ projectId }} onClose={() => setCreating(false)} /> : null}
    </div>
  );
}

export function POForm({ po, defaults = {}, onClose }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const isNew = !po;
  const projects = visibleProjects(db, me).filter((p) => !['הושלם', 'ליד חדש'].includes(p.status));
  const [f, setF] = useState<T.PurchaseOrder>(() => po ? structuredClone(po) : { id: uid('po'), number: `PO-2026-0${140 + db.purchaseOrders.length}`, projectId: defaults.projectId || '', supplierId: defaults.supplierId || '', status: 'טיוטה', createdAt: todayISO, createdBy: me.id, expectedDelivery: D(21), items: [], notes: '', paidBy: 'לקוח ישירות' });
  const [err, setErr] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const specs = db.specItems.filter((s) => s.projectId === f.projectId && (!f.supplierId || s.supplierId === f.supplierId) && !s.poId);
  const setItem = (i: number, k: string, v: any) => setF((x) => { const c = structuredClone(x); (c.items[i] as any)[k] = v; return c; });
  const total = f.items.reduce((a, i) => a + Number(i.qty) * Number(i.unitPrice), 0);
  const save = () => {
    const e: any = {};
    if (!f.projectId) e.projectId = 'יש לבחור פרויקט';
    if (!f.supplierId) e.supplierId = 'יש לבחור ספק';
    if (!f.items.length) e.items = 'יש להוסיף לפחות פריט אחד';
    f.items.forEach((it, i) => { if (!it.name.trim() || !(Number(it.qty) > 0)) e['i' + i] = 'שם וכמות חובה'; });
    setErr(e); if (Object.keys(e).length) return;
    const clean = { ...f, items: f.items.map((i) => ({ ...i, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })) };
    run(A.savePO, clean, isNew);
    run((d: any) => clean.items.forEach((it) => { if (it.specItemId) { const s = d.specItems.find((x: any) => x.id === it.specItemId); if (s) s.poId = clean.id; } }));
    toast(isNew ? `הזמנה ${f.number} נשמרה כטיוטה` : 'ההזמנה עודכנה'); onClose(); if (isNew) nav(`/procurement/${f.id}`);
  };
  return (
    <Modal title={isNew ? 'הזמנת רכש חדשה' : `עריכת ${f.number}`} onClose={onClose} size="wide" foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn><span className="grow" /><b className="num">סה״כ {ils(total)} + מע״מ</b></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="פרויקט *" error={err.projectId} htmlFor="po-p"><Select id="po-p" value={f.projectId} invalid={err.projectId} onChange={(e: any) => set('projectId', e.target.value)} placeholder="בחירה" options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Field>
          <Field label="ספק *" error={err.supplierId} htmlFor="po-s"><Select id="po-s" value={f.supplierId} invalid={err.supplierId} onChange={(e: any) => set('supplierId', e.target.value)} placeholder="בחירה" options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></Field>
          <Field label="אספקה צפויה" htmlFor="po-d"><Input id="po-d" type="date" value={f.expectedDelivery} onChange={(e: any) => set('expectedDelivery', e.target.value)} /></Field>
          <Field label="תשלום" htmlFor="po-pb"><Select id="po-pb" value={f.paidBy} onChange={(e: any) => set('paidBy', e.target.value)} options={['לקוח ישירות', 'דרך המשרד']} /></Field>
        </div>
        <div>
          <div className="row between wrap g8"><b>פריטים</b><div className="row g8 wrap">{specs.length ? <Select className="sm" style={{ width: 'auto' }} value="" onChange={(e: any) => { const s = specs.find((x) => x.id === e.target.value); if (s) set('items', [...f.items, { id: uid('pi'), name: s.name, qty: s.qty, unit: s.unit, unitPrice: s.unitPrice, received: 0, specItemId: s.id }]); }} placeholder={`הוספה מהמפרט (${specs.length})`} options={specs.map((s) => ({ value: s.id, label: `${s.name} · ${s.room}` }))} aria-label="הוספה מהמפרט" /> : null}<Btn size="sm" icon={LuPlus} onClick={() => set('items', [...f.items, { id: uid('pi'), name: '', qty: 1, unit: 'יח׳', unitPrice: 0, received: 0 }])}>שורה</Btn></div></div>
          {err.items ? <div className="err small bad-t mt8">{err.items}</div> : null}
          <div className="table-wrap mt8">
            <table className="tbl">
              <thead><tr><th>פריט</th><th>כמות</th><th>יח׳</th><th>מחיר יח׳</th><th className="num">סה״כ</th><th></th></tr></thead>
              <tbody>
                {f.items.map((it, i) => (
                  <tr key={it.id}>
                    <td style={{ minWidth: 200 }}><Input className="sm" value={it.name} invalid={err['i' + i]} onChange={(e: any) => setItem(i, 'name', e.target.value)} aria-label="שם פריט" />{it.specItemId ? <span className="xs muted">מקושר למפרט</span> : null}</td>
                    <td style={{ width: 90 }}><Input className="sm" type="number" step="0.1" value={it.qty} onChange={(e: any) => setItem(i, 'qty', e.target.value)} aria-label="כמות" /></td>
                    <td style={{ width: 90 }}><Select className="sm" value={it.unit} onChange={(e: any) => setItem(i, 'unit', e.target.value)} options={['יח׳', 'מ״ר', 'מ׳', 'סט', 'קומפלט']} aria-label="יחידה" /></td>
                    <td style={{ width: 120 }}><Input className="sm" type="number" value={it.unitPrice} onChange={(e: any) => setItem(i, 'unitPrice', e.target.value)} aria-label="מחיר" /></td>
                    <td className="num">{ils(Number(it.qty) * Number(it.unitPrice))}</td>
                    <td><button type="button" className="icon-btn" aria-label="הסרת שורה" onClick={() => set('items', f.items.filter((_, j) => j !== i))}><LuX /></button></td>
                  </tr>
                ))}
                {!f.items.length ? <tr><td colSpan={6} className="small muted t-center">הוסיפו פריטים מהמפרט או שורה חופשית</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
        <Field label="הערות לספק" htmlFor="po-n"><Textarea id="po-n" rows={2} value={f.notes} onChange={(e: any) => set('notes', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

export function PODetail({ id }: { id: string }) {
  const { db, me, run, toast, nav, live } = useStore();
  const po = byId(db.purchaseOrders, id);
  const [edit, setEdit] = useState(false);
  const [expense, setExpense] = useState(false);
  const [cancel, setCancel] = useState(false);
  if (!po || !visibleProjectIds(db, me).has(po.projectId)) return <Empty heading="h1" title="ההזמנה לא נמצאה או שאין גישה" action={<Btn onClick={() => nav('/procurement')}>לרשימה</Btn>} />;
  const sup = supplierOf(db, po.supplierId)!;
  const total = poTotal(po); const exps = db.expenses.filter((e) => e.poId === id); const paid = exps.reduce((a, e) => a + e.amount, 0);
  const fin = canSeeFinance(db, me);
  const idx = PO_FLOW.indexOf(po.status);
  const next = po.status === 'בוטלה' ? null : PO_FLOW[idx + 1];
  const late = po.expectedDelivery < todayISO && !['סופקה', 'בוטלה'].includes(po.status);
  return (
    <div>
      <PageHead crumbs={[{ label: 'הזמנות רכש', to: '/procurement' }, { label: po.number }]} title={`הזמנת רכש ${po.number}`} badge={<StatusBadge s={po.status} />} sub={<span>{sup.name} · <ProjectLink id={po.projectId} /></span>}
        actions={<>
          {po.status === 'טיוטה' ? <Btn kind="primary" icon={LuSend} onClick={() => { run(A.setPOStatus, id, 'נשלחה לספק'); toast(IS_LIVE ? `ההזמנה נשלחה ל${sup.name} (המייל בתור לשליחה)` : `ההזמנה סומנה כנשלחה ל${sup.name} (מייל + PDF מדומים – לא נשלחו)`, 'info'); }}>שליחה לספק</Btn> : next ? <Btn kind="primary" icon={LuPackageCheck} onClick={() => { run(A.setPOStatus, id, next); toast(`הסטטוס עודכן ל"${next}"`); }}>קידום ל"{next}"</Btn> : null}
          {fin ? <Btn icon={LuReceipt} onClick={() => setExpense(true)}>רישום הוצאה</Btn> : null}
          {po.status !== 'סופקה' && po.status !== 'בוטלה' ? <><Btn icon={LuPencil} onClick={() => setEdit(true)}>עריכה</Btn><Btn kind="danger" onClick={() => setCancel(true)}>ביטול הזמנה</Btn></> : null}
        </>} />
      <div className="card pad" style={{ marginBottom: 20, overflowX: 'auto' }}>
        <div className="steps" style={{ marginBottom: 0, flexWrap: 'nowrap' }}>
          {PO_FLOW.map((s, i) => <span key={s} className="row" style={{ gap: 0 }}><span className={cx('step', i < idx && 'done', i === idx && 'on')}><span className="s-n">{i < idx ? '✓' : i + 1}</span><span className="nowrap">{s}</span></span>{i < PO_FLOW.length - 1 ? <span className="step-line" /> : null}</span>)}
        </div>
      </div>
      {late ? <div style={{ marginBottom: 16 }}><Callout kind="bad">האספקה הייתה צפויה ב-{date(po.expectedDelivery)} ({relDay(po.expectedDelivery)}). כדאי לעדכן מול הספק.</Callout></div> : null}
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פריטים וקבלה" pad={false}>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>פריט</th><th className="num">כמות</th>{fin ? <><th className="num">מחיר יח׳</th><th className="num">סה״כ</th></> : null}<th>התקבל</th></tr></thead>
                <tbody>{po.items.map((it) => (
                  <tr key={it.id}>
                    <td><div className="col" style={{ gap: 0 }}><b>{it.name}</b>{it.specItemId ? <button type="button" className="linkish xs" style={{ textAlign: 'right' }} onClick={() => nav(`/specs/${po.projectId}?item=${it.specItemId}`)}>פריט מפרט מקושר</button> : null}</div></td>
                    <td className="num">{it.qty} {it.unit}</td>
                    {fin ? <><td className="num">{ils(it.unitPrice)}</td><td className="num">{ils(it.qty * it.unitPrice)}</td></> : null}
                    <td style={{ minWidth: 140 }}>{po.status === 'בוטלה' || po.status === 'טיוטה' ? <span className="muted small">—</span> : <div className="row g8"><input className="input sm" type="number" min={0} max={it.qty} step="0.1" value={it.received} onChange={(e) => { run(A.receiveItem, id, it.id, Number(e.target.value)); }} style={{ width: 80 }} aria-label={`כמות שהתקבלה – ${it.name}`} /><span className="xs muted">/ {it.qty}</span></div>}</td>
                  </tr>
                ))}</tbody>
                {fin ? <tfoot><tr><td colSpan={3}>סה״כ לפני מע״מ</td><td className="num">{ils(total)}</td><td className="small">כולל מע״מ: {ils(total * (1 + VAT))}</td></tr></tfoot> : null}
              </table>
            </div>
          </Card>
          {fin ? <Card title="הוצאות ותשלומים מקושרים" pad={false} actions={<span className="small num">{ils(paid)} מתוך {ils(total)}</span>}>
            {exps.length ? <div className="list">{exps.map((e) => <div key={e.id} className="li"><div className="li-main"><div className="li-title">{e.description}</div><div className="li-sub">{date(e.date)} · {e.paidBy}{e.receipt ? ' · קבלה מצורפת' : ''}</div></div><b className="num">{ils(e.amount)}</b><StatusBadge s={e.status} /></div>)}</div> : <Empty title="אין תשלומים רשומים" action={<Btn size="sm" icon={LuReceipt} onClick={() => setExpense(true)}>רישום הוצאה</Btn>} />}
          </Card> : null}
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="פרטים">
            <KV items={[['ספק', <button type="button" className="linkish" onClick={() => nav(`/suppliers/${sup.id}`)}>{sup.name}</button>], ['איש קשר', `${sup.contact} · ${sup.phone}`], ['נוצרה', `${date(po.createdAt)} · ${userName(db, po.createdBy)}`], ['אספקה צפויה', date(po.expectedDelivery)], ['תשלום', po.paidBy], ['תנאי תשלום', sup.paymentTerms], ['הערות', po.notes || '—']]} />
          </Card>
          <Callout kind="assume">{IS_LIVE ? 'שליחה לספק מכניסה מייל עם פרטי ההזמנה לתור השליחה. קובץ PDF של ההזמנה עדיין לא מופק. אין לספק חשבון במערכת.' : 'שליחת ההזמנה לספק מדומה: בייצור תופק הזמנה ב-PDF ותישלח במייל דרך Resend. אין לספק חשבון במערכת.'}</Callout>
        </div>
      </div>
      {edit ? <POForm po={po} onClose={() => setEdit(false)} /> : null}
      {expense ? <ExpenseForm defaults={{ projectId: po.projectId, supplierId: po.supplierId, poId: po.id, description: `תשלום – ${po.number}`, amount: Math.max(0, total - paid), paidBy: po.paidBy, category: exps[0]?.category }} onClose={() => setExpense(false)} /> : null}
      {cancel ? <Confirm title="ביטול הזמנת רכש" danger confirmLabel="ביטול ההזמנה" onClose={() => setCancel(false)} onConfirm={() => { run(A.setPOStatus, id, 'בוטלה'); toast('ההזמנה בוטלה'); }}>לבטל את {po.number}? ההזמנה תישאר בהיסטוריה בסטטוס "בוטלה".</Confirm> : null}
    </div>
  );
}
