// worker/controllers/directInquiryController.ts
import type { Env } from '../shared/types';
import { notificationController } from './notificationController';

export const directInquiryController = {
  // 1. 委託人從個人頁送出客製化表單
  async submitOrder(request: Request, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const { showcase_id, artist_id, form_answers, tos_snapshot } = body;

      if (!showcase_id || !artist_id || !form_answers) {
        return new Response(JSON.stringify({ success: false, error: '缺少必要欄位' }), { status: 400, headers: corsHeaders });
      }

      const id = `di-${Date.now()}`;
      
      await env.commission_db.prepare(`
        INSERT INTO DirectInquiries (
          id, showcase_id, client_id, artist_id, form_answers, tos_snapshot, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `).bind(id, showcase_id, currentUserId, artist_id, form_answers, tos_snapshot || '').run();

      // 通知繪師
      const clientInfo = await env.commission_db.prepare("SELECT display_name FROM Users WHERE id = ?").bind(currentUserId).first() as any;
      const clientName = clientInfo?.display_name || '某位委託人';
      await notificationController.createNotification(env, artist_id, 'inquiry_msg', `🛒 ${clientName} 透過您的個人頁面送出了新的委託申請！`, `/inbox`);

      return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2. 繪師讀取收件匣 (Inbox)
  async getInboxList(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT di.*, u.display_name as client_name, s.title as showcase_title
        FROM DirectInquiries di
        JOIN Users u ON di.client_id = u.id
        LEFT JOIN ShowcaseItems s ON di.showcase_id = s.id
        WHERE di.artist_id = ?
        ORDER BY di.created_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 2.5 委託人讀取自己送出的客製表單 (Outbound)
  async getOutboundList(currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT di.*, u.display_name as artist_name, s.title as showcase_title
        FROM DirectInquiries di
        JOIN Users u ON di.artist_id = u.id
        LEFT JOIN ShowcaseItems s ON di.showcase_id = s.id
        WHERE di.client_id = ?
        ORDER BY di.created_at DESC
      `).bind(currentUserId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 3. 進入洽談室取得詳細資訊
  async getDetail(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(`
        SELECT di.*, s.title as bulletin_title, a.profile_settings as artist_settings
        FROM DirectInquiries di
        JOIN ShowcaseItems s ON di.showcase_id = s.id
        JOIN Users a ON di.artist_id = a.id
        WHERE di.id = ?
      `).bind(inquiryId).first() as any;

      if (!inquiry) return new Response(JSON.stringify({ success: false, message: '找不到此訂單' }), { status: 404, headers: corsHeaders });

      if (inquiry.artist_id !== currentUserId && inquiry.client_id !== currentUserId) {
        return new Response(JSON.stringify({ success: false, message: '權限不足' }), { status: 403, headers: corsHeaders });
      }

      // 更新已讀時間
      const updateField = currentUserId === inquiry.artist_id ? 'last_read_at_artist' : 'last_read_at_client';
      await env.commission_db.prepare(`UPDATE DirectInquiries SET ${updateField} = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();

      return new Response(JSON.stringify({ success: true, data: inquiry }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 4. 繪師儲存草稿
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

  // 5. 繪師提出正式提案
  async proposeAgreement(inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const inquiry = await env.commission_db.prepare(`SELECT client_id, showcase_id FROM DirectInquiries WHERE id = ? AND artist_id = ?`).bind(inquiryId, currentUserId).first() as any;
      if (!inquiry) throw new Error('找不到訂單或權限不足');

      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'proposed', latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();
      await notificationController.createNotification(env, inquiry.client_id, 'inquiry_msg', `🌟 繪師已送出正式的合作協議，請前往確認。`, `/inquiry/workspace/${inquiryId}`);
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 6. 委託人確認並正式建立訂單 (轉入 Commissions)
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
      const clientName = "案主"; // 實務上可再 JOIN Users 表抓取名字

      // 將個人頁客製表單打包成 Notebook 支援的格式
      const origin_source = JSON.stringify({
        source_type: 'showcase_form',
        inquiry_id: inquiryId,
        showcase_title: inquiryData.showcase_title,
        form_answers: JSON.parse(inquiryData.form_answers || '[]'),
        final_negotiation_draft: draft
      });

      // 正式建立訂單
      await env.commission_db.prepare(`
        INSERT INTO Commissions (
          id, client_id, artist_id, type_id, project_name, contact_memo, total_price, status, origin_source, 
          usage_type, is_rush, draw_scope, char_count, bg_type, add_ons, delivery_method, workflow_mode, agreed_tos_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?, ?, ?, ?, ?, ?, '三階段審閱', 'standard', ?)
      `).bind(
        commissionId, currentUserId, inquiryData.artist_id, 'type-01', draft.project_name || inquiryData.showcase_title, clientName,
        draft.total_price || 0, origin_source, draft.usage_type || '', draft.is_rush || '否', draft.draw_scope || '', draft.char_count || 1,
        draft.bg_type || '', draft.add_ons || '', inquiryData.tos_snapshot || ''
      ).run();

      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'accepted' WHERE id = ?`).bind(inquiryId).run();
      await notificationController.createNotification(env, inquiryData.artist_id, 'inquiry_msg', `🌟 恭喜！案主已同意協議，委託單正式成立！`, `/artist/notebook`);

      return new Response(JSON.stringify({ success: true, commission_id: commissionId }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 7. 婉拒申請
  async decline(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`UPDATE DirectInquiries SET status = 'declined' WHERE id = ?`).bind(inquiryId).run();
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  // 8. 獲取與發送聊天訊息
  async getMessages(inquiryId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`SELECT * FROM DirectInquiryMessages WHERE inquiry_id = ? ORDER BY created_at ASC`).bind(inquiryId).all();
      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async sendMessage(request: Request, inquiryId: string, currentUserId: string, env: Env, corsHeaders: any) {
    try {
      const body = await request.json() as any;
      const id = crypto.randomUUID();
      
      await env.commission_db.prepare(`INSERT INTO DirectInquiryMessages (id, inquiry_id, sender_id, content) VALUES (?, ?, ?, ?)`).bind(id, inquiryId, currentUserId, body.content).run();
      await env.commission_db.prepare(`UPDATE DirectInquiries SET latest_update_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(inquiryId).run();
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};