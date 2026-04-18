// worker/controllers/r2Controller.ts
import type { Env } from "../shared/types";
import { generateUploadUrl, generateDownloadUrl } from "../services/r2";

export const r2Controller = {
  /**
   * 取得上傳用預簽章網址
   */
  async getUploadUrl(request: Request, _currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { contentType, bucketType, originalName } = await request.json() as any;
    
    if (bucketType !== 'private') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(contentType)) {
        return new Response(JSON.stringify({ success: false, error: "不支援的檔案格式" }), { status: 400, headers: corsHeaders });
      }
    }

    let extension = 'bin';
    if (originalName && originalName.includes('.')) {
      extension = originalName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    } else {
      extension = contentType.split('/')[1]?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
    }

    const safeFileName = `${crypto.randomUUID()}.${extension}`; 
    const bucketName = bucketType === 'private' ? "commission-private" : "commission-public";
    
    try {
      const uploadUrl = await generateUploadUrl(env, bucketName, safeFileName, contentType);
      return new Response(JSON.stringify({ success: true, uploadUrl, fileName: safeFileName }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成上傳通行證" }), { status: 500, headers: corsHeaders });
    }
  },

  /**
   * 取得下載用預簽章網址 (需校驗當事人身分並紀錄日誌)
   */
  async getDownloadUrl(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { commissionId, fileName, bucketType } = await request.json() as any;
    const bucketToUse = bucketType === 'public' ? "commission-public" : "commission-private";

    // 檢查權限
    const { results } = await env.commission_db.prepare(
      "SELECT artist_id, client_id, status FROM Commissions WHERE id = ?"
    ).bind(commissionId).all();

    if (results.length === 0) return new Response(JSON.stringify({ success: false, error: "單據不存在" }), { status: 404, headers: corsHeaders });
    const comm = results[0] as any;

    // 🌟 修正身分判定邏輯：優先判斷是否為委託人，確保開發者自己測試時身分紀錄正確
    let actorRole = '';
    if (currentUserId === comm.client_id) {
      actorRole = 'client';
    } else if (currentUserId === comm.artist_id) {
      actorRole = 'artist';
    } else {
      return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
    }

    const logContent = `${actorRole === 'artist' ? '繪師' : '委託人'}已下載檔案: ${fileName}`;

    try {
      const downloadUrl = await generateDownloadUrl(env, bucketToUse, fileName);
      
      // 寫入下載日誌
      await env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, ?, 'download', ?)")
        .bind(crypto.randomUUID(), commissionId, actorRole, logContent).run();

      return new Response(JSON.stringify({ success: true, downloadUrl }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成下載通行證" }), { status: 500, headers: corsHeaders });
    }
  }
};