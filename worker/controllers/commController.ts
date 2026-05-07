// worker/controllers/commController.ts
import type { Env, CreateCommissionBody } from "../shared/types";
import { sanitizeAndLimit, limitRichText, isValidSafeUrl } from "../utils/security";
import { notificationController } from './notificationController'; 

const createJsonResponse = (body: any, status: number, corsHeaders: HeadersInit) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json;charset=UTF-8'
    }
  });
};

async function syncToCRM(env: Env, artistId: string, clientId: string, clientDisplayName: string) {
  try {
    const clientInfo = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(clientId).first<{ public_id: string }>();
    const clientPublicId = clientInfo?.public_id || '';

    const existing = await env.commission_db.prepare(`
      SELECT id, client_user_id FROM CustomerRecords 
      WHERE artist_id = ? AND (client_user_id = ? OR (public_id = ? AND client_user_id IS NULL))
    `).bind(artistId, clientId, clientPublicId).first<any>();

    if (existing) {
      if (!existing.client_user_id) {
        await env.commission_db.prepare(
          "UPDATE CustomerRecords SET client_user_id = ? WHERE id = ?"
        ).bind(clientId, existing.id).run();
      }
      return;
    }

    const newId = crypto.randomUUID();
    const safeDisplayName = sanitizeAndLimit(clientDisplayName, 50);
    
    await env.commission_db.prepare(`
      INSERT INTO CustomerRecords (id, artist_id, client_user_id, public_id, alias_name, custom_label, short_note, full_note, contact_methods)
      VALUES (?, ?, ?, ?, ?, '一般', '', '', '[]')
    `).bind(newId, artistId, clientId, clientPublicId, safeDisplayName).run();
    
  } catch (err) {
    console.error("CRM 同步靜默失敗:", err);
  }
}

export const commController = {
  async getList(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const query = `
      SELECT 
        c.*, 
        u.display_name AS client_name, 
        u.public_id AS client_public_id, 
        a.public_id AS artist_public_id, -- 🌟 關鍵新增：撈出繪師的 public_id
        t.name AS type_name,
        cr.custom_label AS client_custom_label,
        cr.id AS crm_record_id,
        (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
      FROM Commissions c
      LEFT JOIN Users u ON c.client_id = u.id
      LEFT JOIN Users a ON c.artist_id = a.id -- 🌟 關鍵新增：關聯出繪師的資料
      LEFT JOIN CommissionTypes t ON c.type_id = t.id
      LEFT JOIN CustomerRecords cr ON (c.artist_id = cr.artist_id AND c.client_id = cr.client_user_id)
      WHERE c.artist_id = ? OR c.client_id = ?
      ORDER BY c.order_date DESC
    `;
    const { results } = await env.commission_db.prepare(query).bind(currentUserId, currentUserId).all();
    return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
  },

  async getDetail(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results } = await env.commission_db.prepare(`
      SELECT 
        c.*, 
        u.display_name AS client_name, 
        u.public_id AS client_public_id, 
        a.public_id AS artist_public_id, -- 🌟 關鍵新增：撈出繪師的 public_id
        t.name AS type_name, 
        a.profile_settings AS artist_settings,
        cr.custom_label AS client_custom_label,
        cr.id AS crm_record_id,
        cr.short_note AS client_crm_note,
        (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
      FROM Commissions c
      LEFT JOIN Users u ON c.client_id = u.id
      LEFT JOIN Users a ON c.artist_id = a.id
      LEFT JOIN CommissionTypes t ON c.type_id = t.id
      LEFT JOIN CustomerRecords cr ON (c.artist_id = cr.artist_id AND c.client_id = cr.client_user_id)
      WHERE c.id = ?
    `).bind(id).all();

    if (results.length === 0) return createJsonResponse({ success: false, message: "找不到此委託單" }, 404, corsHeaders);
    const commission = results[0] as any;
    const isArtist = currentUserId === commission.artist_id;
    const isClient = currentUserId === commission.client_id;
    const isPublicQuote = !commission.client_id && (commission.status === 'quote_created' || commission.status === 'unpaid');
    if (!isArtist && !isClient && !isPublicQuote) return createJsonResponse({ success: false, error: "無權存取" }, 403, corsHeaders);
    return createJsonResponse({ success: true, data: commission }, 200, corsHeaders);
  },

  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const user = await env.commission_db.prepare("SELECT plan_type, role FROM Users WHERE id = ?").bind(currentUserId).first<any>();
    
    if (!user) return createJsonResponse({ success: false, error: "找不到使用者資料" }, 404, corsHeaders);
    if (user.role === 'deleted') return createJsonResponse({ success: false, error: "帳號已停用" }, 403, corsHeaders);

    const { results: totalRes } = await env.commission_db.prepare("SELECT COUNT(*) as total FROM Commissions WHERE artist_id = ?").bind(currentUserId).all();
    const totalCount = (totalRes[0]?.total as number) || 0;

    const planLimits: Record<string, number> = { 'free': 3, 'trial': 20, 'pro': 999999 };
    const currentLimit = planLimits[user.plan_type as string] || 3;

    if (user.plan_type !== 'pro' && totalCount >= currentLimit) {
      return createJsonResponse({ success: false, error: "免費版本已達上限" }, 403, corsHeaders);
    }

    const body: CreateCommissionBody = await request.json();

    const legacyTypeId = 'type-01';

    let newOrderId = body.is_external ? `EX-${Date.now().toString().slice(-6)}` : `${Date.now().toString().slice(-6)}`;
    const clientId = body.client_id || '';

    if (!body.is_external && clientId) {
      const { results: publicRes } = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(clientId).all();
      if (publicRes.length > 0) newOrderId = `${publicRes[0].public_id as string}-${Date.now().toString().slice(-3)}`;
    }
    
    await env.commission_db.batch([
      env.commission_db.prepare(`
        INSERT INTO Commissions (
          id, artist_id, type_id, client_id, is_paid, artist_note, contact_memo,
          total_price, status, payment_status, current_stage, is_external,
          project_name, usage_type, is_rush, delivery_method, payment_method,
          draw_scope, char_count, bg_type, add_ons, detailed_settings, workflow_mode, agreed_tos_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newOrderId, currentUserId, legacyTypeId, clientId || null, 0,
        '', sanitizeAndLimit(body.client_name || '未知', 100), body.total_price || 0,
        body.workflow_mode === 'free' ? 'unpaid' : (body.is_external ? 'paid' : 'quote_created'),
        body.is_external ? 'paid' : 'unpaid', 'sketch_drawing', body.is_external ? 1 : 0,
        sanitizeAndLimit(body.project_name, 255), sanitizeAndLimit(body.usage_type, 100), sanitizeAndLimit(body.is_rush, 50),
        sanitizeAndLimit(body.delivery_method, 100), sanitizeAndLimit(body.payment_method, 100),
        sanitizeAndLimit(body.draw_scope, 100), body.char_count, sanitizeAndLimit(body.bg_type, 100),
        sanitizeAndLimit(body.add_ons, 1000), sanitizeAndLimit(body.detailed_settings, 10000), sanitizeAndLimit(body.workflow_mode, 50) || 'standard',
        limitRichText(body.agreed_tos_snapshot, 10000) || '' 
      ),
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'create', '繪師已建立委託單')").bind(crypto.randomUUID(), newOrderId)
    ]);
    
    if (!body.is_external && clientId) {
       await notificationController.createNotification(env, String(clientId), 'commission_msg', `🌟 繪師已為您建立專屬委託單「${body.project_name || newOrderId}」`, `/client/orders?open=${newOrderId}`);
    }
    
    return createJsonResponse({ success: true, id: newOrderId }, 200, corsHeaders);
  },

  async update(request: Request, id: string, currentUserId: string | null, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: Record<string, any> = await request.json();
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id, status FROM Commissions WHERE id = ?").bind(id).all();
    if (check.length === 0) return createJsonResponse({ success: false, error: "找不到該單據" }, 404, corsHeaders);
    const comm = check[0] as any;

    let isBinding = false;
    if (!comm.client_id && currentUserId) {
      if (body.status === 'unpaid' || body.action === 'bind' || body.last_read_at_client !== undefined) {
        isBinding = true;
        body.client_id = currentUserId; 
        if (comm.status === 'quote_created' && !body.status) body.status = 'unpaid';
      }
    }

    if (!isBinding && currentUserId !== comm.artist_id && currentUserId !== comm.client_id) {
      return createJsonResponse({ success: false, error: "權限不足" }, 403, corsHeaders);
    }

    const updates: string[] = [];
    const params: any[] = [];
    // 🛡️ 漏洞修復：將 contact_memo 加回白名單，並限制長度為 100 字元
    const fieldLimits: Record<string, number> = {
      'status': 50, 'payment_status': 50, 'client_id': 100, 'project_name': 255, 'detailed_settings': 10000, 
      'usage_type': 100, 'is_rush': 50, 'delivery_method': 100, 'payment_method': 100, 
      'draw_scope': 100, 'bg_type': 100, 'add_ons': 1000, 'current_stage': 50, 'end_date': 50, 
      'artist_note': 5000, 'workflow_mode': 50, 'queue_status': 100, 'client_custom_title': 100,
      'agreed_tos_snapshot': 10000, 'contact_memo': 100 // 👉 補上這一行
    };
    
    for (const key in fieldLimits) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(key === 'agreed_tos_snapshot' ? limitRichText(body[key], fieldLimits[key]) : (typeof body[key] === 'string' ? sanitizeAndLimit(body[key], fieldLimits[key]) : body[key]));
      }
    }
    
    const specialFields = ['total_price', 'char_count', 'last_read_at_artist', 'last_read_at_client'];
    for (const key of specialFields) {
        if (body[key] !== undefined) { updates.push(`${key} = ?`); params.push(body[key]); }
    }

    if (updates.length > 0 || isBinding) {
      params.push(id);
      const batch = [env.commission_db.prepare(`UPDATE Commissions SET ${updates.join(", ")} WHERE id = ?`).bind(...params)];
      
      if (isBinding) {
        batch.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'bind', '委託人已成功綁定訂單')").bind(crypto.randomUUID(), id));
        
        const userProfile = await env.commission_db.prepare("SELECT display_name FROM Users WHERE id = ?")
          .bind(currentUserId)
          .first<{ display_name: string }>();
        
        const clientNickname = userProfile?.display_name || '未知客戶';
        await syncToCRM(env, comm.artist_id, currentUserId!, clientNickname);
        
        await notificationController.createNotification(env, String(comm.artist_id), 'commission_msg', `🌟 委託人已成功登入並綁定委託單「${body.project_name || id}」`, `/artist/notebook?id=${id}`);
      }
      
      await env.commission_db.batch(batch);
    }
    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getDeliverables(id: string, pathType: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (check[0]?.client_id && currentUserId !== check[0]?.client_id && currentUserId !== check[0]?.artist_id) {
      return createJsonResponse({ success: false, error: "無權限查看進度" }, 403, corsHeaders);
    }

    const { results: logs } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
    const { results: submissions } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
    
    if (pathType === "deliverables") {
      return createJsonResponse({ success: true, data: { logs, submissions } }, 200, corsHeaders);
    } else if (pathType === "submissions") {
      return createJsonResponse({ success: true, data: submissions }, 200, corsHeaders);
    } else {
      return createJsonResponse({ success: true, data: logs }, 200, corsHeaders);
    }
  },

  async submitArtwork(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { stage: string; file_url: string } = await request.json();
    if (!isValidSafeUrl(body.file_url) && !body.file_url.includes('|')) return createJsonResponse({ success: false, error: "不安全的檔案網址" }, 400, corsHeaders);

    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name, current_stage, workflow_mode FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length === 0) return createJsonResponse({ success: false, error: "找不到委託單" }, 404, corsHeaders);
    if (currentUserId !== comm[0].artist_id) return createJsonResponse({ success: false, error: "無權限上傳" }, 403, corsHeaders);
    
    const { results } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Submissions WHERE commission_id = ? AND stage = ?").bind(id, body.stage).all();
    const version = ((results[0]?.count as number) || 0) + 1;
    const newStageStatus = comm[0].workflow_mode === 'free' ? comm[0].current_stage : `${body.stage}_reviewing`; 
    const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';

    await env.commission_db.batch([
      env.commission_db.prepare("INSERT INTO Submissions (id, commission_id, stage, file_url, version) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, body.stage, body.file_url, version),
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'upload', ?)").bind(crypto.randomUUID(), id, `繪師已上傳 ${stageNameCH} (v${version})`),
      env.commission_db.prepare("UPDATE Commissions SET current_stage = ?, latest_message_at = CURRENT_TIMESTAMP WHERE id = ?").bind(newStageStatus, id),
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提交 ${stageNameCH} 供您審閱。`)
    ]);

    
    if (comm[0].client_id) {
       await notificationController.createNotification(env, String(comm[0].client_id), 'commission_msg', `📝 繪師已上傳「${comm[0].project_name || id}」的 ${stageNameCH} 供您確認。`, `/client/orders?open=${id}`);
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async reviewArtwork(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { stage: string; action: 'approve' | 'reject' | 'read_only'; comment?: string } = await request.json();
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length === 0) return createJsonResponse({ success: false, error: "找不到單據" }, 404, corsHeaders);
    
    const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';
    let nextStageStatus = '';
    let logMsg = '';

    if (body.action === 'reject') {
      nextStageStatus = `${body.stage}_drawing`;
      logMsg = `委託人請求修改 ${stageNameCH}：${sanitizeAndLimit(body.comment || '無備註', 1000)}`;
    } else {
      nextStageStatus = body.stage === 'sketch' ? 'lineart_drawing' : (body.stage === 'lineart' ? 'final_drawing' : 'completed');
      logMsg = body.action === 'read_only' ? `委託人已閱覽 ${stageNameCH}` : `委託人已同意 ${stageNameCH}`;
    }

    let globalStatusUpdate = nextStageStatus === 'completed' ? 'completed' : '';
    
    let batchOps = [
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'review', ?)").bind(crypto.randomUUID(), id, logMsg),
      env.commission_db.prepare("UPDATE Commissions SET current_stage = ?, latest_message_at = CURRENT_TIMESTAMP WHERE id = ?").bind(nextStageStatus, id),
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] ${logMsg}`)
    ];
    if (globalStatusUpdate) batchOps.push(env.commission_db.prepare("UPDATE Commissions SET status = ? WHERE id = ?").bind(globalStatusUpdate, id));
    
    await env.commission_db.batch(batchOps);

    const text = body.action === 'reject' 
      ? `📝 委託人針對「${comm[0].project_name || id}」的 ${stageNameCH} 提出了修改請求。` 
      : `🌟 委託人已確認「${comm[0].project_name || id}」的 ${stageNameCH}。`;
    await notificationController.createNotification(env, String(comm[0].artist_id), 'commission_msg', text, `/artist/notebook?id=${id}&tab=delivery`);

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async changeRequest(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { changes } = await request.json() as any;
    
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length === 0) return createJsonResponse({ success: false, error: "找不到單據" }, 404, corsHeaders);

    await env.commission_db.batch([
      env.commission_db.prepare("UPDATE Commissions SET pending_changes = ? WHERE id = ?").bind(JSON.stringify(changes), id),
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'change_request', '繪師提交了規格異動申請')").bind(crypto.randomUUID(), id)
    ]);
    
    if (comm[0].client_id) {
       await notificationController.createNotification(env, String(comm[0].client_id), 'commission_change', `📝 繪師針對委託單「${comm[0].project_name || id}」提出了合約異動申請。`, `/client/orders?open=${id}`);
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async respondToChange(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { action } = await request.json() as any;
    const { results } = await env.commission_db.prepare("SELECT pending_changes, artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = results as any[];
    if (!comm[0]?.pending_changes) return createJsonResponse({ success: false, error: "無待處理申請" }, 400, corsHeaders);

    const changes = JSON.parse(comm[0].pending_changes as string);
    const logMsg = action === 'approve' ? '委託人已同意規格異動' : '委託人已拒絕規格異動';

    if (action === 'approve') {
      const updates: string[] = [];
      const params: any[] = [];
      for (const key in changes) {
        updates.push(`${key} = ?`);
        params.push(changes[key]);
      }
      params.push(id);
      await env.commission_db.batch([
        env.commission_db.prepare(`UPDATE Commissions SET ${updates.join(", ")}, pending_changes = NULL WHERE id = ?`).bind(...params),
        env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'change_approve', ?)").bind(crypto.randomUUID(), id, logMsg)
      ]);
    } else {
      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE Commissions SET pending_changes = NULL WHERE id = ?").bind(id),
        env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'change_reject', ?)").bind(crypto.randomUUID(), id, logMsg)
      ]);
    }

    const text = action === 'approve' 
       ? `🌟 委託人已同意「${comm[0].project_name || id}」的合約異動。`
       : `📝 委託人拒絕了「${comm[0].project_name || id}」的合約異動。`;
    await notificationController.createNotification(env, String(comm[0].artist_id), 'commission_change', text, `/artist/notebook?id=${id}&tab=details`);

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getMessages(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
    return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
  },

  async postMessage(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { sender_role: string; content: string } = await request.json();
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { results: recentMsgs } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM Messages 
      WHERE commission_id = ? AND sender_role = ? AND datetime(created_at) >= datetime(?)
    `).bind(id, body.sender_role, oneMinuteAgo).all();

    if (((recentMsgs[0]?.count as number) || 0) >= 30) {
      return createJsonResponse({ success: false, error: "發送訊息過於頻繁，請稍後再試。" }, 429, corsHeaders);
    }

    const msgId = crypto.randomUUID();
    const cleanContent = sanitizeAndLimit(body.content, 10000);
    
    await env.commission_db.batch([
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(msgId, id, body.sender_role, cleanContent),
      env.commission_db.prepare("UPDATE Commissions SET latest_message_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
    ]);
    
    
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length > 0) {
       const targetUserId = body.sender_role === 'artist' ? comm[0].client_id : comm[0].artist_id;
       const roleQuery = body.sender_role === 'artist' ? '' : '?role=artist';
       
       if (targetUserId) {
         await notificationController.createNotification(env, String(targetUserId), 'commission_msg', `💬 工作區「${comm[0].project_name || id}」有新的聊天訊息。`, `/workspace/${id}${roleQuery}`);
       }
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getPayments(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
    return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
  },

  async postPayment(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { record_date: string; item_name: string; amount: number } = await request.json();
    
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { results: recentPayments } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM PaymentRecords 
      WHERE commission_id = ? AND datetime(created_at) >= datetime(?)
    `).bind(id, oneMinuteAgo).all();

    if (((recentPayments[0]?.count as number) || 0) >= 5) {
      return createJsonResponse({ success: false, error: "新增帳目頻率過高，請稍後再試。" }, 429, corsHeaders);
    }

    await env.commission_db.prepare("INSERT INTO PaymentRecords (id, commission_id, record_date, item_name, amount) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, body.record_date, body.item_name, body.amount).run();
    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async deletePayment(paymentId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getPublicQueue(artistId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const artist = await env.commission_db.prepare("SELECT id FROM Users WHERE id = ? OR public_id = ?").bind(artistId, artistId).first<{id: string}>();
      
      if (!artist) {
        return createJsonResponse({ success: true, data: [] }, 200, corsHeaders);
      }

      const query = `
        SELECT 
          c.id, 
          c.contact_memo, 
          c.project_name, 
          c.queue_status, 
          c.end_date, 
          c.order_date,
          u.public_id AS client_public_id
        FROM Commissions c
        LEFT JOIN Users u ON c.client_id = u.id
        WHERE c.artist_id = ? AND c.status NOT IN ('completed', 'cancelled')
        ORDER BY c.order_date ASC
      `;
      const { results } = await env.commission_db.prepare(query).bind(artist.id).all();
      return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
    } catch (e) {
      console.error("無法讀取公開排單表:", e);
      return createJsonResponse({ success: false, error: "無法讀取排單表" }, 500, corsHeaders);
    }
  }
};