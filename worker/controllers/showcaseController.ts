// worker/controllers/showcaseController.ts
import type { Env } from '../shared/types';

export const showcaseController = {
  // 1. 取得後台列表 (包含計算單量)
  async getMyItems(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 改變策略：只撈取 is_active >= 0 的項目 (-1 代表已軟刪除)
      const { results: items } = await env.commission_db.prepare(`
        SELECT * FROM ShowcaseItems WHERE artist_id = ? AND is_active >= 0 ORDER BY created_at DESC
      `).bind(currentUserId).all();

      // 🌟 改變策略：單純撈取這個繪師的所有進行中訂單
      const { results: comms } = await env.commission_db.prepare(`
        SELECT origin_source FROM Commissions WHERE artist_id = ? AND status NOT IN ('cancelled', 'declined')
      `).bind(currentUserId).all();

      // 🌟 改變策略：用後端程式 (TypeScript) 來計算單量，絕對不會因為資料庫格式問題崩潰！
      const orderCounts: Record<string, number> = {};
      for (const c of comms) {
        if (!c.origin_source) continue;
        try {
          const os = typeof c.origin_source === 'string' ? JSON.parse(c.origin_source) : c.origin_source;
          if (os && os.showcase_id) {
            orderCounts[os.showcase_id] = (orderCounts[os.showcase_id] || 0) + 1;
          }
        } catch(e) {
          // 就算遇到舊的壞資料，也會被這裡安靜地忽略，不會報錯崩潰
        }
      }

      // 將算好的數字塞回卡片中
      const finalItems = items.map((item: any) => ({
        ...item,
        current_orders_count: orderCounts[item.id] || 0
      }));

      return new Response(JSON.stringify({ success: true, data: finalItems }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 取得前台列表
  async getPublicList(artistId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 前台只撈取 is_active = 1 (公開) 的項目
      const { results: items } = await env.commission_db.prepare(`
        SELECT * FROM ShowcaseItems WHERE artist_id = ? AND is_active = 1 ORDER BY created_at DESC
      `).bind(artistId).all();

      const { results: comms } = await env.commission_db.prepare(`
        SELECT origin_source FROM Commissions WHERE artist_id = ? AND status NOT IN ('cancelled', 'declined')
      `).bind(artistId).all();

      const orderCounts: Record<string, number> = {};
      for (const c of comms) {
        if (!c.origin_source) continue;
        try {
          const os = typeof c.origin_source === 'string' ? JSON.parse(c.origin_source) : c.origin_source;
          if (os && os.showcase_id) {
            orderCounts[os.showcase_id] = (orderCounts[os.showcase_id] || 0) + 1;
          }
        } catch(e) {}
      }

      const finalItems = items.map((item: any) => ({
        ...item,
        current_orders_count: orderCounts[item.id] || 0
      }));

      return new Response(JSON.stringify({ success: true, data: finalItems }), { headers: corsHeaders });
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

  // 5. 刪除 (🌟 終極解法：軟刪除)
  async delete(targetId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 我們不執行 DELETE，而是把 is_active 設為 -1 讓它在畫面上消失
      // 這樣既不會違反資料庫規則，歷史訂單也不會因為找不到關聯而報錯！
      await env.commission_db.prepare(`UPDATE ShowcaseItems SET is_active = -1 WHERE id=? AND artist_id=?`).bind(targetId, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};