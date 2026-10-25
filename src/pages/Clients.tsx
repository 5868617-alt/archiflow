import { IS_LIVE } from '../data/dates';
import { useState, useEffect } from 'react';
import { LuPlus, LuPhone, LuMail, LuMapPin, LuUserPlus, LuPencil, LuMessageCircle, LuCalendarDays, LuMails, LuShieldCheck, LuTrash2 } from 'react-icons/lu';
import { useStore } from '../data/store';
import { visibleProjects, A, uid, contactOf, projectOf, hasFeature } from '../data/api';
import type * as T from '../data/types';
import { todayISO } from '../data/dates';
import { PageHead, Btn, SearchBox, Chips, DataTable, StatusBadge, Card, KV, Tabs, Modal, Field, Input, Select, Textarea, Empty, Callout, Badge, IconBtn, Menu, MenuItem } from '../ui/core';
import { FileIcon } from '../ui/charts';
import { date, dateTime, ago } from '../lib/format';

export function ClientsList({ query }: any) {
  const { db, me, nav, live } = useStore();
  const projs = visibleProjects(db, me);
  const clients = me.role === 'member' ? db.clients.filter((c) => projs.some((p) => p.clientId === c.id)) : db.clients;
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [creating, setCreating] = useState(!!query.new);
  let list = clients.filter((c) => type === 'all' || c.type === type || (type === 'portal' && c.contacts.some((x) => x.portal === 'פעיל')));
  if (q.trim()) list = list.filter((c) => c.name.includes(q) || c.city.includes(q) || c.contacts.some((x) => x.name.includes(q) || x.email.includes(q)));
  return (
    <div>
      <PageHead title="לקוחות" sub="ספריית לקוחות, אנשי קשר וגישה לפורטל." actions={me.role !== 'member' ? <Btn kind="primary" icon={LuPlus} onClick={() => setCreating(true)}>לקוח חדש</Btn> : null} />
      <div className="filters">
        <SearchBox value={q} onChange={setQ} placeholder="חיפוש לקוח, איש קשר או מייל" id="cl-search" />
        <Chips value={type} onChange={setType} options={[{ value: 'all', label: 'הכול', count: clients.length }, { value: 'פרטי', label: 'פרטיים', count: clients.filter((c) => c.type === 'פרטי').length }, { value: 'עסקי', label: 'עסקיים', count: clients.filter((c) => c.type === 'עסקי').length }, { value: 'portal', label: 'עם פורטל פעיל', count: clients.filter((c) => c.contacts.some((x) => x.portal === 'פעיל')).length }]} />
      </div>
      <div className="card">
        <DataTable rows={list} onRow={(c: any) => nav(`/clients/${c.id}`)} pageSize={12} columns={[
          { key: 'name', label: 'לקוח', render: (c: T.Client) => <div className="col" style={{ gap: 0 }}><b>{c.name}</b><span className="xs muted">{c.type} · {c.source}</span></div> },
          { key: 'contact', label: 'איש קשר ראשי', sortValue: (c: T.Client) => c.contacts[0]?.name, render: (c: T.Client) => <div className="col" style={{ gap: 0 }}><span>{c.contacts[0]?.name}</span><span className="xs muted ltr" style={{ textAlign: 'right' }}>{c.contacts[0]?.phone}</span></div> },
          { key: 'city', label: 'עיר' },
          { key: 'projects', label: 'פרויקטים', sortValue: (c: T.Client) => db.projects.filter((p) => p.clientId === c.id).length, render: (c: T.Client) => <div className="row wrap g4">{db.projects.filter((p) => p.clientId === c.id).map((p) => <StatusBadge key={p.id} s={p.status} />)}</div> },
          { key: 'portal', label: 'פורטל', sortValue: (c: T.Client) => c.contacts.filter((x) => x.portal === 'פעיל').length, render: (c: T.Client) => <StatusBadge s={c.contacts.some((x) => x.portal === 'פעיל') ? 'פעיל' : c.contacts.some((x) => x.portal === 'הוזמן') ? 'הוזמן' : c.contacts.some((x) => x.portal === 'מושהה') ? 'מושהה' : 'ללא גישה'} /> },
          { key: 'createdAt', label: 'לקוח מאז', render: (c: T.Client) => <span className="small">{date(c.createdAt)}</span> },
        ]} />
      </div>
      {creating ? <ClientForm onClose={() => { setCreating(false); if (query.new) nav('/clients'); }} /> : null}
    </div>
  );
}

export function ClientForm({ client, onClose }: { client?: T.Client; onClose: () => void }) {
  const { run, toast, nav, live } = useStore();
  const isNew = !client;
  const [f, setF] = useState<T.Client>(() => client ? structuredClone(client) : { id: uid('cl'), officeId: 'off_1', name: '', type: 'פרטי', city: '', address: '', source: 'פנייה דרך האתר', createdAt: todayISO, notes: '', contacts: [{ id: uid('cc'), name: '', role: 'איש קשר ראשי', phone: '', email: '', portal: 'ללא גישה' }] });
  const [err, setErr] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const setCt = (i: number, k: string, v: any) => setF((x) => { const c = structuredClone(x); (c.contacts[i] as any)[k] = v; return c; });
  const save = () => {
    const e: any = {};
    if (!f.name.trim()) e.name = 'יש להזין שם לקוח';
    f.contacts.forEach((c, i) => { if (!c.name.trim()) e['n' + i] = 'שם חובה'; if (c.email && !/^\S+@\S+\.\S+$/.test(c.email)) e['e' + i] = 'כתובת מייל לא תקינה'; if (c.phone && !/^[0-9\-+ ]{7,}$/.test(c.phone)) e['p' + i] = 'מספר טלפון לא תקין'; });
    setErr(e); if (Object.keys(e).length) return;
    run(A.saveClient, f, isNew); toast(isNew ? 'הלקוח נוסף' : 'פרטי הלקוח נשמרו'); onClose(); if (isNew) nav(`/clients/${f.id}`);
  };
  return (
    <Modal title={isNew ? 'לקוח חדש' : 'עריכת לקוח'} onClose={onClose} size="wide" foot={<><Btn kind="primary" onClick={save}>שמירה</Btn><Btn kind="ghost" onClick={onClose}>ביטול</Btn></>}>
      <div className="stack">
        <div className="form-grid">
          <Field label="שם הלקוח / החברה *" error={err.name} htmlFor="cf-name"><Input id="cf-name" value={f.name} invalid={err.name} onChange={(e: any) => set('name', e.target.value)} /></Field>
          <Field label="סוג" htmlFor="cf-type"><Select id="cf-type" value={f.type} onChange={(e: any) => set('type', e.target.value)} options={['פרטי', 'עסקי']} /></Field>
          <Field label="עיר" htmlFor="cf-city"><Input id="cf-city" value={f.city} onChange={(e: any) => set('city', e.target.value)} /></Field>
          <Field label="כתובת" htmlFor="cf-addr"><Input id="cf-addr" value={f.address} onChange={(e: any) => set('address', e.target.value)} /></Field>
          <Field label="מקור הגעה" htmlFor="cf-src"><Select id="cf-src" value={f.source} onChange={(e: any) => set('source', e.target.value)} options={['פנייה דרך האתר', 'המלצה', 'המלצה של לקוח קודם', 'אינסטגרם', 'מכרז סגור', 'קשר אישי']} /></Field>
          <Field label="הערות" full htmlFor="cf-notes"><Textarea id="cf-notes" rows={2} value={f.notes} onChange={(e: any) => set('notes', e.target.value)} /></Field>
        </div>
        <div className="section-title" style={{ marginBottom: 0 }}>אנשי קשר</div>
        {f.contacts.map((c, i) => (
          <div key={c.id} className="card tinted pad">
            <div className="form-grid">
              <Field label="שם *" error={err['n' + i]} htmlFor={'ct-n' + i}><Input id={'ct-n' + i} value={c.name} invalid={err['n' + i]} onChange={(e: any) => setCt(i, 'name', e.target.value)} /></Field>
              <Field label="תפקיד" htmlFor={'ct-r' + i}><Input id={'ct-r' + i} value={c.role} onChange={(e: any) => setCt(i, 'role', e.target.value)} /></Field>
              <Field label="טלפון" error={err['p' + i]} htmlFor={'ct-p' + i}><Input id={'ct-p' + i} className="ltr" value={c.phone} invalid={err['p' + i]} onChange={(e: any) => setCt(i, 'phone', e.target.value)} /></Field>
              <Field label="מייל" error={err['e' + i]} htmlFor={'ct-e' + i}><Input id={'ct-e' + i} className="ltr" value={c.email} invalid={err['e' + i]} onChange={(e: any) => setCt(i, 'email', e.target.value)} /></Field>
            </div>
            {f.contacts.length > 1 ? <div className="mt8"><Btn size="sm" kind="ghost" icon={LuTrash2} onClick={() => setF((x) => ({ ...x, contacts: x.contacts.filter((_, j) => j !== i) }))}>הסרת איש קשר</Btn></div> : null}
          </div>
        ))}
        <div><Btn size="sm" icon={LuUserPlus} onClick={() => setF((x) => ({ ...x, contacts: [...x.contacts, { id: uid('cc'), name: '', role: '', phone: '', email: '', portal: 'ללא גישה' }] }))}>איש קשר נוסף</Btn></div>
      </div>
    </Modal>
  );
}

export function ClientDetail({ id }: { id: string }) {
  const { db, me, run, toast, nav, live } = useStore();
  const c = db.clients.find((x) => x.id === id);
  const [tab, setTab] = useState('projects');
  const [edit, setEdit] = useState(false);
  if (!c) return <Empty title="הלקוח לא נמצא" action={<Btn onClick={() => nav('/clients')}>לרשימה</Btn>} />;
  const projs = db.projects.filter((p) => p.clientId === id);
  const pids = new Set(projs.map((p) => p.id));
  const docs = db.documents.filter((d) => d.projectId && pids.has(d.projectId) && d.sharedWithClient);
  const approvals = db.approvals.filter((a) => pids.has(a.projectId)).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const comms = [
    ...db.messages.filter((m) => pids.has(m.projectId)).map((m) => ({ at: m.at, icon: LuMessageCircle, title: `${m.authorName}: ${m.text}`, sub: 'הודעה בפורטל · ' + projectOf(db, m.projectId)?.name, link: `/projects/${m.projectId}/messages` })),
    ...db.meetings.filter((m) => m.projectId && pids.has(m.projectId) && m.contactIds.some((x) => c.contacts.some((ct) => ct.id === x))).map((m) => ({ at: m.date + 'T' + m.start, icon: LuCalendarDays, title: m.title, sub: `פגישה · ${m.status}`, link: `/meetings/${m.id}` })),
    ...db.emailLog.filter((e) => c.contacts.some((ct) => ct.email === e.to)).map((e) => ({ at: e.at, icon: LuMails, title: e.subject, sub: 'מייל אוטומטי · הודמה – לא נשלח', link: '/notifications?tab=email' })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const portalOn = hasFeature(db, 'client_portal');
  return (
    <div>
      <PageHead crumbs={[{ label: 'לקוחות', to: '/clients' }, { label: c.name }]} title={c.name} badge={<Badge>{c.type}</Badge>} sub={<span className="row g4"><LuMapPin aria-hidden style={{ width: 14 }} />{c.address}, {c.city}</span>}
        actions={me.role !== 'member' ? <><Btn icon={LuPencil} onClick={() => setEdit(true)}>עריכה</Btn><Btn kind="primary" icon={LuPlus} onClick={() => nav('/projects?new=1')}>פרויקט ללקוח</Btn></> : null} />
      <div className="grid-main-side">
        <div style={{ minWidth: 0 }}>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'projects', label: 'פרויקטים', count: projs.length }, { id: 'comms', label: 'היסטוריית תקשורת', count: comms.length }, { id: 'docs', label: 'מסמכים משותפים', count: docs.length }, { id: 'approvals', label: 'היסטוריית אישורים', count: approvals.length }]} />
          {tab === 'projects' ? (
            <div className="card"><DataTable rows={projs} onRow={(p: any) => nav(`/projects/${p.id}`)} columns={[{ key: 'name', label: 'פרויקט', render: (p: any) => <b>{p.name}</b> }, { key: 'status', label: 'סטטוס', render: (p: any) => <StatusBadge s={p.status} /> }, { key: 'progress', label: 'התקדמות', render: (p: any) => `${p.progress}%` }, { key: 'dueDate', label: 'יעד', render: (p: any) => date(p.dueDate) }]} /></div>
          ) : null}
          {tab === 'comms' ? (
            <Card pad={false}>{comms.length ? <div className="list">{comms.map((x, i) => <div key={i} className="li click" onClick={() => nav(x.link)}><span className="li-ic"><x.icon aria-hidden /></span><div className="li-main"><div className="li-title">{x.title}</div><div className="li-sub">{x.sub}</div></div><span className="xs muted nowrap">{ago(x.at)}</span></div>)}</div> : <Empty title="אין היסטוריית תקשורת" />}</Card>
          ) : null}
          {tab === 'docs' ? (
            <Card pad={false}>{docs.length ? <div className="list">{docs.map((d) => <div key={d.id} className="li click" onClick={() => nav(`/documents/${d.id}`)}><FileIcon type={d.fileType} /><div className="li-main"><div className="li-title">{d.name}</div><div className="li-sub">{d.folder} · גרסה {d.versions.length} · {projectOf(db, d.projectId)?.name}</div></div></div>)}</div> : <Empty title="אין מסמכים משותפים" />}</Card>
          ) : null}
          {tab === 'approvals' ? (
            <div className="card"><DataTable rows={approvals} columns={[{ key: 'title', label: 'פריט', render: (a: any) => <div className="col" style={{ gap: 0 }}><b>{a.title}</b><span className="xs muted">{a.kind} · {projectOf(db, a.projectId)?.name}</span></div> }, { key: 'contact', label: 'מאשר/ת', render: (a: any) => contactOf(db, a.contactId)?.contact.name }, { key: 'status', label: 'החלטה', render: (a: any) => <StatusBadge s={a.status} /> }, { key: 'decidedAt', label: 'תאריך', render: (a: any) => a.decidedAt ? date(a.decidedAt) : <span className="muted">ממתין מ-{date(a.requestedAt)}</span> }, { key: 'comment', label: 'הערת לקוח', sortable: false, render: (a: any) => <span className="small soft">{a.comment || '—'}</span> }]} /></div>
          ) : null}
        </div>
        <div className="stack-lg" style={{ minWidth: 0 }}>
          <Card title="אנשי קשר וגישה לפורטל" icon={LuShieldCheck}>
            <div className="stack">
              {!portalOn ? <Callout kind="assume">פורטל לקוח אינו כלול במסלול הנוכחי.</Callout> : null}
              {c.contacts.map((ct) => (
                <div key={ct.id} className="col g4" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                  <div className="row between g8"><b>{ct.name}</b><StatusBadge s={ct.portal} /></div>
                  <div className="xs muted">{ct.role}</div>
                  <div className="small row g12 wrap"><span className="row g4 ltr"><LuPhone aria-hidden style={{ width: 13 }} />{ct.phone}</span><span className="row g4 ltr"><LuMail aria-hidden style={{ width: 13 }} />{ct.email}</span></div>
                  {me.role !== 'member' && portalOn ? (
                    <div className="row g8 wrap mt8">
                      {ct.portal === 'ללא גישה' || ct.portal === 'מושהה' ? <Btn size="sm" kind="navy" onClick={() => { run(A.setPortal, c.id, ct.id, 'הוזמן'); toast(IS_LIVE ? `הזמנה לפורטל נוצרה עבור ${ct.name} (המייל בתור לשליחה)` : `הזמנה לפורטל נרשמה עבור ${ct.name} (מייל מדומה – לא נשלח)`, 'info'); }}>הזמנה לפורטל</Btn> : null}
                      {ct.portal === 'הוזמן' ? <>{IS_LIVE ? <span className="xs muted">ממתין שהלקוח יאשר את ההזמנה מהמייל</span> : <Btn size="sm" onClick={() => { run(A.setPortal, c.id, ct.id, 'פעיל'); toast('הגישה הופעלה (סימולציה של קבלת ההזמנה)'); }}>סימולציה: הלקוח הצטרף</Btn>}<Btn size="sm" kind="ghost" onClick={() => { run(A.setPortal, c.id, ct.id, 'ללא גישה'); toast('ההזמנה בוטלה'); }}>ביטול הזמנה</Btn></> : null}
                      {ct.portal === 'מושהה' && IS_LIVE && ct.userId ? <Btn size="sm" onClick={() => { run(A.setPortal, c.id, ct.id, 'פעיל'); toast(`הגישה של ${ct.name} חודשה`); }}>חידוש גישה</Btn> : null}
                      {ct.portal === 'פעיל' ? <Btn size="sm" kind="danger" onClick={() => { run(A.setPortal, c.id, ct.id, 'מושהה'); toast(`הגישה של ${ct.name} הושהתה`); }}>השהיית גישה</Btn> : null}
                    </div>
                  ) : null}
                </div>
              ))}
              <span className="xs muted">שליחת הזמנות דרך Resend תחובר בהמשך; כרגע ההזמנה נרשמת ביומן המיילים בלבד.</span>
            </div>
          </Card>
          <Card title="פרטים">
            <KV items={[['מקור', c.source], ['לקוח מאז', date(c.createdAt)], ['הערות', <span className="small soft">{c.notes || '—'}</span>]]} />
          </Card>
        </div>
      </div>
      {edit ? <ClientForm client={c} onClose={() => setEdit(false)} /> : null}
    </div>
  );
}
