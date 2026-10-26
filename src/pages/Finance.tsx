import { useRef, useState, useEffect } from 'react';
import { LuPlus, LuPaperclip, LuPencil, LuTrash2, LuTriangleAlert, LuWallet, LuCoins, LuSend, LuCheck, LuFileSpreadsheet, LuChartBar } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, projectOf, supplierOf, A, uid, byId, projectFinance, budgetHealth, canSeeFinance, poTotal, clientOf, simulateEmail } from '../data/api';
import { EXPENSE_CATEGORIES } from '../data/seed';
import type * as T from '../data/types';
import { todayISO, D } from '../data/dates';
import { CameraButton, PageHead, Btn, Select, SearchBox, Chips, DataTable, StatusBadge, Badge, Card, Modal, Field, Input, Textarea, Empty, Callout, Stat, Progress, cx, Confirm, AssumeTag, DemoTag, FutureTag, Segmented } from '../ui/core';
import { BudgetBars, Columns, StackBar, Donut } from '../ui/charts';
import { ProjectLink } from './shared';
import { ils, ilsShort, pct, date, monthName } from '../lib/format';
import { friendlyError } from '../live/errors';
import { useAct, useOpenFile } from '../live/hooks';

function monthlySpend(expenses: T.Expense[], months = 8) {
  const out: { label: string; value: number; key: string }[] = [];
  const base = new Date(2026, 9, 1);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(base); d.setMonth(base.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ key, label: monthName(d.getMonth()).slice(0, 3) + '׳', value: expenses.filter((e) => e.date.startsWith(key)).reduce((a, e) => a + e.amount, 0) });
  }
  return out;
}

export function BudgetOverview() {
  const { db, me, nav, live } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'ליד חדש');
  const rows = projects.map((p) => ({ key: p.id, p, f: projectFinance(db, p.id) }));
  const tot = rows.reduce((a, r) => ({ planned: a.planned + r.f.planned, actual: a.actual + r.f.actual, committed: a.committed + r.f.committed, fee: a.fee + r.f.feeTotal, feePaid: a.feePaid + r.f.feePaid }), { planned: 0, actual: 0, committed: 0, fee: 0, feePaid: 0 });
  const warn = db.settings.budgetWarnPct / 100;
  const alerts = rows.filter((r) => r.p.status !== 'הושלם').flatMap((r) => [
    ...r.f.byCat.filter((c) => c.pct > 1).map((c) => ({ p: r.p, text: `חריגה בסעיף ${c.category}: ${pct(c.pct)} (${ils(c.actual - c.planned)} מעל)`, tone: 'bad' })),
    ...(r.f.pct >= warn ? [{ p: r.p, text: `${pct(r.f.pct)} מהתקציב הכולל נוצל`, tone: r.f.pct > 1 ? 'bad' : 'warn' }] : []),
  ]);
  return (
    <div>
      <PageHead title="תקציב ביצוע" badge={live ? undefined : <DemoTag>נתונים כספיים מדומים</DemoTag>} sub="כספי הלקוחות לקבלנים, ספקים ורכישות – בנפרד משכר הטרחה של המשרד. כל הסכומים לפני מע״מ." actions={<><Btn icon={LuCoins} onClick={() => nav('/fees')}>שכר טרחה</Btn><Btn kind="primary" icon={LuPlus} onClick={() => nav('/expenses?new=1')}>רישום הוצאה</Btn></>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="תקציב ביצוע מתוכנן" value={ilsShort(tot.planned)} meta={`${projects.length} פרויקטים`} />
        <Stat label="הוצאות בפועל" value={ilsShort(tot.actual)} meta={pct(tot.actual / tot.planned) + ' מהמתוכנן'} />
        <Stat label="התחייבויות פתוחות" value={ilsShort(tot.committed)} meta="הזמנות רכש שטרם שולמו" />
        <Stat label="התראות תקציב" value={alerts.length} tone={alerts.length ? 'alert' : ''} meta={`סף התראה ${db.settings.budgetWarnPct}% (בהגדרות)`} />
      </div>
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="ניצול לפי פרויקט" pad={false}>
            <DataTable rows={rows} onRow={(r: any) => nav(`/projects/${r.p.id}/budget`)} rowKey="key" columns={[
              { key: 'name', label: 'פרויקט', sortValue: (r: any) => r.p.name, render: (r: any) => <div className="col" style={{ gap: 0 }}><b>{r.p.name}</b><StatusBadge s={r.p.status} /></div> },
              { key: 'planned', label: 'מתוכנן', num: true, sortValue: (r: any) => r.f.planned, render: (r: any) => ils(r.f.planned) },
              { key: 'actual', label: 'בפועל', num: true, sortValue: (r: any) => r.f.actual, render: (r: any) => ils(r.f.actual) },
              { key: 'committed', label: 'התחייבויות', num: true, sortValue: (r: any) => r.f.committed, render: (r: any) => ils(r.f.committed) },
              { key: 'pct', label: 'ניצול', sortValue: (r: any) => r.f.pct, render: (r: any) => { const h = r.f.byCat.some((c: any) => c.pct > 1) ? 'bad' : budgetHealth(r.f.pct, warn); return <div className="row g8" style={{ minWidth: 130 }}><Progress value={r.f.pct} tone={h === 'ok' ? '' : h} /><span className={cx('xs num bold', h === 'bad' ? 'bad-t' : h === 'warn' ? 'warn-t' : '')}>{pct(r.f.pct)}</span></div>; } },
              { key: 'remaining', label: 'יתרה', num: true, sortValue: (r: any) => r.f.remaining, render: (r: any) => <span className={r.f.remaining < 0 ? 'bad-t bold' : ''}>{ils(r.f.remaining)}</span> },
            ].map((c) => c)} />
          </Card>
          <Card title="הוצאות ביצוע לפי חודש" icon={LuChartBar} actions={<span className="xs muted">כל הפרויקטים</span>}>
            <Columns data={monthlySpend(db.expenses.filter((e) => projects.some((p) => p.id === e.projectId)))} highlightLast />
          </Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="התראות תקציב" icon={LuTriangleAlert} pad={false}>
            {alerts.length ? <div className="list">{alerts.map((a, i) => <div key={i} className="li click" onClick={() => nav(`/projects/${a.p.id}/budget`)}><span className={cx('li-ic', a.tone)}><LuTriangleAlert aria-hidden /></span><div className="li-main"><div className="li-title">{a.p.name}</div><div className="li-sub" style={{ whiteSpace: 'normal' }}>{a.text}</div></div></div>)}</div> : <Empty title="אין התראות" />}
          </Card>
          <Card title="תמונה כספית כוללת" icon={LuWallet}>
            <div className="stack">
              <StackBar parts={[{ label: 'ביצוע בפועל', value: tot.actual, color: 'var(--navy-3)' }, { label: 'התחייבויות', value: tot.committed, color: 'var(--accent)' }, { label: 'יתרת תקציב', value: Math.max(0, tot.planned - tot.actual - tot.committed), color: 'var(--line-strong)' }]} />
              <hr className="sep" />
              <div className="row between small"><span className="muted">שכר טרחה – סך חוזים</span><b className="num">{ils(tot.fee)}</b></div>
              <div className="row between small"><span className="muted">שכר טרחה – התקבל</span><b className="num ok-t">{ils(tot.feePaid)}</b></div>
              <Callout kind="info">שכר הטרחה מוצג בנפרד ולא נכלל בתקציב הביצוע של הלקוח.</Callout>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ProjectBudget({ projectId }: { projectId: string }) {
  const { db, run, toast, nav, live } = useStore();
  const f = projectFinance(db, projectId);
  const p = projectOf(db, projectId)!;
  const [editLines, setEditLines] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCat, setNewCat] = useState({ category: EXPENSE_CATEGORIES[0], planned: 10000 });
  const warn = db.settings.budgetWarnPct / 100;
  const overs = f.byCat.filter((c) => c.pct > 1);
  return (
    <div className="stack-lg">
      <div className="row wrap g8">{live ? null : <DemoTag>נתונים כספיים מדומים</DemoTag>}<span className="small muted">סכומים לפני מע״מ · תקציב ביצוע = כספי הלקוח לקבלנים, ספקים ורכש</span></div>
      <div className="grid-4">
        <Stat label="תקציב מתוכנן" value={ils(f.planned)} meta={`${f.lines.length} סעיפים`} />
        <Stat label="בפועל" value={ils(f.actual)} meta={`${pct(f.pct)} · ${ils(f.paid)} שולמו`} tone={f.pct > 1 ? 'alert' : f.pct >= warn ? 'warn' : ''} />
        <Stat label="התחייבויות (הזמנות פתוחות)" value={ils(f.committed)} onClick={() => nav(`/projects/${projectId}/procurement`)} />
        <Stat label="יתרה צפויה" value={ils(f.remaining)} tone={f.remaining < 0 ? 'alert' : ''} meta="מתוכנן − בפועל − התחייבויות" />
      </div>
      {overs.length ? <Callout kind="bad" title="חריגה בסעיפי תקציב">{overs.map((c) => `${c.category}: ${ils(c.actual)} מתוך ${ils(c.planned)} (${pct(c.pct)})`).join(' · ')}. מומלץ לעדכן את הלקוח או לשלוח בקשת אישור לשינוי תקציב.</Callout> : null}
      <div className="grid-main-side">
        <Card title="מתוכנן מול בפועל לפי סעיף" actions={<><Btn size="sm" icon={LuPencil} onClick={() => setEditLines((x) => !x)}>{editLines ? 'סיום עריכה' : 'עריכת סעיפים'}</Btn><Btn size="sm" icon={LuPlus} onClick={() => setAdding(true)}>סעיף</Btn></>}>
          {editLines ? (
            <div className="col g8">
              {f.lines.map((l) => <div key={l.id} className="row g8"><span className="grow">{l.category}</span><input className="input sm" type="number" min={0} step={1000} defaultValue={l.planned} style={{ width: 140 }} onBlur={(e) => { const v = Number(e.target.value); if (v >= 0 && v !== l.planned) { run(A.setBudgetLine, l.id, v); toast(`הסעיף ${l.category} עודכן`); } }} aria-label={`תקציב ${l.category}`} /></div>)}
              <span className="xs muted">שינוי תקציב מהותי מומלץ לשלוח ללקוח לאישור (סוג "שינוי תקציב").</span>
            </div>
          ) : <BudgetBars warn={warn} rows={f.byCat.map((c) => ({ label: c.category, planned: c.planned, actual: c.actual, committed: c.committed }))} />}
        </Card>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="תמונה כספית כוללת">
            <div className="stack">
              <div className="eyebrow">ביצוע</div>
              <StackBar total={f.planned} parts={[{ label: 'בפועל', value: f.actual, color: f.pct > 1 ? 'var(--bad)' : 'var(--navy-3)' }, { label: 'התחייבויות', value: f.committed, color: 'var(--accent)' }]} />
              <div className="eyebrow">שכר טרחה</div>
              <StackBar total={f.feeTotal} parts={[{ label: 'שולם', value: f.feePaid, color: 'var(--ok)' }, { label: 'בדרישה', value: f.feeBilled, color: 'var(--info)' }]} />
              <div className="row between small"><span className="muted">היקף כולל (ביצוע + שכר טרחה)</span><b className="num">{ils(f.planned + f.feeTotal)}</b></div>
            </div>
          </Card>
          <Card title="הוצאות לפי חודש"><Columns data={monthlySpend(f.expenses, 6)} height={200} width={340} /></Card>
        </div>
      </div>
      <ExpenseTable rows={f.expenses} hideProject projectId={projectId} />
      {adding ? (
        <Modal title="סעיף תקציב חדש" onClose={() => setAdding(false)} size="narrow" foot={<><Btn kind="primary" onClick={() => { if (f.lines.some((l) => l.category === newCat.category)) { toast('הסעיף כבר קיים', 'bad'); return; } run(A.addBudgetLine, projectId, newCat.category, Number(newCat.planned)); toast('הסעיף נוסף'); setAdding(false); }}>הוספה</Btn><Btn kind="ghost" onClick={() => setAdding(false)}>ביטול</Btn></>}>
          <div className="stack"><Field label="קטגוריה" htmlFor="nb-c"><Select id="nb-c" value={newCat.category} onChange={(e: any) => setNewCat({ ...newCat, category: e.target.value })} options={EXPENSE_CATEGORIES} /></Field><Field label="סכום מתוכנן (₪)" htmlFor="nb-p"><Input id="nb-p" type="number" min={0} value={newCat.planned} onChange={(e: any) => setNewCat({ ...newCat, planned: e.target.value })} /></Field></div>
        </Modal>
      ) : null}
    </div>
  );
}

function ExpenseTable({ rows, hideProject, projectId }: any) {
  const { db, live } = useStore();
  const [edit, setEdit] = useState<T.Expense | null>(null);
  const [adding, setAdding] = useState(false);
  const total = rows.reduce((a: number, e: T.Expense) => a + e.amount, 0);
  return (
    <Card title={`הוצאות (${rows.length})`} pad={false} actions={<Btn size="sm" kind="primary" icon={LuPlus} onClick={() => setAdding(true)}>הוצאה</Btn>}>
      <DataTable rows={rows} onRow={setEdit} pageSize={10} initialSort={{ key: 'date', dir: -1 }} empty={<Empty title="אין הוצאות בסינון הזה" />} columns={[
        { key: 'date', label: 'תאריך', render: (e: T.Expense) => <span className="small nowrap">{date(e.date)}</span> },
        { key: 'description', label: 'תיאור', render: (e: T.Expense) => <div className="col" style={{ gap: 0 }}><span>{e.description}</span><span className="xs muted">{e.category}{e.poId ? ' · ' + (byId(db.purchaseOrders, e.poId)?.number || '') : ''}</span></div> },
        ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', render: (e: T.Expense) => <ProjectLink id={e.projectId} /> }]),
        { key: 'supplierId', label: 'ספק', sortValue: (e: T.Expense) => supplierOf(db, e.supplierId)?.name || 'ת', render: (e: T.Expense) => <span className="small">{supplierOf(db, e.supplierId)?.name || '—'}</span> },
        { key: 'paidBy', label: 'שולם ע״י', render: (e: T.Expense) => <span className="small">{e.paidBy}</span> },
        { key: 'receipt', label: 'קבלה', render: (e: T.Expense) => e.receipt ? <span className="row g4 small info-t"><LuPaperclip aria-hidden style={{ width: 13 }} />{e.receipt}</span> : <span className="xs bad-t">חסרה</span> },
        { key: 'status', label: 'סטטוס', render: (e: T.Expense) => <StatusBadge s={e.status} /> },
        { key: 'amount', label: 'סכום', num: true, render: (e: T.Expense) => <b>{ils(e.amount)}</b> },
      ]} footer={rows.length ? <tr><td colSpan={hideProject ? 6 : 7}>סה״כ</td><td className="num">{ils(total)}</td></tr> : null} />
      {edit ? <ExpenseForm expense={edit} onClose={() => setEdit(null)} /> : null}
      {adding ? <ExpenseForm defaults={{ projectId }} onClose={() => setAdding(false)} /> : null}
    </Card>
  );
}

export function ExpensesPage({ query }: any) {
  const { db, me, nav, live } = useStore();
  const projects = visibleProjects(db, me);
  const pids = new Set(projects.map((p) => p.id));
  const all = db.expenses.filter((e) => pids.has(e.projectId));
  const [project, setProject] = useState(query.project || '');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [view, setView] = useState('list');
  const [adding, setAdding] = useState(!!query.new);
  useEffect(() => { if (query.new) setAdding(true); }, [query.new]);
  let list = all;
  if (project) list = list.filter((e) => e.projectId === project);
  if (cat) list = list.filter((e) => e.category === cat);
  if (status) list = list.filter((e) => e.status === status);
  if (paidBy) list = list.filter((e) => e.paidBy === paidBy);
  if (from) list = list.filter((e) => e.date >= from);
  if (to) list = list.filter((e) => e.date <= to);
  if (q.trim()) list = list.filter((e) => e.description.includes(q) || (supplierOf(db, e.supplierId)?.name || '').includes(q));
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: list.filter((e) => e.category === c).reduce((a, e) => a + e.amount, 0) })).filter((x) => x.value).sort((a, b) => b.value - a.value);
  const colors = ['var(--navy-3)', 'var(--accent)', 'var(--info)', 'var(--ok)', 'var(--violet)', 'var(--warn)', '#7FA3D6', 'var(--bad)', 'var(--ink-3)', '#5DAF86', '#C9A86A'];
  return (
    <div>
      <PageHead title="הוצאות" badge={live ? undefined : <DemoTag>נתונים מדומים</DemoTag>} sub="רישום הוצאות ביצוע לפי פרויקט, סעיף, ספק והזמנת רכש." actions={<><Btn disabled title="ייצוא יתווסף בגרסת הייצור" icon={LuFileSpreadsheet}>ייצוא לאקסל</Btn><Btn kind="primary" icon={LuPlus} onClick={() => setAdding(true)}>הוצאה חדשה</Btn></>} />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="סה״כ בסינון" value={ils(list.reduce((a, e) => a + e.amount, 0))} meta={`${list.length} רשומות`} />
        <Stat label="ממתין לתשלום" value={ils(list.filter((e) => e.status === 'ממתין לתשלום').reduce((a, e) => a + e.amount, 0))} tone="warn" onClick={() => setStatus('ממתין לתשלום')} />
        <Stat label="חסרות קבלות" value={list.filter((e) => !e.receipt).length} tone={list.some((e) => !e.receipt) ? 'warn' : ''} />
        <Stat label="שולם דרך המשרד" value={ils(list.filter((e) => e.paidBy === 'דרך המשרד').reduce((a, e) => a + e.amount, 0))} meta="להעברה ללקוח לפי הסכם" onClick={() => setPaidBy('דרך המשרד')} />
      </div>
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="חיפוש תיאור או ספק" id="ex-search" />
        <Select value={project} onChange={(e: any) => setProject(e.target.value)} placeholder="כל הפרויקטים" options={projects.map((p) => ({ value: p.id, label: p.name }))} aria-label="פרויקט" />
        <Select value={cat} onChange={(e: any) => setCat(e.target.value)} placeholder="כל הסעיפים" options={EXPENSE_CATEGORIES} aria-label="סעיף" />
        <Select value={status} onChange={(e: any) => setStatus(e.target.value)} placeholder="כל הסטטוסים" options={['שולם', 'ממתין לתשלום']} aria-label="סטטוס" />
        <Select value={paidBy} onChange={(e: any) => setPaidBy(e.target.value)} placeholder="כל המשלמים" options={['לקוח ישירות', 'דרך המשרד']} aria-label="משלם" />
        <Input type="date" className="sm" style={{ width: 'auto' }} value={from} onChange={(e: any) => setFrom(e.target.value)} aria-label="מתאריך" />
        <Input type="date" className="sm" style={{ width: 'auto' }} value={to} onChange={(e: any) => setTo(e.target.value)} aria-label="עד תאריך" />
        <div className="grow" />
        <Segmented value={view} onChange={setView} options={[{ value: 'list', label: 'רשימה' }, { value: 'report', label: 'דוח' }]} />
      </div>
      {view === 'list' ? <ExpenseTable rows={list} /> : (
        <div className="grid-2">
          <Card title="התפלגות לפי סעיף"><Donut parts={byCat.map((x, i) => ({ ...x, color: colors[i % colors.length] }))} size={150} center={ilsShort(list.reduce((a, e) => a + e.amount, 0))} sub="סה״כ" /></Card>
          <Card title="סכומים לפי סעיף" pad={false}>
            <div className="table-wrap"><table className="tbl"><thead><tr><th>סעיף</th><th className="num">סכום</th><th className="num">שיעור</th></tr></thead><tbody>{byCat.map((x) => <tr key={x.label}><td>{x.label}</td><td className="num">{ils(x.value)}</td><td className="num">{pct(x.value / (list.reduce((a, e) => a + e.amount, 0) || 1))}</td></tr>)}</tbody></table></div>
          </Card>
          <Card title="לפי חודש" className="full" ><Columns data={monthlySpend(list)} /></Card>
        </div>
      )}
      {adding ? <ExpenseForm defaults={{ projectId: project }} onClose={() => { setAdding(false); if (query.new) nav('/expenses'); }} /> : null}
    </div>
  );
}

export function ExpenseForm({ expense, defaults = {}, onClose }: any) {
  const { db, me, run, toast, live } = useStore();
  const isNew = !expense;
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'ליד חדש');
  const [f, setF] = useState<T.Expense>(() => expense ? { ...expense } : { id: uid('ex'), projectId: defaults.projectId || '', date: todayISO, category: defaults.category || EXPENSE_CATEGORIES[0], description: defaults.description || '', supplierId: defaults.supplierId || null, poId: defaults.poId || null, amount: defaults.amount || ('' as any), receipt: null, status: 'שולם', paidBy: defaults.paidBy || 'לקוח ישירות' });
  const [err, setErr] = useState<any>({});
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const receiptFile = useRef<File | null>(null);
  const openFile = useOpenFile();
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const pos = db.purchaseOrders.filter((o) => o.projectId === f.projectId && (!f.supplierId || o.supplierId === f.supplierId) && o.status !== 'בוטלה');
  const fin = f.projectId ? projectFinance(db, f.projectId) : null;
  const line = fin?.byCat.find((c) => c.category === f.category);
  const willExceed = line && isNew && line.actual + Number(f.amount || 0) > line.planned;
  const save = async () => {
    const e: any = {};
    if (!f.projectId) e.projectId = 'יש לבחור פרויקט';
    if (!f.description.trim()) e.description = 'יש להזין תיאור';
    if (!(Number(f.amount) > 0)) e.amount = 'הסכום חייב להיות גדול מ-0';
    if (f.date > D(30)) e.date = 'תאריך רחוק מדי בעתיד';
    setErr(e); if (Object.keys(e).length) return;
    if (live && receiptFile.current) {
      setBusy(true);
      try { const { path } = await live.upload('receipts', f.projectId, receiptFile.current); (f as any)._receiptPath = path; }
      catch (x: any) { setBusy(false); setErr({ receipt: friendlyError(x) }); return; }
    }
    run(A.saveExpense, { ...f, amount: Number(f.amount) }, isNew); toast(isNew ? 'ההוצאה נרשמה' : 'ההוצאה עודכנה'); onClose();
  };
  return (
    <Modal title={isNew ? 'רישום הוצאה' : 'עריכת הוצאה'} onClose={onClose} foot={<><Btn kind="primary" onClick={save} disabled={busy}>{busy ? 'שומר…' : 'שמירה'}</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn>{!isNew ? <><span className="grow" /><Btn kind="danger" icon={LuTrash2} onClick={() => setDel(true)}>מחיקה</Btn></> : null}</>}>
      <div className="form-grid">
        <Field label="פרויקט *" error={err.projectId} htmlFor="ef-p"><Select id="ef-p" value={f.projectId} invalid={err.projectId} onChange={(e: any) => { set('projectId', e.target.value); set('poId', null); }} placeholder="בחירה" options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Field>
        <Field label="תאריך" error={err.date} htmlFor="ef-d"><Input id="ef-d" type="date" value={f.date} invalid={err.date} onChange={(e: any) => set('date', e.target.value)} /></Field>
        <Field label="תיאור *" full error={err.description} htmlFor="ef-de"><Input id="ef-de" value={f.description} invalid={err.description} onChange={(e: any) => set('description', e.target.value)} /></Field>
        <Field label="סעיף תקציב" htmlFor="ef-c"><Select id="ef-c" value={f.category} onChange={(e: any) => set('category', e.target.value)} options={EXPENSE_CATEGORIES} /></Field>
        <Field label="סכום (₪, לפני מע״מ) *" error={err.amount} htmlFor="ef-a"><Input id="ef-a" type="number" min={0} value={f.amount} invalid={err.amount} onChange={(e: any) => set('amount', e.target.value)} /></Field>
        <Field label="ספק" htmlFor="ef-s"><Select id="ef-s" value={f.supplierId || ''} onChange={(e: any) => { set('supplierId', e.target.value || null); set('poId', null); }} options={[{ value: '', label: 'ללא ספק' }, ...db.suppliers.map((s) => ({ value: s.id, label: s.name }))]} /></Field>
        <Field label="הזמנת רכש" htmlFor="ef-po"><Select id="ef-po" value={f.poId || ''} onChange={(e: any) => set('poId', e.target.value || null)} options={[{ value: '', label: 'ללא קישור' }, ...pos.map((o) => ({ value: o.id, label: `${o.number} · ${ils(poTotal(o))}` }))]} /></Field>
        <Field label="שולם ע״י" htmlFor="ef-pb"><Select id="ef-pb" value={f.paidBy} onChange={(e: any) => set('paidBy', e.target.value)} options={['לקוח ישירות', 'דרך המשרד']} /></Field>
        <Field label="סטטוס" htmlFor="ef-st"><Select id="ef-st" value={f.status} onChange={(e: any) => set('status', e.target.value)} options={['שולם', 'ממתין לתשלום']} /></Field>
        <Field label="קבלה / חשבונית" full error={err.receipt} hint={live ? 'PDF, JPG או PNG עד 20MB. נשמר באחסון פרטי.' : 'הקובץ לא נשמר בדמו – נשמר רק שם הקובץ'} htmlFor="ef-r">
          <div className="row g8 wrap"><Input id="ef-r" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e: any) => { const fl = e.target.files?.[0] || null; receiptFile.current = fl; set('receipt', fl?.name || null); }} style={{ paddingTop: 6 }} /><CameraButton label="צילום קבלה" onFile={(fl) => { receiptFile.current = fl; set('receipt', fl.name); }} />{f.receipt ? (live && (f as any)._receiptPath && !receiptFile.current ? <button type="button" className="badge info" onClick={() => openFile('receipts', (f as any)._receiptPath)}><LuPaperclip aria-hidden />{f.receipt}</button> : <span className="badge info"><LuPaperclip aria-hidden />{f.receipt}</span>) : null}</div>
        </Field>
      </div>
      {willExceed ? <div className="mt16"><Callout kind="assume">ההוצאה תעביר את הסעיף "{f.category}" מעבר לתקציב ({ils(line!.actual + Number(f.amount))} מתוך {ils(line!.planned)}). תישלח התראה לאחראי/ת הפרויקט.</Callout></div> : null}
      {del ? <Confirm title="מחיקת הוצאה" danger confirmLabel="מחיקה" onClose={() => setDel(false)} onConfirm={() => { run(A.deleteExpense, f.id); toast('ההוצאה נמחקה'); onClose(); }}>למחוק את ההוצאה "{f.description}"?</Confirm> : null}
    </Modal>
  );
}

export function FeesPage() {
  const { db, me, nav, live } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'ליד חדש');
  const fees = db.feeMilestones.filter((f) => projects.some((p) => p.id === f.projectId));
  const sum = (s: string[]) => fees.filter((f) => s.includes(f.status)).reduce((a, f) => a + f.amount, 0);
  const [status, setStatus] = useState('open');
  const list = fees.filter((f) => status === 'all' ? true : status === 'open' ? f.status !== 'שולם' && f.status !== 'עתידי' : f.status === status).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <div>
      <PageHead title="שכר טרחה" badge={live ? undefined : <AssumeTag>מודול בהרחבה – הנחת דמו</AssumeTag>} sub="התשלומים למשרד לפי אבני דרך בהסכם, בנפרד מתקציב הביצוע של הלקוח." />
      <div className="grid-4" style={{ marginBottom: 20 }}>
        <Stat label="סך הסכמי שכר טרחה" value={ilsShort(projects.reduce((a, p) => a + p.feeTotal, 0))} meta={`${projects.length} פרויקטים`} />
        <Stat label="התקבל" value={ilsShort(sum(['שולם']))} />
        <Stat label="נשלחה דרישת תשלום" value={ilsShort(sum(['נשלחה דרישה']))} onClick={() => setStatus('נשלחה דרישה')} />
        <Stat label="באיחור" value={ilsShort(sum(['באיחור']))} tone={sum(['באיחור']) ? 'alert' : ''} onClick={() => setStatus('באיחור')} />
      </div>
      <Callout kind="assume" title={live ? 'חשבוניות' : 'מה כאן מדומה'}>{live ? 'דרישת תשלום נשלחת ללקוח במייל, אבל חשבונית מס לא מופקת מכאן. חיבור למערכת חשבוניות ישראלית או ייצוא לרו״ח – החלטה פתוחה.' : 'דרישות תשלום וחשבוניות לא מופקות בפועל. בהמשך אפשר לחבר מערכת חשבוניות ישראלית או לייצא לרו״ח – החלטה פתוחה.'}</Callout>
      <div className="filters mt16"><Chips value={status} onChange={setStatus} options={[{ value: 'open', label: 'פתוחים לגבייה' }, { value: 'באיחור', label: 'באיחור' }, { value: 'נשלחה דרישה', label: 'נשלחה דרישה' }, { value: 'עתידי', label: 'עתידיים' }, { value: 'שולם', label: 'שולמו' }, { value: 'all', label: 'הכול' }]} /></div>
      <FeeTable rows={list} />
      <div className="mt16">
        <Card title="לפי פרויקט" pad={false}>
          <DataTable rows={projects} onRow={(p: any) => nav(`/projects/${p.id}/fees`)} columns={[
            { key: 'name', label: 'פרויקט', render: (p: T.Project) => <b>{p.name}</b> },
            { key: 'feeType', label: 'מודל', render: (p: T.Project) => <span className="small">{p.feeType}</span> },
            { key: 'feeTotal', label: 'סך הסכם', num: true, render: (p: T.Project) => ils(p.feeTotal) },
            { key: 'paid', label: 'התקבל', num: true, sortValue: (p: T.Project) => projectFinance(db, p.id).feePaid, render: (p: T.Project) => ils(projectFinance(db, p.id).feePaid) },
            { key: 'bar', label: 'גבייה', sortable: false, render: (p: T.Project) => { const f = projectFinance(db, p.id); return <div style={{ minWidth: 140 }}><StackBar total={p.feeTotal} parts={[{ label: 'שולם', value: f.feePaid, color: 'var(--ok)' }, { label: 'בדרישה', value: f.feeBilled, color: 'var(--info)' }]} /></div>; } },
          ]} />
        </Card>
      </div>
    </div>
  );
}

function FeeTable({ rows, hideProject }: any) {
  const { db, run, toast, live } = useStore();
  const act = useAct();
  return (
    <div className="card">
      <DataTable rows={rows} empty={<Empty title="אין אבני דרך בסינון הזה" />} columns={[
        { key: 'title', label: 'אבן דרך', render: (f: T.FeeMilestone) => <b>{f.title}</b> },
        ...(hideProject ? [] : [{ key: 'projectId', label: 'פרויקט', render: (f: T.FeeMilestone) => <ProjectLink id={f.projectId} /> }]),
        { key: 'pct', label: '%', num: true, render: (f: T.FeeMilestone) => `${f.pct}%` },
        { key: 'amount', label: 'סכום', num: true, render: (f: T.FeeMilestone) => ils(f.amount) },
        { key: 'dueDate', label: 'מועד', render: (f: T.FeeMilestone) => <span className={cx('small', f.status === 'באיחור' && 'bad-t bold')}>{date(f.dueDate)}</span> },
        { key: 'status', label: 'סטטוס', render: (f: T.FeeMilestone) => <span className="col" style={{ gap: 2 }}><StatusBadge s={f.status} />{f.paidAt ? <span className="xs muted">שולם {date(f.paidAt)}</span> : null}</span> },
        { key: 'act', label: '', sortable: false, render: (f: T.FeeMilestone) => (
          <div className="row g4">
            {f.status === 'עתידי' || f.status === 'באיחור' ? <Btn size="xs" icon={LuSend} onClick={() => { if (live) { act((api) => api.rpc('send_fee_request', { p_fee: f.id }), 'דרישת התשלום נשלחה ללקוח (חשבונית לא מופקת מכאן)'); return; } run(A.setFeeStatus, f.id, 'נשלחה דרישה'); run((d: any) => { const p = projectOf(d, f.projectId)!; const c = clientOf(d, p.clientId)!.contacts[0]; simulateEmail(d, c.email, `דרישת תשלום: ${f.title} – ${p.name}`, 'fee_request', `/projects/${p.id}/fees`); }); toast('דרישת תשלום נרשמה (מדומה – לא הופקה חשבונית)', 'info'); }}>דרישת תשלום</Btn> : null}
            {f.status !== 'שולם' ? <Btn size="xs" kind="ok" icon={LuCheck} onClick={() => { run(A.setFeeStatus, f.id, 'שולם'); toast('סומן כשולם'); }}>סימון כשולם</Btn> : null}
            {f.status === 'עתידי' ? <Btn size="xs" kind="ghost" icon={LuTrash2} aria-label="מחיקה" onClick={() => { run(A.deleteFeeMilestone, f.id); toast('אבן הדרך נמחקה'); }} /> : null}
          </div>
        ) },
      ]} />
    </div>
  );
}

export function ProjectFees({ projectId }: { projectId: string }) {
  const { db, me, live } = useStore();
  const [add, setAdd] = useState(false);
  const p = projectOf(db, projectId)!;
  const f = projectFinance(db, projectId);
  const rows = db.feeMilestones.filter((x) => x.projectId === projectId);
  return (
    <div className="stack-lg">
      <div className="grid-4">
        <Stat label="סך הסכם שכר טרחה" value={ils(p.feeTotal)} meta={p.feeType} />
        <Stat label="התקבל" value={ils(f.feePaid)} meta={p.feeTotal ? pct(f.feePaid / p.feeTotal) : '—'} />
        <Stat label="בדרישה / באיחור" value={ils(f.feeBilled)} tone={rows.some((r) => r.status === 'באיחור') ? 'alert' : ''} />
        <Stat label="יתרה לגבייה" value={ils(p.feeTotal - f.feePaid)} />
      </div>
      <Card title="התקדמות גבייה"><StackBar total={p.feeTotal} parts={[{ label: 'שולם', value: f.feePaid, color: 'var(--ok)' }, { label: 'בדרישה', value: f.feeBilled, color: 'var(--info)' }, { label: 'עתידי', value: Math.max(0, p.feeTotal - f.feePaid - f.feeBilled), color: 'var(--line-strong)' }]} /></Card>
      <div className="row between g8 wrap"><b>אבני דרך לתשלום</b>{me.role === 'owner' || me.role === 'admin' ? <Btn size="sm" icon={LuPlus} onClick={() => setAdd(true)}>אבן דרך חדשה</Btn> : null}</div>
      <FeeTable rows={rows} hideProject />
      {live ? null : <Callout kind="assume">מבנה אבני הדרך והאחוזים הם דוגמה. בייצור הם ייגזרו מהסכם ההתקשרות של כל פרויקט.</Callout>}
      {add ? <FeeForm project={p} onClose={() => setAdd(false)} /> : null}
    </div>
  );
}

function FeeForm({ project, onClose }: { project: T.Project; onClose: () => void }) {
  const { run, toast, live } = useStore();
  const [f, setF] = useState({ title: '', pct: '', amount: '', dueDate: todayISO });
  const [err, setErr] = useState<any>({});
  const fromPct = (v: string) => setF((x) => ({ ...x, pct: v, amount: project.feeTotal && Number(v) > 0 ? String(Math.round((project.feeTotal * Number(v)) / 100)) : x.amount }));
  const save = () => {
    const e: any = {};
    if (!f.title.trim()) e.title = 'יש להזין שם';
    if (!(Number(f.amount) > 0)) e.amount = 'הסכום חייב להיות גדול מ-0';
    setErr(e); if (Object.keys(e).length) return;
    run(A.addFeeMilestone, { id: uid('fee'), projectId: project.id, title: f.title.trim(), pct: Number(f.pct) || 0, amount: Number(f.amount), dueDate: f.dueDate, status: 'עתידי' });
    toast('אבן הדרך נוספה'); onClose();
  };
  return (
    <Modal title="אבן דרך לשכר טרחה" size="narrow" onClose={onClose} foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="שם *" full error={err.title} htmlFor="ff-t"><Input id="ff-t" value={f.title} invalid={err.title} onChange={(e: any) => setF({ ...f, title: e.target.value })} placeholder="מקדמה בחתימה" /></Field>
        <Field label="אחוז מההסכם" htmlFor="ff-p"><Input id="ff-p" type="number" min={0} max={100} value={f.pct} onChange={(e: any) => fromPct(e.target.value)} /></Field>
        <Field label="סכום (₪) *" error={err.amount} htmlFor="ff-a"><Input id="ff-a" type="number" min={0} value={f.amount} invalid={err.amount} onChange={(e: any) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="מועד" full htmlFor="ff-d"><Input id="ff-d" type="date" value={f.dueDate} onChange={(e: any) => setF({ ...f, dueDate: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}
