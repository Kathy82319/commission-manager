// worker/controllers/adminController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

export const adminController = {

  async checkAdmin(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response | null> {
    const { results } = await env.commission_db.prepare("SELECT role FROM Users WHERE id = ?").bind(currentUserId).all();
    if (results.length === 0 || results[0].role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: "權限不足，僅限管理員存取" }), { status: 403, headers: corsHeaders });
    }
    return null;
  },


  async getDashboardStats(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { results: userStats } = await env.commission_db.prepare("SELECT COUNT(*) as total, plan_type FROM Users GROUP BY plan_type").all();
    
    const { results: newUsers } = await env.commission_db.prepare("SELECT COUNT(*) as total FROM Users WHERE created_at >= date('now', 'start of month')").all();
    
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

 
  async getUsers(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.*, 
      (SELECT COUNT(*) FROM Commissions WHERE artist_id = u.id) as total_commissions
      FROM Users u
    `;
    let params: any[] = [];

    if (search) {
      query += ` WHERE display_name LIKE ? OR public_id LIKE ? OR id = ?`;
      params.push(`%${search}%`, `%${search}%`, search);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await env.commission_db.prepare(query).bind(...params).all();
    
    let countQuery = search ? `SELECT COUNT(*) as total FROM Users WHERE display_name LIKE ? OR public_id LIKE ?` : `SELECT COUNT(*) as total FROM Users`;
    let countParams = search ? [`%${search}%`, `%${search}%`] : [];
    const { results: countRes } = await env.commission_db.prepare(countQuery).bind(...countParams).all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: results,
      pagination: { total: countRes[0]?.total || 0, page, limit }
    }), { status: 200, headers: corsHeaders });
  },


  async getCommissions(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = 20;
    const offset = (page - 1) * limit;

    const { results } = await env.commission_db.prepare(`
      SELECT c.*, a.display_name as artist_name, u.display_name as client_name
      FROM Commissions c
      LEFT JOIN Users a ON c.artist_id = a.id
      LEFT JOIN Users u ON c.client_id = u.id
      ORDER BY c.order_date DESC LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const { results: countRes } = await env.commission_db.prepare("SELECT COUNT(*) as total FROM Commissions").all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: results,
      pagination: { total: countRes[0]?.total || 0, page, limit }
    }), { status: 200, headers: corsHeaders });
  },

  /**
   * 更新用戶 (權限、方案、到期日、配額、停權備註)
   */
  async updateUser(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const body: any = await request.json();
    const updates = [];
    const params = [];

    const fields = ['role', 'plan_type', 'pro_expires_at', 'custom_quota'];
    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(body[field] === "" ? null : body[field]);
      }
    }

    if (body.role === 'deleted' && body.ban_reason) {
      updates.push("bio = ?");
      params.push(sanitizeAndLimit(`[封鎖原因: ${body.ban_reason}]`, 500));
    }

    if (updates.length > 0) {
      params.push(targetId);
      await env.commission_db.prepare(`UPDATE Users SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }
};