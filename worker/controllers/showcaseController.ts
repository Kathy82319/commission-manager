// worker/controllers/showcaseController.ts
import { Env } from "../shared/types";

export const showcaseController = {
  // 獲取清單 (公開)
  async getPublicList(artistId: string, env: Env, headers: any) {
    const { results } = await env.commission_db
      .prepare("SELECT * FROM ShowcaseItems WHERE artist_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at DESC")
      .bind(artistId)
      .all();
    return new Response(JSON.stringify({ success: true, data: results }), { headers });
  },

  // 繪師管理自己的項目
  async getMyItems(userId: string, env: Env, headers: any) {
    const { results } = await env.commission_db
      .prepare("SELECT * FROM ShowcaseItems WHERE artist_id = ? ORDER BY sort_order ASC")
      .bind(userId)
      .all();
    return new Response(JSON.stringify({ success: true, data: results }), { headers });
  },

  async create(request: Request, userId: string, env: Env, headers: any) {
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