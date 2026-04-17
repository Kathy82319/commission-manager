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
   * 取得全站儀表板數據 (GET /api/admin/stats)
   */
  async getDashboardStats(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { results: userStats } = await env.commission_db.prepare("SELECT COUNT(*) as total, role FROM Users GROUP BY role").all();
    const { results: commStats } = await env.commission_db.prepare("SELECT COUNT(*) as total, status FROM Commissions GROUP BY status").all();

    return new Response(JSON.stringify({ success: true, data: { users: userStats, commissions: commStats } }), { status: 200, headers: corsHeaders });
  },

  /**
   * 取得使用者清單 (GET /api/admin/users)
   */
  async getUsers(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { results } = await env.commission_db.prepare(`
      SELECT id, public_id, display_name, line_id, role, plan_type, created_at 
      FROM Users 
      ORDER BY created_at DESC 
      LIMIT 100
    `).all();
    
    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  /**
   * 更新使用者狀態/權限 (PATCH /api/admin/users/:id)
   */
  async updateUser(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const body: any = await request.json();
    const updates = [];
    const params = [];

    if (body.role) { 
      updates.push("role = ?"); 
      params.push(sanitizeAndLimit(body.role, 50)); 
    }
    if (body.plan_type) { 
      updates.push("plan_type = ?"); 
      params.push(sanitizeAndLimit(body.plan_type, 50)); 
    }

    if (updates.length > 0) {
      params.push(targetId);
      await env.commission_db.prepare(`UPDATE Users SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
    }

    return new Response(JSON.stringify({ success: true, message: "使用者狀態已更新" }), { status: 200, headers: corsHeaders });
  }
};