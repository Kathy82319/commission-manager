// worker/controllers/commController.ts
import type { Env, CreateCommissionBody } from "../shared/types";
import { sanitizeAndLimit, limitRichText, isValidSafeUrl } from "../utils/security";

export const commController = {
  // 取得委託單列表
  async getList(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const query = `
      SELECT c.*, u.display_name AS client_name, u.public_id AS client_public_id, t.name AS type_name,
      (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
      FROM Commissions c
      LEFT JOIN Users u ON c.client_id = u.id
      LEFT JOIN CommissionTypes t ON c.type_id = t.id
      WHERE c.artist_id = ? OR c.client_id = ?
      ORDER BY c.order_date DESC
    `;
    const { results } = await env.commission_db.prepare(query).bind(currentUserId, currentUserId).all();
    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  // 取得單筆委託單詳細資料
  async getDetail(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results } = await env.commission_db.prepare(`
      SELECT c.*, u.display_name AS client_name, u.public_id AS client_public_id, t.name AS type_name, a.profile_settings AS artist_settings,
      (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
      FROM Commissions c
      LEFT JOIN Users u ON c.client_id = u.id
      LEFT JOIN Users a ON c.artist_id = a.id
      LEFT JOIN CommissionTypes t ON c.type_id = t.id
      WHERE c.id = ?
    `).bind(id).all();

    if (results.length === 0) return new Response(JSON.stringify({ success: false, message: "找不到此委託單" }), { status: 404, headers: corsHeaders });
    const commission = results[0] as any;

    const isArtist = currentUserId === commission.artist_id;
    const isClient = currentUserId === commission.client_id;
    const isPublicQuote = !commission.client_id && (commission.status === 'quote_created' || commission.status === 'unpaid');

    if (!isArtist && !isClient && !isPublicQuote) {
      return new Response(JSON.stringify({ success: false, error: "無權存取" }), { status: 403, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ success: true, data: commission }), { status: 200, headers: corsHeaders });
  },

  // 建立新委託單
  async create(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: userRes } = await env.commission_db.prepare("SELECT plan_type, role, trial_start_at, trial_end_at, pro_expires_at FROM Users WHERE id = ?").bind(currentUserId).all();
    const userPlan = userRes[0] as any;
    
    if (userPlan.role === 'deleted') return new Response(JSON.stringify({ success: false, error: "帳號已停用" }), { status: 403, headers: corsHeaders });

    let currentPlan = userPlan.plan_type || 'free';
    const now = new Date();

    if (currentPlan === 'trial' && userPlan.trial_end_at && now > new Date(userPlan.trial_end_at)) currentPlan = 'free';
    if (currentPlan === 'pro' && userPlan.pro_expires_at && now > new Date(userPlan.pro_expires_at)) currentPlan = 'free';

    if (currentPlan === 'free') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { results: countRes } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Commissions WHERE artist_id = ? AND datetime(order_date) >= datetime(?)").bind(currentUserId, startOfMonth).all();
        if ((countRes[0].count as number) >= 3) {
            return new Response(JSON.stringify({ success: false, error: "免費版每月 3 筆額度已用盡，請升級專業版或開啟試用。" }), { status: 403, headers: corsHeaders });
        }
    } else if (currentPlan === 'trial') {
        const { results: countRes } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Commissions WHERE artist_id = ? AND datetime(order_date) >= datetime(?) AND datetime(order_date) <= datetime(?)").bind(currentUserId, userPlan.trial_start_at, userPlan.trial_end_at).all();
        if ((countRes[0].count as number) >= 20) {
            return new Response(JSON.stringify({ success: false, error: "專業版試用 20 筆額度已用盡，請升級專業版。" }), { status: 403, headers: corsHeaders });
        }
    }

    const body: CreateCommissionBody = await request.json();

    if (typeof body.total_price !== 'number' || body.total_price < 0) {
      return new Response(JSON.stringify({ success: false, error: "金額格式不正確" }), { status: 400, headers: corsHeaders });
    }

    let newOrderId = body.is_external ? `EX-${Date.now().toString().slice(-6)}` : `${Date.now().toString().slice(-6)}`;
    const clientId = body.client_id || '';

    if (!body.is_external && clientId) {
      const { results: publicRes } = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(clientId).all();
      if (publicRes.length > 0) newOrderId = `${publicRes[0].public_id}-${Date.now().toString().slice(-3)}`;
    }
    
    await env.commission_db.prepare(`
      INSERT INTO Commissions (
        id, artist_id, type_id, client_id, is_paid, artist_note, contact_memo,
        total_price, status, payment_status, current_stage, is_external,
        project_name, usage_type, is_rush, delivery_method, payment_method,
        draw_scope, char_count, bg_type, add_ons, detailed_settings, workflow_mode, agreed_tos_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newOrderId, currentUserId, 'type-01', clientId || null, 0,
      '', sanitizeAndLimit(body.client_name || '未知', 100), body.total_price || 0,
      body.workflow_mode === 'free' ? 'unpaid' : (body.is_external ? 'paid' : 'quote_created'),
      body.is_external ? 'paid' : 'unpaid', 'sketch_drawing', body.is_external ? 1 : 0,
      sanitizeAndLimit(body.project_name, 255), sanitizeAndLimit(body.usage_type, 100), sanitizeAndLimit(body.is_rush, 50),
      sanitizeAndLimit(body.delivery_method, 100), sanitizeAndLimit(body.payment_method, 100),
      sanitizeAndLimit(body.draw_scope, 100), body.char_count, sanitizeAndLimit(body.bg_type, 100),
      sanitizeAndLimit(body.add_ons, 1000), sanitizeAndLimit(body.detailed_settings, 10000), sanitizeAndLimit(body.workflow_mode, 50) || 'standard',
      limitRichText(body.agreed_tos_snapshot, 10000) || '' 
    ).run();
    
    return new Response(JSON.stringify({ success: true, id: newOrderId }), { status: 200, headers: corsHeaders });
  },

  // 更新/綁定委託單
  async update(request: Request, id: string, currentUserId: string | null, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: Record<string, any> = await request.json();
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id, status FROM Commissions WHERE id = ?").bind(id).all();
    if (check.length === 0) return new Response(JSON.stringify({ success: false, error: "找不到該單據" }), { status: 404, headers: corsHeaders });
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
      return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
    }
    if (!isBinding && currentUserId === comm.client_id && currentUserId !== comm.artist_id && body.total_price !== undefined) {
      return new Response(JSON.stringify({ success: false, error: "委託人無權修改金額" }), { status: 403, headers: corsHeaders });
    }

    const updates = [];
    const params = [];
    const fieldLimits: Record<string, number> = {
      'status': 50, 'payment_status': 50, 'client_id': 100, 'project_name': 255, 'detailed_settings': 10000, 
      'usage_type': 100, 'is_rush': 50, 'delivery_method': 100, 'payment_method': 100, 
      'draw_scope': 100, 'bg_type': 100, 'add_ons': 1000, 'current_stage': 50, 'end_date': 50, 
      'artist_note': 5000, 'workflow_mode': 50, 'queue_status': 100, 'client_custom_title': 100,
      'agreed_tos_snapshot': 10000 
    };
    
    for (const key in fieldLimits) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
if (key === 'agreed_tos_snapshot') {
  params.push(limitRichText(body[key], fieldLimits[key]));
} else {
  params.push(typeof body[key] === 'string' ? sanitizeAndLimit(body[key], fieldLimits[key]) : body[key]);
}
      }
    }
    
    const specialFields = ['total_price', 'char_count', 'last_read_at_artist', 'last_read_at_client'];
    for (const key of specialFields) {
        if (body[key] !== undefined) { updates.push(`${key} = ?`); params.push(body[key]); }
    }

    if (updates.length > 0) {
      params.push(id);
      const batch = [env.commission_db.prepare(`UPDATE Commissions SET ${updates.join(", ")} WHERE id = ?`).bind(...params)];
      if (isBinding) {
        batch.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'bind', '委託人已成功綁定訂單')").bind(crypto.randomUUID(), id));
      }
      await env.commission_db.batch(batch);
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  // 取得進度與歷程
  async getDeliverables(id: string, pathType: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (check[0]?.client_id && currentUserId !== check[0]?.client_id && currentUserId !== check[0]?.artist_id) {
      return new Response(JSON.stringify({ success: false, error: "無權限查看進度" }), { status: 403, headers: corsHeaders });
    }

    if (pathType === "deliverables") {
      const { results: logs } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
      const { results: submissions } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
      return new Response(JSON.stringify({ success: true, data: { logs, submissions } }), { status: 200, headers: corsHeaders });
    } else if (pathType === "submissions") {
      const { results } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    } else {
      const { results } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
      return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
    }
  },

  // 上傳稿件 (Submit)
  async submitArtwork(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { stage: string; file_url: string } = await request.json();
    if (!isValidSafeUrl(body.file_url) && !body.file_url.includes('|')) return new Response(JSON.stringify({ success: false, error: "不安全的檔案網址" }), { status: 400, headers: corsHeaders });

    const { results: comm } = await env.commission_db.prepare("SELECT artist_id, current_stage, workflow_mode FROM Commissions WHERE id = ?").bind(id).all();
    if (comm.length === 0) return new Response(JSON.stringify({ success: false, error: "找不到委託單" }), { status: 404, headers: corsHeaders });
    if (currentUserId !== comm[0].artist_id) return new Response(JSON.stringify({ success: false, error: "非本人繪師無法上傳" }), { status: 403, headers: corsHeaders });
    
    const { results } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Submissions WHERE commission_id = ? AND stage = ?").bind(id, body.stage).all();
    const version = ((results[0]?.count as number) || 0) + 1;
    const newStageStatus = comm[0].workflow_mode === 'free' ? comm[0].current_stage : `${body.stage}_reviewing`; 
    const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';

    await env.commission_db.batch([
      env.commission_db.prepare("INSERT INTO Submissions (id, commission_id, stage, file_url, version) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, sanitizeAndLimit(body.stage, 50), body.file_url, version),
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'upload', ?)").bind(crypto.randomUUID(), id, `繪師已上傳 ${stageNameCH} (v${version})`),
      env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(newStageStatus, id),
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提交 ${stageNameCH} 供您審閱。`)
    ]);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  // 審閱稿件 (Review)
  async reviewArtwork(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { stage: string; action: 'approve' | 'reject' | 'read_only'; comment?: string } = await request.json();
    const { results: comm } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (comm.length === 0) return new Response(JSON.stringify({ success: false, error: "找不到單據" }), { status: 404, headers: corsHeaders });
    if (comm[0].client_id && currentUserId !== comm[0].client_id && currentUserId !== comm[0].artist_id) return new Response(JSON.stringify({ success: false, error: "非綁定委託人無法審閱" }), { status: 403, headers: corsHeaders });

    const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';
    let nextStageStatus = '';
    let logMsg = '';

    if (body.action === 'reject') {
      nextStageStatus = `${body.stage}_drawing`;
      logMsg = `委託人請求修改 ${stageNameCH}：${sanitizeAndLimit(body.comment || '無備註', 1000)}`;
    } else if (body.action === 'read_only') {
      nextStageStatus = body.stage === 'sketch' ? 'lineart_drawing' : (body.stage === 'lineart' ? 'final_drawing' : 'completed');
      logMsg = `委託人已閱覽 ${stageNameCH}`;
    } else {
      nextStageStatus = body.stage === 'sketch' ? 'lineart_drawing' : (body.stage === 'lineart' ? 'final_drawing' : 'completed');
      logMsg = `委託人已同意 ${stageNameCH}`;
    }

    let globalStatusUpdate = nextStageStatus === 'completed' ? 'completed' : '';
    let batchOps = [
      env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', ?, ?)").bind(crypto.randomUUID(), id, 'review', logMsg),
      env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(nextStageStatus, id),
      env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] ${logMsg}`)
    ];
    if (globalStatusUpdate) batchOps.push(env.commission_db.prepare("UPDATE Commissions SET status = ? WHERE id = ?").bind(globalStatusUpdate, id));
    
    await env.commission_db.batch(batchOps);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  // 取得/發送聊天訊息
  async getMessages(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (check[0]?.client_id && currentUserId !== check[0]?.artist_id && currentUserId !== check[0]?.client_id) return new Response(JSON.stringify({ success: false, error: "無權限查看" }), { status: 403, headers: corsHeaders });
    const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  async postMessage(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (check[0]?.client_id && currentUserId !== check[0]?.artist_id && currentUserId !== check[0]?.client_id) return new Response(JSON.stringify({ success: false, error: "無權限發送" }), { status: 403, headers: corsHeaders });
    const body: { sender_role: string; content: string } = await request.json();
    await env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), id, sanitizeAndLimit(body.sender_role, 50), sanitizeAndLimit(body.content, 10000)).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  // 財務記帳 (Get / Post / Delete)
  async getPayments(id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
    if (check[0]?.client_id && currentUserId !== check[0]?.artist_id && currentUserId !== check[0]?.client_id) return new Response(JSON.stringify({ success: false, error: "無權限查看" }), { status: 403, headers: corsHeaders });
    const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
    return new Response(JSON.stringify({ success: true, data: results }), { status: 200, headers: corsHeaders });
  },

  async postPayment(request: Request, id: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: comm } = await env.commission_db.prepare("SELECT artist_id FROM Commissions WHERE id = ?").bind(id).all();
    if (currentUserId !== comm[0]?.artist_id) return new Response(JSON.stringify({ success: false, error: "僅限繪師可記錄財務" }), { status: 403, headers: corsHeaders });
    const body: { record_date: string; item_name: string; amount: number } = await request.json();
    await env.commission_db.prepare("INSERT INTO PaymentRecords (id, commission_id, record_date, item_name, amount) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, sanitizeAndLimit(body.record_date, 50), sanitizeAndLimit(body.item_name, 255), body.amount).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async deletePayment(paymentId: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: check } = await env.commission_db.prepare(`
      SELECT c.artist_id FROM PaymentRecords p
      JOIN Commissions c ON p.commission_id = c.id
      WHERE p.id = ?
    `).bind(paymentId).all();
    if (currentUserId !== check[0]?.artist_id) return new Response(JSON.stringify({ success: false, error: "無權限刪除" }), { status: 403, headers: corsHeaders });
    await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }
};