// worker/controllers/customerController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

export const customerController = {
  // 1. 取得客戶列表 (包含合作數量統計)
  async getList(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const query = `
      SELECT 
        cr.*, 
        u.public_id,
        u.display_name as platform_nickname,
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
      return new Response(JSON.stringify({ success: false, error: "清單讀取失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 新增客戶紀錄
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      
      // 🌟 安全過濾並設定預設值
      const nickname = sanitizeAndLimit(body.nickname || "新客戶", 50);
      // 如果 alias_name 是空的，自動套用 nickname
      const alias_name = sanitizeAndLimit(body.alias_name || body.nickname || "新客戶", 50);
      const short_note = sanitizeAndLimit(body.short_note || "", 100);
      const custom_label = sanitizeAndLimit(body.custom_label || "一般", 20);

      const id = crypto.randomUUID();
      
      await env.commission_db.prepare(`
        INSERT INTO CustomerRecords (id, artist_id, client_user_id, alias_name, nickname, custom_label, short_note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id, 
        currentUserId, 
        body.client_user_id || null, 
        alias_name, 
        nickname, 
        custom_label, 
        short_note
      ).run();
      
      return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "新增失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 更新客戶詳情
  async update(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body: any = await request.json();
      
      // 權限檢查
      const record = await env.commission_db.prepare("SELECT artist_id FROM CustomerRecords WHERE id = ?").bind(id).first<any>();
      if (!record) return new Response(JSON.stringify({ success: false, error: "找不到紀錄" }), { status: 404, headers: corsHeaders });
      if (record.artist_id !== currentUserId) return new Response(JSON.stringify({ success: false, error: "無權限修改" }), { status: 403, headers: corsHeaders });

      const updates: string[] = [];
      const params: any[] = [];

      const fields: Record<string, number> = {
        alias_name: 50,
        custom_label: 20,
        short_note: 100,
        full_note: 5000,
        nickname: 50
      };

      for (const [field, limit] of Object.entries(fields)) {
        if (body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(sanitizeAndLimit(body[field], limit));
        }
      }

      // 處理 JSON 格式的聯絡方式
      if (body.contact_methods !== undefined) {
        updates.push(`contact_methods = ?`);
        const methods = Array.isArray(body.contact_methods) ? body.contact_methods.slice(0, 3) : [];
        params.push(JSON.stringify(methods)); 
      }

      if (updates.length === 0) return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

      params.push(id);
      await env.commission_db.prepare(`UPDATE CustomerRecords SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
      
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "更新失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 取得單一客戶 CRM 詳情與交易歷程
  async getDetail(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const customer = await env.commission_db.prepare(`
        SELECT cr.*, u.display_name as platform_nickname, u.public_id
        FROM CustomerRecords cr
        LEFT JOIN Users u ON cr.client_user_id = u.id
        WHERE cr.id = ? AND cr.artist_id = ?
      `).bind(id, currentUserId).first<any>();

      if (!customer) return new Response(JSON.stringify({ success: false, error: "找不到客戶" }), { status: 404, headers: corsHeaders });

      let transactions: any[] = [];
      // 🌟 修正：只有當有綁定平台用戶 ID 時，才去查詢交易歷程
      if (customer.client_user_id) {
        const { results } = await env.commission_db.prepare(`
          SELECT id, project_name, total_price, order_date, status
          FROM Commissions
          WHERE artist_id = ? AND client_id = ?
          ORDER BY order_date DESC
        `).bind(currentUserId, customer.client_user_id).all();
        transactions = results;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: { ...customer, transactions } 
      }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取詳情失敗: " + err.message }), { status: 500, headers: corsHeaders });
    }
  }
};