import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  commission_db: D1Database;
  ID_SALT: string; 
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  LINE_REDIRECT_URI: string;
  FRONTEND_URL: string;
  PUBLIC_BUCKET: R2Bucket;
  PRIVATE_BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
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
  client_id?: string;
}

// ==========================================
// 安全性輔助函式 (Security Helpers)
// ==========================================

async function generateSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function generateToken(userId: string, secret: string, expiresInDays = 30): Promise<string> {
  const expires = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload = `${userId}|${expires}`;
  const signature = await generateSignature(payload, secret);
  return `${payload}|${signature}`;
}

async function verifyToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('|');
  if (parts.length !== 3) return null;

  const [userId, expires, signature] = parts;
  if (Date.now() > parseInt(expires, 10)) return null;

  const expectedSig = await generateSignature(`${userId}|${expires}`, secret);
  return signature === expectedSig ? userId : null;
}

function sanitize(str: string): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

function isValidSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function getUserIdFromRequest(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const trimmedCookie = cookie.trim();
    const splitIndex = trimmedCookie.indexOf("=");
    if (splitIndex > -1) {
      const name = trimmedCookie.substring(0, splitIndex);
      const value = trimmedCookie.substring(splitIndex + 1);
      acc[name] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  
  return await verifyToken(cookies["user_session"], env.ID_SALT);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin || env.FRONTEND_URL || "*", 
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const jsonRes = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    };

    const getS3Client = (env: Env) => {
      return new S3Client({
        region: "auto",
        endpoint: `https://f72c79d82828e2419ab5fb0e1d323ce5.r2.cloudflarestorage.com`, 
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    };

    // ============================================================================
    // 1. 身分認證與登入 (Auth API)
    // ============================================================================

    if (request.method === "GET" && url.pathname === "/api/auth/line/login") {
      if (!env.LINE_CHANNEL_ID || !env.LINE_REDIRECT_URI) return jsonRes({ success: false, error: "環境變數未設定" }, 500);
      const state = crypto.randomUUID();
      const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${env.LINE_CHANNEL_ID}&redirect_uri=${encodeURIComponent(env.LINE_REDIRECT_URI)}&state=${state}&scope=profile%20openid`;
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': loginUrl,
          'Set-Cookie': `oauth_state=${state}; Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly`,
          ...corsHeaders
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/api/auth/line/callback") {
      const code = url.searchParams.get("code");
      const stateFromUrl = url.searchParams.get("state");
      
      const cookieHeader = request.headers.get("Cookie") || "";
      const stateFromCookie = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];
      if (!stateFromUrl || !stateFromCookie || stateFromUrl !== stateFromCookie) {
        return jsonRes({ success: false, error: "無效的請求來源 (CSRF)" }, 403);
      }

      if (!code) return jsonRes({ success: false, error: "未取得授權碼" }, 400);

      try {
        const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code", code,
            redirect_uri: env.LINE_REDIRECT_URI,
            client_id: env.LINE_CHANNEL_ID,
            client_secret: env.LINE_CHANNEL_SECRET,
          }),
        });
        const tokenData: any = await tokenRes.json();
        if (tokenData.error) return jsonRes({ success: false, error: "LINE Token 取得失敗" }, 400);

        const profileRes = await fetch("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
        const profile: any = await profileRes.json();
        const userId = profile.userId || 'unknown_id';

        const sessionValue = await generateToken(userId, env.ID_SALT, 30);

        const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ?").bind(userId).all();
        let targetPath = "/artist/queue";

        if (results.length === 0) {
          const publicId = `User_${Math.floor(10000 + Math.random() * 90000)}`;
          await env.commission_db.prepare(`INSERT INTO Users (id, public_id, line_id, display_name, avatar_url, role, subscription_type, created_at) VALUES (?, ?, ?, ?, ?, 'pending', 'free', CURRENT_TIMESTAMP)`).bind(userId, publicId, userId, profile.displayName || '未命名', profile.pictureUrl || '').run();
          targetPath = "/onboarding"; 
        } else {
          const user: any = results[0];
          // 🌟 核心修改：只要不是 pending，老手一律導向 /portal 入口大廳
          targetPath = user.role === 'pending' ? "/onboarding" : "/portal"; 
        }

        let baseUrl = (env.FRONTEND_URL || new URL(env.LINE_REDIRECT_URI).origin).replace(/\/$/, "");
        return new Response(null, {
          status: 302,
          headers: {
            'Location': `${baseUrl}${targetPath}`,
            'Set-Cookie': `user_session=${sessionValue}; Path=/; Max-Age=2592000; SameSite=None; Secure; HttpOnly`,
            'Set-Cookie-State-Clear': `oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure`, 
            ...corsHeaders
          }
        });
      } catch (e: any) { return jsonRes({ success: false, error: "系統錯誤" }, 500); }
    }

    // ============================================================================
    // 2. 使用者管理 (Users API)
    // ============================================================================

    if (request.method === "GET" && url.pathname.startsWith("/api/users/")) {
      try {
        let userId = pathParts[3];
        if (userId === "me") {
          const currentUser = await getUserIdFromRequest(request, env);
          if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);
          userId = currentUser;
        }

        const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ? OR public_id = ?").bind(userId, userId).all();
        if (results.length === 0) return jsonRes({ success: false, error: "找不到使用者" }, 404);
        return jsonRes({ success: true, data: results[0] });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

// 🌟 核心：審閱 API (支援同意、退回與閱覽，並強制寫入 Log)
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/review")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        // action 支援 'approve' (同意), 'read_only' (已閱覽), 'reject' (退回修改)
        const body: { stage: string; action: 'approve' | 'reject' | 'read_only'; comment?: string } = await request.json();

        const { results: comm } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (comm.length === 0) return jsonRes({ success: false, error: "找不到單據" }, 404);
        if (comm[0].client_id && currentUser !== comm[0].client_id && currentUser !== comm[0].artist_id) return jsonRes({ success: false, error: "權限不足" }, 403);

        const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';
        let nextStageStatus = '';
        let logMsg = '';

        // 判斷不同動作，並產生對應的歷史紀錄文字
        if (body.action === 'reject') {
          nextStageStatus = `${body.stage}_drawing`;
          logMsg = `委託人請求修改 ${stageNameCH}：${sanitize(body.comment || '無備註')}`;
        } else if (body.action === 'read_only') {
          nextStageStatus = body.stage === 'sketch' ? 'lineart_drawing' : (body.stage === 'lineart' ? 'final_drawing' : 'completed');
          logMsg = `委託人已閱覽 ${stageNameCH}`; // 🌟 這裡負責產生已閱覽的 Log
        } else {
          nextStageStatus = body.stage === 'sketch' ? 'lineart_drawing' : (body.stage === 'lineart' ? 'final_drawing' : 'completed');
          logMsg = `委託人已同意 ${stageNameCH} (合約結案解鎖)`;
        }

        let globalStatusUpdate = nextStageStatus === 'completed' ? 'completed' : '';
        
        // 將狀態推進與 Log 寫入打包執行
        let batchOps = [
          env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', ?, ?)").bind(crypto.randomUUID(), id, 'review', logMsg),
          env.commission_db.prepare("UPDATE Commissions SET current_stage = ? WHERE id = ?").bind(nextStageStatus, id),
          env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', ?)").bind(crypto.randomUUID(), id, `[系統通知] ${logMsg}`)
        ];
        
        if (globalStatusUpdate) {
          batchOps.push(env.commission_db.prepare("UPDATE Commissions SET status = ? WHERE id = ?").bind(globalStatusUpdate, id));
        }
        
        await env.commission_db.batch(batchOps);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
      try {
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);
        const targetId = pathParts[3] === "me" ? currentUser : pathParts[3];

        if (currentUser !== targetId) return jsonRes({ success: false, error: "權限不足" }, 403);

        const body: any = await request.json();
        await env.commission_db.prepare(`
          UPDATE Users SET display_name = ?, avatar_url = ?, bio = ?, profile_settings = ? WHERE id = ?
        `).bind(sanitize(body.display_name), body.avatar_url || '', sanitize(body.bio), body.profile_settings || '{}', targetId).run();
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // ============================================================================
    // 3. 委託單核心 API (Commissions)
    // ============================================================================

    if (request.method === "GET" && url.pathname === "/api/commissions") {
      try {
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "請先登入" }, 401);

        const query = `
          SELECT c.*, u.display_name AS client_name, u.public_id AS client_public_id, t.name AS type_name,
          (SELECT MAX(created_at) FROM Messages WHERE commission_id = c.id) as latest_message_at
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          WHERE c.artist_id = ? OR c.client_id = ?
          ORDER BY c.order_date DESC
        `;
        const { results } = await env.commission_db.prepare(query).bind(currentUser, currentUser).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "GET" && pathParts.length === 4 && pathParts[1] === "api" && pathParts[2] === "commissions") {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "請先登入" }, 401);

        const { results } = await env.commission_db.prepare(`
          SELECT c.*, u.display_name AS client_name, u.public_id AS client_public_id, t.name AS type_name, a.profile_settings AS artist_settings
          FROM Commissions c
          LEFT JOIN Users u ON c.client_id = u.id
          LEFT JOIN Users a ON c.artist_id = a.id
          LEFT JOIN CommissionTypes t ON c.type_id = t.id
          WHERE c.id = ?
        `).bind(id).all();

        if (results.length === 0) return jsonRes({ success: false, message: "找不到此委託單" }, 404);
        const commission = results[0] as any;

        if (commission.client_id && currentUser !== commission.client_id && currentUser !== commission.artist_id) {
          return jsonRes({ success: false, error: "無權存取" }, 403);
        }

        return jsonRes({ success: true, data: commission });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname === "/api/commissions") {
      try {
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "權限不足" }, 401);

        const body: CreateCommissionBody = await request.json();

        if (typeof body.total_price !== 'number' || body.total_price < 0) {
          return jsonRes({ success: false, error: "金額格式不正確" }, 400);
        }

        let newOrderId = body.is_external ? `EX-${Date.now().toString().slice(-6)}` : `Q-${Date.now().toString().slice(-6)}`;
        const clientId = body.client_id || '';

        if (!body.is_external && clientId) {
          const { results: userRes } = await env.commission_db.prepare("SELECT public_id FROM Users WHERE id = ?").bind(clientId).all();
          if (userRes.length > 0) newOrderId = `${userRes[0].public_id}-${Date.now().toString().slice(-3)}`;
        }
        
        await env.commission_db.prepare(`
          INSERT INTO Commissions (
            id, artist_id, type_id, client_id, is_paid, artist_note, contact_memo,
            total_price, status, payment_status, current_stage, is_external,
            project_name, usage_type, is_rush, delivery_method, payment_method,
            draw_scope, char_count, bg_type, add_ons, detailed_settings, workflow_mode
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newOrderId, currentUser, 'type-01', clientId || null, 0,
          '', sanitize(body.client_name || '未知'), body.total_price || 0,
          body.workflow_mode === 'free' ? 'unpaid' : (body.is_external ? 'paid' : 'quote_created'),
          body.is_external ? 'paid' : 'unpaid', 'sketch_drawing', body.is_external ? 1 : 0,
          sanitize(body.project_name), sanitize(body.usage_type), body.is_rush,
          body.delivery_method, sanitize(body.payment_method),
          sanitize(body.draw_scope), body.char_count, sanitize(body.bg_type),
          sanitize(body.add_ons), sanitize(body.detailed_settings), body.workflow_mode || 'standard'
        ).run();
        
        return jsonRes({ success: true, id: newOrderId });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "PATCH" && url.pathname.startsWith("/api/commissions/")) {
      try {
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);

        const id = pathParts[3];
        const body: Record<string, any> = await request.json();

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id, status FROM Commissions WHERE id = ?").bind(id).all();
        if (check.length === 0) return jsonRes({ success: false, error: "找不到該單據" }, 404);
        const comm = check[0] as any;

        if (!comm.client_id && comm.status === 'quote_created' && body.status === 'unpaid') {
          body.client_id = currentUser; 
        } else {
          if (currentUser !== comm.artist_id && currentUser !== comm.client_id) {
            return jsonRes({ success: false, error: "權限不足，無法修改他人單據" }, 403);
          }
        }

        if (currentUser === comm.client_id && body.total_price !== undefined) {
          return jsonRes({ success: false, error: "委託人無權修改金額" }, 403);
        }

        const updates = [];
        const params = [];
        const allowedFields = [
          'status', 'payment_status','client_id', 'project_name', 'detailed_settings', 
          'usage_type', 'is_rush', 'delivery_method', 'payment_method', 
          'draw_scope', 'char_count', 'bg_type', 'add_ons', 'total_price', 
          'current_stage', 'end_date', 'artist_note', 'workflow_mode', 
          'queue_status', 'last_read_at_artist', 'last_read_at_client', 'client_custom_title'
        ];
        
        for (const key of allowedFields) {
          if (body[key] !== undefined) {
            updates.push(`${key} = ?`);
            params.push(typeof body[key] === 'string' ? sanitize(body[key]) : body[key]);
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
    // 4. 進度、稿件與異動系統 (Submissions & Logs)
    // ============================================================================

    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && (url.pathname.endsWith("/deliverables") || url.pathname.endsWith("/submissions") || url.pathname.endsWith("/logs"))) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "權限不足" }, 401);

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (check[0]?.client_id && currentUser !== check[0]?.client_id && currentUser !== check[0]?.artist_id) {
          return jsonRes({ success: false, error: "無權限查看進度" }, 403);
        }

        if (url.pathname.endsWith("/deliverables")) {
          const { results: logs } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
          const { results: submissions } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
          return jsonRes({ success: true, data: { logs, submissions } });
        } else if (url.pathname.endsWith("/submissions")) {
          const { results } = await env.commission_db.prepare("SELECT * FROM Submissions WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
          return jsonRes({ success: true, data: results });
        } else {
          const { results } = await env.commission_db.prepare("SELECT * FROM ActionLogs WHERE commission_id = ? ORDER BY created_at DESC").bind(id).all();
          return jsonRes({ success: true, data: results });
        }
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/submit")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        const body: { stage: string; file_url: string } = await request.json();

        if (!isValidSafeUrl(body.file_url)) return jsonRes({ success: false, error: "不安全的檔案網址" }, 400);

        const { results: comm } = await env.commission_db.prepare("SELECT artist_id, current_stage, workflow_mode FROM Commissions WHERE id = ?").bind(id).all();
        if (comm.length === 0) return jsonRes({ success: false, error: "找不到委託單" }, 404);
        
        if (currentUser !== comm[0].artist_id) return jsonRes({ success: false, error: "非本人繪師無法上傳" }, 403);
        
        const { results } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Submissions WHERE commission_id = ? AND stage = ?").bind(id, body.stage).all();
        const version = ((results[0]?.count as number) || 0) + 1;
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

    // 核心修正：審閱 API 支援「已閱覽」與「同意」
    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/review")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        // action 支援 'approve' (同意), 'read_only' (已閱覽), 'reject' (退回修改)
        const body: { stage: string; action: 'approve' | 'reject' | 'read_only'; comment?: string } = await request.json();

        const { results: comm } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (comm.length === 0) return jsonRes({ success: false, error: "找不到單據" }, 404);
        
        if (comm[0].client_id && currentUser !== comm[0].client_id && currentUser !== comm[0].artist_id) {
          return jsonRes({ success: false, error: "非綁定委託人無法審閱" }, 403);
        }

        const stageNameCH = body.stage === 'sketch' ? '草稿' : body.stage === 'lineart' ? '線稿' : '完稿';
        let nextStageStatus = '';
        let logMsg = '';

        if (body.action === 'reject') {
          nextStageStatus = `${body.stage}_drawing`;
          logMsg = `委託人請求修改 ${stageNameCH}：${sanitize(body.comment || '無備註')}`;
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
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-request")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        
        const { results: check } = await env.commission_db.prepare("SELECT artist_id FROM Commissions WHERE id = ?").bind(id).all();
        if (currentUser !== check[0]?.artist_id) return jsonRes({ success: false, error: "權限不足，僅限繪師提出" }, 403);

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

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/change-response")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id, pending_changes FROM Commissions WHERE id = ?").bind(id).all();
        if (check.length === 0) return jsonRes({ success: false, error: "找不到單據" }, 404);
        const comm = check[0] as any;

        if (comm.client_id && currentUser !== comm.client_id && currentUser !== comm.artist_id) {
          return jsonRes({ success: false, error: "權限不足，僅限委託人回覆" }, 403);
        }

        const body: { action: 'approve' | 'reject' } = await request.json();
        const pendingJson = comm.pending_changes as string;
        if (!pendingJson) return jsonRes({ success: false, error: "沒有待處理的異動" }, 400);

        const changes = JSON.parse(pendingJson);
        let batchOps = [];

        if (body.action === 'approve') {
          const fields = Object.keys(changes);
          const sets = fields.map(f => `${f} = ?`).join(", ");
          const values = fields.map(f => changes[f]);
          batchOps.push(env.commission_db.prepare(`UPDATE Commissions SET ${sets}, pending_changes = NULL WHERE id = ?`).bind(...values, id));
          batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'approve_change', '委託人已同意內容')").bind(crypto.randomUUID(), id));
          batchOps.push(env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, 'system', '[系統通知] 委託人已同意內容異動。')").bind(crypto.randomUUID(), id));
        } else {
          batchOps.push(env.commission_db.prepare("UPDATE Commissions SET pending_changes = NULL WHERE id = ?").bind(id));
          batchOps.push(env.commission_db.prepare("INSERT INTO ActionLogs (id, commission_id, actor_role, action_type, content) VALUES (?, ?, 'client', 'reject_change', '委託人已拒絕內容異動')").bind(crypto.randomUUID(), id));
        }
        await env.commission_db.batch(batchOps);
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // ============================================================================
    // 5. 訊息與財務系統 (Messages & Payments)
    // ============================================================================

    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (check[0]?.client_id && currentUser !== check[0]?.artist_id && currentUser !== check[0]?.client_id) {
          return jsonRes({ success: false, error: "無權限查看" }, 403);
        }

        const { results } = await env.commission_db.prepare("SELECT * FROM Messages WHERE commission_id = ? ORDER BY created_at ASC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/messages")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);
        if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (check[0]?.client_id && currentUser !== check[0]?.artist_id && currentUser !== check[0]?.client_id) {
          return jsonRes({ success: false, error: "無權限發送" }, 403);
        }

        const body: { sender_role: string; content: string } = await request.json();
        
        await env.commission_db.prepare("INSERT INTO Messages (id, commission_id, sender_role, content) VALUES (?, ?, ?, ?)")
          .bind(crypto.randomUUID(), id, body.sender_role, sanitize(body.content)).run();
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);

        const { results: check } = await env.commission_db.prepare("SELECT artist_id, client_id FROM Commissions WHERE id = ?").bind(id).all();
        if (check[0]?.client_id && currentUser !== check[0]?.artist_id && currentUser !== check[0]?.client_id) {
          return jsonRes({ success: false, error: "無權限查看" }, 403);
        }

        const { results } = await env.commission_db.prepare("SELECT * FROM PaymentRecords WHERE commission_id = ? ORDER BY record_date ASC, created_at ASC").bind(id).all();
        return jsonRes({ success: true, data: results });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "POST" && url.pathname.startsWith("/api/commissions/") && url.pathname.endsWith("/payments")) {
      try {
        const id = pathParts[3];
        const currentUser = await getUserIdFromRequest(request, env);

        const { results: comm } = await env.commission_db.prepare("SELECT artist_id FROM Commissions WHERE id = ?").bind(id).all();
        if (currentUser !== comm[0]?.artist_id) return jsonRes({ success: false, error: "僅限繪師可記錄財務" }, 403);

        const body: { record_date: string; item_name: string; amount: number } = await request.json();
        
        await env.commission_db.prepare("INSERT INTO PaymentRecords (id, commission_id, record_date, item_name, amount) VALUES (?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), id, body.record_date, sanitize(body.item_name), body.amount).run();
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    if (request.method === "DELETE" && url.pathname.includes("/payments/")) {
      try {
        const paymentId = pathParts[5]; 
        const currentUser = await getUserIdFromRequest(request, env);

        const { results: check } = await env.commission_db.prepare(`
          SELECT c.artist_id FROM PaymentRecords p
          JOIN Commissions c ON p.commission_id = c.id
          WHERE p.id = ?
        `).bind(paymentId).all();
        
        if (currentUser !== check[0]?.artist_id) return jsonRes({ success: false, error: "無權限刪除" }, 403);

        await env.commission_db.prepare("DELETE FROM PaymentRecords WHERE id = ?").bind(paymentId).run();
        return jsonRes({ success: true });
      } catch (error) { return jsonRes({ success: false, error: String(error) }, 500); }
    }

    // ============================================================================
    // 6. R2 儲存管理 API (Presigned URL)
    // ============================================================================

    // A. 取得上傳門票
    if (request.method === "POST" && url.pathname === "/api/r2/upload-url") {
      const currentUser = await getUserIdFromRequest(request, env);
      if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);

      const { fileName, contentType, bucketType } = await request.json() as any;
      
      const bucketName = bucketType === 'private' ? "commission-private" : "commission-public";
      
      try {
        const s3 = getS3Client(env);
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
        
        return jsonRes({ success: true, uploadUrl });
      } catch (err: any) {
        return jsonRes({ success: false, error: "無法生成上傳通行證" }, 500);
      }
    }

    // B. 取得下載門票 (針對私有儲存桶)
    if (request.method === "POST" && url.pathname === "/api/r2/download-url") {
      const currentUser = await getUserIdFromRequest(request, env);
      if (!currentUser) return jsonRes({ success: false, error: "未登入" }, 401);

      const { commissionId, fileName } = await request.json() as any;

      const { results } = await env.commission_db.prepare(
        "SELECT artist_id, client_id, status FROM Commissions WHERE id = ?"
      ).bind(commissionId).all();

      if (results.length === 0) return jsonRes({ success: false, error: "單據不存在" }, 404);
      const comm = results[0] as any;

      const isArtist = currentUser === comm.artist_id;
      const isClient = currentUser === comm.client_id;
      const isCompleted = comm.status === 'completed';

      if (!isArtist && !(isClient && isCompleted)) {
        return jsonRes({ success: false, error: "權限不足，完稿尚未解鎖或您非當事人" }, 403);
      }

      try {
        const s3 = getS3Client(env);
        const command = new GetObjectCommand({
          Bucket: "commission-private",
          Key: fileName,
        });

        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
        return jsonRes({ success: true, downloadUrl });
      } catch (err: any) {
        return jsonRes({ success: false, error: "無法生成下載通行證" }, 500);
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  }  
};