import { Env } from "../shared/types";
// 🌟 引入安全過濾器以防禦 Payload 攻擊
import { sanitizeAndLimit, limitRichText } from "../utils/security";

export const showcaseController = {
  async getPublicList(identifier: string, env: Env, headers: any) {
    const user = await env.commission_db
      .prepare("SELECT id, plan_type FROM Users WHERE id = ? OR public_id = ?")
      .bind(identifier, identifier)
      .first<{ id: string, plan_type: string }>();
    
    if (!user) {
      return new Response(JSON.stringify({ success: true, data: [] }), { headers });
    }

    let query = "SELECT * FROM ShowcaseItems WHERE artist_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at DESC";
    if (user.plan_type === 'free') {
      query += " LIMIT 6";
    }

    const { results } = await env.commission_db
      .prepare(query)
      .bind(user.id)
      .all();

    return new Response(JSON.stringify({ success: true, data: results }), { headers });
  },

  async getMyItems(userId: string, env: Env, headers: any) {
    const { results } = await env.commission_db
      .prepare("SELECT * FROM ShowcaseItems WHERE artist_id = ? ORDER BY sort_order ASC, created_at DESC")
      .bind(userId)
      .all();
    return new Response(JSON.stringify({ success: true, data: results }), { headers });
  },

  async create(request: Request, userId: string, env: Env, headers: any) {
    const user = await env.commission_db
      .prepare("SELECT plan_type FROM Users WHERE id = ?")
      .bind(userId)
      .first<{ plan_type: string }>();

    const body: any = await request.json();
    const id = `sc-${Date.now()}`;
    
    // 🌟 防護實作：限制 Payload 長度與基本清理，防止資料庫被惡意撐爆
    const title = sanitizeAndLimit(body.title, 100);
    const coverUrl = sanitizeAndLimit(body.cover_url, 500);
    const priceInfo = sanitizeAndLimit(body.price_info, 100);
    const tagsStr = sanitizeAndLimit(JSON.stringify(body.tags || []), 500);
    const description = limitRichText(body.description, 20000);
    const tosContent = limitRichText(body.tos_content || '', 20000);
    
    const rawFormSchema = body.form_schema ? (typeof body.form_schema === 'string' ? body.form_schema : JSON.stringify(body.form_schema)) : '[]';
    const formSchemaStr = sanitizeAndLimit(rawFormSchema, 20000);

    const allowGuest = body.allow_guest ? 1 : 0;
    const maxOrders = body.max_orders ? Number(body.max_orders) : 0;
    const showQuota = body.show_quota !== undefined ? Number(body.show_quota) : 1;
    const currentOrdersCount = 0; 

    // 🌟 防護實作：修正 Race Condition (條件寫入)
    // 將檢查與寫入合併為單一原子操作 (Atomic Operation)
    if (user?.plan_type === 'free') {
      const insertResult = await env.commission_db
        .prepare(`
          INSERT INTO ShowcaseItems 
          (id, artist_id, title, cover_url, price_info, tags, description, form_schema, allow_guest, max_orders, show_quota, tos_content, current_orders_count) 
          SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          WHERE (SELECT COUNT(*) FROM ShowcaseItems WHERE artist_id = ?) < 6
        `)
        .bind(
          id, userId, title, coverUrl, priceInfo, tagsStr, 
          description, formSchemaStr, allowGuest, maxOrders, showQuota, tosContent, currentOrdersCount,
          userId // WHERE 條件的參數
        )
        .run();
        
      // 如果 changes 為 0，代表 WHERE 條件沒過 (已達 6 筆上限)
      if (insertResult.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, error: "免費版本已達 6 筆上限" }), { status: 403, headers });
      }
    } else {
      // 付費用戶無限制或另有配額規則
      await env.commission_db
        .prepare(`
          INSERT INTO ShowcaseItems 
          (id, artist_id, title, cover_url, price_info, tags, description, form_schema, allow_guest, max_orders, show_quota, tos_content, current_orders_count) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          id, userId, title, coverUrl, priceInfo, tagsStr, 
          description, formSchemaStr, allowGuest, maxOrders, showQuota, tosContent, currentOrdersCount
        )
        .run();
    }

    return new Response(JSON.stringify({ success: true, id }), { headers });
  },

  async update(request: Request, itemId: string, userId: string, env: Env, headers: any) {
    const body: any = await request.json();
    
    // 🌟 防護實作：限制 Payload 長度與清理
    const title = sanitizeAndLimit(body.title, 100);
    const coverUrl = sanitizeAndLimit(body.cover_url, 500);
    const priceInfo = sanitizeAndLimit(body.price_info, 100);
    const tagsStr = sanitizeAndLimit(JSON.stringify(body.tags || []), 500);
    const description = limitRichText(body.description, 20000);
    const tosContent = limitRichText(body.tos_content || '', 20000);
    
    const rawFormSchema = body.form_schema ? (typeof body.form_schema === 'string' ? body.form_schema : JSON.stringify(body.form_schema)) : '[]';
    const formSchemaStr = sanitizeAndLimit(rawFormSchema, 20000);

    const allowGuest = body.allow_guest ? 1 : 0;
    const maxOrders = body.max_orders ? Number(body.max_orders) : 0;
    const showQuota = body.show_quota !== undefined ? Number(body.show_quota) : 1;
    const isActive = body.is_active ? 1 : 0;

    await env.commission_db
      .prepare(`
        UPDATE ShowcaseItems SET 
          title = ?, cover_url = ?, price_info = ?, tags = ?, description = ?, is_active = ?, form_schema = ?,
          allow_guest = ?, max_orders = ?, show_quota = ?, tos_content = ?
        WHERE id = ? AND artist_id = ?
      `)
      .bind(
        title, coverUrl, priceInfo, tagsStr, description, isActive, formSchemaStr,
        allowGuest, maxOrders, showQuota, tosContent,
        itemId, userId
      )
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  },

  async delete(itemId: string, userId: string, env: Env, headers: any) {
    await env.commission_db
      .prepare("DELETE FROM ShowcaseItems WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  },

  // Phase 2 擴充：一鍵重置歷史訂單數 API 邏輯
  async resetOrdersCount(itemId: string, userId: string, env: Env, headers: any) {
    await env.commission_db
      .prepare("UPDATE ShowcaseItems SET current_orders_count = 0 WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  }
};