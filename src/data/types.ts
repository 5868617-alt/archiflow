// ArchiFlow demo data model.
// Each interface maps to a future Supabase/PostgreSQL table (name in the comment).
// Foreign keys use the `<entity>Id` convention; office scoping (`officeId`) is what
// Row Level Security will enforce in production.

export type Role = 'super_admin' | 'owner' | 'admin' | 'member' | 'client';

export const PROJECT_STATUSES = [
  'ליד חדש', 'תכנון ראשוני', 'תכנון בפיתוח', 'ממתין לאישור', 'תכנון מאושר', 'ביצוע', 'לקראת מסירה', 'הושלם', 'בהשהיה',
] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const TASK_STATUSES = ['לביצוע', 'בתהליך', 'ממתין לאחר', 'הושלם'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];
export const PRIORITIES = ['נמוכה', 'בינונית', 'גבוהה', 'דחופה'] as const;
export type Priority = typeof PRIORITIES[number];

/** table: offices */
export interface Office { id: string; name: string; legalName: string; city: string; address: string; phone: string; email: string; vatId: string; createdAt: string; logoText: string; specialties: string[]; }

/** table: users (+ auth.users) */
export interface User { id: string; name: string; email: string; phone?: string; title: string; color: string; role: Role; officeId?: string; clientId?: string; status: 'פעיל' | 'הוזמן' | 'מושבת'; joinedAt: string; lastActive: string; }

/** table: office_memberships */
export interface Membership { id: string; officeId: string; userId: string; role: Role; since: string; }

/** table: invitations */
export interface Invitation { id: string; officeId: string; email: string; name: string; role: Role; sentAt: string; sentBy: string; status: 'ממתינה' | 'התקבלה' | 'פגה'; }

/** table: clients (+ client_contacts) */
export interface ClientContact { id: string; name: string; role: string; phone: string; email: string; portal: 'פעיל' | 'הוזמן' | 'ללא גישה' | 'מושהה'; userId?: string; }
export interface Client { id: string; officeId: string; name: string; type: 'פרטי' | 'עסקי'; city: string; address: string; source: string; createdAt: string; notes: string; contacts: ClientContact[]; }

/** table: projects */
export interface Milestone { id: string; title: string; date: string; done: boolean; }
export interface Project {
  id: string; officeId: string; clientId: string; code: string; name: string; type: string; address: string; city: string;
  areaSqm: number; status: ProjectStatus; statusNote?: string; leadId: string; startDate: string; dueDate: string; progress: number;
  phase: number; // index in PHASES
  execBudget: number; feeTotal: number; feeType: 'סכום קבוע' | 'אחוז מביצוע' | 'שעתי'; description: string; tags: string[]; milestones: Milestone[];
  cover: 'apartment' | 'villa' | 'cafe' | 'office' | 'kitchen' | 'garden' | 'hotel' | 'house';
  updatedAt: string;
}
export const PHASES = ['איסוף צרכים', 'תכנון מוקדם', 'תכנון מפורט', 'מפרטים ואישורים', 'רכש', 'ביצוע ופיקוח', 'מסירה'];

/** table: project_assignments */
export interface Assignment { id: string; projectId: string; userId: string; roleInProject: string; }

/** table: tasks (+ task_comments) */
export interface Comment { id: string; authorId: string; text: string; at: string; }
export interface Task {
  id: string; projectId: string | null; title: string; description: string; status: TaskStatus; priority: Priority;
  assigneeId: string; dueDate: string; createdAt: string; createdBy: string; tags: string[]; comments: Comment[];
  checklist: { id: string; text: string; done: boolean }[]; source?: { kind: 'plan' | 'meeting' | 'approval' | 'template'; id: string };
}

/** table: work_templates */
export interface WorkTemplate { id: string; name: string; description: string; category: string; tasks: { title: string; offsetDays: number; role: string; priority: Priority }[]; usedCount: number; }

/** table: plans + plan_versions */
export type PlanStatus = 'טיוטה' | 'בבדיקה פנימית' | 'נשלח ללקוח' | 'מאושר' | 'נדרשים תיקונים' | 'הוחלף';
export interface PlanVersion { v: number; date: string; authorId: string; note: string; fileType: 'PDF' | 'DWG' | 'DXF' | 'JPG' | 'PNG'; sizeMb: number; processing: 'מוכן' | 'בעיבוד' | 'נכשל' | 'תצוגה לא נתמכת'; status: PlanStatus; }
export interface Plan {
  id: string; projectId: string; number: string; title: string; category: string; scale: string; layout: PlanLayout;
  versions: PlanVersion[]; sharedWithClient: boolean; tags: string[];
}
export type PlanLayout = 'apartment' | 'apartment-elec' | 'apartment-ceiling' | 'kitchen-detail' | 'section' | 'villa-ground' | 'villa-first' | 'elevation' | 'cafe' | 'bar-detail' | 'office' | 'office-partitions' | 'existing' | 'bath';

/** table: plan_annotations (comments, issues/findings, measurements) */
export interface Annotation {
  id: string; planId: string; version: number; kind: 'comment' | 'issue' | 'measure'; x: number; y: number; x2?: number; y2?: number;
  text: string; authorId: string; at: string; status: 'פתוח' | 'טופל'; severity?: 'נמוכה' | 'בינונית' | 'גבוהה'; taskId?: string; simulated?: boolean;
}

/** table: spec_items (+ spec_item_alternatives) and spec_versions */
export type SpecStatus = 'טיוטה' | 'ממתין לאישור לקוח' | 'מאושר' | 'בקשת שינוי' | 'נדחה';
export interface SpecItem {
  id: string; projectId: string; room: string; category: string; name: string; supplierId: string; sku: string; qty: number; unit: string; unitPrice: number;
  notes: string; status: SpecStatus; swatch: string; pattern?: 'stone' | 'wood' | 'tile' | 'fabric' | 'metal' | 'glass' | 'plain'; sharedWithClient: boolean;
  alternatives: { name: string; unitPrice: number; supplierId: string; note: string }[]; leadTimeWeeks: number; poId?: string;
}
export interface SpecVersion { id: string; projectId: string; v: number; date: string; authorId: string; summary: string; total: number; }

/** table: approvals */
export interface Approval {
  id: string; projectId: string; kind: 'מפרט' | 'שרטוט' | 'מסמך' | 'שינוי תקציב' | 'הצעת מחיר'; refId: string; title: string; requestedBy: string; requestedAt: string; dueAt: string;
  status: 'ממתין' | 'אושר' | 'נדחה' | 'בקשת שינוי'; contactId: string; decidedAt?: string; comment?: string; amount?: number;
}

/** table: documents + document_versions */
export interface DocVersion { v: number; date: string; authorId: string; note: string; sizeKb: number; }
export interface Doc {
  id: string; projectId: string | null; folder: string; name: string; fileType: 'PDF' | 'DOCX' | 'XLSX' | 'JPG' | 'PNG' | 'ZIP'; versions: DocVersion[];
  sharedWithClient: boolean; access: 'צוות הפרויקט' | 'כל המשרד' | 'בעלים ומנהלים'; tags: string[]; description: string;
}

/** table: meetings (calendar_events) + absences */
export interface Meeting {
  id: string; projectId: string | null; title: string; kind: 'client' | 'site' | 'team' | 'supplier'; date: string; start: string; end: string; location: string;
  attendeeIds: string[]; contactIds: string[]; supplierIds: string[]; agenda: string[]; summary: string; followUpTaskIds: string[]; sharedWithClient: boolean; status: 'מתוכננת' | 'התקיימה' | 'בוטלה';
}
export interface Absence { id: string; userId: string; from: string; to: string; kind: 'חופשה' | 'מחלה' | 'מילואים' | 'השתלמות'; note: string; }

/** table: suppliers */
export interface Supplier { id: string; officeId: string; name: string; kind: 'ספק' | 'קבלן' | 'בעל מקצוע'; category: string; contact: string; phone: string; email: string; city: string; rating: number; paymentTerms: string; notes: string; website?: string; }

/** table: purchase_orders + purchase_order_items */
export type POStatus = 'טיוטה' | 'נשלחה לספק' | 'אושרה ע״י ספק' | 'בייצור' | 'סופקה חלקית' | 'סופקה' | 'בוטלה';
export interface POItem { id: string; name: string; qty: number; unit: string; unitPrice: number; specItemId?: string; received: number; }
export interface PurchaseOrder { id: string; number: string; projectId: string; supplierId: string; status: POStatus; createdAt: string; createdBy: string; expectedDelivery: string; items: POItem[]; notes: string; paidBy: 'לקוח ישירות' | 'דרך המשרד'; }

/** table: budget_lines (planned execution budget per category) */
export interface BudgetLine { id: string; projectId: string; category: string; planned: number; }

/** table: expenses */
export interface Expense { id: string; projectId: string; date: string; category: string; description: string; supplierId: string | null; poId: string | null; amount: number; receipt: string | null; status: 'שולם' | 'ממתין לתשלום'; paidBy: 'לקוח ישירות' | 'דרך המשרד'; }

/** table: fee_milestones (studio's own fee) */
export interface FeeMilestone { id: string; projectId: string; title: string; pct: number; amount: number; dueDate: string; status: 'שולם' | 'נשלחה דרישה' | 'עתידי' | 'באיחור'; paidAt?: string; }

/** table: notifications */
export interface Notification { id: string; userId: string; kind: 'approval' | 'task' | 'meeting' | 'budget' | 'comment' | 'system' | 'plan'; title: string; body: string; link: string; at: string; read: boolean; }

/** table: messages (studio ⇄ client thread per project) */
export interface Message { id: string; projectId: string; side: 'studio' | 'client'; authorId: string; authorName: string; text: string; at: string; attachments?: string[]; }

/** table: email_log (future Resend) */
export interface EmailLog { id: string; to: string; subject: string; template: string; at: string; status: 'הודמה – לא נשלח'; relatedLink: string; }

/** table: activity_log */
export interface Activity { id: string; projectId: string | null; userId: string; text: string; at: string; link?: string; }

/** table: subscription_plans */
export interface PlanFeatureDef { key: string; label: string; group: string; }
export interface SubscriptionPlan { id: 'starter' | 'pro'; name: string; tagline: string; priceMonthly: number; priceYearlyPerMonth: number | null; currency: '₪'; vatIncluded: boolean; priceConfirmed: boolean; limits: { users: number | null; activeProjects: number | null; storageGb: number; clientPortalSeats: number | null }; features: Record<string, boolean>; trialDays: number; }

/** table: office_subscriptions + subscription_events */
export interface OfficeSubscription { id: string; officeId: string; planId: 'starter' | 'pro'; status: 'פעיל' | 'תקופת ניסיון' | 'חוב פתוח' | 'יבוטל בסוף התקופה' | 'בוטל' | 'פג תוקף'; cycle: 'חודשי' | 'שנתי'; startedAt: string; currentPeriodEnd: string; cancelAt?: string; trialEndsAt?: string; paymentMethod: string; seatsUsed: number; storageUsedGb: number; history: { at: string; text: string; by: string }[]; }

/** table: invoices (billing provider mirror — simulated) */
export interface Invoice { id: string; officeId: string; number: string; date: string; periodFrom: string; periodTo: string; planId: string; amount: number; vat: number; status: 'שולמה' | 'פתוחה' | 'נכשלה' | 'זוכתה'; }

/** table: pricing_change_log */
export interface PricingChange { id: string; at: string; planId: string; field: string; from: string; to: string; by: string; note: string; }

/** table: support_tickets + ticket_messages */
export interface Ticket { id: string; number: string; officeId: string; userId: string; subject: string; category: string; priority: 'נמוכה' | 'רגילה' | 'גבוהה' | 'קריטית'; status: 'פתוח' | 'בטיפול' | 'ממתין למשתמש' | 'נסגר'; createdAt: string; assignee: string; messages: { side: 'user' | 'support'; name: string; text: string; at: string }[]; }

/** table: audit_log */
export interface AuditEntry { id: string; at: string; actor: string; officeId: string | null; action: string; target: string; ip: string; }
/** table: system_events */
export interface SystemEvent { id: string; at: string; level: 'info' | 'warn' | 'error'; service: string; message: string; }
/** table: announcements */
export interface Announcement { id: string; title: string; body: string; audience: string; status: 'טיוטה' | 'פורסם' | 'מתוזמן'; at: string; }
/** platform-level: offices directory (super admin) */
export interface PlatformOffice { id: string; name: string; city: string; ownerName: string; ownerEmail: string; planId: 'starter' | 'pro'; status: OfficeSubscription['status']; users: number; projects: number; storageGb: number; createdAt: string; lastActive: string; mrr: number; }
