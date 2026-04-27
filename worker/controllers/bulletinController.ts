import type { Env } from "../shared/types";

export const bulletinController = {
  // 1. 取得許願池列表 (公開)
  async getList(env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(
        `SELECT * FROM Bulletins 
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
  }
};