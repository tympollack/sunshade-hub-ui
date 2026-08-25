import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'SunShade Systems <auth@sunshade.icu>';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface SendPasswordResetEmailParams {
  to: string;
  resetUrl: string;
  targetAppName?: string | null;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  targetAppName,
}: SendPasswordResetEmailParams): Promise<{ success: boolean; resendId?: string; error?: string }> {
  const safeEmail = escapeHtml(to);
  const safeResetUrl = escapeHtml(resetUrl);
  const safeAppName = targetAppName ? escapeHtml(targetAppName) : null;

  const subject = safeAppName
    ? `Reset your SunShade account password (${safeAppName})`
    : 'Reset your SunShade account password';

  const bodyText = `SunShade Systems Password Reset

We received a request to reset the password for your SunShade account (${to}).

Click the link below to set a new password:
${resetUrl}

This link is valid for 24 hours and can only be used once.

If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.

SunShade Ecosystem • Central SSO Gateway`;

  const bodyHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0a09; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #18181b; border-radius: 20px; border: 1px solid rgba(234, 88, 12, 0.3); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
            
            <!-- Header -->
            <tr>
              <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #27272a;">
                <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: rgba(234, 88, 12, 0.15); border: 1px solid rgba(234, 88, 12, 0.4); margin-bottom: 16px;">
                  <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 1px;">
                    ${safeAppName ? `SSO Gateway • ${safeAppName}` : 'SunShade Systems'}
                  </span>
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #fafafa; letter-spacing: -0.5px;">
                  Reset Your Password
                </h1>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
                  We received a request to choose a new password for <strong style="color: #f4f4f5;">${safeEmail}</strong>.
                </p>
              </td>
            </tr>

            <!-- Main Body -->
            <tr>
              <td style="padding: 28px 32px;">
                <p style="margin: 0 0 24px 0; font-size: 14px; color: #d4d4d8; line-height: 1.6;">
                  Click the button below to choose a new password for your account. This link will expire in 24 hours.
                </p>

                <!-- Primary CTA Button -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                  <tr>
                    <td align="center">
                      <a href="${safeResetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 16px rgba(234, 88, 12, 0.35);">
                        Set New Password &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Security Box -->
                <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                    <strong style="color: #a1a1aa;">Security Notice:</strong> If you did not request this password reset, no action is needed. Your account remains secure and your password will not change.
                  </p>
                </div>

                <p style="margin: 0; font-size: 11px; color: #71717a; line-height: 1.5; word-break: break-all;">
                  Button not working? Copy and paste this link into your browser:<br>
                  <a href="${safeResetUrl}" style="color: #ea580c; text-decoration: underline;">${safeResetUrl}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 16px 32px 24px 32px; background-color: #09090b; border-top: 1px solid #27272a; text-align: center;">
                <p style="margin: 0; font-size: 11px; font-family: monospace; color: #52525b;">
                  SunShade Ecosystem • Central SSO Gateway
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  if (!resendClient) {
    console.log(
      `[RESEND DEV FALLBACK] (RESEND_API_KEY not set) Generated password reset for ${to}: ${resetUrl}`
    );
    return { success: true };
  }

  try {
    const res = await resendClient.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      text: bodyText,
      html: bodyHtml,
    });

    if (res.data?.id) {
      console.log(`[RESEND SUCCESS] Sent password reset email to ${to} | ID: ${res.data.id}`);
      return { success: true, resendId: res.data.id };
    }

    if (res.error) {
      console.error(`[RESEND ERROR] Failed to send password reset:`, res.error);
      return { success: false, error: res.error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[RESEND EXCEPTION] Error dispatching password reset:`, err);
    return { success: false, error: err.message || 'Failed to dispatch email' };
  }
}
