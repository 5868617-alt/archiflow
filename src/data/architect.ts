// Professional knowledge for an Israeli architecture / interior design studio:
// phase templates per kind of office work, permit stages, consultant disciplines and the client brief.
// All of these are starting points the studio edits per project – never fixed rules.
import type * as T from './types';

// ---------------------------------------------------------------- phase templates (fee % is a suggestion only)
export interface PhaseTemplate { id: string; label: string; hint: string; phases: { name: string; feePct: number; hours: number }[]; consultants: string[] }
export const PHASE_TEMPLATES: PhaseTemplate[] = [
  { id: 'interior', label: 'שיפוץ ועיצוב פנים', hint: 'דירות, שיפוץ מלא או חלקי, מטבחים וחדרי רחצה',
    phases: [
      { name: 'פגישת היכרות ופרוגרמה', feePct: 10, hours: 8 },
      { name: 'מדידה ותיעוד מצב קיים', feePct: 10, hours: 10 },
      { name: 'קונספט ותכנון מוקדם', feePct: 20, hours: 30 },
      { name: 'תכנון מפורט ותכניות עבודה', feePct: 25, hours: 50 },
      { name: 'מפרט ובחירת חומרים', feePct: 15, hours: 24 },
      { name: 'ליווי ופיקוח עליון', feePct: 15, hours: 36 },
      { name: 'מסירה ותיקונים', feePct: 5, hours: 8 },
    ], consultants: ['חשמל ותאורה', 'אינסטלציה', 'מיזוג אוויר', 'קונסטרוקציה'] },
  { id: 'house', label: 'בית פרטי ובנייה חדשה', hint: 'תכנון בית, הגשה להיתר וליווי בנייה',
    phases: [
      { name: 'פרוגרמה ובדיקת תב"ע', feePct: 5, hours: 16 },
      { name: 'תכנון מוקדם וסקיצות', feePct: 15, hours: 60 },
      { name: 'תכנון סופי והגשה להיתר', feePct: 20, hours: 90 },
      { name: 'תכניות עבודה ותיאום יועצים', feePct: 25, hours: 140 },
      { name: 'מכרז ובחירת קבלן', feePct: 5, hours: 20 },
      { name: 'פיקוח עליון', feePct: 25, hours: 120 },
      { name: 'מסירה וטופס 4', feePct: 5, hours: 16 },
    ], consultants: ['קונסטרוקציה', 'קרקע וביסוס', 'אינסטלציה', 'חשמל ותאורה', 'מיזוג אוויר', 'בטיחות אש', 'מודד מוסמך', 'בנייה ירוקה ותרמי'] },
  { id: 'commercial', label: 'מסחרי ומשרדים', hint: 'משרדים, חנויות, מסעדות ובתי קפה, אירוח',
    phases: [
      { name: 'פרוגרמה ופריסת שטחים', feePct: 10, hours: 24 },
      { name: 'קונספט ומיתוג החלל', feePct: 15, hours: 40 },
      { name: 'תכנון מפורט ותיאום יועצים', feePct: 30, hours: 110 },
      { name: 'אישורים: כיבוי אש, נגישות ורישוי עסק', feePct: 10, hours: 30 },
      { name: 'מכרז ורכש', feePct: 10, hours: 30 },
      { name: 'פיקוח ביצוע', feePct: 20, hours: 80 },
      { name: 'מסירה ואכלוס', feePct: 5, hours: 12 },
    ], consultants: ['בטיחות אש', 'נגישות', 'מיזוג אוויר', 'חשמל ותאורה', 'אינסטלציה', 'אקוסטיקה', 'קונסטרוקציה'] },
  { id: 'planning', label: 'תכנון ותב"ע / פרויקטים גדולים', hint: 'תכניות בניין עיר, התחדשות עירונית, מבני ציבור',
    phases: [
      { name: 'איסוף נתונים וסקר', feePct: 10, hours: 60 },
      { name: 'חלופות תכנון', feePct: 15, hours: 120 },
      { name: 'טיוטת תכנית ותיאום גורמים', feePct: 25, hours: 200 },
      { name: 'הגשה לוועדה', feePct: 15, hours: 80 },
      { name: 'הפקדה והתנגדויות', feePct: 20, hours: 100 },
      { name: 'אישור ומתן תוקף', feePct: 15, hours: 40 },
    ], consultants: ['תנועה וחניה', 'סביבה', 'מודד מוסמך', 'שמאי', 'נוף', 'תשתיות', 'שימור'] },
];
export function guessTemplate(type = ''): string {
  if (/תב"ע|תב״ע|תכנית|התחדשות|ציבור/.test(type)) return 'planning';
  if (/משרד|מסחר|קפה|מסעד|חנות|מלון|אירוח/.test(type)) return 'commercial';
  if (/בית פרטי|וילה|בנייה חדשה/.test(type)) return 'house';
  return 'interior';
}
export const PHASE_STATUS: Record<T.PhaseStatus, { label: string; tone: string }> = {
  upcoming: { label: 'טרם התחיל', tone: '' }, active: { label: 'בעבודה', tone: 'info' }, done: { label: 'הושלם', tone: 'ok' },
};

// ---------------------------------------------------------------- building permit
export const PERMIT_STAGES: { id: T.PermitStage; label: string; hint: string }[] = [
  { id: 'info_file', label: 'תיק מידע', hint: 'בקשה לתיק מידע וקבלתו מהוועדה' },
  { id: 'preparing', label: 'הכנת הבקשה', hint: 'תכניות, חישובי שטחים ואישורי יועצים' },
  { id: 'submitted', label: 'הוגשה', hint: 'קליטת הבקשה במערכת רישוי זמין' },
  { id: 'review', label: 'בבדיקה', hint: 'בקרת תכן והערות מהנדס הוועדה' },
  { id: 'committee', label: 'דיון בוועדה', hint: 'דיון בוועדה המקומית או ברשות הרישוי' },
  { id: 'conditions', label: 'מילוי תנאים', hint: 'תנאים להיתר, אגרות והיטלים' },
  { id: 'granted', label: 'היתר התקבל', hint: 'היתר בנייה בתוקף' },
];
export const PERMIT_REJECTED = { id: 'rejected' as const, label: 'נדחתה' };
export const permitLabel = (s: T.PermitStage) => (s === 'rejected' ? PERMIT_REJECTED.label : PERMIT_STAGES.find((x) => x.id === s)?.label || s);
export const REQUEST_TYPES = ['היתר בנייה – בנייה חדשה', 'היתר בנייה – תוספת', 'שינויים פנימיים', 'שינוי שימוש', 'הקלה', 'היתר מקוצר', 'הריסה', 'רישוי עסק'];

export const CONSULTANT_DISCIPLINES = ['קונסטרוקציה', 'קרקע וביסוס', 'אינסטלציה', 'חשמל ותאורה', 'מיזוג אוויר', 'בטיחות אש', 'נגישות', 'אקוסטיקה', 'בנייה ירוקה ותרמי', 'מודד מוסמך', 'תנועה וחניה', 'נוף', 'סביבה', 'שמאי', 'תשתיות', 'שימור'];
export const CONSULTANT_STATUS: Record<T.ConsultantStatus, { label: string; tone: string }> = {
  needed: { label: 'נדרש', tone: 'warn' }, engaged: { label: 'בעבודה', tone: 'info' }, delivered: { label: 'מסר תכניות', tone: 'ok' },
};

// ---------------------------------------------------------------- site supervision
export const SEVERITY: Record<T.SiteFinding['severity'], { label: string; tone: string }> = { low: { label: 'נמוכה', tone: '' }, medium: { label: 'בינונית', tone: 'warn' }, high: { label: 'גבוהה', tone: 'bad' } };
export const FINDING_STATUS: Record<T.FindingStatus, { label: string; tone: string }> = { open: { label: 'פתוח', tone: 'warn' }, fixed: { label: 'תוקן – ממתין לאימות', tone: 'info' }, verified: { label: 'אומת', tone: 'ok' } };
export const NEXT_FINDING: Record<T.FindingStatus, T.FindingStatus> = { open: 'fixed', fixed: 'verified', verified: 'open' };

// ---------------------------------------------------------------- client brief
export type BriefQ = { id: string; q: string; type: 'text' | 'long' | 'choice' | 'multi'; options?: string[]; hint?: string };
export const BRIEF_SECTIONS: { title: string; questions: BriefQ[] }[] = [
  { title: 'מי גר כאן', questions: [
    { id: 'household', q: 'מי יגור בבית? (מבוגרים, ילדים וגילאים, חיות מחמד)', type: 'long' },
    { id: 'routine', q: 'איך נראה יום רגיל אצלכם? מי עובד מהבית, מי מבשל, מתי מארחים?', type: 'long' },
    { id: 'hosting', q: 'כמה אורחים אתם מארחים בדרך כלל?', type: 'choice', options: ['כמעט לא', 'עד 6', '6–12', 'יותר מ-12'] },
  ] },
  { title: 'חללים וצרכים', questions: [
    { id: 'spaces', q: 'אילו חללים חשובים לכם במיוחד?', type: 'multi', options: ['מטבח גדול', 'פינת אוכל', 'חדר עבודה', 'חדר משחקים', 'חדר אורחים', 'מרפסת', 'חדר כביסה', 'מחסן', 'ממ"ד כחדר שימושי'] },
    { id: 'storage', q: 'כמה אחסון אתם צריכים, ולמה בעיקר?', type: 'long' },
    { id: 'keep', q: 'רהיטים או פריטים שחייבים להישאר', type: 'long' },
    { id: 'accessibility', q: 'צרכים מיוחדים: נגישות, רגישויות, עבודה מהבית', type: 'long' },
  ] },
  { title: 'סגנון ותחושה', questions: [
    { id: 'style', q: 'אילו סגנונות מדברים אליכם?', type: 'multi', options: ['מינימליסטי', 'סקנדינבי', 'ים תיכוני', 'תעשייתי', 'כפרי מודרני', 'וינטג׳', 'יפני (ג׳פנדי)', 'קלאסי', 'אקלקטי'] },
    { id: 'feel', q: 'איך תרצו להרגיש כשאתם נכנסים הביתה?', type: 'long', hint: 'לדוגמה: רגוע, מואר, חם, מרשים' },
    { id: 'colors', q: 'צבעים וחומרים שאתם אוהבים – ושאתם לא מוכנים לראות', type: 'long' },
  ] },
  { title: 'תקציב ולוחות זמנים', questions: [
    { id: 'budget', q: 'מסגרת תקציב משוערת לביצוע (לא כולל שכר טרחה)', type: 'choice', options: ['עד 150 אלף ₪', '150 עד 300 אלף ₪', '300 עד 600 אלף ₪', '600 אלף עד מיליון ₪', 'מעל מיליון ₪', 'עוד לא יודעים'] },
    { id: 'deadline', q: 'יש תאריך שחייבים לעמוד בו? (מעבר דירה, לידה, חג)', type: 'text' },
    { id: 'priorities', q: 'אם צריך לוותר – על מה הכי קל לכם לוותר?', type: 'long' },
  ] },
];
export const BRIEF_QUESTIONS = BRIEF_SECTIONS.flatMap((s) => s.questions);
export function briefProgress(b?: T.ClientBrief) {
  if (!b) return 0;
  const n = BRIEF_QUESTIONS.filter((q) => { const a = b.answers[q.id]; return Array.isArray(a) ? a.length > 0 : !!(a && String(a).trim()); }).length;
  return n / BRIEF_QUESTIONS.length;
}
export const BRIEF_STATUS: Record<T.ClientBrief['status'], { label: string; tone: string }> = { draft: { label: 'טרם נשלח', tone: '' }, sent: { label: 'אצל הלקוח', tone: 'warn' }, submitted: { label: 'הלקוח מילא', tone: 'ok' } };
export const REACTIONS: Record<NonNullable<T.MoodItem['reaction']>, { label: string; emoji: string; tone: string }> = {
  love: { label: 'אוהבים', emoji: '♥', tone: 'ok' }, maybe: { label: 'אולי', emoji: '?', tone: 'warn' }, no: { label: 'לא בשבילנו', emoji: '✕', tone: 'bad' },
};

// ---------------------------------------------------------------- library
export const LIBRARY_CATEGORIES = ['ריצוף וחיפוי', 'שיש ומשטחים', 'עץ ופרקט', 'כלים סניטריים', 'ברזים', 'תאורה', 'ריהוט', 'טקסטיל', 'צבע וטיח', 'פרזול', 'מטבחים', 'דלתות וחלונות'];

// ---------------------------------------------------------------- branding
export const BRAND_PRESETS = ['#3D2233', '#1F3A5F', '#2F5D50', '#6B3E26', '#4A4A4A', '#7A2E3A', '#2C4A6E', '#5A4A78'];
/** dark or light text on a brand color, whichever reads better (WCAG luminance) */
export function inkOn(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? '#FFFFFF' : '#1E1A1C';
}

// ---------------------------------------------------------------- shrink a photo before it is kept (demo keeps it in the browser)
export function shrinkImage(file: File, max = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
}
