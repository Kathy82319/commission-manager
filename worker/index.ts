export interface Env {
  commission_db: D1Database;
}

interface CreateCommissionBody {
  total_price: number;
  is_external?: boolean;
  client_name?: string;
  project_name: string;
  usage_type: string;
  is_rush: string;
  delivery_method: string;
  payment_method: string;
  draw_scope: string;
  char_count: number;
  bg_type: string;
  add_ons: string;
  detailed_settings: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    // [GET] 讀取特定委託單的操作歷程與檔案
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/deliverables")) {
      try {
        const id = pathParts[3];
        const { results: logs } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        const { results: submissions } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        return Response.json({ success: true, data: { logs, submissions } });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [POST] 繪師提交檔案
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/submit")) {
      try {
        const id = pathParts[3];
        const body: { stage: string; file_url: string } = await request.json();
        const { results } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Submissions WHERE commission_id = ? AND stage = ?").bind(id, body.stage).all();
        const version = (results[0]?.count as number) + 1;
        const subId = crypto.randomUUID();
        const logId = crypto.randomUUID();
        const newStageStatus = `${body.stage}_reviewing`;
        const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';

        await env.commission_db.batch([
          env.commission_db.prepare("INSERT INTO Submissions (id, commission_id, stage, file_url, version) VALUES (?, ?, ?, ?, ?)").bind(subId, id, body.stage, body.file_url, version),
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'upload', ?)").bind(logId, id, `繪師已上傳 ${stageNameCH} (v${version})`),
          env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(newStageStatus, id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提交 ${stageNameCH} 供您審閱。`)
        ]);
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [POST] 委託人審閱回覆
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/review")) {
      try {
        const id = pathParts[3];
        const body: { stage: string; action: 'approve' | 'reject'; comment?: string } = await request.json();
        const logId = crypto.randomUUID();
        const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';
        let nextStageStatus = '';
        let globalStatusUpdate = ''; 

        if (body.action === 'reject') {
          nextStageStatus = `${body.stage}_drawing`;
        } else if (body.action === 'approve') {
          if (body.stage === 'sketch') nextStageStatus = 'lineart_drawing';
          else if (body.stage === 'lineart') nextStageStatus = 'final_drawing';
          else if (body.stage === 'final') {
            nextStageStatus = 'completed';
            globalStatusUpdate = 'completed'; 
          }
        }

        const logMsg = body.action === 'approve' ? `委託人已同意 ${stageNameCH}` : `委託人請求修改 ${stageNameCH}：${body.comment || '無備註'}`;

        let batchOps = [
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', ?, ?)").bind(logId, id, body.action, logMsg),
          env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(nextStageStatus, id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] ${logMsg}`)
        ];

        if (globalStatusUpdate) {
          batchOps.push(env.commission_db.prepare("UPDATE Commissions SET status = ? WHERE id = ?").bind(globalStatusUpdate, id));
        }

        await env.commission_db.batch(batchOps);
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [POST] 繪師提出紅字異動申請 (新增路由)
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-request")) {
      try {
        const id = pathParts[3];
        const body: { changes: any } = await request.json();
        
        await env.commission_db.batch([
          env.commission_db.prepare("UPDATE Commissions SET pending_changes = ? WHERE id = ?").bind(JSON.stringify(body.changes), id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提出委託單內容異動申請，請前往「委託單細項」查看並確認。`),
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'request_change', '提出委託單異動申請')").bind(crypto.randomUUID(), id)
        ]);
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // 聊天室訊息系統
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
        return Response.json({ success: true, data: results });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const body: { sender_role: string; content: string } = await request.json();
        const msgId = crypto.randomUUID();
        await env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(msgId, id, body.sender_role, body.content).run();
        return Response.json({ success: true, id: msgId });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // 財務記帳系統
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
        return Response.json({ success: true, data: results });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const body: { record_date: string; item_name: string; amount: number } = await request.json();
        const recordId = crypto.randomUUID();
        await env.commission_db.prepare("INSERT INTO PaymentRecords (id, commission_id, record_date, item_name, amount) VALUES (?, ?, ?, ?, ?)").bind(recordId, id, body.record_date, body.item_name, body.amount).run();
        return Response.json({ success: true, id: recordId });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [GET] 讀取單一委託單
    if (request.method === "GET" && pathParts.length === 4 && pathParts[1] === "api" && pathParts[2] === "commissions") {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare(`
          SELECT c.*, u.display_name AS client_name, t.name AS type_name
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          WHERE c.id = ?
        `).bind(id).all();
        
        if (results.length === 0) return Response.json({ success: false, message: "找不到此委託單" }, { status: 404 });
        return Response.json({ success: true, data: results[0] });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [GET] 讀取所有委託單清單
    if (request.method === "GET" && url.pathname === "/api/commissions") {
      try {
        const query = `
          SELECT c.*, u.display_name AS client_name, t.name AS type_name
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          ORDER BY c.order_date DESC
        `;
        const { results } = await env.commission_db.prepare(query).all();
        return Response.json({ success: true, data: results });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [POST] 新增報價單
    if (request.method === "POST" && url.pathname === "/api/commissions") {
      try {
        const body: CreateCommissionBody = await request.json();
        const newOrderId = crypto.randomUUID(); 
        
        const insertQuery = `
          INSERT INTO Commissions (
            id, artist_id, type_id, client_id, is_paid, artist_note, contact_memo,
            total_price, status, payment_status, current_stage, is_external,
            project_name, usage_type, is_rush, delivery_method, payment_method,
            draw_scope, char_count, bg_type, add_ons, detailed_settings
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await env.commission_db.prepare(insertQuery).bind(
          newOrderId, 'u-artist-01', 'type-01', '', 0,
          body.is_external ? `[外部私接] 客戶名稱: ${body.client_name}\n` : '', '',
          body.total_price || 0, 
          body.is_external ? 'paid' : 'quote_created',
          body.is_external ? 'paid' : 'unpaid', 
          'sketch_drawing', 
          body.is_external ? 1 : 0,
          body.project_name || '', body.usage_type || '', body.is_rush || '否',
          body.delivery_method || '三階段審閱', body.payment_method || '',
          body.draw_scope || '', body.char_count || 1, body.bg_type || '',
          body.add_ons || '', body.detailed_settings || ''
        ).run();
        
        return Response.json({ success: true, id: newOrderId });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [PATCH] 更新單一委託單
    if (request.method === "PATCH" && url.pathname.startsWith("/api/commissions/")) {
      try {
        const id = pathParts[3];
        const body: Record<string, any> = await request.json();
        let updates = [];
        let params = [];
        
        const allowedFields = ['status', 'payment_status', 'project_name', 'detailed_settings', 'usage_type', 'is_rush', 'delivery_method', 'payment_method', 'draw_scope', 'char_count', 'bg_type', 'add_ons', 'total_price'];
        
        for (const key of allowedFields) {
          if (body[key] !== undefined) {
            updates.push(`${key} = ?`);
            params.push(body[key]);
          }
        }

        if (updates.length > 0) {
          params.push(id);
          await env.commission_db.prepare(`UPDATE Commissions SET ${updates.join(", ")} WHERE id = ?`).bind(...params).run();
        }
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }
    
    return new Response("Not Found", { status: 404 });
  }
};