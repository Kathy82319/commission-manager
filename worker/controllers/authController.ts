// worker/controllers/authController.ts
import type { Env } from "../shared/types";
import { getLineLoginUrl, getLineToken, getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";

const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly";
const OAUTH_STATE_OPTIONS = "Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly";

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
      responseHeaders.append('Set-Cookie', `oauth_state=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly`);

      return new Response(null, {
        status: 302,
        headers: responseHeaders
      });
    } catch (e: any) {
      // 💡 偵錯改裝：直接抓取實體的異常錯誤訊息與堆疊軌跡
      const errorMessage = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
      const errorStack = e?.stack || "無可用堆疊軌跡";

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `[Debug] LINE登入回調崩潰原因: ${errorMessage}`,
          stack: errorStack,
          // 順便把當前 Worker 讀到的重導向環境變數一起倒出來，檢查是不是真的有吃到最新設定
          debug_env: {
            LINE_REDIRECT_URI: env.LINE_REDIRECT_URI || "未定義",
            FRONTEND_URL: env.FRONTEND_URL || "未定義"
          }
        }), 
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
  },

  async logout(_request: Request, _env: Env, corsHeaders: HeadersInit): Promise<Response> {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Set-Cookie': `user_session=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`,
      }
    });
  }
};