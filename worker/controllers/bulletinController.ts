import type { Env } from "../shared/types";

export const bulletinController = {
  // 1. 取得許願池列表 (公開)
  async getList(env: Env, corsHeaders: any) {
    try {
      // 🌟 巧思：用 GROUP_CONCAT 把投遞過這張單的繪師 ID 串起來，讓前端可以輕鬆判斷
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
      
      // 設定 3 天後過期
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.commission_db.prepare(
        `INSERT INTO Bulletins (id, client_id, content, budget_range, specs, ref_image_key, category, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id, 
        currentUserId, 
        content, 
        budget_range, 
        specs, 
        ref_image_key || null, 
        category || 'request', 
        expiresAt.toISOString()
      ).run();

      return new Response(JSON.stringify({ success: true, id, message: '許願已發布' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 繪師投遞意向 (需登入，為繪師)
  async inquire(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 後端絕對防護：檢查該繪師是否已經對這張單投遞過
      const existing = await env.commission_db.prepare(
        `SELECT id FROM BulletinInquiries WHERE bulletin_id = ? AND artist_id = ?`
      ).bind(bulletinId, currentUserId).first();

      if (existing) {
        return new Response(JSON.stringify({ success: false, message: '您已經投遞過此許願單，請勿重複投遞' }), { status: 400, headers: corsHeaders });
      }

      const body = await request.json() as any;
      const { artist_snapshot } = body;
      const id = crypto.randomUUID();

      await env.commission_db.prepare(
        `INSERT INTO BulletinInquiries (id, bulletin_id, artist_id, artist_snapshot, status)
         VALUES (?, ?, ?, ?, 'pending')`
      ).bind(id, bulletinId, currentUserId, JSON.stringify(artist_snapshot)).run();

      return new Response(JSON.stringify({ success: true, id, message: '意向已投遞' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 案主/系統婉拒意向
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

  // 5. 案主：查看收到的投遞 (Inbox)
  async getClientInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT 
          b.id as bulletin_id, b.content as bulletin_content, b.category,
          i.id as inquiry_id, i.artist_id, i.artist_snapshot, i.status as inquiry_status, i.client_response,
          ap.question_template,
          c.id as commission_id
        FROM Bulletins b
        JOIN BulletinInquiries i ON b.id = i.bulletin_id
        LEFT JOIN ArtistProfiles ap ON i.artist_id = ap.user_id 
        LEFT JOIN Commissions c ON (i.artist_id = c.artist_id AND b.client_id = c.client_id AND i.status = 'accepted')
        WHERE b.client_id = ?
        ORDER BY i.created_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 6. 繪師：查看我投遞過的意向 (Artist Inbox)
  async getArtistInbox(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 順手補上 b.id as bulletin_id，方便後續擴充功能
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

  // 7. 案主：送出邀請詳談 (回填提問)
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

  // 8. 繪師：接受並正式成單
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
        commissionId,
        currentUserId,
        inquiry.client_id || 'unknown',
        inquiry.content.substring(0, 50),
        0 
      ).run();

      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'accepted' WHERE id = ?`
      ).bind(inquiryId).run();

      return new Response(JSON.stringify({ 
        success: true, 
        commission_id: commissionId, 
        message: '已成功轉換為正式委託單' 
      }), { headers: corsHeaders });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};