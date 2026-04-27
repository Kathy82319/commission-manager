// worker/controllers/inquiryController.ts

// 修正這裡：直接從定義來源引入 Env
import type { Env } from '../shared/types'; 

export const inquiryController = {
  // 1. 獲取洽談訊息紀錄
  async getMessages(inquiryId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(
        `SELECT * FROM InquiryMessages WHERE inquiry_id = ? ORDER BY created_at ASC`
      ).bind(inquiryId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 發送洽談訊息
  async sendMessage(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { content, message_type = 'text' } = body;
      const id = crypto.randomUUID();

      await env.commission_db.prepare(
        `INSERT INTO InquiryMessages (id, inquiry_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, inquiryId, currentUserId, content, message_type).run();

      return new Response(JSON.stringify({ success: true, data: { id, content, message_type, created_at: new Date().toISOString() } }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 繪師儲存協議草稿 (negotiation_draft)
  async saveDraft(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { draft_json } = body; 

      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET negotiation_draft = ? WHERE id = ? AND artist_id = ?`
      ).bind(draft_json, inquiryId, currentUserId).run();

      if (result.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: '儲存失敗，權限不足或找不到該筆洽談' }), { status: 403, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, message: '草稿已儲存' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 繪師送出正式提案 (Propose)
  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'proposed' WHERE id = ? AND artist_id = ? AND status = 'submitted'`
      ).bind(inquiryId, currentUserId).run();

      return new Response(JSON.stringify({ success: true, message: '提案已送出，請靜候案主審閱' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 5. 案主接受提案並正式成單
  async finalizeOrder(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content 
         FROM BulletinInquiries i 
         JOIN Bulletins b ON i.bulletin_id = b.id 
         WHERE i.id = ? AND b.client_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry || !inquiry.negotiation_draft) {
        throw new Error('找不到協議草稿或權限不足');
      }

      const draft = JSON.parse(inquiry.negotiation_draft);
      const commissionId = crypto.randomUUID();

      const origin_source = JSON.stringify({
        bulletin_content: inquiry.bulletin_content,
        client_initial_response: inquiry.client_response,
        artist_initial_snapshot: JSON.parse(inquiry.artist_snapshot),
        final_negotiation_draft: draft
      });

      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, artist_id, client_id, project_name, status, total_price, origin_source, type_id
        ) VALUES (?, ?, ?, ?, 'discussing', ?, ?, ?)`
      ).bind(
        commissionId,
        inquiry.artist_id,
        currentUserId,
        draft.project_name || inquiry.bulletin_content.substring(0, 50),
        draft.total_price || 0,
        origin_source,
        'custom' // 給予一個預設的 type_id 以繞過 NOT NULL 限制
      ).run();
 
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'accepted' WHERE id = ?`
      ).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
  // 獲取特定洽談的詳細資料 (供洽談室初始化使用)
  async getInquiryDetail(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.client_id as bulletin_client_id
         FROM BulletinInquiries i
         JOIN Bulletins b ON i.bulletin_id = b.id
         WHERE i.id = ?`
      ).bind(inquiryId).first() as any;

      if (!inquiry) {
        return new Response(JSON.stringify({ success: false, message: '找不到洽談紀錄' }), { status: 404, headers: corsHeaders });
      }

      // 權限檢查：只有相關的繪師或案主可以進入
      if (inquiry.artist_id !== currentUserId && inquiry.bulletin_client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, data: inquiry }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },
};