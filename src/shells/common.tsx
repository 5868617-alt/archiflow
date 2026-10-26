import { useMemo, useRef, useState, useEffect } from 'react';
import { LuSearch, LuBell, LuSun, LuMoon, LuMonitor, LuLogOut, LuRotateCcw, LuFolderKanban, LuUsers, LuListChecks, LuPencilRuler, LuFileText, LuTruck, LuCircleCheck, LuCircleAlert, LuInfo, LuChevronDown, LuCrown, LuUserCog, LuBriefcase, LuHouse } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, inScope, ROLE_SHORT } from '../data/api';
import { Avatar, IconBtn, Menu, MenuItem, cx, useOutside } from '../ui/core';
import { ago } from '../lib/format';

export const PERSONAS = [
  { id: 'u_michal', note: 'רואה הכול כולל חיוב' },
  { id: 'u_yoav', note: 'ניהול מלא, ללא ניהול חיוב' },
  { id: 'u_shira', note: 'רק פרויקטים משויכים, ללא כספים' },
  { id: 'cu_dana', note: 'פורטל לקוח – פנטהאוז' },
  { id: 'cu_yael', note: 'פורטל לקוח – משרדים' },
  { id: 'sa_ron', note: 'קונסולת פלטפורמה' },
];

function AccountMenu({ compact }: any) {
  const { me, nav, live } = useStore();
  const lv = live!;
  return (
    <Menu align="" trigger={(toggle: any, open: boolean) => (
      <button type="button" className="role-pill" onClick={toggle} aria-expanded={open} aria-haspopup="menu" title="החשבון שלי">
        <span className="rp-text"><span className="rp-name">{me.name}</span><span className="rp-role">{ROLE_SHORT[me.role]}{lv.current?.officeName && me.role !== 'super_admin' ? ' · ' + lv.current.officeName : ''}</span></span>
        <Avatar user={me} />
        {!compact ? <LuChevronDown aria-hidden style={{ width: 14, height: 14, color: 'var(--ink-3)' }} /> : null}
      </button>
    )}>
      <div className="menu-label ltr" style={{ textAlign: 'right' }}>{me.email}</div>
      {lv.contexts.length > 1 ? <>
        <div className="menu-label">מעבר בין סביבות</div>
        {lv.contexts.map((c) => {
          const Ic = c.kind === 'admin' ? LuCrown : c.kind === 'client' ? LuHouse : c.role === 'owner' ? LuBriefcase : LuUserCog;
          return <MenuItem key={c.key} icon={Ic} on={lv.current?.key === c.key} onClick={() => lv.switchContext(c.key)}><div className="col" style={{ gap: 0 }}><span className="bold">{c.officeName}</span><span className="xs muted">{ROLE_SHORT[c.role]}</span></div></MenuItem>;
        })}
        <hr className="sep" style={{ margin: '6px 0' }} />
      </> : null}
      {me.role !== 'client' && me.role !== 'super_admin' ? <MenuItem icon={LuUserCog} onClick={() => nav('/profile')}>הפרופיל שלי</MenuItem> : null}
      <MenuItem icon={LuLogOut} onClick={() => lv.signOut()}>התנתקות</MenuItem>
    </Menu>
  );
}

export function RoleSwitcher({ compact }: any) {
  const { db, me, switchUser, nav, live } = useStore();
  if (live) return <AccountMenu compact={compact} />;
  return (
    <Menu align="" trigger={(toggle: any, open: boolean) => (
      <button type="button" className="role-pill" onClick={toggle} aria-expanded={open} aria-haspopup="menu" title="החלפת משתמש/תפקיד (הדמיה)">
        <span className="rp-text"><span className="rp-name">{me.name}</span><span className="rp-role">{ROLE_SHORT[me.role]} · מצב דמו</span></span>
        <Avatar user={me} />
        {!compact ? <LuChevronDown aria-hidden style={{ width: 14, height: 14, color: 'var(--ink-3)' }} /> : null}
      </button>
    )}>
      <div className="menu-label">החלפת תפקיד להדגמה – ללא אבטחה אמיתית</div>
      {PERSONAS.map((p) => {
        const u = db.users.find((x) => x.id === p.id)!;
        const Ic = u.role === 'super_admin' ? LuCrown : u.role === 'client' ? LuHouse : u.role === 'owner' ? LuBriefcase : LuUserCog;
        return (
          <MenuItem key={p.id} icon={Ic} on={me.id === p.id} onClick={() => switchUser(p.id)}>
            <div className="col" style={{ gap: 0 }}><span className="bold">{u.name} · {ROLE_SHORT[u.role]}</span><span className="xs muted">{p.note}</span></div>
          </MenuItem>
        );
      })}
      <hr className="sep" style={{ margin: '6px 0' }} />
      {me.officeId ? <MenuItem icon={LuUserCog} onClick={() => nav('/profile')}>הפרופיל שלי</MenuItem> : null}
      <MenuItem icon={LuLogOut} onClick={() => nav('/login')}>יציאה למסך ההתחברות</MenuItem>
    </Menu>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, live } = useStore();
  const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system';
  const Ic = theme === 'dark' ? LuMoon : theme === 'light' ? LuSun : LuMonitor;
  const label = theme === 'dark' ? 'מצב כהה' : theme === 'light' ? 'מצב בהיר' : 'לפי המערכת';
  return <IconBtn icon={Ic} label={`ערכת צבעים: ${label} (לחיצה להחלפה)`} onClick={() => setTheme(next)} />;
}

export function DemoStrip() {
  const { reset, live } = useStore();
  const [confirm, setConfirm] = useState(false);
  if (live) return live.saving ? <div className="demo-strip" role="status" aria-live="polite"><span className="row g8"><span className="spinner" style={{ width: 12, height: 12 }} />שומר…</span></div> : null;
  return (
    <div className="demo-strip" role="note">
      <span><b>סביבת הדגמה.</b> כל הנתונים בדויים ונשמרים רק בדפדפן הזה. אין התחברות אמיתית, אין חיובים ואין שליחת מיילים.</span>
      {location.protocol === 'https:' ? <a className="demo-strip-cta" href="/#/register">לפתיחת חשבון אמיתי</a> : null}
      {confirm ? (
        <span className="row g8"><span>לאפס את כל השינויים?</span><button type="button" className="linkish" onClick={() => { reset(); setConfirm(false); }}>כן, אפס</button><button type="button" className="linkish" onClick={() => setConfirm(false)}>לא</button></span>
      ) : (
        <button type="button" className="linkish row g4" onClick={() => setConfirm(true)}><LuRotateCcw aria-hidden style={{ width: 12, height: 12 }} />איפוס נתוני הדגמה</button>
      )}
    </div>
  );
}

const NK: any = { approval: LuCircleCheck, task: LuListChecks, meeting: LuUsers, budget: LuCircleAlert, comment: LuInfo, system: LuInfo, plan: LuPencilRuler };
const NT: any = { approval: 'warn', task: 'info', meeting: 'info', budget: 'bad', comment: 'violet', system: '', plan: 'accent' };
export function NotificationBell({ centerPath = '/notifications' }: any) {
  const { db, me, run, nav, live } = useStore();
  const mine = db.notifications.filter((n) => n.userId === me.id);
  const unread = mine.filter((n) => !n.read).length;
  return (
    <Menu trigger={(toggle: any) => <IconBtn icon={LuBell} label={`התראות${unread ? ` (${unread} חדשות)` : ''}`} badge={unread} onClick={toggle} />}>
      <div style={{ width: 'min(360px, 86vw)' }}>
        <div className="row between" style={{ padding: '6px 10px' }}>
          <b>התראות</b>
          {unread ? <button type="button" className="linkish small" onClick={(e) => { e.stopPropagation(); run((d: any, c: any) => { d.notifications.forEach((n: any) => { if (n.userId === c.me.id) n.read = true; }); }); }}>סימון הכול כנקרא</button> : null}
        </div>
        {mine.length === 0 ? <div className="small muted" style={{ padding: 12 }}>אין התראות</div> : mine.slice(0, 6).map((n) => {
          const Ic = NK[n.kind] || LuInfo;
          return (
            <button key={n.id} type="button" className="menu-item" onClick={() => { run((d: any) => { const x = d.notifications.find((y: any) => y.id === n.id); if (x) x.read = true; }); nav(n.link); }}>
              <span className={cx('li-ic', NT[n.kind])} style={{ width: 28, height: 28, flex: '0 0 28px' }}><Ic aria-hidden /></span>
              <span className="grow" style={{ minWidth: 0 }}>
                <span className="row g4"><span className={cx('small ellipsis', !n.read && 'bold')}>{n.title}</span></span>
                <span className="xs muted ellipsis" style={{ display: 'block' }}>{n.body}</span>
              </span>
              <span className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                <span className="xs muted nowrap">{ago(n.at)}</span>
                {!n.read ? <span className="notif-dot" /> : null}
              </span>
            </button>
          );
        })}
        <hr className="sep" style={{ margin: '6px 0' }} />
        <button type="button" className="menu-item" onClick={() => nav(centerPath)}><span className="grow t-center small bold">למרכז ההתראות</span></button>
      </div>
    </Menu>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore() as any;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t: any) => (
        <div key={t.id} className={cx('toast', t.kind)}>
          {t.kind === 'bad' ? <LuCircleAlert aria-hidden /> : t.kind === 'info' ? <LuInfo aria-hidden /> : <LuCircleCheck aria-hidden />}
          <span className="grow">{t.text}</span>
          {t.undo ? <button type="button" className="toast-undo" onClick={() => { t.undo(); dismissToast?.(t.id); }}><LuRotateCcw aria-hidden />ביטול</button> : null}
        </div>
      ))}
    </div>
  );
}
