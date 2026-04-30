// worker/controllers/bulletinController.ts
import type { Env } from "../shared/types";

function escapeHtml(str: string) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const bulletinController = {
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
          u.public_id as client_public_id
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
      console.error("getList Error:", error);
      return new Response(JSON.stringify({ success: false, error: '讀取列表發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      
      const { 
        title, content, tags, payment_methods, budget_min, budget_max, 
        schedule_type, specific_date, ref_image_key, category,
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

      // 防洗版機制
      const currentCategory = category || 'request';
      const existingPost = await env.commission_db.prepare(
        `SELECT id FROM Bulletins WHERE client_id = ? AND category = ? AND status = 'open' AND expires_at > CURRENT_TIMESTAMP`
      ).bind(currentUserId, currentCategory).first();

      if (existingPost) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: '您目前已經有一篇刊登中的相同類型貼文，請先關閉舊貼文再發布新的。' 
        }), { status: 400, headers: corsHeaders });
      }

      // 安全過濾
      const safeTitle = escapeHtml(title.substring(0, 100));
      const safeTags = JSON.stringify(Array.isArray(tags) ? tags.map(t => escapeHtml(String(t))) : []);
      const safePayments = JSON.stringify(Array.isArray(payment_methods) ? payment_methods.map(p => escapeHtml(String(p))) : []);

      const safeContentObj = {
        description: escapeHtml(content),
        max_slots: Math.max(1, parseInt(max_slots) || 1), 
        selection_type: selection_type === 'fcfs' ? 'fcfs' : 'curated',
        commission_items: Array.isArray(commission_items) ? commission_items : [],
        questions: Array.isArray(questions) ? questions.map(q => escapeHtml(String(q))) : [],
        payment_timing: escapeHtml(String(payment_timing || '')),
        payment_timing_detail: escapeHtml(String(payment_timing_detail || '')),
        tos_content: escapeHtml(String(tos_content || ''))
      };

      const finalContentStr = JSON.stringify(safeContentObj);

      const id = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, title, content, tags, payment_methods, budget_min, budget_max, schedule_type, specific_date, ref_image_key, category, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).bind(id, currentUserId, safeTitle, finalContentStr, safeTags, safePayments, bMin, bMax, schedule_type || 'flexible', specific_date || null, ref_image_key || null, currentCategory, expiresAt.toISOString()).run();

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("create Bulletin Error:", error);
      return new Response(JSON.stringify({ success: false, error: '發布發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 資安防護 1：檢查「處理中」的訂單
      const existingActive = await env.commission_db.prepare(
        `SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ? AND status NOT IN ('declined', 'closed', 'cancelled')`
      ).bind(bulletinId, currentUserId).first();
      
      if (existingActive) {
        return new Response(JSON.stringify({ success: false, message: '您目前已有處理中的投遞，請勿重複投遞' }), { status: 400, headers: corsHeaders });
      }

      // 🌟 資安防護 2：實作防騷擾機制 (最多投 2 次)
      const historyCountResult = await env.commission_db.prepare(
        `SELECT count(*) as count FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`
      ).bind(bulletinId, currentUserId).first();
      
      const historyCount = historyCountResult ? (historyCountResult as any).count : 0;
      if (historyCount >= 2) {
        return new Response(JSON.stringify({ success: false, message: '您已達到此許願池的投遞次數上限 (最多 2 次)' }), { status: 403, headers: corsHeaders });
      }

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      const snapshotStr = typeof artist_snapshot === 'string' ? artist_snapshot : JSON.stringify(artist_snapshot);

      // 🌟 D1 樂觀鎖防超賣機制
      const bulletin = await env.commission_db.prepare(`SELECT content, client_id FROM Bulletins WHERE id = ? AND status = 'open'`).bind(bulletinId).first();
      
      if (!bulletin) {
        return new Response(JSON.stringify({ success: false, message: '此許願池文章不存在或已關閉' }), { status: 404, headers: corsHeaders });
      }
      if (bulletin.client_id === currentUserId) {
         return new Response(JSON.stringify({ success: false, message: '無法投遞給自己' }), { status: 400, headers: corsHeaders });
      }

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

      return new Response(JSON.stringify({ success: true, message: '已成功投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("inquire Error:", error);
      return new Response(JSON.stringify({ success: false, error: '投遞發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async closeBulletin(bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const bulletin = await env.commission_db.prepare(`SELECT id FROM Bulletins WHERE id = ? AND client_id = ?`).bind(bulletinId, currentUserId).first();
      if (!bulletin) return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });

      await env.commission_db.batch([
        env.commission_db.prepare(`UPDATE Bulletins SET status = 'closed' WHERE id = ?`).bind(bulletinId),
        env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'closed', latest_update_at = CURRENT_TIMESTAMP WHERE bulletin_id = ? AND status = 'pending'`).bind(bulletinId)
      ]);
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("closeBulletin Error:", error);
      return new Response(JSON.stringify({ success: false, error: '操作發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async declineInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { decline_reason } = body;
      
      // 🛡️ 資安防護：防禦 IDOR (越權操作)。必須是提案發起人(撤回) 或 發布該篇許願池的案主(婉拒) 才能操作
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP 
         WHERE id = ? 
         AND (artist_id = ? OR bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?))`
      ).bind(decline_reason || '案主已婉拒 / 投遞方已撤回', inquiryId, currentUserId, currentUserId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '操作失敗或權限不足' }), { status: 403, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("declineInquiry Error:", error);
      return new Response(JSON.stringify({ success: false, error: '操作發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },

  async submitResponse(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { client_response } = body;

      // 🛡️ 資安防護：防禦 IDOR。只有發布該篇許願池的案主可以進行回覆
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'submitted', client_response = ?, latest_update_at = CURRENT_TIMESTAMP 
         WHERE id = ? 
         AND bulletin_id IN (SELECT id FROM Bulletins WHERE client_id = ?)`
      ).bind(client_response, inquiryId, currentUserId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '操作失敗或權限不足' }), { status: 403, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      console.error("submitResponse Error:", error);
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
               i.decline_reason, i.client_response
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
      console.error("getClientInbox Error:", error);
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
               u.public_id as client_public_id
        FROM BulletinInquiries i 
        JOIN Bulletins b ON i.bulletin_id = b.id
        LEFT JOIN Users u ON b.client_id = u.id
        WHERE i.artist_id = ? 
        ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) { 
      console.error("getArtistInbox Error:", error);
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

      return new Response(JSON.stringify({ 
        success: true, 
        message: '批次處理完成',
        processed_count: result.meta.changes 
      }), { headers: corsHeaders });

    } catch (error: any) {
      console.error("batchDecline Error:", error);
      return new Response(JSON.stringify({ success: false, error: '批次處理發生異常，請稍後再試' }), { status: 500, headers: corsHeaders });
    }
  },
};