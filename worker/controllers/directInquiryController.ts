// worker/controllers/directInquiryController.ts
import type { Env } from '../shared/types';
import { notificationController } from './notificationController';

export const directInquiryController = {
  async submitOrder(request: Request, currentUserId: string | null, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { showcase_id, artist_id, form_answers, guest_contact_info } = body;

      if (!showcase_id || !artist_id || !form_answers) {
        return new Response(JSON.stringify({ success: false, error: '缺少必要欄位' }), { status: 400, headers: corsHeaders });
      }

      let finalTosSnapshot = "（無特定協議內容）";
      
      const showcaseRow = await env.commission_db.prepare(`SELECT tos_content FROM ShowcaseItems WHERE id = ?`).bind(showcase_id).first<{ tos_content: string }>();
      if (showcaseRow && showcaseRow.tos_content) {
         finalTosSnapshot = showcaseRow.tos_content;
      } else {
         const profileRow = await env.commission_db.prepare(`SELECT tos_content FROM ArtistProfiles WHERE user_id = ?`).bind(artist_id).first<{ tos_content: string }>();
         if (profileRow && profileRow.tos_content) {
            finalTosSnapshot = profileRow.tos_content;
         }
      }

      const id = `di-${Date.now()}`;
      const isGuest = currentUserId === null;
      
      const dbClientId = isGuest ? 'guest' : currentUserId;
      const finalGuestContact = isGuest ? (guest_contact_info || '未提供聯絡方式') : null;

      if (isGuest) {
        await env.commission_db.prepare(`
          INSERT OR IGNORE INTO Users (id, public_id, line_id, display_name, role) 
          VALUES ('guest', 'guest_public_id', 'guest_line_id', '訪客', 'guest')
        `).run();
      }
      
      await env.commission_db.batch([
        env.commission_db.prepare(`
          INSERT INTO DirectInquiries (
            id, showcase_id, client_id, artist_id, form_answers, tos_snapshot, status, guest_contact_info
          ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        `).bind(id, showcase_id, dbClientId, artist_id, form_answers, finalTosSnapshot, finalGuestContact),
        
        env.commission_db.prepare(`
          UPDATE ShowcaseItems 
          SET current_orders_count = current_orders_count + 1 
          WHERE id = ?
        `).bind(showcase_id)
      ]);

      let clientName = '一位訪客';
      if (currentUserId) {
        const clientInfo = await env.commission_db.prepare("SELECT display_name FROM Users WHERE id = ?").bind(currentUserId).first() as any;
        if (clientInfo?.display_name) clientName = clientInfo.display_name;
      }
      
      await notificationController.createNotification(env, artist_id, 'inquiry_msg', `🛒 ${clientName} 透過您的個人頁面送出了新的委託申請！`, `/artist/inbox?type=direct&id=${id}`);

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getInboxList(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT d.*, 
               s.title as showcase_title,
               s.title as bulletin_title,
               COALESCE(c.client_id, d.client_id) as client_id,
               COALESCE(bu.display_name, u.display_name) as client_name, 
               COALESCE(bu.public_id, u.public_id) as client_public_id,
               c.id as commission_id
        FROM DirectInquiries d
        LEFT JOIN ShowcaseItems s ON d.showcase_id = s.id
        LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = d.id
        LEFT JOIN Users u ON d.client_id = u.id
        LEFT JOIN Users bu ON c.client_id = bu.id
        WHERE d.artist_id = ?
        ORDER BY d.created_at DESC
      `).bind(currentUserId).all();

      const formattedData = results.map((r: any) => ({
        ...r,
        client_id: r.client_id === 'guest' ? null : r.client_id
      }));

      return new Response(JSON.stringify({ success: true, data: formattedData }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getOutboundList(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT d.*, 
               s.title as showcase_title,
               s.title as bulletin_title,
               a.display_name as artist_name, 
               a.public_id as artist_public_id,
               COALESCE(c.client_id, d.client_id) as client_id,
               c.id as commission_id
        FROM DirectInquiries d
        LEFT JOIN ShowcaseItems s ON d.showcase_id = s.id
        LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = d.id
        LEFT JOIN Users a ON d.artist_id = a.id
        WHERE d.client_id = ? OR c.client_id = ?
        ORDER BY d.created_at DESC
      `).bind(currentUserId, currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

async getDetail(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
  try {
    const inquiry = await env.commission_db.prepare(`
      SELECT di.*, 
             s.title as showcase_title,
             a.profile_settings as artist_settings,
             a.plan_type as artist_plan, 
             a.pro_expires_at, 
             a.trial_end_at,
             a.display_name as artist_name,
             a.public_id as artist_public_id,
             COALESCE(c.client_id, di.client_id) as client_id,
             COALESCE(bu.display_name, u.display_name) as client_name,
             COALESCE(bu.public_id, u.public_id) as client_public_id,
             c.id as commission_id,
             c.contact_memo
      FROM DirectInquiries di
      JOIN ShowcaseItems s ON di.showcase_id = s.id
      JOIN Users a ON di.artist_id = a.id
      LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = di.id
      LEFT JOIN Users u ON di.client_id = u.id
      LEFT JOIN Users bu ON c.client_id = bu.id
      WHERE di.id = ?
    `).bind(inquiryId).first() as any;

    if (!inquiry) return new Response(JSON.stringify({ success: false, message: '找不到此訂單' }), { status: 404, headers: corsHeaders });

    if (inquiry.artist_id !== currentUserId && inquiry.client_id !== currentUserId) {
      return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
    }

    let quotaInfo = null;
    if (currentUserId === inquiry.artist_id) {
       const { results: countRes } = await env.commission_db.prepare(`
         SELECT COUNT(*) as count FROM Commissions 
         WHERE artist_id = ? AND status NOT IN ('completed', 'cancelled')
       `).bind(inquiry.artist_id).all();
       const used = countRes[0]?.count || 0;
       
       const isPro = inquiry.artist_plan === 'pro' && (!inquiry.pro_expires_at || new Date(inquiry.pro_expires_at) > new Date());
       const isTrial = inquiry.artist_plan === 'trial' && (!inquiry.trial_end_at || new Date(inquiry.trial_end_at) > new Date());
       const max = (isPro || isTrial) ? -1 : 3;
       
       quotaInfo = { used_quota: used, max_quota: max, plan_type: inquiry.artist_plan };
    }

    const updateField = currentUserId === inquiry.artist_id ? 'last_read_at_artist' : 'last_read_at_client';
    await env.commission_db.prepare(`UPDATE DirectInquiries SET ${updateField} = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

    const formattedInquiry = { ...inquiry, client_id: inquiry.client_id === 'guest' ? null : inquiry.client_id };

    return new Response(JSON.stringify({ success: true, data: formattedInquiry, quota: quotaInfo }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
  }
},

  async saveDraft(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      await env.commission_db.prepare(`UPDATE DirectInquiries SET negotiation_draft = ? WHERE id = ? AND artist_id = ?`)
        .bind(body.draft_json, inquiryId, currentUserId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(`
        SELECT COALESCE(c.client_id, di.client_id) as client_id, di.showcase_id 
        FROM DirectInquiries di
        LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = di.id
        WHERE di.id = ? AND di.artist_id = ?
      `).bind(inquiryId, currentUserId).first() as any;

      if (!inquiry) throw new Error('找不到訂單或權限不足');

      const artistInfo = await env.commission_db.prepare("SELECT plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?").bind(currentUserId).first() as any;
      const isPro = artistInfo?.plan_type === 'pro' && (!artistInfo.pro_expires_at || new Date(artistInfo.pro_expires_at) > new Date());
      const isTrial = artistInfo?.plan_type === 'trial' && (!artistInfo.trial_end_at || new Date(artistInfo.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND status NOT IN ('completed', 'cancelled')
         `).bind(currentUserId).all();
         
         const usedCount = (countRes[0]?.count as number) || 0;
         if (usedCount >= 3) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'QUOTA_EXCEEDED', 
              message: '您的活躍委託單已達免費版上限，請先結案舊訂單或升級專業版以繼續提案。' 
            }), { status: 403, headers: corsHeaders });
         }
      }

      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'proposed', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();
      
      if (inquiry.client_id && inquiry.client_id !== 'guest') {
        await notificationController.createNotification(env, inquiry.client_id, 'inquiry_msg', `🌟 繪師已送出正式的合作協議，請前往確認。`, `/inquiry/workspace/${inquiryId}`);
      }
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async finalizeOrder(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT di.*, s.title as showcase_title 
        FROM DirectInquiries di JOIN ShowcaseItems s ON di.showcase_id = s.id 
        WHERE di.id = ? AND di.client_id = ?
      `).bind(inquiryId, currentUserId).first() as any;

      if (!inquiryData || !inquiryData.negotiation_draft) throw new Error('無法成單：草稿未準備好或權限不足');

      const draft = JSON.parse(inquiryData.negotiation_draft);
      const commissionId = `CM-${Date.now().toString().slice(-6)}`;
      const clientName = "案主"; 

      const origin_source = JSON.stringify({
        source_type: 'showcase_form',
        inquiry_id: inquiryId,
        showcase_title: inquiryData.showcase_title,
        form_answers: JSON.parse(inquiryData.form_answers || '[]'),
        final_negotiation_draft: draft
      });

      await env.commission_db.prepare(`
        INSERT OR IGNORE INTO CommissionTypes (id, artist_id, name, base_price, estimated_days, is_active) 
        VALUES ('type-01', ?, '預設委託類型', 0, 7, 1)
      `).bind(inquiryData.artist_id).run();

      await env.commission_db.prepare(`
        INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, contact_memo, total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons, agreed_memo, delivery_method, workflow_mode, agreed_tos_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard', ?)
      `).bind(
        commissionId, currentUserId, inquiryData.artist_id, 'type-01', draft.project_name || inquiryData.showcase_title, clientName,
        draft.total_price || 0, origin_source, draft.usage_type || '', draft.is_rush || '否', draft.draw_scope || '', draft.char_count || 1,
        draft.bg_type || '', draft.add_ons || '', draft.agreed_memo || '', inquiryData.tos_snapshot || ''
      ).run();

      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'accepted' WHERE id = ?`).bind(inquiryId).run();
      await notificationController.createNotification(env, inquiryData.artist_id, 'inquiry_msg', `🌟 恭喜！案主已同意協議，委託單正式成立！`, `/artist/notebook`);

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async convertToFreeMode(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT di.*, s.title as showcase_title 
        FROM DirectInquiries di LEFT JOIN ShowcaseItems s ON di.showcase_id = s.id 
        WHERE di.id = ? AND di.artist_id = ?
      `).bind(inquiryId, currentUserId).first() as any;

      if (!inquiryData) throw new Error('找不到該訂單或權限不足');

      const artistInfo = await env.commission_db.prepare("SELECT plan_type, pro_expires_at, trial_end_at FROM Users WHERE id = ?").bind(currentUserId).first() as any;
      const isPro = artistInfo?.plan_type === 'pro' && (!artistInfo.pro_expires_at || new Date(artistInfo.pro_expires_at) > new Date());
      const isTrial = artistInfo?.plan_type === 'trial' && (!artistInfo.trial_end_at || new Date(artistInfo.trial_end_at) > new Date());
      
      if (!isPro && !isTrial) {
         const { results: countRes } = await env.commission_db.prepare(`
            SELECT COUNT(*) as count FROM Commissions 
            WHERE artist_id = ? AND status NOT IN ('completed', 'cancelled')
         `).bind(currentUserId).all();
         
         const usedCount = (countRes[0]?.count as number) || 0;
         if (usedCount >= 3) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: 'QUOTA_EXCEEDED', 
              message: '您的活躍委託單已達免費版上限，無法轉為自由單。請先結案舊訂單或升級專業版。' 
            }), { status: 403, headers: corsHeaders });
         }
      }

      const commissionId = `CM-${Date.now().toString().slice(-6)}`;
      
      const origin_source = JSON.stringify({
        source_type: 'showcase_form',
        is_guest: inquiryData.client_id === 'guest', 
        inquiry_id: inquiryId,
        showcase_title: inquiryData.showcase_title,
        form_answers: JSON.parse(inquiryData.form_answers || '[]')
      });

      await env.commission_db.prepare(`
        INSERT OR IGNORE INTO CommissionTypes (id, artist_id, name, base_price, estimated_days, is_active) 
        VALUES ('type-01', ?, '預設委託類型', 0, 7, 1)
      `).bind(currentUserId).run();

      await env.commission_db.prepare(`
        INSERT INTO Commissions (
          id, artist_id, type_id, project_name, contact_memo, total_price, status, origin_source, 
          workflow_mode
        ) VALUES (?, ?, 'type-01', ?, '訪客委託', 0, 'unpaid', ?, 'free')
      `).bind(
        commissionId, currentUserId, inquiryData.showcase_title || '訪客委託單', origin_source
      ).run();

      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'accepted' WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async decline(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'declined' WHERE id = ?`).bind(inquiryId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async restore(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'pending' WHERE id = ?`).bind(inquiryId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async getMessages(inquiryId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT id, sender_id, content, created_at, 'direct_inquiry' as source
        FROM DirectInquiryMessages 
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

      const inquiry = await env.commission_db.prepare(`
        SELECT di.artist_id, 
               COALESCE(c.client_id, di.client_id) as client_id, 
               s.title
        FROM DirectInquiries di
        LEFT JOIN ShowcaseItems s ON di.showcase_id = s.id
        LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = di.id
        WHERE di.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiry) {
         return new Response(JSON.stringify({ success: false, message: '找不到此洽談單' }), { status: 404, headers: corsHeaders });
      }

      if (inquiry.artist_id !== currentUserId && inquiry.client_id !== currentUserId) {
         return new Response(JSON.stringify({ success: false, message: '權限不足：您非此洽談單之參與者' }), { status: 403, headers: corsHeaders });
      }

      const id = crypto.randomUUID();
      
      await env.commission_db.prepare(`INSERT INTO DirectInquiryMessages (id, inquiry_id, sender_id, content) VALUES (?, ?, ?, ?)`).bind(id, inquiryId, currentUserId, body.content).run();
      await env.commission_db.prepare(`UPDATE DirectInquiries SET latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      const isArtist = currentUserId === inquiry.artist_id;
      const targetUserId = isArtist ? inquiry.client_id : inquiry.artist_id;

      if (targetUserId && targetUserId !== 'guest') {
        const projectTitle = inquiry.title || '客製化委託';
        await notificationController.createNotification(
          env, 
          targetUserId, 
          'inquiry_msg', 
          `💬 洽談室「${projectTitle}」有新的聊天訊息。`, 
          `/inquiry/workspace/${inquiryId}`
        );
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async rejectProposal(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiryData = await env.commission_db.prepare(`
        SELECT di.*, COALESCE(c.client_id, di.client_id) as actual_client_id 
        FROM DirectInquiries di
        LEFT JOIN Commissions c ON json_extract(c.origin_source, '$.inquiry_id') = di.id
        WHERE di.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiryData) {
        return new Response(JSON.stringify({ success: false, message: '找不到該筆洽談單' }), { status: 404, headers: corsHeaders });
      }

      if (inquiryData.actual_client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足：只有案主可以退回提案' }), { status: 403, headers: corsHeaders });
      }

      if (inquiryData.status !== 'proposed') {
        return new Response(JSON.stringify({ success: false, message: '當前狀態無法退回' }), { status: 400, headers: corsHeaders });
      }

      await env.commission_db.prepare(
        `UPDATE DirectInquiries SET status = 'pending', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(inquiryId).run();

      const text = `⚠️ 委託人已將「${inquiryData.showcase_title || '客製化委託'}」的提案退回，請前往洽談室修改合約。`;
      try {
        const { notificationController } = await import('./notificationController');
        await notificationController.createNotification(env, inquiryData.artist_id, 'inquiry_msg', text, `/inquiry/workspace/${inquiryId}`);
      } catch (e) {}

      return new Response(JSON.stringify({ success: true, message: '已成功退回提案' }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};