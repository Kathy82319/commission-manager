// worker/controllers/bulletinController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit, sanitizeObject } from "../utils/security";
import { notificationController } from "./notificationController";

export const bulletinController = {
  async closeBulletin(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json().catch(() => ({})) as any;
      const decline_reason = body.decline_reason || '案主已撤銷許願 / 結束徵件';
      
      const safeReason = decline_reason.substring(0, 200).replace(/[<>]/g, '');

      const bulletin = await env.commission_db.prepare(`SELECT id, title, category FROM Bulletins WHERE id = ? AND client_id = ?`).bind(bulletinId, currentUserId).first() as any;
      if (!bulletin) return new Response(JSON.stringify({ success: false, message: '權限不足或找不到貼文' }), { status: 403, headers: corsHeaders });

      // 撈出所有尚未成單且未結案的洽談單
      const { results: pendingInquiries } = await env.commission_db.prepare(`
        SELECT i.id as inquiry_id, i.artist_id 
        FROM BulletinInquiries i 
        WHERE i.bulletin_id = ? AND i.status IN ('pending', 'submitted', 'proposed')
      `).bind(bulletinId).all();

      const batchOps = [];

      batchOps.push(env.commission_db.prepare(`UPDATE Bulletins SET status = 'closed' WHERE id = ?`).bind(bulletinId));
      
      batchOps.push(env.commission_db.prepare(`
        UPDATE BulletinInquiries 
        SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP 
        WHERE bulletin_id = ? AND status IN ('pending', 'submitted', 'proposed')
      `).bind(safeReason, bulletinId));

      for (const item of pendingInquiries as any[]) {
        const msgId = crypto.randomUUID();
        batchOps.push(
          env.commission_db.prepare(`
            INSERT INTO InquiryMessages (id, inquiry_id, sender_id, content, message_type) 
            VALUES (?, ?, ?, ?, 'text')
          `).bind(msgId, item.inquiry_id, currentUserId, `[系統代理] ${safeReason}`)
        );
      }

      await env.commission_db.batch(batchOps);

      for (const item of pendingInquiries as any[]) {
        const title = bulletin.title || '未命名';
        const isOffer = bulletin.category === 'offer';
        const text = isOffer ? `🌟 「${title}」已額滿或結束招收。` : `🌟 關於提案「${title}」，案主已撤銷許願或結束徵件。`;
        const link = isOffer ? '/client/inbox' : '/artist/inbox';
        await notificationController.createNotification(env, String(item.artist_id), 'inquiry_msg', text, link);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("closeBulletin Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '操作發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },
  
  async getList(request: Request, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const tagFilter = url.searchParams.get("tag");
      const categoryFilter = url.searchParams.get("category") || 'request';

      let query = `
        SELECT b.*, 
          (SELECT GROUP_CONCAT(artist_id) FROM BulletinInquiries WHERE bulletin_id = b.id AND status NOT IN ('declined', 'closed', 'cancelled')) as applied_artist_ids,
          u.display_name as client_name, 
          u.avatar_url as client_avatar,
          u.public_id as client_public_id,
          u.role as creator_role
        FROM Bulletins b 
        JOIN Users u ON b.client_id = u.id
        WHERE b.status = 'open' AND b.expires_at > CURRENT_TIMESTAMP 
          AND b.category = ?
      `;
      const params: any[] = [categoryFilter];

      if (tagFilter) {
        query += ` AND b.tags LIKE ?`;
        params.push(`%${tagFilter}%`);
      }
      query += ` ORDER BY b.created_at DESC`;

      const { results } = await env.commission_db.prepare(query).bind(...params).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("getList Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '讀取列表發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { category } = body;
      const currentCategory = category || 'request';

      const user = await env.commission_db.prepare(
        "SELECT role, plan_type, pro_expires_at, trial_end_at, wishboard_status, mute_expires_at FROM Users WHERE id = ?"
      ).bind(currentUserId).first() as any;
      
      if (!user) {
         return new Response(JSON.stringify({ success: false, message: '找不到使用者資訊' }), { status: 404, headers: corsHeaders });
      }

      if (user.wishboard_status === 'banned') {
        return new Response(JSON.stringify({ success: false, message: '您已被永久禁止使用許願池功能。' }), { status: 403, headers: corsHeaders });
      }
      if (user.wishboard_status === 'muted') {
        const now = new Date();
        const expiresAt = user.mute_expires_at ? new Date(user.mute_expires_at) : now;
        if (now < expiresAt) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `您目前已被禁止使用許願池功能，暫時無法發佈貼文。解除時間：${expiresAt.toLocaleString()}` 
          }), { status: 403, headers: corsHeaders });
        }
      }

      if (currentCategory === 'offer' && user.role !== 'artist' && user.role !== 'admin') {
         return new Response(JSON.stringify({ 
           success: false, 
           message: '必須開通創作者身分才能發布接委託貼文。' 
         }), { status: 403, headers: corsHeaders });
      }

      const { 
        title, content, tags, payment_methods, budget_min, budget_max, 
        schedule_type, specific_date, ref_image_key, 
        max_slots, selection_type, commission_items, questions, 
        payment_timing, payment_timing_detail, tos_content
      } = body;

      if (!title || !content) {
        return new Response(JSON.stringify({ success: false, message: '標題與內容為必填' }), { status: 400, headers: corsHeaders });
      }

      const bMin = Math.max(0, parseInt(budget_min) || 0);
      const bMax = Math.max(0, parseInt(budget_max) || 0);
      if (bMax > 0 && bMin > bMax) {
        return new Response(JSON.stringify({ success: false, message: '最低預算不得高於最高預算' }), { status: 400, headers: corsHeaders });
      }

      if (currentCategory === 'offer') {
          const isPro = user.plan_type === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());
          const isTrial = user.plan_type === 'trial' && (!user.trial_end_at || new Date(user.trial_end_at) > new Date());
          
          if (!isPro && !isTrial) {
              const { results: countRes } = await env.commission_db.prepare(`
                  SELECT COUNT(*) as count FROM Bulletins 
                  WHERE client_id = ? AND category = 'offer' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
              `).bind(currentUserId).all();
              
              const usedCount = (countRes[0]?.count as number) || 0;
              if (usedCount >= 1) {
                  return new Response(JSON.stringify({ 
                      success: false, 
                      error: 'QUOTA_EXCEEDED', 
                      message: '免費版每月僅能發佈 1 則接委託，您的額度已用盡。升級專業版以解鎖發佈限制！' 
                  }), { status: 403, headers: corsHeaders });
              }
          }
      }

      const existingPost = await env.commission_db.prepare(
        `SELECT id FROM Bulletins WHERE client_id = ? AND category = ? AND status = 'open' AND expires_at > CURRENT_TIMESTAMP`
      ).bind(currentUserId, currentCategory).first();

      if (existingPost) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: `您目前已經有一篇刊登中的「${currentCategory === 'offer' ? '接委託' : '徵委託'}」貼文，請先關閉舊貼文再發佈新的。` 
        }), { status: 400, headers: corsHeaders });
      }

      const safeTitle = sanitizeAndLimit(title, 100);
      const safeTagsArr = sanitizeObject(Array.isArray(tags) ? tags : [], 50);
      const safeTags = JSON.stringify(safeTagsArr);
      const safePaymentsArr = sanitizeObject(Array.isArray(payment_methods) ? payment_methods : [], 50);
      const safePayments = JSON.stringify(safePaymentsArr);

      const rawContentObj = {
        description: content,
        max_slots: Math.max(1, parseInt(max_slots) || 1), 
        selection_type: selection_type === 'fcfs' ? 'fcfs' : 'curated',
        commission_items: Array.isArray(commission_items) ? commission_items : [],
        questions: Array.isArray(questions) ? questions : [],
        payment_timing: payment_timing || '',
        payment_timing_detail: payment_timing_detail || '',
        tos_content: tos_content || ''
      };

      const safeContentObj = sanitizeObject(rawContentObj, 5000);
      const finalContentStr = JSON.stringify(safeContentObj);

      const id = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, title, content, tags, payment_methods, budget_min, budget_max, schedule_type, specific_date, ref_image_key, category, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).bind(id, currentUserId, safeTitle, finalContentStr, safeTags, safePayments, bMin, bMax, schedule_type || 'flexible', specific_date || null, ref_image_key || null, currentCategory, expiresAt.toISOString()).run();

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("create Bulletin Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '發布發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const user = await env.commission_db.prepare(
        "SELECT role, plan_type, pro_expires_at, trial_end_at, wishboard_status, mute_expires_at FROM Users WHERE id = ?"
      ).bind(currentUserId).first() as any;
      
      if (!user) {
        return new Response(JSON.stringify({ success: false, message: '找不到使用者資訊' }), { status: 404, headers: corsHeaders });
      }

      if (user.wishboard_status === 'banned') {
        return new Response(JSON.stringify({ success: false, message: '您已被永久禁止使用許願池功能，無法投遞。' }), { status: 403, headers: corsHeaders });
      }
      if (user.wishboard_status === 'muted') {
        const now = new Date();
        const expiresAt = user.mute_expires_at ? new Date(user.mute_expires_at) : now;
        if (now < expiresAt) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: `您目前已被禁止使用許願池功能，暫時無法進行投遞。解除時間：${expiresAt.toLocaleString()}` 
          }), { status: 403, headers: corsHeaders });
        }
      }

      const bulletin = await env.commission_db.prepare(`SELECT title, content, client_id, category FROM Bulletins WHERE id = ? AND status = 'open'`).bind(bulletinId).first() as any;
      if (!bulletin) {
        return new Response(JSON.stringify({ success: false, message: '此許願池文章不存在或已關閉' }), { status: 404, headers: corsHeaders });
      }
      if (bulletin.client_id === currentUserId) {
         return new Response(JSON.stringify({ success: false, message: '無法投遞給自己' }), { status: 400, headers: corsHeaders });
      }

      if (bulletin.category === 'request' && user.role !== 'artist' && user.role !== 'admin') {
         return new Response(JSON.stringify({ 
           success: false, 
           message: '這是一篇徵委託貼文，必須開通創作者身分才能向案主投遞應徵。' 
         }), { status: 403, headers: corsHeaders });
      }

      const existingActive = await env.commission_db.prepare(
        `SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ? AND status NOT IN ('declined', 'closed', 'cancelled')`
      ).bind(bulletinId, currentUserId).first();
      
      if (existingActive) {
        return new Response(JSON.stringify({ success: false, message: '您目前已有處理中的投遞，請勿重複投遞' }), { status: 400, headers: corsHeaders });
      }

      const historyCountResult = await env.commission_db.prepare(
        `SELECT count(*) as count FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`
      ).bind(bulletinId, currentUserId).first();
      
      const historyCount = historyCountResult ? (historyCountResult as any).count : 0;
      if (historyCount >= 2) {
        return new Response(JSON.stringify({ success: false, message: '您已達到此許願池的投遞次數上限 (最多 2 次)' }), { status: 403, headers: corsHeaders });
      }

      if (bulletin.category === 'request') {
          const isPro = user.plan_type === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());
          const isTrial = user.plan_type === 'trial' && (!user.trial_end_at || new Date(user.trial_end_at) > new Date());
          
          if (!isPro && !isTrial) {
              const { results: countRes } = await env.commission_db.prepare(`
                  SELECT COUNT(*) as count FROM BulletinInquiries i
                  JOIN Bulletins b ON i.bulletin_id = b.id
                  WHERE i.artist_id = ? AND b.category = 'request' AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')
              `).bind(currentUserId).all();
              
              const usedCount = (countRes[0]?.count as number) || 0;
              if (usedCount >= 5) {
                  return new Response(JSON.stringify({ 
                      success: false, 
                      error: 'QUOTA_EXCEEDED', 
                      message: '免費版每月僅能主動投遞 5 次案主委託，您的額度已用盡。升級專業版以解鎖投遞限制！' 
                  }), { status: 403, headers: corsHeaders });
              }
          }
      }

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      const snapshotStr = typeof artist_snapshot === 'string' ? artist_snapshot : JSON.stringify(artist_snapshot);

      let contentObj: any = {};
      try {
        contentObj = JSON.parse(bulletin.content as string);
      } catch (e) {}

      const isFcfs = contentObj.selection_type === 'fcfs';
      const maxSlots = parseInt(contentObj.max_slots) || 1;

      if (isFcfs) {
        const currentCountResult = await env.commission_db.prepare(
          `SELECT count(*) as count FROM BulletinInquiries WHERE bulletin_id = ? AND status != 'cancelled'`
        ).bind(bulletinId).first();
        
        const currentCount = currentCountResult ? (currentCountResult as any).count : 0;

        if (currentCount >= maxSlots) {
          await env.commission_db.prepare(`UPDATE Bulletins SET status = 'closed' WHERE id = ?`).bind(bulletinId).run();
          return new Response(JSON.stringify({ success: false, message: '抱歉，此委託名額已被搶先投滿了！' }), { status: 409, headers: corsHeaders });
        }
      }

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status, latest_update_at)
         VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
      ).bind(crypto.randomUUID(), bulletinId, currentUserId, snapshotStr).run();

      const title = bulletin.title || '未命名';
      const isOffer = bulletin.category === 'offer';
      const text = isOffer ? `🌟 您的接委託「${title}」收到了新委託人的投遞！` : `🌟 您的徵委託「${title}」收到了新繪師的提案！`;
      const link = isOffer ? '/artist/inbox' : '/client/inbox';
      await notificationController.createNotification(env, String(bulletin.client_id), 'inquiry_msg', text, link);

      return new Response(JSON.stringify({ success: true, message: '已成功投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("inquire Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '投遞發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async declineInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { decline_reason } = body;

      const inquiryData = await env.commission_db.prepare(`
        SELECT i.artist_id, b.title, b.category, b.client_id as bulletin_client_id
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ?
      `).bind(inquiryId).first() as any;
      
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP 
         WHERE id = ? 
         AND (artist_id = ? OR bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?))`
      ).bind(decline_reason || '案主已婉拒 / 投遞方已撤回', inquiryId, currentUserId, currentUserId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '操作失敗或權限不足' }), { status: 403, headers: corsHeaders });
      }

      if (inquiryData) {
        const title = inquiryData.title || '未命名';
        const isOffer = inquiryData.category === 'offer';
        
        if (currentUserId === inquiryData.artist_id) {
           const text = isOffer ? `🌟 委託人已撤回對「${title}」的洽談申請。` : `🌟 繪師已撤回針對「${title}」的提案。`;
           const link = isOffer ? '/artist/inbox' : '/client/inbox';
           await notificationController.createNotification(env, String(inquiryData.bulletin_client_id), 'inquiry_msg', text, link);
        } else {
           const text = isOffer ? `🌟 關於投遞「${title}」，繪師已婉拒洽談。` : `🌟 關於提案「${title}」，案主已婉拒洽談。`;
           const link = isOffer ? '/client/inbox' : '/artist/inbox';
           await notificationController.createNotification(env, String(inquiryData.artist_id), 'inquiry_msg', text, link);
        }
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("declineInquiry Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '操作發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async submitResponse(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { client_response } = body;

      const inquiryData = await env.commission_db.prepare(`
        SELECT i.artist_id, b.title, b.category 
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'submitted', client_response = ?, latest_update_at = CURRENT_TIMESTAMP 
         WHERE id = ? 
         AND bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?)`
      ).bind(client_response, inquiryId, currentUserId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '操作失敗或權限不足' }), { status: 403, headers: corsHeaders });
      }

      if (inquiryData) {
        const title = inquiryData.title || '未命名';
        const isOffer = inquiryData.category === 'offer';
        const text = isOffer ? `🌟 繪師已邀請您針對「${title}」進行詳談，請前往確認。` : `🌟 案主已邀請您針對「${title}」進行詳談，請前往確認。`;
        await notificationController.createNotification(env, String(inquiryData.artist_id), 'inquiry_msg', text, `/inquiry/workspace/${inquiryId}`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("submitResponse Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '回覆發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async getClientInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results: myBulletins } = await env.commission_db.prepare(`
        SELECT id, title, category, status, expires_at, created_at,
          (SELECT COUNT(*) FROM BulletinInquiries WHERE bulletin_id = Bulletins.id) as inquiry_count
        FROM Bulletins 
        WHERE client_id = ? 
        ORDER BY created_at DESC
      `).bind(currentUserId).all();

      const { results: myInquiries } = await env.commission_db.prepare(`
        SELECT i.id as inquiry_id, b.id as bulletin_id, b.title as bulletin_title, 
               i.artist_id, i.status as inquiry_status, u.display_name as artist_name, 
               u.avatar_url as artist_avatar, u.public_id as artist_public_id, 
               i.latest_update_at, i.artist_snapshot, 
               i.decline_reason, i.client_response,
               (SELECT c.id FROM Commissions c WHERE c.artist_id = i.artist_id AND c.client_id = b.client_id ORDER BY c.order_date DESC LIMIT 1) as commission_id
        FROM Bulletins b 
        JOIN BulletinInquiries i ON b.id = i.bulletin_id 
        LEFT JOIN Users u ON i.artist_id = u.id
        WHERE b.client_id = ? 
        ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ 
        success: true, 
        data: { bulletins: myBulletins, inquiries: myInquiries }
      }), { headers: corsHeaders });
    } catch (error: any) { 
      console.error("getClientInbox Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '讀取發生異常，請稍後再試' }), { status: 500, headers: corsHeaders }); 
    }
  },

  async getArtistInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT i.id as inquiry_id, i.status as inquiry_status, b.title as bulletin_title, 
               i.latest_update_at, i.artist_snapshot, b.client_id,
               b.ref_image_key, b.budget_min, b.budget_max, b.content as bulletin_content, 
               b.schedule_type, b.specific_date, b.category as bulletin_category,
               i.decline_reason, i.client_response,
               u.display_name as client_name, 
               u.public_id as client_public_id,
               u.role as creator_role,
               (SELECT c.id FROM Commissions c WHERE c.artist_id = i.artist_id AND c.client_id = b.client_id ORDER BY c.order_date DESC LIMIT 1) as commission_id
        FROM BulletinInquiries i 
        JOIN Bulletins b ON i.bulletin_id = b.id
        LEFT JOIN Users u ON b.client_id = u.id
        WHERE i.artist_id = ? 
        ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) { 
      console.error("getArtistInbox Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '讀取發生異常，請稍後再試' }), { status: 500, headers: corsHeaders }); 
    }
  },

  async batchDeclineInquiries(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { inquiry_ids, decline_reason } = body;

      if (!Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
        return new Response(JSON.stringify({ success: false, message: '未提供有效的委託單 ID 列表' }), { status: 400, headers: corsHeaders });
      }

      if (inquiry_ids.length > 50) {
        return new Response(JSON.stringify({ success: false, message: '單次批次處理不得超過 50 筆' }), { status: 400, headers: corsHeaders });
      }

      const finalReason = decline_reason || '已找到合適人選 / 終止洽談';
      const placeholders = inquiry_ids.map(() => '?').join(',');

      const { results: pendingInquiries } = await env.commission_db.prepare(`
        SELECT i.artist_id, b.title, b.category
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.id IN (${placeholders}) AND i.status = 'pending'
      `).bind(...inquiry_ids).all();

      const query = `
        UPDATE BulletinInquiries 
        SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP 
        WHERE id IN (${placeholders})
        AND (
          artist_id = ? 
          OR bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?)
        )
        AND status = 'pending'
      `;

      const params = [finalReason, ...inquiry_ids, currentUserId, currentUserId];
      const result = await env.commission_db.prepare(query).bind(...params).run();

      if (result.meta.changes > 0) {
         for (const item of pendingInquiries as any[]) {
           const title = item.title || '未命名';
           const isOffer = item.category === 'offer';
           const text = isOffer ? `🌟 關於投遞「${title}」，繪師已婉拒洽談。` : `🌟 關於提案「${title}」，案主已婉拒洽談。`;
           const link = isOffer ? '/client/inbox' : '/artist/inbox';
           await notificationController.createNotification(env, String(item.artist_id), 'inquiry_msg', text, link);
         }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: '批次處理完成',
        processed_count: result.meta.changes 
      }), { headers: corsHeaders });

    } catch (error: any) {
      console.error("batchDecline Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '批次處理發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async getQuota(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const user = await env.commission_db.prepare("SELECT plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?").bind(currentUserId).first() as any;
      const isPro = user?.plan_type === 'pro' && (!user.pro_expires_at || new Date(user.pro_expires_at) > new Date());
      const isTrial = user?.plan_type === 'trial' && (!user.trial_end_at || new Date(user.trial_end_at) > new Date());

      const { results: offerRes } = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Bulletins 
        WHERE client_id = ? AND category = 'offer' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `).bind(currentUserId).all();

      const { results: requestRes } = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? AND b.category = 'request' AND strftime('%Y-%m', i.created_at) = strftime('%Y-%m', 'now')
      `).bind(currentUserId).all();

      const headers = new Headers(corsHeaders);
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

      return new Response(JSON.stringify({ 
        success: true, 
        data: {
          is_pro: isPro || isTrial,
          offer_used: offerRes[0]?.count || 0,
          offer_max: 1,
          request_inquire_used: requestRes[0]?.count || 0,
          request_inquire_max: 5
        }
      }), { headers });
    } catch (error: any) {
      console.error("getQuota Error:", error.message);
      return new Response(JSON.stringify({ success: false, error: '讀取額度發生異常' }), { status: 500, headers: corsHeaders });
    }
  },

  async reportBulletin(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      
      const reason = body.reason ? String(body.reason).substring(0, 200).replace(/[<>]/g, '') : "無提供原因";

      const { results: userRes } = await env.commission_db.prepare(
        "SELECT role FROM Users WHERE id = ?"
      ).bind(currentUserId).all();
      
      if (userRes.length === 0) {
        return new Response(JSON.stringify({ error: "找不到使用者" }), { status: 404, headers: corsHeaders });
      }
      const reporterRole = userRes[0].role as string;

      const { results: existingReport } = await env.commission_db.prepare(
        "SELECT id FROM Reports WHERE bulletin_id = ? AND reporter_id = ?"
      ).bind(targetId, currentUserId).all();

      if (existingReport.length > 0) {
        return new Response(JSON.stringify({ error: "您已經檢舉過此貼文，系統已記錄。" }), { status: 400, headers: corsHeaders });
      }

      await env.commission_db.prepare(`
        INSERT INTO Reports (bulletin_id, reporter_id, reporter_role, reason)
        VALUES (?, ?, ?, ?)
      `).bind(targetId, currentUserId, reporterRole, reason).run();

      const { results: weightRes } = await env.commission_db.prepare(`
        SELECT COUNT(DISTINCT reporter_id) as artist_count 
        FROM Reports 
        WHERE bulletin_id = ? AND reporter_role = 'artist'
      `).bind(targetId).all();

      const artistCount = Number(weightRes[0]?.artist_count) || 0;

      if (artistCount >= 10) { 
        const batchStatements = [];

        batchStatements.push(
          env.commission_db.prepare(`UPDATE Bulletins SET status = 'hidden_under_review' WHERE id = ?`).bind(targetId)
        );
        
        if (batchStatements.length > 0) {
          await env.commission_db.batch(batchStatements);
        }

        const { results: admins } = await env.commission_db.prepare(`
          SELECT id FROM Users WHERE role = 'admin'
        `).all();

        if (admins.length > 0) {
          const alertContent = `許願池貼文 #${targetId} 遭社群檢舉達 10 次，已啟動自動隱藏防護，請前往後台進行違規審查。`;
          await Promise.all(admins.map(admin => 
            notificationController.createNotification(env, String(admin.id), 'SYSTEM_ALERT', alertContent, `/admin/wishboard/reported`)
          ));
        }
      }

      return new Response(JSON.stringify({ success: true, message: "檢舉已送出，感謝您協助維護社群環境。" }), { status: 200, headers: corsHeaders });

    } catch (error: any) {
      console.error(`[Report Error] ID: ${targetId}`, error.message);
      return new Response(JSON.stringify({ error: "檢舉處理失敗，請稍後再試" }), { status: 500, headers: corsHeaders });
    }
  }

};