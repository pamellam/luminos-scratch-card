export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, pct } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  const apiKey = process.env.BREVO_API_KEY;

  // 1. Save contact to Brevo list 2
  try {
    const contactRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email,
        listIds: [2],
        updateEnabled: true,
      }),
    });

    const contactData = contactRes.status !== 204 ? await contactRes.json() : {};
    const saved = contactRes.status === 201 || contactRes.status === 204 || contactData.code === 'duplicate_parameter';
    if (!saved) {
      console.error('Brevo contact error:', contactData);
      return res.status(500).json({ error: 'Failed to save contact' });
    }
  } catch (err) {
    console.error('Contact error:', err);
    return res.status(500).json({ error: 'Server error' });
  }

  // 2. Send welcome email with their discount code
  const discount = pct || 40;
  const promoCode = code || 'DIGITAL4SOFIALLAB';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#07060d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07060d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://promo.luminoslabs.ai/assets/logo-color-white.png" alt="LuminosLabs" height="28" style="display:block;" />
        </td></tr>

        <!-- Card -->
        <tr><td style="background:linear-gradient(150deg,#0c0b16,#07060d 60%,#0c0814);border-radius:20px;border:1px solid rgba(255,255,255,0.08);padding:40px 32px;text-align:center;">

          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Great meeting you at</p>
          <p style="margin:0 0 28px;font-size:15px;font-weight:600;letter-spacing:0.06em;color:rgba(255,255,255,0.9);">Digital4Sofia · Pro Marketing 2026</p>

          <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Your founding-member reward</p>
          <p style="margin:0;font-size:64px;font-weight:700;letter-spacing:-0.03em;line-height:1;background:linear-gradient(135deg,#a855f7,#3b82f6,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${discount}%</p>
          <p style="margin:4px 0 28px;font-size:13px;color:rgba(255,255,255,0.5);">off your first month of LuminosLabs</p>

          <!-- Code pill -->
          <table cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 28px;">
            <tr><td style="background:rgba(255,255,255,0.04);border:1px dashed rgba(168,85,247,0.5);border-radius:100px;padding:14px 28px;">
              <p style="margin:0 0 3px;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Your code</p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:17px;font-weight:600;letter-spacing:0.05em;color:#fff;">${promoCode}</p>
            </td></tr>
          </table>

          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.6);">Apply this code at sign-up on LuminosLabs<br/>to claim your discount.</p>

          <!-- CTA -->
          <a href="https://app.luminoslabs.ai/login" style="display:inline-block;background:linear-gradient(135deg,#a855f7,#3b82f6);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:100px;">Get early access →</a>

        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);line-height:1.6;">
            LuminosLabs · <a href="https://www.luminoslabs.ai" style="color:rgba(255,255,255,0.35);text-decoration:none;">luminoslabs.ai</a><br/>
            You received this because you scratched a card at Digital4Sofia 2026.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: 'LuminosLabs', email: 'superadmin@luminoslabs.ai' },
        to: [{ email }],
        subject: `Your ${discount}% founding-member discount — LuminosLabs`,
        htmlContent: html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error('Brevo email error:', err);
      // Don't fail the request — contact was already saved
    }
  } catch (err) {
    console.error('Email send error:', err);
  }

  return res.status(200).json({ ok: true });
}
