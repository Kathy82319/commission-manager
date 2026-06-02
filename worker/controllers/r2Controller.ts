// worker/controllers/r2Controller.ts
import type { Env } from "../shared/types";
import { generateUploadUrl, generateDownloadUrl } from "../services/r2";

const ALLOWED_FOLDERS = new Set([
  'chat-images', 'oc', 'guide', 'settings', 'showcase',
  'avatars', 'commissions', 'system', 'portfolio', 'wishboard', 'proposals'
]);

export const r2Controller = {

  async getUploadUrl(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { contentType, bucketType, originalName, folder } = await request.json() as any;

    if (folder && !ALLOWED_FOLDERS.has(folder)) {
      return new Response(JSON.stringify({ success: false, error: "不合法的上傳路徑" }), { status: 400, headers: corsHeaders });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const rateLimitKey = `req_upload_${currentUserId}`;

    const { results: recentReqs } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM WebhookLogs
      WHERE commission_id = ? AND action_type = 'request_upload' AND datetime(created_at) >= datetime(?)
    `).bind(rateLimitKey, oneHourAgo).all();

    if ((recentReqs[0]?.count as number) >= 60) {
      return new Response(JSON.stringify({
        success: false,
        error: "上傳次數已達每小時上限（60 張），請稍後再試。"
      }), { status: 429, headers: corsHeaders });
    }

    if (bucketType !== 'private') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(contentType)) {
        return new Response(JSON.stringify({ success: false, error: "不支援的檔案格式，公開預覽僅允許圖片" }), { status: 400, headers: corsHeaders });
      }
    }

    let extension = 'bin';
    if (originalName && originalName.includes('.')) {
      extension = originalName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    } else {
      extension = contentType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    }

    let pathPrefix = folder ? `${folder}/` : "commissions/";
    const safeFileName = `${pathPrefix}${crypto.randomUUID()}.${extension}`; 
    const bucketName = bucketType === 'private' ? "commission-private" : "commission-public";
    
    try {
      const uploadUrl = await generateUploadUrl(env, bucketName, safeFileName, contentType);
      
      await env.commission_db.prepare(
        "INSERT INTO WebhookLogs (commission_id, actor_role, action_type, message) VALUES (?, 'user', 'request_upload', ?)"
      ).bind(rateLimitKey, `索取上傳網址 (${folder || 'commissions'})`).run();

      return new Response(JSON.stringify({ success: true, uploadUrl, fileName: safeFileName }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成上傳通行證" }), { status: 500, headers: corsHeaders });
    }
  },

  async getDownloadUrl(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { commissionId, fileName, bucketType } = await request.json() as any;
    

    if (!fileName || typeof fileName !== 'string' || fileName.includes('..') || fileName.startsWith('/')) {
      return new Response(JSON.stringify({ success: false, error: "不合法的檔案路徑格式" }), { status: 400, headers: corsHeaders });
    }

    const bucketToUse = bucketType === 'public' ? "commission-public" : "commission-private";

    const { results } = await env.commission_db.prepare(
      "SELECT artist_id, client_id, status FROM Commissions WHERE id = ?"
    ).bind(commissionId).all();

    if (results.length === 0) return new Response(JSON.stringify({ success: false, error: "單據不存在" }), { status: 404, headers: corsHeaders });
    const comm = results[0] as any;

    let actorRole = '';
    if (currentUserId === comm.client_id) {
      actorRole = 'client';
    } else if (currentUserId === comm.artist_id) {
      actorRole = 'artist';
    } else {
      return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { results: recentDls } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM ActionLogs 
      WHERE commission_id = ? AND actor_role = ? AND action_type = 'download' AND datetime(created_at) >= datetime(?)
    `).bind(commissionId, actorRole, oneMinuteAgo).all();

    if ((recentDls[0]?.count as number) >= 15) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "下載頻率過高，請於 1 分鐘後再試。" 
      }), { status: 429, headers: corsHeaders });
    }

    const logContent = `${actorRole === 'artist' ? '繪師' : '委託人'}已下載檔案: ${fileName}`;

    try {
      const downloadUrl = await generateDownloadUrl(env, bucketToUse, fileName);
      
      await env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, ?, 'download', ?)")
        .bind(crypto.randomUUID(), commissionId, actorRole, logContent).run();

      return new Response(JSON.stringify({ success: true, downloadUrl }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成下載通行證" }), { status: 500, headers: corsHeaders });
    }
  }
};