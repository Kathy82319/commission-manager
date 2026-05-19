// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";
import { emailService } from "../services/email"; 

const formatOutputTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('Z')) return dateStr;
  return dateStr.includes('T') ? dateStr + 'Z' : dateStr.replace(' ', 'T') + 'Z';
};

export const notificationController = {
  
  async createNotification(env: Env, userId: string, type: string, text: string, linkUrl: string) {
    // 防呆處理：防止 undefined 傳入 D1 造成整個 Worker 崩潰
    const safeUserId = userId ?? '';
    const safeType = type ?? 'system';
    const safeText = text ?? '';
    const safeLinkUrl = linkUrl ?? '';

    try {
      // 【防抖邏輯實作】
      const existingNotif = await env.commission_db.prepare(`
        SELECT id FROM Notifications 
        WHERE user_id = ? AND link_to = ? AND is_read = 0
      `).bind(safeUserId, safeLinkUrl).first<{ id: string }>();

      if (existingNotif) {
        // 如果已經存在未讀通知，只更新它的時間戳記與內容
        // 關鍵：因為進入了防抖，直接 return 結束，絕對不觸發 Email 寄信！
        await env.commission_db.prepare(`
          UPDATE Notifications 
          SET created_at = CURRENT_TIMESTAMP, content = ? 
          WHERE id = ?
        `).bind(safeText, existingNotif.id).run();
        return; 
      } else {
        // 如果不存在，才新增一筆全新的通知 (恢復原本的 INSERT 結構)
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      }

      // ==========================================
      // 🚀 Email 寄信與使用者偏好設定檢查模組 (已修復關閉無效問題)
      // ==========================================
      
      // 1. 取得收件人的 Email 設定與指定的收件信箱
      const userSettings = await env.commission_db.prepare(`
        SELECT notification_email, 
               email_art_chat, email_art_progress, email_art_inbound,
               email_cli_chat, email_cli_progress, email_cli_bulletin
        FROM Users WHERE id = ?
      `).bind(safeUserId).first<any>();

      // 2. 若使用者有設定信箱，才進入寄信邏輯判定
      if (userSettings && userSettings.notification_email) {
        let shouldSendEmail = false;

        // 🌟 強化身分環境判定：精準捕捉正式單與洽談單的路由邏輯特徵
        const isArtistContext = 
          safeLinkUrl.includes('/artist/') || 
          safeLinkUrl.includes('role=artist') || 
          safeText.includes('您的接委託') || 
          safeText.includes('您的徵委託') ||
          (safeLinkUrl.includes('/inquiry/workspace/') && safeText.includes('送出了新的委託申請')); // 表單進來歸類為創作者

        const isClientContext = 
          safeLinkUrl.includes('/client/') || 
          safeText.includes('為您建立') || 
          safeText.includes('邀請您') ||
          (!safeLinkUrl.includes('role=artist') && safeLinkUrl.includes('/workspace/') && (safeText.includes('上傳') || safeText.includes('提交')));

        // 確保數值全部強制轉為強型別 Number，防範 DB 傳出字串或其他弱型別真值
        const artChat = Number(userSettings.email_art_chat ?? 1);
        const artProgress = Number(userSettings.email_art_progress ?? 1);
        const artInbound = Number(userSettings.email_art_inbound ?? 1);
        const cliChat = Number(userSettings.email_cli_chat ?? 1);
        const cliProgress = Number(userSettings.email_cli_progress ?? 1);
        const cliBulletin = Number(userSettings.email_cli_bulletin ?? 1);

        // 3. 根據系統分類與文字特徵進行精準二進制邏輯閘相咬
        if (safeText.includes('聊天') || safeText.includes('💬') || safeType === 'chat') {
          // 聊天訊息類：若為創作者環境，則嚴格遵從 artChat 開關；若為委託人環境，則嚴格遵從 cliChat 開關
          if (isArtistContext) {
            if (artChat === 1) shouldSendEmail = true;
          } else if (isClientContext) {
            if (cliChat === 1) shouldSendEmail = true;
          } else {
            // 安全退化資產：若真的無法識別，只要其中一邊有關閉，就採取保守防禦不寄送（改為交集判定）
            if (artChat === 1 && cliChat === 1) shouldSendEmail = true;
          }
        }
        else if (safeText.includes('投遞') || safeText.includes('應徵') || safeText.includes('送出了新的委託申請') || safeText.includes('婉拒') || safeText.includes('詳談') || safeText.includes('額滿')) {
          // 許願池與主動表單洽談類
          if (isArtistContext) {
            if (artInbound === 1) shouldSendEmail = true;
          } else if (isClientContext) {
            if (cliBulletin === 1) shouldSendEmail = true;
          } else {
            if (artInbound === 1 && cliBulletin === 1) shouldSendEmail = true;
          }
        }
        else {
          // 剩餘狀態皆歸類為：委託進度與合約變更 (Progress)
          if (isArtistContext) {
            if (artProgress === 1) shouldSendEmail = true;
          } else if (isClientContext) {
            if (cliProgress === 1) shouldSendEmail = true;
          } else {
            if (artProgress === 1 && cliProgress === 1) shouldSendEmail = true;
          }
        }

        // 4. 判定通過，執行寄信
        if (shouldSendEmail) {
          try {
            const frontendUrl = env.FRONTEND_URL || 'https://arti7.net';
            const fullLink = safeLinkUrl.startsWith('http') ? safeLinkUrl : `${frontendUrl}${safeLinkUrl}`;
            
            await emailService.sendNotificationEmail(
              env,
              userSettings.notification_email,
              "【Arti 繪師小幫手】您有一則新通知", 
              safeText, 
              fullLink 
            );
          } catch (emailErr) {
            console.error("Email API 呼叫失敗，但不影響主流程:", emailErr);
          }
        }
      }

    } catch (e) {
      console.error("發送通知(含防抖)失敗，啟動降級方案:", e);
      try {
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      } catch (fallbackErr) {
        console.error("降級方案寫入失敗:", fallbackErr);
      }
    }
  },

  async getNotifications(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      const unreadCount = (countRes?.count as number) || 0;

      const { results } = await env.commission_db.prepare(`
        SELECT id, type, title, content, link_to, created_at, is_read 
        FROM Notifications 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 15
      `).bind(currentUserId).all();

      const notifications = results.map((n: any) => ({
        id: n.id,
        type: n.type,
        text: n.content, 
        link: n.link_to, 
        time: formatOutputTime(n.created_at),
        isUnread: n.is_read === 0
      }));

      return new Response(JSON.stringify({ 
        success: true, 
        unreadCount, 
        notifications 
      }), { headers: corsHeaders });

    } catch (error: any) {
      console.error("讀取通知失敗:", error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getUnreadCount(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      
      const count = (countRes?.count as number) || 0;

      return new Response(JSON.stringify({ success: true, count }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, count: 0, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
  
  async markAsRead(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`
        UPDATE Notifications 
        SET is_read = 1 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  } 
}; 