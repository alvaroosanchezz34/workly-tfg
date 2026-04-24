// backend/src/services/email.service.js
import { Resend } from 'resend';

// Inicialización lazy — no crashea si RESEND_API_KEY no está configurada todavía
const getResend = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY no está configurada. Añádela en las variables de entorno.');
    }
    return new Resend(process.env.RESEND_API_KEY);
};

const FROM = () => process.env.EMAIL_FROM || 'Workly <noreply@workly.space>';

export const sendInvoiceEmail = async ({ to, invoiceNumber, clientName, issuerName, totalAmount, dueDate, pdfBuffer, publicUrl }) => {
    const resend = getResend();

    const fmt     = v => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
    const fmtDate = d => d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura ${invoiceNumber}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1976D2,#1565C0);padding:32px 36px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">FACTURA</div>
          <div style="color:#fff;font-size:26px;font-weight:800;">${invoiceNumber}</div>
          <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:4px;">${issuerName}</div>
        </div>
        <div style="background:rgba(255,255,255,0.15);padding:8px 16px;border-radius:99px;">
          <span style="color:#fff;font-size:13px;font-weight:600;">PDF adjunto</span>
        </div>
      </div>
    </div>
    <div style="padding:32px 36px;">
      <p style="font-size:16px;color:#212121;margin:0 0 8px;">Hola <strong>${clientName}</strong>,</p>
      <p style="font-size:14px;color:#616161;line-height:1.6;margin:0 0 24px;">
        Te enviamos la factura <strong>${invoiceNumber}</strong> por importe de
        <strong style="color:#1976D2;">${fmt(totalAmount)}</strong>.
        Encontrarás el documento PDF adjunto a este correo.
      </p>
      <div style="background:#F8FAFF;border:1px solid #E3E8F0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:8px;">Concepto</td>
            <td style="font-size:12px;color:#9E9E9E;text-transform:uppercase;letter-spacing:0.06em;padding-bottom:8px;text-align:right;">Importe</td>
          </tr>
          <tr>
            <td style="font-size:14px;color:#212121;font-weight:500;">Factura ${invoiceNumber}</td>
            <td style="font-size:18px;color:#1976D2;font-weight:800;text-align:right;">${fmt(totalAmount)}</td>
          </tr>
          ${dueDate ? `
          <tr>
            <td colspan="2" style="padding-top:12px;border-top:1px solid #E0E0E0;">
              <span style="font-size:12px;color:#9E9E9E;">Vencimiento: </span>
              <span style="font-size:12px;font-weight:600;color:#F44336;">${fmtDate(dueDate)}</span>
            </td>
          </tr>` : ''}
        </table>
      </div>
      ${publicUrl ? `
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${publicUrl}" style="display:inline-block;background:#1976D2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Ver factura online →
        </a>
      </div>` : ''}
      <p style="font-size:13px;color:#9E9E9E;margin:0;">
        Si tienes alguna pregunta, responde a este email.<br>
        Gracias por confiar en nosotros.
      </p>
    </div>
    <div style="background:#F8FAFF;padding:16px 36px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Factura gestionada con <strong style="color:#1976D2;">Workly</strong></p>
    </div>
  </div>
</body>
</html>`;

    const payload = {
        from:    FROM(),
        to:      [to],
        subject: `Factura ${invoiceNumber} — ${fmt(totalAmount)}`,
        html,
    };

    if (pdfBuffer) {
        payload.attachments = [{
            filename: `factura-${invoiceNumber}.pdf`,
            content:  pdfBuffer.toString('base64'),
        }];
    }

    const { data, error } = await resend.emails.send(payload);
    if (error) throw new Error(`Error Resend: ${error.message}`);
    return data;
};

export const sendWelcomeEmail = async ({ to, name }) => {
    const resend = getResend();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Bienvenido a Workly</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1976D2,#1565C0);padding:32px 36px;text-align:center;">
      <div style="color:#fff;font-size:22px;font-weight:800;">Bienvenido a Workly</div>
    </div>
    <div style="padding:32px 36px;">
      <p style="font-size:16px;color:#212121;">Hola <strong>${name}</strong> 👋</p>
      <p style="font-size:14px;color:#616161;line-height:1.6;">
        Tu cuenta está lista. Ahora puedes gestionar tus clientes, proyectos, facturas y gastos desde un solo lugar.
      </p>
    </div>
    <div style="background:#F8FAFF;padding:14px 36px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Workly — Gestión freelance</p>
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
        from: FROM(), to: [to], subject: '¡Bienvenido a Workly! 🚀', html
    });
    if (error) throw new Error(`Error Resend: ${error.message}`);
};

export const sendTeamInviteEmail = async ({ to, name, companyName, tempPassword }) => {
    const resend = getResend();
    const loginUrl = process.env.FRONTEND_URL || 'https://workly.space';

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Invitación a ${companyName}</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1976D2,#1565C0);padding:32px 36px;">
      <div style="color:#fff;font-size:20px;font-weight:800;">Te han invitado a unirte</div>
      <div style="color:rgba(255,255,255,0.7);font-size:14px;margin-top:4px;">${companyName} en Workly</div>
    </div>
    <div style="padding:32px 36px;">
      <p style="font-size:15px;color:#212121;">Hola <strong>${name}</strong>,</p>
      <p style="font-size:14px;color:#616161;line-height:1.6;">
        Has sido invitado a unirte al equipo de <strong>${companyName}</strong> en Workly.
      </p>
      <div style="background:#FFF3E0;border:1px solid #FFB74D;border-radius:8px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 6px;font-size:12px;color:#E65100;font-weight:700;text-transform:uppercase;">Credenciales de acceso</p>
        <p style="margin:0;font-size:13px;color:#212121;"><strong>Email:</strong> ${to}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#212121;"><strong>Contraseña temporal:</strong>
          <code style="background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #FFB74D;">${tempPassword}</code>
        </p>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#1976D2;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Acceder a Workly →
        </a>
      </div>
    </div>
    <div style="background:#F8FAFF;padding:14px 36px;text-align:center;border-top:1px solid #F0F0F0;">
      <p style="font-size:11px;color:#BDBDBD;margin:0;">⚡ Workly — Gestión freelance</p>
    </div>
  </div>
</body>
</html>`;

    const { error } = await resend.emails.send({
        from: FROM(), to: [to],
        subject: `Invitación para unirte a ${companyName} en Workly`, html
    });
    if (error) throw new Error(`Error Resend: ${error.message}`);
};