// worker/controllers/r2Controller.ts
import type { Env } from "../shared/types";
import { generateUploadUrl, generateDownloadUrl } from "../services/r2";

export const r2Controller = {
  /**
   * 取得上傳用預簽章網址
   */
  async getUploadUrl(request: Request, _currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { contentType, bucketType, originalName } = await request.json() as any;
    
    // 白名單分流防護
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

    const isArtist = currentUserId === comm.artist_id;
    const isClient = currentUserId === comm.client_id;
    const isCompleted = comm.status === 'completed';

    if (!isArtist && !(isClient && isCompleted)) {
      return new Response(JSON.stringify({ success: false, error: "權限不足，完稿尚未解鎖或您非當事人" }), { status: 403, headers: corsHeaders });
    }

    // 檢查檔案是否確實屬於該訂單 (避免竄改檔名去偷抓別人的圖)
    const { results: validFiles } = await env.commission_db.prepare(`
      SELECT file_url AS file_key FROM Submissions WHERE commission_id = ?
      UNION
      SELECT r2_key AS file_key FROM Attachments WHERE commission_id = ?
    `).bind(commissionId, commissionId).all();

    const isFileOwnedByCommission = validFiles.some((row: any) => 
      row.file_key && row.file_key.includes(fileName)
    );

    if (!isFileOwnedByCommission) {
      return new Response(JSON.stringify({ success: false, error: "越權存取阻擋：該檔案不屬於此委託單" }), { status: 403, headers: corsHeaders });
    }

    try {
      const downloadUrl = await generateDownloadUrl(env, bucketToUse, fileName);
      return new Response(JSON.stringify({ success: true, downloadUrl }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: "無法生成下載通行證" }), { status: 500, headers: corsHeaders });
    }
  }
};