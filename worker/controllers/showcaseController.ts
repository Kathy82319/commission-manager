// worker/controllers/showcaseController.ts
import { Env } from "../shared/types";

export const showcaseController = {

  async getPublicList(identifier: string, env: Env, headers: any) {

    const user = await env.commission_db
      .prepare("SELECT id FROM Users WHERE id = ? OR public_id = ?")
      .bind(identifier, identifier)
      .first<{ id: string }>();
    
    if (!user) {
      return new Response(JSON.stringify({ success: true, data: [] }), { headers });
    }

    const { results } = await env.commission_db
      .prepare("SELECT * FROM ShowcaseItems WHERE artist_id = ? AND is_active = 1 ORDER BY sort_order ASC, created_at DESC")
      .bind(user.id)
      .all();

    return new Response(JSON.stringify({ success: true, data: results }), { headers });
  },


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