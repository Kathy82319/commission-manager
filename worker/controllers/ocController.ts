// worker/controllers/ocController.ts
import type { Env } from "../shared/types";

export const ocController = {
  // 取得委託人的所有 OC 卡片 (後台專用，需登入驗證)
  async getList(userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const { results } = await env.commission_db.prepare(
        `SELECT * FROM oc_cards WHERE user_id = ? ORDER BY updated_at DESC`
      ).bind(userId).all();

      const data = results.map((row: any) => ({
        ...row,
        is_public: Boolean(row.is_public),
        hair_colors: JSON.parse(row.hair_colors || '[]'),
        eyes_colors: JSON.parse(row.eyes_colors || '[]'),
        clothing_colors: JSON.parse(row.clothing_colors || '[]'),
        keywords: JSON.parse(row.keywords || '[]'),
        images: JSON.parse(row.images || '[]')
      }));

      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 🌟 確保這段程式碼有完整寫入：取得指定用戶的「公開」OC 卡片 (前台個人頁專用，不需登入驗證)
  async getPublicList(userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const { results } = await env.commission_db.prepare(
        `SELECT * FROM oc_cards WHERE user_id = ? AND is_public = 1 ORDER BY updated_at DESC`
      ).bind(userId).all();

      const data = results.map((row: any) => ({
        ...row,
        is_public: true,
        hair_colors: JSON.parse(row.hair_colors || '[]'),
        eyes_colors: JSON.parse(row.eyes_colors || '[]'),
        clothing_colors: JSON.parse(row.clothing_colors || '[]'),
        keywords: JSON.parse(row.keywords || '[]'),
        images: JSON.parse(row.images || '[]')
      }));

      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 建立新的 OC 卡片
  async create(request: any, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const body: any = await request.json();
      const id = body.id || `oc-${Date.now()}`;
      const isPublicInt = body.is_public ? 1 : 0;

      await env.commission_db.prepare(
        `INSERT INTO oc_cards (
          id, user_id, name, gender, body_type, hair_desc, hair_colors,
          eyes_desc, eyes_colors, clothing_desc, clothing_colors,
          traits, must_have, donts, keywords, short_intro,
          personality, background, other_notes, images, created_at, updated_at,
          is_public
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`
      ).bind(
        id, userId, body.name || '', body.gender || '', body.body_type || '',
        body.hair_desc || '', JSON.stringify(body.hair_colors || []),
        body.eyes_desc || '', JSON.stringify(body.eyes_colors || []),
        body.clothing_desc || '', JSON.stringify(body.clothing_colors || []),
        body.traits || '', body.must_have || '', body.donts || '',
        JSON.stringify(body.keywords || []), body.short_intro || '',
        body.personality || '', body.background || '', body.other_notes || '',
        JSON.stringify(body.images || []),
        isPublicInt
      ).run();

      return new Response(JSON.stringify({ success: true, data: { id } }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 自動儲存更新
  async update(request: any, ocId: string, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const body: any = await request.json();
      const isPublicInt = body.is_public ? 1 : 0;

      await env.commission_db.prepare(
        `UPDATE oc_cards SET
          name = ?, gender = ?, body_type = ?, hair_desc = ?, hair_colors = ?,
          eyes_desc = ?, eyes_colors = ?, clothing_desc = ?, clothing_colors = ?,
          traits = ?, must_have = ?, donts = ?, keywords = ?, short_intro = ?,
          personality = ?, background = ?, other_notes = ?, images = ?, updated_at = datetime('now'),
          is_public = ?
         WHERE id = ? AND user_id = ?`
      ).bind(
        body.name || '', body.gender || '', body.body_type || '',
        body.hair_desc || '', JSON.stringify(body.hair_colors || []),
        body.eyes_desc || '', JSON.stringify(body.eyes_colors || []),
        body.clothing_desc || '', JSON.stringify(body.clothing_colors || []),
        body.traits || '', body.must_have || '', body.donts || '',
        JSON.stringify(body.keywords || []), body.short_intro || '',
        body.personality || '', body.background || '', body.other_notes || '',
        JSON.stringify(body.images || []),
        isPublicInt,
        ocId, userId
      ).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 取得單一詳情
  async getDetail(ocId: string, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const data = await env.commission_db.prepare(`SELECT * FROM oc_cards WHERE id = ? AND user_id = ?`).bind(ocId, userId).first();
      if (!data) return new Response(JSON.stringify({ success: false, error: "Not Found" }), { status: 404, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 刪除 OC 卡片
  async delete(ocId: string, userId: string, env: Env, credentials: any): Promise<any> {
    try {
      await env.commission_db.prepare(`DELETE FROM oc_cards WHERE id = ? AND user_id = ?`).bind(ocId, userId).run();
      return new Response(JSON.stringify({ success: true }), { headers: credentials });
    } catch(e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: credentials });
    }
  }
};