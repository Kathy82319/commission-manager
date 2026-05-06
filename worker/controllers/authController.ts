import type { Env } from "../shared/types";
import { getLineLoginUrl, getLineToken, getLineProfile } from "../services/line";
import { generateToken, sanitizeAndLimit } from "../utils/security";
import { getUserById, createNewUser } from "../services/db";

const SESSION_COOKIE_OPTIONS = "Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly";
const OAUTH_STATE_OPTIONS = "Path=/; Max-Age=300; SameSite=None; Secure; HttpOnly";

export const authController = {

  async testingBypass(request: Request, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const url = new URL(request.url);
    
    // 【暫時寬鬆 1】從網址抓取指定要登入的 userId
    const testUserId = url.searchParams.get("userId"); 
    const secret = url.searchParams.get("secret");

    // 【暫時寬鬆 2】密鑰檢查改為：只要有傳 userId 或是 secret 對了就放行
    // 開發測試完畢後，建議將此 if 恢復為原本的嚴格密鑰檢查
    if (!testUserId && secret !== "NewebPay_Review_Special_2026_XYZ") {
      return new Response(JSON.stringify({ success: false, error: "Access Denied" }), { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    try {
      // 如果沒傳 userId 就預設用原本的審核員 ID
      const finalUserId = testUserId || "reviewer_newebpay_001";
      
      let user: any = await getUserById(env, finalUserId);
      
      // 【暫時寬鬆 3】如果資料庫沒這個測試帳號，就自動幫你創一個
      if (!user) {
        const mockName = testUserId === 'u-artist-01' ? "系統預設繪師" : `測試用戶(${finalUserId})`;
        await createNewUser(env, finalUserId, mockName, "");
      }

      // 生成登入憑證 (Cookie)
      const sessionValue = await generateToken(finalUserId, env.ID_SALT, 30);
      const baseUrl = (env.FRONTEND_URL || "https://commission-app.pages.dev").replace(/\/$/, "");

      // 執行變身登入
      return new Response(null, {
        status: 302,
        headers: {
          // 【暫時寬鬆 4】登入後改導向 /portal 或首頁，方便你測試
          'Location': `${baseUrl}/portal`,
          'Set-Cookie': `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`,
          ...corsHeaders
        }
      });
    } catch (e) {
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

      await env.commission_db.prepare(
        "UPDATE Users SET plan_type = 'pro', pro_expires_at = '2099-12-31 23:59:59' WHERE id = ?"
      ).bind(userId).run();

      const baseUrl = (env.FRONTEND_URL || new URL(env.LINE_REDIRECT_URI).origin).replace(/\/$/, "");
      
      const responseHeaders = new Headers(corsHeaders);
      responseHeaders.set('Location', `${baseUrl}${targetPath}`);
      responseHeaders.append('Set-Cookie', `user_session=${sessionValue}; ${SESSION_COOKIE_OPTIONS}`);
      responseHeaders.append('Set-Cookie', `oauth_state=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly`);

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
        'Set-Cookie': `user_session=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`,
      }
    });
  }
};