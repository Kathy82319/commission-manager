// worker/controllers/calendarController.ts
import type { Env } from "../shared/types";

export const calendarController = {
  // 取得該繪師的所有行程
  async getEvents(userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const { results } = await env.commission_db.prepare(
        `SELECT * FROM calendar_events WHERE artist_id = ? ORDER BY start_date ASC`
      ).bind(userId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 建立新行程
  async createEvent(request: any, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const body: any = await request.json();
      const eventId = `ce-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // 基本欄位驗證
      if (!body.title || !body.start_date || !body.end_date) {
        return new Response(JSON.stringify({ success: false, error: "標題與日期區間為必填欄位" }), { status: 400, headers: corsHeaders });
      }

      await env.commission_db.prepare(
        `INSERT INTO calendar_events (
          id, artist_id, title, start_date, end_date, color_hex, linked_commission_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        eventId,
        userId,
        body.title,
        body.start_date,
        body.end_date,
        body.color_hex || '#4A7294', // 預設給個顏色
        body.linked_commission_id || null
      ).run();

      return new Response(JSON.stringify({ success: true, data: { id: eventId } }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 更新行程
  async updateEvent(request: any, eventId: string, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      const body: any = await request.json();

      if (!body.title || !body.start_date || !body.end_date) {
        return new Response(JSON.stringify({ success: false, error: "標題與日期區間為必填欄位" }), { status: 400, headers: corsHeaders });
      }

      await env.commission_db.prepare(
        `UPDATE calendar_events SET
          title = ?, start_date = ?, end_date = ?, color_hex = ?, linked_commission_id = ?, updated_at = datetime('now')
         WHERE id = ? AND artist_id = ?`
      ).bind(
        body.title,
        body.start_date,
        body.end_date,
        body.color_hex || '#4A7294',
        body.linked_commission_id || null,
        eventId,
        userId
      ).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 刪除行程
  async deleteEvent(eventId: string, userId: string, env: Env, corsHeaders: any): Promise<any> {
    try {
      await env.commission_db.prepare(
        `DELETE FROM calendar_events WHERE id = ? AND artist_id = ?`
      ).bind(eventId, userId).run();

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
  }
};