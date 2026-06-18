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

  async submit(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
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

    if (env.LINE_BOT_TOKEN && env.LINE_ADMIN_USER_ID) {
      const typeLabels: Record<string, string> = { bug: '🐛 回報問題', suggestion: '💡 功能建議', other: '💬 其他意見' };
      const preview = message.trim().slice(0, 120) + (message.trim().length > 120 ? '…' : '');
      const notifText = `📬 Arti 收到新意見回饋\n類型：${typeLabels[type] ?? type}\n內容：${preview}${contact ? `\n聯絡：${contact.trim()}` : ''}`;
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.LINE_BOT_TOKEN}` },
        body: JSON.stringify({ to: env.LINE_ADMIN_USER_ID, messages: [{ type: 'text', text: notifText }] }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), { status: 201, headers: corsHeaders });
  },

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
