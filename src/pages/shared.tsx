import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuLock, LuArrowUpRight, LuCalendarClock, LuMessageSquare } from 'react-icons/lu';
import { useStore } from '../data/store';
import { userName, projectOf, currentPlan, isOverdue, A, canChangeProjectStatus } from '../data/api';
import { PROJECT_STATUSES } from '../data/types';
import type * as T from '../data/types';
import { Avatar, Btn, StatusBadge, Badge, cx, Modal, Field, Textarea, Callout, Check } from '../ui/core';
import { PlanSvg } from '../ui/PlanSvg';
import { relDay, ago } from '../lib/format';
import { daysFromToday } from '../data/dates';

const FEATURE_LABEL: Record<string, string> = { procurement: 'ספקים והזמנות רכש', fees: 'מעקב שכר טרחה', client_portal: 'פורטל לקוח והודעות', plans_compare: 'השוואת גרסאות שרטוט', advanced_reports: 'דוחות מתקדמים', calendar_sync: 'סנכרון יומן', custom_roles: 'הרשאות מותאמות' };
export function LockedFeature({ feature, inline }: { feature: string; inline?: boolean }) {
  const { db, me, nav, live } = useStore();
  const plan = currentPlan(db);
  const canBill = me.role === 'owner' || me.role === 'admin';
  const body = (
    <div className="lock-panel">
      <div className="lp-ic"><LuLock aria-hidden /></div>
      <div className="lg bold">{FEATURE_LABEL[feature] || feature} לא כלול במסלול {plan.name}</div>
      <div className="soft small" style={{ maxWidth: 440 }}>{IS_LIVE ? 'היכולת הזו לא כלולה במסלול הנוכחי של המשרד.' : 'זו הדגמה של הגבלת מסלול. חלוקת היכולות בין המסלולים היא הנחת דמו שניתן לשנות במסך התמחור של ה-Super Admin.'}</div>
      {canBill ? <Btn kind="primary" onClick={() => nav('/billing/change?plan=pro')}>{IS_LIVE ? 'שדרוג ל-Pro' : 'שדרוג ל-Pro (הדמיה)'}</Btn> : <span className="small muted">פנו לבעלי המשרד לשדרוג.</span>}
    </div>
  );
  if (inline) return body;
  return <div style={{ maxWidth: 640, margin: '40px auto' }}>{body}</div>;
}

export const COVER_LAYOUT: Record<string, T.PlanLayout> = { apartment: 'apartment', villa: 'villa-ground', cafe: 'cafe', office: 'office', kitchen: 'existing', garden: 'apartment-ceiling', hotel: 'cafe', house: 'villa-first' };
export function ProjectCover({ project, height = 120 }: { project: T.Project; height?: number }) {
  return (
    <div style={{ height, overflow: 'hidden', borderBottom: '1px solid var(--line)', position: 'relative', background: 'var(--plan-paper)', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }}>
      <div style={{ position: 'absolute', inset: '-20% -6% auto -6%', opacity: 0.9 }}><PlanSvg layout={COVER_LAYOUT[project.cover] || 'apartment'} /></div>
      <span className="code" style={{ position: 'absolute', top: 10, insetInlineStart: 10, background: 'var(--surface)' }}>{project.code}</span>
    </div>
  );
}

export function PersonCell({ id, sub }: { id?: string; sub?: string }) {
  const { db, live } = useStore();
  const u = db.users.find((x) => x.id === id);
  if (!u) return <span className="muted">—</span>;
  return <span className="row g8" style={{ minWidth: 0 }}><Avatar user={u} size="sm" /><span className="col" style={{ gap: 0, minWidth: 0 }}><span className="ellipsis">{u.name}</span>{sub ? <span className="xs muted">{sub}</span> : null}</span></span>;
}
export function ProjectLink({ id }: { id: string | null }) {
  const { db, nav, live } = useStore();
  if (!id) return <span className="muted small">כללי – משרד</span>;
  const p = projectOf(db, id);
  if (!p) return <span className="muted">—</span>;
  return <button type="button" className="linkish ellipsis" style={{ maxWidth: 220, display: 'inline-block', textAlign: 'right' }} onClick={(e) => { e.stopPropagation(); nav(`/projects/${p.id}`); }}>{p.name}</button>;
}
export function DueCell({ date, done }: { date: string; done?: boolean }) {
  const n = daysFromToday(date);
  const tone = done ? 'muted' : n < 0 ? 'bad-t bold' : n === 0 ? 'warn-t bold' : '';
  return <span className={cx('nowrap small', tone)}>{n < 0 && !done ? 'באיחור · ' : ''}{relDay(date)}</span>;
}

export function TaskLine({ t, onOpen, showProject = true }: { t: T.Task; onOpen?: (t: T.Task) => void; showProject?: boolean }) {
  const { db, run, toast, live } = useStore();
  const done = t.status === 'הושלם';
  return (
    <div className={cx('li', onOpen && 'click')} onClick={() => onOpen?.(t)}>
      <input type="checkbox" aria-label={`סימון "${t.title}" כהושלם`} checked={done} onClick={(e) => e.stopPropagation()} onChange={() => { run(A.setTaskStatus, t.id, done ? 'לביצוע' : 'הושלם'); toast(done ? 'המשימה נפתחה מחדש' : 'המשימה סומנה כהושלמה'); }} style={{ width: 17, height: 17, accentColor: 'var(--ok)' }} />
      <div className="li-main">
        <div className="li-title" style={{ textDecoration: done ? 'line-through' : undefined, color: done ? 'var(--ink-3)' : undefined }}>{t.title}</div>
        <div className="li-sub">{showProject ? (projectOf(db, t.projectId)?.name || 'משרד') + ' · ' : ''}{userName(db, t.assigneeId)}{t.comments.length ? ` · ${t.comments.length} תגובות` : ''}</div>
      </div>
      {t.priority === 'דחופה' || t.priority === 'גבוהה' ? <StatusBadge s={t.priority} /> : null}
      <DueCell date={t.dueDate} done={done} />
    </div>
  );
}

/** Project status control. Never changes status silently: always asks, with optional note. */
export function ProjectStatusControl({ project }: { project: T.Project }) {
  const { me, run, toast, live } = useStore();
  const [next, setNext] = useState<T.ProjectStatus | null>(null);
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  if (!canChangeProjectStatus(me)) return <StatusBadge s={project.status} />;
  return (
    <>
      <select className="select sm" style={{ width: 'auto', fontWeight: 600 }} value={project.status} onChange={(e) => { setNext(e.target.value as T.ProjectStatus); setNote(''); }} aria-label="סטטוס פרויקט">
        {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {next ? (
        <Modal title="שינוי סטטוס פרויקט" onClose={() => setNext(null)} size="narrow" foot={<><Btn kind="primary" onClick={() => { run(A.setProjectStatus, project.id, next, note); toast(`הסטטוס עודכן ל"${next}"`); setNext(null); }}>עדכון סטטוס</Btn><Btn kind="ghost" onClick={() => setNext(null)}>ביטול</Btn></>}>
          <div className="stack">
            <div className="row g8 wrap"><StatusBadge s={project.status} /><span className="muted">←</span><StatusBadge s={next} /></div>
            <Field label="הערה לשינוי (אופציונלי)" hint={next === 'בהשהיה' ? 'מומלץ לציין סיבה ותאריך חזרה צפוי' : 'תופיע ביומן הפעילות של הפרויקט'}><Textarea id="status-note" value={note} onChange={(e: any) => setNote(e.target.value)} rows={2} /></Field>
            <Check id="status-notify" checked={notify} onChange={setNotify} label="להודיע לצוות הפרויקט (התראה פנימית)" />
            {next === 'הושלם' ? <Callout kind="info">סימון כ"הושלם" יעדכן את ההתקדמות ל-100%. פריטים פתוחים יישארו פתוחים.</Callout> : null}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

export function ActivityFeed({ items, max = 8 }: { items: T.Activity[]; max?: number }) {
  const { db, nav, live } = useStore();
  if (!items.length) return <div className="small muted">אין פעילות עדיין.</div>;
  return (
    <div className="list">
      {items.slice(0, max).map((a) => {
        const u = db.users.find((x) => x.id === a.userId);
        return (
          <div key={a.id} className={cx('li', a.link && 'click')} style={{ padding: '9px 0' }} onClick={() => a.link && nav(a.link)}>
            <Avatar user={u} size="sm" />
            <div className="li-main"><div className="small" style={{ whiteSpace: 'normal' }}><b>{u?.name}</b> {a.text}</div><div className="xs muted">{ago(a.at)}{a.projectId ? ' · ' + (projectOf(db, a.projectId)?.name || '') : ''}</div></div>
            {a.link ? <LuArrowUpRight aria-hidden style={{ width: 14, height: 14, color: 'var(--ink-3)' }} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function MeetingLine({ m }: { m: T.Meeting }) {
  const { db, nav, live } = useStore();
  const kindLabel = { client: 'לקוח', site: 'סיור באתר', team: 'צוות', supplier: 'ספק' }[m.kind];
  return (
    <div className="li click" onClick={() => nav(`/meetings/${m.id}`)}>
      <div className="col t-center" style={{ gap: 0, width: 46, flex: '0 0 46px' }}><span className="bold num">{m.start}</span><span className="xs muted num">{m.end}</span></div>
      <div className="li-main"><div className="li-title">{m.title}</div><div className="li-sub">{relDay(m.date)} · {m.location}{m.projectId ? ' · ' + projectOf(db, m.projectId)?.name : ''}</div></div>
      <Badge tone={m.kind === 'site' ? 'warn' : m.kind === 'client' ? 'info' : m.kind === 'supplier' ? 'violet' : ''}>{kindLabel}</Badge>
    </div>
  );
}

export function CommentThread({ comments, onAdd, placeholder = 'הוספת תגובה…' }: { comments: { id: string; authorId: string; text: string; at: string }[]; onAdd: (text: string) => void; placeholder?: string }) {
  const { db, me, live } = useStore();
  const [text, setText] = useState('');
  return (
    <div className="stack">
      {comments.length === 0 ? <div className="small muted row g8"><LuMessageSquare aria-hidden /> אין תגובות עדיין.</div> : null}
      {comments.map((c) => {
        const u = db.users.find((x) => x.id === c.authorId);
        return (
          <div key={c.id} className={cx('comment', c.authorId === me.id && 'mine', u?.role === 'client' && 'client')}>
            <Avatar user={u} size="sm" />
            <div className="c-bubble"><div className="row between g8"><b className="small">{u?.name}</b><span className="xs muted">{ago(c.at)}</span></div><div className="small" style={{ whiteSpace: 'pre-wrap' }}>{c.text}</div></div>
          </div>
        );
      })}
      <form className="row g8" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onAdd(text.trim()); setText(''); }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        <Btn kind="navy" type="submit" disabled={!text.trim()}>שליחה</Btn>
      </form>
    </div>
  );
}

export function DeadlineChip({ date }: { date: string }) {
  const n = daysFromToday(date);
  return <span className={cx('badge', n < 0 ? 'bad' : n <= 3 ? 'warn' : '')}><LuCalendarClock aria-hidden />{relDay(date)}</span>;
}

export const lateCount = (db: any, pid: string) => db.tasks.filter((t: T.Task) => t.projectId === pid && isOverdue(t)).length;
