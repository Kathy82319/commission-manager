import type { Env } from "../shared/types";
import { getLineLoginUrl, getLineToken, getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";


const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly";
const OAUTH_STATE_OPTIONS = "Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly";

export const authController = {

 
  async testingBypass(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");

    if (secret !== "NewebPay_Review_Special_2026_XYZ") {
      return new Response(JSON.stringify({ success: false, error: "Access Denied" }), { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    try {
      const testUserId = "reviewer_newebpay_001";
      let user: any = await getUserById(env, testUserId);
      
      if (!user) {
        await createNewUser(env, testUserId, "金流審核員", "");
      }

      const sessionValue = await generateToken(testUserId, env.ID_SALT, 30);
      let baseUrl = (env.FRONTEND_URL || "https://commission-app.pages.dev").replace(/\/$/, "");

      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}/artist/settings`,
          'Set-Cookie': `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`,
          ...corsHeaders
        }
      });
    } catch (e) {
      console.error("Bypass Error:", e);
      return new Response(JSON.stringify({ success: false, error: "系統錯誤" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  },



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
      
      let targetPath = "/artist/queue";

      if (!user) {
        const safeDisplayName = sanitizeAndLimit(profile.displayName || '未命名', 100);
        await createNewUser(env, userId, safeDisplayName, "");
        targetPath = "/onboarding"; 
      } else if (user.role === 'deleted' || user.role === 'pending') {
        targetPath = "/onboarding";
      } else {
        targetPath = "/portal";
      }

      await env.commission_db.prepare(
        "UPDATE Users SET plan_type = 'pro', pro_expires_at = '2099-12-31 23:59:59' WHERE id = ?"
      ).bind(userId).run();

      const baseUrl = (env.FRONTEND_URL || new URL(env.LINE_REDIRECT_URI).origin).replace(/\/$/, "");
      
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${baseUrl}${targetPath}`,
          'Set-Cookie': `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`,
          'Set-Cookie-2': `oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=None; Secure`, 
          ...corsHeaders
        }
      });
    } catch (e) {
      console.error("Callback Error:", e);
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
        'Set-Cookie': `user_session=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`,
      }
    });
  }
};