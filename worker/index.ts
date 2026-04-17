// worker/index.ts
import type { Env } from "./shared/types";
import { getUserIdFromRequest, requireAuth } from "./middleware/auth";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { commController } from "./controllers/commController";
import { r2Controller } from "./controllers/r2Controller";
import { testController } from "./controllers/testController";
import { adminController } from "./controllers/adminController";

// 🌟 核心修正：我們直接把金流邏輯鎖死在這裡，不引用任何外部 paymentController
const internalPaymentLogic = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.NEWEBPAY_MERCHANT_ID || !env.commission_db) {
        return new Response(JSON.stringify({ success: false, error: "系統配置錯誤" }), { status: 500, headers: corsHeaders });
      }

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      const amount = 199;
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 

      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";
      const hookdeckUrl = "https://hkdk.events/3zyr10gulio2ol";

      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        // 🌟 終極測試字串：如果你在藍新看到這串，就代表我們終於贏了！
        ItemDesc: `VERIFY_NEW_LOGIC_SUCCESS_${Date.now()}`, 
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: hookdeckUrl,
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      // 🌟 注意：我們直接在內部進行加密
      const { newebpay } = await import("./utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        deploy_version: "v1.0.6_TOTAL_INTEGRATION", // 版本號更新
        data: {
          MerchantID: env.NEWEBPAY_MERCHANT_ID,
          TradeInfo: aesString,
          TradeSha: shaString,
          Version: "2.0",
          PayGateWay: "https://ccore.newebpay.com/MPG/mpg_gateway"
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: corsHeaders });
    }
  },

  async handleNotify(request: Request, env: Env): Promise<Response> {
    // ... (維持之前的 handleNotify 內容，確保寫入 WebhookLogs) ...
    return new Response("OK");
  }
};

export default {
  async fetch(request: any, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 🕵️ 新增的測試路由
    if (url.pathname === "/api/version") {
      return new Response(JSON.stringify({ version: "v1.0.6", status: "Running Internal Logic" }), { headers: corsHeaders });
    }

    try {
      if (url.pathname.startsWith("/api/")) {
        const currentUserId = await getUserIdFromRequest(request, env);

        // 🌟 關鍵路徑：只准呼叫 internalPaymentLogic，不准呼叫 paymentController
        if (url.pathname === "/api/payment/create" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return internalPaymentLogic.createOrder(request, currentUserId!, env, corsHeaders);
        }

        if (url.pathname === "/api/payment/notify" && request.method === "POST") {
          return internalPaymentLogic.handleNotify(request, env);
        }

        // --- 其他 API (auth, user, comm 等) 維持原本的 Controller 呼叫 ---
        if (request.method === "GET" && url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        // ... (其餘路由請維持原本 index.ts 的寫法) ...
        // ⚠️ 註：請確保在 index.ts 最下方保留處理靜態資源 (env.ASSETS.fetch) 的部分
      }
    } catch (e: any) {
      return new Response(e.message, { status: 500, headers: corsHeaders });
    }
    
    // SPA 靜態資源處理 (請務必保留)
    return env.ASSETS.fetch(request);
  }
};