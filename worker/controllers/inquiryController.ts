// worker/controllers/inquiryController.ts
import type { Env } from '../shared/types';

export const inquiryController = {
  
  async getUnreadCount(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const url = new URL(request.url);
      const role = url.searchParams.get('role'); 

      let query = "";
      if (role === 'client') {
        query = `
          SELECT COUNT(*) as count 
          FROM BulletinInquiries i
          JOIN Bulletins b ON i.bulletin_id = b.id
          WHERE b.client_id = ? 
          AND i.status != 'cancelled'
          AND (
            (i.latest_update_at > IFNULL(i.last_read_at_client, '1970-01-01 00:00:00'))
            OR (i.last_read_at_client IS NULL)
          )
        `;
      } else {
        query = `
          SELECT COUNT(*) as count 
          FROM BulletinInquiries i
          WHERE i.artist_id = ? 
          AND i.status != 'cancelled'
          AND (
            (i.latest_update_at > IFNULL(i.last_read_at_artist, '1970-01-01 00:00:00'))
            OR (i.last_read_at_artist IS NULL AND i.status != 'pending') 
          )
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
      // 🌟 修改：額外 JOIN Users 表來撈取繪師的 profile_settings (內含 TOS)
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category, b.client_id as bulletin_client_id,
                a.profile_settings as artist_settings, u.display_name as client_name
         FROM BulletinInquiries i
         JOIN Bulletins b ON i.bulletin_id = b.id
         LEFT JOIN Users a ON i.artist_id = a.id
         LEFT JOIN Users u ON b.client_id = u.id
         WHERE i.id = ?`
      ).bind(inquiryId).all();

      const data = inquiry.results[0] as any;
      if (!data) {
        return new Response(JSON.stringify({ success: false, message: '找不到洽談紀錄' }), { status: 404, headers: corsHeaders });
      }

      if (data.artist_id !== currentUserId && data.bulletin_client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
      }

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
      // 🌟 修改：建立訂單時同時抓取繪師的最新 TOS 快照
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category, 
                u.display_name as client_name, a.profile_settings as artist_settings
         FROM BulletinInquiries i 
         JOIN Bulletins b ON i.bulletin_id = b.id 
         LEFT JOIN Users u ON b.client_id = u.id
         LEFT JOIN Users a ON i.artist_id = a.id
         WHERE i.id = ? AND b.client_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry || !inquiry.negotiation_draft) throw new Error('草稿尚未準備好');

      const draft = JSON.parse(inquiry.negotiation_draft);
      
      const timestampStr = Date.now().toString();
      const shortCode = timestampStr.substring(timestampStr.length - 6);
      const commissionId = `WB-${shortCode}`;

      // 🌟 解析繪師的 TOS 用於存檔
      let tosText = "繪師未提供專屬協議說明。";
      try {
        const settings = JSON.parse(inquiry.artist_settings || '{}');
        if (settings.terms_of_service) tosText = settings.terms_of_service;
      } catch (e) {}

      const origin_source = JSON.stringify({
        source_type: 'bulletin',
        bulletin_content: inquiry.bulletin_content,
        bulletin_category: inquiry.bulletin_category,
        artist_initial_snapshot: JSON.parse(inquiry.artist_snapshot),
        client_initial_response: inquiry.client_response,
        final_negotiation_draft: draft
      });

      const clientName = inquiry.client_name || '案主';
      let finalProjectName = draft.project_name;
      if (!finalProjectName || finalProjectName === inquiry.bulletin_content.substring(0, 30)) {
        finalProjectName = `${clientName} 的許願池委託`;
      }

      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, 
          contact_memo, total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons,
          delivery_method, workflow_mode, latest_message_at, agreed_tos_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard', CURRENT_TIMESTAMP, ?)`
      ).bind(
        commissionId, currentUserId, inquiry.artist_id, 'type-01', finalProjectName,
        clientName, draft.total_price || 0, origin_source, draft.usage_type || '個人收藏', draft.is_rush || '否',
        draft.draw_scope || '未定', draft.char_count || 1, draft.bg_type || '透明/純色', draft.add_ons || '',
        tosText // 🌟 快照寫入
      ).run();

      const oldMessages = await env.commission_db.prepare(
        `SELECT sender_id, content, created_at FROM InquiryMessages WHERE inquiry_id = ?`
      ).bind(inquiryId).all();

      if (oldMessages.results && oldMessages.results.length > 0) {
        const stmts = oldMessages.results.map((msg: any) => {
          const role = msg.sender_id === inquiry.artist_id ? 'artist' : 'client';
          return env.commission_db.prepare(
            `INSERT INTO Messages (id, commission_id, sender_role, content, created_at) 
             VALUES (?, ?, ?, ?, ?)`
          ).bind(crypto.randomUUID(), commissionId, role, msg.content, msg.created_at);
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