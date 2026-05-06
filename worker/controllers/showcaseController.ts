// worker/controllers/showcaseController.ts
import type { Env } from '../shared/types';

export const showcaseController = {
  // 1. 取得後台列表
  async getMyItems(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 修正：放棄嚴苛的 JSON 函數，改用字串 LIKE 比對，絕對不會崩潰！
      const { results } = await env.commission_db.prepare(`
        SELECT s.*, 
          (SELECT COUNT(*) FROM Commissions c 
           WHERE c.artist_id = s.artist_id 
             AND c.origin_source LIKE '%"showcase_id":"' || s.id || '"%'
             AND c.status NOT IN ('cancelled', 'declined')
          ) as current_orders_count
        FROM ShowcaseItems s WHERE artist_id = ? ORDER BY created_at DESC
      `).bind(currentUserId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 取得前台列表
  async getPublicList(artistId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 修正：同上，改用安全的字串比對
      const { results } = await env.commission_db.prepare(`
        SELECT s.*,
          (SELECT COUNT(*) FROM Commissions c 
           WHERE c.artist_id = s.artist_id 
             AND c.origin_source LIKE '%"showcase_id":"' || s.id || '"%'
             AND c.status NOT IN ('cancelled', 'declined')
          ) as current_orders_count
        FROM ShowcaseItems s WHERE artist_id = ? AND is_active = 1 ORDER BY created_at DESC
      `).bind(artistId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 新增
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const id = `showcase-${Date.now()}`;
      await env.commission_db.prepare(`
        INSERT INTO ShowcaseItems (id, artist_id, title, cover_url, price_info, tags, description, form_schema, is_active, allow_guest, max_orders, show_quota, tos_content)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, currentUserId, body.title, body.cover_url, body.price_info, body.tags || '[]', body.description || '', body.form_schema || '[]', 
        body.is_active ?? 1, body.allow_guest ?? 0, body.max_orders ?? 0, body.show_quota ?? 1, body.tos_content || ''
      ).run();
      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 更新
  async update(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      await env.commission_db.prepare(`
        UPDATE ShowcaseItems 
        SET title=?, cover_url=?, price_info=?, tags=?, description=?, form_schema=?, is_active=?, allow_guest=?, max_orders=?, show_quota=?, tos_content=?
        WHERE id=? AND artist_id=?
      `).bind(
        body.title, body.cover_url, body.price_info, body.tags || '[]', body.description || '', body.form_schema || '[]', 
        body.is_active ?? 1, body.allow_guest ?? 0, body.max_orders ?? 0, body.show_quota ?? 1, body.tos_content || '', 
        targetId, currentUserId
      ).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 5. 刪除
  async delete(targetId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 修正：先解除那些已經送出申請單的關聯 (設為 NULL)，避免觸發 Foreign Key 報錯
      await env.commission_db.prepare(`UPDATE DirectInquiries SET showcase_id = NULL WHERE showcase_id = ?`).bind(targetId).run();
      
      // 接著就能安全刪除商品卡片了
      await env.commission_db.prepare(`DELETE FROM ShowcaseItems WHERE id=? AND artist_id=?`).bind(targetId, currentUserId).run();
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};