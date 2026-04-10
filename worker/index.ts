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


    // [GET] 讀取繪師設定資料
    if (request.method === "GET" && url.pathname.startsWith("/api/artist-profile/")) {
      try {
        const userId = pathParts[3];
        const { results } = await env.commission_db.prepare(`
          SELECT p.*, u.display_name, u.avatar_url, u.bio
          FROM ArtistProfiles p
          JOIN Users u ON p.user_id = u.id
          WHERE p.user_id = ?
        `).bind(userId).all();

        if (results.length === 0) return Response.json({ success: false, message: "找不到資料" }, { status: 404 });
        return Response.json({ success: true, data: results[0] });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [PATCH] 更新繪師設定資料
    if (request.method === "PATCH" && url.pathname.startsWith("/api/artist-profile/")) {
      try {
        const userId = pathParts[3];
        const body: {
          display_name?: string;
          avatar_url?: string;
          bio?: string;
          tos_content?: string;
          about_me?: string;
          portfolio_urls?: string[];
          commission_process?: string;
          payment_info?: string;
          usage_rules?: string;
          custom_1_title?: string;
          custom_1_content?: string;
          custom_2_title?: string;
          custom_2_content?: string;
          custom_3_title?: string;
          custom_3_content?: string;
        } = await request.json();

        await env.commission_db.batch([
          env.commission_db.prepare(`
            UPDATE Users SET display_name = ?, avatar_url = ?, bio = ? WHERE id = ?
          `).bind(body.display_name || '', body.avatar_url || '', body.bio || '', userId),

          env.commission_db.prepare(`
            INSERT INTO ArtistProfiles (
              user_id, tos_content, about_me, portfolio_urls,
              commission_process, payment_info, usage_rules,
              custom_1_title, custom_1_content,
              custom_2_title, custom_2_content,
              custom_3_title, custom_3_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              tos_content = excluded.tos_content,
              about_me = excluded.about_me,
              portfolio_urls = excluded.portfolio_urls,
              commission_process = excluded.commission_process,
              payment_info = excluded.payment_info,
              usage_rules = excluded.usage_rules,
              custom_1_title = excluded.custom_1_title,
              custom_1_content = excluded.custom_1_content,
              custom_2_title = excluded.custom_2_title,
              custom_2_content = excluded.custom_2_content,
              custom_3_title = excluded.custom_3_title,
              custom_3_content = excluded.custom_3_content
          `).bind(
            userId, body.tos_content || '', body.about_me || '', JSON.stringify(body.portfolio_urls || []),
            body.commission_process || '', body.payment_info || '', body.usage_rules || '',
            body.custom_1_title || '', body.custom_1_content || '',
            body.custom_2_title || '', body.custom_2_content || '',
            body.custom_3_title || '', body.custom_3_content || ''
          )
        ]);

        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

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

        // 檢查狀態防呆：若委託單當前階段已不符合上傳階段，直接拒絕
        const { results: comm } = await env.commission_db.prepare("SELECT current_stage FROM Commissions WHERE id = ?").bind(id).all();
        if (comm.length === 0) return Response.json({ success: false, error: "找不到委託單" }, { status: 404 });
        if (comm[0].current_stage !== `${body.stage}_drawing`) {
          return Response.json({ success: false, error: "此階段已鎖定，無法再上傳新稿件。" }, { status: 400 });
        }

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
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', ?, ?)").bind(logId, id, 'review', logMsg),
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

    // [POST] 委託人回覆紅字異動申請 (新增路由)
if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-response")) {
  try {
    const id = pathParts[3];
    const body: { action: 'approve' | 'reject' } = await request.json();
    
    // 1. 先讀取該筆委託單，取得暫存的 pending_changes
    const { results } = await env.commission_db.prepare("SELECT pending_changes FROM Commissions WHERE id = ?").bind(id).all();
    if (results.length === 0) return Response.json({ success: false, error: "找不到委託單" }, { status: 404 });
    
    const pendingJson = results[0].pending_changes as string;
    if (!pendingJson) return Response.json({ success: false, error: "目前沒有待處理的異動申請" }, { status: 400 });

    const changes = JSON.parse(pendingJson);
    let batchOps = [];

    if (body.action === 'approve') {
      // 同意：將 changes 內容更新到 Commissions 主表，並清除 pending_changes
      const fields = Object.keys(changes);
      const sets = fields.map(f => `${f} = ?`).join(", ");
      const values = fields.map(f => changes[f]);
      
      batchOps.push(env.commission_db.prepare(`UPDATE Commissions SET ${sets}, pending_changes = NULL WHERE id = ?`).bind(...values, id));
      batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'approve_change', '委託人已同意委託單內容')").bind(crypto.randomUUID(), id));
      batchOps.push(env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', '[系統通知] 委託人已同意內容異動，規格已更新。')").bind(crypto.randomUUID(), id));
    } else {
      // 拒絕：直接清除 pending_changes
      batchOps.push(env.commission_db.prepare("UPDATE Commissions SET pending_changes = NULL WHERE id = ?").bind(id));
      batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'reject_change', '委託人已拒絕委託單內容異動')").bind(crypto.randomUUID(), id));
      batchOps.push(env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', '[系統通知] 委託人拒絕了內容異動申請。')").bind(crypto.randomUUID(), id));
    }

    await env.commission_db.batch(batchOps);
    return Response.json({ success: true });
  } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
}

    // [POST] 繪師提出紅字異動申請
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-request")) {
      try {
        const id = pathParts[3];
        const body: { changes: any } = await request.json();
        
        // 取得原始資料以比對差異
        const { results: comms } = await env.commission_db.prepare("SELECT * FROM Commissions WHERE id = ?").bind(id).all();
        const original = comms[0] as any;

        const fieldMap: Record<string, string> = {
          usage_type: '委託用途', is_rush: '急件', delivery_method: '交稿方式',
          total_price: '總金額', draw_scope: '繪畫範圍', char_count: '人物數量',
          bg_type: '背景設定', add_ons: '附加選項'
        };

        let logContent = "提出委託單異動申請：\n";
        for (const key in body.changes) {
          if (fieldMap[key]) {
            logContent += `[${fieldMap[key]}] ${original[key] || '無'} -> ${body.changes[key]}\n`;
          }
        }
        
        await env.commission_db.batch([
          env.commission_db.prepare("UPDATE Commissions SET pending_changes = ? WHERE id = ?").bind(JSON.stringify(body.changes), id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提出委託單內容異動申請，請前往「委託單細項」查看並確認。`),
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'request_change', ?)").bind(crypto.randomUUID(), id, logContent)
        ]);
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [GET] 聊天室訊息系統
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
        return Response.json({ success: true, data: results });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [POST] 聊天室訊息系統
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const body: { sender_role: string; content: string } = await request.json();
        const msgId = crypto.randomUUID();
        await env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(msgId, id, body.sender_role, body.content).run();
        return Response.json({ success: true, id: msgId });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [GET] 財務記帳系統
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
        return Response.json({ success: true, data: results });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }
    // [DELETE] 刪除單筆財務紀錄
    if (request.method === "DELETE" && url.pathname.includes("/payments/")) {
      try {
        const paymentId = pathParts[5]; // 解析 /api/commissions/:id/payments/:paymentId
        await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
        return Response.json({ success: true });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }


    // [GET] 讀取使用者個人資料
    if (request.method === "GET" && url.pathname.startsWith("/api/users/")) {
      try {
        const userId = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ?").bind(userId).all();
        if (results.length === 0) return Response.json({ success: false, message: "找不到使用者" }, { status: 404 });
        return Response.json({ success: true, data: results[0] });
      } catch (error) { return Response.json({ success: false, error: String(error) }, { status: 500 }); }
    }

    // [PATCH] 更新使用者個人資料
    if (request.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
      try {
        const userId = pathParts[3];
        const body: { display_name: string; avatar_url: string; bio: string } = await request.json();
        
        // 使用 UPSERT 語法：若帳號不存在則自動建立，若存在則更新欄位
        await env.commission_db.prepare(`
          INSERT INTO Users (id, line_id, display_name, role, avatar_url, bio) 
          VALUES (?, ?, ?, 'client', ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            bio = excluded.bio
        `).bind(
          userId, 
          `test_line_${userId}`, // 測試用的假 LINE ID
          body.display_name || '', 
          body.avatar_url || '', 
          body.bio || ''
        ).run();
        
        return Response.json({ success: true });
      } catch (error) { 
        return Response.json({ success: false, error: String(error) }, { status: 500 }); 
      }
    }

    // [POST] 財務記帳系統
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
        const updates = [];
        const params = [];
        
        const allowedFields = ['status', 'payment_status', 'project_name', 'detailed_settings', 'usage_type', 'is_rush', 'delivery_method', 'payment_method', 'draw_scope', 'char_count', 'bg_type', 'add_ons', 'total_price', 'current_stage', 'end_date', 'artist_note'];
        
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