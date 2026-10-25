// ArchiFlow demo dataset — one fictional studio and its projects.
// All names, phone numbers and e-mails are invented (example.co.il / example.com).
import { D, DT } from './dates';
import type * as T from './types';

export const OFFICE_ID = 'off_1';

export const office: T.Office = {
  id: OFFICE_ID, name: 'לוי ברק אדריכלות ועיצוב פנים', legalName: 'לוי ברק סטודיו בע״מ', city: 'תל אביב-יפו', address: 'שד׳ רוטשילד 45, קומה 3',
  phone: '03-555-0182', email: 'studio@levibarak.example.co.il', vatId: '516000000', createdAt: '2025-09-12', logoText: 'לב',
  specialties: ['דירות יוקרה', 'וילות', 'מסחר ואירוח', 'משרדים'],
};

const C = ['#2B3E68', '#7A5C2E', '#2E7656', '#8A3D5C', '#3E6A8A', '#6A4C9C', '#A0522D', '#44607A'];
export const users: T.User[] = [
  { id: 'u_michal', name: 'מיכל לוי', email: 'michal@levibarak.example.co.il', phone: '052-555-0101', title: 'אדריכלית ראשית ובעלים', color: C[0], role: 'owner', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2025-09-12', lastActive: DT(0, '08:42') },
  { id: 'u_yoav', name: 'יואב ברק', email: 'yoav@levibarak.example.co.il', phone: '054-555-0102', title: 'שותף, ניהול פרויקטים', color: C[1], role: 'admin', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2025-09-12', lastActive: DT(0, '09:10') },
  { id: 'u_noa', name: 'נועה שפירא', email: 'noa@levibarak.example.co.il', phone: '050-555-0103', title: 'אדריכלית', color: C[2], role: 'member', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2025-10-01', lastActive: DT(0, '08:55') },
  { id: 'u_ori', name: 'אורי דהן', email: 'ori@levibarak.example.co.il', phone: '052-555-0104', title: 'מעצב פנים', color: C[3], role: 'member', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2025-10-01', lastActive: DT(-1, '17:20') },
  { id: 'u_shira', name: 'שירה כץ', email: 'shira@levibarak.example.co.il', phone: '053-555-0105', title: 'הנדסאית אדריכלות, שרטוט', color: C[4], role: 'member', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2026-01-15', lastActive: DT(0, '09:02') },
  { id: 'u_daniel', name: 'דניאל אברהם', email: 'daniel@levibarak.example.co.il', phone: '058-555-0106', title: 'מפקח ביצוע', color: C[6], role: 'member', officeId: OFFICE_ID, status: 'פעיל', joinedAt: '2026-02-01', lastActive: DT(0, '07:30') },
  // client portal users
  { id: 'cu_dana', name: 'דנה כהן', email: 'dana.cohen@example.com', phone: '052-555-0201', title: 'לקוחה – פנטהאוז ארלוזורוב', color: C[5], role: 'client', clientId: 'cl_cohen', status: 'פעיל', joinedAt: '2025-11-14', lastActive: DT(-1, '21:12') },
  { id: 'cu_ronit', name: 'רונית מזרחי', email: 'ronit.m@example.com', title: 'לקוחה – וילה הרצליה', color: C[7], role: 'client', clientId: 'cl_mizrahi', status: 'פעיל', joinedAt: '2026-03-02', lastActive: DT(-2, '20:40') },
  { id: 'cu_omer', name: 'עומר נחום', email: 'omer@garin-cafe.example.com', title: 'לקוח – בית קפה גרעין', color: C[2], role: 'client', clientId: 'cl_garin', status: 'פעיל', joinedAt: '2026-02-10', lastActive: DT(-3, '11:05') },
  { id: 'cu_yael', name: 'יעל פרידמן', email: 'yael@friedman-law.example.com', title: 'לקוחה – משרדי פרידמן', color: C[3], role: 'client', clientId: 'cl_friedman', status: 'פעיל', joinedAt: '2026-06-20', lastActive: DT(-5, '13:30') },
  { id: 'cu_nurit', name: 'נורית שטרן', email: 'nurit.stern@example.com', title: 'לקוחה – שיפוץ מודיעין', color: C[1], role: 'client', clientId: 'cl_stern', status: 'פעיל', joinedAt: '2026-07-04', lastActive: DT(-4, '19:00') },
  // platform
  { id: 'sa_ron', name: 'רון גבאי', email: 'ron@archiflow.example.com', title: 'מנהל פלטפורמה (Super Admin)', color: '#0B0F18', role: 'super_admin', status: 'פעיל', joinedAt: '2025-06-01', lastActive: DT(0, '09:15') },
];

export const memberships: T.Membership[] = users.filter((u) => u.officeId).map((u) => ({ id: 'm_' + u.id, officeId: OFFICE_ID, userId: u.id, role: u.role, since: u.joinedAt }));

export const invitations: T.Invitation[] = [
  { id: 'inv_1', officeId: OFFICE_ID, email: 'adi.golan@example.com', name: 'עדי גולן', role: 'member', sentAt: D(-3), sentBy: 'u_michal', status: 'ממתינה' },
  { id: 'inv_2', officeId: OFFICE_ID, email: 'avi.cohen@example.com', name: 'אבי כהן (לקוח)', role: 'client', sentAt: D(-9), sentBy: 'u_yoav', status: 'ממתינה' },
  { id: 'inv_3', officeId: OFFICE_ID, email: 'tal.k@example.com', name: 'טל קרמר', role: 'member', sentAt: D(-40), sentBy: 'u_michal', status: 'פגה' },
];

export const clients: T.Client[] = [
  { id: 'cl_cohen', officeId: OFFICE_ID, name: 'משפחת כהן', type: 'פרטי', city: 'תל אביב-יפו', address: 'ארלוזורוב 112, דירה 21', source: 'המלצה של לקוח קודם', createdAt: '2025-10-20', notes: 'זוג + 2 ילדים. רגישות גבוהה ללוחות זמנים – מעבר דירה מתוכנן לפברואר 2027. מעדיפים חומרים טבעיים.',
    contacts: [
      { id: 'cc_dana', name: 'דנה כהן', role: 'איש קשר ראשי', phone: '052-555-0201', email: 'dana.cohen@example.com', portal: 'פעיל', userId: 'cu_dana' },
      { id: 'cc_avi', name: 'אבי כהן', role: 'בן זוג', phone: '054-555-0202', email: 'avi.cohen@example.com', portal: 'הוזמן' },
    ] },
  { id: 'cl_mizrahi', officeId: OFFICE_ID, name: 'רונית ואלון מזרחי', type: 'פרטי', city: 'הרצליה', address: 'רח׳ הגלים 8, הרצליה פיתוח', source: 'אינסטגרם', createdAt: '2026-01-28', notes: 'בנייה חדשה, מגרש 750 מ״ר. אדריכל הבניין: משרד חיצוני; אנחנו אחראים על פנים, נגרות ותאורה.',
    contacts: [
      { id: 'cc_ronit', name: 'רונית מזרחי', role: 'איש קשר ראשי', phone: '052-555-0211', email: 'ronit.m@example.com', portal: 'פעיל', userId: 'cu_ronit' },
      { id: 'cc_alon', name: 'אלון מזרחי', role: 'בן זוג', phone: '052-555-0212', email: 'alon.m@example.com', portal: 'ללא גישה' },
    ] },
  { id: 'cl_garin', officeId: OFFICE_ID, name: 'גרעין קפה בע״מ', type: 'עסקי', city: 'תל אביב-יפו', address: 'פלורנטין 31', source: 'פנייה דרך האתר', createdAt: '2026-01-05', notes: 'סניף שני של רשת קטנה. פתיחה מתוכננת לפני חנוכה.',
    contacts: [
      { id: 'cc_omer', name: 'עומר נחום', role: 'בעלים', phone: '050-555-0221', email: 'omer@garin-cafe.example.com', portal: 'פעיל', userId: 'cu_omer' },
      { id: 'cc_lior', name: 'ליאור בן-שושן', role: 'מנהלת תפעול', phone: '050-555-0222', email: 'lior@garin-cafe.example.com', portal: 'ללא גישה' },
    ] },
  { id: 'cl_friedman', officeId: OFFICE_ID, name: 'פרידמן ושות׳ – משרד עורכי דין', type: 'עסקי', city: 'רמת גן', address: 'מגדל הבורסה, קומה 22', source: 'מכרז סגור', createdAt: '2026-05-11', notes: 'קומה שלמה, 42 עמדות + 9 חדרים. דרישות אקוסטיות לחדרי ישיבות.',
    contacts: [{ id: 'cc_yael', name: 'עו״ד יעל פרידמן', role: 'שותפה מנהלת', phone: '03-555-0231', email: 'yael@friedman-law.example.com', portal: 'פעיל', userId: 'cu_yael' }] },
  { id: 'cl_ohayon', officeId: OFFICE_ID, name: 'משפחת אוחיון', type: 'פרטי', city: 'גבעתיים', address: 'כצנלסון 77', source: 'המלצה', createdAt: '2026-09-02', notes: 'דירת 4 חדרים, שיפוץ ללא הזזת קירות נושאים.',
    contacts: [{ id: 'cc_moran', name: 'מורן אוחיון', role: 'איש קשר ראשי', phone: '053-555-0241', email: 'moran.o@example.com', portal: 'ללא גישה' }] },
  { id: 'cl_rosen', officeId: OFFICE_ID, name: 'תמר וגיל רוזן', type: 'פרטי', city: 'כפר סבא', address: 'הירקון 14', source: 'פנייה דרך האתר', createdAt: D(-6), notes: 'ליד – בית פרטי דו-קומתי, מעוניינים בתכנון פנים מלא. פגישת היכרות נקבעה.',
    contacts: [{ id: 'cc_tamar', name: 'תמר רוזן', role: 'איש קשר ראשי', phone: '052-555-0251', email: 'tamar.rosen@example.com', portal: 'ללא גישה' }] },
  { id: 'cl_bendavid', officeId: OFFICE_ID, name: 'משפחת בן-דוד', type: 'פרטי', city: 'רעננה', address: 'אחוזה 190', source: 'המלצה', createdAt: '2025-09-20', notes: 'פרויקט שהושלם. לקוחות מרוצים – אישרו שימוש בתמונות לתיק עבודות.',
    contacts: [{ id: 'cc_eli', name: 'אלי בן-דוד', role: 'איש קשר ראשי', phone: '054-555-0261', email: 'eli.bd@example.com', portal: 'מושהה' }] },
  { id: 'cl_hanamal', officeId: OFFICE_ID, name: 'מלון הנמל בע״מ', type: 'עסקי', city: 'חיפה', address: 'דרך העצמאות 60', source: 'קשר אישי', createdAt: '2026-02-14', notes: 'מלון בוטיק 24 חדרים במבנה לשימור. הפרויקט מוקפא עד להסדרת מימון.',
    contacts: [{ id: 'cc_asaf', name: 'אסף לוינסון', role: 'מנכ״ל', phone: '04-555-0271', email: 'asaf@hanamal.example.com', portal: 'מושהה' }] },
  { id: 'cl_stern', officeId: OFFICE_ID, name: 'משפחת שטרן', type: 'פרטי', city: 'מודיעין', address: 'עמק החולה 5', source: 'אינסטגרם', createdAt: '2026-06-15', notes: 'מטבח + 2 חדרי רחצה. התכנון אושר, מתחילים ביצוע בנובמבר.',
    contacts: [{ id: 'cc_nurit', name: 'נורית שטרן', role: 'איש קשר ראשי', phone: '050-555-0281', email: 'nurit.stern@example.com', portal: 'פעיל', userId: 'cu_nurit' }] },
];

const ms = (arr: [string, string, boolean][]) => arr.map(([title, date, done], i) => ({ id: 'ms' + i + title.length, title, date, done }));

export const projects: T.Project[] = [
  { id: 'p_cohen', officeId: OFFICE_ID, clientId: 'cl_cohen', code: 'LB-25-014', name: 'פנטהאוז ארלוזורוב', type: 'דירת מגורים – שיפוץ מלא', address: 'ארלוזורוב 112', city: 'תל אביב-יפו', areaSqm: 186,
    status: 'ביצוע', leadId: 'u_yoav', startDate: '2025-11-10', dueDate: '2027-01-28', progress: 64, phase: 5, execBudget: 1250000, feeTotal: 185000, feeType: 'סכום קבוע',
    description: 'שיפוץ מלא של פנטהאוז בן 5 חדרים כולל מרפסת גג 60 מ״ר: פירוק מחיצות, מטבח פתוח עם אי, סוויטת הורים, נגרות מותאמת ותאורה אדריכלית.', tags: ['מגורים', 'יוקרה', 'מרפסת גג'], cover: 'apartment', updatedAt: DT(0, '08:40'),
    milestones: ms([['חתימת הסכם', '2025-11-10', true], ['אישור תכנון מוקדם', '2026-01-22', true], ['אישור תכנון מפורט', '2026-04-30', true], ['תחילת ביצוע', '2026-06-01', true], ['סיום שלד ותשתיות', '2026-10-20', true], ['התקנת מטבח ונגרות', D(24), false], ['מסירה ללקוח', '2027-01-28', false]]) },
  { id: 'p_mizrahi', officeId: OFFICE_ID, clientId: 'cl_mizrahi', code: 'LB-26-003', name: 'וילה בהרצליה פיתוח', type: 'בית פרטי – בנייה חדשה (פנים)', address: 'הגלים 8', city: 'הרצליה', areaSqm: 420,
    status: 'ממתין לאישור', statusNote: 'מפרט חומרים קומת קרקע נשלח לאישור הלקוחה', leadId: 'u_michal', startDate: '2026-02-15', dueDate: '2027-09-30', progress: 38, phase: 3, execBudget: 2400000, feeTotal: 320000, feeType: 'סכום קבוע',
    description: 'תכנון פנים לוילה דו-קומתית עם מרתף: חללים ציבוריים בגובה כפול, 5 יחידות שינה, ספא ביתי ומטבח שף.', tags: ['מגורים', 'וילה', 'בנייה חדשה'], cover: 'villa', updatedAt: DT(-1, '18:05'),
    milestones: ms([['חתימת הסכם', '2026-02-15', true], ['קונספט ולוח השראה', '2026-04-02', true], ['תכנון מוקדם', '2026-06-18', true], ['מפרט חומרים קומת קרקע', D(4), false], ['מפרט קומה א׳', D(35), false], ['תכניות נגרות', D(70), false]]) },
  { id: 'p_garin', officeId: OFFICE_ID, clientId: 'cl_garin', code: 'LB-26-001', name: 'בית קפה גרעין – פלורנטין', type: 'מסחר – עיצוב בית קפה', address: 'פלורנטין 31', city: 'תל אביב-יפו', areaSqm: 95,
    status: 'לקראת מסירה', leadId: 'u_ori', startDate: '2026-01-12', dueDate: D(18), progress: 91, phase: 6, execBudget: 480000, feeTotal: 62000, feeType: 'סכום קבוע',
    description: 'עיצוב והקמה של בית קפה 40 מקומות ישיבה: בר בטון מוחלק, ישיבה בחלון, חזית ברזל וזכוכית ושילוט.', tags: ['מסחר', 'F&B'], cover: 'cafe', updatedAt: DT(0, '07:55'),
    milestones: ms([['חתימת הסכם', '2026-01-12', true], ['אישור קונספט', '2026-02-20', true], ['היתר שילוט', '2026-05-10', true], ['התקנת בר', D(-6), true], ['רשימת תיקונים', D(5), false], ['מסירה ופתיחה', D(18), false]]) },
  { id: 'p_friedman', officeId: OFFICE_ID, clientId: 'cl_friedman', code: 'LB-26-007', name: 'משרדי פרידמן ושות׳', type: 'משרדים – התאמת קומה', address: 'מגדל הבורסה, קומה 22', city: 'רמת גן', areaSqm: 640,
    status: 'תכנון בפיתוח', leadId: 'u_noa', startDate: '2026-06-01', dueDate: '2027-04-15', progress: 27, phase: 2, execBudget: 900000, feeTotal: 110000, feeType: 'אחוז מביצוע',
    description: 'התאמת קומת משרדים: 42 עמדות עבודה, 9 חדרים, 3 חדרי ישיבות עם טיפול אקוסטי, קבלה ומטבחון.', tags: ['משרדים', 'אקוסטיקה'], cover: 'office', updatedAt: DT(-1, '15:30'),
    milestones: ms([['חתימת הסכם', '2026-06-01', true], ['פרוגרמה מאושרת', '2026-07-15', true], ['תכנית העמדה', D(-3), true], ['תכנון מפורט', D(28), false], ['מכרז קבלנים', D(55), false]]) },
  { id: 'p_ohayon', officeId: OFFICE_ID, clientId: 'cl_ohayon', code: 'LB-26-011', name: 'דירת 4 חדרים בגבעתיים', type: 'דירת מגורים – שיפוץ', address: 'כצנלסון 77', city: 'גבעתיים', areaSqm: 112,
    status: 'תכנון ראשוני', leadId: 'u_ori', startDate: '2026-09-10', dueDate: '2027-05-30', progress: 12, phase: 1, execBudget: 380000, feeTotal: 48000, feeType: 'סכום קבוע',
    description: 'שיפוץ דירת 4 חדרים: מטבח חדש, איחוד חדרי רחצה, עבודות חשמל וריצוף.', tags: ['מגורים'], cover: 'kitchen', updatedAt: DT(-2, '12:00'),
    milestones: ms([['חתימת הסכם', '2026-09-10', true], ['מדידה ותיעוד מצב קיים', '2026-09-24', true], ['2 חלופות תכנון', D(9), false], ['תכנון מוקדם מאושר', D(30), false]]) },
  { id: 'p_rosen', officeId: OFFICE_ID, clientId: 'cl_rosen', code: 'LD-26-019', name: 'בית פרטי בכפר סבא', type: 'בית פרטי – עיצוב פנים מלא', address: 'הירקון 14', city: 'כפר סבא', areaSqm: 260,
    status: 'ליד חדש', statusNote: 'פגישת היכרות נקבעה', leadId: 'u_michal', startDate: D(-6), dueDate: '2027-12-31', progress: 0, phase: 0, execBudget: 1600000, feeTotal: 210000, feeType: 'סכום קבוע',
    description: 'ליד: בית דו-קומתי קיים, שיפוץ ועיצוב מחדש. תקציב משוער ושכר טרחה בגדר הצעה בלבד.', tags: ['ליד', 'מגורים'], cover: 'house', updatedAt: DT(-1, '10:15'),
    milestones: ms([['פגישת היכרות', D(2), false], ['שליחת הצעת מחיר', D(9), false]]) },
  { id: 'p_bendavid', officeId: OFFICE_ID, clientId: 'cl_bendavid', code: 'LB-25-006', name: 'דירת גן ברעננה', type: 'דירת מגורים – שיפוץ', address: 'אחוזה 190', city: 'רעננה', areaSqm: 140,
    status: 'הושלם', leadId: 'u_yoav', startDate: '2025-09-28', dueDate: '2026-07-30', progress: 100, phase: 6, execBudget: 520000, feeTotal: 68000, feeType: 'סכום קבוע',
    description: 'שיפוץ דירת גן כולל פתיחת סלון לגינה, מטבח חדש וחדרי רחצה.', tags: ['מגורים', 'גינה'], cover: 'garden', updatedAt: '2026-08-02T10:00',
    milestones: ms([['חתימת הסכם', '2025-09-28', true], ['תכנון מאושר', '2025-12-15', true], ['ביצוע', '2026-02-01', true], ['מסירה', '2026-07-30', true]]) },
  { id: 'p_hanamal', officeId: OFFICE_ID, clientId: 'cl_hanamal', code: 'LB-26-004', name: 'מלון בוטיק הנמל – לובי וחדרים', type: 'אירוח – מבנה לשימור', address: 'דרך העצמאות 60', city: 'חיפה', areaSqm: 900,
    status: 'בהשהיה', statusNote: 'הקפאת מימון אצל היזם עד רבעון 1/2027', leadId: 'u_michal', startDate: '2026-03-01', dueDate: '2028-03-01', progress: 22, phase: 2, execBudget: 3800000, feeTotal: 420000, feeType: 'אחוז מביצוע',
    description: 'עיצוב לובי, בר ו-24 חדרים במבנה טמפלרי לשימור. נדרש תיאום עם מחלקת שימור בעירייה.', tags: ['אירוח', 'שימור'], cover: 'hotel', updatedAt: '2026-08-14T12:00',
    milestones: ms([['חתימת הסכם', '2026-03-01', true], ['סקר שימור', '2026-05-20', true], ['קונספט לובי', '2026-07-30', true], ['תכנון מפורט חדרים', '2027-02-15', false]]) },
  { id: 'p_stern', officeId: OFFICE_ID, clientId: 'cl_stern', code: 'LB-26-009', name: 'שיפוץ מטבח וחדרי רחצה – מודיעין', type: 'שיפוץ חלקי', address: 'עמק החולה 5', city: 'מודיעין', areaSqm: 38,
    status: 'תכנון מאושר', leadId: 'u_ori', startDate: '2026-06-20', dueDate: '2027-01-20', progress: 55, phase: 4, execBudget: 210000, feeTotal: 28000, feeType: 'סכום קבוע',
    description: 'מטבח חדש בתצורת U, שני חדרי רחצה, החלפת ריצוף באזור הציבורי.', tags: ['מטבח', 'רחצה'], cover: 'kitchen', updatedAt: DT(-2, '16:45'),
    milestones: ms([['חתימת הסכם', '2026-06-20', true], ['אישור תכנון', D(-12), true], ['הזמנת מטבח', D(3), false], ['תחילת ביצוע', D(14), false], ['מסירה', '2027-01-20', false]]) },
];

export const assignments: T.Assignment[] = [
  ['p_cohen', 'u_yoav', 'מנהל פרויקט'], ['p_cohen', 'u_noa', 'אדריכלית'], ['p_cohen', 'u_ori', 'מעצב פנים'], ['p_cohen', 'u_shira', 'שרטוט'], ['p_cohen', 'u_daniel', 'פיקוח'],
  ['p_mizrahi', 'u_michal', 'אדריכלית אחראית'], ['p_mizrahi', 'u_noa', 'אדריכלית'], ['p_mizrahi', 'u_ori', 'מעצב פנים'], ['p_mizrahi', 'u_shira', 'שרטוט'],
  ['p_garin', 'u_ori', 'מעצב אחראי'], ['p_garin', 'u_daniel', 'פיקוח'], ['p_garin', 'u_shira', 'שרטוט'],
  ['p_friedman', 'u_noa', 'אדריכלית אחראית'], ['p_friedman', 'u_shira', 'שרטוט'], ['p_friedman', 'u_michal', 'ליווי'],
  ['p_ohayon', 'u_ori', 'מעצב אחראי'], ['p_ohayon', 'u_shira', 'שרטוט'],
  ['p_rosen', 'u_michal', 'אדריכלית אחראית'],
  ['p_bendavid', 'u_yoav', 'מנהל פרויקט'], ['p_bendavid', 'u_ori', 'מעצב פנים'],
  ['p_hanamal', 'u_michal', 'אדריכלית אחראית'], ['p_hanamal', 'u_noa', 'אדריכלית'],
  ['p_stern', 'u_ori', 'מעצב אחראי'], ['p_stern', 'u_daniel', 'פיקוח'],
].map(([projectId, userId, roleInProject], i) => ({ id: 'as' + i, projectId, userId, roleInProject }));

let tc = 0;
const task = (projectId: string | null, title: string, assigneeId: string, due: number, status: T.TaskStatus, priority: T.Priority, extra: Partial<T.Task> = {}): T.Task => ({
  id: 't' + ++tc, projectId, title, description: '', status, priority, assigneeId, dueDate: D(due), createdAt: D(Math.min(due, 0) - 10), createdBy: 'u_yoav', tags: [], comments: [], checklist: [], ...extra,
});

export const tasks: T.Task[] = [
  // p_cohen
  task('p_cohen', 'לאשר דוגמת שיש לאי המטבח מול הספק', 'u_ori', 0, 'בתהליך', 'גבוהה', { description: 'לבחור לוח מתוך 3 לוחות שמורים אצל אבן וקרמיקה הדר. לצלם ולשלוח לדנה לאישור.', comments: [{ id: 'c1', authorId: 'u_ori', text: 'קבעתי עם הספק ל-14:00. יש שני לוחות קלקטה ואחד ארבסקטו.', at: DT(-1, '16:10') }, { id: 'c2', authorId: 'u_yoav', text: 'תוודא שהגידים ממשיכים בין הלוח של האי ללוח של הקיר.', at: DT(-1, '17:02') }], checklist: [{ id: 'k1', text: 'צילום לוחות', done: true }, { id: 'k2', text: 'שליחה ללקוחה', done: false }, { id: 'k3', text: 'הזמנת חיתוך', done: false }] }),
  task('p_cohen', 'סיור פיקוח – בדיקת הכנות חשמל למטבח', 'u_daniel', 0, 'לביצוע', 'גבוהה', { description: 'השוואה מול תכנית חשמל E-201 גרסה 3. לשים לב לנקודות באי.' }),
  task('p_cohen', 'עדכון פרט נגרות ארון כניסה לפי מידות בשטח', 'u_shira', -2, 'בתהליך', 'בינונית', { source: { kind: 'plan', id: 'pl_cohen_kitchen' } }),
  task('p_cohen', 'הזמנת גופי תאורה שקועים – שלב ב׳', 'u_yoav', -4, 'לביצוע', 'דחופה', { description: 'הספק מעדכן זמן אספקה של 6 שבועות. חייבים להזמין השבוע כדי לא לעכב את הגבס.' }),
  task('p_cohen', 'אישור הזמנת רכש PO-2026-0136 – תאורה שלב ב׳', 'u_yoav', 0, 'לביצוע', 'גבוהה', { description: 'טיוטה שהכין אורי. לבדוק כמויות מול תכנית התקרות A-131 גרסה 2 לפני שליחה לספק.' }),
  task('p_cohen', 'שיחת עדכון שבועית עם דנה כהן', 'u_yoav', 0, 'לביצוע', 'בינונית', { checklist: [{ id: 'k1', text: 'סטטוס גבס ואיטום', done: false }, { id: 'k2', text: 'תזכורת ל-4 אישורים פתוחים', done: false }] }),
  task('p_cohen', 'סגירת מידות לחיפוי קיר טלוויזיה', 'u_ori', 3, 'לביצוע', 'בינונית'),
  task('p_cohen', 'הכנת דוח פיקוח עליון חודשי', 'u_daniel', 5, 'לביצוע', 'נמוכה'),
  task('p_cohen', 'בדיקת שיפועים במרפסת הגג לפני איטום', 'u_daniel', -1, 'ממתין לאחר', 'גבוהה', { description: 'ממתין לקבלן האיטום לפינוי האזור.', source: { kind: 'plan', id: 'pl_cohen_section' } }),
  task('p_cohen', 'פגישת בחירת ידיות וברזים עם הלקוחות', 'u_ori', -9, 'הושלם', 'בינונית'),
  // p_mizrahi
  task('p_mizrahi', 'השלמת מפרט חומרים קומת קרקע לשליחה', 'u_noa', -3, 'הושלם', 'גבוהה'),
  task('p_mizrahi', 'תזכורת לרונית – אישור מפרט קומת קרקע', 'u_michal', 1, 'לביצוע', 'גבוהה', { source: { kind: 'approval', id: 'ap_3' } }),
  task('p_mizrahi', 'הכנת הדמיות סלון בגובה כפול', 'u_ori', 6, 'בתהליך', 'בינונית'),
  task('p_mizrahi', 'תיאום נקודות מים לספא עם יועץ אינסטלציה', 'u_noa', 0, 'לביצוע', 'בינונית'),
  task('p_mizrahi', 'שרטוט חזיתות פנימיות – מדרגות', 'u_shira', 8, 'לביצוע', 'בינונית'),
  // p_garin
  task('p_garin', 'רשימת תיקונים (Snag list) לפני מסירה', 'u_daniel', 2, 'בתהליך', 'דחופה', { checklist: [{ id: 'k1', text: 'צבע סביב חלון ראווה', done: true }, { id: 'k2', text: 'פוגות בר', done: false }, { id: 'k3', text: 'כיוון דלת שירותים', done: false }, { id: 'k4', text: 'ניקיון סופי', done: false }] }),
  task('p_garin', 'קבלת תעודות אחריות מספקים', 'u_ori', -3, 'לביצוע', 'גבוהה'),
  task('p_garin', 'התקנת שילוט חזית', 'u_daniel', 6, 'ממתין לאחר', 'בינונית'),
  task('p_garin', 'צילום מקצועי לתיק עבודות', 'u_ori', 20, 'לביצוע', 'נמוכה'),
  // p_friedman
  task('p_friedman', 'עדכון תכנית העמדה לפי הערות השותפים', 'u_noa', 0, 'בתהליך', 'גבוהה', { source: { kind: 'meeting', id: 'mt_4' } }),
  task('p_friedman', 'פנייה ליועץ אקוסטיקה לחדרי ישיבות', 'u_noa', -5, 'לביצוע', 'גבוהה'),
  task('p_friedman', 'שרטוט תכנית מחיצות A-102', 'u_shira', 4, 'בתהליך', 'בינונית'),
  task('p_friedman', 'לוח חומרים לאזור הקבלה', 'u_michal', 10, 'לביצוע', 'בינונית'),
  // p_ohayon
  task('p_ohayon', 'הכנת 2 חלופות תכנון', 'u_ori', 9, 'בתהליך', 'בינונית'),
  task('p_ohayon', 'שרטוט מצב קיים מתוך המדידה', 'u_shira', -6, 'הושלם', 'בינונית'),
  // p_rosen
  task('p_rosen', 'הכנה לפגישת היכרות – תיק עבודות מותאם', 'u_michal', 1, 'לביצוע', 'בינונית'),
  task('p_rosen', 'טיוטת הצעת מחיר לשכר טרחה', 'u_michal', 8, 'לביצוע', 'בינונית'),
  // p_stern
  task('p_stern', 'אישור סופי מידות מטבח מול נגר', 'u_ori', 0, 'בתהליך', 'גבוהה'),
  task('p_stern', 'הזמנת אריחים לחדרי רחצה', 'u_ori', 3, 'לביצוע', 'גבוהה'),
  task('p_stern', 'תיאום תחילת עבודה עם קבלן ביצוע', 'u_daniel', 7, 'לביצוע', 'בינונית'),
  // office
  task(null, 'חידוש ביטוח אחריות מקצועית', 'u_michal', 12, 'לביצוע', 'בינונית', { tags: ['משרד'] }),
  task(null, 'עדכון תיק עבודות באתר – 3 פרויקטים', 'u_shira', 15, 'לביצוע', 'נמוכה', { tags: ['שיווק'] }),
];

export const templates: T.WorkTemplate[] = [
  { id: 'tpl_1', name: 'פתיחת פרויקט מגורים', category: 'פתיחה', description: 'צעדי חובה בשבועיים הראשונים לאחר חתימה.', usedCount: 14, tasks: [
    { title: 'פגישת התנעה עם הלקוח', offsetDays: 2, role: 'מנהל פרויקט', priority: 'גבוהה' }, { title: 'הזמנת מודד ותיעוד מצב קיים', offsetDays: 4, role: 'אדריכל/ית', priority: 'גבוהה' },
    { title: 'פתיחת תיקיית מסמכים ושיתוף פורטל', offsetDays: 1, role: 'מנהל פרויקט', priority: 'בינונית' }, { title: 'שאלון צרכים ללקוח', offsetDays: 3, role: 'מעצב/ת', priority: 'בינונית' },
    { title: 'לוח השראה ראשוני', offsetDays: 10, role: 'מעצב/ת', priority: 'בינונית' } ] },
  { id: 'tpl_2', name: 'הכנת מפרט לאישור לקוח', category: 'מפרטים', description: 'תהליך הכנה ושליחה של מפרט חומרים לאישור.', usedCount: 22, tasks: [
    { title: 'איסוף הצעות מחיר מספקים', offsetDays: 3, role: 'מעצב/ת', priority: 'גבוהה' }, { title: 'הכנת טבלת מפרט לפי חדרים', offsetDays: 5, role: 'מעצב/ת', priority: 'גבוהה' },
    { title: 'בדיקה פנימית ותמחור', offsetDays: 6, role: 'מנהל פרויקט', priority: 'בינונית' }, { title: 'שליחה לאישור בפורטל', offsetDays: 7, role: 'מנהל פרויקט', priority: 'בינונית' } ] },
  { id: 'tpl_3', name: 'פיקוח עליון שבועי', category: 'ביצוע', description: 'סיור, תיעוד ודוח שבועי.', usedCount: 41, tasks: [
    { title: 'סיור באתר ותיעוד', offsetDays: 0, role: 'פיקוח', priority: 'גבוהה' }, { title: 'עדכון ממצאים על גבי תכניות', offsetDays: 1, role: 'פיקוח', priority: 'בינונית' }, { title: 'דוח שבועי ללקוח', offsetDays: 2, role: 'פיקוח', priority: 'בינונית' } ] },
  { id: 'tpl_4', name: 'מסירת פרויקט', category: 'סיום', description: 'רשימת תיקונים, אחריות ותיעוד.', usedCount: 9, tasks: [
    { title: 'רשימת תיקונים', offsetDays: 0, role: 'פיקוח', priority: 'דחופה' }, { title: 'איסוף תעודות אחריות', offsetDays: 3, role: 'מעצב/ת', priority: 'גבוהה' }, { title: 'תיק מסירה ללקוח', offsetDays: 7, role: 'מנהל פרויקט', priority: 'בינונית' }, { title: 'צילום לתיק עבודות', offsetDays: 21, role: 'מעצב/ת', priority: 'נמוכה' } ] },
];

const pv = (v: number, date: string, authorId: string, note: string, fileType: T.PlanVersion['fileType'], sizeMb: number, status: T.PlanStatus, processing: T.PlanVersion['processing'] = 'מוכן'): T.PlanVersion => ({ v, date, authorId, note, fileType, sizeMb, status, processing });

export const plans: T.Plan[] = [
  { id: 'pl_cohen_floor', projectId: 'p_cohen', number: 'A-101', title: 'תכנית קומה – מוצע', category: 'תכנית קומה', scale: '1:50', layout: 'apartment', sharedWithClient: true, tags: ['מאושר לביצוע'], versions: [
    pv(1, '2026-01-08', 'u_noa', 'תכנון מוקדם – חלופה ב׳', 'PDF', 3.2, 'הוחלף'), pv(2, '2026-03-02', 'u_noa', 'תכנון מפורט – הזזת קיר סוויטה 40 ס״מ', 'PDF', 3.6, 'הוחלף'),
    pv(3, '2026-04-21', 'u_shira', 'עדכון מטבח פתוח ואי 2.80 מ׳', 'PDF', 3.9, 'הוחלף'), pv(4, D(-11), 'u_shira', 'התאמה למצב בשטח לאחר פירוק', 'PDF', 4.1, 'מאושר') ] },
  { id: 'pl_cohen_elec', projectId: 'p_cohen', number: 'E-201', title: 'תכנית חשמל ותקשורת', category: 'תכנית חשמל', scale: '1:50', layout: 'apartment-elec', sharedWithClient: false, tags: [], versions: [
    pv(1, '2026-04-02', 'u_shira', 'גרסה ראשונה לתיאום', 'DWG', 1.8, 'הוחלף', 'תצוגה לא נתמכת'), pv(2, '2026-05-14', 'u_shira', 'ייצוא PDF לאחר תיאום עם חשמלאי', 'PDF', 2.4, 'הוחלף'), pv(3, D(-20), 'u_shira', 'תוספת נקודות לאי מטבח', 'PDF', 2.5, 'בבדיקה פנימית') ] },
  { id: 'pl_cohen_ceiling', projectId: 'p_cohen', number: 'A-131', title: 'תכנית תקרות ותאורה', category: 'תכנית תקרה', scale: '1:50', layout: 'apartment-ceiling', sharedWithClient: true, tags: [], versions: [
    pv(1, '2026-05-20', 'u_noa', 'הנמכות גבס וקווי תאורה', 'PDF', 2.9, 'הוחלף'), pv(2, D(-7), 'u_noa', 'שינוי פס תאורה בסלון לפי בקשת לקוח', 'PDF', 3.0, 'נשלח ללקוח') ] },
  { id: 'pl_cohen_kitchen', projectId: 'p_cohen', number: 'D-401', title: 'פרט נגרות – מטבח ואי', category: 'פרט', scale: '1:20', layout: 'kitchen-detail', sharedWithClient: true, tags: ['נגרות'], versions: [
    pv(1, '2026-06-10', 'u_ori', 'פרט ראשוני לנגר', 'PDF', 1.6, 'הוחלף'), pv(2, D(-14), 'u_ori', 'עדכון מגירות ופינת קפה', 'PDF', 1.7, 'נדרשים תיקונים') ] },
  { id: 'pl_cohen_section', projectId: 'p_cohen', number: 'A-301', title: 'חתך A-A – מרפסת גג', category: 'חתך', scale: '1:50', layout: 'section', sharedWithClient: false, tags: [], versions: [
    pv(1, '2026-03-10', 'u_noa', 'חתך דרך מרפסת הגג והסוויטה', 'DXF', 0.9, 'מאושר', 'תצוגה לא נתמכת') ] },
  { id: 'pl_cohen_bath', projectId: 'p_cohen', number: 'D-420', title: 'פרט חדר רחצה הורים', category: 'פרט', scale: '1:20', layout: 'bath', sharedWithClient: true, tags: [], versions: [
    pv(1, D(-2), 'u_shira', 'פריסת קירות ואריחים', 'PDF', 1.2, 'בבדיקה פנימית', 'בעיבוד') ] },
  { id: 'pl_miz_ground', projectId: 'p_mizrahi', number: 'A-101', title: 'קומת קרקע – העמדת ריהוט', category: 'תכנית העמדה', scale: '1:100', layout: 'villa-ground', sharedWithClient: true, tags: [], versions: [
    pv(1, '2026-05-18', 'u_noa', 'חלופה א׳', 'PDF', 5.1, 'הוחלף'), pv(2, '2026-06-30', 'u_noa', 'לאחר פגישת קונספט', 'PDF', 5.4, 'מאושר') ] },
  { id: 'pl_miz_first', projectId: 'p_mizrahi', number: 'A-102', title: 'קומה א׳ – העמדת ריהוט', category: 'תכנית העמדה', scale: '1:100', layout: 'villa-first', sharedWithClient: true, tags: [], versions: [
    pv(1, D(-5), 'u_noa', 'טיוטה לבדיקה פנימית', 'PDF', 4.8, 'בבדיקה פנימית') ] },
  { id: 'pl_miz_elev', projectId: 'p_mizrahi', number: 'A-201', title: 'פריסה – קיר סלון בגובה כפול', category: 'חזית / פריסה', scale: '1:50', layout: 'elevation', sharedWithClient: true, tags: [], versions: [
    pv(1, D(-4), 'u_ori', 'חיפוי עץ אלון ונישת אח', 'PDF', 2.2, 'נשלח ללקוח') ] },
  { id: 'pl_miz_survey', projectId: 'p_mizrahi', number: 'S-001', title: 'הדמיה מבחוץ – חזית דרומית', category: 'הדמיה', scale: '—', layout: 'elevation', sharedWithClient: true, tags: ['הדמיה'], versions: [
    pv(1, '2026-04-02', 'u_ori', 'קובץ תמונה מהאדריכל החיצוני', 'JPG', 6.4, 'מאושר') ] },
  { id: 'pl_garin_layout', projectId: 'p_garin', number: 'A-101', title: 'תכנית העמדה – בית קפה', category: 'תכנית העמדה', scale: '1:50', layout: 'cafe', sharedWithClient: true, tags: [], versions: [
    pv(1, '2026-02-02', 'u_ori', 'קונספט', 'PDF', 2.1, 'הוחלף'), pv(2, '2026-03-12', 'u_ori', 'סופי לביצוע', 'PDF', 2.3, 'מאושר') ] },
  { id: 'pl_garin_bar', projectId: 'p_garin', number: 'D-410', title: 'פרט בר בטון', category: 'פרט', scale: '1:10', layout: 'bar-detail', sharedWithClient: true, tags: ['נגרות', 'בטון'], versions: [
    pv(1, '2026-04-08', 'u_shira', 'פרט ייצור', 'PDF', 1.1, 'מאושר') ] },
  { id: 'pl_fried_layout', projectId: 'p_friedman', number: 'A-101', title: 'תכנית העמדה – קומה 22', category: 'תכנית העמדה', scale: '1:100', layout: 'office', sharedWithClient: true, tags: [], versions: [
    pv(1, '2026-08-04', 'u_noa', 'חלופה ראשונה', 'PDF', 3.3, 'הוחלף'), pv(2, D(-3), 'u_noa', 'לאחר הערות השותפים – הגדלת חדר ישיבות ראשי', 'PDF', 3.5, 'נשלח ללקוח') ] },
  { id: 'pl_fried_part', projectId: 'p_friedman', number: 'A-102', title: 'תכנית מחיצות', category: 'תכנית קומה', scale: '1:100', layout: 'office-partitions', sharedWithClient: false, tags: [], versions: [
    pv(1, D(-1), 'u_shira', 'טיוטת עבודה', 'DWG', 2.7, 'טיוטה', 'תצוגה לא נתמכת') ] },
  { id: 'pl_ohayon_exist', projectId: 'p_ohayon', number: 'S-101', title: 'מצב קיים – מדידה', category: 'מדידה', scale: '1:50', layout: 'existing', sharedWithClient: true, tags: [], versions: [
    pv(1, D(-6), 'u_shira', 'משורטט מתוך מדידת מודד מוסמך', 'PDF', 1.4, 'מאושר'), pv(2, D(0), 'u_shira', 'קובץ DXF מהמודד – ממתין לעיבוד', 'DXF', 0.7, 'טיוטה', 'נכשל') ] },
  { id: 'pl_stern_kitchen', projectId: 'p_stern', number: 'A-110', title: 'מטבח – תכנית ופריסות', category: 'תכנית קומה', scale: '1:25', layout: 'kitchen-detail', sharedWithClient: true, tags: [], versions: [
    pv(1, '2026-08-20', 'u_ori', 'תכנון ראשון', 'PDF', 1.9, 'הוחלף'), pv(2, D(-12), 'u_ori', 'מאושר ע״י הלקוחה', 'PDF', 2.0, 'מאושר') ] },
  { id: 'pl_hanamal_lobby', projectId: 'p_hanamal', number: 'A-101', title: 'לובי ובר – קונספט', category: 'תכנית העמדה', scale: '1:100', layout: 'cafe', sharedWithClient: false, tags: [], versions: [
    pv(1, '2026-07-28', 'u_noa', 'קונספט לובי', 'PDF', 4.4, 'נשלח ללקוח') ] },
  { id: 'pl_bd_final', projectId: 'p_bendavid', number: 'A-101', title: 'תכנית סופית – As Made', category: 'תכנית קומה', scale: '1:50', layout: 'apartment', sharedWithClient: true, tags: ['As Made'], versions: [
    pv(1, '2026-07-28', 'u_yoav', 'תיעוד ביצוע סופי', 'PDF', 3.1, 'מאושר') ] },
];

export const annotations: T.Annotation[] = [
  { id: 'an1', planId: 'pl_cohen_floor', version: 4, kind: 'issue', x: 0.54, y: 0.42, text: 'רוחב מעבר בין האי לארון גבוה 92 ס״מ – מומלץ לפחות 100 ס״מ', authorId: 'u_yoav', at: DT(-6, '10:20'), status: 'פתוח', severity: 'בינונית' },
  { id: 'an2', planId: 'pl_cohen_floor', version: 4, kind: 'comment', x: 0.22, y: 0.3, text: 'הלקוחה ביקשה לבדוק נישה לספרייה בקיר הזה', authorId: 'u_ori', at: DT(-5, '15:02'), status: 'פתוח' },
  { id: 'an3', planId: 'pl_cohen_floor', version: 4, kind: 'issue', x: 0.78, y: 0.68, text: 'פתיחת דלת חדר רחצה מתנגשת בארון – להפוך כיוון', authorId: 'u_daniel', at: DT(-3, '09:14'), status: 'פתוח', severity: 'גבוהה' },
  { id: an4id(), planId: 'pl_cohen_floor', version: 4, kind: 'measure', x: 0.12, y: 0.86, x2: 0.48, y2: 0.86, text: '6.20 מ׳ (מידה מהשרטוט)', authorId: 'u_shira', at: DT(-4, '11:00'), status: 'פתוח' },
  { id: 'an5', planId: 'pl_cohen_floor', version: 3, kind: 'issue', x: 0.6, y: 0.2, text: 'חלון סלון לא תואם למדידה – עודכן בגרסה 4', authorId: 'u_noa', at: '2026-05-01T12:00', status: 'טופל', severity: 'בינונית' },
  { id: 'an6', planId: 'pl_cohen_kitchen', version: 2, kind: 'issue', x: 0.4, y: 0.55, text: 'גובה משטח באי 92 ס״מ – הלקוחה ביקשה 95', authorId: 'u_ori', at: DT(-8, '13:30'), status: 'פתוח', severity: 'בינונית' },
  { id: 'an7', planId: 'pl_cohen_kitchen', version: 2, kind: 'comment', x: 0.7, y: 0.3, text: 'לאשר מול הספק שהמגירות יכולות לקבל טריקה שקטה בעומק 60', authorId: 'u_yoav', at: DT(-7, '09:00'), status: 'פתוח' },
  { id: 'an8', planId: 'pl_cohen_ceiling', version: 2, kind: 'comment', x: 0.35, y: 0.45, text: 'פס תאורה הוזז 30 ס״מ לכיוון החלון לבקשת דנה', authorId: 'u_noa', at: DT(-7, '16:40'), status: 'טופל' },
  { id: 'an9', planId: 'pl_fried_layout', version: 2, kind: 'issue', x: 0.3, y: 0.35, text: 'חדר ישיבות ראשי צמוד לקיר פיר – לבדוק אקוסטיקה', authorId: 'u_noa', at: DT(-2, '11:00'), status: 'פתוח', severity: 'גבוהה' },
  { id: 'an10', planId: 'pl_miz_ground', version: 2, kind: 'comment', x: 0.5, y: 0.5, text: 'רונית אהבה את האי – לשמור על הכיוון', authorId: 'u_michal', at: '2026-07-02T10:00', status: 'טופל' },
];
function an4id() { return 'an4'; }

const sp = (id: string, projectId: string, room: string, category: string, name: string, supplierId: string, sku: string, qty: number, unit: string, unitPrice: number, status: T.SpecStatus, swatch: string, pattern: T.SpecItem['pattern'], extra: Partial<T.SpecItem> = {}): T.SpecItem => ({
  id, projectId, room, category, name, supplierId, sku, qty, unit, unitPrice, status, swatch, pattern, notes: '', sharedWithClient: status !== 'טיוטה', alternatives: [], leadTimeWeeks: 4, ...extra,
});

export const specItems: T.SpecItem[] = [
  // Cohen
  sp('s1', 'p_cohen', 'מטבח', 'משטחים', 'שיש קלקטה גולד – משטח אי ועבודה', 'sup_hadar', 'CAL-GLD-20', 9.6, 'מ״ר', 3400, 'מאושר', '#EDE7DA', 'stone', { notes: 'עובי 2 ס״מ, קנט ישר 6 ס״מ באי', leadTimeWeeks: 5, poId: 'po_2', alternatives: [{ name: 'קוורץ דמוי קלקטה', unitPrice: 1650, supplierId: 'sup_hadar', note: 'עמיד יותר, פחות טבעי' }] }),
  sp('s2', 'p_cohen', 'מטבח', 'נגרות', 'חזיתות מטבח פורניר אלון מעושן', 'sup_shalom', 'NG-OAK-SM', 1, 'קומפלט', 118000, 'מאושר', '#8A6A4A', 'wood', { leadTimeWeeks: 8, poId: 'po_1' }),
  sp('s3', 'p_cohen', 'מטבח', 'סניטריה', 'ברז מטבח נשלף – ניקל מוברש', 'sup_sanit', 'KF-220-BN', 1, 'יח׳', 2850, 'ממתין לאישור לקוח', '#B9B4A8', 'metal', { alternatives: [{ name: 'ברז שחור מט', unitPrice: 2400, supplierId: 'sup_sanit', note: 'זמין מהמלאי' }] }),
  sp('s4', 'p_cohen', 'מטבח', 'תאורה', 'מנורות תלייה מעל האי – זכוכית מעושנת', 'sup_light', 'PD-SMK-3', 3, 'יח׳', 1950, 'ממתין לאישור לקוח', '#6E6A66', 'glass', { notes: 'תלייה בגובה 75 ס״מ מעל המשטח' }),
  sp('s5', 'p_cohen', 'סלון', 'ריצוף', 'פרקט אלון אירופאי – הרינגבון', 'sup_hadar', 'HB-OAK-14', 92, 'מ״ר', 420, 'מאושר', '#B48A5E', 'wood', { poId: 'po_3', leadTimeWeeks: 3 }),
  sp('s6', 'p_cohen', 'סלון', 'ריהוט', 'ספה מודולרית 3.2 מ׳ – בד בוקלה', 'sup_nordic', 'SF-MOD-320', 1, 'יח׳', 28500, 'בקשת שינוי', '#E8E2D6', 'fabric', { notes: 'הלקוחה מבקשת לבדוק גוון כהה יותר', alternatives: [{ name: 'אותה ספה בבד פשתן אפור', unitPrice: 27200, supplierId: 'sup_nordic', note: '' }, { name: 'ספה 2.8 מ׳ + כורסה', unitPrice: 31000, supplierId: 'sup_nordic', note: '' }], leadTimeWeeks: 10 }),
  sp('s7', 'p_cohen', 'סלון', 'תאורה', 'פס תאורה לינארי שקוע 3000K', 'sup_light', 'LN-30-3K', 14, 'מ׳', 640, 'מאושר', '#D7D3CB', 'metal', { poId: 'po_4' }),
  sp('s8', 'p_cohen', 'סלון', 'וילונות', 'וילון פשתן כפול + האפלה', 'sup_textile', 'CR-LIN-DBL', 4, 'יח׳', 3200, 'טיוטה', '#DCD3C3', 'fabric'),
  sp('s9', 'p_cohen', 'סוויטת הורים', 'ריצוף', 'פרקט אלון – פריסה ישרה', 'sup_hadar', 'ST-OAK-14', 24, 'מ״ר', 380, 'מאושר', '#B89068', 'wood', { poId: 'po_3' }),
  sp('s10', 'p_cohen', 'סוויטת הורים', 'נגרות', 'ארון הזזה פורניר + מראה', 'sup_shalom', 'NG-WR-SLD', 1, 'קומפלט', 34000, 'מאושר', '#9C7B58', 'wood', { poId: 'po_1' }),
  sp('s11', 'p_cohen', 'חדר רחצה הורים', 'חיפוי', 'אריח קרמיקה 7.5×30 ירוק זית', 'sup_hadar', 'TL-OLV-730', 28, 'מ״ר', 310, 'ממתין לאישור לקוח', '#7D8A63', 'tile', { alternatives: [{ name: 'אריח זליג׳ לבן', unitPrice: 360, supplierId: 'sup_hadar', note: 'מראה בעבודת יד' }] }),
  sp('s12', 'p_cohen', 'חדר רחצה הורים', 'סניטריה', 'ארון אמבטיה תלוי 120 + כיור כפול', 'sup_sanit', 'VN-120-DB', 1, 'יח׳', 7800, 'מאושר', '#C8BBA6', 'wood'),
  sp('s13', 'p_cohen', 'חדר רחצה הורים', 'סניטריה', 'מערכת מקלחת סמויה + ראש 30 ס״מ', 'sup_sanit', 'SH-CON-30', 1, 'קומפלט', 5400, 'מאושר', '#A7A39A', 'metal'),
  sp('s14', 'p_cohen', 'מרפסת גג', 'ריהוט חוץ', 'פינת אוכל חוץ טיק ל-8', 'sup_nordic', 'OD-TEAK-8', 1, 'סט', 21500, 'ממתין לאישור לקוח', '#A07A50', 'wood', { leadTimeWeeks: 12 }),
  // Mizrahi
  sp('m1', 'p_mizrahi', 'סלון', 'ריצוף', 'אבן גיר ירושלמית מסותתת 60×120', 'sup_hadar', 'JS-LIM-612', 168, 'מ״ר', 520, 'ממתין לאישור לקוח', '#E3DACB', 'stone', { alternatives: [{ name: 'פורצלן דמוי אבן 120×120', unitPrice: 290, supplierId: 'sup_hadar', note: 'חוסך כ-38,000 ₪' }] }),
  sp('m2', 'p_mizrahi', 'סלון', 'חיפוי', 'חיפוי עץ אלון לקיר בגובה כפול', 'sup_shalom', 'WL-OAK-DH', 38, 'מ״ר', 1450, 'ממתין לאישור לקוח', '#9A7652', 'wood'),
  sp('m3', 'p_mizrahi', 'סלון', 'תאורה', 'נברשת פיסולית 1.6 מ׳', 'sup_light', 'CH-SCL-160', 1, 'יח׳', 24000, 'ממתין לאישור לקוח', '#C9B98F', 'metal', { leadTimeWeeks: 14 }),
  sp('m4', 'p_mizrahi', 'מטבח', 'נגרות', 'מטבח שף – לכה מט + אי נירוסטה', 'sup_galed', 'KT-CHEF-01', 1, 'קומפלט', 165000, 'ממתין לאישור לקוח', '#3E4448', 'metal', { leadTimeWeeks: 10 }),
  sp('m5', 'p_mizrahi', 'מטבח', 'משטחים', 'פורצלן גדול פורמט – נרו מרקינה', 'sup_hadar', 'PR-NRM-12', 14, 'מ״ר', 1100, 'טיוטה', '#2C2B2A', 'stone'),
  sp('m6', 'p_mizrahi', 'ספא', 'חיפוי', 'אריח טרקוטה מט 20×20', 'sup_hadar', 'TC-MAT-20', 46, 'מ״ר', 280, 'מאושר', '#B77A5A', 'tile'),
  // Garin
  sp('g1', 'p_garin', 'בר', 'משטחים', 'בטון מוחלק – בר ומשטח', 'sup_galed', 'CN-BAR-01', 1, 'קומפלט', 38000, 'מאושר', '#9C9A94', 'stone', { poId: 'po_6' }),
  sp('g2', 'p_garin', 'אזור ישיבה', 'ריהוט', 'כיסא בר עץ אגוז', 'sup_nordic', 'BS-WAL-75', 10, 'יח׳', 890, 'מאושר', '#6B4B33', 'wood', { poId: 'po_7' }),
  sp('g3', 'p_garin', 'אזור ישיבה', 'תאורה', 'מנורות תלייה כדוריות אופל', 'sup_light', 'GL-OP-30', 8, 'יח׳', 760, 'מאושר', '#EFEBE3', 'glass'),
  // Stern
  sp('st1', 'p_stern', 'מטבח', 'נגרות', 'מטבח U – פורמייקה מט ירוק מרווה', 'sup_galed', 'KT-U-SAGE', 1, 'קומפלט', 62000, 'מאושר', '#9AA58B', 'plain', { leadTimeWeeks: 6 }),
  sp('st2', 'p_stern', 'חדר רחצה ילדים', 'חיפוי', 'אריח טראצו 60×60', 'sup_hadar', 'TZ-6060-W', 22, 'מ״ר', 240, 'מאושר', '#E2DED6', 'stone'),
  sp('st3', 'p_stern', 'חדר רחצה הורים', 'סניטריה', 'אסלה תלויה + מיכל סמוי', 'sup_sanit', 'WC-HNG-01', 2, 'יח׳', 2100, 'מאושר', '#EEEEEA', 'plain'),
];

export const specVersions: T.SpecVersion[] = [
  { id: 'sv1', projectId: 'p_cohen', v: 1, date: '2026-03-28', authorId: 'u_ori', summary: 'מפרט ראשון – מטבח, סלון, סוויטה', total: 241000 },
  { id: 'sv2', projectId: 'p_cohen', v: 2, date: '2026-05-10', authorId: 'u_ori', summary: 'החלפת קוורץ בשיש טבעי לאי; הוספת פרקט הרינגבון', total: 271600 },
  { id: 'sv3', projectId: 'p_cohen', v: 3, date: D(-8), authorId: 'u_ori', summary: 'הוספת ריהוט חוץ ומקלחת סמויה; ספה בבקשת שינוי', total: 0 },
  { id: 'sv4', projectId: 'p_mizrahi', v: 1, date: D(-3), authorId: 'u_noa', summary: 'מפרט קומת קרקע נשלח לאישור', total: 0 },
  { id: 'sv5', projectId: 'p_garin', v: 1, date: '2026-03-01', authorId: 'u_ori', summary: 'מפרט סופי', total: 0 },
  { id: 'sv6', projectId: 'p_stern', v: 1, date: D(-12), authorId: 'u_ori', summary: 'מפרט מאושר', total: 0 },
];

export const approvals: T.Approval[] = [
  { id: 'ap_1', projectId: 'p_cohen', kind: 'מפרט', refId: 's3', title: 'ברז מטבח נשלף – ניקל מוברש', requestedBy: 'u_ori', requestedAt: D(-4), dueAt: D(1), status: 'ממתין', contactId: 'cc_dana' },
  { id: 'ap_2', projectId: 'p_cohen', kind: 'מפרט', refId: 's4', title: 'מנורות תלייה מעל האי', requestedBy: 'u_ori', requestedAt: D(-4), dueAt: D(1), status: 'ממתין', contactId: 'cc_dana' },
  { id: 'ap_3', projectId: 'p_mizrahi', kind: 'מפרט', refId: 'sv4', title: 'מפרט חומרים קומת קרקע (4 פריטים)', requestedBy: 'u_noa', requestedAt: D(-3), dueAt: D(4), status: 'ממתין', contactId: 'cc_ronit', amount: 87360 + 55100 + 24000 + 165000 },
  { id: 'ap_4', projectId: 'p_cohen', kind: 'שרטוט', refId: 'pl_cohen_ceiling', title: 'תכנית תקרות ותאורה – גרסה 2', requestedBy: 'u_noa', requestedAt: D(-7), dueAt: D(-1), status: 'ממתין', contactId: 'cc_dana' },
  { id: 'ap_5', projectId: 'p_cohen', kind: 'מפרט', refId: 's11', title: 'אריח ירוק זית לחדר רחצה הורים', requestedBy: 'u_ori', requestedAt: D(-2), dueAt: D(3), status: 'ממתין', contactId: 'cc_dana' },
  { id: 'ap_6', projectId: 'p_cohen', kind: 'מפרט', refId: 's14', title: 'פינת אוכל חוץ טיק ל-8', requestedBy: 'u_ori', requestedAt: D(-1), dueAt: D(6), status: 'ממתין', contactId: 'cc_dana' },
  { id: 'ap_7', projectId: 'p_cohen', kind: 'מפרט', refId: 's6', title: 'ספה מודולרית 3.2 מ׳', requestedBy: 'u_ori', requestedAt: D(-10), dueAt: D(-5), status: 'בקשת שינוי', contactId: 'cc_dana', decidedAt: D(-6), comment: 'אפשר לראות את הבד בגוון כהה יותר? מפחדת מכתמים עם הילדים.' },
  { id: 'ap_8', projectId: 'p_cohen', kind: 'מפרט', refId: 's1', title: 'שיש קלקטה גולד לאי', requestedBy: 'u_ori', requestedAt: '2026-05-08', dueAt: '2026-05-15', status: 'אושר', contactId: 'cc_dana', decidedAt: '2026-05-12', comment: 'מהמם! מאשרים.' },
  { id: 'ap_9', projectId: 'p_cohen', kind: 'שרטוט', refId: 'pl_cohen_floor', title: 'תכנית קומה – גרסה 4', requestedBy: 'u_shira', requestedAt: D(-11), dueAt: D(-6), status: 'אושר', contactId: 'cc_dana', decidedAt: D(-9) },
  { id: 'ap_10', projectId: 'p_mizrahi', kind: 'שרטוט', refId: 'pl_miz_elev', title: 'פריסת קיר סלון בגובה כפול', requestedBy: 'u_ori', requestedAt: D(-4), dueAt: D(3), status: 'ממתין', contactId: 'cc_ronit' },
  { id: 'ap_11', projectId: 'p_friedman', kind: 'שרטוט', refId: 'pl_fried_layout', title: 'תכנית העמדה – גרסה 2', requestedBy: 'u_noa', requestedAt: D(-3), dueAt: D(2), status: 'ממתין', contactId: 'cc_yael' },
  { id: 'ap_12', projectId: 'p_garin', kind: 'שינוי תקציב', refId: 'bl', title: 'תוספת שילוט מואר – 6,800 ₪', requestedBy: 'u_ori', requestedAt: D(-9), dueAt: D(-4), status: 'אושר', contactId: 'cc_omer', decidedAt: D(-7), amount: 6800 },
  { id: 'ap_13', projectId: 'p_stern', kind: 'שרטוט', refId: 'pl_stern_kitchen', title: 'מטבח – תכנית ופריסות', requestedBy: 'u_ori', requestedAt: D(-15), dueAt: D(-10), status: 'אושר', contactId: 'cc_nurit', decidedAt: D(-12) },
  { id: 'ap_14', projectId: 'p_mizrahi', kind: 'מפרט', refId: 'm6', title: 'אריח טרקוטה לספא', requestedBy: 'u_noa', requestedAt: '2026-08-10', dueAt: '2026-08-17', status: 'אושר', contactId: 'cc_ronit', decidedAt: '2026-08-12' },
  { id: 'ap_15', projectId: 'p_cohen', kind: 'הצעת מחיר', refId: 'doc_q2', title: 'הצעת מחיר נגרות – תוספת ספרייה', requestedBy: 'u_yoav', requestedAt: '2026-07-01', dueAt: '2026-07-08', status: 'נדחה', contactId: 'cc_dana', decidedAt: '2026-07-05', comment: 'כרגע מוותרים, נחזור לזה אחרי המעבר.', amount: 14500 },
];

const dv = (v: number, date: string, authorId: string, note: string, sizeKb: number): T.DocVersion => ({ v, date, authorId, note, sizeKb });
export const DOC_FOLDERS = ['חוזים והסכמים', 'היתרים ורישוי', 'הצעות מחיר', 'פרוטוקולים', 'הדמיות ומצגות', 'אחריות ותעודות', 'חשבוניות וקבלות', 'כללי משרד'];
export const documents: T.Doc[] = [
  { id: 'doc_c1', projectId: 'p_cohen', folder: 'חוזים והסכמים', name: 'הסכם שירותי תכנון ופיקוח – משפחת כהן', fileType: 'PDF', sharedWithClient: true, access: 'בעלים ומנהלים', tags: ['חתום'], description: 'הסכם חתום כולל נספח שכר טרחה.', versions: [dv(1, '2025-11-08', 'u_yoav', 'טיוטה', 380), dv(2, '2025-11-10', 'u_yoav', 'חתום ע״י שני הצדדים', 412)] },
  { id: 'doc_c2', projectId: 'p_cohen', folder: 'היתרים ורישוי', name: 'אישור ועד בית לעבודות במרפסת גג', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, '2026-05-20', 'u_daniel', 'סריקה', 220)] },
  { id: 'doc_c3', projectId: 'p_cohen', folder: 'פרוטוקולים', name: 'סיכום פגישת בחירת חומרים 12.10', fileType: 'DOCX', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, D(-13), 'u_ori', '', 48)] },
  { id: 'doc_q1', projectId: 'p_cohen', folder: 'הצעות מחיר', name: 'הצעת מחיר נגרות אומן שלום', fileType: 'PDF', sharedWithClient: false, access: 'צוות הפרויקט', tags: ['נגרות'], description: '', versions: [dv(1, '2026-05-30', 'u_yoav', '', 156), dv(2, '2026-06-08', 'u_yoav', 'לאחר מו״מ – הנחה 6%', 158)] },
  { id: 'doc_q2', projectId: 'p_cohen', folder: 'הצעות מחיר', name: 'הצעת מחיר – תוספת ספרייה', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, '2026-07-01', 'u_yoav', '', 92)] },
  { id: 'doc_c4', projectId: 'p_cohen', folder: 'הדמיות ומצגות', name: 'הדמיות סלון ומטבח – סט סופי', fileType: 'ZIP', sharedWithClient: true, access: 'צוות הפרויקט', tags: ['הדמיות'], description: '8 הדמיות ברזולוציה מלאה.', versions: [dv(1, '2026-04-18', 'u_ori', '', 48200)] },
  { id: 'doc_c5', projectId: 'p_cohen', folder: 'חשבוניות וקבלות', name: 'קבלה – מקדמת נגרות', fileType: 'PDF', sharedWithClient: false, access: 'בעלים ומנהלים', tags: [], description: '', versions: [dv(1, '2026-06-12', 'u_yoav', '', 64)] },
  { id: 'doc_c6', projectId: 'p_cohen', folder: 'פרוטוקולים', name: 'דוח פיקוח עליון – ספטמבר', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: ['פיקוח'], description: '', versions: [dv(1, D(-24), 'u_daniel', '', 2100)] },
  { id: 'doc_m1', projectId: 'p_mizrahi', folder: 'חוזים והסכמים', name: 'הסכם עיצוב פנים – מזרחי', fileType: 'PDF', sharedWithClient: true, access: 'בעלים ומנהלים', tags: ['חתום'], description: '', versions: [dv(1, '2026-02-15', 'u_michal', '', 390)] },
  { id: 'doc_m2', projectId: 'p_mizrahi', folder: 'הדמיות ומצגות', name: 'מצגת קונספט – Coastal Calm', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, '2026-04-01', 'u_ori', '', 18400), dv(2, '2026-04-09', 'u_ori', 'תיקונים אחרי משוב', 18900)] },
  { id: 'doc_m3', projectId: 'p_mizrahi', folder: 'פרוטוקולים', name: 'פרוטוקול תיאום עם אדריכל הבניין', fileType: 'DOCX', sharedWithClient: false, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, D(-20), 'u_noa', '', 36)] },
  { id: 'doc_g1', projectId: 'p_garin', folder: 'היתרים ורישוי', name: 'היתר שילוט – עיריית תל אביב', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, '2026-05-10', 'u_ori', '', 510)] },
  { id: 'doc_g2', projectId: 'p_garin', folder: 'אחריות ותעודות', name: 'תעודת אחריות – מערכת מיזוג', fileType: 'PDF', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, D(-5), 'u_daniel', '', 140)] },
  { id: 'doc_f1', projectId: 'p_friedman', folder: 'חוזים והסכמים', name: 'הסכם התקשרות – פרידמן ושות׳', fileType: 'PDF', sharedWithClient: true, access: 'בעלים ומנהלים', tags: ['חתום'], description: '', versions: [dv(1, '2026-06-01', 'u_michal', '', 420)] },
  { id: 'doc_f2', projectId: 'p_friedman', folder: 'פרוטוקולים', name: 'פרוגרמת צרכים מאושרת', fileType: 'XLSX', sharedWithClient: true, access: 'צוות הפרויקט', tags: [], description: '', versions: [dv(1, '2026-07-15', 'u_noa', '', 88)] },
  { id: 'doc_s1', projectId: 'p_stern', folder: 'חוזים והסכמים', name: 'הסכם תכנון – שטרן', fileType: 'PDF', sharedWithClient: true, access: 'בעלים ומנהלים', tags: [], description: '', versions: [dv(1, '2026-06-20', 'u_ori', '', 300)] },
  { id: 'doc_o1', projectId: null, folder: 'כללי משרד', name: 'תבנית הסכם שירותים 2026', fileType: 'DOCX', sharedWithClient: false, access: 'בעלים ומנהלים', tags: ['תבנית'], description: '', versions: [dv(1, '2026-01-02', 'u_michal', '', 64), dv(2, '2026-03-15', 'u_michal', 'עדכון סעיף פיקוח עליון', 66)] },
  { id: 'doc_o2', projectId: null, folder: 'כללי משרד', name: 'פוליסת ביטוח אחריות מקצועית', fileType: 'PDF', sharedWithClient: false, access: 'בעלים ומנהלים', tags: [], description: '', versions: [dv(1, '2025-11-01', 'u_michal', '', 900)] },
  { id: 'doc_o3', projectId: null, folder: 'כללי משרד', name: 'מחירון ספקים מועדפים', fileType: 'XLSX', sharedWithClient: false, access: 'כל המשרד', tags: [], description: '', versions: [dv(1, D(-30), 'u_yoav', '', 120)] },
];

export const meetings: T.Meeting[] = [
  { id: 'mt_1', projectId: 'p_cohen', title: 'סיור באתר עם קבלן החשמל', kind: 'site', date: D(0), start: '11:00', end: '12:00', location: 'ארלוזורוב 112, ת״א', attendeeIds: ['u_daniel', 'u_yoav'], contactIds: [], supplierIds: ['sup_adar'], agenda: ['בדיקת נקודות באי', 'הכנות למזגנים מיני מרכזי', 'לוח זמנים לסגירת גבס'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_2', projectId: 'p_cohen', title: 'בחירת שיש אצל הספק', kind: 'supplier', date: D(0), start: '14:00', end: '15:00', location: 'אבן וקרמיקה הדר, חולון', attendeeIds: ['u_ori'], contactIds: ['cc_dana'], supplierIds: ['sup_hadar'], agenda: ['בחירת לוח לאי', 'אישור כיוון גידים'], summary: '', followUpTaskIds: ['t1'], sharedWithClient: true, status: 'מתוכננת' },
  { id: 'mt_3', projectId: null, title: 'ישיבת צוות שבועית', kind: 'team', date: D(0), start: '09:30', end: '10:15', location: 'משרד – חדר ישיבות', attendeeIds: ['u_michal', 'u_yoav', 'u_noa', 'u_ori', 'u_shira', 'u_daniel'], contactIds: [], supplierIds: [], agenda: ['סטטוס פרויקטים', 'עומסים לשבוע', 'מסירת גרעין'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_4', projectId: 'p_friedman', title: 'הצגת תכנית העמדה לשותפים', kind: 'client', date: D(-4), start: '16:00', end: '17:30', location: 'מגדל הבורסה, קומה 22', attendeeIds: ['u_noa', 'u_michal'], contactIds: ['cc_yael'], supplierIds: [], agenda: ['הצגת חלופה מעודכנת', 'חדרי ישיבות', 'לוח זמנים'], summary: 'השותפים ביקשו להגדיל את חדר הישיבות הראשי ל-14 משתתפים ולהוסיף חדר שקט. סוכם לעדכן תכנית עד יום ראשון ולשלוח לאישור בפורטל.', followUpTaskIds: ['t20'], sharedWithClient: true, status: 'התקיימה' },
  { id: 'mt_5', projectId: 'p_mizrahi', title: 'פגישת מפרטים – קומת קרקע', kind: 'client', date: D(2), start: '18:00', end: '19:30', location: 'משרד – אולם תצוגה', attendeeIds: ['u_michal', 'u_noa', 'u_ori'], contactIds: ['cc_ronit', 'cc_alon'], supplierIds: [], agenda: ['מעבר על מפרט קומת קרקע', 'חלופת פורצלן לריצוף', 'נברשת'], summary: '', followUpTaskIds: [], sharedWithClient: true, status: 'מתוכננת' },
  { id: 'mt_6', projectId: 'p_rosen', title: 'פגישת היכרות – משפחת רוזן', kind: 'client', date: D(2), start: '10:00', end: '11:00', location: 'הירקון 14, כפר סבא', attendeeIds: ['u_michal'], contactIds: ['cc_tamar'], supplierIds: [], agenda: ['סיור בבית', 'צרכים ותקציב', 'הצגת תהליך עבודה'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_7', projectId: 'p_garin', title: 'סיור מסירה מקדים', kind: 'site', date: D(3), start: '08:30', end: '10:00', location: 'פלורנטין 31', attendeeIds: ['u_ori', 'u_daniel'], contactIds: ['cc_omer'], supplierIds: ['sup_galed'], agenda: ['מעבר על רשימת תיקונים', 'בדיקת ציוד'], summary: '', followUpTaskIds: [], sharedWithClient: true, status: 'מתוכננת' },
  { id: 'mt_8', projectId: 'p_stern', title: 'מדידה סופית למטבח עם הנגר', kind: 'site', date: D(1), start: '13:00', end: '14:00', location: 'עמק החולה 5, מודיעין', attendeeIds: ['u_ori'], contactIds: ['cc_nurit'], supplierIds: ['sup_galed'], agenda: ['מדידה', 'נקודות מים וחשמל'], summary: '', followUpTaskIds: [], sharedWithClient: true, status: 'מתוכננת' },
  { id: 'mt_9', projectId: 'p_cohen', title: 'פגישת עדכון חודשית עם משפחת כהן', kind: 'client', date: D(-13), start: '19:00', end: '20:00', location: 'זום', attendeeIds: ['u_yoav', 'u_ori'], contactIds: ['cc_dana', 'cc_avi'], supplierIds: [], agenda: ['סטטוס ביצוע', 'אישורים פתוחים', 'בחירת ידיות'], summary: 'אושרו ידיות שחור מט. דנה ביקשה לראות ספה בגוון כהה. נקבע סיור בחירת שיש.', followUpTaskIds: ['t10'], sharedWithClient: true, status: 'התקיימה' },
  { id: 'mt_10', projectId: 'p_ohayon', title: 'הצגת חלופות תכנון', kind: 'client', date: D(10), start: '18:30', end: '19:30', location: 'משרד', attendeeIds: ['u_ori'], contactIds: ['cc_moran'], supplierIds: [], agenda: ['חלופה א׳ – מטבח פתוח', 'חלופה ב׳ – מטבח סגור'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_11', projectId: null, title: 'ישיבת צוות שבועית', kind: 'team', date: D(7), start: '09:30', end: '10:15', location: 'משרד – חדר ישיבות', attendeeIds: ['u_michal', 'u_yoav', 'u_noa', 'u_ori', 'u_shira', 'u_daniel'], contactIds: [], supplierIds: [], agenda: [], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_12', projectId: 'p_cohen', title: 'סיור פיקוח שבועי', kind: 'site', date: D(4), start: '08:00', end: '09:30', location: 'ארלוזורוב 112, ת״א', attendeeIds: ['u_daniel'], contactIds: [], supplierIds: [], agenda: ['איטום מרפסת', 'גבס'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
  { id: 'mt_13', projectId: 'p_friedman', title: 'פגישה עם יועץ אקוסטיקה', kind: 'supplier', date: D(1), start: '15:00', end: '16:00', location: 'זום', attendeeIds: ['u_noa'], contactIds: [], supplierIds: [], agenda: ['חדרי ישיבות', 'מחיצות זכוכית'], summary: '', followUpTaskIds: [], sharedWithClient: false, status: 'מתוכננת' },
];

export const absences: T.Absence[] = [
  { id: 'ab1', userId: 'u_noa', from: D(5), to: D(9), kind: 'חופשה', note: 'חופשה משפחתית' },
  { id: 'ab2', userId: 'u_daniel', from: D(15), to: D(29), kind: 'מילואים', note: 'צו 8 – תאריך סיום משוער' },
  { id: 'ab3', userId: 'u_shira', from: D(-1), to: D(-1), kind: 'מחלה', note: '' },
];

export const suppliers: T.Supplier[] = [
  { id: 'sup_hadar', officeId: OFFICE_ID, name: 'אבן וקרמיקה הדר', kind: 'ספק', category: 'ריצוף, חיפוי ושיש', contact: 'משה הדר', phone: '03-555-0301', email: 'orders@hadar-stone.example.co.il', city: 'חולון', rating: 4.6, paymentTerms: 'שוטף + 30', notes: 'מחסן לוחות שיש גדול. לבקש תמיד הנחת אדריכלים 12%.' },
  { id: 'sup_shalom', officeId: OFFICE_ID, name: 'נגרות אומן שלום', kind: 'בעל מקצוע', category: 'נגרות בהתאמה אישית', contact: 'שלום אוחנה', phone: '052-555-0302', email: 'shalom@omanshalom.example.co.il', city: 'ראשון לציון', rating: 4.8, paymentTerms: '40% מקדמה, 60% בהתקנה', notes: 'איכות גבוהה, זמני ייצור 8–10 שבועות.' },
  { id: 'sup_light', officeId: OFFICE_ID, name: 'תאורה בהירה בע״מ', kind: 'ספק', category: 'תאורה אדריכלית ודקורטיבית', contact: 'רותם שגיא', phone: '03-555-0303', email: 'projects@bhira-light.example.co.il', city: 'תל אביב-יפו', rating: 4.3, paymentTerms: 'שוטף + 45', notes: '' },
  { id: 'sup_sanit', officeId: OFFICE_ID, name: 'סניטריה פלוס', kind: 'ספק', category: 'כלים סניטריים וברזים', contact: 'גלעד פרץ', phone: '09-555-0304', email: 'sales@sanitplus.example.co.il', city: 'נתניה', rating: 4.1, paymentTerms: 'שוטף + 30', notes: '' },
  { id: 'sup_nordic', officeId: OFFICE_ID, name: 'נורדיקה רהיטים', kind: 'ספק', category: 'ריהוט פנים וחוץ', contact: 'אנה ליבוביץ', phone: '03-555-0305', email: 'b2b@nordica.example.co.il', city: 'הרצליה', rating: 4.4, paymentTerms: '50% בהזמנה', notes: 'זמני יבוא ארוכים בריהוט חוץ.' },
  { id: 'sup_textile', officeId: OFFICE_ID, name: 'טקסטיל ורד', kind: 'ספק', category: 'וילונות וריפוד', contact: 'ורד מלכה', phone: '054-555-0306', email: 'vered@vered-textile.example.co.il', city: 'רמת גן', rating: 4.5, paymentTerms: 'שוטף + 30', notes: '' },
  { id: 'sup_galed', officeId: OFFICE_ID, name: 'מטבחי גל-עד', kind: 'ספק', category: 'מטבחים ומשטחים', contact: 'עידו גל-עד', phone: '08-555-0307', email: 'ido@galed-kitchens.example.co.il', city: 'מודיעין', rating: 4.2, paymentTerms: '30% מקדמה', notes: '' },
  { id: 'sup_adar', officeId: OFFICE_ID, name: 'אדר הנדסת חשמל', kind: 'קבלן', category: 'חשמל ותקשורת', contact: 'יוסי אדר', phone: '050-555-0308', email: 'yossi@adar-elec.example.co.il', city: 'בני ברק', rating: 4.0, paymentTerms: 'לפי אבני דרך', notes: 'חשמלאי מוסמך, עובד עם הקבלן הראשי בכהן.' },
  { id: 'sup_bina', officeId: OFFICE_ID, name: 'בינה בנייה ושיפוצים', kind: 'קבלן', category: 'קבלן ביצוע ראשי', contact: 'סמי חדד', phone: '052-555-0309', email: 'sami@bina-build.example.co.il', city: 'פתח תקווה', rating: 4.2, paymentTerms: 'חשבונות חלקיים חודשיים', notes: 'קבלן ראשי בכהן ובשטרן.' },
];

let poi = 0;
const it = (name: string, qty: number, unit: string, unitPrice: number, received = 0, specItemId?: string): T.POItem => ({ id: 'pi' + ++poi, name, qty, unit, unitPrice, received, specItemId });
export const purchaseOrders: T.PurchaseOrder[] = [
  { id: 'po_1', number: 'PO-2026-0112', projectId: 'p_cohen', supplierId: 'sup_shalom', status: 'בייצור', createdAt: '2026-06-12', createdBy: 'u_yoav', expectedDelivery: D(24), paidBy: 'לקוח ישירות', notes: 'מקדמה 40% שולמה ע״י הלקוח.', items: [it('מטבח – חזיתות פורניר אלון מעושן', 1, 'קומפלט', 118000, 0, 's2'), it('ארון הזזה סוויטה', 1, 'קומפלט', 34000, 0, 's10'), it('ארון כניסה', 1, 'קומפלט', 22000)] },
  { id: 'po_2', number: 'PO-2026-0131', projectId: 'p_cohen', supplierId: 'sup_hadar', status: 'אושרה ע״י ספק', createdAt: D(-6), createdBy: 'u_ori', expectedDelivery: D(21), paidBy: 'לקוח ישירות', notes: 'חיתוך לפי שבלונה לאחר התקנת ארונות.', items: [it('שיש קלקטה גולד – אי ומשטח', 9.6, 'מ״ר', 3400, 0, 's1')] },
  { id: 'po_3', number: 'PO-2026-0098', projectId: 'p_cohen', supplierId: 'sup_hadar', status: 'סופקה', createdAt: '2026-08-20', createdBy: 'u_ori', expectedDelivery: '2026-09-15', paidBy: 'לקוח ישירות', notes: '', items: [it('פרקט הרינגבון', 92, 'מ״ר', 420, 92, 's5'), it('פרקט פריסה ישרה', 24, 'מ״ר', 380, 24, 's9'), it('אריחי רצפה שירותי אורחים', 8, 'מ״ר', 290, 8)] },
  { id: 'po_4', number: 'PO-2026-0120', projectId: 'p_cohen', supplierId: 'sup_light', status: 'סופקה חלקית', createdAt: '2026-09-05', createdBy: 'u_yoav', expectedDelivery: D(-2), paidBy: 'דרך המשרד', notes: 'חסרים 4 מ׳ פס תאורה – אספקה חוזרת.', items: [it('פס תאורה לינארי 3000K', 14, 'מ׳', 640, 10, 's7'), it('ספוטים שקועים 7W', 36, 'יח׳', 185, 36), it('דרייברים', 6, 'יח׳', 240, 6)] },
  { id: 'po_5', number: 'PO-2026-0136', projectId: 'p_cohen', supplierId: 'sup_light', status: 'טיוטה', createdAt: D(-1), createdBy: 'u_yoav', expectedDelivery: D(42), paidBy: 'דרך המשרד', notes: 'שלב ב׳ – ממתין לאישור יואב.', items: [it('ספוטים שקועים 7W – שלב ב׳', 24, 'יח׳', 185), it('מנורות תלייה מעל אי', 3, 'יח׳', 1950, 0, 's4')] },
  { id: 'po_6', number: 'PO-2026-0071', projectId: 'p_garin', supplierId: 'sup_galed', status: 'סופקה', createdAt: '2026-04-12', createdBy: 'u_ori', expectedDelivery: '2026-07-01', paidBy: 'לקוח ישירות', notes: '', items: [it('בר בטון מוחלק', 1, 'קומפלט', 38000, 1, 'g1'), it('ארונות אחורי בר', 1, 'קומפלט', 24500, 1)] },
  { id: 'po_7', number: 'PO-2026-0088', projectId: 'p_garin', supplierId: 'sup_nordic', status: 'סופקה', createdAt: '2026-07-20', createdBy: 'u_ori', expectedDelivery: D(-10), paidBy: 'לקוח ישירות', notes: '', items: [it('כיסא בר עץ אגוז', 10, 'יח׳', 890, 10, 'g2'), it('שולחן 70×70', 9, 'יח׳', 1400, 9), it('כיסא אוכל', 26, 'יח׳', 620, 26)] },
  { id: 'po_8', number: 'PO-2026-0133', projectId: 'p_stern', supplierId: 'sup_galed', status: 'נשלחה לספק', createdAt: D(-3), createdBy: 'u_ori', expectedDelivery: D(38), paidBy: 'לקוח ישירות', notes: 'ממתין לאישור מידות סופי (פגישה מחר).', items: [it('מטבח U – פורמייקה ירוק מרווה', 1, 'קומפלט', 62000, 0, 'st1')] },
  { id: 'po_9', number: 'PO-2026-0134', projectId: 'p_stern', supplierId: 'sup_hadar', status: 'טיוטה', createdAt: D(-1), createdBy: 'u_ori', expectedDelivery: D(20), paidBy: 'לקוח ישירות', notes: '', items: [it('אריח טראצו 60×60', 22, 'מ״ר', 240, 0, 'st2'), it('אריח קיר לבן 10×30', 34, 'מ״ר', 165)] },
];

export const EXPENSE_CATEGORIES = ['קבלן ביצוע', 'נגרות', 'ריצוף וחיפוי', 'תאורה', 'סניטריה', 'ריהוט', 'חשמל ותקשורת', 'שיש ומשטחים', 'מיזוג', 'יועצים ומדידות', 'בלתי צפוי'];

const bl = (projectId: string, arr: [string, number][]) => arr.map(([category, planned], i) => ({ id: `bl_${projectId}_${i}`, projectId, category, planned }));
export const budgetLines: T.BudgetLine[] = [
  ...bl('p_cohen', [['קבלן ביצוע', 420000], ['נגרות', 210000], ['ריצוף וחיפוי', 70000], ['שיש ומשטחים', 75000], ['תאורה', 85000], ['סניטריה', 70000], ['ריהוט', 220000], ['חשמל ותקשורת', 60000], ['בלתי צפוי', 40000]]),
  ...bl('p_mizrahi', [['נגרות', 720000], ['ריצוף וחיפוי', 360000], ['שיש ומשטחים', 140000], ['תאורה', 260000], ['סניטריה', 180000], ['ריהוט', 560000], ['יועצים ומדידות', 60000], ['בלתי צפוי', 120000]]),
  ...bl('p_garin', [['קבלן ביצוע', 160000], ['נגרות', 70000], ['שיש ומשטחים', 40000], ['תאורה', 35000], ['ריהוט', 70000], ['מיזוג', 55000], ['בלתי צפוי', 50000]]),
  ...bl('p_friedman', [['קבלן ביצוע', 420000], ['נגרות', 140000], ['תאורה', 90000], ['ריהוט', 180000], ['יועצים ומדידות', 30000], ['בלתי צפוי', 40000]]),
  ...bl('p_ohayon', [['קבלן ביצוע', 180000], ['נגרות', 90000], ['ריצוף וחיפוי', 45000], ['סניטריה', 35000], ['בלתי צפוי', 30000]]),
  ...bl('p_rosen', [['קבלן ביצוע', 700000], ['נגרות', 400000], ['ריהוט', 380000], ['בלתי צפוי', 120000]]),
  ...bl('p_bendavid', [['קבלן ביצוע', 230000], ['נגרות', 110000], ['ריצוף וחיפוי', 60000], ['סניטריה', 45000], ['ריהוט', 50000], ['בלתי צפוי', 25000]]),
  ...bl('p_hanamal', [['קבלן ביצוע', 1600000], ['נגרות', 800000], ['ריהוט', 900000], ['יועצים ומדידות', 150000], ['בלתי צפוי', 350000]]),
  ...bl('p_stern', [['קבלן ביצוע', 70000], ['נגרות', 62000], ['ריצוף וחיפוי', 30000], ['סניטריה', 28000], ['בלתי צפוי', 20000]]),
];

let ex = 0;
const e = (projectId: string, date: string, category: string, description: string, supplierId: string | null, amount: number, poId: string | null = null, status: T.Expense['status'] = 'שולם', paidBy: T.Expense['paidBy'] = 'לקוח ישירות', receipt: string | null = 'קבלה.pdf'): T.Expense => ({ id: 'ex' + ++ex, projectId, date, category, description, supplierId, poId, amount, receipt, status, paidBy });
export const expenses: T.Expense[] = [
  // Cohen — ~ 795k total, tiles over budget
  e('p_cohen', '2026-06-05', 'קבלן ביצוע', 'חשבון חלקי 1 – פירוק ובינוי', 'sup_bina', 92000),
  e('p_cohen', '2026-07-05', 'קבלן ביצוע', 'חשבון חלקי 2 – מחיצות ואינסטלציה', 'sup_bina', 88000),
  e('p_cohen', '2026-08-05', 'קבלן ביצוע', 'חשבון חלקי 3 – טיח ותשתיות', 'sup_bina', 76000),
  e('p_cohen', '2026-09-05', 'קבלן ביצוע', 'חשבון חלקי 4 – איטום והכנות', 'sup_bina', 71000),
  e('p_cohen', '2026-10-05', 'קבלן ביצוע', 'חשבון חלקי 5 – גבס שלב א׳', 'sup_bina', 64000, null, 'ממתין לתשלום', 'לקוח ישירות', null),
  e('p_cohen', '2026-06-14', 'נגרות', 'מקדמה 40% – נגרות', 'sup_shalom', 69600, 'po_1'),
  e('p_cohen', '2026-09-16', 'ריצוף וחיפוי', 'פרקט + אריחים – אספקה מלאה', 'sup_hadar', 50080, 'po_3'),
  e('p_cohen', '2026-09-28', 'ריצוף וחיפוי', 'עבודת התקנת פרקט הרינגבון', 'sup_bina', 26400),
  e('p_cohen', '2026-09-20', 'תאורה', 'אספקה חלקית – פס תאורה 10 מ׳', 'sup_light', 6400, 'po_4', 'שולם', 'דרך המשרד'),
  e('p_cohen', '2026-09-20', 'תאורה', 'ספוטים ודרייברים', 'sup_light', 8100, 'po_4', 'שולם', 'דרך המשרד'),
  e('p_cohen', '2026-07-22', 'חשמל ותקשורת', 'חשמל – שלב תשתיות', 'sup_adar', 34000),
  e('p_cohen', '2026-10-12', 'חשמל ותקשורת', 'חשמל – לוח ראשי ותקשורת', 'sup_adar', 19500, null, 'ממתין לתשלום', 'לקוח ישירות', null),
  e('p_cohen', '2026-08-30', 'סניטריה', 'כלים סניטריים – הזמנה 1', 'sup_sanit', 18900),
  e('p_cohen', '2026-07-10', 'בלתי צפוי', 'חיזוק קורה לאחר פירוק – מהנדס + ביצוע', 'sup_bina', 17800),
  e('p_cohen', D(-8), 'שיש ומשטחים', 'מקדמה שיש 30%', 'sup_hadar', 9792, 'po_2'),
  // Mizrahi
  e('p_mizrahi', '2026-03-10', 'יועצים ומדידות', 'מדידה וסריקת לייזר', null, 12500),
  e('p_mizrahi', '2026-05-22', 'יועצים ומדידות', 'יועץ תאורה – שלב קונספט', null, 6000),
  // Garin — 95% used
  e('p_garin', '2026-04-15', 'קבלן ביצוע', 'קבלן – פירוק ובינוי', 'sup_bina', 62000),
  e('p_garin', '2026-06-01', 'קבלן ביצוע', 'קבלן – גמרים', 'sup_bina', 88500),
  e('p_garin', '2026-07-02', 'שיש ומשטחים', 'בר בטון + ארונות', 'sup_galed', 62500, 'po_6'),
  e('p_garin', '2026-06-20', 'תאורה', 'תאורה דקורטיבית', 'sup_light', 31200),
  e('p_garin', D(-10), 'ריהוט', 'ריהוט ישיבה', 'sup_nordic', 37620, 'po_7'),
  e('p_garin', D(-9), 'ריהוט', 'ספסלים מרופדים בהתאמה', null, 24000),
  e('p_garin', '2026-05-30', 'מיזוג', 'מערכת מיזוג מיני מרכזי', null, 52800),
  e('p_garin', '2026-08-15', 'נגרות', 'חזית ברזל וזכוכית', null, 48000),
  e('p_garin', D(-7), 'בלתי צפוי', 'שילוט מואר (תוספת מאושרת)', null, 6800),
  e('p_garin', D(-2), 'בלתי צפוי', 'תיקון ניקוז מתחת לבר', 'sup_bina', 42580, null, 'ממתין לתשלום', 'לקוח ישירות', null),
  // Friedman
  e('p_friedman', '2026-06-20', 'יועצים ומדידות', 'מדידת קומה', null, 12000),
  // Bendavid — completed, slight overrun
  e('p_bendavid', '2026-02-10', 'קבלן ביצוע', 'קבלן – כל השלבים', 'sup_bina', 244000),
  e('p_bendavid', '2026-04-10', 'נגרות', 'נגרות מטבח וארונות', 'sup_shalom', 116500),
  e('p_bendavid', '2026-03-15', 'ריצוף וחיפוי', 'ריצוף וחיפוי', 'sup_hadar', 63800),
  e('p_bendavid', '2026-05-10', 'סניטריה', 'סניטריה', 'sup_sanit', 44100),
  e('p_bendavid', '2026-06-20', 'ריהוט', 'ריהוט', 'sup_nordic', 47200),
  e('p_bendavid', '2026-05-02', 'בלתי צפוי', 'החלפת צנרת ראשית', 'sup_bina', 22400),
  // Hanamal
  e('p_hanamal', '2026-04-20', 'יועצים ומדידות', 'סקר שימור ותיעוד', null, 64000),
  e('p_hanamal', '2026-06-01', 'יועצים ומדידות', 'יועץ קונסטרוקציה – בדיקת מבנה', null, 31000),
  // Stern
  e('p_stern', D(-3), 'נגרות', 'מקדמה 30% מטבח', 'sup_galed', 18600, 'po_8'),
  e('p_stern', '2026-07-10', 'יועצים ומדידות', 'מדידה', null, 2400),
];

function feeSet(projectId: string, total: number, plan: [string, number, string, T.FeeMilestone['status'], string?][]): T.FeeMilestone[] {
  return plan.map(([title, pct, dueDate, status, paidAt], i) => ({ id: `fee_${projectId}_${i}`, projectId, title, pct, amount: Math.round((total * pct) / 100), dueDate, status, paidAt }));
}
export const feeMilestones: T.FeeMilestone[] = [
  ...feeSet('p_cohen', 185000, [['מקדמה בחתימה', 20, '2025-11-10', 'שולם', '2025-11-12'], ['סיום תכנון מוקדם', 20, '2026-01-25', 'שולם', '2026-01-30'], ['אישור תכנון מפורט', 25, '2026-05-05', 'שולם', '2026-05-11'], ['פיקוח עליון – חודשים 1–4', 12.5, '2026-09-30', 'שולם', '2026-10-04'], ['פיקוח עליון – חודשים 5–8', 12.5, D(6), 'נשלחה דרישה'], ['מסירה', 10, '2027-01-28', 'עתידי']]),
  ...feeSet('p_mizrahi', 320000, [['מקדמה בחתימה', 15, '2026-02-15', 'שולם', '2026-02-18'], ['קונספט', 15, '2026-04-05', 'שולם', '2026-04-12'], ['תכנון מוקדם', 20, '2026-06-20', 'באיחור'], ['מפרטים', 20, D(30), 'עתידי'], ['תכניות ביצוע', 20, '2027-02-01', 'עתידי'], ['פיקוח ומסירה', 10, '2027-09-30', 'עתידי']]),
  ...feeSet('p_garin', 62000, [['מקדמה', 30, '2026-01-12', 'שולם', '2026-01-14'], ['אישור קונספט', 30, '2026-02-20', 'שולם', '2026-02-25'], ['תחילת ביצוע', 25, '2026-04-15', 'שולם', '2026-04-20'], ['מסירה', 15, D(18), 'עתידי']]),
  ...feeSet('p_friedman', 110000, [['מקדמה', 20, '2026-06-01', 'שולם', '2026-06-05'], ['פרוגרמה', 15, '2026-07-15', 'שולם', '2026-07-20'], ['תכנית העמדה', 15, D(-3), 'נשלחה דרישה'], ['תכנון מפורט', 25, D(28), 'עתידי'], ['מכרז וביצוע', 25, '2027-04-15', 'עתידי']]),
  ...feeSet('p_ohayon', 48000, [['מקדמה', 25, '2026-09-10', 'שולם', '2026-09-11'], ['תכנון מוקדם', 25, D(30), 'עתידי'], ['תכנון מפורט', 30, D(70), 'עתידי'], ['פיקוח', 20, '2027-05-30', 'עתידי']]),
  ...feeSet('p_bendavid', 68000, [['מקדמה', 25, '2025-09-28', 'שולם', '2025-09-30'], ['תכנון', 35, '2025-12-15', 'שולם', '2025-12-20'], ['ביצוע', 30, '2026-04-01', 'שולם', '2026-04-03'], ['מסירה', 10, '2026-07-30', 'שולם', '2026-08-04']]),
  ...feeSet('p_hanamal', 420000, [['מקדמה', 10, '2026-03-01', 'שולם', '2026-03-03'], ['סקר וקונספט', 10, '2026-07-30', 'שולם', '2026-08-10'], ['תכנון מפורט', 30, '2027-02-15', 'עתידי'], ['ביצוע', 40, '2027-10-01', 'עתידי'], ['מסירה', 10, '2028-03-01', 'עתידי']]),
  ...feeSet('p_stern', 28000, [['מקדמה', 30, '2026-06-20', 'שולם', '2026-06-22'], ['אישור תכנון', 40, D(-12), 'שולם', D(-10)], ['פיקוח ומסירה', 30, '2027-01-20', 'עתידי']]),
];

export const notifications: T.Notification[] = [
  { id: 'n1', userId: 'u_yoav', kind: 'budget', title: 'חריגה בתקציב ריצוף וחיפוי', body: 'פנטהאוז ארלוזורוב: 109% מהסעיף נוצל', link: '/projects/p_cohen/budget', at: DT(0, '07:00'), read: false },
  { id: 'n2', userId: 'u_yoav', kind: 'approval', title: 'דנה כהן ביקשה שינוי בספה', body: 'אפשר לראות את הבד בגוון כהה יותר?', link: '/approvals', at: DT(-6, '21:10'), read: true },
  { id: 'n3', userId: 'u_yoav', kind: 'task', title: '2 משימות באיחור בפנטהאוז ארלוזורוב', body: 'הזמנת גופי תאורה שקועים – שלב ב׳ ועוד אחת', link: '/tasks', at: DT(0, '07:00'), read: false },
  { id: 'n4', userId: 'u_yoav', kind: 'meeting', title: 'סיור באתר עם קבלן החשמל ב-11:00', body: 'ארלוזורוב 112', link: '/calendar', at: DT(0, '07:00'), read: false },
  { id: 'n5', userId: 'u_yoav', kind: 'plan', title: 'שירה העלתה גרסה חדשה', body: 'D-420 פרט חדר רחצה הורים – בעיבוד', link: '/plans/pl_cohen_bath', at: DT(-2, '14:20'), read: true },
  { id: 'n6', userId: 'u_michal', kind: 'approval', title: 'אישור ממתין מעל 3 ימים', body: 'וילה בהרצליה: מפרט קומת קרקע', link: '/approvals', at: DT(0, '07:00'), read: false },
  { id: 'n7', userId: 'u_michal', kind: 'budget', title: 'בית קפה גרעין קרוב לתקרת התקציב', body: '95% מתקציב הביצוע נוצל', link: '/projects/p_garin/budget', at: DT(-1, '07:00'), read: false },
  { id: 'n8', userId: 'u_michal', kind: 'system', title: 'המנוי מתחדש בעוד 18 יום', body: 'Pro חודשי – חיוב מדומה', link: '/billing', at: DT(-1, '07:00'), read: true },
  { id: 'n9', userId: 'u_michal', kind: 'comment', title: 'יעל פרידמן הגיבה בפורטל', body: 'נראה טוב! נעבור על זה עם השותפים ביום שלישי.', link: '/projects/p_friedman/messages', at: DT(-1, '13:30'), read: false },
  { id: 'n10', userId: 'u_shira', kind: 'task', title: 'משימה באיחור', body: 'עדכון פרט נגרות ארון כניסה', link: '/tasks', at: DT(0, '07:00'), read: false },
  { id: 'n11', userId: 'u_shira', kind: 'plan', title: 'הערה חדשה על A-101', body: 'דניאל: פתיחת דלת חדר רחצה מתנגשת בארון', link: '/plans/pl_cohen_floor', at: DT(-3, '09:14'), read: false },
  { id: 'n12', userId: 'cu_dana', kind: 'approval', title: '4 פריטים ממתינים לאישורך', body: 'ברז מטבח, מנורות תלייה, אריח לחדר רחצה, פינת אוכל חוץ', link: '/portal/approvals', at: DT(-1, '09:00'), read: false },
  { id: 'n13', userId: 'cu_dana', kind: 'plan', title: 'תכנית תקרות עודכנה', body: 'פס התאורה הוזז לפי בקשתך', link: '/portal/drawings', at: DT(-7, '16:45'), read: true },
  { id: 'n14', userId: 'cu_dana', kind: 'meeting', title: 'תזכורת: בחירת שיש היום ב-14:00', body: 'אבן וקרמיקה הדר, חולון', link: '/portal/meetings', at: DT(0, '08:00'), read: false },
];

export const messages: T.Message[] = [
  { id: 'msg1', projectId: 'p_cohen', side: 'studio', authorId: 'u_yoav', authorName: 'יואב ברק', text: 'ערב טוב דנה ואבי, העלינו לפורטל את תכנית התקרות המעודכנת. פס התאורה בסלון הוזז 30 ס״מ לכיוון החלון כפי שביקשתם.', at: DT(-7, '16:45') },
  { id: 'msg2', projectId: 'p_cohen', side: 'client', authorId: 'cu_dana', authorName: 'דנה כהן', text: 'תודה! נראה מעולה. לגבי הספה – אפשר לקבל דוגמת בד כהה יותר?', at: DT(-6, '21:10') },
  { id: 'msg3', projectId: 'p_cohen', side: 'studio', authorId: 'u_ori', authorName: 'אורי דהן', text: 'בטח. הזמנתי 3 דוגמאות מנורדיקה, יגיעו עד יום חמישי. בינתיים קבענו ביום ראשון ב-14:00 בחירת שיש בהדר – מחכים לך שם.', at: DT(-5, '09:30') },
  { id: 'msg4', projectId: 'p_cohen', side: 'client', authorId: 'cu_dana', authorName: 'דנה כהן', text: 'מעולה, אגיע. אבי לא יוכל להצטרף.', at: DT(-5, '12:02') },
  { id: 'msg5', projectId: 'p_friedman', side: 'studio', authorId: 'u_noa', authorName: 'נועה שפירא', text: 'יעל שלום, העלינו את תכנית ההעמדה המעודכנת עם חדר הישיבות המוגדל. נשמח לאישורך בפורטל.', at: DT(-3, '17:00') },
  { id: 'msg6', projectId: 'p_friedman', side: 'client', authorId: 'cu_yael', authorName: 'יעל פרידמן', text: 'נראה טוב! נעבור על זה עם השותפים ביום שלישי.', at: DT(-1, '13:30') },
  { id: 'msg7', projectId: 'p_mizrahi', side: 'studio', authorId: 'u_michal', authorName: 'מיכל לוי', text: 'רונית, המפרט לקומת הקרקע מחכה לך בפורטל. הוספנו חלופת פורצלן לריצוף שחוסכת כ-38 אלף ₪. נעבור על הכול ביום שלישי.', at: DT(-3, '19:20') },
];

export const emailLog: T.EmailLog[] = [
  { id: 'em1', to: 'dana.cohen@example.com', subject: '4 פריטים ממתינים לאישורך – פנטהאוז ארלוזורוב', template: 'approval_request', at: DT(-1, '09:00'), status: 'הודמה – לא נשלח', relatedLink: '/approvals' },
  { id: 'em2', to: 'ronit.m@example.com', subject: 'מפרט קומת קרקע מוכן לאישור', template: 'approval_request', at: DT(-3, '19:21'), status: 'הודמה – לא נשלח', relatedLink: '/approvals' },
  { id: 'em3', to: 'adi.golan@example.com', subject: 'הוזמנת להצטרף ללוי ברק אדריכלות ב-ArchiFlow', template: 'team_invite', at: DT(-3, '10:00'), status: 'הודמה – לא נשלח', relatedLink: '/team' },
  { id: 'em4', to: 'yoav@levibarak.example.co.il', subject: 'סיכום יומי: 2 משימות באיחור, פגישה ב-11:00', template: 'daily_digest', at: DT(0, '07:00'), status: 'הודמה – לא נשלח', relatedLink: '/dashboard' },
  { id: 'em5', to: 'michal@levibarak.example.co.il', subject: 'התראת תקציב: בית קפה גרעין 95%', template: 'budget_alert', at: DT(-1, '07:00'), status: 'הודמה – לא נשלח', relatedLink: '/budget' },
  { id: 'em6', to: 'yael@friedman-law.example.com', subject: 'תכנית העמדה מעודכנת ממתינה לאישורך', template: 'approval_request', at: DT(-3, '17:01'), status: 'הודמה – לא נשלח', relatedLink: '/approvals' },
];

export const activity: T.Activity[] = [
  { id: 'a1', projectId: 'p_cohen', userId: 'u_daniel', text: 'הוסיף ממצא על A-101: פתיחת דלת חדר רחצה מתנגשת בארון', at: DT(-3, '09:14'), link: '/plans/pl_cohen_floor' },
  { id: 'a2', projectId: 'p_cohen', userId: 'u_shira', text: 'העלתה גרסה 1 של D-420 פרט חדר רחצה הורים', at: DT(-2, '14:20'), link: '/plans/pl_cohen_bath' },
  { id: 'a3', projectId: 'p_cohen', userId: 'u_ori', text: 'שלח 4 פריטי מפרט לאישור דנה כהן', at: DT(-1, '09:00'), link: '/approvals' },
  { id: 'a4', projectId: 'p_garin', userId: 'u_daniel', text: 'עדכן רשימת תיקונים – 1 מתוך 4 הושלמו', at: DT(-1, '16:30'), link: '/tasks' },
  { id: 'a5', projectId: 'p_friedman', userId: 'u_noa', text: 'העלתה גרסה 2 של תכנית העמדה ושלחה לאישור', at: DT(-3, '17:00'), link: '/plans/pl_fried_layout' },
  { id: 'a6', projectId: 'p_mizrahi', userId: 'u_michal', text: 'שלחה מפרט קומת קרקע לאישור', at: DT(-3, '19:20'), link: '/approvals' },
  { id: 'a7', projectId: 'p_stern', userId: 'u_ori', text: 'יצר הזמנת רכש PO-2026-0133 למטבחי גל-עד', at: DT(-3, '12:00'), link: '/procurement/po_8' },
  { id: 'a8', projectId: 'p_cohen', userId: 'u_yoav', text: 'רשם הוצאה: חשבון חלקי 5 – גבס שלב א׳ (64,000 ₪)', at: DT(-20, '10:00'), link: '/expenses' },
  { id: 'a9', projectId: 'p_rosen', userId: 'u_michal', text: 'יצרה ליד חדש: בית פרטי בכפר סבא', at: DT(-6, '11:00') },
  { id: 'a10', projectId: 'p_ohayon', userId: 'u_shira', text: 'העלתה קובץ DXF מהמודד – העיבוד נכשל', at: DT(0, '08:10'), link: '/plans/pl_ohayon_exist' },
  { id: 'a11', projectId: 'p_garin', userId: 'u_ori', text: 'רשם הוצאה: תיקון ניקוז מתחת לבר (42,580 ₪)', at: DT(-2, '15:00'), link: '/expenses' },
];

// ---------- subscription & platform ----------
export const FEATURE_DEFS: T.PlanFeatureDef[] = [
  { key: 'projects', label: 'ניהול פרויקטים ולקוחות', group: 'בסיס' },
  { key: 'tasks', label: 'משימות, קנבן ותבניות עבודה', group: 'בסיס' },
  { key: 'calendar', label: 'יומן ופגישות', group: 'בסיס' },
  { key: 'documents', label: 'מסמכים וגרסאות', group: 'בסיס' },
  { key: 'plans_viewer', label: 'ספריית שרטוטים וצפייה', group: 'שרטוטים' },
  { key: 'plans_annotations', label: 'הערות, ממצאים ומדידה ידנית על שרטוט', group: 'שרטוטים' },
  { key: 'plans_compare', label: 'השוואת גרסאות שרטוט', group: 'שרטוטים' },
  { key: 'specs', label: 'מפרטים וחלופות', group: 'מפרטים ורכש' },
  { key: 'procurement', label: 'ספקים והזמנות רכש', group: 'מפרטים ורכש' },
  { key: 'budget', label: 'תקציב ביצוע והוצאות', group: 'כספים' },
  { key: 'fees', label: 'מעקב שכר טרחה', group: 'כספים' },
  { key: 'client_portal', label: 'פורטל לקוח ואישורים מקוונים', group: 'לקוחות' },
  { key: 'advanced_reports', label: 'דוחות מתקדמים וייצוא', group: 'כספים' },
  { key: 'calendar_sync', label: 'סנכרון יומן Google / Outlook (עתידי)', group: 'אינטגרציות' },
  { key: 'custom_roles', label: 'הרשאות מותאמות לפי פרויקט', group: 'צוות' },
  { key: 'priority_support', label: 'תמיכה בעדיפות', group: 'תמיכה' },
];

export const subscriptionPlans: T.SubscriptionPlan[] = [
  { id: 'starter', name: 'Starter', tagline: 'לסטודיו קטן שמתחיל לעבוד מסודר', priceMonthly: 149, priceYearlyPerMonth: 124, currency: '₪', vatIncluded: false, priceConfirmed: false, trialDays: 14,
    limits: { users: 3, activeProjects: 10, storageGb: 20, clientPortalSeats: 0 },
    features: { projects: true, tasks: true, calendar: true, documents: true, plans_viewer: true, plans_annotations: true, plans_compare: false, specs: true, procurement: false, budget: true, fees: false, client_portal: false, advanced_reports: false, calendar_sync: false, custom_roles: false, priority_support: false } },
  { id: 'pro', name: 'Pro', tagline: 'למשרד עם צוות, לקוחות פעילים ורכש', priceMonthly: 299, priceYearlyPerMonth: 249, currency: '₪', vatIncluded: false, priceConfirmed: false, trialDays: 14,
    limits: { users: 10, activeProjects: null, storageGb: 200, clientPortalSeats: null },
    features: { projects: true, tasks: true, calendar: true, documents: true, plans_viewer: true, plans_annotations: true, plans_compare: true, specs: true, procurement: true, budget: true, fees: true, client_portal: true, advanced_reports: true, calendar_sync: true, custom_roles: true, priority_support: true } },
];

export const officeSubscription: T.OfficeSubscription = {
  id: 'sub_1', officeId: OFFICE_ID, planId: 'pro', status: 'פעיל', cycle: 'חודשי', startedAt: '2025-09-12', currentPeriodEnd: D(18), paymentMethod: 'כרטיס מדומה •••• 4242', seatsUsed: 6, storageUsedGb: 38.4,
  history: [
    { at: '2025-09-12', text: 'התחלת תקופת ניסיון – Starter', by: 'מיכל לוי' },
    { at: '2025-09-26', text: 'הפעלת מנוי Starter חודשי', by: 'מיכל לוי' },
    { at: '2026-02-03', text: 'שדרוג ל-Pro חודשי (חיוב יחסי מדומה)', by: 'מיכל לוי' },
  ],
};

const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
export const invoices: T.Invoice[] = months.slice(1).map((m, i) => {
  const planId = m < '2026-02' ? 'starter' : 'pro';
  const amount = m === '2026-02' ? 299 - 66 : planId === 'pro' ? 299 : 149; // Feb: prorated
  return { id: 'inv' + i, officeId: OFFICE_ID, number: `AF-${m.replace('-', '')}-0${(i % 7) + 1}12`, date: `${m}-26`, periodFrom: `${m}-26`, periodTo: `${months[i + 2] || '2026-11'}-25`, planId, amount, vat: Math.round(amount * 0.18 * 100) / 100, status: m === '2026-06' ? 'זוכתה' : 'שולמה' };
}).reverse();
// one failed + retry example
invoices.splice(4, 0, { id: 'inv_fail', officeId: OFFICE_ID, number: 'AF-202606-0F12', date: '2026-06-26', periodFrom: '2026-06-26', periodTo: '2026-07-25', planId: 'pro', amount: 299, vat: 53.82, status: 'נכשלה' });

export const pricingChanges: T.PricingChange[] = [
  { id: 'pc1', at: '2025-06-01T10:00', planId: 'starter', field: 'מחיר חודשי', from: '—', to: '₪129', by: 'רון גבאי', note: 'מחיר השקה (הדמיה)' },
  { id: 'pc2', at: '2025-06-01T10:00', planId: 'pro', field: 'מחיר חודשי', from: '—', to: '₪279', by: 'רון גבאי', note: 'מחיר השקה (הדמיה)' },
  { id: 'pc3', at: '2026-01-01T09:00', planId: 'starter', field: 'מחיר חודשי', from: '₪129', to: '₪149', by: 'רון גבאי', note: 'עדכון מחירון – מחיר דמו, טעון אישור' },
  { id: 'pc4', at: '2026-01-01T09:00', planId: 'pro', field: 'מחיר חודשי', from: '₪279', to: '₪299', by: 'רון גבאי', note: 'עדכון מחירון – מחיר דמו, טעון אישור' },
  { id: 'pc5', at: '2026-04-15T12:00', planId: 'pro', field: 'מגבלת משתמשים', from: '8', to: '10', by: 'רון גבאי', note: 'בקשות לקוחות' },
  { id: 'pc6', at: '2026-07-01T12:00', planId: 'starter', field: 'פיצ׳ר: בקרת תקציב', from: 'כבוי', to: 'פעיל', by: 'רון גבאי', note: 'הנחת דמו' },
];

export const platformOffices: T.PlatformOffice[] = [
  { id: OFFICE_ID, name: office.name, city: 'תל אביב-יפו', ownerName: 'מיכל לוי', ownerEmail: 'michal@levibarak.example.co.il', planId: 'pro', status: 'פעיל', users: 6, projects: 9, storageGb: 38.4, createdAt: '2025-09-12', lastActive: DT(0, '09:10'), mrr: 299 },
  { id: 'off_2', name: 'סטודיו קו ישר', city: 'ירושלים', ownerName: 'אביטל רז', ownerEmail: 'avital@kav.example.com', planId: 'starter', status: 'פעיל', users: 2, projects: 7, storageGb: 9.1, createdAt: '2025-10-03', lastActive: DT(-1, '18:00'), mrr: 149 },
  { id: 'off_3', name: 'מרקם אדריכלים', city: 'חיפה', ownerName: 'סאמר חורי', ownerEmail: 'samer@mirkam.example.com', planId: 'pro', status: 'פעיל', users: 9, projects: 22, storageGb: 141.0, createdAt: '2025-08-21', lastActive: DT(0, '08:00'), mrr: 299 },
  { id: 'off_4', name: 'נוף פנימי', city: 'רמת השרון', ownerName: 'הילה שושן', ownerEmail: 'hila@nof.example.com', planId: 'pro', status: 'תקופת ניסיון', users: 3, projects: 2, storageGb: 1.2, createdAt: D(-9), lastActive: DT(-1, '22:00'), mrr: 0 },
  { id: 'off_5', name: 'א.ב. תכנון ועיצוב', city: 'באר שבע', ownerName: 'אלי ביטון', ownerEmail: 'eli@ab.example.com', planId: 'starter', status: 'חוב פתוח', users: 1, projects: 4, storageGb: 3.4, createdAt: '2026-01-11', lastActive: DT(-6, '10:00'), mrr: 149 },
  { id: 'off_6', name: 'סטודיו לבן-אפור', city: 'תל אביב-יפו', ownerName: 'נטע גל', ownerEmail: 'neta@lavan.example.com', planId: 'pro', status: 'יבוטל בסוף התקופה', users: 5, projects: 11, storageGb: 62.0, createdAt: '2025-11-02', lastActive: DT(-2, '12:00'), mrr: 299 },
  { id: 'off_7', name: 'בית ספר לעיצוב – סטודיו קהילתי', city: 'נתניה', ownerName: 'דורית אלון', ownerEmail: 'dorit@studio.example.com', planId: 'starter', status: 'בוטל', users: 0, projects: 3, storageGb: 2.0, createdAt: '2025-09-30', lastActive: '2026-05-01T10:00', mrr: 0 },
  { id: 'off_8', name: 'עמית ושות׳ אדריכלות', city: 'הרצליה', ownerName: 'עמית קליין', ownerEmail: 'amit@ak.example.com', planId: 'pro', status: 'פעיל', users: 10, projects: 31, storageGb: 188.6, createdAt: '2025-07-15', lastActive: DT(0, '07:45'), mrr: 299 },
  { id: 'off_9', name: 'דקל עיצוב פנים', city: 'מודיעין', ownerName: 'מאיה דקל', ownerEmail: 'maya@dekel.example.com', planId: 'starter', status: 'פג תוקף', users: 1, projects: 1, storageGb: 0.4, createdAt: '2026-08-01', lastActive: '2026-08-14T10:00', mrr: 0 },
  { id: 'off_10', name: 'גולן אדריכלות נוף', city: 'קצרין', ownerName: 'יונתן גולן', ownerEmail: 'yonatan@golan.example.com', planId: 'starter', status: 'פעיל', users: 3, projects: 9, storageGb: 18.9, createdAt: '2026-02-20', lastActive: DT(-1, '09:00'), mrr: 149 },
  { id: 'off_11', name: 'סטודיו טרה', city: 'תל אביב-יפו', ownerName: 'רוני אשכנזי', ownerEmail: 'roni@terra.example.com', planId: 'pro', status: 'פעיל', users: 7, projects: 15, storageGb: 77.3, createdAt: '2025-12-12', lastActive: DT(0, '08:30'), mrr: 299 },
  { id: 'off_12', name: 'קווים עיצוב', city: 'ראשון לציון', ownerName: 'ליה פרנקל', ownerEmail: 'lia@kavim.example.com', planId: 'starter', status: 'תקופת ניסיון', users: 1, projects: 1, storageGb: 0.2, createdAt: D(-3), lastActive: DT(0, '06:50'), mrr: 0 },
];

export const tickets: T.Ticket[] = [
  { id: 'tk1', number: 'SUP-1042', officeId: OFFICE_ID, userId: 'u_shira', subject: 'קובץ DXF מהמודד לא עובר עיבוד', category: 'שרטוטים', priority: 'רגילה', status: 'בטיפול', createdAt: DT(0, '08:15'), assignee: 'רון גבאי', messages: [
    { side: 'user', name: 'שירה כץ', text: 'העליתי קובץ DXF של מצב קיים (אוחיון) והוא נתקע בסטטוס "נכשל". צריכה את זה לפגישה בשבוע הבא.', at: DT(0, '08:15') },
    { side: 'support', name: 'צוות ArchiFlow', text: 'היי שירה, בדמו הנוכחי אין המרה של DXF/DWG לתצוגה – זו יכולת מתוכננת. בינתיים מומלץ לייצא PDF מהתוכנה של המודד ולהעלות אותו כגרסה חדשה.', at: DT(0, '09:20') },
  ] },
  { id: 'tk2', number: 'SUP-1038', officeId: OFFICE_ID, userId: 'u_michal', subject: 'איך מוסיפים לקוח שני לאותו פרויקט?', category: 'פורטל לקוח', priority: 'נמוכה', status: 'נסגר', createdAt: DT(-9, '10:00'), assignee: 'רון גבאי', messages: [
    { side: 'user', name: 'מיכל לוי', text: 'רוצה שגם אבי כהן יקבל גישה לפורטל.', at: DT(-9, '10:00') },
    { side: 'support', name: 'צוות ArchiFlow', text: 'בכרטיס הלקוח → אנשי קשר → "הזמן לפורטל". ההזמנה נשלחת במייל (בדמו – מדומה).', at: DT(-9, '11:30') },
  ] },
  { id: 'tk3', number: 'SUP-1040', officeId: 'off_5', userId: 'x', subject: 'החיוב נכשל אבל הכרטיס תקין', category: 'חיוב ומנוי', priority: 'גבוהה', status: 'ממתין למשתמש', createdAt: DT(-4, '12:00'), assignee: 'רון גבאי', messages: [
    { side: 'user', name: 'אלי ביטון', text: 'קיבלתי הודעה שהחיוב נכשל. הכרטיס בתוקף.', at: DT(-4, '12:00') },
    { side: 'support', name: 'צוות ArchiFlow', text: 'בדקנו – החברה המנפיקה דחתה את העסקה. נשמח שתעדכן אמצעי תשלום או תאשר מול הבנק.', at: DT(-4, '14:00') },
  ] },
  { id: 'tk4', number: 'SUP-1041', officeId: 'off_3', userId: 'x', subject: 'בקשה: ייצוא מפרט לאקסל בפורמט של קבלן', category: 'בקשת פיצ׳ר', priority: 'רגילה', status: 'פתוח', createdAt: DT(-1, '09:00'), assignee: '—', messages: [{ side: 'user', name: 'סאמר חורי', text: 'אפשר להוסיף ייצוא של טבלת המפרט עם עמודות של כתב כמויות?', at: DT(-1, '09:00') }] },
  { id: 'tk5', number: 'SUP-1043', officeId: 'off_8', userId: 'x', subject: 'הגענו למגבלת 10 משתמשים', category: 'חיוב ומנוי', priority: 'גבוהה', status: 'פתוח', createdAt: DT(0, '07:50'), assignee: '—', messages: [{ side: 'user', name: 'עמית קליין', text: 'אנחנו צריכים 12 משתמשים. יש מסלול גדול יותר?', at: DT(0, '07:50') }] },
  { id: 'tk6', number: 'SUP-1036', officeId: 'off_6', userId: 'x', subject: 'ביטול מנוי – שאלה על שמירת נתונים', category: 'חיוב ומנוי', priority: 'רגילה', status: 'נסגר', createdAt: DT(-12, '15:00'), assignee: 'רון גבאי', messages: [{ side: 'user', name: 'נטע גל', text: 'אם נבטל, כמה זמן הנתונים נשמרים?', at: DT(-12, '15:00') }, { side: 'support', name: 'צוות ArchiFlow', text: 'לפי טיוטת מדיניות השמירה (טרם סופית): 90 יום במצב קריאה בלבד, ולאחר מכן מחיקה. ניתן לייצא את כל הקבצים לפני כן.', at: DT(-12, '16:30') }] },
];

export const auditLog: T.AuditEntry[] = [
  { id: 'au1', at: DT(0, '09:15'), actor: 'רון גבאי (Super Admin)', officeId: null, action: 'כניסה לקונסולת ניהול', target: '—', ip: '84.229.x.x' },
  { id: 'au2', at: DT(0, '08:10'), actor: 'שירה כץ', officeId: OFFICE_ID, action: 'העלאת קובץ', target: 'S-101 מצב קיים v2 (DXF)', ip: '79.177.x.x' },
  { id: 'au3', at: DT(-1, '18:05'), actor: 'מיכל לוי', officeId: OFFICE_ID, action: 'שינוי סטטוס פרויקט', target: 'וילה בהרצליה → ממתין לאישור', ip: '79.177.x.x' },
  { id: 'au4', at: DT(-1, '13:30'), actor: 'יעל פרידמן (לקוח)', officeId: OFFICE_ID, action: 'תגובה בפורטל', target: 'משרדי פרידמן ושות׳', ip: '212.143.x.x' },
  { id: 'au5', at: DT(-2, '11:00'), actor: 'רון גבאי (Super Admin)', officeId: 'off_5', action: 'צפייה בפרטי מנוי', target: 'א.ב. תכנון ועיצוב', ip: '84.229.x.x' },
  { id: 'au6', at: DT(-3, '10:00'), actor: 'מיכל לוי', officeId: OFFICE_ID, action: 'הזמנת משתמש', target: 'adi.golan@example.com (Team Member)', ip: '79.177.x.x' },
  { id: 'au7', at: DT(-6, '21:10'), actor: 'דנה כהן (לקוח)', officeId: OFFICE_ID, action: 'בקשת שינוי', target: 'מפרט: ספה מודולרית', ip: '93.172.x.x' },
  { id: 'au8', at: DT(-9, '12:00'), actor: 'רון גבאי (Super Admin)', officeId: null, action: 'עדכון הגדרות פלטפורמה', target: 'גודל קובץ מרבי 250MB', ip: '84.229.x.x' },
  { id: 'au9', at: DT(-12, '09:00'), actor: 'נטע גל', officeId: 'off_6', action: 'ביטול מנוי בסוף תקופה', target: 'Pro', ip: '31.154.x.x' },
];

export const systemEvents: T.SystemEvent[] = [
  { id: 'se1', at: DT(0, '08:10'), level: 'error', service: 'plan-processing', message: 'המרת DXF נכשלה (S-101 v2, off_1) – פורמט לא נתמך בדמו' },
  { id: 'se2', at: DT(0, '07:00'), level: 'info', service: 'notifications', message: 'סיכומים יומיים הופקו ל-38 משתמשים (שליחה מדומה)' },
  { id: 'se3', at: DT(-1, '03:00'), level: 'info', service: 'backup', message: 'גיבוי לילי הושלם (הדמיה)' },
  { id: 'se4', at: DT(-2, '14:21'), level: 'warn', service: 'plan-processing', message: 'זמן עיבוד חריג 48 שנ׳ ל-PDF בגודל 4MB' },
  { id: 'se5', at: DT(-4, '12:00'), level: 'warn', service: 'billing', message: 'חיוב נדחה ע״י הספק המדומה – off_5' },
  { id: 'se6', at: DT(-6, '02:00'), level: 'info', service: 'storage', message: 'ניקוי קבצים זמניים – 2.1GB שוחררו' },
];

export const announcements: T.Announcement[] = [
  { id: 'an_1', title: 'חדש: השוואת גרסאות שרטוט', body: 'במסלול Pro ניתן כעת להשוות בין שתי גרסאות של אותו שרטוט זו לצד זו או בשכבות.', audience: 'כל המשרדים', status: 'פורסם', at: DT(-14, '10:00') },
  { id: 'an_2', title: 'תחזוקה מתוכננת', body: 'ביום שישי 06:00–07:00 ייתכנו הפרעות קצרות בהעלאת קבצים.', audience: 'כל המשרדים', status: 'מתוזמן', at: DT(5, '06:00') },
  { id: 'an_3', title: 'עדכון מחירון 2027', body: 'טיוטה – לא לפרסם לפני אישור מחירים סופי.', audience: 'בעלי משרדים', status: 'טיוטה', at: DT(0, '09:00') },
];

export const retentionPolicies = [
  { id: 'rp1', dataType: 'נתוני משרד לאחר ביטול מנוי', period: '90 יום', action: 'קריאה בלבד, ולאחר מכן מחיקה', status: 'טיוטה' },
  { id: 'rp2', dataType: 'קבצי שרטוטים ומסמכים', period: 'כל עוד המנוי פעיל + 90 יום', action: 'מחיקה מאחסון', status: 'טיוטה' },
  { id: 'rp3', dataType: 'יומן ביקורת (Audit log)', period: '7 שנים', action: 'ארכוב', status: 'טיוטה' },
  { id: 'rp4', dataType: 'חשבוניות ונתוני חיוב', period: '7 שנים', action: 'שמירה (דרישה חשבונאית משוערת)', status: 'טיוטה' },
  { id: 'rp5', dataType: 'פניות תמיכה', period: '24 חודשים', action: 'אנונימיזציה', status: 'טיוטה' },
  { id: 'rp6', dataType: 'משתמשי לקוח לא פעילים', period: '12 חודשים ללא כניסה', action: 'השבתת גישה לפורטל', status: 'טיוטה' },
];

export const helpArticles = [
  { id: 'h1', category: 'צעדים ראשונים', title: 'הקמת משרד והזמנת הצוות', minutes: 3, body: ['לאחר ההרשמה, אשף ההקמה מבקש את פרטי המשרד, תחומי ההתמחות ותבנית הפרויקט המועדפת.', 'מתוך "צוות והרשאות" לוחצים על "הזמנת חבר צוות", בוחרים תפקיד ושולחים. עד שההזמנה מתקבלת היא מופיעה כ"ממתינה".', 'בדמו, ההזמנות לא נשלחות בפועל ומופיעות ביומן המיילים כ"הודמה – לא נשלח".'] },
  { id: 'h2', category: 'פרויקטים', title: 'סטטוסים של פרויקט ומתי להחליף אותם', minutes: 4, body: ['לכל פרויקט יש אחד מתשעה סטטוסים: ליד חדש, תכנון ראשוני, תכנון בפיתוח, ממתין לאישור, תכנון מאושר, ביצוע, לקראת מסירה, הושלם, בהשהיה.', 'המערכת לעולם לא משנה סטטוס לבד. כששולחים פריט לאישור לקוח, היא רק מציעה לעבור ל"ממתין לאישור" – וההחלטה שלכם.'] },
  { id: 'h3', category: 'שרטוטים', title: 'אילו קבצים אפשר להעלות?', minutes: 2, body: ['ניתן לשמור PDF, JPG, PNG, DWG ו-DXF. תצוגה בתוך הדפדפן זמינה כרגע ל-PDF ולתמונות בלבד.', 'קבצי DWG/DXF נשמרים עם היסטוריית גרסאות ומטא-דאטה, אך ללא תצוגה. המרה אוטומטית היא יכולת מתוכננת.'] },
  { id: 'h4', category: 'שרטוטים', title: 'הערות, ממצאים ומדידה על שרטוט', minutes: 3, body: ['במצב צפייה בוחרים כלי: הערה, ממצא או מדידה. ממצא אפשר להפוך למשימה בלחיצה.', 'המדידה בדמו היא מדידה ידנית לפי קנה המידה שהוגדר לשרטוט, ואינה מחליפה מדידה בשטח.'] },
  { id: 'h5', category: 'פורטל לקוח', title: 'מה הלקוח רואה בפורטל?', minutes: 3, body: ['הלקוח רואה רק פריטים שסומנו "משותף עם הלקוח": שרטוטים, מסמכים, פריטי מפרט, פגישות והתכתבות.', 'הוא יכול לאשר, לדחות או לבקש שינוי. כל החלטה נרשמת בהיסטוריית האישורים.'] },
  { id: 'h6', category: 'כספים', title: 'תקציב ביצוע מול שכר טרחה', minutes: 4, body: ['תקציב ביצוע הוא הכסף של הלקוח שמיועד לקבלנים, ספקים ורכישות. שכר טרחה הוא התשלום למשרד.', 'המערכת מציגה את שניהם בנפרד, ובנוסף "תמונה כספית כוללת" לפרויקט.'] },
  { id: 'h7', category: 'מנוי וחיוב', title: 'שדרוג, שנמוך וביטול מנוי', minutes: 3, body: ['שדרוג נכנס לתוקף מיד. שנמוך נכנס לתוקף בסוף תקופת החיוב (הנחת דמו).', 'בדמו אין חיוב אמיתי – כל החשבוניות מסומנות כהדמיה.'] },
  { id: 'h8', category: 'מפרטים', title: 'שליחת מפרט לאישור והוספת חלופות', minutes: 3, body: ['לכל פריט אפשר להוסיף חלופות עם מחיר והערה. הלקוח רואה את החלופות בפורטל ויכול לבחור.', 'סך המפרט מתעדכן אוטומטית ומשתקף בתקציב הביצוע.'] },
];

export const faqs = [
  { q: 'האם הנתונים בדמו אמיתיים?', a: 'לא. כל הנתונים בדויים ונשמרים רק בדפדפן שלך. אפשר לאפס אותם בכל רגע מהפס העליון.' },
  { q: 'האם אפשר להעלות קבצים אמיתיים בדמו?', a: 'מסך ההעלאה מדמה את התהליך ויוצר רשומה, אבל הקובץ לא נשמר בשרת.' },
  { q: 'האם הלקוח יכול לראות תקציב?', a: 'בדמו – רק סיכום תקציב ברמת פרויקט, אם המשרד בחר לשתף. זו הנחת דמו שתוגדר סופית בהמשך.' },
  { q: 'מה ההבדל בין Starter ל-Pro?', a: 'טבלת ההשוואה בעמוד התמחור. חלוקת היכולות היא הנחת דמו וטרם אושרה.' },
  { q: 'האם ממצאי הבדיקה האוטומטית בשרטוט הם אישור הנדסי?', a: 'לא. זו הדמיה של יכולת עתידית בלבד, ואין בה תחליף לבדיקה של איש מקצוע מוסמך.' },
];

// Help content for the live site (same articles, without the demo-only remarks)
export const helpArticlesLive = helpArticles.map((a) => ({ ...a, body: a.body.map((b) => ({
  'בדמו, ההזמנות לא נשלחות בפועל ומופיעות ביומן המיילים כ"הודמה – לא נשלח".': 'ההזמנה נשלחת במייל עם קישור אישי. הקישור תקף ל-14 יום ומתאים רק לכתובת שאליה נשלח.',
  'המדידה בדמו היא מדידה ידנית לפי קנה המידה שהוגדר לשרטוט, ואינה מחליפה מדידה בשטח.': 'לפני המדידה הראשונה מכיילים את השרטוט: מותחים קו על מידה ידועה ומזינים את אורכה. המדידה היא עזר בלבד ואינה מחליפה מדידה בשטח.',
  'שדרוג נכנס לתוקף מיד. שנמוך נכנס לתוקף בסוף תקופת החיוב (הנחת דמו).': 'שנמוך נכנס לתוקף בסוף תקופת החיוב. בסוף תקופת הניסיון, אם לא הוסדר מנוי, המשרד עובר למצב קריאה בלבד.',
  'בדמו אין חיוב אמיתי – כל החשבוניות מסומנות כהדמיה.': 'ספק הסליקה עדיין לא מחובר, ולכן בקשות לשינוי מסלול נרשמות ומטופלות על ידי צוות ArchiFlow.',
} as Record<string, string>)[b] || b) }));
export const faqsLive = [
  { q: 'איפה נשמרים הנתונים והקבצים?', a: 'במסד נתונים מאובטח ובאחסון קבצים פרטי. כל משרד מופרד לחלוטין ממשרדים אחרים, וכל קובץ נפתח רק בקישור זמני למי שמורשה.' },
  { q: 'האם הלקוח יכול לראות תקציב?', a: 'רק סיכום תקציב ברמת פרויקט, ורק אם בעלי המשרד הפעילו זאת בהגדרות. הלקוח לא רואה רכש, ספקים או שכר טרחה.' },
  { q: 'מה ההבדל בין Starter ל-Pro?', a: 'טבלת ההשוואה בעמוד התמחור. המחירים וחלוקת היכולות עדיין טעונים אישור.' },
  { q: 'האם ממצאי הבדיקה האוטומטית בשרטוט הם אישור הנדסי?', a: 'לא. הבדיקה האוטומטית היא יכולת עתידית, וגם כשתופעל היא תהיה עזר בלבד ולא תחליף לבדיקה של איש מקצוע מוסמך.' },
  { q: 'למה מייל שנשלח מהמערכת לא הגיע?', a: 'בדקו בתיקיית הספאם. אם עדיין לא הגיע, ייתכן ששירות המייל עוד לא חובר – ביומן המיילים אפשר לראות את מצב השליחה.' },
];
