// worker/controllers/inquiryController.ts
import type { Env } from '../shared/types';
import { notificationController } from './notificationController'; 

export const inquiryController = {
  
  async getUnreadCount(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const countRes = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM Notifications 
        WHERE user_id = ? AND is_read = 0
      `).bind(currentUserId).first();
      
      const count = (countRes?.count as number) || 0;

      return new Response(JSON.stringify({ success: true, count }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, count: 0, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getInquiryDetail(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(
        `SELECT i.*, 
                b.title as bulletin_title, 
                b.content as bulletin_content, 
                b.category as bulletin_category, 
                b.client_id as bulletin_client_id,
                a.profile_settings as artist_settings, 
                a.plan_type as artist_plan, 
                a.pro_expires_at, 
                a.trial_end_at, 
                a.display_name as artist_name,
                a.public_id as artist_public_id,
                u.display_name as client_name,
                u.public_id as client_public_id,
                c.id as commission_id,
                c.contact_memo
         FROM BulletinInquiries i
         JOIN Bulletins b ON i.bulletin_id = b.id
         LEFT JOIN Users a ON i.artist_id = a.id
         LEFT JOIN Users u ON b.client_id = u.id
         LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = i.id
         WHERE i.id = ?`
      ).bind(inquiryId).all();

      const data = inquiry.results[0] as any;
      if (!data) {
        return new Response(JSON.stringify({ success: false, message: '找不到洽談紀錄' }), { status: 404, headers: corsHeaders });
      }

      if (data.artist_id !== currentUserId && data.bulletin_client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
      }

      const isOffer = data.bulletin_category === 'offer';
      const actualArtistId = isOffer ? data.bulletin_client_id : data.artist_id;

      let quotaInfo = null;
      if (currentUserId === actualArtistId) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(actualArtistId).all();
         const used = countRes[0]?.count || 0;
         
         const artistData = await env.commission_db.prepare("SELECT plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?").bind(actualArtistId).first() as any;
         
         const isPro = artistData?.plan_type === 'pro' && (!artistData.pro_expires_at || new Date(artistData.pro_expires_at) > new Date());
         const isTrial = artistData?.plan_type === 'trial' && (!artistData.trial_end_at || new Date(artistData.trial_end_at) > new Date());
         const max = (isPro || isTrial) ? -1 : 3;
         
         quotaInfo = { used_quota: used, max_quota: max, plan_type: artistData?.plan_type };
      }

      const updateField = currentUserId === actualArtistId ? 'last_read_at_artist' : 'last_read_at_client';
      await env.commission_db.prepare(`UPDATE BulletinInquiries SET ${updateField} = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, data, quota: quotaInfo }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getMessages(inquiryId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT id, sender_id, content, created_at, 'inquiry' as source
        FROM InquiryMessages 
        WHERE inquiry_id = ?

        UNION ALL

        SELECT m.id, 
               CASE WHEN m.sender_role = 'artist' THEN c.artist_id ELSE c.client_id END as sender_id, 
               m.content, m.created_at, 'commission' as source
        FROM Messages m
        JOIN Commissions c ON m.commission_id = c.id
        WHERE json_extract(c.origin_source, '$.inquiry_id') = ?

        ORDER BY created_at ASC
      `).bind(inquiryId, inquiryId).all();
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

      const inquiryData = await env.commission_db.prepare(`
        SELECT b.client_id as bulletin_client_id, b.title, i.artist_id 
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      if (inquiryData) {
        const targetUserId = currentUserId === inquiryData.artist_id ? inquiryData.bulletin_client_id : inquiryData.artist_id;
        const text = `💬 洽談室「${inquiryData.title || '未命名'}」有新的聊天訊息。`;
        await notificationController.createNotification(env, targetUserId, 'inquiry_msg', text, `/inquiry/workspace/${inquiryId}`);
      }

      return new Response(JSON.stringify({ success: true, data: { id, content } }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async saveDraft(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT b.category as bulletin_category, b.client_id as bulletin_client_id, i.artist_id 
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiryData) throw new Error('找不到該筆洽談');

      const isOffer = inquiryData.bulletin_category === 'offer';
      const actualArtistId = isOffer ? inquiryData.bulletin_client_id : inquiryData.artist_id;

      if (currentUserId !== actualArtistId) {
        return new Response(JSON.stringify({ success: false, error: '權限不足：只有該委託的繪師可以儲存草稿' }), { status: 403, headers: corsHeaders });
      }

      const body = await request.json() as any;
      const { draft_json } = body;
      
      const result = await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET negotiation_draft = ? WHERE id = ?`
      ).bind(draft_json, inquiryId).run();

      if (result.meta.changes === 0) throw new Error('儲存失敗或資料未變更');
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT b.title, b.category as bulletin_category, b.client_id as bulletin_client_id, i.artist_id 
        FROM BulletinInquiries i JOIN Bulletins b ON i.bulletin_id = b.id WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiryData) throw new Error('找不到該筆洽談');

      const isOffer = inquiryData.bulletin_category === 'offer';
      const actualArtistId = isOffer ? inquiryData.bulletin_client_id : inquiryData.artist_id;
      const actualClientId = isOffer ? inquiryData.artist_id : inquiryData.bulletin_client_id;

      if (currentUserId !== actualArtistId) {
        return new Response(JSON.stringify({ success: false, message: '必須為該委託的創作者身分才能提出報價' }), { status: 403, headers: corsHeaders });
      }

      const artist = await env.commission_db.prepare(
        "SELECT plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?"
      ).bind(actualArtistId).first() as any;

      const isPro = artist?.plan_type === 'pro' && (!artist.pro_expires_at || new Date(artist.pro_expires_at) > new Date());
      const isTrial = artist?.plan_type === 'trial' && (!artist.trial_end_at || new Date(artist.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(actualArtistId).all();
         
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
        `UPDATE BulletinInquiries SET status = 'proposed', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(inquiryId).run();
      
      const text = `🌟 繪師已送出「${inquiryData.title || '未命名'}」的合作協議，請前往確認。`;
      await notificationController.createNotification(env, actualClientId, 'inquiry_msg', text, `/inquiry/workspace/${inquiryId}`);

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async finalizeOrder(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT i.*, b.title, b.content as bulletin_content, b.category as bulletin_category, b.client_id as bulletin_client_id
        FROM BulletinInquiries i 
        JOIN Bulletins b ON i.bulletin_id = b.id 
        WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiryData || !inquiryData.negotiation_draft) throw new Error('草稿尚未準備好');

      const isOffer = inquiryData.bulletin_category === 'offer';
      const actualArtistId = isOffer ? inquiryData.bulletin_client_id : inquiryData.artist_id;
      const actualClientId = isOffer ? inquiryData.artist_id : inquiryData.bulletin_client_id;

      if (currentUserId !== actualClientId) {
        throw new Error('只有案主有權限正式確認委託單');
      }

      const artistInfo = await env.commission_db.prepare("SELECT plan_type, pro_expires_at, trial_end_at, profile_settings FROM Users WHERE id = ?").bind(actualArtistId).first() as any;
      const clientInfo = await env.commission_db.prepare("SELECT display_name FROM Users WHERE id = ?").bind(actualClientId).first() as any;

      const isPro = artistInfo?.plan_type === 'pro' && (!artistInfo.pro_expires_at || new Date(artistInfo.pro_expires_at) > new Date());
      const isTrial = artistInfo?.plan_type === 'trial' && (!artistInfo.trial_end_at || new Date(artistInfo.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND strftime('%Y-%m', order_date) = strftime('%Y-%m', 'now')
         `).bind(actualArtistId).all();
         
         const usedCount = (countRes[0]?.count as number) || 0;
         if (usedCount >= 3) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'QUOTA_EXCEEDED', 
              message: '該繪師本月建單額度已滿，暫時無法建立新訂單。' 
            }), { status: 403, headers: corsHeaders });
         }
      }

      const draft = JSON.parse(inquiryData.negotiation_draft);
      const timestampStr = Date.now().toString();
      const shortCode = timestampStr.substring(timestampStr.length - 6);
      const commissionId = `WB-${shortCode}`;

      let parsedBulletinContent: any = {};
      try { parsedBulletinContent = JSON.parse(inquiryData.bulletin_content); } catch (e) {}

      let tosText = "繪師未提供專屬協議說明。";
      
      if (draft.custom_tos !== undefined) {
        tosText = draft.custom_tos;
      } else if (parsedBulletinContent && parsedBulletinContent.tos_content && parsedBulletinContent.tos_content.trim() !== '') {
        tosText = parsedBulletinContent.tos_content;
      } else {
        try {
          const settings = JSON.parse(artistInfo?.profile_settings || '{}');
          if (settings.rules && settings.rules.trim() !== '') {
            tosText = settings.rules;
          } else if (settings.terms_of_service && settings.terms_of_service.trim() !== '') {
            tosText = settings.terms_of_service;
          }
        } catch (e) {}
      }

      let parsedClientResponse = inquiryData.client_response;
      try { parsedClientResponse = JSON.parse(inquiryData.client_response); } catch (e) {}

      let parsedArtistSnapshot = inquiryData.artist_snapshot;
      try { parsedArtistSnapshot = JSON.parse(inquiryData.artist_snapshot); } catch (e) {}

      const origin_source = JSON.stringify({
        source_type: 'bulletin',
        inquiry_id: inquiryId, 
        bulletin_content: parsedBulletinContent,
        bulletin_category: inquiryData.bulletin_category,
        artist_initial_snapshot: parsedArtistSnapshot,
        client_initial_response: parsedClientResponse,
        final_negotiation_draft: draft
      });

      const clientName = clientInfo?.display_name || '案主';
      let finalProjectName = draft.project_name || `${clientName} 的許願池委託`;

      await env.commission_db.prepare(
        `INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, 
          contact_memo, total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons,
          delivery_method, workflow_mode, latest_message_at, agreed_tos_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard', CURRENT_TIMESTAMP, ?)`
      ).bind(
        commissionId, actualClientId, actualArtistId, 'type-01', finalProjectName,
        clientName, draft.total_price || 0, origin_source, draft.usage_type || '個人收藏', draft.is_rush || '否',
        draft.draw_scope || '未定', draft.char_count || 1, draft.bg_type || '透明/純色', draft.add_ons || '',
        tosText
      ).run();

      await env.commission_db.prepare(`UPDATE BulletinInquiries SET status = 'accepted', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      const text = `🌟 恭喜！案主已同意「${inquiryData.title || '未命名'}」的協議，正式成立委託單。`;
      await notificationController.createNotification(env, actualArtistId, 'inquiry_msg', text, '/artist/notebook');

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 🌟 針對許願池 (BulletinInquiries) 的正確退回邏輯
  async rejectProposal(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT i.*, b.title, b.category as bulletin_category, b.client_id as bulletin_client_id 
        FROM BulletinInquiries i 
        JOIN Bulletins b ON i.bulletin_id = b.id 
        WHERE i.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiryData) {
        return new Response(JSON.stringify({ success: false, message: '找不到該筆洽談單' }), { status: 404, headers: corsHeaders });
      }

      const isOffer = inquiryData.bulletin_category === 'offer';
      const actualClientId = isOffer ? inquiryData.artist_id : inquiryData.bulletin_client_id;
      const actualArtistId = isOffer ? inquiryData.bulletin_client_id : inquiryData.artist_id;

      if (currentUserId !== actualClientId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足：只有案主可以退回提案' }), { status: 403, headers: corsHeaders });
      }

      if (inquiryData.status !== 'proposed') {
        return new Response(JSON.stringify({ success: false, message: '當前狀態無法退回' }), { status: 400, headers: corsHeaders });
      }

      // 退回草稿狀態
      await env.commission_db.prepare(
        `UPDATE BulletinInquiries SET status = 'submitted', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(inquiryId).run();

      const msgId = crypto.randomUUID();
      const systemMsg = '【系統提示】委託人已將提案退回，請繪師重新確認合約規格與報價，修改後可再次送出。';
      await env.commission_db.prepare(
        `INSERT INTO InquiryMessages (id, inquiry_id, sender_id, content, message_type) VALUES (?, ?, ?, ?, 'text')`
      ).bind(msgId, inquiryId, currentUserId, systemMsg).run();

      const text = `⚠️ 委託人已將「${inquiryData.title || '未命名'}」的提案退回，請前往洽談室修改合約。`;
      await notificationController.createNotification(env, actualArtistId, 'inquiry_msg', text, `/inquiry/workspace/${inquiryId}`);

      return new Response(JSON.stringify({ success: true, message: '已成功退回提案' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};