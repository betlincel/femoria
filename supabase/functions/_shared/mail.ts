// E-posta gönderimi (Resend). Anahtar yoksa gönderim yapılmaz; bildirimler kuyrukta bekler.
//   supabase secrets set RESEND_API_KEY=re_... MAIL_FROM="Femoria <bildirim@alanadiniz.com>"
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const MAIL_FROM = Deno.env.get("MAIL_FROM") ?? "Femoria <onboarding@resend.dev>";
export const mailConfigured = () => !!RESEND_API_KEY;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Femoria görünümünde sade e-posta */
export function mailHtml(subject: string, body: string, url: string | null) {
  return `<!doctype html><html lang="tr"><body style="margin:0;background:#FCF2E8;font-family:Arial,Helvetica,sans-serif;color:#2B1B18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FCF2E8;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFAF4;border:1px solid #F2DCD0;border-radius:18px;padding:28px">
<tr><td style="font-family:Georgia,serif;font-size:24px;color:#D0141A;padding-bottom:12px">Femoria</td></tr>
<tr><td style="font-size:19px;font-weight:bold;padding-bottom:10px">${esc(subject)}</td></tr>
<tr><td style="font-size:16px;line-height:1.55;padding-bottom:20px">${esc(body)}</td></tr>
${url ? `<tr><td><a href="${esc(url)}" style="display:inline-block;background:#D0141A;color:#fff;text-decoration:none;font-weight:bold;padding:13px 26px;border-radius:999px">Femoria'da aç</a></td></tr>` : ""}
<tr><td style="font-size:12px;color:#6E5A53;padding-top:24px">Bu e-postayı Femoria hesabınızdaki bir hareket nedeniyle aldınız. Bildirimleri Ayarlar'dan kapatabilirsiniz.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendMail(to: string, subject: string, body: string, url: string | null) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html: mailHtml(subject, body, url), text: url ? `${body}\n\n${url}` : body }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
