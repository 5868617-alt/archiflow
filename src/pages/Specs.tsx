import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuPlus, LuSend, LuHistory, LuSave, LuArrowLeftRight, LuEye, LuEyeOff, LuPencil, LuLayers, LuShoppingCart } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, visibleProjectIds, projectOf, supplierOf, userName, A, uid, byId, specLineTotal, canSeeFinance, projectFinance } from '../data/api';
import type * as T from '../data/types';
import { PageHead, Btn, Select, Chips, StatusBadge, Badge, Card, KV, Drawer, Modal, Field, Input, Textarea, Empty, Callout, Stat, Switch, cx } from '../ui/core';
import { Swatch, Donut } from '../ui/charts';
import { SendForApproval } from './Approvals';
import { ils, date } from '../lib/format';

const SPEC_STATUSES: T.SpecStatus[] = ['טיוטה', 'ממתין לאישור לקוח', 'מאושר', 'בקשת שינוי', 'נדחה'];
const SPEC_COLORS: Record<string, string> = { 'טיוטה': 'var(--line-strong)', 'ממתין לאישור לקוח': 'var(--warn)', 'מאושר': 'var(--ok)', 'בקשת שינוי': 'var(--violet)', 'נדחה': 'var(--bad)' };

export function SpecsOverview() {
  const { db, me, nav, live } = useStore();
  const projs = visibleProjects(db, me).filter((p) => db.specItems.some((s) => s.projectId === p.id) || ['תכנון בפיתוח', 'ממתין לאישור', 'ביצוע'].includes(p.status));
  const pids = visibleProjectIds(db, me);
  const items = db.specItems.filter((s) => pids.has(s.projectId));
  return (
    <div>
      <PageHead title="מפרטים" sub="מפרטי חומרים ומוצרים לפי פרויקט וחדר, כולל חלופות ותהליך אישור לקוח." />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="פריטי מפרט" value={items.length} meta={`ב-${new Set(items.map((s) => s.projectId)).size} פרויקטים`} />
        <Stat label="ממתינים לאישור לקוח" value={items.filter((s) => s.status === 'ממתין לאישור לקוח').length} tone="warn" onClick={() => nav('/approvals')} />
        <Stat label="בקשות שינוי" value={items.filter((s) => s.status === 'בקשת שינוי').length} />
        <Stat label="שווי מפרטים מאושרים" value={ils(items.filter((s) => s.status === 'מאושר').reduce((a, s) => a + specLineTotal(s), 0))} meta={IS_LIVE ? 'לפני מע״מ' : 'לפני מע״מ · מדומה'} />
      </div>
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {projs.map((p) => {
          const its = items.filter((s) => s.projectId === p.id);
          const total = its.reduce((a, s) => a + specLineTotal(s), 0);
          const parts = SPEC_STATUSES.map((s) => ({ label: s, value: its.filter((x) => x.status === s).length, color: SPEC_COLORS[s] })).filter((x) => x.value);
          return (
            <Card key={p.id} title={p.name} onClick={() => nav(`/specs/${p.id}`)} actions={<StatusBadge s={p.status} />}>
              {its.length ? (
                <div className="stack">
                  <Donut parts={parts} size={100} stroke={14} center={String(its.length)} sub="פריטים" />
                  <div className="row between small"><span className="muted">סה״כ מפרט</span><b className="num">{ils(total)}</b></div>
                  <div className="row g4 wrap">{[...new Set(its.map((s) => s.room))].map((r) => <Badge key={r} tone="outline">{r}</Badge>)}</div>
                </div>
              ) : <Empty icon={LuLayers} title="אין מפרט עדיין" action={<Btn size="sm" icon={LuPlus} onClick={(e: any) => { e.stopPropagation(); nav(`/specs/${p.id}`); }}>פתיחת מפרט</Btn>} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectSpecs({ projectId }: { projectId: string }) {
  const { db, me, nav, live } = useStore();
  const p = projectOf(db, projectId);
  if (!p || !visibleProjectIds(db, me).has(projectId)) return <Empty title="הפרויקט לא נמצא או שאין גישה" />;
  return (
    <div>
      <PageHead crumbs={[{ label: 'מפרטים', to: '/specs' }, { label: p.name }]} title={`מפרט · ${p.name}`} actions={<Btn onClick={() => nav(`/projects/${projectId}`)}>לפרויקט</Btn>} />
      <SpecEditor projectId={projectId} />
    </div>
  );
}

export function SpecEditor({ projectId, embedded }: { projectId: string; embedded?: boolean }) {
  const { db, me, run, toast, path, live } = useStore();
  const items = db.specItems.filter((s) => s.projectId === projectId);
  const rooms = [...new Set(items.map((s) => s.room))];
  const [room, setRoom] = useState('all');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [saveV, setSaveV] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fin = canSeeFinance(db, me);
  useEffect(() => { const m = path.match(/item=([\w]+)/); if (m) setOpen(m[1]); }, [path]);
  let list = items.filter((s) => (room === 'all' || s.room === room) && (!status || s.status === status));
  const total = items.reduce((a, s) => a + specLineTotal(s), 0);
  const approved = items.filter((s) => s.status === 'מאושר').reduce((a, s) => a + specLineTotal(s), 0);
  const drafts = items.filter((s) => s.status === 'טיוטה' || s.status === 'בקשת שינוי');
  const versions = db.specVersions.filter((v) => v.projectId === projectId).sort((a, b) => b.v - a.v);
  const f = fin ? projectFinance(db, projectId) : null;
  const grouped = rooms.filter((r) => room === 'all' || r === room).map((r) => ({ room: r, items: list.filter((s) => s.room === r) })).filter((g) => g.items.length);
  return (
    <div className="stack-lg">
      <div className="grid-4">
        <Stat label="סה״כ מפרט" value={ils(total)} meta={`${items.length} פריטים · לפני מע״מ`} />
        <Stat label="מאושר ע״י הלקוח" value={ils(approved)} meta={`${items.filter((s) => s.status === 'מאושר').length} פריטים`} />
        <Stat label="ממתין לאישור" value={items.filter((s) => s.status === 'ממתין לאישור לקוח').length} tone="warn" />
        {f ? <Stat label="מפרט מול תקציב ביצוע" value={`${Math.round((total / f.planned) * 100)}%`} meta={`${ils(total)} מתוך ${ils(f.planned)}`} tone={total > f.planned ? 'alert' : ''} /> : <Stat label="גרסת מפרט" value={versions[0] ? `v${versions[0].v}` : '—'} />}
      </div>
      <div className="filters">
        <Chips value={room} onChange={setRoom} options={[{ value: 'all', label: 'כל החדרים', count: items.length }, ...rooms.map((r) => ({ value: r, label: r, count: items.filter((s) => s.room === r).length }))]} />
        <Select value={status} onChange={(e: any) => setStatus(e.target.value)} placeholder="כל הסטטוסים" options={SPEC_STATUSES} aria-label="סטטוס" />
        <div className="grow" />
        <Btn icon={LuHistory} onClick={() => setShowHistory((s) => !s)}>היסטוריית גרסאות</Btn>
        <Btn icon={LuSave} onClick={() => setSaveV(true)}>שמירת גרסה</Btn>
        <Btn icon={LuSend} disabled={!drafts.length} onClick={() => setBulk(true)}>שליחת {drafts.length} פריטים לאישור</Btn>
        <Btn kind="primary" icon={LuPlus} onClick={() => setAdding(true)}>פריט</Btn>
      </div>
      {showHistory ? (
        <Card title="היסטוריית גרסאות מפרט" icon={LuHistory}>
          <div className="timeline">{versions.map((v, i) => <div key={v.id} className={cx('tl-item', i === 0 ? 'now' : 'done')}><div className="row between"><b>גרסה {v.v}</b><span className="xs muted">{date(v.date)} · {userName(db, v.authorId)}</span></div><div className="small">{v.summary}</div>{v.total ? <div className="xs muted num">סה״כ בעת השמירה: {ils(v.total)}</div> : null}</div>)}{!versions.length ? <span className="small muted">אין גרסאות שמורות.</span> : null}</div>
        </Card>
      ) : null}
      {items.length === 0 ? <div className="card"><Empty icon={LuLayers} title="המפרט ריק" action={<Btn kind="primary" icon={LuPlus} onClick={() => setAdding(true)}>הוספת פריט ראשון</Btn>}>הוסיפו מוצרים וחומרים לפי חדר.</Empty></div> : (
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th style={{ width: 56 }}></th><th>פריט</th><th>קטגוריה</th><th>ספק</th><th className="num">כמות</th><th className="num">מחיר יח׳</th><th className="num">סה״כ</th><th>סטטוס</th><th>בפורטל</th></tr></thead>
              <tbody>
                {grouped.map((g) => [
                  <tr key={'g' + g.room} className="group-row"><td colSpan={6}>{g.room} · {g.items.length} פריטים</td><td className="num">{ils(g.items.reduce((a, s) => a + specLineTotal(s), 0))}</td><td colSpan={2}></td></tr>,
                  ...g.items.map((s) => (
                    <tr key={s.id} className="click" onClick={() => setOpen(s.id)}>
                      <td><Swatch color={s.swatch} pattern={s.pattern} label={s.name} /></td>
                      <td><div className="col" style={{ gap: 0, maxWidth: 300 }}><b>{s.name}</b><span className="xs muted"><span className="ltr">{s.sku}</span>{s.alternatives.length ? ` · ${s.alternatives.length} חלופות` : ''}{s.poId ? ' · בהזמנת רכש' : ''}</span></div></td>
                      <td className="small">{s.category}</td>
                      <td className="small">{supplierOf(db, s.supplierId)?.name}</td>
                      <td className="num">{s.qty} {s.unit}</td>
                      <td className="num">{ils(s.unitPrice)}</td>
                      <td className="num bold">{ils(specLineTotal(s))}</td>
                      <td><StatusBadge s={s.status} /></td>
                      <td>{s.sharedWithClient ? <LuEye aria-label="משותף" style={{ width: 16, color: 'var(--info)' }} /> : <LuEyeOff aria-label="פנימי" style={{ width: 16, color: 'var(--ink-3)' }} />}</td>
                    </tr>
                  )),
                ])}
              </tbody>
              <tfoot><tr><td colSpan={6}>סה״כ {room === 'all' ? 'מפרט' : room}</td><td className="num">{ils(list.reduce((a, s) => a + specLineTotal(s), 0))}</td><td colSpan={2} className="small muted">לפני מע״מ · מע״מ 18%: {ils(list.reduce((a, s) => a + specLineTotal(s), 0) * 0.18)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
      {open && byId(db.specItems, open) ? <SpecDrawer id={open} onClose={() => setOpen(null)} /> : null}
      {adding ? <SpecForm projectId={projectId} rooms={rooms} onClose={() => setAdding(false)} /> : null}
      {saveV ? <SaveVersion projectId={projectId} onClose={() => setSaveV(false)} /> : null}
      {bulk ? <SendForApproval projectId={projectId} kind="מפרט" refId={drafts.length === 1 ? drafts[0].id : 'bulk'} title={drafts.length === 1 ? drafts[0].name : `מפרט – ${drafts.length} פריטים (${[...new Set(drafts.map((d) => d.room))].join(', ')})`} amount={drafts.reduce((a, s) => a + specLineTotal(s), 0)} onSent={() => { if (drafts.length > 1) run((d: any) => d.specItems.forEach((s: any) => { if (s.projectId === projectId && (s.status === 'טיוטה' || s.status === 'בקשת שינוי')) { s.status = 'ממתין לאישור לקוח'; s.sharedWithClient = true; } })); }} onClose={() => setBulk(false)} /> : null}
    </div>
  );
}

function SpecDrawer({ id, onClose }: any) {
  const { db, run, toast, nav, live } = useStore();
  const s = byId(db.specItems, id)!;
  const [edit, setEdit] = useState(false);
  const [send, setSend] = useState(false);
  const approvals = db.approvals.filter((a) => a.refId === id);
  return (
    <Drawer title={s.name} sub={`${s.room} · ${s.category}`} onClose={onClose} foot={<><Btn kind="primary" icon={LuPencil} onClick={() => setEdit(true)}>עריכה</Btn>{s.status !== 'מאושר' && s.status !== 'ממתין לאישור לקוח' ? <Btn icon={LuSend} onClick={() => setSend(true)}>לאישור לקוח</Btn> : null}{s.poId ? <Btn icon={LuShoppingCart} onClick={() => nav(`/procurement/${s.poId}`)}>להזמנת הרכש</Btn> : null}</>}>
      <div className="stack-lg">
        <div className="row g16" style={{ alignItems: 'stretch' }}>
          <div style={{ width: 140, flex: '0 0 140px' }}><Swatch color={s.swatch} pattern={s.pattern} size="lg" label={s.name} /><div className="xs muted t-center mt8">הדמיית חומר</div></div>
          <div className="grow"><KV items={[['סטטוס', <StatusBadge s={s.status} />], ['ספק', <button type="button" className="linkish" onClick={() => nav(`/suppliers/${s.supplierId}`)}>{supplierOf(db, s.supplierId)?.name}</button>], ['מק״ט', <span className="code">{s.sku}</span>], ['כמות', `${s.qty} ${s.unit}`], ['מחיר יחידה', ils(s.unitPrice)], ['סה״כ', <b>{ils(specLineTotal(s))}</b>], ['זמן אספקה', `${s.leadTimeWeeks} שבועות`]]} /></div>
        </div>
        {s.notes ? <Callout kind="info">{s.notes}</Callout> : null}
        <Switch id="sp-share" checked={s.sharedWithClient} onChange={() => { run(A.saveSpec, { ...s, sharedWithClient: !s.sharedWithClient }, false); toast(s.sharedWithClient ? 'הפריט הוסתר מהלקוח' : 'הפריט מוצג ללקוח בפורטל'); }} label="מוצג ללקוח בפורטל" />
        <div>
          <div className="section-title">חלופות ({s.alternatives.length})</div>
          {s.alternatives.length === 0 ? <span className="small muted">אין חלופות. ניתן להוסיף בעריכה.</span> : (
            <div className="col g8">
              {s.alternatives.map((alt, i) => {
                const diff = (alt.unitPrice - s.unitPrice) * s.qty;
                return (
                  <div key={i} className="card pad" style={{ padding: 12 }}>
                    <div className="row between g8"><b className="small">{alt.name}</b><span className={cx('small num bold', diff < 0 ? 'ok-t' : diff > 0 ? 'bad-t' : '')}>{diff === 0 ? 'ללא שינוי' : `${diff > 0 ? '+' : ''}${ils(diff)}`}</span></div>
                    <div className="xs muted">{supplierOf(db, alt.supplierId)?.name} · {ils(alt.unitPrice)} ליח׳{alt.note ? ' · ' + alt.note : ''}</div>
                    <div className="mt8"><Btn size="xs" icon={LuArrowLeftRight} onClick={() => { run(A.useAlternative, id, i); toast('החלופה הוחלה – הפריט חזר לטיוטה'); }}>החלפה לחלופה זו</Btn></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div className="section-title">היסטוריית אישורים</div>
          {approvals.length ? approvals.map((a) => <div key={a.id} className="small row between g8" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}><span>{date(a.decidedAt || a.requestedAt)}{a.comment ? ` · "${a.comment}"` : ''}</span><StatusBadge s={a.status} /></div>) : <span className="small muted">לא נשלח לאישור.</span>}
        </div>
      </div>
      {edit ? <SpecForm item={s} projectId={s.projectId} rooms={[...new Set(db.specItems.filter((x) => x.projectId === s.projectId).map((x) => x.room))]} onClose={() => setEdit(false)} /> : null}
      {send ? <SendForApproval projectId={s.projectId} kind="מפרט" refId={s.id} title={s.name} amount={specLineTotal(s)} onClose={() => setSend(false)} /> : null}
    </Drawer>
  );
}

function SpecForm({ item, projectId, rooms, onClose }: any) {
  const { db, run, toast, live } = useStore();
  const isNew = !item;
  const [f, setF] = useState<T.SpecItem>(() => item ? structuredClone(item) : { id: uid('s'), projectId, room: rooms[0] || 'סלון', category: 'ריהוט', name: '', supplierId: db.suppliers[0].id, sku: '', qty: 1, unit: 'יח׳', unitPrice: 0, notes: '', status: 'טיוטה', swatch: '#C9BBA4', pattern: 'plain', sharedWithClient: false, alternatives: [], leadTimeWeeks: 4 });
  const [err, setErr] = useState<any>({});
  const [newRoom, setNewRoom] = useState('');
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = 'יש להזין שם פריט';
    if (!(Number(f.qty) > 0)) e.qty = 'כמות חייבת להיות גדולה מ-0';
    if (Number(f.unitPrice) < 0 || f.unitPrice === ('' as any)) e.unitPrice = 'מחיר לא תקין';
    setErr(e); if (Object.keys(e).length) return;
    run(A.saveSpec, { ...f, room: newRoom.trim() || f.room, qty: Number(f.qty), unitPrice: Number(f.unitPrice) }, isNew); toast(isNew ? 'הפריט נוסף למפרט' : 'הפריט עודכן'); onClose();
  };
  return (
    <Modal title={isNew ? 'פריט מפרט חדש' : 'עריכת פריט'} onClose={onClose} size="wide" foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="שם הפריט *" full error={err.name} htmlFor="sf-n"><Input id="sf-n" value={f.name} invalid={err.name} onChange={(e: any) => set('name', e.target.value)} /></Field>
        <Field label="חדר / אזור" htmlFor="sf-r"><Select id="sf-r" value={f.room} onChange={(e: any) => set('room', e.target.value)} options={rooms.length ? rooms : ['סלון']} /></Field>
        <Field label="או חדר חדש" htmlFor="sf-nr"><Input id="sf-nr" value={newRoom} onChange={(e: any) => setNewRoom(e.target.value)} placeholder="לדוגמה: מרפסת" /></Field>
        <Field label="קטגוריה" htmlFor="sf-c"><Select id="sf-c" value={f.category} onChange={(e: any) => set('category', e.target.value)} options={['ריהוט', 'ריצוף', 'חיפוי', 'משטחים', 'נגרות', 'תאורה', 'סניטריה', 'וילונות', 'ריהוט חוץ', 'אביזרים']} /></Field>
        <Field label="ספק" htmlFor="sf-s"><Select id="sf-s" value={f.supplierId} onChange={(e: any) => set('supplierId', e.target.value)} options={db.suppliers.map((s) => ({ value: s.id, label: s.name }))} /></Field>
        <Field label="מק״ט" htmlFor="sf-k"><Input id="sf-k" className="ltr" value={f.sku} onChange={(e: any) => set('sku', e.target.value)} /></Field>
        <Field label="זמן אספקה (שבועות)" htmlFor="sf-l"><Input id="sf-l" type="number" min={0} value={f.leadTimeWeeks} onChange={(e: any) => set('leadTimeWeeks', Number(e.target.value))} /></Field>
        <Field label="כמות *" error={err.qty} htmlFor="sf-q"><Input id="sf-q" type="number" step="0.1" value={f.qty} invalid={err.qty} onChange={(e: any) => set('qty', e.target.value)} /></Field>
        <Field label="יחידה" htmlFor="sf-u"><Select id="sf-u" value={f.unit} onChange={(e: any) => set('unit', e.target.value)} options={['יח׳', 'מ״ר', 'מ׳', 'סט', 'קומפלט']} /></Field>
        <Field label="מחיר ליחידה (₪) *" error={err.unitPrice} htmlFor="sf-p"><Input id="sf-p" type="number" min={0} value={f.unitPrice} invalid={err.unitPrice} onChange={(e: any) => set('unitPrice', e.target.value)} /></Field>
        <Field label="סה״כ" htmlFor="sf-t"><div className="input" id="sf-t" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)' }}>{ils(Number(f.qty) * Number(f.unitPrice) || 0)}</div></Field>
        <Field label="צבע דוגמה" htmlFor="sf-col"><Input id="sf-col" type="color" value={f.swatch} onChange={(e: any) => set('swatch', e.target.value)} style={{ padding: 2 }} /></Field>
        <Field label="מרקם" htmlFor="sf-pat"><Select id="sf-pat" value={f.pattern} onChange={(e: any) => set('pattern', e.target.value)} options={[{ value: 'plain', label: 'חלק' }, { value: 'wood', label: 'עץ' }, { value: 'stone', label: 'אבן' }, { value: 'tile', label: 'אריח' }, { value: 'fabric', label: 'בד' }, { value: 'metal', label: 'מתכת' }, { value: 'glass', label: 'זכוכית' }]} /></Field>
        <Field label="הערות" full htmlFor="sf-no"><Textarea id="sf-no" rows={2} value={f.notes} onChange={(e: any) => set('notes', e.target.value)} /></Field>
        <div className="full">
          <div className="row between"><span className="label small bold">חלופות</span><Btn size="xs" icon={LuPlus} onClick={() => set('alternatives', [...f.alternatives, { name: '', unitPrice: f.unitPrice, supplierId: f.supplierId, note: '' }])}>חלופה</Btn></div>
          {f.alternatives.map((alt, i) => (
            <div key={i} className="row g8 mt8 wrap">
              <Input className="grow" style={{ flex: '2 1 180px' }} value={alt.name} placeholder="שם החלופה" onChange={(e: any) => { const a = [...f.alternatives]; a[i] = { ...alt, name: e.target.value }; set('alternatives', a); }} aria-label="שם חלופה" />
              <Input type="number" style={{ flex: '1 1 90px' }} value={alt.unitPrice} onChange={(e: any) => { const a = [...f.alternatives]; a[i] = { ...alt, unitPrice: Number(e.target.value) }; set('alternatives', a); }} aria-label="מחיר חלופה" />
              <Btn size="sm" kind="ghost" onClick={() => set('alternatives', f.alternatives.filter((_, j) => j !== i))}>הסרה</Btn>
            </div>
          ))}
        </div>
      </div>
      <div className="mt16 xs muted">{IS_LIVE ? 'כרגע מוצגת דוגמת צבע לכל פריט. העלאת תמונות מוצר תתווסף בהמשך.' : 'תמונות מוצר יוצגו מקבצים שיועלו לאחסון (Supabase Storage). בדמו מוצגת דוגמת צבע ומרקם.'}</div>
    </Modal>
  );
}
function SaveVersion({ projectId, onClose }: any) {
  const { run, toast, live } = useStore();
  const [s, setS] = useState('');
  return (
    <Modal title="שמירת גרסת מפרט" onClose={onClose} size="narrow" foot={<><Btn kind="primary" onClick={() => { if (!s.trim()) return; run(A.newSpecVersion, projectId, s.trim()); toast('גרסת המפרט נשמרה'); onClose(); }} disabled={!s.trim()}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <Field label="מה השתנה?" htmlFor="sv-s" hint="נשמר עם הסכום הנוכחי ותאריך"><Textarea id="sv-s" rows={3} value={s} onChange={(e: any) => setS(e.target.value)} /></Field>
    </Modal>
  );
}
