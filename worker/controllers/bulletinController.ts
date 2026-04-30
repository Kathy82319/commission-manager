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
          (SELECT GROUP_CONCAT(artist_id) FROM BulletinInquiries WHERE bulletin_id = b.id) as applied_artist_ids,
          u.display_name as client_name, u.avatar_url as client_avatar
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
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { title, content, tags, payment_methods, budget_min, budget_max, schedule_type, specific_date, ref_image_key, category } = body;

      if (!title || !content) {
        return new Response(JSON.stringify({ success: false, message: '標題與內容為必填' }), { status: 400, headers: corsHeaders });
      }

      const bMin = Math.max(0, parseInt(budget_min) || 0);
      const bMax = Math.max(0, parseInt(budget_max) || 0);
      if (bMax > 0 && bMin > bMax) {
        return new Response(JSON.stringify({ success: false, message: '最低預算不得高於最高預算' }), { status: 400, headers: corsHeaders });
      }

      // 🌟 防洗版機制：檢查該用戶是否已有同分類且開啟中的貼文
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

      const safeTitle = escapeHtml(title.substring(0, 100));
      const safeContent = escapeHtml(content);
      const safeTags = JSON.stringify(Array.isArray(tags) ? tags.map(t => escapeHtml(String(t))) : []);
      const safePayments = JSON.stringify(Array.isArray(payment_methods) ? payment_methods.map(p => escapeHtml(String(p))) : []);

      const id = crypto.randomUUID();
      const expiresAt = new Date();
      // 預設為 3 天
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, title, content, tags, payment_methods, budget_min, budget_max, schedule_type, specific_date, ref_image_key, category, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).bind(id, currentUserId, safeTitle, safeContent, safeTags, safePayments, bMin, bMax, schedule_type || 'flexible', specific_date || null, ref_image_key || null, currentCategory, expiresAt.toISOString()).run();

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const existing = await env.commission_db.prepare(`SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`).bind(bulletinId, currentUserId).first();
      if (existing) return new Response(JSON.stringify({ success: false, message: '請勿重複投遞' }), { status: 400, headers: corsHeaders });

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      const snapshotStr = typeof artist_snapshot === 'string' ? artist_snapshot : JSON.stringify(artist_snapshot);

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status, latest_update_at)
         VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
      ).bind(crypto.randomUUID(), bulletinId, currentUserId, snapshotStr).run();

      return new Response(JSON.stringify({ success: true, message: '已投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
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
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async declineInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { decline_reason } = body;
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(decline_reason || '案主已婉拒', inquiryId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async submitResponse(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { client_response } = body;
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'submitted', client_response = ?, latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(client_response, inquiryId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

// 🌟 為「發布儀表板 (My Posts Dashboard)」與「明信片提案」重構的 API
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
               i.decline_reason, i.client_response -- 🌟 新增：婉拒理由與案主回覆
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
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders }); 
    }
  },

  async getArtistInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT i.id as inquiry_id, i.status as inquiry_status, b.title as bulletin_title, 
               i.latest_update_at, i.artist_snapshot, b.client_id,
               b.ref_image_key, b.budget_min, b.budget_max, b.content as bulletin_content, 
               b.schedule_type, b.specific_date, -- 🌟 新增：許願池詳細資訊用於迷你卡片
               i.decline_reason, i.client_response -- 🌟 新增：婉拒理由與案主回覆
        FROM BulletinInquiries i 
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? 
        ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) { 
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders }); 
    }
  },
  // 🌟 新增：批次婉拒提案
  async batchDeclineInquiries(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { inquiry_ids, decline_reason } = body;

      // 🛡️ 資安防護 1：驗證資料型態
      if (!Array.isArray(inquiry_ids) || inquiry_ids.length === 0) {
        return new Response(JSON.stringify({ success: false, message: '未提供有效的委託單 ID 列表' }), { status: 400, headers: corsHeaders });
      }

      // 🛡️ 資安防護 2：防止資料庫 DoS 攻擊 (限制單次最大處理量)
      if (inquiry_ids.length > 50) {
        return new Response(JSON.stringify({ success: false, message: '單次批次處理不得超過 50 筆' }), { status: 400, headers: corsHeaders });
      }

      const finalReason = decline_reason || '已找到合適人選 / 終止洽談';

      // 動態產生對應數量的佔位符 (?, ?, ?)
      const placeholders = inquiry_ids.map(() => '?').join(',');

      // 🛡️ 資安防護 3：越權操作防禦 (BOLA/IDOR) & 狀態限制
      // 邏輯：只能婉拒「發起人是自己(artist)」或「案主是自己(client)」且狀態還是 pending 的單
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

      // 綁定參數陣列：[理由, id1, id2..., 當前用戶ID, 當前用戶ID]
      const params = [finalReason, ...inquiry_ids, currentUserId, currentUserId];

      const result = await env.commission_db.prepare(query).bind(...params).run();

      // result.meta.changes 會回傳實際被修改的資料筆數
      return new Response(JSON.stringify({ 
        success: true, 
        message: '批次處理完成',
        processed_count: result.meta.changes 
      }), { headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
};