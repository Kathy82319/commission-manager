// worker/controllers/announcementController.ts
import type { Env } from "../shared/types";

type AnnouncementType = 'update' | 'event' | 'other';

const VALID_TYPES: AnnouncementType[] = ['update', 'event', 'other'];

async function checkAdmin(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response | null> {
  const { results } = await env.commission_db.prepare(
    "SELECT role FROM Users WHERE id = ?"
  ).bind(currentUserId).all();
  if (results.length === 0 || results[0].role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: "權限不足，僅限管理員存取" }), { status: 403, headers: corsHeaders });
  }
  return null;
}

export const announcementController = {

  // GET /api/announcements — 公開，不需登入
  async getList(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(50, rawLimit);
    const type = url.searchParams.get('type') || '';

    let query: string;
    let params: any[];

    if (type && VALID_TYPES.includes(type as AnnouncementType)) {
      query = `SELECT id, type, title, content, published_at
               FROM announcements
               WHERE type = ?
               ORDER BY published_at DESC
               LIMIT ?`;
      params = [type, limit];
    } else {
      query = `SELECT id, type, title, content, published_at
               FROM announcements
               ORDER BY published_at DESC
               LIMIT ?`;
      params = [limit];
    }

    const { results } = await env.commission_db.prepare(query).bind(...params).all();
    return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
  },

  // POST /api/admin/announcements — 管理員建立公告
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const body = await request.json() as { type?: string; title?: string; content?: string };
    const { type, title, content } = body;

    if (!type || !VALID_TYPES.includes(type as AnnouncementType)) {
      return new Response(JSON.stringify({ success: false, error: "type 必須是 update / event / other" }), { status: 400, headers: corsHeaders });
    }
    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "標題不能為空" }), { status: 400, headers: corsHeaders });
    }
    if (!content || content.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "內文不能為空" }), { status: 400, headers: corsHeaders });
    }

    const result = await env.commission_db.prepare(
      `INSERT INTO announcements (type, title, content) VALUES (?, ?, ?)`
    ).bind(type.trim(), title.trim(), content.trim()).run();

    return new Response(JSON.stringify({ success: true, id: result.meta?.last_row_id }), { status: 201, headers: corsHeaders });
  },

  // DELETE /api/admin/announcements/:id — 管理員刪除公告
  async delete(announcementId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(announcementId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的公告 ID" }), { status: 400, headers: corsHeaders });
    }

    const { results } = await env.commission_db.prepare(
      "SELECT id FROM announcements WHERE id = ?"
    ).bind(announcementId).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "找不到此公告" }), { status: 404, headers: corsHeaders });
    }

    await env.commission_db.prepare("DELETE FROM announcements WHERE id = ?").bind(announcementId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },
};
