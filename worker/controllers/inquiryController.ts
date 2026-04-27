// worker/controllers/inquiryController.ts
import type { Env } from '../shared/types';

export const inquiryController = {
  
  // 🌟 新增：計算未讀的收件匣/洽談進度數量
  async getUnreadCount(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const role = url.searchParams.get('role'); // 'client' 或是 'artist'

      let query = "";
      if (role === 'client') {
        // 案主視角：看自己發的許願底下，是否有 latest_update_at > last_read_at_client 的單
        query = `
          SELECT COUNT(*) as count 
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE b.client_id = ? 
          AND (i.latest_update_at > i.last_read_at_client OR i.last_read_at_client IS NULL)
          AND i.status != 'cancelled'
        `;
      } else {
        // 繪師視角：看自己投遞的單子，是否有 latest_update_at > last_read_at_artist
        query = `
          SELECT COUNT(*) as count 
          FROM BulletinInquiries i
          WHERE i.artist_id = ? 
          AND (i.latest_update_at > i.last_read_at_artist OR i.last_read_at_artist IS NULL)
          AND i.status != 'cancelled'
        `;
      }

      const { results } = await env.commission_db.prepare(query).bind(currentUserId).all();
      const count = results[0]?.count || 0;

      return new Response(JSON.stringify({ success: true, count }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, count: 0, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

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
        return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
      }

      // 🌟 進入洽談室也算已讀
      const updateField = data.artist_id === currentUserId ? 'last_read_at_artist' : 'last_read_at_client';
      await env.commission_db.prepare(`UPDATE BulletinInquiries SET ${updateField} = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, data }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

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

  async sendMessage(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { content, message_type = 'text' } = body;
      const id = crypto.randomUUID();
      
      // 🌟 發送訊息時，也算是一種更新，觸發紅點
      await env.commission_db.batch([
        env.commission_db.prepare(`INSERT INTO InquiryMessages (id, inquiry_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, ?)`).bind(id, inquiryId, currentUserId, content, message_type),
        env.commission_db.prepare(`UPDATE BulletinInquiries SET latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId)
      ]);

      return new Response(JSON.stringify({ success: true, data: { id, content } }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

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

  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      // 🌟 繪師送出提案，觸發最新異動時間
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'proposed', latest_update_at = CURRENT_TIMESTAMP WHERE id = ? AND artist_id = ?`
      ).bind(inquiryId, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

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

      const origin_source = JSON.stringify({
        source_type: 'bulletin',
        bulletin_content: inquiry.bulletin_content,
        bulletin_category: inquiry.bulletin_category,
        artist_initial_snapshot: JSON.parse(inquiry.artist_snapshot),
        client_initial_response: inquiry.client_response,
        final_negotiation_draft: draft
      });

      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, 
          total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons,
          delivery_method, workflow_mode
        ) VALUES (?, ?, ?, ?, ?, ?, 'quote_created', ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard')`
      ).bind(
        commissionId, currentUserId, inquiry.artist_id, 'type-01', draft.project_name || '許願池媒合委託',
        draft.total_price || 0, origin_source, draft.usage_type || '個人收藏', draft.is_rush || '否',
        draft.draw_scope || '未定', draft.char_count || 1, draft.bg_type || '透明/純色', draft.add_ons || ''
      ).run();

      const oldMessages = await env.commission_db.prepare(
        `SELECT sender_id, content, message_type, created_at FROM InquiryMessages WHERE inquiry_id = ?`
      ).bind(inquiryId).all();

      if (oldMessages.results && oldMessages.results.length > 0) {
        const stmts = oldMessages.results.map((msg: any) => {
          return env.commission_db.prepare(
            `INSERT INTO CommissionMessages (id, commission_id, sender_id, content, message_type, created_at) 
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), commissionId, msg.sender_id, msg.content, msg.message_type, msg.created_at);
        });
        await env.commission_db.batch(stmts);
      }

      await env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'accepted', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};