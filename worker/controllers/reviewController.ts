// worker/controllers/reviewController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";
import { notificationController } from './notificationController';

export const reviewController = {
  // 1. 委託人新增評價 (限結案後 3 天內)
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body = await request.json() as any;
      const commissionId = body.commission_id;

      const { results: commResults } = await env.commission_db.prepare(
        "SELECT artist_id, client_id, status, project_name FROM Commissions WHERE id = ?"
      ).bind(commissionId).all();

      if (commResults.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "找不到該單據" }), { status: 404, headers: corsHeaders });
      }

      const comm = commResults[0] as any;

      if (comm.client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, error: "無權限填寫此評價" }), { status: 403, headers: corsHeaders });
      }

      if (comm.status !== 'completed') {
        return new Response(JSON.stringify({ success: false, error: "委託尚未結案，無法評價" }), { status: 400, headers: corsHeaders });
      }

      const { results: existingReview } = await env.commission_db.prepare(
        "SELECT id FROM Reviews WHERE commission_id = ?"
      ).bind(commissionId).all();

      if (existingReview.length > 0) {
        return new Response(JSON.stringify({ success: false, error: "此單據已評價過" }), { status: 400, headers: corsHeaders });
      }

      const { results: logs } = await env.commission_db.prepare(`
        SELECT created_at FROM ActionLogs 
        WHERE commission_id = ? AND content LIKE '%訂單已結案，開啟 3 日評價期%' 
        ORDER BY datetime(created_at) DESC LIMIT 1
      `).bind(commissionId).all();

      if (logs.length > 0) {
        const completedAt = new Date((logs[0] as any).created_at).getTime();
        const now = Date.now();
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        if (now - completedAt > threeDaysInMs) {
          return new Response(JSON.stringify({ success: false, error: "已超過三日評價期限，無法送出" }), { status: 403, headers: corsHeaders });
        }
      }

      const reviewId = crypto.randomUUID();
      const content = sanitizeAndLimit(body.content || '', 2000);
      const clientAnonymous = body.client_anonymous ? 1 : 0;

      await env.commission_db.batch([
        env.commission_db.prepare(`
          INSERT INTO Reviews (id, commission_id, artist_id, client_id, content, client_anonymous, artist_anonymous, is_public)
          VALUES (?, ?, ?, ?, ?, ?, 0, 0)
        `).bind(reviewId, commissionId, comm.artist_id, currentUserId, content, clientAnonymous),
        
        env.commission_db.prepare(
          "INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'review_submit', '委託人已填寫結案評價')"
        ).bind(crypto.randomUUID(), commissionId)
      ]);

      await notificationController.createNotification(
        env, 
        comm.artist_id, 
        'bulletin', 
        `🌟 委託人已為委託單「${comm.project_name || commissionId}」留下評價，快去看看評價吧！`, 
        `/artist/notebook?id=${commissionId}&tab=reviews`
      );

      return new Response(JSON.stringify({ success: true, id: reviewId }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: "評價送出失敗: " + e.message }), { status: 500, headers: corsHeaders });
    }
  },

  async updateVisibility(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const body = await request.json() as any;
      const isPublic = body.is_public ? 1 : 0;
      const artistAnonymous = body.artist_anonymous ? 1 : 0;

      const { results } = await env.commission_db.prepare(
        "SELECT artist_id FROM Reviews WHERE id = ?"
      ).bind(id).all();

      if (results.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "找不到該評價" }), { status: 404, headers: corsHeaders });
      }

      if ((results[0] as any).artist_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, error: "無權限修改此評價" }), { status: 403, headers: corsHeaders });
      }

      await env.commission_db.prepare(`
        UPDATE Reviews 
        SET is_public = ?, artist_anonymous = ? 
        WHERE id = ?
      `).bind(isPublic, artistAnonymous, id).run();

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: "更新評價狀態失敗: " + e.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getArtistReviews(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const query = `
        SELECT 
          r.*, 
          c.project_name, 
          c.order_date,
          u.display_name AS client_name,
          u.public_id AS client_public_id
        FROM Reviews r
        JOIN Commissions c ON r.commission_id = c.id
        JOIN Users u ON r.client_id = u.id
        WHERE r.artist_id = ?
        ORDER BY r.created_at DESC
      `;
      const { results } = await env.commission_db.prepare(query).bind(currentUserId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取評價列表失敗" }), { status: 500, headers: corsHeaders });
    }
  },

  async getCustomerReviews(clientId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const query = `
        SELECT r.*, c.project_name, c.order_date
        FROM Reviews r
        JOIN Commissions c ON r.commission_id = c.id
        WHERE r.artist_id = ? AND r.client_id = ?
        ORDER BY r.created_at DESC
      `;
      const { results } = await env.commission_db.prepare(query).bind(currentUserId, clientId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取客戶評價失敗" }), { status: 500, headers: corsHeaders });
    }
  },

  async getPublicReviews(artistId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const query = `
        SELECT 
          r.id, r.content, r.created_at, r.client_anonymous, r.artist_anonymous,
          c.project_name,
          CASE 
            WHEN r.client_anonymous = 1 OR r.artist_anonymous = 1 THEN '匿名委託人' 
            ELSE u_client.display_name 
          END as display_client_name
        FROM Reviews r
        JOIN Commissions c ON r.commission_id = c.id
        JOIN Users u_client ON r.client_id = u_client.id
        JOIN Users u_artist ON r.artist_id = u_artist.id
        WHERE (u_artist.id = ? OR u_artist.public_id = ?) AND r.is_public = 1
        ORDER BY r.created_at DESC
      `;
      const { results } = await env.commission_db.prepare(query).bind(artistId, artistId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: "讀取公開評價失敗" }), { status: 500, headers: corsHeaders });
    }
  }
};