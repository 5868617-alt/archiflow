import { useState } from 'react';
import { LuDownload, LuTrash2, LuUndo2, LuFileArchive, LuShieldCheck } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A } from '../data/api';
import { IS_LIVE, daysFromToday } from '../data/dates';
import { Btn, Card, Callout, Modal, Field, Input, DemoTag } from '../ui/core';
import { buildOfficeExport, downloadBlob } from '../lib/export';
import { date } from '../lib/format';

/** Settings → "הנתונים שלכם": download everything, or ask to delete the office (owner only). */
export function OfficeDataTab() {
  const { db, me } = useStore();
  const owner = me.role === 'owner';
  return (
    <div className="stack-lg" style={{ maxWidth: 820 }}>
      {db.office.deletionDueAt ? <DeletionScheduled /> : null}
      <ExportCard owner={owner} />
      <DeleteCard owner={owner} />
    </div>
  );
}

function ExportCard({ owner }: { owner: boolean }) {
  const { db, run, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const x = buildOfficeExport(db as any, db.office.name);
      downloadBlob(x.blob, x.fileName);
      run(A.recordExport, x.rows);
      toast(`הקובץ ירד: ${x.tables} טבלאות, ${x.rows.toLocaleString('he-IL')} רשומות`);
    } catch { toast('לא הצלחנו להכין את הקובץ. נסו שוב.', 'bad'); } finally { setBusy(false); }
  };
  return (
    <Card title="הורדת כל הנתונים" icon={LuFileArchive} actions={IS_LIVE ? undefined : <DemoTag>נתוני הדגמה</DemoTag>}>
      <div className="stack">
        <p className="soft" style={{ margin: 0 }}>קובץ ZIP אחד עם כל המידע של המשרד: פרויקטים, לקוחות, משימות, שלבים ושכר טרחה, תקציב והוצאות, מפרטים, אישורים, שעות, פיקוח ועוד.</p>
        <ul className="small" style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.9 }}>
          <li>טבלה לכל סוג מידע (CSV) – נפתחת באקסל ובגוגל שיטס, כולל עברית.</li>
          <li>קובץ data.json עם הכול – לגיבוי או למעבר למערכת אחרת.</li>
          <li>קבצים מצורפים (שרטוטים, מסמכים, תמונות) לא נכללים. אפשר להוריד כל אחד מהם מתוך הפרויקט.</li>
        </ul>
        {owner ? (
          <div className="row g12 wrap">
            <Btn kind="primary" icon={LuDownload} onClick={go} disabled={busy}>{busy ? 'מכינים את הקובץ…' : 'הורדת הנתונים'}</Btn>
            <span className="xs muted">ההורדה נרשמת ביומן הביקורת של המשרד.</span>
          </div>
        ) : <Callout kind="info">רק בעלת המשרד יכולה להוריד את כל הנתונים.</Callout>}
      </div>
    </Card>
  );
}

function DeletionScheduled() {
  const { db, me, run, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const due = db.office.deletionDueAt!;
  const left = Math.max(0, daysFromToday(due));
  return (
    <Callout kind="bad" title={`המשרד מתוכנן למחיקה ב-${date(due)}`}>
      <div className="col g8">
        <span>{left > 0 ? `נשארו ${left} ימים.` : 'תקופת ההמתנה הסתיימה.'} אחרי המחיקה כל הפרויקטים, הלקוחות, הקבצים וההיסטוריה יימחקו, ולא ניתן יהיה לשחזר אותם. עד אז הכול ממשיך לעבוד כרגיל.</span>
        {me.role === 'owner' ? <div><Btn icon={LuUndo2} disabled={busy} onClick={() => { setBusy(true); run(A.cancelOfficeDeletion); toast('הבקשה בוטלה. המשרד נשאר כמו שהוא.'); setBusy(false); }}>ביטול המחיקה</Btn></div> : <span className="small">רק בעלת המשרד יכולה לבטל את הבקשה.</span>}
      </div>
    </Callout>
  );
}

function DeleteCard({ owner }: { owner: boolean }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  if (db.office.deletionDueAt) return null;
  return (
    <Card title="מחיקת המשרד" icon={LuTrash2}>
      <div className="stack">
        <p className="soft" style={{ margin: 0 }}>מחיקה מוחקת את המשרד וכל מה שבו: פרויקטים, לקוחות, צוות, קבצים, הודעות והיסטוריה. הלקוחות יאבדו את הגישה לפורטל.</p>
        <ul className="small" style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.9 }}>
          <li>אחרי הבקשה יש <b>30 ימים</b> שבהם הכול ממשיך לעבוד, ואפשר לבטל בלחיצה.</li>
          <li>כל הצוות מקבל הודעה על הבקשה.</li>
          <li>אחרי 30 הימים המשרד נמחק לצמיתות. כדאי להוריד את הנתונים קודם.</li>
          <li>חשבונות המשתמשים עצמם לא נמחקים – רק החברות שלהם במשרד הזה.</li>
        </ul>
        {owner ? <div><Btn kind="danger" icon={LuTrash2} onClick={() => setOpen(true)}>בקשה למחיקת המשרד</Btn></div> : <Callout kind="info">רק בעלת המשרד יכולה לבקש למחוק אותו.</Callout>}
        {IS_LIVE ? null : <span className="xs muted">בדמו הבקשה נשמרת רק בדפדפן הזה, ואפשר לבטל אותה בכל רגע.</span>}
      </div>
      {open ? <DeleteModal onClose={() => setOpen(false)} /> : null}
    </Card>
  );
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  const { db, run, toast } = useStore();
  const [name, setName] = useState('');
  const ok = name.trim() === db.office.name.trim();
  const confirm = () => { if (!ok) return; run(A.requestOfficeDeletion, name); toast('הבקשה נשלחה. המשרד יימחק בעוד 30 ימים, אלא אם תבטלו.', 'info'); onClose(); };
  return (
    <Modal title="למחוק את המשרד?" size="narrow" onClose={onClose}
      foot={<><Btn kind="danger-solid" icon={LuTrash2} disabled={!ok} onClick={confirm}>מחיקה בעוד 30 ימים</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <Callout kind="bad">אחרי 30 ימים כל המידע של <b>{db.office.name}</b> יימחק לצמיתות ולא ניתן יהיה לשחזר אותו.</Callout>
        <Field label="כדי לאשר, הקלידו את שם המשרד" htmlFor="del-name" hint={db.office.name}>
          <Input id="del-name" value={name} autoComplete="off" onChange={(e: any) => setName(e.target.value)} />
        </Field>
        <span className="xs muted row g4"><LuShieldCheck aria-hidden /> הבקשה נרשמת ביומן הביקורת, וכל הצוות מקבל הודעה.</span>
      </div>
    </Modal>
  );
}
