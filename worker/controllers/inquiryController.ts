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
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category, b.client_id as bulletin_client_id,
                a.profile_settings as artist_settings, a.plan_type as artist_plan, a.pro_expires_at, a.trial_end_at, u.display_name as client_name
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

      let quotaInfo = null;
      if (currentUserId === data.artist_id) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(currentUserId).all();
         const used = countRes[0]?.count || 0;
         
         const isPro = data.artist_plan === 'pro' && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
         const isTrial = data.artist_plan === 'trial' && (!data.trial_end_at || new Date(data.trial_end_at) > new Date());
         const max = (isPro || isTrial) ? -1 : 3;
         
         quotaInfo = { used_quota: used, max_quota: max, plan_type: data.artist_plan };
      }

      const updateField = data.artist_id === currentUserId ? 'last_read_at_artist' : 'last_read_at_client';
      await env.commission_db.prepare(`UPDATE BulletinInquiries SET ${updateField} = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, data, quota: quotaInfo }), { headers: corsHeaders });
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
      // 🌟 【防護】檢查是否為創作者身分
      const user = await env.commission_db.prepare("SELECT role FROM Users WHERE id = ?").bind(currentUserId).first() as any;
      if (!user || user.role !== 'artist') {
        return new Response(JSON.stringify({ success: false, error: '只有創作者可以儲存草稿' }), { status: 403, headers: corsHeaders });
      }

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
      // 🌟 【防護】撈取 user 資料時一併撈取 role 進行身分檢查
      const artist = await env.commission_db.prepare(
        "SELECT role, plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?"
      ).bind(currentUserId).first() as any;

      if (!artist || artist.role !== 'artist') {
        return new Response(JSON.stringify({ success: false, message: '必須為創作者身分才能提出報價' }), { status: 403, headers: corsHeaders });
      }

      const isPro = artist?.plan_type === 'pro' && (!artist.pro_expires_at || new Date(artist.pro_expires_at) > new Date());
      const isTrial = artist?.plan_type === 'trial' && (!artist.trial_end_at || new Date(artist.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(currentUserId).all();
         
         const usedCount = (countRes[0]?.count as number) || 0;
         if (usedCount >= 3) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'QUOTA_EXCEEDED', 
              message: '您的本月建單額度已滿，請升級專業版以繼續提案。' 
            }), { status: 403, headers: corsHeaders });
         }
      }

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
        `SELECT i.*, b.content as bulletin_content, b.category as bulletin_category, 
                u.display_name as client_name, a.profile_settings as artist_settings,
                a.plan_type, a.pro_expires_at, a.trial_end_at
         FROM BulletinInquiries i 
         JOIN Bulletins b ON i.bulletin_id = b.id 
         LEFT JOIN Users u ON b.client_id = u.id
         LEFT JOIN Users a ON i.artist_id = a.id
         WHERE i.id = ? AND b.client_id = ?`
      ).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry || !inquiry.negotiation_draft) throw new Error('草稿尚未準備好');

      const isPro = inquiry.plan_type === 'pro' && (!inquiry.pro_expires_at || new Date(inquiry.pro_expires_at) > new Date());
      const isTrial = inquiry.plan_type === 'trial' && (!inquiry.trial_end_at || new Date(inquiry.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(inquiry.artist_id).all();
         
         const usedCount = (countRes[0]?.count as number) || 0;
         if (usedCount >= 3) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'QUOTA_EXCEEDED', 
              message: '該繪師本月建單額度已滿，暫時無法建立新訂單。' 
            }), { status: 403, headers: corsHeaders });
         }
      }

      const draft = JSON.parse(inquiry.negotiation_draft);
      const timestampStr = Date.now().toString();
      const shortCode = timestampStr.substring(timestampStr.length - 6);
      const commissionId = `WB-${shortCode}`;

      let tosText = "繪師未提供專屬協議說明。";
      try {
        const settings = JSON.parse(inquiry.artist_settings || '{}');
        if (settings.terms_of_service) tosText = settings.terms_of_service;
      } catch (e) {}

      let parsedBulletinContent = inquiry.bulletin_content;
      try { parsedBulletinContent = JSON.parse(inquiry.bulletin_content); } catch (e) {}

      let parsedClientResponse = inquiry.client_response;
      try { parsedClientResponse = JSON.parse(inquiry.client_response); } catch (e) {}

      let parsedArtistSnapshot = inquiry.artist_snapshot;
      try { parsedArtistSnapshot = JSON.parse(inquiry.artist_snapshot); } catch (e) {}

      const origin_source = JSON.stringify({
        source_type: 'bulletin',
        bulletin_content: parsedBulletinContent,
        bulletin_category: inquiry.bulletin_category,
        artist_initial_snapshot: parsedArtistSnapshot,
        client_initial_response: parsedClientResponse,
        final_negotiation_draft: draft
      });

      const clientName = inquiry.client_name || '案主';
      let finalProjectName = draft.project_name || `${clientName} 的許願池委託`;

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
        draft.draw_scope || '未定', // 🌟 修正：這裡原本漏掉了 draft.
        draft.char_count || 1, draft.bg_type || '透明/純色', draft.add_ons || '',
        tosText
      ).run();

      await env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'accepted', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};