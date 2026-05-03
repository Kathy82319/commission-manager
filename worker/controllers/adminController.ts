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
    
    // 撈取需要審核的許願池貼文總數 (紅點通知)
    const { results: pendingReports } = await env.commission_db.prepare(`
      SELECT COUNT(*) as total FROM Bulletins b 
      WHERE b.status = 'hidden_under_review' OR (SELECT COUNT(*) FROM Reports r WHERE r.bulletin_id = b.id) > 0
    `).all();

    return new Response(JSON.stringify({ 
      success: true, 
      data: { 
        users: userStats, 
        new_users_this_month: newUsers[0]?.total || 0, 
        commissions: commStats,
        pending_reports_count: pendingReports[0]?.total || 0
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
      SELECT 
        u.id, u.public_id, u.display_name, u.role, u.plan_type, 
        u.pro_expires_at, u.custom_quota, u.bio, u.created_at,
        u.wishboard_status, u.mute_expires_at,
        (SELECT COUNT(*) FROM Commissions WHERE artist_id = u.id) as total_commissions
      FROM Users u
    `;
    let params: any[] = [];

    if (search) {
      query += ` WHERE u.display_name LIKE ? OR u.public_id LIKE ? OR u.id = ?`;
      params.push(`%${search}%`, `%${search}%`, search);
    }

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await env.commission_db.prepare(query).bind(...params).all();
    
    let countQuery = search ? `SELECT COUNT(*) as total FROM Users WHERE display_name LIKE ? OR public_id LIKE ?` : `SELECT COUNT(*) as total FROM Users`;
    let countParams = search ? [`%${search}%`, `%${search}%`] : [];
    const { results: countRes } = await env.commission_db.prepare(countQuery).bind(...countParams).all();

    return new Response(JSON.stringify({ success: true, data: results, pagination: { total: countRes[0]?.total || 0, page, limit } }), { status: 200, headers: corsHeaders });
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

    return new Response(JSON.stringify({ success: true, data: results, pagination: { total: countRes[0]?.total || 0, page, limit } }), { status: 200, headers: corsHeaders });
  },

  async updateUser(request: Request, targetId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const body: any = await request.json();

    if (currentUserId === targetId && (body.role === 'deleted' || body.role === 'client')) {
      return new Response(JSON.stringify({ success: false, error: "安全防護：您無法拔除自身的管理員權限或將自己停權。" }), { status: 403, headers: corsHeaders });
    }

    const allowedRoles = ['admin', 'client', 'artist', 'deleted'];
    const allowedPlans = ['free', 'trial', 'pro'];
    const allowedWishboardStatus = ['active', 'muted', 'banned'];

    if (body.role && !allowedRoles.includes(body.role)) return new Response(JSON.stringify({ error: "無效的角色" }), { status: 400, headers: corsHeaders });
    if (body.plan_type && !allowedPlans.includes(body.plan_type)) return new Response(JSON.stringify({ error: "無效的方案" }), { status: 400, headers: corsHeaders });
    if (body.wishboard_status && !allowedWishboardStatus.includes(body.wishboard_status)) return new Response(JSON.stringify({ error: "無效的許願池狀態" }), { status: 400, headers: corsHeaders });

    const updates = [];
    const params = [];
    const fields = ['role', 'plan_type', 'pro_expires_at', 'custom_quota', 'wishboard_status', 'mute_expires_at'];
    
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
  },

  // ==========================================
  // 🌟 Phase 3: 關鍵字與許願池審核防護 API
  // ==========================================

  async getKeywords(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { results } = await env.commission_db.prepare("SELECT * FROM MonitoredKeywords ORDER BY created_at DESC").all();
    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  async addKeyword(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { keyword } = await request.json() as any;
    if (!keyword || typeof keyword !== 'string') return new Response(JSON.stringify({ error: "無效的關鍵字" }), { status: 400, headers: corsHeaders });

    try {
      await env.commission_db.prepare("INSERT INTO MonitoredKeywords (keyword) VALUES (?)").bind(keyword.trim()).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: "關鍵字可能已存在" }), { status: 400, headers: corsHeaders });
    }
  },

  async deleteKeyword(keywordId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    await env.commission_db.prepare("DELETE FROM MonitoredKeywords WHERE id = ?").bind(keywordId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  // 🌟 修改：撈取指定分類的所有貼文，並附帶檢舉資訊
  // 🌟 修改：撈取指定分類的所有貼文 (修正撈取 public_id)
  async getReportedBulletins(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const category = url.searchParams.get('category') || 'request';
    const limit = 20;
    const offset = (page - 1) * limit;

    // 🛡️ 效能優化：移除原本直接撈取 latest_report_reason 的子查詢，改在彈窗中獲取
    const { results } = await env.commission_db.prepare(`
      SELECT b.*, u.display_name as author_name, u.public_id as author_public_id,
      (SELECT COUNT(*) FROM Reports r WHERE r.bulletin_id = b.id) as report_count
      FROM Bulletins b
      LEFT JOIN Users u ON b.client_id = u.id
      WHERE b.category = ?
      ORDER BY b.status DESC, report_count DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(category, limit, offset).all();

    const { results: countRes } = await env.commission_db.prepare(`
      SELECT COUNT(*) as total FROM Bulletins WHERE category = ?
    `).bind(category).all();

    return new Response(JSON.stringify({ success: true, data: results, pagination: { total: countRes[0]?.total || 0, page, limit } }), { status: 200, headers: corsHeaders });
  },

  // 🌟 新增：取得單篇貼文的所有檢舉紀錄 (附帶檢舉人資訊)
  async getBulletinReports(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { results } = await env.commission_db.prepare(`
      SELECT r.id, r.reason, r.created_at, r.reporter_role,
             u.display_name as reporter_name, u.public_id as reporter_public_id
      FROM Reports r
      LEFT JOIN Users u ON r.reporter_id = u.id
      WHERE r.bulletin_id = ?
      ORDER BY r.created_at DESC
    `).bind(bulletinId).all();

    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  async updateBulletinStatus(request: Request, bulletinId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const adminCheck = await this.checkAdmin(currentUserId, env, corsHeaders);
    if (adminCheck) return adminCheck;

    const { status } = await request.json() as any;
    if (!['active', 'open', 'hidden_under_review', 'closed', 'deleted'].includes(status)) {
      return new Response(JSON.stringify({ error: "無效的狀態" }), { status: 400, headers: corsHeaders });
    }

    await env.commission_db.prepare("UPDATE Bulletins SET status = ? WHERE id = ?").bind(status, bulletinId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }

};