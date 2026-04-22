// worker/controllers/customerController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

export const customerController = {
  // 1. 取得客戶列表
  async getList(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const query = `
      SELECT 
        cr.*, 
        u.public_id,
        u.display_name as platform_name,
        (SELECT COUNT(*) FROM Commissions WHERE artist_id = cr.artist_id AND client_id = cr.client_user_id) as order_count
      FROM CustomerRecords cr
      LEFT JOIN Users u ON cr.client_user_id = u.id
      WHERE cr.artist_id = ?
      ORDER BY cr.created_at DESC
    `;
    
    try {
      const { results } = await env.commission_db.prepare(query).bind(currentUserId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 新增客戶紀錄 (支援 ID 搜尋與社群陣列)
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      
      await env.commission_db.prepare(`
        INSERT INTO CustomerRecords (id, artist_id, client_user_id, alias_name, custom_label, short_note, full_note, contact_methods)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, 
        currentUserId, 
        body.client_user_id || null, 
        sanitizeAndLimit(body.alias_name || "新客戶", 50), 
        body.custom_label || '一般', 
        sanitizeAndLimit(body.short_note || "", 100),
        sanitizeAndLimit(body.full_note || "", 5000),
        JSON.stringify(body.contact_methods || [])
      ).run();
      
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "新增失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 更新紀錄
  async update(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      const updates: string[] = [];
      const params: any[] = [];

      const fields: Record<string, number> = {
        alias_name: 50,
        custom_label: 20,
        short_note: 100,
        full_note: 5000
      };

      for (const [field, limit] of Object.entries(fields)) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(sanitizeAndLimit(body[field], limit));
        }
      }

      if (body.contact_methods) {
        updates.push("contact_methods = ?");
        params.push(JSON.stringify(body.contact_methods));
      }

      if (updates.length === 0) return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

      params.push(id, currentUserId);
      await env.commission_db.prepare(`UPDATE CustomerRecords SET ${updates.join(", ")} WHERE id = ? AND artist_id = ?`).bind(...params).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "更新失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 取得過往委託紀錄 (CRM 詳情分頁使用)
  async getHistory(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const record = await env.commission_db.prepare("SELECT client_user_id FROM CustomerRecords WHERE id = ? AND artist_id = ?")
        .bind(id, currentUserId).first<any>();
      
      if (!record || !record.client_user_id) {
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: corsHeaders });
      }

      const { results } = await env.commission_db.prepare(`
        SELECT id, project_name, total_price, order_date, status
        FROM Commissions
        WHERE artist_id = ? AND client_id = ?
        ORDER BY order_date DESC
      `).bind(currentUserId, record.client_user_id).all();

      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 5. 刪除客戶紀錄
  async delete(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      await env.commission_db.prepare("DELETE FROM CustomerRecords WHERE id = ? AND artist_id = ?").bind(id, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};