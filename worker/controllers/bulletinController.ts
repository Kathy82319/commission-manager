// worker/controllers/bulletinController.ts
import type { Env } from "../shared/types";

export const bulletinController = {
  async getList(env: Env, corsHeaders: any) {
    try {
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

  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { content, budget_range, specs, ref_image_key, category } = body;
      const id = crypto.randomUUID();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, content, budget_range, specs, ref_image_key, category, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, currentUserId, content, budget_range, specs, 
        ref_image_key || null, category || 'request', expiresAt.toISOString()
      ).run();

      return new Response(JSON.stringify({ success: true, id, message: '許願已發布' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

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

      // 🌟 修正重複打包問題：判斷如果已經是字串就不再 stringify
      const snapshotStr = typeof artist_snapshot === 'string' ? artist_snapshot : JSON.stringify(artist_snapshot);

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status)
         VALUES (?, ?, ?, ?, 'pending')`
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
         SET status = 'declined', decline_reason = ? 
         WHERE id = ? AND status != 'declined'`
      ).bind(decline_reason, inquiryId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '無法更新狀態或已婉拒' }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, message: '已婉拒該投遞並關閉對話權限' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getClientInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 加入 Users (u) 關聯，抓取繪師暱稱與頭像
      const { results } = await env.commission_db.prepare(`
        SELECT 
          b.id as bulletin_id, b.content as bulletin_content, b.category,
          i.id as inquiry_id, i.artist_id, i.artist_snapshot, i.status as inquiry_status, i.client_response,
          ap.question_template,
          c.id as commission_id,
          u.display_name as artist_name, u.avatar_url as artist_avatar, u.public_id as artist_public_id
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
          b.id as bulletin_id, b.content as bulletin_content, b.budget_range, b.category
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

      if (!client_response || client_response.trim() === '') {
        return new Response(JSON.stringify({ success: false, message: '回覆內容不能為空' }), { status: 400, headers: corsHeaders });
      }

      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries 
         SET status = 'submitted', client_response = ? 
         WHERE id = ? AND status = 'pending'`
      ).bind(client_response, inquiryId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '無法更新狀態，可能該筆投遞已不在待處理狀態' }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, message: '已成功送出回覆' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async acceptInquiry(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content, b.budget_range, b.specs 
         FROM BulletinInquiries i 
         JOIN Bulletins b ON i.bulletin_id = b.id 
         WHERE i.id = ? AND i.artist_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry) {
        return new Response(JSON.stringify({ success: false, message: '找不到該筆投遞或權限不足' }), { status: 404, headers: corsHeaders });
      }

      const commissionId = crypto.randomUUID();
      
      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, artist_id, client_id, project_name, status, 
          total_price, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'discussing', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        commissionId, currentUserId, inquiry.client_id || 'unknown', inquiry.content.substring(0, 50), 0 
      ).run();

      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'accepted' WHERE id = ?`
      ).bind(inquiryId).run();

      return new Response(JSON.stringify({ 
        success: true, commission_id: commissionId, message: '已成功轉換為正式委託單' 
      }), { headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};