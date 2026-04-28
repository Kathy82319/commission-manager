// worker/controllers/bulletinController.ts
import type { Env } from "../shared/types";

export const bulletinController = {
  // 1. 取得許願池列表 (公開)
  async getList(env: Env, corsHeaders: any) {
    try {
      // 🌟 修正：只抓取 open 且未過期的，並包含過期時間
      const { results } = await env.commission_db.prepare(
        `SELECT b.*, 
          (SELECT GROUP_CONCAT(artist_id) FROM BulletinInquiries WHERE bulletin_id = b.id) as applied_artist_ids
         FROM Bulletins b 
         WHERE status = 'open' AND expires_at > CURRENT_TIMESTAMP 
         ORDER BY created_at DESC`
      ).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 發布許願 (需登入，為案主)
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { content, budget_range, specs, ref_image_key, category } = body;
      const id = crypto.randomUUID();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, content, budget_range, specs, ref_image_key, category, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')`
      ).bind(
        id, currentUserId, content, budget_range, specs, 
        ref_image_key || null, category || 'request', expiresAt.toISOString()
      ).run();

      return new Response(JSON.stringify({ success: true, id, message: '許願已發布' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 🌟 9. 新增：案主主動結案 (手動結束徵件)
  async closeBulletin(bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 1. 檢查權限：必須是該許願單的發布者
      const bulletin = await env.commission_db.prepare(
        `SELECT id FROM Bulletins WHERE id = ? AND client_id = ?`
      ).bind(bulletinId, currentUserId).first();

      if (!bulletin) {
        return new Response(JSON.stringify({ success: false, message: '找不到該許願單或權限不足' }), { status: 403, headers: corsHeaders });
      }

      // 2. 執行批次更新：
      // A. 將許願單設為已關閉
      // B. 將所有還在 pending 的投遞設為 closed (徵件已結束)
      await env.commission_db.batch([
        env.commission_db.prepare(`UPDATE Bulletins SET status = 'closed' WHERE id = ?`).bind(bulletinId),
        env.commission_db.prepare(`
          UPDATE BulletinInquiries 
          SET status = 'closed', latest_update_at = CURRENT_TIMESTAMP 
          WHERE bulletin_id = ? AND status = 'pending'
        `).bind(bulletinId)
      ]);

      return new Response(JSON.stringify({ success: true, message: '許願徵件已成功結束' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // --- 以下維持之前的程式碼，不再重複列出以節省篇幅 ---
  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const existing = await env.commission_db.prepare(
        `SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`
      ).bind(bulletinId, currentUserId).first();

      if (existing) {
        return new Response(JSON.stringify({ success: false, message: '您已經投遞過此許願單，請勿重複投遞' }), { status: 400, headers: corsHeaders });
      }

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      const id = crypto.randomUUID();
      const snapshotStr = typeof artist_snapshot === 'string' ? artist_snapshot : JSON.stringify(artist_snapshot);

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status, latest_update_at)
         VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`
      ).bind(id, bulletinId, currentUserId, snapshotStr).run();

      return new Response(JSON.stringify({ success: true, id, message: '意向已投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async declineInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { decline_reason } = body;
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'declined', decline_reason = ?, latest_update_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status != 'declined'`
      ).bind(decline_reason, inquiryId).run();

      if (result.meta.changes === 0) return new Response(JSON.stringify({ success: false, message: '無法更新狀態' }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, message: '已婉拒該投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getClientInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT 
          b.id as bulletin_id, b.content as bulletin_content, b.category, b.status as bulletin_status,
          i.id as inquiry_id, i.artist_id, i.artist_snapshot, i.status as inquiry_status, i.client_response,
          ap.question_template,
          c.id as commission_id,
          u.display_name as artist_name, u.avatar_url as artist_avatar, u.public_id as artist_public_id,
          i.latest_update_at, i.last_read_at_client
        FROM Bulletins b
        JOIN BulletinInquiries i ON b.id = i.bulletin_id
        LEFT JOIN ArtistProfiles ap ON i.artist_id = ap.user_id 
        LEFT JOIN Commissions c ON (i.artist_id = c.artist_id AND b.client_id = c.client_id AND i.status = 'accepted')
        LEFT JOIN Users u ON i.artist_id = u.id
        WHERE b.client_id = ?
        ORDER BY i.created_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getArtistInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT 
          i.id as inquiry_id, i.status as inquiry_status, i.artist_snapshot, i.client_response, i.decline_reason,
          b.id as bulletin_id, b.content as bulletin_content, b.budget_range, b.category, b.status as bulletin_status,
          i.latest_update_at, i.last_read_at_artist
        FROM BulletinInquiries i
        JOIN Bulletins b ON i.bulletin_id = b.id
        WHERE i.artist_id = ?
        ORDER BY i.created_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async submitResponse(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { client_response } = body;
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'submitted', client_response = ?, latest_update_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pending'`
      ).bind(client_response, inquiryId).run();
      if (result.meta.changes === 0) return new Response(JSON.stringify({ success: false, message: '更新失敗' }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async acceptInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content, b.client_id FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ? AND i.artist_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry) return new Response(JSON.stringify({ success: false, message: '找不到紀錄' }), { status: 404, headers: corsHeaders });

      const commissionId = crypto.randomUUID();
      await env.commission_db.prepare(`INSERT INTO Commissions (id, artist_id, client_id, project_name, status, total_price) VALUES (?, ?, ?, ?, 'discussing', 0)`).bind(commissionId, currentUserId, inquiry.client_id, inquiry.content.substring(0, 50)).run();
      await env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'accepted', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};