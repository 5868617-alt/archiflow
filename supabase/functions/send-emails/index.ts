// Supabase Edge Function: drains public.email_outbox through Resend.
// Called every minute by pg_cron (migration 009) with header  x-cron-secret: <secret kept in Vault>.
// The secret is checked against Vault through public.email_sender_config() (service role only),
// so it never has to be copied anywhere by hand. APP_URL and EMAIL_FROM also come from Vault
// (names archiflow_app_url / archiflow_email_from); env vars of the same name override them.
// Secret to set in the dashboard: RESEND_API_KEY. Without it nothing is sent and rows stay queued.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_ATTEMPTS = 5;
const BATCH = 25;

function esc(s: unknown) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function render(row: any, appUrl: string) {
  const p = row.payload || {};
  const link = p.token ? `${appUrl}/accept-invite?token=${encodeURIComponent(p.token)}` : `${appUrl}${row.related_link || ''}`;
  const cta: Record<string, string> = {
    team_invite: 'הצטרפות למשרד', portal_invite: 'כניסה לפורטל', approval_request: 'צפייה ואישור', approval_reminder: 'צפייה ואישור',
    meeting_invite: 'פרטי הפגישה', meeting_summary: 'לסיכום', budget_alert: 'לתקציב', daily_digest: 'ליום שלי', fee_request: 'לפרטים', purchase_order: 'להזמנה',
  };
  // brand: plum #3D2233, peach #EFB0A1, pink #F4AFB4 on a warm paper background
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#FBF7F5;font-family:Arial,Helvetica,sans-serif;color:#3D2233">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #EFE3E0">
  <tr><td style="background:#3D2233;padding:16px 28px;text-align:right;font-size:20px;font-weight:bold;color:#ffffff">Archi<span style="color:#EFB0A1">Flow</span></td></tr>
  <tr><td style="height:4px;background:#EFB0A1;background-image:linear-gradient(90deg,#F4AFB4,#EFB0A1);font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:28px 28px 8px;text-align:right;font-size:22px;font-weight:bold;line-height:1.35">${esc(row.subject)}</td></tr>
  ${p.office ? `<tr><td style="padding:0 28px 4px;text-align:right;font-size:15px;color:#6B5562">${esc(p.office)}</td></tr>` : ''}
  ${p.project ? `<tr><td style="padding:0 28px 4px;text-align:right;font-size:15px;color:#6B5562">פרויקט: ${esc(p.project)}</td></tr>` : ''}
  <tr><td style="padding:20px 28px 28px;text-align:right"><a href="${esc(link)}" style="background:#3D2233;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;font-size:16px;display:inline-block">${esc(cta[row.template] || 'פתיחה ב-ArchiFlow')}</a></td></tr>
  <tr><td style="padding:16px 28px;background:#FBF3F1;text-align:right;font-size:12px;color:#7D6A74;line-height:1.6">נשלח אוטומטית מ-ArchiFlow. אם לא ציפית למייל הזה אפשר להתעלם ממנו.</td></tr>
  </table></td></tr></table></body></html>`;
  return { html, text: `${row.subject}\n${link}` };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: cfg, error: cfgErr } = await db.rpc('email_sender_config', { p_secret: req.headers.get('x-cron-secret') ?? '' });
  if (cfgErr || !cfg?.ok) return new Response('unauthorized', { status: 401 });

  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return Response.json({ skipped: 'RESEND_API_KEY not configured – emails stay queued' });

  const appUrl = (Deno.env.get('APP_URL') ?? cfg.app_url ?? '').replace(/\/$/, '');
  const from = Deno.env.get('EMAIL_FROM') ?? cfg.email_from ?? 'ArchiFlow <onboarding@resend.dev>';

  const { data: rows, error } = await db.from('email_outbox').select('*').eq('status', 'queued').lt('attempts', MAX_ATTEMPTS).order('created_at').limit(BATCH);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0, failed = 0;
  for (const row of rows ?? []) {
    const { html, text } = render(row, appUrl);
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': row.id },
      body: JSON.stringify({ from, to: [row.to_email], subject: row.subject, html, text }),
    });
    if (r.ok) {
      sent++;
      await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), attempts: row.attempts + 1, payload: {} }).eq('id', row.id);
    } else {
      failed++;
      const attempts = row.attempts + 1;
      await db.from('email_outbox').update({ attempts, last_error: (await r.text()).slice(0, 500), status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued' }).eq('id', row.id);
    }
  }
  return Response.json({ sent, failed });
});
