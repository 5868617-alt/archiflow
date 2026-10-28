// Pictures that belong to records: site photos, mood board images, library items, the studio logo.
// Demo: the picture is shrunk and kept in the browser (data: URL). Live: it is uploaded to a private bucket
// and opened with a short-lived signed link; the database only keeps its path.
import { useEffect, useState } from 'react';
import { LuImage } from 'react-icons/lu';
import { useStore } from '../data/store';
import { shrinkImage } from '../data/architect';
import { friendlyError } from '../live/errors';

const cache = new Map<string, Promise<string>>();
/** pictures uploaded in this tab: shown from the local copy (the record that grants access may not be saved yet) */
const local = new Map<string, string>();
const inline = (s?: string) => !!s && /^(data:|https?:|blob:)/.test(s);

export function StoredImage({ bucket, src, alt, className, style }: { bucket: string; src?: string; alt: string; className?: string; style?: any }) {
  const { live } = useStore();
  const [url, setUrl] = useState<string | null>(inline(src) ? src! : (src && local.get(src)) || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    if (!src) { setUrl(null); return; }
    if (inline(src)) { setUrl(src); return; }
    if (local.has(src)) { setUrl(local.get(src)!); return; }
    if (!live) { setUrl(null); return; }
    let alive = true; const key = bucket + ':' + src;
    if (!cache.has(key)) { const p = live.fileUrl(bucket, src); cache.set(key, p); p.catch(() => cache.delete(key)); setTimeout(() => cache.delete(key), 9 * 60 * 1000); }
    cache.get(key)!.then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [bucket, src]); // eslint-disable-line
  if (!url || failed) return <span className={'img-ph ' + (className || '')} style={style} role="img" aria-label={alt}><LuImage aria-hidden /></span>;
  return <img className={className} style={style} src={url} alt={alt} loading="lazy" />;
}

/** turns a chosen file into what the record keeps: a data: URL (demo) or a storage path (live) */
export function useStoreImage() {
  const { live, toast } = useStore();
  return async (file: File, bucket: string, projectId: string | null): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { toast('אפשר להעלות כאן רק תמונות', 'bad'); return null; }
    try {
      if (!live) return await shrinkImage(file);
      let up: File = file; let data = '';
      if (file.type !== 'image/svg+xml') { // send a lighter JPEG copy; the original never leaves the device
        data = await shrinkImage(file, 1600, 0.82);
        const bin = atob(data.split(',')[1]); const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        up = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
      const { path } = await live.upload(bucket, projectId, up);
      local.set(path, data || URL.createObjectURL(file));
      return path;
    } catch (e: any) { toast(friendlyError(e), 'bad'); return null; }
  };
}

/** a file input styled as a button, for pictures */
export function ImagePick({ onFile, label = 'בחירת תמונה', id }: { onFile: (f: File) => void; label?: string; id: string }) {
  return (
    <label className="btn sm" htmlFor={id} style={{ cursor: 'pointer' }}>
      <LuImage aria-hidden />{label}
      <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </label>
  );
}
