// worker/controllers/guideController.ts
import type { Env } from "../shared/types";

async function checkAdmin(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response | null> {
  const { results } = await env.commission_db.prepare(
    "SELECT role FROM Users WHERE id = ?"
  ).bind(currentUserId).all();
  if (results.length === 0 || results[0].role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
  }
  return null;
}

interface RawRow {
  section_id: number;
  title: string;
  sort_order: number;
  step_id: number | null;
  image_url: string | null;
  caption: string | null;
  step_order: number | null;
}

function buildNested(rows: RawRow[]) {
  const map = new Map<number, { id: number; title: string; sort_order: number; steps: object[] }>();
  for (const row of rows) {
    if (!map.has(row.section_id)) {
      map.set(row.section_id, { id: row.section_id, title: row.title, sort_order: row.sort_order, steps: [] });
    }
    if (row.step_id !== null) {
      map.get(row.section_id)!.steps.push({
        id: row.step_id,
        image_url: row.image_url,
        caption: row.caption || '',
        step_order: row.step_order || 0,
      });
    }
  }
  return Array.from(map.values());
}

export const guideController = {

  async getPublic(env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results } = await env.commission_db.prepare(`
      SELECT gs.id as section_id, gs.title, gs.sort_order,
             gst.id as step_id, gst.image_url, gst.caption, gst.step_order
      FROM guide_sections gs
      LEFT JOIN guide_steps gst ON gst.section_id = gs.id
      ORDER BY gs.sort_order ASC, gs.id ASC, gst.step_order ASC, gst.id ASC
    `).all();
    return new Response(JSON.stringify(buildNested(results as unknown as RawRow[])), { status: 200, headers: corsHeaders });
  },

  async createSection(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    let body: { title?: string };
    try { body = await request.json() as { title?: string }; }
    catch { return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders }); }

    const { title } = body;
    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "標題不能為空" }), { status: 400, headers: corsHeaders });
    }
    if (title.trim().length > 100) {
      return new Response(JSON.stringify({ success: false, error: "標題不能超過 100 字" }), { status: 400, headers: corsHeaders });
    }

    const result = await env.commission_db.prepare(
      `INSERT INTO guide_sections (title) VALUES (?)`
    ).bind(title.trim()).run();
    return new Response(JSON.stringify({ success: true, id: result.meta?.last_row_id }), { status: 201, headers: corsHeaders });
  },

  async deleteSection(sectionId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(sectionId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare("DELETE FROM guide_steps WHERE section_id = ?").bind(numId).run();
    await env.commission_db.prepare("DELETE FROM guide_sections WHERE id = ?").bind(numId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async addStep(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    let body: { section_id?: unknown; image_url?: string; caption?: string };
    try { body = await request.json() as { section_id?: unknown; image_url?: string; caption?: string }; }
    catch { return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders }); }

    const sectionId = typeof body.section_id === 'number' ? body.section_id : parseInt(String(body.section_id), 10);
    if (isNaN(sectionId) || sectionId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 section_id" }), { status: 400, headers: corsHeaders });
    }

    const imageUrl = (body.image_url || '').trim();
    if (!imageUrl) {
      return new Response(JSON.stringify({ success: false, error: "圖片網址不能為空" }), { status: 400, headers: corsHeaders });
    }
    if (!imageUrl.startsWith('https://') && !imageUrl.startsWith('http://')) {
      return new Response(JSON.stringify({ success: false, error: "圖片網址必須以 https:// 開頭" }), { status: 400, headers: corsHeaders });
    }

    const { results: countRows } = await env.commission_db.prepare(
      "SELECT COUNT(*) as count FROM guide_steps WHERE section_id = ?"
    ).bind(sectionId).all();
    const nextOrder = ((countRows[0] as any).count as number) + 1;

    const result = await env.commission_db.prepare(
      `INSERT INTO guide_steps (section_id, image_url, caption, step_order) VALUES (?, ?, ?, ?)`
    ).bind(sectionId, imageUrl, (body.caption || '').trim().slice(0, 500), nextOrder).run();
    return new Response(JSON.stringify({ success: true, id: result.meta?.last_row_id }), { status: 201, headers: corsHeaders });
  },

  async deleteStep(stepId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(stepId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare("DELETE FROM guide_steps WHERE id = ?").bind(numId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async updateSection(request: Request, sectionId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(sectionId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    let body: { title?: string };
    try { body = await request.json() as { title?: string }; }
    catch { return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders }); }

    const { title } = body;
    if (!title || title.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "標題不能為空" }), { status: 400, headers: corsHeaders });
    }
    if (title.trim().length > 100) {
      return new Response(JSON.stringify({ success: false, error: "標題不能超過 100 字" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare("UPDATE guide_sections SET title = ? WHERE id = ?").bind(title.trim(), numId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async updateStep(request: Request, stepId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(stepId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    let body: { image_url?: string; caption?: string };
    try { body = await request.json() as { image_url?: string; caption?: string }; }
    catch { return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders }); }

    const imageUrl = (body.image_url || '').trim();
    const caption = (body.caption || '').trim().slice(0, 5000);

    if (imageUrl) {
      if (!imageUrl.startsWith('https://') && !imageUrl.startsWith('http://')) {
        return new Response(JSON.stringify({ success: false, error: "圖片網址格式錯誤" }), { status: 400, headers: corsHeaders });
      }
      await env.commission_db.prepare("UPDATE guide_steps SET image_url = ?, caption = ? WHERE id = ?").bind(imageUrl, caption, numId).run();
    } else {
      await env.commission_db.prepare("UPDATE guide_steps SET caption = ? WHERE id = ?").bind(caption, numId).run();
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async reorderStep(request: Request, stepId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const numId = parseInt(stepId, 10);
    if (isNaN(numId) || numId < 1) {
      return new Response(JSON.stringify({ success: false, error: "無效的 ID" }), { status: 400, headers: corsHeaders });
    }

    let body: { direction?: string };
    try { body = await request.json() as { direction?: string }; }
    catch { return new Response(JSON.stringify({ success: false, error: "請求格式錯誤" }), { status: 400, headers: corsHeaders }); }

    if (body.direction !== 'up' && body.direction !== 'down') {
      return new Response(JSON.stringify({ success: false, error: "direction 必須為 up 或 down" }), { status: 400, headers: corsHeaders });
    }

    const { results: stepRows } = await env.commission_db.prepare(
      "SELECT id, section_id, step_order FROM guide_steps WHERE id = ?"
    ).bind(numId).all() as { results: { id: number; section_id: number; step_order: number }[] };

    if (stepRows.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "步驟不存在" }), { status: 404, headers: corsHeaders });
    }

    const step = stepRows[0];
    const { results: allSteps } = await env.commission_db.prepare(
      "SELECT id, step_order FROM guide_steps WHERE section_id = ? ORDER BY step_order ASC, id ASC"
    ).bind(step.section_id).all() as { results: { id: number; step_order: number }[] };

    const idx = allSteps.findIndex(s => s.id === numId);
    const swapIdx = body.direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx >= 0 && swapIdx < allSteps.length) {
      const swapWith = allSteps[swapIdx];
      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE guide_steps SET step_order = ? WHERE id = ?").bind(swapWith.step_order, numId),
        env.commission_db.prepare("UPDATE guide_steps SET step_order = ? WHERE id = ?").bind(step.step_order, swapWith.id),
      ]);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },
};
