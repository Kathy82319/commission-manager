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

// 🌟 新增：匿名遮蔽函式 (保留頭尾，中間用星號取代)
const getMaskedName = (name: string) => {
  if (!name) return '匿名委託';
  const len = name.length;
  if (len <= 1) return name;
  if (len === 2) return name[0] + '*';
  return name[0] + '*'.repeat(len - 2) + name[len - 1];
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
        a.public_id AS artist_public_id,
        t.name AS type_name,
        cr.custom_label AS client_custom_label,
        cr.id AS crm_record_id,
        (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
      FROM Commissions c
      LEFT JOIN Users u ON c.client_id = u.id
      LEFT JOIN Users a ON c.artist_id = a.id
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
        a.public_id AS artist_public_id,
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
       await notificationController.createNotification(env, String(clientId), 'commission_msg', `🌟 繪師已為您建立專屬委託單「${body.project_name || newOrderId}」`, `/client/orders?id=${newOrderId}`);
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
    
    const fieldLimits: Record<string, number> = {
      'status': 50, 'payment_status': 50, 'client_id': 100, 'project_name': 255, 'detailed_settings': 10000, 
      'usage_type': 100, 'is_rush': 50, 'delivery_method': 100, 'payment_method': 100, 
      'draw_scope': 100, 'bg_type': 100, 'add_ons': 1000, 'current_stage': 50, 'start_date': 50, 'end_date': 50, 
      'artist_note': 5000, 'workflow_mode': 50, 'queue_status': 100, 'client_custom_title': 100,
      'agreed_tos_snapshot': 10000, 'contact_memo': 100 
    };

    const isArtist = currentUserId === comm.artist_id;
    const isClient = currentUserId === comm.client_id;
    
    const clientAllowedFields = ['client_custom_title', 'contact_memo'];
    const specialFields = ['total_price', 'char_count', 'last_read_at_artist', 'last_read_at_client'];

    for (const key in fieldLimits) {
      if (body[key] !== undefined) {
        if (isBinding && key === 'client_id') {
          updates.push(`${key} = ?`);
          params.push(sanitizeAndLimit(body[key], fieldLimits[key]));
        } else if (isArtist && !clientAllowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          params.push(key === 'agreed_tos_snapshot' ? limitRichText(body[key], fieldLimits[key]) : (typeof body[key] === 'string' ? sanitizeAndLimit(body[key], fieldLimits[key]) : body[key]));
        } else if (isClient && clientAllowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          params.push(typeof body[key] === 'string' ? sanitizeAndLimit(body[key], fieldLimits[key]) : body[key]);
        }
      }
    }
    
    for (const key of specialFields) {
      if (body[key] !== undefined) { 
        if (key === 'last_read_at_artist' && isArtist) {
          updates.push(`${key} = ?`); params.push(body[key]);
        } else if (key === 'last_read_at_client' && (isClient || isBinding)) {
          updates.push(`${key} = ?`); params.push(body[key]);
        } else if ((key === 'total_price' || key === 'char_count') && isArtist) {
          updates.push(`${key} = ?`); params.push(body[key]);
        }
      }
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
        
        await notificationController.createNotification(env, String(comm.artist_id), 'commission_msg', `🌟 委託人已成功登入並綁定委託單「${body.project_name || id}」`, `/artist/notebook?id=${id}&tab=details`);
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
       await notificationController.createNotification(env, String(comm[0].client_id), 'commission_msg', `📝 繪師已上傳「${comm[0].project_name || id}」的 ${stageNameCH} 供您確認。`, `/client/orders?id=${id}&tab=review`);
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async reviewArtwork(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { stage: string; action: 'approve' | 'reject' | 'read_only'; comment?: string } = await request.json();
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length === 0) return createJsonResponse({ success: false, error: "找不到單據" }, 404, corsHeaders);
    
    if (currentUserId !== comm[0].client_id) {
      return createJsonResponse({ success: false, error: "無權限審核稿件" }, 403, corsHeaders);
    }

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

    if (currentUserId !== comm[0].artist_id) {
      return createJsonResponse({ success: false, error: "僅繪師可提出異動申請" }, 403, corsHeaders);
    }

    await env.commission_db.batch([
      env.commission_db.prepare("UPDATE Commissions SET pending_changes = ? WHERE id = ?").bind(JSON.stringify(changes), id),
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'change_request', '繪師提交了規格異動申請')").bind(crypto.randomUUID(), id)
    ]);
    
    if (comm[0].client_id) {
       await notificationController.createNotification(env, String(comm[0].client_id), 'commission_change', `📝 繪師針對委託單「${comm[0].project_name || id}」提出了合約異動申請。`, `/client/orders?id=${id}`);
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async respondToChange(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { action } = await request.json() as any;
    const { results } = await env.commission_db.prepare("SELECT pending_changes, artist_id, client_id, project_name FROM Commissions WHERE id = ?").bind(id).all();
    const comm = results as any[];
    if (!comm[0]?.pending_changes) return createJsonResponse({ success: false, error: "無待處理申請" }, 400, corsHeaders);

    if (currentUserId !== comm[0].client_id) {
      return createJsonResponse({ success: false, error: "僅委託人可同意或拒絕異動" }, 403, corsHeaders);
    }

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
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (commResults.length === 0 || (currentUserId !== commResults[0].artist_id && currentUserId !== commResults[0].client_id)) {
      return createJsonResponse({ success: false, error: "無權限讀取對話紀錄" }, 403, corsHeaders);
    }

    const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
    return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
  },

  async postMessage(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { sender_role: string; content: string } = await request.json();
    
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id, client_id, project_name, origin_source FROM Commissions WHERE id = ?").bind(id).all();
    const comm = commResults as any[];
    if (comm.length === 0) return createJsonResponse({ success: false, error: "找不到訂單" }, 404, corsHeaders);

    const isArtist = currentUserId === comm[0].artist_id;
    const isClient = currentUserId === comm[0].client_id;
    if (!isArtist && !isClient) return createJsonResponse({ success: false, error: "無權限發送訊息" }, 403, corsHeaders);
    
    const actualRole = isArtist ? 'artist' : 'client';

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { results: recentMsgs } = await env.commission_db.prepare(`
      SELECT COUNT(*) as count FROM Messages 
      WHERE commission_id = ? AND sender_role = ? AND datetime(created_at) >= datetime(?)
    `).bind(id, actualRole, oneMinuteAgo).all();

    if (((recentMsgs[0]?.count as number) || 0) >= 30) {
      return createJsonResponse({ success: false, error: "發送訊息過於頻繁，請稍後再試。" }, 429, corsHeaders);
    }

    const msgId = crypto.randomUUID();
    const cleanContent = sanitizeAndLimit(body.content, 10000);
    
    await env.commission_db.batch([
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(msgId, id, actualRole, cleanContent),
      env.commission_db.prepare("UPDATE Commissions SET latest_message_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
    ]);
    
    const targetUserId = isArtist ? comm[0].client_id : comm[0].artist_id;
    const roleQuery = isArtist ? '' : '?role=artist';
    
    let inquiryId = null;
    try {
      const originData = JSON.parse(comm[0].origin_source);
      if (originData && originData.inquiry_id) inquiryId = originData.inquiry_id;
    } catch(e) {}

    const targetUrl = inquiryId ? `/inquiry/workspace/${inquiryId}` : `/workspace/${id}${roleQuery}`;

    if (targetUserId) {
      await notificationController.createNotification(env, String(targetUserId), 'commission_msg', `💬 委託單「${comm[0].project_name || id}」有新的聊天訊息。`, targetUrl);
    }

    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getPayments(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id FROM Commissions WHERE id = ?").bind(id).all();
    if (commResults.length === 0 || currentUserId !== commResults[0].artist_id) {
      return createJsonResponse({ success: false, error: "無權限查看財務紀錄" }, 403, corsHeaders);
    }

    const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
    return createJsonResponse({ success: true, data: results }, 200, corsHeaders);
  },

  async postPayment(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: commResults } = await env.commission_db.prepare("SELECT artist_id FROM Commissions WHERE id = ?").bind(id).all();
    if (commResults.length === 0 || currentUserId !== commResults[0].artist_id) {
      return createJsonResponse({ success: false, error: "僅繪師可新增財務紀錄" }, 403, corsHeaders);
    }

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
    const { results } = await env.commission_db.prepare(`
      SELECT c.artist_id FROM PaymentRecords p
      JOIN Commissions c ON p.commission_id = c.id
      WHERE p.id = ?
    `).bind(paymentId).all();

    if (results.length === 0 || currentUserId !== results[0].artist_id) {
      return createJsonResponse({ success: false, error: "無權限刪除此紀錄" }, 403, corsHeaders);
    }

    await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
    return createJsonResponse({ success: true }, 200, corsHeaders);
  },

  async getPublicQueue(artistId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      const artist = await env.commission_db.prepare("SELECT id, profile_settings FROM Users WHERE id = ? OR public_id = ?").bind(artistId, artistId).first<{id: string, profile_settings: string}>();
      
      if (!artist) {
        return createJsonResponse({ success: true, data: [] }, 200, corsHeaders);
      }

      // 🌟 解析繪師的排單設定 (預設將 show_artist_note 設為 false 以策安全)
      let queueSettings = { enabled: false, show_client_name: true, show_client_id: false, show_project_name: true, show_artist_note: false };
      try {
        if (artist.profile_settings) {
          const settings = typeof artist.profile_settings === 'string' ? JSON.parse(artist.profile_settings) : artist.profile_settings;
          if (settings.queue_settings) {
            queueSettings = { ...queueSettings, ...settings.queue_settings };
          }
        }
      } catch (e) {}

      // 若未啟用公開排單表，則不回傳資料
      if (!queueSettings.enabled) {
        return createJsonResponse({ success: true, data: [] }, 200, corsHeaders);
      }

      // 🌟 修正：確保 SQL 撈取 artist_note 以供判斷回傳
      const query = `
        SELECT 
          c.id, 
          c.contact_memo, 
          c.project_name, 
          c.queue_status, 
          c.end_date,
          c.order_date,
          c.artist_note,
          u.public_id AS client_public_id
        FROM Commissions c
        LEFT JOIN Users u ON c.client_id = u.id
        WHERE c.artist_id = ? AND c.status NOT IN ('completed', 'cancelled')
        ORDER BY c.order_date ASC
      `;
      const { results } = await env.commission_db.prepare(query).bind(artist.id).all();

      // 🌟 在後端套用隱私遮蔽邏輯
      const maskedResults = results.map((order: any) => {
        return {
          id: order.id,
          queue_status: order.queue_status,
          end_date: order.end_date, 
          order_date: order.order_date,
          // 根據設定決定是否傳送明碼，否則傳送遮蔽後的字串
          contact_memo: queueSettings.show_client_name ? order.contact_memo : getMaskedName(order.contact_memo),
          client_public_id: queueSettings.show_client_id ? order.client_public_id : null,
          project_name: queueSettings.show_project_name ? order.project_name : null,
          // 🌟 根據繪師設定，決定是否將備註傳至前端
          artist_note: queueSettings.show_artist_note ? order.artist_note : null,
        };
      });

      return createJsonResponse({ success: true, data: maskedResults }, 200, corsHeaders);
    } catch (e) {
      console.error("無法讀取公開排單表:", e);
      return createJsonResponse({ success: false, error: "無法讀取排單表" }, 500, corsHeaders);
    }
  }
};