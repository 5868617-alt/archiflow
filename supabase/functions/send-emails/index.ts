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
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#F5F3EE;font-family:Arial,sans-serif;color:#15213B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;padding:28px;text-align:right">
  <tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">${esc(row.subject)}</td></tr>
  ${p.office ? `<tr><td style="font-size:14px;color:#47526B;padding-bottom:8px">${esc(p.office)}</td></tr>` : ''}
  ${p.project ? `<tr><td style="font-size:14px;color:#47526B;padding-bottom:8px">פרויקט: ${esc(p.project)}</td></tr>` : ''}
  <tr><td style="padding:16px 0"><a href="${esc(link)}" style="background:#F2B705;color:#15213B;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:bold;display:inline-block">${esc(cta[row.template] || 'פתיחה ב-ArchiFlow')}</a></td></tr>
  <tr><td style="font-size:12px;color:#7A8296">נשלח אוטומטית מ-ArchiFlow. אם לא ציפית למייל הזה אפשר להתעלם ממנו.</td></tr>
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
