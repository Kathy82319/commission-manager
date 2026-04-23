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

    // 資安強化：落實後端物理裁切
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
    // 🌟 修正點：統一排序邏輯為 sort_order ASC, created_at DESC
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
    await env.commission_db
      .prepare("INSERT INTO ShowcaseItems (id, artist_id, title, cover_url, price_info, tags, description) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, userId, body.title, body.cover_url, body.price_info, JSON.stringify(body.tags || []), body.description)
      .run();
    return new Response(JSON.stringify({ success: true, id }), { headers });
  },

  async update(request: Request, itemId: string, userId: string, env: Env, headers: any) {
    const body: any = await request.json();
    await env.commission_db
      .prepare("UPDATE ShowcaseItems SET title = ?, cover_url = ?, price_info = ?, tags = ?, description = ?, is_active = ? WHERE id = ? AND artist_id = ?")
      .bind(body.title, body.cover_url, body.price_info, JSON.stringify(body.tags || []), body.description, body.is_active, itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  },

  async delete(itemId: string, userId: string, env: Env, headers: any) {
    await env.commission_db
      .prepare("DELETE FROM ShowcaseItems WHERE id = ? AND artist_id = ?")
      .bind(itemId, userId)
      .run();
    return new Response(JSON.stringify({ success: true }), { headers });
  }
};