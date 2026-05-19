// worker/controllers/notificationController.ts
import type { Env } from "../shared/types";
// 假設您已經建立好了這個服務，並具有送信的基礎方法
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
        // ⚠️ 關鍵：因為進入了防抖，直接 return 結束，絕對『不』觸發 Email 寄信！
        await env.commission_db.prepare(`
          UPDATE Notifications 
          SET created_at = CURRENT_TIMESTAMP, content = ? 
          WHERE id = ?
        `).bind(safeText, existingNotif.id).run();
        return; 
      } else {
        // 如果不存在，才新增一筆全新的通知小鈴鐺
        const id = crypto.randomUUID();
        await env.commission_db.prepare(`
          INSERT INTO Notifications (id, user_id, type, title, content, link_to, is_read) 
          VALUES (?, ?, ?, '系統通知', ?, ?, 0)
        `).bind(id, safeUserId, safeType, safeText, safeLinkUrl).run();
      }

      // ==========================================
      // 🚀 Email 寄信與使用者偏好設定檢查模組
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

        // 簡單判定通知所屬的「身分」環境 (透過 URL 與文字特徵)
        const isArtistContext = safeLinkUrl.includes('/artist/') || safeLinkUrl.includes('role=artist') || safeText.includes('您的接委託') || safeText.includes('您的徵委託');
        const isClientContext = safeLinkUrl.includes('/client/') || safeText.includes('為您建立') || safeText.includes('邀請您');
        const contextRole = isArtistContext ? 'artist' : (isClientContext ? 'client' : 'unknown');

        // 根據文字特徵對應使用者的 6 個開關
        if (safeText.includes('聊天') || safeText.includes('💬')) {
            // 聊天訊息類
            if (contextRole === 'artist' && userSettings.email_art_chat === 1) shouldSendEmail = true;
            if (contextRole === 'client' && userSettings.email_cli_chat === 1) shouldSendEmail = true;
            if (contextRole === 'unknown' && (userSettings.email_art_chat === 1 || userSettings.email_cli_chat === 1)) shouldSendEmail = true;
        }
        else if (safeText.includes('投遞') || safeText.includes('應徵') || safeText.includes('送出了新的委託申請') || safeText.includes('婉拒') || safeText.includes('詳談') || safeText.includes('額滿')) {
            // 許願池與主動詢問類 (Inbound / Bulletin)
            if (contextRole === 'artist' && userSettings.email_art_inbound === 1) shouldSendEmail = true;
            if (contextRole === 'client' && userSettings.email_cli_bulletin === 1) shouldSendEmail = true;
            if (contextRole === 'unknown' && (userSettings.email_art_inbound === 1 || userSettings.email_cli_bulletin === 1)) shouldSendEmail = true;
        }
        else {
            // 剩餘狀態皆歸類為：委託進度與合約變更 (Progress)
            if (contextRole === 'artist' && userSettings.email_art_progress === 1) shouldSendEmail = true;
            if (contextRole === 'client' && userSettings.email_cli_progress === 1) shouldSendEmail = true;
            if (contextRole === 'unknown' && (userSettings.email_art_progress === 1 || userSettings.email_cli_progress === 1)) shouldSendEmail = true;
        }

        // 3. 判定通過，執行寄信
        if (shouldSendEmail) {
          try {
            // 組裝完整的跳轉網址供 Email 內部點擊
            const frontendUrl = env.FRONTEND_URL || 'https://arti.tw';
            const fullLink = safeLinkUrl.startsWith('http') ? safeLinkUrl : `${frontendUrl}${safeLinkUrl}`;
            
            await emailService.sendNotificationEmail(
              env,
              userSettings.notification_email,
              "【Arti 繪師小幫手】您有一則新通知", // 信件主旨
              safeText, // 信件純文字預覽
              fullLink // 信件中的按鈕網址
            );
          } catch (emailErr) {
            console.error("Email API 呼叫失敗，但不影響主流程:", emailErr);
          }
        }
      }

    } catch (e) {
      console.error("發送通知(含防抖)失敗，啟動降級方案:", e);
      // Fallback 方案：如果上面的防抖因為 DB Schema 不支援而失敗，退回最原始且保證成功的寫入方式
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