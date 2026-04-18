// worker/controllers/authController.ts
import type { Env } from "../shared/types";
import { getLineLoginUrl, getLineToken, getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";

export const authController = {
  /**
   * 處理 GET /api/auth/line/login
   */
  async login(_request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    if (!env.LINE_CHANNEL_ID || !env.LINE_REDIRECT_URI) {
      return new Response(JSON.stringify({ success: false, error: "環境變數未設定" }), { status: 500, headers: corsHeaders });
    }
    
    // 產生防範 CSRF 攻擊的 state
    const state = crypto.randomUUID();
    const loginUrl = getLineLoginUrl(env, state);
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': loginUrl,
        'Set-Cookie': `oauth_state=${state}; Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly`,
        ...corsHeaders
      }
    });
  },

  /**
   * 處理 GET /api/auth/line/callback
   */
  async callback(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateFromUrl = url.searchParams.get("state");
    
    // 校驗 state 防止 CSRF 攻擊
    const cookieHeader = request.headers.get("Cookie") || "";
    const stateFromCookie = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];
    if (!stateFromUrl || !stateFromCookie || stateFromUrl !== stateFromCookie) {
      return new Response(JSON.stringify({ success: false, error: "無效的請求來源 (CSRF)" }), { status: 403, headers: corsHeaders });
    }

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "未取得授權碼" }), { status: 400, headers: corsHeaders });
    }

    try {
      // 1. 與 LINE API 溝通取得資料
      const accessToken = await getLineToken(code, env);
      const profile = await getLineProfile(accessToken);
      const userId = profile.userId || 'unknown_id';

      // 2. 產生我們系統自己的 Session Token
      const sessionValue = await generateToken(userId, env.ID_SALT, 30);

      // 3. 檢查資料庫是否已有此使用者
      const user: any = await getUserById(env, userId);
      let targetPath = "/artist/queue";

      if (!user) {
        // 新使用者：寫入資料庫
        const safeDisplayName = sanitizeAndLimit(profile.displayName || '未命名', 100);
        await createNewUser(env, userId, safeDisplayName, profile.pictureUrl || '');
        targetPath = "/onboarding"; 
      } else {
        // 舊使用者：根據角色決定導向位置
        if (user.role === 'deleted') {
          targetPath = "/onboarding";
        } else {
          targetPath = user.role === 'pending' ? "/onboarding" : "/portal"; 
        }
      }

      // 🌟 [封測邏輯：全體強制升級]
      // 不管是新舊使用者，登入時都強制更新為 Pro 權限，這樣你自己登入也會變 Pro
      await env.commission_db.prepare(
        "UPDATE Users SET plan_type = 'pro', pro_expires_at = '2099-12-31 23:59:59' WHERE id = ?"
      ).bind(userId).run();

      // 4. 重新導向回前端
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
    } catch (e: any) { 
      return new Response(JSON.stringify({ success: false, error: "系統錯誤" }), { status: 500, headers: corsHeaders });
    }
  }
};