// worker/controllers/authController.ts
import type { Env } from "../shared/types";
import { getLineLoginUrl, getLineToken, getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";

// 💡 修正一：將登入憑證改為 SameSite=None; Secure，確保手機版 LINE/Threads 內建瀏覽器跳轉時不被強行丟棄
const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=2592000; SameSite=None; Secure; HttpOnly";
// 💡 修正二：加入 Partitioned 屬性（CHIPS），確保在 iOS / 現代智慧型手機高度限縮第三方 Cookie 的環境下，oauth_state 依然能在 LINE 內建瀏覽器中被正確寫入與讀取
const OAUTH_STATE_OPTIONS = "Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly; Partitioned";

export const authController = {

  async login(_request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    if (!env.LINE_CHANNEL_ID || !env.LINE_REDIRECT_URI) {
      return new Response(JSON.stringify({ success: false, error: "環境變數未設定" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
    
    const state = crypto.randomUUID();
    const loginUrl = getLineLoginUrl(env, state);
    
    return new Response(null, {
      status: 302,
      headers: {
        'Location': loginUrl,
        'Set-Cookie': `oauth_state=${state}; ${OAUTH_STATE_OPTIONS}`,
        ...corsHeaders
      }
    });
  },

  async callback(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const stateFromUrl = url.searchParams.get("state");
    
    const cookieHeader = request.headers.get("Cookie") || "";
    const stateFromCookie = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];

    if (!stateFromUrl || !stateFromCookie || stateFromUrl !== stateFromCookie) {
      return new Response(JSON.stringify({ success: false, error: "無效的請求來源 (CSRF)" }), { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "未取得授權碼" }), { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    try {
      const accessToken = await getLineToken(code, env);
      const profile = await getLineProfile(accessToken);
      const userId = profile.userId || 'unknown_id';

      const sessionValue = await generateToken(userId, env.ID_SALT, 30);
      const user: any = await getUserById(env, userId);
      
      let targetPath = "/portal";

      if (!user) {
        const safeDisplayName = sanitizeAndLimit(profile.displayName || '未命名', 100);
        await createNewUser(env, userId, safeDisplayName, profile.pictureUrl || "");
        targetPath = "/onboarding"; 
      } else if (user.role === 'deleted') {
        return new Response(JSON.stringify({ success: false, error: "帳號已被停用" }), { 
          status: 401, 
          headers: corsHeaders 
          });
      } else {
        targetPath = user.role === 'pending' ? "/onboarding" : "/portal";
      }

      // 商業邏輯優化：優先採用主網域 FRONTEND_URL，防止因回調設定不一致產生跨域 Session 丟失
      const baseUrl = (env.FRONTEND_URL || (env.LINE_REDIRECT_URI ? new URL(env.LINE_REDIRECT_URI).origin : "")).replace(/\/$/, "");
      
      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set('Location', `${baseUrl}${targetPath}`);
      responseHeaders.append('Set-Cookie', `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`);
      // 💡 修正三：清理 oauth_state 時同步補上 Partitioned 與 SameSite=None，確保乾淨抹除
      responseHeaders.append('Set-Cookie', `oauth_state=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly; Partitioned`);

      return new Response(null, {
        status: 302,
        headers: responseHeaders
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: "系統錯誤" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },

  async logout(_request: Request, _env: Env, corsHeaders: HeadersInit): Promise<Response> {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        // 💡 修正四：登出時 user_session 的清理策略需與 SESSION_COOKIE_OPTIONS 的 SameSite=None 保持完全一致，否則瀏覽器會拒絕抹除
        'Set-Cookie': `user_session=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly`,
      }
    });
  }
};