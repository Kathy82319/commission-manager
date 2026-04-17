import type { Env } from "./shared/types";
import { getUserIdFromRequest, requireAuth } from "./middleware/auth";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { commController } from "./controllers/commController";
import { r2Controller } from "./controllers/r2Controller";
import { testController } from "./controllers/testController";
import { adminController } from "./controllers/adminController";

/**
 * 🚀 核心金流邏輯 (內置版)
 * 徹底切斷外部引用，確保修改即時生效
 */
const internalPaymentLogic = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.NEWEBPAY_MERCHANT_ID || !env.commission_db) {
        throw new Error("系統環境配置錯誤 (D1 or MerchantID missing)");
      }

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      const amount = 199;
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 

      // 1. 寫入資料庫
      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";
      const hookdeckUrl = "https://hkdk.events/3zyr10gulio2ol";

      // 2. 準備藍新包裹
      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        // 🌟 終極辨識字串：如果你看到這個，代表我們成功殺死了 Arti 幽靈
        ItemDesc: `PRO_PLAN_UPDATE_CONFIRMED_${Date.now()}`, 
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: hookdeckUrl,
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      // 3. 加密處理 (路徑指向同級的 utils)
      const { newebpay } = await import("./utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        deploy_version: "v1.0.7_FINAL_STABLE", 
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
    try {
      const rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";
      
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`[Notify] 入手成功: ${contentType}`).run();

      let status: string | null = null;
      let tradeInfo: string | null = null;

      if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
        const jsonBody = JSON.parse(rawBody);
        status = jsonBody.Status;
        tradeInfo = jsonBody.TradeInfo;
      } else {
        const params = new URLSearchParams(rawBody);
        status = params.get("Status");
        tradeInfo = params.get("TradeInfo");
      }

      if (status !== "SUCCESS" || !tradeInfo) return new Response("OK");

      const { newebpay } = await import("./utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      const { results } = await env.commission_db.prepare("SELECT * FROM PaymentOrders WHERE id = ?").bind(orderId).all();
      if (results.length === 0) return new Response("OK");

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🎉 升級成功: ${orderId}`).run();
      return new Response("OK");
    } catch (e: any) {
      return new Response("OK");
    }
  }
};

export default {
  async fetch(request: any, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";

    // 1. 處理藍新重導向
    if (url.pathname === "/payment/result" && request.method === "POST") {
      return Response.redirect("https://cath-commission-manager.pages.dev/artist/settings?payment=success", 302);
    }

    // 2. CORS 設定
    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      if (url.pathname.startsWith("/api/")) {
        // 3. 測試路由
        if (url.pathname === "/api/version") {
          return new Response(JSON.stringify({ version: "v1.0.7_FINAL", status: "All Systems Go" }), { headers: corsHeaders });
        }

        const currentUserId = await getUserIdFromRequest(request, env);

        // 🟢 Payment API (強行對接內部邏輯)
        if (url.pathname === "/api/payment/create" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return await internalPaymentLogic.createOrder(request, currentUserId!, env, corsHeaders);
        }
        if (url.pathname === "/api/payment/notify" && request.method === "POST") {
          return await internalPaymentLogic.handleNotify(request, env);
        }

        // 🟢 其他 Controller 路由
        if (url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        if (url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

        if (url.pathname.startsWith("/api/admin/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
          if (url.pathname === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
          if (url.pathname === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
        }

        if (url.pathname.startsWith("/api/users/")) {
          const targetId = pathParts[3];
          if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
          if (request.method === "PATCH") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
          }
        }

        if (url.pathname.startsWith("/api/commissions")) {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            const targetId = pathParts[3];
            if (!targetId && request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
            if (!targetId && request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
            if (targetId) return commController.getDetail(targetId, currentUserId!, env, corsHeaders); // 簡化示範
        }

        if (url.pathname.startsWith("/api/r2/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        }
        
        return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }

    // 4. SPA 靜態資源處理 (萬能兜底)
    return env.ASSETS.fetch(request);
  }
};