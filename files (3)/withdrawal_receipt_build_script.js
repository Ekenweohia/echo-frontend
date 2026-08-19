// EchoWallet — Withdrawal Receipt Email
// Source: EchoWallet - Paystack Topup & Withdrawal.json -> 'Build Withdrawal Receipt' (Code node)
// Output feeds into a Gmail node: sendTo={{$json.to}}, subject={{$json.subject}}, message={{$json.html}}

const request = $('Validate Withdrawal Request').first().json;
const transfer = $('Build Transfer Payload').first().json;

const fmt = v => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(v);
const date = new Date().toLocaleString('en-NG', { dateStyle: 'long', timeStyle: 'short' });

const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#F4F4F4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F4;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#C8102E;padding:32px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;">When every second counts</p>
          <h1 style="margin:0;font-size:28px;font-weight:800;color:#FFFFFF;">Emergency<span style="color:#FFB3C1;">Echo</span></h1>
        </td></tr>
        <tr><td style="padding:36px 40px 0;text-align:center;">
          <div style="width:64px;height:64px;border-radius:50%;background:#F3F4F6;border:2px solid #D1D5DB;margin:0 auto 16px;text-align:center;line-height:64px;font-size:28px;">⏳</div>
          <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#0D0D0D;">Withdrawal Processing</p>
          <p style="margin:0;font-size:15px;color:#6B7280;">Your funds are on the way to your bank account</p>
        </td></tr>
        <tr><td style="padding:24px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1.5px solid #E5E7EB;border-radius:12px;">
            <tr><td style="padding:24px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase;">Withdrawal Amount</p>
              <p style="margin:0;font-size:36px;font-weight:800;color:#0D0D0D;">${fmt(request.amount)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #F3F4F6;border-radius:12px;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #F3F4F6;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Bank Details</p>
              <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#0D0D0D;">${request.account_name}</p>
              <p style="margin:0;font-size:13px;color:#4B5563;">${request.account_number}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #F3F4F6;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Reference</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#0D0D0D;font-family:'Courier New',monospace;">${transfer.reference}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #F3F4F6;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">Date & Time</p>
              <p style="margin:0;font-size:13px;font-weight:600;color:#0D0D0D;">${date}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;">New Wallet Balance</p>
              <p style="margin:0;font-size:16px;font-weight:800;color:#C8102E;">${fmt(transfer.new_balance)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 40px 32px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#4B5563;line-height:1.5;">Transfers usually arrive instantly, but occasionally take a few minutes depending on bank network conditions.</p>
        </td></tr>
        <tr><td style="background:#F9F8F7;border-top:1px solid #EBEBEB;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#A8A49E;">EmergencyEcho · Yenak Technology Limited · RC No. 8708191</p>
          <p style="margin:0;font-size:11px;color:#C8C6C2;line-height:1.5;">This is an automated payment receipt. Please keep it for your records.<br/>If you have any issues, contact support@emergencyecho.org.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

return [{ json: {
  to:      request.email,
  subject: `Withdrawal Processing — ${fmt(request.amount)} to your bank`,
  html
}}];