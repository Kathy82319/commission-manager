// worker/services/email.ts
import type { Env } from "../shared/types";

export const emailService = {
  /**
   * 透過 Resend API 發送系統通知信件
   * 
   * @param env 環境變數物件 (需包含 RESEND_API_KEY)
   * @param toEmail 收件者信箱
   * @param subject 信件主旨
   * @param previewText 信件內文 (純文字描述)
   * @param actionUrl 信件按鈕的導向連結
   */
  async sendNotificationEmail(
    env: Env,
    toEmail: string,
    subject: string,
    previewText: string,
    actionUrl: string
  ): Promise<void> {
    
    // 從環境變數抓取 API 金鑰與寄件者信箱
    const apiKey = (env as any).RESEND_API_KEY;
    const fromEmail = (env as any).RESEND_FROM_EMAIL || "Arti <noreply@arti.tw>";

    if (!apiKey) {
      console.warn("未設定 RESEND_API_KEY，跳過 Email 發送流程。");
      return;
    }

    // Arti 專屬的 HTML 郵件模板
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F3F4F6; padding: 20px 0; margin: 0;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #5D4A3E; padding: 24px; text-align: center;">
              <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; letter-spacing: 2px;">Arti 繪師小幫手</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
                ${previewText}
              </p>
              
              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 8px;" bgcolor="#4E7A5A">
                    <a href="${actionUrl}" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 14px 32px; border: 1px solid #4E7A5A; display: inline-block;">
                      前往查看詳情
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0 0 8px 0;">
                這是一封系統自動發送的通知信件，請勿直接回覆。
              </p>
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                若您不想再收到此類通知，可隨時登入系統至「通知與信箱設定」中關閉提醒。
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Resend API 發信失敗:", response.status, errorData);
        throw new Error(`Resend API Error: ${response.status}`);
      }

    } catch (error) {
      console.error("[EmailService] 寄信發生例外錯誤:", error);
      throw error;
    }
  }
};