// Time tracking: my hours, the team's hours, profitability per project and internal cost rates.
import { useEffect, useState } from 'react';
import { LuClock, LuPlus, LuTrash2, LuPencil, LuTrendingUp, LuUsers, LuCoins, LuSave } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A, uid, visibleProjects, visibleTime, canSeeRates, phasesOf, projectOf, projectProfit, rateOf, userName } from '../data/api';
import type * as T from '../data/types';
import { todayISO, D, DEMO_TODAY } from '../data/dates';
import { PageHead, Btn, Card, Tabs, Modal, Field, Input, Select, Textarea, DataTable, Empty, Stat, Callout, AssumeTag, IconBtn, Avatar, cx } from '../ui/core';
import { ProjectLink } from './shared';
import { date, ils, num, DOW_S } from '../lib/format';

export function TimePage({ query }: any) {
  const { me, nav } = useStore();
  const mgr = canSeeRates(me);
  const [tab, setTab] = useState(mgr && ['team', 'profit', 'rates'].includes(query.tab) ? query.tab : 'mine');
  const [log, setLog] = useState(!!query.log);
  useEffect(() => { if (query.tab) setTab(mgr && ['team', 'profit', 'rates'].includes(query.tab) ? query.tab : 'mine'); }, [query.tab]); // eslint-disable-line
  useEffect(() => { if (query.log) setLog(true); }, [query.log]);
  return (
    <div>
      <PageHead title="שעות ורווחיות" sub={mgr ? 'רישום שעות לפי פרויקט ושלב, וכמה כל פרויקט באמת מרוויח.' : 'רישום השעות שלך לפי פרויקט ושלב.'} actions={<Btn kind={tab === 'mine' ? 'primary' : undefined} icon={LuPlus} onClick={() => setLog(true)}>רישום שעות</Btn>} />
      {mgr ? <Tabs value={tab} onChange={setTab} tabs={[{ id: 'mine', label: 'השעות שלי', icon: LuClock }, { id: 'team', label: 'צוות', icon: LuUsers }, { id: 'profit', label: 'רווחיות פרויקטים', icon: LuTrendingUp }, { id: 'rates', label: 'תעריפי עלות', icon: LuCoins }]} /> : null}
      {tab === 'mine' ? <MyTime /> : null}
      {tab === 'team' && mgr ? <TeamTime /> : null}
      {tab === 'profit' && mgr ? <ProfitTable /> : null}
      {tab === 'rates' && mgr ? <Rates /> : null}
      {log ? <TimeEntryModal onClose={() => { setLog(false); if (query.log) nav('/time'); }} /> : null}
    </div>
  );
}

const weekStart = () => { const d = new Date(DEMO_TODAY); return -d.getDay(); }; // Sunday of this week, as a day offset

function MyTime() {
  const { db, me, run, toast } = useStore();
  const mine = db.timeEntries.filter((e) => e.userId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  const [edit, setEdit] = useState<T.TimeEntry | null>(null);
  const ws = weekStart();
  const days = [0, 1, 2, 3, 4].map((i) => D(ws + i));
  const perDay = days.map((d) => mine.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0));
  const week = perDay.reduce((a, b) => a + b, 0);
  const month = mine.filter((e) => e.date.slice(0, 7) === todayISO.slice(0, 7)).reduce((s, e) => s + e.hours, 0);
  const byProject = new Map<string, number>(); mine.filter((e) => e.date >= D(-30)).forEach((e) => byProject.set(e.projectId, (byProject.get(e.projectId) || 0) + e.hours));
  const top = [...byProject.entries()].sort((a, b) => b[1] - a[1])[0];
  const max = Math.max(8, ...perDay);
  return (
    <div className="stack-lg">
      <div className="grid-3">
        <Stat label="השבוע" value={num(week)} meta="שעות, ראשון עד חמישי" icon={LuClock} />
        <Stat label="החודש" value={num(month)} meta="שעות" />
        <Stat label="הכי הרבה ב-30 יום" value={top ? projectOf(db, top[0])?.name || '—' : '—'} meta={top ? `${num(top[1])} שעות` : 'עוד לא נרשמו שעות'} />
      </div>
      <Card title="השבוע שלי">
        <div className="week-bars" role="list" aria-label="שעות לפי יום">
          {days.map((d, i) => (
            <div key={d} className={cx('wb', d === todayISO && 'today')} role="listitem" aria-label={`יום ${DOW_S[i]}: ${num(perDay[i])} שעות`}>
              <span className="wb-v num">{perDay[i] ? num(perDay[i]) : ''}</span>
              <span className="wb-bar"><i style={{ height: `${(perDay[i] / max) * 100}%` }} /></span>
              <span className="wb-d">{DOW_S[i]}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card pad={false} title="רישומים">
        <DataTable rows={mine} pageSize={15} empty={<Empty icon={LuClock} title="עוד לא נרשמו שעות">לחצו על "רישום שעות" כדי להתחיל.</Empty>} columns={[
          { key: 'date', label: 'תאריך', render: (e: T.TimeEntry) => date(e.date) },
          { key: 'projectId', label: 'פרויקט', render: (e: T.TimeEntry) => <ProjectLink id={e.projectId} /> },
          { key: 'phaseIdx', label: 'שלב', render: (e: T.TimeEntry) => <span className="small">{phasesOf(db, e.projectId).find((p) => p.idx === e.phaseIdx)?.name || '—'}</span> },
          { key: 'hours', label: 'שעות', num: true, render: (e: T.TimeEntry) => num(e.hours) },
          { key: 'note', label: 'תיאור', render: (e: T.TimeEntry) => <span className="small">{e.note || '—'}</span> },
          { key: 'act', label: '', sortable: false, render: (e: T.TimeEntry) => <div className="row g4"><IconBtn icon={LuPencil} label="עריכה" onClick={() => setEdit(e)} /><IconBtn icon={LuTrash2} label="מחיקה" onClick={() => { const copy = e; run(A.deleteTimeEntry, e.id); toast('הרישום נמחק', 'ok', () => run(A.saveTimeEntry, copy, true)); }} /></div> },
        ]} />
      </Card>
      {edit ? <TimeEntryModal entry={edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function TeamTime() {
  const { db, nav } = useStore();
  const staff = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status === 'פעיל');
  const since = D(-30);
  const rows = staff.map((u) => {
    const es = db.timeEntries.filter((e) => e.userId === u.id && e.date >= since);
    const hours = es.reduce((s, e) => s + e.hours, 0);
    const projects = new Set(es.map((e) => e.projectId)).size;
    const week = db.timeEntries.filter((e) => e.userId === u.id && e.date >= D(weekStart())).reduce((s, e) => s + e.hours, 0);
    return { id: u.id, u, hours, projects, week, cost: es.reduce((s, e) => s + e.hours * rateOf(db, u.id), 0) };
  });
  return (
    <Card pad={false} title="30 הימים האחרונים">
      <DataTable rows={rows} initialSort={{ key: 'hours', dir: -1 }} columns={[
        { key: 'u', label: 'חבר/ת צוות', sortValue: (r: any) => r.u.name, render: (r: any) => <span className="row g8"><Avatar user={r.u} size="sm" /><button type="button" className="linkish" onClick={() => nav(`/team/${r.u.id}`)}>{r.u.name}</button></span> },
        { key: 'week', label: 'השבוע', num: true, render: (r: any) => num(r.week) },
        { key: 'hours', label: '30 יום', num: true, render: (r: any) => num(r.hours) },
        { key: 'projects', label: 'פרויקטים', num: true },
        { key: 'cost', label: 'עלות', num: true, render: (r: any) => (rateOf(db, r.u.id) ? ils(r.cost) : <span className="xs muted">אין תעריף</span>) },
      ]} />
    </Card>
  );
}

function ProfitTable() {
  const { db, me, nav } = useStore();
  const rows = visibleProjects(db, me).filter((p) => p.status !== 'ליד חדש').map((p) => ({ id: p.id, ...projectProfit(db, p.id) })).filter((r) => r.hours > 0 || r.feeTotal > 0);
  const tot = rows.reduce((a, r) => ({ fee: a.fee + r.feeTotal, cost: a.cost + r.cost, hours: a.hours + r.hours }), { fee: 0, cost: 0, hours: 0 });
  return (
    <div className="stack-lg">
      <div className="grid-4">
        <Stat label="שכר טרחה בפרויקטים" value={ils(tot.fee)} />
        <Stat label="עלות שעות עד היום" value={ils(tot.cost)} />
        <Stat label="שעות שנרשמו" value={num(tot.hours)} />
        <Stat label="הכנסה ממוצעת לשעה" value={tot.hours ? ils(tot.fee / tot.hours) : '—'} meta="שכר טרחה ÷ שעות" />
      </div>
      <Card pad={false} title="רווחיות לפי פרויקט" actions={<AssumeTag>לפי תעריפי עלות</AssumeTag>}>
        <DataTable rows={rows} onRow={(r: any) => nav(`/projects/${r.id}/phases`)} initialSort={{ key: 'margin', dir: 1 }} columns={[
          { key: 'name', label: 'פרויקט', sortValue: (r: any) => r.project.name, render: (r: any) => <b>{r.project.name}</b> },
          { key: 'feeTotal', label: 'שכר טרחה', num: true, render: (r: any) => ils(r.feeTotal) },
          { key: 'hours', label: 'שעות', num: true, render: (r: any) => <span>{num(r.hours)}{r.budgetHours ? <span className="xs muted"> / {num(r.budgetHours)}</span> : null}</span> },
          { key: 'cost', label: 'עלות', num: true, render: (r: any) => ils(r.cost) },
          { key: 'profit', label: 'רווח צפוי', num: true, render: (r: any) => <b className={cx(r.profit < 0 ? 'bad-t' : '')}>{ils(r.profit)}</b> },
          { key: 'margin', label: 'שולי רווח', num: true, sortValue: (r: any) => (r.feeTotal ? r.profit / r.feeTotal : 0), render: (r: any) => (r.feeTotal ? <span className={cx('badge', r.profit < 0 ? 'bad' : r.profit / r.feeTotal < 0.25 ? 'warn' : 'ok')}>{Math.round((r.profit / r.feeTotal) * 100)}%</span> : '—') },
          { key: 'effRate', label: 'לשעה', num: true, render: (r: any) => (r.hours ? ils(r.effRate) : '—') },
        ]} />
      </Card>
      <span className="xs muted">רווח צפוי = שכר הטרחה המלא בהסכם פחות עלות השעות שנרשמו עד היום. ככל שהפרויקט מתקדם ונרשמות שעות, הרווח הצפוי יורד.</span>
    </div>
  );
}

function Rates() {
  const { db, run, toast } = useStore();
  const staff = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status === 'פעיל');
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(staff.map((u) => [u.id, rateOf(db, u.id) ? String(rateOf(db, u.id)) : ''])));
  const dirty = staff.filter((u) => (vals[u.id] || '') !== (rateOf(db, u.id) ? String(rateOf(db, u.id)) : ''));
  return (
    <Card title="תעריף עלות לשעה" foot={<Btn kind="primary" icon={LuSave} disabled={!dirty.length} onClick={() => { dirty.forEach((u) => run(A.setRate, u.id, vals[u.id] === '' ? null : Math.max(0, Number(vals[u.id])))); toast('התעריפים נשמרו'); }}>שמירה{dirty.length ? ` (${dirty.length})` : ''}</Btn>}>
      <div className="stack">
        <Callout kind="info">העלות לשעה של כל אחד במשרד: שכר ועלויות מעסיק, או תעריף פנימי שתבחרו. משמש לחישוב רווחיות בלבד, ורק בעלים ומנהלים רואים אותו.</Callout>
        <div className="rates-grid">
          {staff.map((u) => (
            <div key={u.id} className="row between g12">
              <span className="row g8"><Avatar user={u} size="sm" /><span><b>{u.name}</b><div className="xs muted">{u.title}</div></span></span>
              <span className="row g4"><Input id={'rate-' + u.id} aria-label={`תעריף עלות לשעה – ${u.name}`} type="number" min={0} step={5} className="sm" style={{ width: 110 }} value={vals[u.id] || ''} placeholder="—" onChange={(e: any) => setVals({ ...vals, [u.id]: e.target.value })} /><span className="small muted">₪</span></span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function TimeEntryModal({ projectId, phaseIdx, entry, onClose }: { projectId?: string; phaseIdx?: number | null; entry?: T.TimeEntry; onClose: () => void }) {
  const { db, me, run, toast } = useStore();
  const projects = visibleProjects(db, me).filter((p) => p.status !== 'הושלם' || p.id === projectId || p.id === entry?.projectId);
  const [f, setF] = useState({ projectId: entry?.projectId || projectId || '', date: entry?.date || todayISO, hours: entry ? String(entry.hours) : '', phaseIdx: entry ? entry.phaseIdx : phaseIdx ?? null, note: entry?.note || '' });
  const [err, setErr] = useState<any>({});
  const phases = f.projectId ? phasesOf(db, f.projectId) : [];
  const pick = (pid: string) => setF({ ...f, projectId: pid, phaseIdx: phasesOf(db, pid).find((p) => p.status === 'active')?.idx ?? null });
  const save = () => {
    const e: any = {}; const h = Number(f.hours);
    if (!f.projectId) e.project = 'יש לבחור פרויקט';
    if (!(h > 0) || h > 24) e.hours = 'בין 0.25 ל-24 שעות';
    if (!f.date || f.date > todayISO) e.date = 'תאריך לא יכול להיות עתידי';
    setErr(e); if (Object.keys(e).length) return;
    const row: T.TimeEntry = { id: entry?.id || uid('te'), projectId: f.projectId, userId: entry?.userId || me.id, date: f.date, hours: Math.round(h * 4) / 4, phaseIdx: f.phaseIdx, note: f.note.trim() };
    run(A.saveTimeEntry, row, !entry);
    toast(entry ? 'הרישום עודכן' : `נרשמו ${num(row.hours)} שעות`); onClose();
  };
  return (
    <Modal title={entry ? 'עריכת רישום שעות' : 'רישום שעות'} size="narrow" onClose={onClose} foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="form-grid">
        <Field label="פרויקט *" full error={err.project} htmlFor="te-p"><Select id="te-p" value={f.projectId} invalid={err.project} placeholder="בחירה…" onChange={(e: any) => pick(e.target.value)} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></Field>
        <Field label="תאריך *" error={err.date} htmlFor="te-d"><Input id="te-d" type="date" max={todayISO} value={f.date} invalid={err.date} onChange={(e: any) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="שעות *" error={err.hours} htmlFor="te-h"><Input id="te-h" type="number" inputMode="decimal" min={0.25} max={24} step={0.25} value={f.hours} invalid={err.hours} onChange={(e: any) => setF({ ...f, hours: e.target.value })} placeholder="2.5" /></Field>
        {phases.length ? <Field label="שלב" full htmlFor="te-ph"><Select id="te-ph" value={f.phaseIdx == null ? '' : String(f.phaseIdx)} placeholder="ללא שלב" onChange={(e: any) => setF({ ...f, phaseIdx: e.target.value === '' ? null : Number(e.target.value) })} options={phases.map((p) => ({ value: String(p.idx), label: `${p.idx + 1}. ${p.name}` }))} /></Field> : null}
        <Field label="מה עשית" full htmlFor="te-n"><Textarea id="te-n" rows={2} value={f.note} maxLength={500} onChange={(e: any) => setF({ ...f, note: e.target.value })} placeholder="לדוגמה: תכנית חשמל, פגישה עם הלקוח" /></Field>
      </div>
      {entry && entry.userId !== me.id ? <div className="xs muted mt8">רישום של {userName(db, entry.userId)}</div> : null}
    </Modal>
  );
}
