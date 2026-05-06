// worker/controllers/showcaseController.ts
import { Env } from "../shared/types";

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

    const { results: countRes } = await env.commission_db
      .prepare("SELECT COUNT(*) as total FROM ShowcaseItems WHERE artist_id = ?")
      .bind(userId)
      .all();

    const totalCount = (countRes[0]?.total as number) || 0;

    if (user?.plan_type === 'free' && totalCount >= 6) {
      return new Response(JSON.stringify({ success: false, error: "免費版本已達上限" }), { status: 403, headers });
    }

    const body: any = await request.json();
    const id = `sc-${Date.now()}`;
    
    // 🌟 確保 form_schema 被正確轉換為 JSON 字串存入
    const formSchemaStr = body.form_schema ? (typeof body.form_schema === 'string' ? body.form_schema : JSON.stringify(body.form_schema)) : '[]';

    await env.commission_db
      .prepare("INSERT INTO ShowcaseItems (id, artist_id, title, cover_url, price_info, tags, description, form_schema) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, userId, body.title, body.cover_url, body.price_info, JSON.stringify(body.tags || []), body.description, formSchemaStr)
      .run();
    return new Response(JSON.stringify({ success: true, id }), { headers });
  },

  async update(request: Request, itemId: string, userId: string, env: Env, headers: any) {
    const body: any = await request.json();
    
    // 🌟 確保 form_schema 被正確處理
    const formSchemaStr = body.form_schema ? (typeof body.form_schema === 'string' ? body.form_schema : JSON.stringify(body.form_schema)) : '[]';

    await env.commission_db
      .prepare("UPDATE ShowcaseItems SET title = ?, cover_url = ?, price_info = ?, tags = ?, description = ?, is_active = ?, form_schema = ? WHERE id = ? AND artist_id = ?")
      .bind(body.title, body.cover_url, body.price_info, JSON.stringify(body.tags || []), body.description, body.is_active, formSchemaStr, itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  },

  // ... (delete 保持原樣不變) ...
  async delete(itemId: string, userId: string, env: Env, headers: any) {
    await env.commission_db
      .prepare("DELETE FROM ShowcaseItems WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  }
};