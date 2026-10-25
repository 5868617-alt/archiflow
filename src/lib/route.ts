export function parseRoute(path: string) {
  const [p, qs] = path.split('?');
  const segs = p.split('/').filter(Boolean);
  const query: Record<string, string> = {};
  (qs || '').split('&').filter(Boolean).forEach((kv) => { const [k, v] = kv.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
  return { segs, query, base: '/' + (segs[0] || '') };
}
