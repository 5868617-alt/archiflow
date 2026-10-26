import { AccessibilityMenu } from './A11y';
import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuHouse, LuPencilRuler, LuFileText, LuBadgeCheck, LuCalendarDays, LuMessageCircle, LuHistory, LuShieldCheck, LuGauge, LuBuilding2, LuUsers, LuCreditCard, LuTag, LuScrollText, LuChartBar, LuTicket, LuMegaphone, LuActivity, LuDatabase, LuSettings, LuMenu, LuBell, LuArrowRight } from 'react-icons/lu';
import { useStore } from '../data/store';
import { clientVisible, clientOf } from '../data/api';
import { cx, IconBtn } from '../ui/core';
import { Logo } from '../ui/charts';
import { DemoStrip, NotificationBell, RoleSwitcher, ThemeToggle, Toasts } from './common';
import { parseRoute } from '../lib/route';

export function PortalShell({ children }: any) {
  const { db, me, path, nav, live } = useStore();
  const { segs } = parseRoute(path);
  const sub = segs[1] || '';
  const vis = clientVisible(db, me);
  const pending = vis.approvals.filter((a) => a.status === 'ממתין').length;
  const client = clientOf(db, me.clientId);
  const tabs = [
    { id: '', label: 'בית', icon: LuHouse },
    { id: 'approvals', label: 'לאישורי', icon: LuBadgeCheck, count: pending },
    { id: 'drawings', label: 'שרטוטים', icon: LuPencilRuler },
    { id: 'documents', label: 'מסמכים', icon: LuFileText },
    { id: 'meetings', label: 'פגישות', icon: LuCalendarDays },
    { id: 'messages', label: 'שיחה עם המשרד', icon: LuMessageCircle },
    { id: 'history', label: 'היסטוריית החלטות', icon: LuHistory },
  ];
  return (
    <div className="portal">
      <DemoStrip />
      <header className="portal-top">
        <div className="portal-top-inner">
          <div className="portal-brand">
            <span className="portal-logo" aria-hidden>{db.office.logoText}</span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="bold ellipsis">{db.office.name}</div>
              <div className="xs muted">פורטל לקוחות · {client?.name}</div>
            </div>
            <AccessibilityMenu />
            <ThemeToggle />
            <NotificationBell centerPath="/portal/notifications" />
            <RoleSwitcher compact />
          </div>
          <nav className="portal-nav" aria-label="ניווט פורטל">
            {tabs.map((t) => (
              <button key={t.id} type="button" className={cx(sub === t.id && 'active')} onClick={() => nav('/portal' + (t.id ? '/' + t.id : ''))} aria-current={sub === t.id ? 'page' : undefined}>
                <t.icon aria-hidden />{t.label}{t.count ? <span className="badge warn" style={{ height: 18 }}>{t.count}</span> : null}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="portal-main" id="main">{children}</main>
      <footer className="portal-main" style={{ paddingTop: 0 }}>
        <div className="privacy-note"><LuShieldCheck aria-hidden /><span>{IS_LIVE ? 'בפורטל מוצגים רק פריטים שהמשרד סימן כמשותפים איתך. ההגבלה נאכפת בשרת.' : 'בפורטל מוצגים רק פריטים שהמשרד סימן כמשותפים איתך. בדמו ההגבלה מדומה בצד הדפדפן; בגרסת הייצור היא תיאכף בשרת (Row Level Security).'} <span className="muted">· Powered by ArchiFlow</span></span></div>
      </footer>
      <Toasts />
    </div>
  );
}

export function AdminShell({ children }: any) {
  const { path, nav, live } = useStore();
  const [open, setOpen] = useState(false);
  const base = '/' + parseRoute(path).segs.slice(0, 2).join('/');
  const groups = [
    { title: 'פלטפורמה', items: [
      { to: '/admin', label: 'סקירה כללית', icon: LuGauge },
      { to: '/admin/usage', label: 'מדדי שימוש', icon: LuChartBar },
      { to: '/admin/offices', label: 'משרדים', icon: LuBuilding2 },
      { to: '/admin/users', label: 'משתמשים', icon: LuUsers },
    ] },
    { title: 'הכנסות', items: [
      { to: '/admin/subscriptions', label: 'מנויים', icon: LuCreditCard },
      { to: '/admin/pricing', label: 'מסלולים ותמחור', icon: LuTag },
      { to: '/admin/pricing-log', label: 'יומן שינויי מחיר', icon: LuHistory },
    ] },
    { title: 'תמיכה ותפעול', items: [
      { to: '/admin/tickets', label: 'פניות תמיכה', icon: LuTicket },
      { to: '/admin/announcements', label: 'הודעות מערכת', icon: LuMegaphone },
      { to: '/admin/events', label: 'אירועי מערכת', icon: LuActivity },
      { to: '/admin/audit', label: 'יומן ביקורת', icon: LuScrollText },
      { to: '/admin/retention', label: 'מדיניות שמירת מידע', icon: LuDatabase },
      { to: '/admin/settings', label: 'הגדרות פלטפורמה', icon: LuSettings },
    ] },
  ];
  const go = (to: string) => { nav(to); setOpen(false); };
  return (
    <div className="shell admin">
      <aside className={cx('sidebar', open && 'open')} aria-label="ניווט קונסולה">
        <div className="sb-brand"><Logo /><span className="sb-name">Archi<span>Flow</span></span></div>
        <div style={{ padding: '0 18px 12px' }}><span className="admin-badge">SUPER ADMIN</span></div>
        <nav className="sb-nav">
          {groups.map((g) => (
            <div className="sb-group" key={g.title}>
              <div className="sb-group-title">{g.title}</div>
              {g.items.map((it) => (
                <button key={it.to} type="button" className={cx('sb-item', base === it.to && 'active')} onClick={() => go(it.to)}><it.icon aria-hidden /><span className="grow" style={{ textAlign: 'right' }}>{it.label}</span></button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-foot">{IS_LIVE ? 'קונסולת בעל הפלטפורמה' : 'קונסולת בעל הפלטפורמה · הדמיה'}</div>
      </aside>
      {open ? <div className="sb-scrim" onClick={() => setOpen(false)} /> : null}
      <div className="main">
        <div className="admin-strip"><LuShieldCheck aria-hidden style={{ width: 14, height: 14 }} /><span>{IS_LIVE ? 'מצב Super Admin – גישה למטא-דאטה של כל המשרדים, ללא תוכן פרויקטים. שינויים נרשמים ביומן הביקורת.' : 'מצב Super Admin – גישה לנתוני כל המשרדים. כל פעולה נרשמת ביומן הביקורת (בדמו: מדומה).'}</span></div>
        <header className="topbar">
          <IconBtn icon={LuMenu} label="תפריט" className="mobile-menu-btn" onClick={() => setOpen(true)} />
          <div className="bold">קונסולת ניהול פלטפורמה</div>
          <div className="tb-actions"><AccessibilityMenu /><ThemeToggle /><RoleSwitcher /></div>
        </header>
        <main className="content" id="main">{children}</main>
      </div>
      <Toasts />
    </div>
  );
}

export function PublicShell({ children, plain }: any) {
  const { nav, live } = useStore();
  return (
    <div className="public">
      <DemoStrip />
      {!plain ? (
        <header className="public-top">
          <button type="button" className="brand" onClick={() => nav('/pricing')} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink)' }}><span style={{ color: 'var(--ink)' }}><Logo /></span><span className="ltr">Archi<span>Flow</span></span></button>
          <div className="grow" />
          <button type="button" className="btn ghost" onClick={() => nav('/pricing')}>תמחור</button>
          <button type="button" className="btn ghost" onClick={() => nav('/help')}>מרכז עזרה</button>
          <button type="button" className="btn" onClick={() => nav('/login')}>כניסה</button>
          <button type="button" className="btn primary hide-sm" onClick={() => nav('/register')}>התחלת ניסיון</button>
        </header>
      ) : null}
      <main id="main">{children}</main>
      <AccessibilityMenu floating />
      <Toasts />
    </div>
  );
}
export { LuArrowRight, LuBell };
