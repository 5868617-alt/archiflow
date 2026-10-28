// Studio branding: logo and brand color, shown to clients in the portal and on reports.
import { useState } from 'react';
import { LuPalette, LuCheck, LuTrash2 } from 'react-icons/lu';
import { useStore } from '../data/store';
import { A } from '../data/api';
import { BRAND_PRESETS, inkOn } from '../data/architect';
import { IS_LIVE } from '../data/dates';
import { Btn, Card, Field, Input, Callout, cx } from '../ui/core';
import { StoredImage, useStoreImage, ImagePick } from '../ui/StoredImage';

export const DEFAULT_BRAND = '#3D2233';
export const brandColor = (db: any) => (db.branding?.color && /^#[0-9a-f]{6}$/i.test(db.branding.color) ? db.branding.color : DEFAULT_BRAND);
/** CSS variables for anything painted in the studio's color */
export const brandVars = (db: any) => { const c = brandColor(db); return { ['--brand' as any]: c, ['--brand-ink' as any]: inkOn(c) }; };

export function BrandMark({ size = 36 }: { size?: number }) {
  const { db } = useStore();
  const logo = db.branding?.logo;
  if (logo) return <StoredImage bucket="branding" src={logo} alt={`הלוגו של ${db.office.name}`} className="brand-logo" style={{ height: size, maxWidth: size * 3.2 }} />;
  return <span className="brand-initials" style={{ ...brandVars(db), width: size, height: size, fontSize: size * 0.38 }} aria-hidden>{db.office.logoText}</span>;
}

export function BrandingCard() {
  const { db, me, run, toast } = useStore();
  const can = me.role === 'owner' || me.role === 'admin';
  const storeImage = useStoreImage();
  const [color, setColor] = useState(brandColor(db));
  const [busy, setBusy] = useState(false);
  const valid = /^#[0-9a-f]{6}$/i.test(color);
  const pick = async (f: File) => {
    if (f.size > 2 * 1024 * 1024) { toast('הלוגו גדול מ-2MB', 'bad'); return; }
    setBusy(true); const p = await storeImage(f, 'branding', null); setBusy(false);
    if (p) { run(A.setBranding, { logo: p }); toast('הלוגו עודכן'); }
  };
  return (
    <Card title="מיתוג המשרד" icon={LuPalette}>
      <div className="stack">
        <p className="small muted">הלוגו והצבע מופיעים ללקוחות בפורטל, בשאלון הפתיחה ובדו״חות הפיקוח.</p>
        <div className="row g12 wrap" style={{ alignItems: 'center' }}>
          <BrandMark size={52} />
          {can ? <>
            <ImagePick id="brand-logo" onFile={pick} label={busy ? 'מעלה…' : db.branding?.logo ? 'החלפת לוגו' : 'העלאת לוגו'} />
            {db.branding?.logo ? <Btn size="sm" kind="ghost" icon={LuTrash2} onClick={() => { run(A.setBranding, { logo: undefined }); toast('הלוגו הוסר'); }}>הסרה</Btn> : null}
          </> : null}
        </div>
        <span className="xs muted">PNG, JPG או SVG עד 2MB. רצוי רקע שקוף.{IS_LIVE ? '' : ' בדמו הלוגו נשמר רק בדפדפן הזה.'}</span>
        <div>
          <div className="small bold mb8">צבע המותג</div>
          <div className="row g8 wrap" role="radiogroup" aria-label="צבע המותג">
            {BRAND_PRESETS.map((c) => <button key={c} type="button" role="radio" aria-checked={color.toLowerCase() === c.toLowerCase()} aria-label={`צבע ${c}`} disabled={!can} className={cx('brand-swatch', color.toLowerCase() === c.toLowerCase() && 'on')} style={{ background: c, color: inkOn(c) }} onClick={() => setColor(c)}>{color.toLowerCase() === c.toLowerCase() ? <LuCheck aria-hidden /> : null}</button>)}
            <label className="brand-swatch custom" htmlFor="brand-color" title="צבע אחר"><input id="brand-color" type="color" value={valid ? color : DEFAULT_BRAND} disabled={!can} onChange={(e) => setColor(e.target.value)} aria-label="בחירת צבע אחר" /></label>
          </div>
        </div>
        <Field label="קוד צבע" htmlFor="brand-hex" error={valid ? '' : 'קוד בפורמט ‎#RRGGBB'}><Input id="brand-hex" className="ltr" style={{ maxWidth: 140 }} value={color} disabled={!can} onChange={(e: any) => setColor(e.target.value.trim())} /></Field>
        <div className="brand-preview" style={{ ['--brand' as any]: valid ? color : DEFAULT_BRAND, ['--brand-ink' as any]: inkOn(valid ? color : DEFAULT_BRAND) }}>
          <BrandMark size={30} /><b>{db.office.name}</b><span className="grow" /><span className="small">פורטל לקוחות</span>
        </div>
        {can ? <div><Btn kind="primary" disabled={!valid || color === brandColor(db)} onClick={() => { run(A.setBranding, { color }); toast('צבע המותג נשמר'); }}>שמירת הצבע</Btn></div> : <span className="small muted">רק בעלים ומנהלים יכולים לשנות את המיתוג.</span>}
        <Callout kind="info">הטקסט על צבע המותג נבחר אוטומטית (בהיר או כהה) כך שיישאר קריא לכולם.</Callout>
      </div>
    </Card>
  );
}
