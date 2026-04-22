// worker/controllers/customerController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

/**
 * 輔助函數：規範化社群聯絡方式格式 (避免雙重字串化)
 */
function normalizeContactMethods(data: any): string {
  try {
    let arrayData = data;
    if (typeof data === 'string') {
      arrayData = JSON.parse(data);
    }
    if (Array.isArray(arrayData)) {
      // 僅保留有意義的字串，過濾掉空值
      return JSON.stringify(arrayData.filter(m => m && typeof m === 'string' && m.trim() !== ""));
    }
    return "[]";
  } catch (e) {
    return "[]";
  }
}

export const customerController = {
  // 1. 取得客戶列表
  async getList(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const query = `
      SELECT 
        cr.*, 
        COALESCE(u.public_id, cr.public_id) as public_id, -- 優先讀取本地儲存的 ID
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

  // 2. 新增客戶紀錄 (🌟 修正：確保 contact_methods 格式正確)
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      const id = crypto.randomUUID();
      
      const safeAlias = sanitizeAndLimit(body.alias_name || "新客戶", 50);
      const safeShortNote = sanitizeAndLimit(body.short_note || "", 100);
      const safeFullNote = sanitizeAndLimit(body.full_note || "", 5000);
      const safePublicId = sanitizeAndLimit(body.public_id || "", 50);
      const formattedContacts = normalizeContactMethods(body.contact_methods);

      await env.commission_db.prepare(`
        INSERT INTO CustomerRecords (id, artist_id, client_user_id, public_id, alias_name, custom_label, short_note, full_note, contact_methods)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, 
        currentUserId, 
        body.client_user_id || null, 
        safePublicId || null, 
        safeAlias, 
        body.custom_label || '一般', 
        safeShortNote,
        safeFullNote,
        formattedContacts
      ).run();
      
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "新增失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 詳情讀取 (讀取本地 public_id)
  async getDetail(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const customer = await env.commission_db.prepare(`
        SELECT cr.*, u.display_name as platform_name, COALESCE(u.public_id, cr.public_id) as public_id
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

  // 4. 更新紀錄 (🌟 修正：確保更新時 contact_methods 欄位不遺失)
  async update(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      const updates: string[] = [];
      const params: any[] = [];

      const fields: Record<string, number> = {
        alias_name: 50,
        custom_label: 20,
        short_note: 100,
        full_note: 5000,
        public_id: 50 
      };

      for (const [field, limit] of Object.entries(fields)) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(sanitizeAndLimit(body[field], limit));
        }
      }

      // 🌟 獨立處理社群聯絡方式，確保規範化
      if (body.contact_methods !== undefined) {
        updates.push("contact_methods = ?");
        params.push(normalizeContactMethods(body.contact_methods));
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

  // 6. 刪除客戶紀錄
  async delete(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const record = await env.commission_db.prepare("SELECT client_user_id FROM CustomerRecords WHERE id = ? AND artist_id = ?")
        .bind(id, currentUserId).first<any>();

      if (!record) return new Response(JSON.stringify({ success: false, error: "找不到該紀錄" }), { status: 404, headers: corsHeaders });

      if (record.client_user_id) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "此客戶已有正式交易紀錄，不可刪除。" 
        }), { status: 403, headers: corsHeaders });
      }

      await env.commission_db.prepare("DELETE FROM CustomerRecords WHERE id = ? AND artist_id = ?").bind(id, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "刪除失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  }
};