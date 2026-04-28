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

      const safeTitle = escapeHtml(title.substring(0, 100));
      const safeContent = escapeHtml(content);
      const safeTags = JSON.stringify(Array.isArray(tags) ? tags.map(t => escapeHtml(String(t))) : []);
      const safePayments = JSON.stringify(Array.isArray(payment_methods) ? payment_methods.map(p => escapeHtml(String(p))) : []);

      const id = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, title, content, tags, payment_methods, budget_min, budget_max, schedule_type, specific_date, ref_image_key, category, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).bind(id, currentUserId, safeTitle, safeContent, safeTags, safePayments, bMin, bMax, schedule_type || 'flexible', specific_date || null, ref_image_key || null, category || 'request', expiresAt.toISOString()).run();

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 🌟 修正 Inquire (投遞意向)：強化對 artist_snapshot 的清洗
  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const existing = await env.commission_db.prepare(`SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`).bind(bulletinId, currentUserId).first();
      if (existing) return new Response(JSON.stringify({ success: false, message: '請勿重複投遞' }), { status: 400, headers: corsHeaders });

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      
      // 🛡️ 資安防護：確保存入的 snapshot 是乾淨的 JSON，並過濾 XSS
      let parsedSnapshot: any = {};
      try {
        parsedSnapshot = typeof artist_snapshot === 'string' ? JSON.parse(artist_snapshot) : artist_snapshot;
        // 基本清洗，避免惡意 HTML 標籤
        if (parsedSnapshot.message) parsedSnapshot.message = escapeHtml(parsedSnapshot.message);
        if (parsedSnapshot.specialties) parsedSnapshot.specialties = escapeHtml(parsedSnapshot.specialties);
        if (parsedSnapshot.no_gos) parsedSnapshot.no_gos = escapeHtml(parsedSnapshot.no_gos);
        if (parsedSnapshot.payment_methods) parsedSnapshot.payment_methods = escapeHtml(parsedSnapshot.payment_methods);
        if (parsedSnapshot.question_template) parsedSnapshot.question_template = escapeHtml(parsedSnapshot.question_template);
        
        // 確保 images 是一個安全的字串陣列
        if (Array.isArray(parsedSnapshot.images)) {
          parsedSnapshot.images = parsedSnapshot.images.map((url: string) => escapeHtml(url)).slice(0, 3); // 限制最多 3 張
        } else {
          parsedSnapshot.images = [];
        }
      } catch (e) {
        return new Response(JSON.stringify({ success: false, message: '提案格式錯誤' }), { status: 400, headers: corsHeaders });
      }

      const snapshotStr = JSON.stringify(parsedSnapshot);

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status, latest_update_at)
         VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
      ).bind(crypto.randomUUID(), bulletinId, currentUserId, snapshotStr).run();

      return new Response(JSON.stringify({ success: true, message: '已發送專屬提案！' }), { headers: corsHeaders });
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
      const result = await env.commission_db.prepare(
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

  async getClientInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT b.id as bulletin_id, b.title as bulletin_title, i.id as inquiry_id, i.artist_id, i.status as inquiry_status, u.display_name as artist_name, u.public_id as artist_public_id, i.latest_update_at
        FROM Bulletins b JOIN BulletinInquiries i ON b.id = i.bulletin_id LEFT JOIN Users u ON i.artist_id = u.id
        WHERE b.client_id = ? ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) { return new Response(JSON.stringify({ success: false }), { status: 500, headers: corsHeaders }); }
  },

  async getArtistInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT i.id as inquiry_id, i.status as inquiry_status, b.title as bulletin_title, i.latest_update_at
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ? ORDER BY i.latest_update_at DESC
      `).bind(currentUserId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) { return new Response(JSON.stringify({ success: false }), { status: 500, headers: corsHeaders }); }
  }
};