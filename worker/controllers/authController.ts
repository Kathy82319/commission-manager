// worker/controllers/authController.ts
import type { Env } from "../shared/types";
import { getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";

const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly";
const OAUTH_STATE_OPTIONS = "Path=/; Max-Age=300; SameSite=Lax; Secure; HttpOnly";

export const authController = {

  async login(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    if (!env.LINE_CHANNEL_ID) {
      return new Response(JSON.stringify({ success: false, error: "環境變數未設定 (CHANNEL_ID)" }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const requestUrl = new URL(request.url);
    const currentOrigin = requestUrl.origin;
    const dynamicRedirectUri = `${currentOrigin}/api/auth/line/callback`;
    
    const state = crypto.randomUUID();
    
    const loginUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${env.LINE_CHANNEL_ID}&redirect_uri=${encodeURIComponent(dynamicRedirectUri)}&state=${state}&scope=profile%20openid`;
    
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
      const currentOrigin = url.origin;
      const dynamicRedirectUri = `${currentOrigin}/api/auth/line/callback`;

      if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
        throw new Error("環境變數 LINE_CHANNEL_ID 或 LINE_CHANNEL_SECRET 未設定");
      }

      const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: dynamicRedirectUri,
          client_id: env.LINE_CHANNEL_ID,
          client_secret: env.LINE_CHANNEL_SECRET
        })
      });

      if (!tokenResponse.ok) {
        const errText = await tokenResponse.text();
        throw new Error(`LINE 官方交換 Token 失敗: ${tokenResponse.status} - ${errText}`);
      }

      const tokenData: any = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const profile = await getLineProfile(accessToken);
      const userId = profile.userId || 'unknown_id';

      const sessionValue = await generateToken(userId, env.ID_SALT, 30);
      const user: any = await getUserById(env, userId);
      
      let targetPath = "/portal";

      if (!user) {
        const safeDisplayName = sanitizeAndLimit(profile.displayName || '未命名', 100);
        await createNewUser(env, userId, safeDisplayName, "");
        targetPath = "/onboarding"; 
      } else if (user.role === 'deleted') {
        return new Response(JSON.stringify({ success: false, error: "帳號已被停用" }), { 
          status: 401, 
          headers: corsHeaders 
        });
      } else {
        targetPath = user.role === 'pending' ? "/onboarding" : "/portal";
      }

      const baseUrl = currentOrigin.replace(/\/$/, "");
      
      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set('Location', `${baseUrl}${targetPath}`);
      responseHeaders.append('Set-Cookie', `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`);
      responseHeaders.append('Set-Cookie', `oauth_state=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`);

      return new Response(null, {
        status: 302,
        headers: responseHeaders
      });
    } catch (e: any) {
      const errorMessage = e?.message || String(e);
      return new Response(JSON.stringify({ success: false, error: `[Debug] 動態雙網域回調崩潰: ${errorMessage}` }), { 
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