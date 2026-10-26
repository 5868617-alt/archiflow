import { IS_LIVE } from '../data/dates';
import { useState } from 'react';
import { LuCheck, LuX, LuCreditCard, LuArrowUpRight, LuArrowDownRight, LuHistory, LuReceipt, LuTriangleAlert, LuFlaskConical, LuRefreshCw, LuShieldCheck, LuCircleCheck, LuHardDrive, LuUsers, LuFolderKanban } from 'react-icons/lu';
import { useStore } from '../data/store';
import { currentPlan, canManageBilling, A, byId, VAT } from '../data/api';
import { FEATURE_DEFS } from '../data/seed';
import type * as T from '../data/types';
import { todayISO, daysFromToday } from '../data/dates';
import { PageHead, Btn, Card, KV, StatusBadge, Badge, Modal, Field, Input, Select, Textarea, Empty, Callout, Stat, Progress, Segmented, DataTable, Check, cx, DemoTag, AssumeTag } from '../ui/core';
import { ils, ils2, date, relDay } from '../lib/format';

const priceOf = (p: T.SubscriptionPlan, cycle: string) => (cycle === 'שנתי' ? p.priceYearlyPerMonth ?? p.priceMonthly : p.priceMonthly);

export function SubBanner() {
  const { db, me, nav, live } = useStore();
  const sub = db.officeSubscription;
  const owner = me.role === 'owner' || me.role === 'admin';
  if (sub.status === 'פעיל') return null;
  const map: Record<string, [string, string]> = {
    'תקופת ניסיון': ['info', `תקופת ניסיון – נותרו ${sub.trialEndsAt ? Math.max(0, daysFromToday(sub.trialEndsAt)) : 14} ימים. בחרו מסלול כדי להמשיך ללא הפסקה.`],
    'חוב פתוח': ['bad', 'החיוב האחרון נכשל. יש לעדכן אמצעי תשלום תוך 7 ימים כדי למנוע הגבלת גישה'+(IS_LIVE ? '.' : ' (מדיניות דמו).')],
    'יבוטל בסוף התקופה': ['assume', `המנוי יבוטל ב-${date(sub.cancelAt)}. עד אז כל היכולות זמינות.`],
    'בוטל': ['bad', 'המנוי בוטל. המערכת במצב קריאה בלבד'+(IS_LIVE ? '.' : ' (מדיניות דמו).')],
    'פג תוקף': ['bad', 'תוקף המנוי פג. רוב היכולות נעולות עד חידוש'+(IS_LIVE ? '.' : ' (מדיניות דמו).')],
  };
  const [kind, text] = map[sub.status] || ['info', sub.status];
  return <div style={{ marginBottom: 16 }}><Callout kind={kind} title={`מצב מנוי: ${sub.status}`}>{text} {owner ? <button type="button" className="linkish" onClick={() => nav('/billing')}>לניהול המנוי</button> : null}</Callout></div>;
}

export function PricingPage({ inApp }: { inApp?: boolean }) {
  const { db, me, nav, live } = useStore();
  const [cycle, setCycle] = useState('חודשי');
  const plans = db.subscriptionPlans;
  const sub = db.officeSubscription;
  const groups = [...new Set(FEATURE_DEFS.map((f) => f.group))];
  const limitRow = (label: string, k: keyof T.SubscriptionPlan['limits'], unit = '') => <tr key={k}><td>{label}</td>{plans.map((p) => <td key={p.id} className="t-center num">{p.limits[k] === null ? 'ללא הגבלה' : p.limits[k] === 0 ? <LuX aria-label="לא כלול" style={{ width: 16, color: 'var(--ink-3)' }} /> : `${p.limits[k]}${unit}`}</td>)}</tr>;
  const Wrap = ({ children }: any) => inApp ? <div>{children}</div> : <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px max(16px, env(safe-area-inset-left, 0px)) 64px max(16px, env(safe-area-inset-right, 0px))' }}>{children}</div>;
  return (
    <Wrap>
      <div className="t-center stack" style={{ alignItems: 'center', marginBottom: 32 }}>
        <span className="eyebrow">תמחור ArchiFlow</span>
        <h1 className="display" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', maxWidth: 680 }}>מסלול אחד לסטודיו קטן, אחד למשרד שעובד עם לקוחות ורכש</h1>
        <p className="soft" style={{ maxWidth: 560 }}>14 ימי ניסיון בכל מסלול. אפשר לשדרג, לשנמך או לבטל בכל רגע.</p>
        <div className="row g8 wrap" style={{ justifyContent: 'center' }}><AssumeTag>{IS_LIVE ? 'מחירים זמניים – טעונים אישור' : 'מחירי דמו – טעונים אישור'}</AssumeTag><AssumeTag>{IS_LIVE ? 'חלוקת יכולות – טעונה אישור' : 'חלוקת יכולות – הנחת דמו'}</AssumeTag></div>
        <Segmented value={cycle} onChange={setCycle} options={[{ value: 'חודשי', label: 'חיוב חודשי' }, { value: 'שנתי', label: 'חיוב שנתי (חיסכון משוער)' }]} />
      </div>
      <div className="grid-2" style={{ maxWidth: 860, margin: '0 auto' }}>
        {plans.map((p) => {
          const current = inApp && sub.planId === p.id && sub.status !== 'בוטל';
          return (
            <div key={p.id} className={cx('card price-card', p.id === 'pro' && 'featured')}>
              {p.id === 'pro' ? <span className="badge navy" style={{ position: 'absolute', top: -11, insetInlineStart: 24 }}>הכי מתאים למשרדים עם לקוחות</span> : null}
              <div><div className="display" style={{ fontSize: '1.6rem' }}>{p.name}</div><div className="small soft">{p.tagline}</div></div>
              <div><span className="price-tag">₪{priceOf(p, cycle)}</span><span className="soft"> / חודש</span><div className="xs muted">{cycle === 'שנתי' ? `₪${(priceOf(p, cycle) * 12).toLocaleString('he-IL')} בחיוב שנתי · ` : ''}לפני מע״מ · {IS_LIVE ? 'מחיר זמני' : 'מחיר דמו'}</div></div>
              <div className="col g8">
                <div className="feat-li"><LuUsers aria-hidden />עד {p.limits.users ?? 'ללא הגבלת'} משתמשים</div>
                <div className="feat-li"><LuFolderKanban aria-hidden />{p.limits.activeProjects ? `עד ${p.limits.activeProjects} פרויקטים פעילים` : 'פרויקטים ללא הגבלה'}</div>
                <div className="feat-li"><LuHardDrive aria-hidden />{p.limits.storageGb}GB אחסון</div>
                {FEATURE_DEFS.filter((f) => ['client_portal', 'procurement', 'plans_compare', 'fees'].includes(f.key)).map((f) => <div key={f.key} className={cx('feat-li', !p.features[f.key] && 'no')}>{p.features[f.key] ? <LuCheck aria-hidden /> : <LuX aria-hidden />}{f.label}</div>)}
              </div>
              <div className="grow" />
              {current ? <Btn block disabled>המסלול הנוכחי שלכם</Btn> : inApp ? (me.role === 'owner' || me.role === 'admin' ? <Btn block kind={p.id === 'pro' ? 'primary' : ''} onClick={() => nav(`/billing/change?plan=${p.id}&cycle=${cycle}`)}>{sub.planId === 'starter' && p.id === 'pro' ? 'שדרוג ל-Pro' : `מעבר ל-${p.name}`}</Btn> : null) : <Btn block kind={p.id === 'pro' ? 'primary' : ''} onClick={() => nav(`/register?plan=${p.id}`)}>התחלת ניסיון חינם</Btn>}
            </div>
          );
        })}
      </div>
      <h2 className="display t-center" style={{ fontSize: 'var(--fs-2xl)', margin: '48px 0 16px' }}>השוואה מלאה</h2>
      <div className="card" style={{ maxWidth: 860, margin: '0 auto' }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>יכולת</th>{plans.map((p) => <th key={p.id} className="t-center">{p.name}<div className="xs muted">₪{priceOf(p, cycle)}/חודש</div></th>)}</tr></thead>
            <tbody>
              <tr className="group-row"><td colSpan={3}>מגבלות</td></tr>
              {limitRow('משתמשי צוות', 'users')}
              {limitRow('פרויקטים פעילים', 'activeProjects')}
              {limitRow('אחסון', 'storageGb', 'GB')}
              {limitRow('לקוחות בפורטל', 'clientPortalSeats')}
              {groups.flatMap((g) => [<tr key={g} className="group-row"><td colSpan={3}>{g}</td></tr>, ...FEATURE_DEFS.filter((f) => f.group === g).map((f) => <tr key={f.key}><td>{f.label}</td>{plans.map((p) => <td key={p.id} className="t-center">{p.features[f.key] ? <LuCheck aria-label="כלול" style={{ width: 18, color: 'var(--ok)' }} /> : <LuX aria-label="לא כלול" style={{ width: 16, color: 'var(--ink-3)' }} />}</td>)}</tr>)])}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ maxWidth: 860, margin: '24px auto 0' }} className="stack">
        <Callout kind="assume" title="מה עדיין לא הוחלט">המחירים (₪149 / ₪299), ההנחה השנתית, משך הניסיון, כללי השנמוך והביטול והחלוקה המדויקת של היכולות הם הנחות דמו. כולם ניתנים לעריכה במסך "מסלולים ותמחור" של ה-Super Admin.</Callout>
        <Callout kind="info">{IS_LIVE ? 'עדיין לא מחובר ספק סליקה, ולכן לא מבוצע חיוב. בחירת מסלול נרשמת כבקשה.' : 'התשלום בדמו מדומה לחלוטין: לא מחובר ספק סליקה ולא מבוצע חיוב.'}</Callout>
      </div>
    </Wrap>
  );
}

export function BillingPage({ query }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const sub = db.officeSubscription;
  const plan = currentPlan(db);
  const can = canManageBilling(db, me);
  const [pay, setPay] = useState(false);
  const pending = (sub as any).pendingPlan as string | undefined;
  const staffCount = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status !== 'מושבת').length;
  const active = db.projects.filter((p) => !['הושלם', 'בהשהיה', 'ליד חדש'].includes(p.status)).length;
  const price = priceOf(plan, sub.cycle);
  return (
    <div>
      <PageHead title="מנוי וחיוב" badge={IS_LIVE ? <AssumeTag>ספק סליקה טרם חובר</AssumeTag> : <DemoTag>חיובים מדומים</DemoTag>} sub="פרטי המנוי של המשרד, שימוש, חשבוניות והיסטוריה." actions={can ? <><Btn onClick={() => nav('/pricing')}>השוואת מסלולים</Btn><Btn kind="primary" onClick={() => nav('/billing/change')}>שינוי מסלול</Btn></> : null} />
      {!can ? <div style={{ marginBottom: 16 }}><Callout kind="assume">מנהלי משרד רואים את פרטי המנוי בלבד. שינויים – לבעלי המשרד{IS_LIVE ? ' (ניתן לשנות בהגדרות ההרשאות).' : ' (הנחת דמו, ניתנת לשינוי בהרשאות).'}</Callout></div> : null}
      <SubBanner />
      <div className="grid-main-side">
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="המנוי הנוכחי" icon={LuCreditCard} actions={<StatusBadge s={sub.status} />}>
            <div className="row wrap g24" style={{ alignItems: 'flex-start' }}>
              <div className="grow" style={{ minWidth: 220 }}>
                <div className="display" style={{ fontSize: '2rem' }}>{plan.name}</div>
                <div className="soft">{plan.tagline}</div>
                <div className="mt16"><span className="price-tag" style={{ fontSize: '2rem' }}>₪{price}</span><span className="soft"> לחודש · חיוב {sub.cycle}</span><div className="xs muted">לפני מע״מ ({ils2(price * VAT)}) · {IS_LIVE ? 'מחיר זמני' : 'מחיר דמו'}</div></div>
              </div>
              <KV items={[['תחילת מנוי', date(sub.startedAt)], [sub.status === 'יבוטל בסוף התקופה' ? 'מסתיים ב' : 'חידוש הבא', `${date(sub.currentPeriodEnd)} · ${relDay(sub.currentPeriodEnd)}`], ['אמצעי תשלום', <span className="row g8">{sub.paymentMethod}{IS_LIVE ? null : <Badge tone="warn">מדומה</Badge>}</span>], ...(pending ? [['שינוי מתוזמן', `מעבר ל-${pending === 'pro' ? 'Pro' : 'Starter'} ב-${date(sub.currentPeriodEnd)}`] as [string, any]] : [])]} />
            </div>
            {can ? (
              <div className="row wrap g8 mt16">
                {IS_LIVE ? <Btn icon={LuCreditCard} disabled title="יתאפשר אחרי חיבור ספק סליקה">אמצעי תשלום</Btn> : <Btn icon={LuCreditCard} onClick={() => setPay(true)}>עדכון אמצעי תשלום</Btn>}
                {sub.status === 'יבוטל בסוף התקופה' ? <Btn kind="ok" onClick={() => { run(A.resumeSubscription); toast('הביטול בוטל – המנוי ממשיך'); }}>חידוש המנוי</Btn> : sub.status !== 'בוטל' && sub.status !== 'פג תוקף' ? <Btn kind="danger" onClick={() => nav('/billing/cancel')}>ביטול מנוי</Btn> : <Btn kind="primary" onClick={() => { run(A.changePlan, plan.id, sub.cycle); toast(IS_LIVE ? 'בקשת החידוש נרשמה. ההפעלה תתבצע אחרי התשלום (ספק סליקה טרם חובר).' : 'המנוי חודש (הדמיה)', IS_LIVE ? 'info' : 'ok'); }}>חידוש המנוי</Btn>}
                {pending && !IS_LIVE ? <Btn icon={LuFlaskConical} onClick={() => { run(A.applyPendingDowngrade); toast('סימולציה: סוף התקופה הגיע והשנמוך נכנס לתוקף', 'info'); }}>סימולציית סוף תקופה</Btn> : null}
              </div>
            ) : null}
          </Card>
          <Card title="שימוש מול מגבלות המסלול">
            <div className="col g16">
              {[['משתמשי צוות', staffCount, plan.limits.users], ['פרויקטים פעילים', active, plan.limits.activeProjects], ['אחסון (GB)', sub.storageUsedGb, plan.limits.storageGb]].map(([l, v, lim]: any) => (
                <div key={l}><div className="meter-label"><span>{l}</span><span className={cx('num ltr', lim && v > lim && 'bad-t bold')}>{v} / {lim ?? '∞'}</span></div><Progress value={lim ? v / lim : 0.15} tone={lim && v > lim ? 'bad' : lim && v / lim > 0.8 ? 'warn' : ''} />{lim && v > lim ? <div className="xs bad-t mt8">חריגה ממגבלת המסלול{IS_LIVE ? ' – הוספה נוספת נחסמת עד שדרוג' : ' – בייצור תידרש החלטה על חסימה או חיוב נוסף (פתוח)'}</div> : null}</div>
              ))}
            </div>
          </Card>
          <Card title="חשבוניות" icon={LuReceipt} pad={false} actions={IS_LIVE ? undefined : <DemoTag>חשבוניות מדומות</DemoTag>}>
            <DataTable rows={db.invoices} empty={<Empty title="אין חשבוניות עדיין">חשבוניות יופיעו כאן אחרי חיבור ספק הסליקה.</Empty>} onRow={(i: T.Invoice) => nav(`/billing/invoices/${i.id}`)} pageSize={8} columns={[
              { key: 'number', label: 'מספר', render: (i: T.Invoice) => <span className="code">{i.number}</span> },
              { key: 'date', label: 'תאריך', render: (i: T.Invoice) => date(i.date) },
              { key: 'planId', label: 'מסלול', render: (i: T.Invoice) => i.planId === 'pro' ? 'Pro' : 'Starter' },
              { key: 'amount', label: 'סכום כולל מע״מ', num: true, sortValue: (i: T.Invoice) => i.amount + i.vat, render: (i: T.Invoice) => ils2(i.amount + i.vat) },
              { key: 'status', label: 'סטטוס', render: (i: T.Invoice) => <span className="row g8"><StatusBadge s={i.status} />{i.status === 'נכשלה' && can && !IS_LIVE ? <Btn size="xs" icon={LuRefreshCw} onClick={(e: any) => { e.stopPropagation(); run(A.retryInvoice, i.id); toast('ניסיון חיוב חוזר הצליח (הדמיה)'); }}>ניסיון חוזר</Btn> : null}</span> },
            ]} />
          </Card>
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="היסטוריית מנוי" icon={LuHistory}>
            <div className="timeline">{[...sub.history].reverse().map((h, i) => <div key={i} className={cx('tl-item', i === 0 ? 'now' : 'done')}><div className="small">{h.text}</div><div className="xs muted">{date(h.at)} · {h.by}</div></div>)}</div>
          </Card>
          {can && !IS_LIVE ? (
            <Card title="סימולציית מצבי מנוי" icon={LuFlaskConical} actions={<DemoTag />}>
              <p className="small soft mb8">לבדיקת התנהגות המערכת במצבים שונים: באנרים, נעילת יכולות והודעות.</p>
              <div className="col g8">{(['פעיל', 'תקופת ניסיון', 'חוב פתוח', 'יבוטל בסוף התקופה', 'פג תוקף'] as const).map((s) => <Btn key={s} size="sm" kind={sub.status === s ? 'navy' : ''} onClick={() => { run(A.simulateSubState, s); toast(`מצב המנוי שונה ל"${s}" (סימולציה)`, 'info'); }}>{s}</Btn>)}</div>
              <div className="xs muted mt8">"פג תוקף" נועל את רוב היכולות בתפריט – החזירו ל"פעיל" לסיום.</div>
            </Card>
          ) : null}
          <Callout kind="assume" title="מדיניות חיוב – טרם הוחלטה">{IS_LIVE ? 'חיוב יחסי בשדרוג, שנמוך בסוף תקופה, ימי חסד בחיוב שנכשל ו-90 יום קריאה בלבד אחרי ביטול – כולן הנחות שטרם אושרו. כרגע: בסוף תקופת הניסיון המשרד עובר לקריאה בלבד, ושנמוך נכנס לתוקף בסוף התקופה.' : 'חיוב יחסי בשדרוג, שנמוך בסוף תקופה, 7 ימי חסד בחיוב שנכשל ו-90 יום קריאה בלבד אחרי ביטול – כולן הנחות דמו.'}</Callout>
        </div>
      </div>
      {pay ? (
        <Modal title="עדכון אמצעי תשלום" onClose={() => setPay(false)} size="narrow" foot={<><Btn kind="primary" onClick={() => { run((d: any) => { d.officeSubscription.paymentMethod = 'כרטיס מדומה •••• 1881'; d.officeSubscription.history.push({ at: todayISO, text: 'עדכון אמצעי תשלום (מדומה)', by: me.name }); }); toast('אמצעי התשלום עודכן (הדמיה – לא נשמרו פרטי כרטיס)'); setPay(false); }}>שמירה (הדמיה)</Btn><Btn kind="ghost" onClick={() => setPay(false)}>ביטול</Btn></>}>
          <div className="stack">
            <Callout kind="bad" icon={LuShieldCheck} title="אין להזין פרטי כרטיס אמיתיים">בדמו אין סליקה. בייצור הטופס יוחלף ברכיב מאובטח של ספק התשלומים (לא נבחר עדיין), ופרטי הכרטיס לא יעברו דרך ArchiFlow.</Callout>
            <div className="lock-panel" style={{ padding: 20 }}><LuCreditCard aria-hidden style={{ width: 28, height: 28 }} /><b>כאן ייטען רכיב התשלום של ספק הסליקה</b><span className="xs muted">לחיצה על "שמירה" תחליף את הכרטיס המדומה בכרטיס מדומה אחר.</span></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function ChangePlan({ query }: any) {
  const { db, me, run, toast, nav, live } = useStore();
  const sub = db.officeSubscription;
  const can = canManageBilling(db, me);
  const [planId, setPlanId] = useState<'starter' | 'pro'>(query.plan === 'starter' || query.plan === 'pro' ? query.plan : sub.planId === 'pro' ? 'starter' : 'pro');
  const [cycle, setCycle] = useState<'חודשי' | 'שנתי'>(query.cycle === 'שנתי' ? 'שנתי' : sub.cycle);
  const [step, setStep] = useState(1);
  if (!can) return <Empty heading="h1" title="רק בעלי המשרד יכולים לשנות מסלול" action={<Btn onClick={() => nav('/billing')}>חזרה</Btn>} />;
  const from = currentPlan(db); const to = db.subscriptionPlans.find((p) => p.id === planId)!;
  const upgrade = from.id === 'starter' && to.id === 'pro';
  const same = from.id === to.id && cycle === sub.cycle;
  const gained = FEATURE_DEFS.filter((f) => to.features[f.key] && !from.features[f.key]);
  const lost = FEATURE_DEFS.filter((f) => !to.features[f.key] && from.features[f.key]);
  const staffCount = db.users.filter((u) => u.officeId && u.role !== 'client' && u.status !== 'מושבת').length;
  const active = db.projects.filter((p) => !['הושלם', 'בהשהיה', 'ליד חדש'].includes(p.status)).length;
  const overs = [to.limits.users !== null && staffCount > to.limits.users ? `יש ${staffCount} משתמשים פעילים; המסלול מאפשר ${to.limits.users}` : null, to.limits.activeProjects !== null && active > to.limits.activeProjects ? `יש ${active} פרויקטים פעילים; המסלול מאפשר ${to.limits.activeProjects}` : null, sub.storageUsedGb > to.limits.storageGb ? `האחסון בשימוש ${sub.storageUsedGb}GB; המסלול מאפשר ${to.limits.storageGb}GB` : null].filter(Boolean) as string[];
  const days = Math.max(1, daysFromToday(sub.currentPeriodEnd));
  const prorate = upgrade ? Math.round(((priceOf(to, cycle) - priceOf(from, sub.cycle)) * days) / 30) : 0;
  return (
    <div style={{ maxWidth: 860 }}>
      <PageHead crumbs={[{ label: 'מנוי וחיוב', to: '/billing' }, { label: 'שינוי מסלול' }]} title="שינוי מסלול" badge={IS_LIVE ? <AssumeTag>לא יבוצע חיוב</AssumeTag> : <DemoTag>לא יבוצע חיוב</DemoTag>} />
      <div className="steps">{['בחירת מסלול', 'סיכום ואישור', 'בוצע'].map((s, i) => <span key={s} className="row" style={{ gap: 0 }}><span className={cx('step', i + 1 < step && 'done', i + 1 === step && 'on')}><span className="s-n">{i + 1 < step ? '✓' : i + 1}</span>{s}</span>{i < 2 ? <span className="step-line" /> : null}</span>)}</div>
      {step === 1 ? (
        <div className="stack-lg">
          <div className="grid-2">
            {db.subscriptionPlans.map((p) => (
              <button key={p.id} type="button" className={cx('card price-card', planId === p.id && 'featured')} style={{ textAlign: 'right', font: 'inherit', color: 'inherit', cursor: 'pointer' }} onClick={() => setPlanId(p.id)} aria-pressed={planId === p.id}>
                <div className="row between"><b className="display" style={{ fontSize: '1.4rem' }}>{p.name}</b>{sub.planId === p.id ? <Badge>נוכחי</Badge> : null}</div>
                <div><span className="price-tag" style={{ fontSize: '2rem' }}>₪{priceOf(p, cycle)}</span><span className="soft"> / חודש</span></div>
                <div className="small soft">{p.tagline}</div>
              </button>
            ))}
          </div>
          <Field label="מחזור חיוב"><Segmented value={cycle} onChange={setCycle} options={[{ value: 'חודשי', label: 'חודשי' }, { value: 'שנתי', label: 'שנתי' }]} /></Field>
          <div className="row g8"><Btn kind="primary" disabled={same} onClick={() => setStep(2)}>המשך לסיכום</Btn><Btn kind="ghost" onClick={() => nav('/billing')}>ביטול</Btn>{same ? <span className="small muted">זה המסלול הנוכחי</span> : null}</div>
        </div>
      ) : null}
      {step === 2 ? (
        <div className="stack-lg">
          <Card title={`${from.name} ← ${to.name} · ${cycle}`} icon={upgrade ? LuArrowUpRight : LuArrowDownRight}>
            <div className="stack">
              <KV items={[['מחיר חדש', `₪${priceOf(to, cycle)} לחודש + מע״מ`], ['נכנס לתוקף', upgrade ? 'מיד' : `בסוף התקופה – ${date(sub.currentPeriodEnd)}`], ...(upgrade ? [['חיוב יחסי היום (משוער)', `${ils(prorate)} + מע״מ עבור ${days} ימים`] as [string, any]] : [])]} />
              {gained.length ? <div><b className="small">יכולות שיתווספו</b>{gained.map((f) => <div key={f.key} className="feat-li small"><LuCheck aria-hidden />{f.label}</div>)}</div> : null}
              {lost.length ? <div><b className="small">יכולות שייחסמו</b>{lost.map((f) => <div key={f.key} className="feat-li no small"><LuX aria-hidden />{f.label}</div>)}<div className="xs muted mt8">הנתונים נשמרים; רק הגישה ליכולות נחסמת (הנחת דמו).</div></div> : null}
              {overs.length ? <Callout kind="bad" icon={LuTriangleAlert} title="השימוש הנוכחי חורג מהמסלול החדש">{overs.join(' · ')}. ההתנהגות במצב הזה טרם הוחלטה – כרגע מוצגת אזהרה בלבד.</Callout> : null}
            </div>
          </Card>
          <div className="row g8"><Btn kind="primary" onClick={() => { run(A.changePlan, planId, cycle); setStep(3); toast(IS_LIVE ? 'הבקשה נרשמה' : upgrade ? 'השדרוג בוצע (הדמיה)' : 'השינוי תוזמן (הדמיה)'); }}>{upgrade ? 'אישור שדרוג' : 'אישור שינוי'}</Btn><Btn kind="ghost" onClick={() => setStep(1)}>חזרה</Btn></div>
        </div>
      ) : null}
      {step === 3 ? (
        <Card>
          <Empty icon={LuCircleCheck} title={IS_LIVE ? `הבקשה למעבר ל-${to.name} נרשמה` : upgrade ? `עברתם ל-${to.name}` : `השינוי ל-${to.name} תוזמן`} action={<div className="row g8"><Btn kind="primary" onClick={() => nav('/billing')}>לפרטי המנוי</Btn><Btn onClick={() => nav('/dashboard')}>למסך הבית</Btn></div>}>
            {IS_LIVE ? 'ספק סליקה עדיין לא מחובר, ולכן לא בוצע חיוב והמסלול לא הוחלף. צוות ArchiFlow יראה את הבקשה ויחזור אליכם.' : upgrade ? 'כל יכולות המסלול זמינות כעת. נוספה חשבונית יחסית מדומה.' : `המסלול הנוכחי ממשיך עד ${date(sub.currentPeriodEnd)}.`}
          </Empty>
        </Card>
      ) : null}
    </div>
  );
}

export function CancelFlow() {
  const { db, me, run, toast, nav, live } = useStore();
  const sub = db.officeSubscription;
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState('');
  if (!canManageBilling(db, me)) return <Empty heading="h1" title="רק בעלי המשרד יכולים לבטל" />;
  return (
    <div style={{ maxWidth: 720 }}>
      <PageHead crumbs={[{ label: 'מנוי וחיוב', to: '/billing' }, { label: 'ביטול מנוי' }]} title="ביטול מנוי" badge={<DemoTag />} />
      <div className="stack-lg">
        <Card title="מה יקרה אחרי הביטול">
          <div className="timeline">
            <div className="tl-item now"><b>היום</b><div className="small">המנוי מסומן לביטול. אין חיוב נוסף.</div></div>
            <div className="tl-item"><b>עד {date(sub.currentPeriodEnd)}</b><div className="small">גישה מלאה לכל היכולות עד סוף התקופה ששולמה.</div></div>
            <div className="tl-item"><b>90 יום לאחר מכן</b><div className="small">קריאה בלבד וייצוא נתונים. פורטל הלקוחות נסגר.</div></div>
            <div className="tl-item late"><b>לאחר מכן</b><div className="small">מחיקת נתונים לפי מדיניות השמירה.</div></div>
          </div>
          <div className="mt8"><AssumeTag>לוח הזמנים הוא טיוטת מדיניות</AssumeTag></div>
        </Card>
        <Card title="נשמח לדעת למה">
          <div className="stack">
            <Field label="סיבה עיקרית *" error={err} htmlFor="cn-r"><Select id="cn-r" value={reason} invalid={err} onChange={(e: any) => setReason(e.target.value)} placeholder="בחירה" options={['המחיר גבוה מדי', 'חסרות יכולות שאנחנו צריכים', 'עוברים למערכת אחרת', 'המשרד נסגר / מצמצם', 'קשה להטמיע בצוות', 'אחר']} /></Field>
            <Field label="פירוט (לא חובה)" htmlFor="cn-n"><Textarea id="cn-n" rows={3} value={note} onChange={(e: any) => setNote(e.target.value)} /></Field>
            {reason === 'המחיר גבוה מדי' && sub.planId === 'pro' ? <Callout kind="info">אפשר לעבור ל-Starter ולשמור על הנתונים. <button type="button" className="linkish" onClick={() => nav('/billing/change?plan=starter')}>מעבר ל-Starter</button></Callout> : null}
            <Check id="cn-ack" checked={ack} onChange={setAck} label="הבנתי שפורטל הלקוחות ייסגר בסוף התקופה" />
          </div>
        </Card>
        <div className="row g8"><Btn kind="danger-solid" disabled={!ack} onClick={() => { if (!reason) { setErr('יש לבחור סיבה'); return; } run(A.cancelSubscription, reason + (note ? ` – ${note}` : '')); toast(`המנוי יבוטל ב-${date(sub.currentPeriodEnd)}${IS_LIVE ? '' : ' (הדמיה)'}`); nav('/billing'); }}>ביטול המנוי</Btn><Btn kind="ghost" onClick={() => nav('/billing')}>השארת המנוי</Btn></div>
      </div>
    </div>
  );
}

export function InvoiceDetail({ id }: { id: string }) {
  const { db, nav, live } = useStore();
  const inv = byId(db.invoices, id);
  if (!inv) return <Empty heading="h1" title="החשבונית לא נמצאה" action={<Btn onClick={() => nav('/billing')}>חזרה</Btn>} />;
  const o = db.office;
  return (
    <div>
      <PageHead crumbs={[{ label: 'מנוי וחיוב', to: '/billing' }, { label: 'חשבוניות' }, { label: inv.number }]} title={`חשבונית ${inv.number}`} badge={<StatusBadge s={inv.status} />} actions={<Btn disabled title="הפקת PDF תתווסף עם ספק החשבוניות">הורדת PDF</Btn>} />
      <div className="invoice-paper watermark">
        <div className="row between wrap g16" style={{ alignItems: 'flex-start' }}>
          <div><div className="display" style={{ fontSize: '1.6rem' }}>ArchiFlow</div><div className="xs muted">ארכיפלו בע״מ (ישות לדוגמה) · ח.פ. 000000000</div></div>
          <div className="t-left small"><div className="bold">{IS_LIVE ? 'חשבונית מס / קבלה' : 'חשבונית מס / קבלה – הדמיה'}</div><div className="ltr">{inv.number}</div><div>{date(inv.date)}</div></div>
        </div>
        <hr className="sep" style={{ margin: '20px 0' }} />
        <div className="grid-2 small"><div><div className="muted">לכבוד</div><b>{o.legalName}</b><div>{o.address}, {o.city}</div><div>ח.פ. {o.vatId}</div></div><div><div className="muted">תקופת חיוב</div><div>{date(inv.periodFrom)} – {date(inv.periodTo)}</div></div></div>
        <div className="table-wrap mt16"><table className="tbl"><thead><tr><th>תיאור</th><th className="num">סכום</th></tr></thead><tbody><tr><td>מנוי ArchiFlow {inv.planId === 'pro' ? 'Pro' : 'Starter'} – חודשי{inv.amount !== 149 && inv.amount !== 299 ? ' (חיוב יחסי)' : ''}</td><td className="num">{ils2(inv.amount)}</td></tr></tbody>
          <tfoot><tr><td>מע״מ 18%</td><td className="num">{ils2(inv.vat)}</td></tr><tr><td>סה״כ לתשלום</td><td className="num">{ils2(inv.amount + inv.vat)}</td></tr></tfoot></table></div>
        <div className="xs muted mt16">מסמך להמחשה בלבד. אינו חשבונית מס חוקית. פורמט החשבונית בייצור ייקבע לפי ספק החשבוניות ודרישות רשות המסים.</div>
      </div>
    </div>
  );
}
