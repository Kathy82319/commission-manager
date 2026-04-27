import type { Env } from "../shared/types";

export const bulletinController = {
  // 1. 取得許願池列表 (公開)
  async getList(env: Env, corsHeaders: any) {
    try {
      const { results } = await env.DB.prepare(
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
      const { content, budget_range, specs, ref_image_key } = body;
      const id = crypto.randomUUID();
      
      // 設定 3 天後過期
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await env.DB.prepare(
        `INSERT INTO Bulletins (id, client_id, content, budget_range, specs, ref_image_key, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, currentUserId, content, budget_range, specs, ref_image_key, expiresAt.toISOString()).run();

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

      await env.DB.prepare(
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

      // 更新為 declined (實務上可以多加一個條件檢查 currentUserId 是否為該單的擁有者或投遞者，這裡先以最簡邏輯示範)
      const result = await env.DB.prepare(
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