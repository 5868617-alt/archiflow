import { LuShieldAlert } from 'react-icons/lu';
import { useStore } from './data/store';
import { parseRoute } from './lib/route';
import { AppShell } from './shells/AppShell';
import { PortalShell, AdminShell, PublicShell } from './shells/OtherShells';
import { Btn, Empty } from './ui/core';
import { defaultPathFor } from './data/store';
import { canSeeFinance, hasFeature } from './data/api';
import { LockedFeature } from './pages/shared';

import { Login, Register, Forgot, Onboarding } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { ProjectsList } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ClientsList, ClientDetail } from './pages/Clients';
import { TasksPage } from './pages/Tasks';
import { PlansLibrary, PlanViewer, PlanCompare } from './pages/Plans';
import { SpecsOverview, ProjectSpecs } from './pages/Specs';
import { DocumentsPage, DocumentDetail } from './pages/Documents';
import { ApprovalsPage } from './pages/Approvals';
import { CalendarPage, MeetingDetail } from './pages/Calendar';
import { SuppliersList, SupplierDetail, POList, PODetail } from './pages/Procurement';
import { BudgetOverview, ExpensesPage, FeesPage } from './pages/Finance';
import { TeamPage, MemberDetail } from './pages/Team';
import { NotificationsPage, MessagesPage } from './pages/Comms';
import { SettingsPage, ProfilePage } from './pages/Settings';
import { BillingPage, InvoiceDetail, PricingPage, ChangePlan, CancelFlow } from './pages/Billing';
import { HelpCenter, HelpArticle, SupportPage, TicketDetail } from './pages/Help';
import { PortalRouter } from './pages/Portal';
import { AdminRouter } from './pages/Admin';
import { AccessibilityStatement } from './pages/AccessibilityStatement';
import { LiveLogin, LiveRegister, LiveForgot, LiveResetPassword, LiveAcceptInvite, LiveOnboarding, LiveLoading, LiveError, LiveVerified, LiveLinkExpired } from './live/AuthLive';

function Denied({ text }: any) {
  const { me, nav, live } = useStore();
  return (
    <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
      <Empty heading="h1" icon={LuShieldAlert} title="אין לך הרשאה למסך הזה" action={<Btn kind="primary" onClick={() => nav(defaultPathFor(me))}>חזרה למסך הבית שלי</Btn>}>
        {text || 'המסך מוגבל לתפקיד אחר.'} {live ? 'ההרשאות נאכפות גם בשרת.' : 'בדמו ההגבלה מוצגת בצד הדפדפן בלבד; בייצור היא תיאכף בשרת.'}
      </Empty>
    </div>
  );
}
function NotFound() {
  const { me, nav } = useStore();
  return <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}><Empty heading="h1" title="הדף לא נמצא" action={<Btn onClick={() => nav(defaultPathFor(me))}>למסך הבית</Btn>}>ייתכן שהרשומה נמחקה או שהקישור שגוי.</Empty></div>;
}

function OfficeRoutes() {
  const { db, me, path, live } = useStore();
  const { segs, query } = parseRoute(path);
  const [a, b, c] = segs;
  const fin = canSeeFinance(db, me);
  switch (a) {
    case 'dashboard': return <Dashboard />;
    case 'projects': return b ? <ProjectDetail id={b} tab={c || 'overview'} /> : <ProjectsList query={query} />;
    case 'clients': return b ? <ClientDetail id={b} /> : <ClientsList query={query} />;
    case 'tasks': return <TasksPage query={query} />;
    case 'plans': return b ? (c === 'compare' ? <PlanCompare id={b} /> : <PlanViewer id={b} query={query} />) : <PlansLibrary query={query} />;
    case 'specs': return b ? <ProjectSpecs projectId={b} /> : <SpecsOverview />;
    case 'documents': return b ? <DocumentDetail id={b} /> : <DocumentsPage query={query} />;
    case 'approvals': return <ApprovalsPage query={query} />;
    case 'calendar': return <CalendarPage query={query} />;
    case 'meetings': return b ? <MeetingDetail id={b} /> : <CalendarPage query={query} />;
    case 'suppliers': return !hasFeature(db, 'procurement') ? <LockedFeature feature="procurement" /> : b ? <SupplierDetail id={b} /> : <SuppliersList query={query} />;
    case 'procurement': return !hasFeature(db, 'procurement') ? <LockedFeature feature="procurement" /> : b ? <PODetail id={b} /> : <POList query={query} />;
    case 'budget': return fin ? <BudgetOverview /> : <Denied text={live ? "תקציבים זמינים לבעלים ולמנהלי משרד (בעלי המשרד יכולים לפתוח לצוות בהגדרות)." : "תקציבים זמינים לבעלים ולמנהלי משרד (הנחת דמו – ניתן לשנות בהגדרות)."} />;
    case 'expenses': return fin ? <ExpensesPage query={query} /> : <Denied text={live ? "הוצאות זמינות לבעלים ולמנהלי משרד." : "הוצאות זמינות לבעלים ולמנהלי משרד (הנחת דמו)."} />;
    case 'fees': return !fin ? <Denied text="שכר טרחה זמין לבעלים ולמנהלי משרד." /> : !hasFeature(db, 'fees') ? <LockedFeature feature="fees" /> : <FeesPage />;
    case 'team': return b ? <MemberDetail id={b} /> : <TeamPage query={query} />;
    case 'messages': return !hasFeature(db, 'client_portal') ? <LockedFeature feature="client_portal" /> : <MessagesPage query={query} />;
    case 'notifications': return <NotificationsPage />;
    case 'settings': return <SettingsPage query={query} />;
    case 'profile': return <ProfilePage />;
    case 'billing':
      if (me.role !== 'owner' && me.role !== 'admin') return <Denied text="מנוי וחיוב זמינים לבעלי המשרד." />;
      if (b === 'invoices' && c) return <InvoiceDetail id={c} />;
      if (b === 'change') return <ChangePlan query={query} />;
      if (b === 'cancel') return <CancelFlow />;
      return <BillingPage query={query} />;
    case 'help': return b ? <HelpArticle id={b} /> : <HelpCenter />;
    case 'support': return b ? <TicketDetail id={b} /> : <SupportPage query={query} />;
    case 'pricing': return <PricingPage inApp />;
    case 'portal': return <Denied text={live ? 'הפורטל מיועד ללקוחות של המשרד.' : 'הפורטל מיועד ללקוחות. כדי לראות אותו, החליפו תפקיד ל״דנה כהן״ בתפריט המשתמש.'} />;
    case 'admin': return <Denied text={live ? 'קונסולת הניהול מיועדת לצוות ArchiFlow.' : 'קונסולת הניהול מיועדת ל-Super Admin. ניתן להחליף תפקיד ל״רון גבאי״ בתפריט המשתמש.'} />;
    default: return <NotFound />;
  }
}

export function App() {
  const { me, path, live } = useStore();
  const { segs } = parseRoute(path);
  const a = segs[0];
  if (a === 'accessibility') return <PublicShell><AccessibilityStatement /></PublicShell>;
  if (live) {
    if (a === 'accept-invite') return <PublicShell plain><LiveAcceptInvite /></PublicShell>;
    if (a === 'reset-password') return <PublicShell plain><LiveResetPassword /></PublicShell>;
    if (live.landing?.kind === 'verified') return <PublicShell plain><LiveVerified /></PublicShell>;
    if (live.landing?.kind === 'expired') return <PublicShell plain><LiveLinkExpired /></PublicShell>;
    if (live.status === 'boot' || live.status === 'loading') return <LiveLoading />;
    if (live.status === 'error') return <LiveError />;
    if (live.status === 'anon') {
      if (a === 'register') return <PublicShell plain><LiveRegister /></PublicShell>;
      if (a === 'forgot') return <PublicShell plain><LiveForgot /></PublicShell>;
      if (a === 'pricing') return <PublicShell><PricingPage /></PublicShell>;
      return <PublicShell plain><LiveLogin /></PublicShell>;
    }
    if (live.status === 'no-context') return <PublicShell plain><LiveOnboarding /></PublicShell>;
    if (a === 'onboarding') return <PublicShell plain><LiveOnboarding /></PublicShell>;
    if (['login', 'register', 'forgot'].includes(a)) return <LiveLoading />;
  }
  if (a === 'login') return <PublicShell plain><Login /></PublicShell>;
  if (a === 'register') return <PublicShell plain><Register /></PublicShell>;
  if (a === 'forgot') return <PublicShell plain><Forgot /></PublicShell>;
  if (a === 'onboarding') return <PublicShell plain><Onboarding /></PublicShell>;
  if (a === 'pricing' && me.role !== 'owner' && me.role !== 'admin' && me.role !== 'member') return <PublicShell><PricingPage /></PublicShell>;
  if (me.role === 'client') {
    return <PortalShell>{a === 'portal' ? <PortalRouter /> : <Denied text="כלקוח/ה ניתן לצפות רק בפורטל הלקוחות ובפריטים שהמשרד שיתף איתך." />}</PortalShell>;
  }
  if (me.role === 'super_admin') {
    return <AdminShell>{a === 'admin' ? <AdminRouter /> : <Denied text="חשבון Super Admin לא נכנס לסביבת עבודה של משרד. התחזות למשרד אינה חלק מה-MVP (החלטה פתוחה)." />}</AdminShell>;
  }
  return <AppShell><OfficeRoutes /></AppShell>;
}
