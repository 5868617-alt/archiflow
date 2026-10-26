import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuLayoutDashboard, LuFolderKanban, LuUsers, LuListChecks, LuCalendarDays, LuPencilRuler, LuLayers, LuFileText, LuBadgeCheck, LuTruck, LuShoppingCart, LuWallet, LuCoins, LuUserCog, LuMessagesSquare, LuBell, LuSettings, LuCreditCard, LuLifeBuoy, LuMenu, LuLock, LuPlus, LuCalendarPlus, LuReceipt, LuUpload } from 'react-icons/lu';
import { useStore } from '../data/store';
import { canSeeFinance, canManageTeam, hasFeature, isOverdue, visibleProjectIds, currentPlan } from '../data/api';
import { todayISO } from '../data/dates';
import { Btn, Menu, MenuItem, cx, IconBtn } from '../ui/core';
import { Logo } from '../ui/charts';
import { DemoStrip, NotificationBell, RoleSwitcher, ThemeToggle, Toasts } from './common';
import { CommandPalette, SearchTrigger, ShortcutsHelp, useCommandPalette } from './Palette';
import { parseRoute } from '../lib/route';
import { SubBanner } from '../pages/Billing';

export function useNavModel() {
  const { db, me, live } = useStore();
  const pids = visibleProjectIds(db, me);
  const fin = canSeeFinance(db, me);
  const myLate = db.tasks.filter((t) => t.assigneeId === me.id && isOverdue(t)).length;
  const pendingAp = db.approvals.filter((a) => pids.has(a.projectId) && a.status === 'ממתין').length;
  const unreadMsgs = db.messages.filter((m) => pids.has(m.projectId) && m.side === 'client' && m.at >= todayISO.slice(0, 8)).length;
  const unread = db.notifications.filter((n) => n.userId === me.id && !n.read).length;
  const groups = [
    { title: 'עבודה יומית', items: [
      { to: '/dashboard', label: 'היום שלי', icon: LuLayoutDashboard },
      { to: '/projects', label: 'פרויקטים', icon: LuFolderKanban, count: pids.size },
      { to: '/clients', label: 'לקוחות', icon: LuUsers },
      { to: '/tasks', label: 'משימות', icon: LuListChecks, count: myLate || undefined, hot: myLate > 0 },
      { to: '/calendar', label: 'יומן ופגישות', icon: LuCalendarDays },
    ] },
    { title: 'תכנון', items: [
      { to: '/plans', label: 'שרטוטים ותכניות', icon: LuPencilRuler },
      { to: '/specs', label: 'מפרטים', icon: LuLayers },
      { to: '/documents', label: 'מסמכים', icon: LuFileText },
      { to: '/approvals', label: 'אישורי לקוח', icon: LuBadgeCheck, count: pendingAp || undefined, hot: pendingAp > 0 },
    ] },
    { title: 'רכש וכספים', items: [
      { to: '/suppliers', label: 'ספקים וקבלנים', icon: LuTruck, lock: !hasFeature(db, 'procurement') },
      { to: '/procurement', label: 'הזמנות רכש', icon: LuShoppingCart, lock: !hasFeature(db, 'procurement') },
      ...(fin ? [
        { to: '/budget', label: 'תקציב ביצוע', icon: LuWallet },
        { to: '/expenses', label: 'הוצאות', icon: LuReceipt },
        { to: '/fees', label: 'שכר טרחה', icon: LuCoins, lock: !hasFeature(db, 'fees') },
      ] : []),
    ] },
    { title: 'משרד', items: [
      { to: '/team', label: canManageTeam(me) ? 'צוות והרשאות' : 'צוות', icon: LuUserCog },
      { to: '/messages', label: 'הודעות לקוחות', icon: LuMessagesSquare, lock: !hasFeature(db, 'client_portal'), count: unreadMsgs || undefined },
      { to: '/notifications', label: 'התראות', icon: LuBell, count: unread || undefined },
      { to: '/settings', label: 'הגדרות משרד', icon: LuSettings },
      ...(me.role === 'owner' || me.role === 'admin' ? [{ to: '/billing', label: 'מנוי וחיוב', icon: LuCreditCard }] : []),
      { to: '/help', label: 'עזרה ותמיכה', icon: LuLifeBuoy },
    ] },
  ];
  return groups;
}

export function AppShell({ children }: any) {
  const { db, path, nav, live } = useStore();
  const [open, setOpen] = useState(false);
  const groups = useNavModel();
  const base = parseRoute(path).base;
  const plan = currentPlan(db);
  const sub = db.officeSubscription;
  const go = (to: string) => { nav(to); setOpen(false); };
  const pal = useCommandPalette();
  return (
    <div className="shell">
      <aside className={cx('sidebar', open && 'open')} aria-label="ניווט ראשי">
        <div className="sb-brand"><Logo /><span className="sb-name">Archi<span>Flow</span></span></div>
        <button type="button" className="sb-office clickable" style={{ textAlign: 'right', color: 'inherit', font: 'inherit', display: 'block', width: 'calc(100% - 24px)' }} onClick={() => go('/settings')}>
          <div className="o-name">{db.office.name}</div>
          <div className="o-meta">מסלול {plan.name} · {sub.status}</div>
        </button>
        <nav className="sb-nav">
          {groups.map((g) => (
            <div className="sb-group" key={g.title}>
              <div className="sb-group-title">{g.title}</div>
              {g.items.map((it: any) => (
                <button key={it.to} type="button" className={cx('sb-item', base === it.to && 'active')} onClick={() => go(it.to)} aria-current={base === it.to ? 'page' : undefined}>
                  <it.icon aria-hidden /><span className="grow" style={{ textAlign: 'right' }}>{it.label}</span>
                  {it.lock ? <LuLock className="lock" aria-label="לא כלול במסלול" /> : it.count ? <span className={cx('sb-count', it.hot && 'hot')}>{it.count}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-foot">{IS_LIVE ? 'ArchiFlow · גרסה 1.0' : 'גרסת הדגמה 0.9 · נתונים מדומים'}</div>
      </aside>
      {open ? <div className="sb-scrim" onClick={() => setOpen(false)} /> : null}
      <div className="main">
        <DemoStrip />
        <header className="topbar">
          <IconBtn icon={LuMenu} label="תפריט" className="mobile-menu-btn" onClick={() => setOpen(true)} />
          <SearchTrigger onOpen={() => pal.setOpen(true)} />
          <div className="tb-actions">
            <QuickCreate />
            <ThemeToggle />
            <NotificationBell />
            <RoleSwitcher />
          </div>
        </header>
        <main className="content" id="main"><SubBanner />{children}</main>
      </div>
      <nav className="tabbar" aria-label="ניווט מהיר">
        {[{ to: '/dashboard', label: 'היום', icon: LuLayoutDashboard }, { to: '/projects', label: 'פרויקטים', icon: LuFolderKanban }].map((it) => (
          <button key={it.to} type="button" className={cx('tb-item', base === it.to && 'on')} onClick={() => go(it.to)} aria-current={base === it.to ? 'page' : undefined}><it.icon aria-hidden /><span>{it.label}</span></button>
        ))}
        <button type="button" className="tb-item tb-new" onClick={() => pal.setOpen(true)} aria-label="חיפוש ופעולה חדשה"><span className="tb-plus"><LuPlus aria-hidden /></span></button>
        <button type="button" className={cx('tb-item', base === '/tasks' && 'on')} onClick={() => go('/tasks')} aria-current={base === '/tasks' ? 'page' : undefined}><LuListChecks aria-hidden /><span>משימות</span></button>
        <button type="button" className={cx('tb-item', open && 'on')} onClick={() => setOpen(true)}><LuMenu aria-hidden /><span>עוד</span></button>
      </nav>
      {pal.open ? <CommandPalette onClose={() => pal.setOpen(false)} onHelp={() => pal.setHelp(true)} /> : null}
      {pal.help ? <ShortcutsHelp onClose={() => pal.setHelp(false)} /> : null}
      <Toasts />
    </div>
  );
}

function QuickCreate() {
  const { db, nav, me, live } = useStore();
  const fin = canSeeFinance(db, me);
  return (
    <Menu trigger={(toggle: any) => <Btn kind="primary" icon={LuPlus} onClick={toggle} aria-haspopup="menu"><span className="hide-sm">חדש</span></Btn>}>
      <div className="menu-label">יצירה מהירה</div>
      {me.role !== 'member' ? <MenuItem icon={LuFolderKanban} onClick={() => nav('/projects?new=1')}>פרויקט חדש</MenuItem> : null}
      <MenuItem icon={LuListChecks} onClick={() => nav('/tasks?new=1')}>משימה</MenuItem>
      <MenuItem icon={LuCalendarPlus} onClick={() => nav('/calendar?new=1')}>פגישה</MenuItem>
      <MenuItem icon={LuUpload} onClick={() => nav('/plans?upload=1')}>העלאת שרטוט</MenuItem>
      {hasFeature(db, 'procurement') ? <MenuItem icon={LuShoppingCart} onClick={() => nav('/procurement?new=1')}>הזמנת רכש</MenuItem> : null}
      {fin ? <MenuItem icon={LuReceipt} onClick={() => nav('/expenses?new=1')}>הוצאה</MenuItem> : null}
    </Menu>
  );
}
