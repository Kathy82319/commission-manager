// worker/index.ts
export interface Env {
  commission_db: D1Database;
  ID_SALT: string; 
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_REDIRECT_URI: string;
  FRONTEND_URL: string; // 🌟 新增的環境變數
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
  workflow_mode?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");

    // 🌟 [CORS 標頭設定]
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://commission-app.pages.dev", // 建議在正式環境中可透過 env 傳入
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // 🌟 [處理 OPTIONS]
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 🌟 [回傳工具] 確保每個回傳都有標頭
    const jsonRes = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    };

    // 🚨 臨時路由：把所有使用者「打回原形」，強制降級回新手村 (pending)
    if (request.method === "GET" && url.pathname === "/api/force-reset-pending") {
      try {
        await env.commission_db.prepare("UPDATE Users SET role = 'pending'").run();
        return jsonRes({ success: true, message: "太棒了！所有帳號都已降級為 pending，可以去新手村了！" });
      } catch (error: any) {
        return jsonRes({ success: false, error: String(error) }, 500);
      }
    }

    // 🚨 臨時路由：直接「刪除所有使用者」重新來過
    if (request.method === "GET" && url.pathname === "/api/delete-all-users") {
      try {
        await env.commission_db.prepare("DELETE FROM Users").run();
        return jsonRes({ success: true, message: "資料庫已完全清空！" });
      } catch (error: any) {
        return jsonRes({ success: false, error: String(error) }, 500);
      }
    }

    // [GET] 臨時修復：為 Vite 的本地資料庫補上缺少的欄位
    if (request.method === "GET" && url.pathname === "/api/fix-users") {
      let messages = [];
      try {
        await env.commission_db.prepare("ALTER TABLE Users ADD COLUMN avatar_url TEXT DEFAULT ''").run();
        messages.push("已成功新增 avatar_url 欄位");
      } catch (e) {
        messages.push("avatar_url 欄位可能已存在");
      }
      
      try {
        await env.commission_db.prepare("ALTER TABLE Users ADD COLUMN bio TEXT DEFAULT ''").run();
        messages.push("已成功新增 bio 欄位");
      } catch (e) {
        messages.push("bio 欄位可能已存在");
      }

      return jsonRes({ success: true, messages });
    }


    // ============================================================================
    // 🌟 1. 身分認證與登入 (Auth API)
    // ============================================================================

    // [GET] 發起 LINE 登入
    if (request.method === "GET" && url.pathname === "/api/auth/line/login") {
      if (!env.LINE_CHANNEL_ID || !env.LINE_REDIRECT_URI) {
        return jsonRes({ success: false, error: "環境變數未設定" }, 500);
      }
      const state = crypto.randomUUID();
      const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${env.LINE_CHANNEL_ID}&redirect_uri=${encodeURIComponent(env.LINE_REDIRECT_URI)}&state=${state}&scope=profile%20openid`;
      return Response.redirect(loginUrl, 302);
    }

    // [GET] LINE 登入回調 (Callback)
    if (request.method === "GET" && url.pathname === "/api/auth/line/callback") {
      const code = url.searchParams.get("code");
      if (!code) return jsonRes({ success: false, error: "未取得授權碼" }, 400);

      try {
        const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: env.LINE_REDIRECT_URI,
            client_id: env.LINE_CHANNEL_ID,
            client_secret: env.LINE_CHANNEL_SECRET,
          }),
        });
        const tokenData: any = await tokenRes.json();
        if (tokenData.error) return jsonRes({ success: false, error: "LINE Token 取得失敗", details: tokenData }, 400);

        const profileRes = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile: any = await profileRes.json();
        if (profile.message || !profile.userId) return jsonRes({ success: false, error: "LINE Profile 取得失敗", details: profile }, 400);

        const userId = profile.userId || 'unknown_id';
        const displayName = profile.displayName || '未命名用戶';
        const avatarUrl = profile.pictureUrl || '';

        const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ?").bind(userId).all();
        
        let targetPath = "/artist/queue"; // 預設路徑

        if (results.length === 0) {
          // 🌟 情況一：完全的新面孔 -> 狀態設為 pending
          const publicId = `User_${Math.floor(10000 + Math.random() * 90000)}`;
          await env.commission_db.prepare(`
            INSERT INTO Users (id, public_id, line_id, display_name, avatar_url, role, subscription_type, created_at)
            VALUES (?, ?, ?, ?, ?, 'pending', 'free', CURRENT_TIMESTAMP)
          `).bind(userId, publicId, userId, displayName, avatarUrl).run();
          
          targetPath = "/onboarding"; 
        } else {
          // 🌟 情況二：老朋友回來了 -> 根據身分分流
          const user: any = results[0];
          if (user.role === 'pending') {
            targetPath = "/onboarding";
          } else if (user.role === 'client') {
            targetPath = "/client/home";
          } else {
            targetPath = "/artist/queue"; 
          }
        }

        // 整合 FRONTEND_URL 跳轉並附加參數 ?u=userId (同時保留 Cookie 雙重保險)
        const baseUrl = env.FRONTEND_URL || new URL(env.LINE_REDIRECT_URI).origin; 
        const redirectUrl = `${baseUrl}${targetPath}?u=${userId}`;
        
        return new Response(null, {
          status: 302,
          headers: {
            'Location': redirectUrl,
            'Set-Cookie': `user_id=${userId}; Path=/; Max-Age=2592000; SameSite=None; Secure`,
            ...corsHeaders
          }
        });

      } catch (e: any) {
        return jsonRes({ success: false, error: "系統錯誤: " + e.message }, 500);
      }
    }


    // ============================================================================
    // 🌟 2. 使用者管理 (Users API)
    // ============================================================================

    // [POST] 完成新手村設定 (更新暱稱與身分)
    if (request.method === "POST" && url.pathname.startsWith("/api/users/") && url.pathname.endsWith("/complete-onboarding")) {
      try {
        const userId = pathParts[3];
        const body: { display_name: string; role: 'artist' | 'client' } = await request.json();
        
        if (!['artist', 'client'].includes(body.role)) {
          return jsonRes({ success: false, error: "無效的身分" }, 400);
        }

        await env.commission_db.prepare(`
          UPDATE Users 
          SET display_name = ?, role = ?
          WHERE id = ?
        `).bind(body.display_name, body.role, userId).run();
        
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }
    
    if (request.method === "GET" && url.pathname.startsWith("/api/users/")) {
      try {
        const userId = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ? OR public_id = ?").bind(userId, userId).all();
        if (results.length === 0) return jsonRes({ success: false, error: "找不到使用者" }, 404);
        return jsonRes({ success: true, data: results[0] });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
      try {
        const userId = pathParts[3];
        const body: any = await request.json();
        const actualLineId = body.line_id || `test_line_${userId}`;
        
        const { results: existing } = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(userId).all();
        let publicId = existing.length > 0 && existing[0].public_id ? existing[0].public_id : '';
        if (!publicId) {
          const encoder = new TextEncoder();
          const data = encoder.encode(actualLineId + env.ID_SALT);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
          publicId = `CM-${hashHex.substring(0, 7)}`;
        }

        await env.commission_db.prepare(`
          INSERT INTO Users (id, public_id, line_id, display_name, role, avatar_url, bio, profile_settings) 
          VALUES (?, ?, ?, ?, 'artist', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            bio = excluded.bio,
            profile_settings = excluded.profile_settings
        `).bind(
          userId, publicId, actualLineId, body.display_name || '', body.avatar_url || '', body.bio || '', body.profile_settings || '{}'
        ).run();
        
        return jsonRes({ success: true, public_id: publicId });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }


    // ============================================================================
    // 🌟 3. 委託單主體 (Commissions Core API)
    // ============================================================================

    // [GET] 委託單列表
    if (request.method === "GET" && url.pathname === "/api/commissions") {
      try {
        const query = `
          SELECT c.*, u.display_name AS client_name, t.name AS type_name,
          (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          ORDER BY c.order_date DESC
        `;
        const { results } = await env.commission_db.prepare(query).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [GET] 單一委託單
    if (request.method === "GET" && pathParts.length === 4 && pathParts[1] === "api" && pathParts[2] === "commissions") {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare(`
          SELECT c.*, u.display_name AS client_name, t.name AS type_name,
          (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          WHERE c.id = ?
        `).bind(id).all();
        if (results.length === 0) return jsonRes({ success: false, message: "找不到此委託單" }, 404);
        return jsonRes({ success: true, data: results[0] });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [POST] 新增委託單
    if (request.method === "POST" && url.pathname === "/api/commissions") {
      try {
        const body: CreateCommissionBody = await request.json();
        let newOrderId = '';
        const clientId = (body as any).client_id || '';

        if (body.is_external) {
          newOrderId = `EX-${Date.now().toString().slice(-6)}`;
        } else if (clientId) {
          const { results: userRes } = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(clientId).all();
          if (userRes.length === 0) return jsonRes({ success: false, error: "無效的委託人" }, 400);
          
          const { results: lastOrderRes } = await env.commission_db.prepare("SELECT id FROM Commissions WHERE client_id = ? ORDER BY id DESC LIMIT 1").bind(clientId).all();
          let nextSeq = 1;
          if (lastOrderRes.length > 0) {
            const parts = (lastOrderRes[0].id as string).split('-');
            if (parts.length === 3) nextSeq = parseInt(parts[2], 10) + 1;
          }
          newOrderId = `${userRes[0].public_id}-${String(nextSeq).padStart(3, '0')}`; 
        } else {
          newOrderId = `Q-${Date.now().toString().slice(-6)}`;
        }
        
        await env.commission_db.prepare(`
          INSERT INTO Commissions (
            id, artist_id, type_id, client_id, is_paid, artist_note, contact_memo,
            total_price, status, payment_status, current_stage, is_external,
            project_name, usage_type, is_rush, delivery_method, payment_method,
            draw_scope, char_count, bg_type, add_ons, detailed_settings, workflow_mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newOrderId, 'u-artist-01', 'type-01', clientId || null, 0,
          body.is_external ? `[外部私接] 客戶名稱: ${(body as any).client_name || '未知'}\n` : '', 
          body.client_name || '', body.total_price || 0, 
          body.workflow_mode === 'free' ? 'unpaid' : (body.is_external ? 'paid' : 'quote_created'),
          body.is_external ? 'paid' : 'unpaid', 'sketch_drawing', body.is_external ? 1 : 0,
          body.project_name || '', body.usage_type || '', body.is_rush || '否',
          body.delivery_method || '三階段審閱', body.payment_method || '',
          body.draw_scope || '', body.char_count || 1, body.bg_type || '',
          body.add_ons || '', body.detailed_settings || '', body.workflow_mode || 'standard'
        ).run();
        
        return jsonRes({ success: true, id: newOrderId });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [PATCH] 更新委託單狀態
    if (request.method === "PATCH" && url.pathname.startsWith("/api/commissions/")) {
      try {
        const id = pathParts[3];
        const body: Record<string, any> = await request.json();
        const updates = [];
        const params = [];
        const allowedFields = [
          'status', 'payment_status', 'project_name', 'detailed_settings', 
          'usage_type', 'is_rush', 'delivery_method', 'payment_method', 
          'draw_scope', 'char_count', 'bg_type', 'add_ons', 'total_price', 
          'current_stage', 'end_date', 'artist_note', 'workflow_mode', 
          'queue_status', 'last_read_at_artist', 'last_read_at_client', 'client_custom_title'
        ];
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
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }


    // ============================================================================
    // 🌟 4. 委託單子系統 (Submissions, Logs, Messages, Payments 等)
    // ============================================================================

    // [GET] 取得進度交付項目 (Submissions & Logs)
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/deliverables")) {
      try {
        const id = pathParts[3];
        const { results: logs } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        const { results: submissions } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        return jsonRes({ success: true, data: { logs, submissions } });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/submissions")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/logs")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [POST] 上傳稿件
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/submit")) {
      try {
        const id = pathParts[3];
        const body: { stage: string; file_url: string } = await request.json();
        const { results: comm } = await env.commission_db.prepare("SELECT current_stage, workflow_mode FROM Commissions WHERE id = ?").bind(id).all();
        if (comm.length === 0) return jsonRes({ success: false, error: "找不到委託單" }, 404);
        
        const { results } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Submissions WHERE commission_id = ? AND stage = ?").bind(id, body.stage).all();
        const version = (results[0]?.count as number) + 1;
        const newStageStatus = comm[0].workflow_mode === 'free' ? comm[0].current_stage : `${body.stage}_reviewing`; 
        const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';

        await env.commission_db.batch([
          env.commission_db.prepare("INSERT INTO Submissions (id, commission_id, stage, file_url, version) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), id, body.stage, body.file_url, version),
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'upload', ?)").bind(crypto.randomUUID(), id, `繪師已上傳 ${stageNameCH} (v${version})`),
          env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(newStageStatus, id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提交 ${stageNameCH} 供您審閱。`)
        ]);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [POST] 審閱稿件
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/review")) {
      try {
        const id = pathParts[3];
        const body: { stage: string; action: 'approve' | 'reject'; comment?: string } = await request.json();
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
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', ?, ?)").bind(crypto.randomUUID(), id, 'review', logMsg),
          env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(nextStageStatus, id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] ${logMsg}`)
        ];
        if (globalStatusUpdate) batchOps.push(env.commission_db.prepare("UPDATE Commissions SET status = ? WHERE id = ?").bind(globalStatusUpdate, id));
        
        await env.commission_db.batch(batchOps);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [POST] 提出異動申請
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-request")) {
      try {
        const id = pathParts[3];
        const body: { changes: any } = await request.json();
        const { results: comms } = await env.commission_db.prepare("SELECT * FROM Commissions WHERE id = ?").bind(id).all();
        const original = comms[0] as any;
        const fieldMap: Record<string, string> = {
          usage_type: '委託用途', is_rush: '急件', delivery_method: '交稿方式',
          total_price: '總金額', draw_scope: '繪畫範圍', char_count: '人物數量',
          bg_type: '背景設定', add_ons: '附加選項'
        };

        let logContent = "提出委託單異動申請：\n";
        for (const key in body.changes) {
          if (fieldMap[key]) logContent += `[${fieldMap[key]}] ${original[key] || '無'} -> ${body.changes[key]}\n`;
        }
        
        await env.commission_db.batch([
          env.commission_db.prepare("UPDATE Commissions SET pending_changes = ? WHERE id = ?").bind(JSON.stringify(body.changes), id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] 繪師已提出委託單內容異動申請，請前往「委託單細項」查看並確認。`),
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'artist', 'request_change', ?)").bind(crypto.randomUUID(), id, logContent)
        ]);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [POST] 回覆異動申請
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-response")) {
      try {
        const id = pathParts[3];
        const body: { action: 'approve' | 'reject' } = await request.json();
        const { results } = await env.commission_db.prepare("SELECT pending_changes FROM Commissions WHERE id = ?").bind(id).all();
        if (results.length === 0) return jsonRes({ success: false, error: "找不到委託單" }, 404);
        
        const pendingJson = results[0].pending_changes as string;
        if (!pendingJson) return jsonRes({ success: false, error: "目前沒有待處理的異動申請" }, 400);

        const changes = JSON.parse(pendingJson);
        let batchOps = [];

        if (body.action === 'approve') {
          const fields = Object.keys(changes);
          const sets = fields.map(f => `${f} = ?`).join(", ");
          const values = fields.map(f => changes[f]);
          batchOps.push(env.commission_db.prepare(`UPDATE Commissions SET ${sets}, pending_changes = NULL WHERE id = ?`).bind(...values, id));
          batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'approve_change', '委託人已同意委託單內容')").bind(crypto.randomUUID(), id));
          batchOps.push(env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', '[系統通知] 委託人已同意內容異動，規格已更新。')").bind(crypto.randomUUID(), id));
        } else {
          batchOps.push(env.commission_db.prepare("UPDATE Commissions SET pending_changes = NULL WHERE id = ?").bind(id));
          batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'reject_change', '委託人已拒絕委託單內容異動')").bind(crypto.randomUUID(), id));
          batchOps.push(env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', '[系統通知] 委託人拒絕了內容異動申請。')").bind(crypto.randomUUID(), id));
        }
        await env.commission_db.batch(batchOps);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [GET/POST] 訊息
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const body: { sender_role: string; content: string } = await request.json();
        const msgId = crypto.randomUUID();
        await env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)").bind(msgId, id, body.sender_role, body.content).run();
        return jsonRes({ success: true, id: msgId });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // [GET/POST/DELETE] 付款紀錄
    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const body: { record_date: string; item_name: string; amount: number } = await request.json();
        const recordId = crypto.randomUUID();
        await env.commission_db.prepare("INSERT INTO PaymentRecords (id, commission_id, record_date, item_name, amount) VALUES (?, ?, ?, ?, ?)").bind(recordId, id, body.record_date, body.item_name, body.amount).run();
        return jsonRes({ success: true, id: recordId });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "DELETE" && url.pathname.includes("/payments/")) {
      try {
        const paymentId = pathParts[5]; 
        await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // ============================================================================
    // 預設 404 (若所有路由都沒命中)
    // ============================================================================
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }
};