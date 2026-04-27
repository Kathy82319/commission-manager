// worker/controllers/inquiryController.ts
import type { Env } from '../shared/types';

export const inquiryController = {
  // 獲取特定洽談的詳細資料
  async getInquiryDetail(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category, b.client_id as bulletin_client_id
         FROM BulletinInquiries i
         JOIN Bulletins b ON i.bulletin_id = b.id
         WHERE i.id = ?`
      ).bind(inquiryId).all();

      const data = inquiry.results[0] as any;
      if (!data) {
        return new Response(JSON.stringify({ success: false, message: '找不到洽談紀錄' }), { status: 404, headers: corsHeaders });
      }

      if (data.artist_id !== currentUserId && data.bulletin_client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權解不足' }), { status: 403, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 獲取洽談訊息紀錄
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

  // 發送洽談訊息
  async sendMessage(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { content, message_type = 'text' } = body;
      const id = crypto.randomUUID();
      await env.commission_db.prepare(
        `INSERT INTO InquiryMessages (id, inquiry_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, ?)`
      ).bind(id, inquiryId, currentUserId, content, message_type).run();
      return new Response(JSON.stringify({ success: true, data: { id, content } }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 繪師儲存協議草稿
  async saveDraft(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { draft_json } = body;
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET negotiation_draft = ? WHERE id = ? AND artist_id = ?`
      ).bind(draft_json, inquiryId, currentUserId).run();

      if (result.meta.changes === 0) throw new Error('儲存失敗');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 繪師送出提案
  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'proposed' WHERE id = ? AND artist_id = ?`
      ).bind(inquiryId, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 案主同意並正式成單 (Finalize)
  async finalizeOrder(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category
         FROM BulletinInquiries i 
         JOIN Bulletins b ON i.bulletin_id = b.id 
         WHERE i.id = ? AND b.client_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry || !inquiry.negotiation_draft) throw new Error('草稿尚未準備好');

      const draft = JSON.parse(inquiry.negotiation_draft);
      const commissionId = crypto.randomUUID();

      // 封裝軌跡資訊，標註來源為許願池
      const origin_source = JSON.stringify({
        source_type: 'bulletin',
        bulletin_content: inquiry.bulletin_content,
        bulletin_category: inquiry.bulletin_category,
        artist_initial_snapshot: JSON.parse(inquiry.artist_snapshot),
        client_initial_response: inquiry.client_response,
        final_negotiation_draft: draft
      });

      // 寫入正式 Commissions 表，補齊所有必填與 CHECK 約束
      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, 
          total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons,
          delivery_method, workflow_mode
        ) VALUES (?, ?, ?, ?, ?, ?, 'quote_created', ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard')`
      ).bind(
        commissionId,
        currentUserId,
        inquiry.artist_id,
        'type-01', 
        draft.project_name || '許願池媒合委託',
        draft.total_price || 0,
        origin_source,
        draft.usage_type || '個人收藏',
        draft.is_rush || '否',
        draft.draw_scope || '未定',
        draft.char_count || 1,
        draft.bg_type || '透明/純色',
        draft.add_ons || ''
      ).run();

      await env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'accepted' WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};