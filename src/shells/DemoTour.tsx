// A short first-visit tour of the demo: one card, one highlighted part of the screen at a time.
// Shown once per kind of user (office team / client), can be replayed from the demo bar, and never in the live site.
// Remembering "already seen" is a per-browser convenience, so it lives in localStorage (wrapped in try/catch).
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { Btn } from '../ui/core';

type Step = { sel: string[]; title: string; text: string };
const STAFF: Step[] = [
  { sel: ['main.content .hero', 'main.content'], title: 'היום שלי', text: 'המסך שנפתח כל בוקר: מה הכי דחוף עכשיו, המשימות והפגישות של היום, ומה מחכה לאישור הלקוח.' },
  { sel: ['.sb-nav', '.tabbar'], title: 'כל חלקי המשרד', text: 'פרויקטים, לקוחות, משימות, שרטוטים, מפרטים, רכש וכספים. נסו לפתוח פרויקט – כל המידע עליו מרוכז בעמוד אחד.' },
  { sel: ['.tb-actions .btn.primary', '.tabbar .tb-new'], title: 'יצירה מהירה', text: 'פרויקט, משימה, פגישה או לקוח חדש – מכל מסך, בלחיצה אחת.' },
  { sel: ['.search-trigger'], title: 'חיפוש', text: 'מוצאים כל פרויקט, לקוח או מסך במהירות. במחשב אפשר גם בקיצור Ctrl+K.' },
  { sel: ['.role-pill'], title: 'להחליף תפקיד', text: 'כאן רואים את המערכת כמו שהלקוחה או מעצבת בצוות רואות אותה. בפס הצהוב למעלה אפשר להתחיל את ההדגמה מחדש.' },
];
const CLIENT: Step[] = [
  { sel: ['.portal-hero'], title: 'הפרויקט של הלקוחה', text: 'ככה הלקוחות שלך רואים את הפרויקט: באיזה שלב הוא, מה כבר הושלם ומתי המסירה.' },
  { sel: ['.portal-nav'], title: 'מה הלקוחה רואה', text: 'אישורים שמחכים לה, שאלון פתיחה, לוח השראה, דו״חות פיקוח ומסמכים – רק מה שהמשרד בחר לשתף.' },
  { sel: ['.role-pill'], title: 'חזרה למשרד', text: 'כאן מחליפים חזרה לתפקיד של המשרד, למשל לבעלת המשרד.' },
];

const KEY = 'archiflow.demo.tour';
const seen = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const markSeen = (g: string) => { try { localStorage.setItem(KEY, JSON.stringify({ ...seen(), [g]: true })); } catch { /* private mode: the tour simply shows again */ } };
// shown on screen right now (the phone menu drawer exists but sits off-screen until opened)
const visible = (el: Element | null): el is HTMLElement => {
  if (!el || getComputedStyle(el).visibility === 'hidden') return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};
/** replay from anywhere: window.dispatchEvent(new Event('archiflow:tour')) */
export const startTour = () => { try { localStorage.setItem(KEY, '{}'); } catch { /* ignore */ } window.dispatchEvent(new Event('archiflow:tour')); };

export function DemoTour() {
  const { me, live, path, nav } = useStore();
  const group = me.role === 'client' ? 'client' : me.role === 'super_admin' ? '' : 'staff';
  const all = group === 'client' ? CLIENT : STAFF;
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [steps, setSteps] = useState<{ step: Step; el: HTMLElement }[]>([]);
  const head = useRef<HTMLHeadingElement>(null);

  // first visit (per kind of user), or a replay request
  useEffect(() => {
    if (live || !group) return;
    const begin = () => { setI(0); setOpen(true); if (group === 'staff' && !path.startsWith('/dashboard')) nav('/dashboard'); };
    const t = seen()[group] ? undefined : setTimeout(begin, 600);
    window.addEventListener('archiflow:tour', begin);
    return () => { if (t) clearTimeout(t); window.removeEventListener('archiflow:tour', begin); };
  }, [group, live]); // eslint-disable-line

  // find the parts of the screen that are actually shown (desktop and phone differ)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setSteps(all.map((step) => ({ step, el: step.sel.map((s) => document.querySelector(s)).find(visible) as HTMLElement })).filter((x) => x.el));
    }, 150);
    return () => clearTimeout(t);
  }, [open, path, group]); // eslint-disable-line

  const cur = steps[i];
  useEffect(() => {
    if (!open || !cur) return;
    cur.el.classList.add('tour-target');
    cur.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    head.current?.focus();
    return () => cur.el.classList.remove('tour-target');
  }, [open, cur]);

  const close = () => { setOpen(false); markSeen(group); };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line

  if (!open || !cur) return null;
  const last = i === steps.length - 1;
  return (
    <div className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-h" aria-describedby="tour-p">
      <span className="tour-step">היכרות קצרה · {i + 1} מתוך {steps.length}</span>
      <h2 id="tour-h" ref={head} tabIndex={-1}>{cur.step.title}</h2>
      <p id="tour-p">{cur.step.text}</p>
      <div className="tour-foot">
        <span className="tour-dots" aria-hidden>{steps.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</span>
        <span className="grow" />
        {i > 0 ? <Btn kind="ghost" onClick={() => setI(i - 1)}>הקודם</Btn> : <Btn kind="ghost" onClick={close}>דלגו</Btn>}
        <Btn kind="primary" onClick={() => (last ? close() : setI(i + 1))}>{last ? 'סיום' : 'הבא'}</Btn>
      </div>
    </div>
  );
}
