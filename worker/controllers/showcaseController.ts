// worker/controllers/showcaseController.ts
import { Env } from "../shared/types";
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
    
    const title = sanitizeAndLimit(body.title, 100);
    
    // 【做法 A 優化】由於 cover_url 可能承載最多 5 張圖片的 JSON 字串 (如 ["url1", "url2"])，將長度限制放寬至 3000 字元以利完整儲存
    const coverUrl = sanitizeAndLimit(body.cover_url || JSON.stringify(body.images || []), 3000);
    
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
          userId 
        )
        .run();
        
      if (insertResult.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, error: "免費版本已達 6 筆上限" }), { status: 403, headers });
      }
    } else {
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
    const existing = await env.commission_db.prepare("SELECT artist_id FROM ShowcaseItems WHERE id = ?").bind(itemId).first<{ artist_id: string }>();
    
    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "找不到該項目" }), { status: 404, headers });
    }

    if (existing.artist_id !== userId) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🚨【異常監測 - 惡意越權操作 Showcase Update】User: ${userId} 嘗試更新 Item: ${itemId} (擁有者: ${existing.artist_id})`)
        .run();
      return new Response(JSON.stringify({ success: false, error: "無權限操作此項目" }), { status: 403, headers });
    }

    const body: any = await request.json();
    
    const title = sanitizeAndLimit(body.title, 100);
    
    // 【做法 A 優化】更新時同步將 cover_url 放寬至 3000 字元，相容 5 張圖之 JSON 字串格式
    const coverUrl = sanitizeAndLimit(body.cover_url || JSON.stringify(body.images || []), 3000);
    
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
    const existing = await env.commission_db.prepare("SELECT artist_id FROM ShowcaseItems WHERE id = ?").bind(itemId).first<{ artist_id: string }>();
    
    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "找不到該項目" }), { status: 404, headers });
    }

    if (existing.artist_id !== userId) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🚨【異常監測 - 惡意越權刪除 Showcase】User: ${userId} 嘗試刪除 Item: ${itemId} (擁有者: ${existing.artist_id})`)
        .run();
      return new Response(JSON.stringify({ success: false, error: "無權限操作此項目" }), { status: 403, headers });
    }

    await env.commission_db
      .prepare("DELETE FROM ShowcaseItems WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  },

  async resetOrdersCount(itemId: string, userId: string, env: Env, headers: any) {
    const existing = await env.commission_db.prepare("SELECT artist_id FROM ShowcaseItems WHERE id = ?").bind(itemId).first<{ artist_id: string }>();
    
    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: "找不到該項目" }), { status: 404, headers });
    }

    if (existing.artist_id !== userId) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🚨【異常監測 - 惡意越權重置滿單 Showcase】User: ${userId} 嘗試重置 Item: ${itemId} (擁有者: ${existing.artist_id})`)
        .run();
      return new Response(JSON.stringify({ success: false, error: "無權限操作此項目" }), { status: 403, headers });
    }

    await env.commission_db
      .prepare("UPDATE ShowcaseItems SET current_orders_count = 0 WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  }
};