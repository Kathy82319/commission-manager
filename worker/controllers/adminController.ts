// worker/controllers/adminController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

export const adminController = {
  /**
   * 中間件：檢查是否為管理員
   */
  async checkAdmin(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response | null> {
    const { results } = await env.commission_db.prepare("SELECT role FROM Users WHERE id = ?").bind(currentUserId).all();
    if (results.length === 0 || results[0].role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: "權限不足，僅限管理員存取" }), { status: 403, headers: corsHeaders });
    }
    return null; // 驗證通過
  },

  /**
   * 取得全站儀表板數據 (升級版 Stats)
   */
  async getDashboardStats(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    // 1. 總用戶數與方案分佈 (免費/試用/專業)
    const { results: userStats } = await env.commission_db.prepare("SELECT COUNT(*) as total, plan_type FROM Users GROUP BY plan_type").all();
    
    // 2. 本月新增用戶數
    const { results: newUsers } = await env.commission_db.prepare("SELECT COUNT(*) as total FROM Users WHERE created_at >= date('now', 'start of month')").all();
    
    // 3. 委託單狀態分佈 (總數可由前端加總)
    const { results: commStats } = await env.commission_db.prepare("SELECT COUNT(*) as total, status FROM Commissions GROUP BY status").all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: { 
        users: userStats, 
        new_users_this_month: newUsers[0]?.total || 0,
        commissions: commStats 
      } 
    }), { status: 200, headers: corsHeaders });
  },

  /**
   * 取得使用者清單 (支援 A: 搜尋與分頁)
   */
  async getUsers(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = 20; // 每頁 20 筆
    const offset = (page - 1) * limit;

    let query = `SELECT id, public_id, display_name, line_id, role, plan_type, pro_expires_at, created_at FROM Users`;
    let params: any[] = [];

    if (search) {
      query += ` WHERE display_name LIKE ? OR public_id LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await env.commission_db.prepare(query).bind(...params).all();
    
    // 順便回傳總數以利前端計算分頁
    let countQuery = search ? `SELECT COUNT(*) as total FROM Users WHERE display_name LIKE ? OR public_id LIKE ?` : `SELECT COUNT(*) as total FROM Users`;
    let countParams = search ? [`%${search}%`, `%${search}%`] : [];
    const { results: countRes } = await env.commission_db.prepare(countQuery).bind(...countParams).all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: results,
      pagination: { total: countRes[0]?.total || 0, page, limit }
    }), { status: 200, headers: corsHeaders });
  },

  /**
   * 取得全站委託單清單 (新增 D: 全站訂單總覽)
   */
  async getCommissions(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    const { results } = await env.commission_db.prepare(`
      SELECT c.id, c.project_name, c.status, c.total_price, c.order_date,
             a.display_name as artist_name, u.display_name as client_name
      FROM Commissions c
      LEFT JOIN Users a ON c.artist_id = a.id
      LEFT JOIN Users u ON c.client_id = u.id
      ORDER BY c.order_date DESC LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  /**
   * 更新使用者狀態/權限/方案 (支援 B: 停權 與 F: 方案派發)
   */
  async updateUser(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const body: any = await request.json();
    const updates = [];
    const params = [];

    // 權限與停權管理
    if (body.role) { 
      updates.push("role = ?"); 
      params.push(sanitizeAndLimit(body.role, 50)); 
    }
    // 紀錄停權備註 (寫入 bio 欄位或獨立表，此處簡易實作寫入 bio 前綴)
    if (body.role === 'deleted' && body.ban_reason) {
      updates.push("bio = ?");
      params.push(sanitizeAndLimit(`[管理員停權備註: ${body.ban_reason}]`, 500));
    }

    // 方案管理 (F 功能)
    if (body.plan_type) { 
      updates.push("plan_type = ?"); 
      params.push(sanitizeAndLimit(body.plan_type, 50)); 
    }
    if (body.pro_expires_at) {
      updates.push("pro_expires_at = ?");
      params.push(sanitizeAndLimit(body.pro_expires_at, 50)); // 格式應為 ISO 8601
    }

    if (updates.length > 0) {
      params.push(targetId);
      await env.commission_db.prepare(`UPDATE Users SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    }

    return new Response(JSON.stringify({ success: true, message: "使用者狀態已更新" }), { status: 200, headers: corsHeaders });
  }
};