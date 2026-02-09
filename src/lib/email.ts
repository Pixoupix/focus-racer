import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_PLACEHOLDER"
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || "Focus Racer <noreply@focusracer.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface PurchaseEmailData {
  to: string;
  name: string;
  orderId: string;
  eventName: string;
  photoCount: number;
  totalAmount: number;
  downloadToken: string;
  expiresAt: Date;
}

interface RunnerNotificationData {
  to: string;
  firstName: string;
  lastName: string;
  bibNumber: string;
  eventName: string;
  eventDate: Date;
  eventLocation: string | null;
  photoCount: number;
  eventId: string;
}

export async function sendRunnerNotification(data: RunnerNotificationData) {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping runner notification to:", data.to);
    return;
  }

  const eventDateFormatted = data.eventDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const galleryUrl = `${APP_URL}/runner/${data.eventId}/search?bib=${data.bibNumber}`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `${data.firstName}, vos ${data.photoCount} photos de ${data.eventName} sont disponibles !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #3b82f6; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { padding: 30px 0; }
          .info-box { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .info-row { padding: 4px 0; }
          .info-label { color: #6b7280; font-size: 14px; }
          .info-value { font-weight: 600; }
          .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .note { color: #6b7280; font-size: 14px; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Focus Racer</h1>
          </div>
          <div class="content">
            <p>Bonjour ${data.firstName},</p>
            <p>Vos photos de course sont disponibles ! Nous avons identifié <strong>${data.photoCount} photo${data.photoCount > 1 ? "s" : ""}</strong> avec votre dossard <strong>#${data.bibNumber}</strong>.</p>

            <div class="info-box">
              <div class="info-row">
                <span class="info-label">Événement</span><br>
                <span class="info-value">${data.eventName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date</span><br>
                <span class="info-value">${eventDateFormatted}</span>
              </div>
              ${data.eventLocation ? `
              <div class="info-row">
                <span class="info-label">Lieu</span><br>
                <span class="info-value">${data.eventLocation}</span>
              </div>
              ` : ""}
              <div class="info-row">
                <span class="info-label">Dossard</span><br>
                <span class="info-value">#${data.bibNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Photos trouvées</span><br>
                <span class="info-value">${data.photoCount}</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${galleryUrl}" class="btn">Voir mes photos</a>
            </div>

            <p class="note">
              Retrouvez toutes vos photos, sélectionnez vos préférées et commandez-les en haute définition sans filigrane.
            </p>
          </div>
          <div class="footer">
            <p>Focus Racer — Plateforme de photos de courses sportives</p>
            <p style="margin-top: 8px; font-size: 11px;">Vous recevez cet email car votre adresse est associée au dossard #${data.bibNumber} sur la start-list de ${data.eventName}. Si ce n'est pas vous, ignorez simplement cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendPurchaseConfirmation(data: PurchaseEmailData) {
  if (!resend) {
    console.log("[Email] Resend not configured, skipping email to:", data.to);
    console.log("[Email] Download link:", `${APP_URL}/api/downloads/${data.downloadToken}`);
    return;
  }

  const orderRef = data.orderId.slice(-8).toUpperCase();
  const downloadUrl = `${APP_URL}/api/downloads/${data.downloadToken}`;
  const expiresFormatted = data.expiresAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: EMAIL_FROM,
    to: data.to,
    subject: `Vos photos de ${data.eventName} sont prêtes !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 2px solid #3b82f6; }
          .header h1 { color: #1f2937; margin: 0; font-size: 24px; }
          .content { padding: 30px 0; }
          .order-box { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .order-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .order-row .label { color: #6b7280; }
          .order-row .value { font-weight: 600; }
          .total-row { border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 12px; font-size: 18px; }
          .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
          .btn:hover { background: #2563eb; }
          .note { color: #6b7280; font-size: 14px; }
          .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; color: #9ca3af; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Focus Racer</h1>
          </div>
          <div class="content">
            <p>Bonjour ${data.name},</p>
            <p>Merci pour votre achat ! Vos photos sont prêtes à être téléchargées.</p>

            <div class="order-box">
              <div class="order-row">
                <span class="label">Commande</span>
                <span class="value">#${orderRef}</span>
              </div>
              <div class="order-row">
                <span class="label">Événement</span>
                <span class="value">${data.eventName}</span>
              </div>
              <div class="order-row">
                <span class="label">Photos</span>
                <span class="value">${data.photoCount} photo${data.photoCount > 1 ? "s" : ""} HD</span>
              </div>
              <div class="order-row total-row">
                <span class="label">Total payé</span>
                <span class="value">${data.totalAmount.toFixed(2)}€</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${downloadUrl}" class="btn">Télécharger mes photos</a>
            </div>

            <p class="note">
              Ce lien est valable jusqu'au ${expiresFormatted}.
              Si vous avez un compte, vous pouvez régénérer un lien depuis votre espace "Mes Achats".
            </p>
          </div>
          <div class="footer">
            <p>Focus Racer — Plateforme de photos de courses sportives</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
