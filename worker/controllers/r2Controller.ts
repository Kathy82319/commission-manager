// worker/controllers/r2Controller.ts
import type { Env } from "../shared/types";
import { generateUploadUrl, generateDownloadUrl } from "../services/r2";

export const r2Controller = {
  /**
   * 取得上傳用預簽章網址
   */
  async getUploadUrl(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { contentType, bucketType, originalName, folder } = await request.json() as any;
    
    // 🌟 防護機制 1：檢查一分鐘內索取上傳網址的頻率 (上限 10 次)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const systemLogId = `sys-upload-${currentUserId}`; // 使用虛擬的單號來記錄全域上傳行為
    
    const { results: recentReqs } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM ActionLogs 
      WHERE commission_id = ? AND action_type = 'request_upload' AND datetime(created_at) >= datetime(?)
    `).bind(systemLogId, oneMinuteAgo).all();

    if ((recentReqs[0]?.count as number) >= 10) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "請求上傳過於頻繁，為保護系統資源，請於 1 分鐘後再試。" 
      }), { status: 429, headers: corsHeaders });
    }

    // 白名單分流防護 (公開桶僅限圖片)
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

    // 根據前端傳入的 folder 決定 R2 中的存放路徑
    let pathPrefix = "";
    if (folder) {
      pathPrefix = `${folder}/`;
    } else {
      pathPrefix = "commissions/";
    }

    const safeFileName = `${pathPrefix}${crypto.randomUUID()}.${extension}`; 
    const bucketName = bucketType === 'private' ? "commission-private" : "commission-public";
    
    try {
      const uploadUrl = await generateUploadUrl(env, bucketName, safeFileName, contentType);
      
      // 🌟 防護機制 1 續：成功產出網址後，寫入一筆系統日誌作為計數依據
      await env.commission_db.prepare(
        "INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'user', 'request_upload', ?)"
      ).bind(crypto.randomUUID(), systemLogId, `索取上傳網址 (${folder || 'commissions'})`).run();

      return new Response(JSON.stringify({ success: true, uploadUrl, fileName: safeFileName }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成上傳通行證" }), { status: 500, headers: corsHeaders });
    }
  },

    /**
   * 取得下載用預簽章網址 (需校驗當事人身分)
   */
  async getDownloadUrl(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { commissionId, fileName, bucketType } = await request.json() as any;
    const bucketToUse = bucketType === 'public' ? "commission-public" : "commission-private";

    // 檢查是否有權限讀取這筆訂單的檔案
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

    // 🌟 防護機制 2：檢查一分鐘內下載檔案的頻率 (上限 15 次，防止惡意爬蟲刷流量)
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
      
      // 寫入下載日誌 (同時作為計數依據)
      await env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, ?, 'download', ?)")
        .bind(crypto.randomUUID(), commissionId, actorRole, logContent).run();

      return new Response(JSON.stringify({ success: true, downloadUrl }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成下載通行證" }), { status: 500, headers: corsHeaders });
    }
  }
};