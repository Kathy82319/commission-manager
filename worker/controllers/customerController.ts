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

  // 2. 新增客戶紀錄
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

  // 3. 詳情讀取
  async getDetail(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const customer = await env.commission_db.prepare(`
        SELECT cr.*, u.display_name as platform_name, u.public_id
        FROM CustomerRecords cr
        LEFT JOIN Users u ON cr.client_user_id = u.id
        WHERE cr.id = ? AND cr.artist_id = ?
      `).bind(id, currentUserId).first<any>();

      if (!customer) {
        return new Response(JSON.stringify({ success: false, error: "找不到該客戶" }), { status: 404, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, data: customer }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取詳情失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 更新紀錄
  async update(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      const updates: string[] = [];
      const params: any[] = [];

      // 安全檢查：先讀取目前狀態
      const current = await env.commission_db.prepare("SELECT client_user_id FROM CustomerRecords WHERE id = ? AND artist_id = ?")
        .bind(id, currentUserId).first<any>();
      
      if (!current) return new Response(JSON.stringify({ success: false, error: "找不到紀錄" }), { status: 404, headers: corsHeaders });

      const fields: Record<string, number> = {
        alias_name: 50,
        custom_label: 20,
        short_note: 100,
        full_note: 5000
      };

      for (const [field, limit] of Object.entries(fields)) {
        if (body[field] !== undefined) {
          // 如果已經是系統用戶，且試圖更改 alias_name，我們允許更改，因為這是繪師的自訂稱呼
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

  // 5. 取得過往委託紀錄
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

  // 🌟 6. 刪除客戶紀錄 (加入防護邏輯)
  async delete(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      // 1. 檢查該紀錄是否綁定了系統用戶 (client_user_id 是否有值)
      const record = await env.commission_db.prepare("SELECT client_user_id FROM CustomerRecords WHERE id = ? AND artist_id = ?")
        .bind(id, currentUserId).first<any>();

      if (!record) {
        return new Response(JSON.stringify({ success: false, error: "找不到該紀錄" }), { status: 404, headers: corsHeaders });
      }

      // 2. 如果已綁定系統用戶，拒絕刪除
      if (record.client_user_id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "此客戶已有正式交易紀錄，為確保數據一致性，系統用戶紀錄不可刪除。" 
        }), { status: 403, headers: corsHeaders });
      }

      // 3. 只有手動預防紀錄 (client_user_id 為空) 才執行刪除
      await env.commission_db.prepare("DELETE FROM CustomerRecords WHERE id = ? AND artist_id = ?").bind(id, currentUserId).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "刪除失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  }
};