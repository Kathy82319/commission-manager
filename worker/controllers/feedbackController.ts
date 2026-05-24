// worker/controllers/feedbackController.ts
import type { Env } from "../shared/types";

type FeedbackType = 'bug' | 'suggestion' | 'other';
const VALID_TYPES: FeedbackType[] = ['bug', 'suggestion', 'other'];

async function checkAdmin(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response | null> {
  const { results } = await env.commission_db.prepare(
    "SELECT role FROM Users WHERE id = ?"
  ).bind(currentUserId).all();
  if (results.length === 0 || results[0].role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
  }
  return null;
}

export const feedbackController = {

  // POST /api/feedback — 公開，不需登入
  async submit(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    // CF-Connecting-IP 由 Cloudflare 邊緣網路注入，客戶端無法偽造
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    const { results: recentRows } = await env.commission_db.prepare(
      `SELECT COUNT(*) as count FROM feedback WHERE submitter_ip = ? AND created_at > datetime('now', '-1 minute')`
    ).bind(clientIp).all();
    if (((recentRows[0] as any).count as number) >= 5) {
      return new Response(JSON.stringify({ success: false, error: "請求過於頻繁，請稍後再試" }), { status: 429, headers: corsHeaders });
    }

    let body: { type?: string; message?: string; contact?: string };
    try {
      body = await request.json() as { type?: string; message?: string; contact?: string };
    } catch {
      return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders });
    }
    const { type, message, contact = '' } = body;

    if (!type || !VALID_TYPES.includes(type as FeedbackType)) {
      return new Response(JSON.stringify({ success: false, error: "type 必須是 bug / suggestion / other" }), { status: 400, headers: corsHeaders });
    }
    if (!message || message.trim().length < 5) {
      return new Response(JSON.stringify({ success: false, error: "內容至少需要 5 個字" }), { status: 400, headers: corsHeaders });
    }
    if (message.trim().length > 2000) {
      return new Response(JSON.stringify({ success: false, error: "內容不能超過 2000 字" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare(
      `INSERT INTO feedback (type, message, contact, submitter_ip) VALUES (?, ?, ?, ?)`
    ).bind(type, message.trim(), (contact || '').trim().slice(0, 200), clientIp).run();

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: corsHeaders });
  },

  // GET /api/admin/feedback — 管理員查看
  async getList(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const onlyUnread = url.searchParams.get('unread') === '1';

    const query = onlyUnread
      ? `SELECT * FROM feedback WHERE is_read = 0 ORDER BY created_at DESC`
      : `SELECT * FROM feedback ORDER BY created_at DESC`;

    const { results } = await env.commission_db.prepare(query).all();
    return new Response(JSON.stringify(results), { status: 200, headers: corsHeaders });
  },

  // PATCH /api/admin/feedback/:id/read — 標記已讀
  async markRead(feedbackId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(feedbackId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare(
      "UPDATE feedback SET is_read = 1 WHERE id = ?"
    ).bind(numId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },
};
