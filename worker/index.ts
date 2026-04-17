// worker/index.ts
import type { Env } from "./shared/types";
import { getUserIdFromRequest, requireAuth } from "./middleware/auth";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { commController } from "./controllers/commController";
import { r2Controller } from "./controllers/r2Controller";
import { testController } from "./controllers/testController";
import { adminController } from "./controllers/adminController";

// 🚀 將 Payment 邏輯直接寫在這裡，徹底避免 import 失敗或緩存問題
const internalPaymentLogic = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.NEWEBPAY_MERCHANT_ID || !env.commission_db) {
        return new Response(JSON.stringify({ success: false, error: "系統環境配置錯誤" }), { status: 500, headers: corsHeaders });
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
        ItemDesc: `PRO_PLAN_TEST_${Date.now()}`, 
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: hookdeckUrl,
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      // 🌟 修正點：因為移到了 index.ts，所以路徑從 ../utils 變成 ./utils
      const { newebpay } = await import("./utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        deploy_version: "v1.0.3_INTEGRATED", // 🌟 新的版本號，用來確認更新成功
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
    let rawBody = "";
    try {
      rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";

      await env.commission_db.prepare(
        "INSERT INTO WebhookLogs (message) VALUES (?)"
      ).bind(`[入口觸發] 格式: ${contentType}, 長度: ${rawBody.length}`).run();

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

      if (status !== "SUCCESS" || !tradeInfo) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`狀態不符: Status=${status}`).run();
        return new Response("OK");
      }

      // 🌟 修正點：路徑從 ../utils 變成 ./utils
      const { newebpay } = await import("./utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
      ).bind(orderId).all();
      
      if (results.length === 0) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`訂單處理跳過: ${orderId}`).run();
        return new Response("OK");
      }

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🎉 升級成功: 訂單 ${orderId}`).run();

      return new Response("OK");
    } catch (error: any) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🚨 Notify 錯誤: ${error.message}`).run();
      return new Response("OK");
    }
  }
};

export default {
  async fetch(request: any, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";

    // --- 1. 藍新 ReturnURL 攔截 ---
    if (url.pathname === "/payment/result" && request.method === "POST") {
      return Response.redirect("https://cath-commission-manager.pages.dev/artist/settings?payment=success", 302);
    }

    // --- 2. CORS 安全檢查 ---
    const allowedOrigins = [
      env.FRONTEND_URL,
      "http://localhost:5173",
      "https://commission-app.pages.dev",
      "https://cath-commission-manager.pages.dev"
    ];
    const safeOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : (env.FRONTEND_URL || "");

    const corsHeaders = {
      "Access-Control-Allow-Origin": safeOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

// 在 currentUserId 獲取之後加上這段：
if (url.pathname === "/api/version") {
  const testDesc = `PRO_PLAN_TEST_${Date.now()}`; // 這就是會送給藍新的變數
  return new Response(JSON.stringify({ 
    version: "v1.0.3_INTEGRATED",
    expected_item_desc: testDesc,
    status: "If this desc is new, the problem is definitely the Frontend URL." 
  }), { headers: corsHeaders });
}

    try {
      // --- 3. API 路由分發中心 ---
      if (url.pathname.startsWith("/api/")) {
        const currentUserId = await getUserIdFromRequest(request, env);

        // 🟢 7. Payment API (金流專區 - 使用內部整合邏輯)
        if (url.pathname.startsWith("/api/payment/")) {
          console.log(`[Debug] 進入 Payment API 路徑: ${url.pathname}`);

          if (request.method === "POST" && url.pathname === "/api/payment/create") {
            console.log(`[Debug] 嘗試建立訂單, userId: ${currentUserId}`);
            
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) {
               console.log("[Debug] 被 requireAuth 攔截了");
               return authErr;
            }

            const response = await internalPaymentLogic.createOrder(request, currentUserId!, env, corsHeaders);
            console.log("[Debug] Controller 執行完畢");
            return response;
          }
          
          if (request.method === "POST" && url.pathname === "/api/payment/notify") {
            return internalPaymentLogic.handleNotify(request, env);
          }
        }

        // 🟢 其餘 API 路由維持原樣呼叫外部 Controller
        if (request.method === "GET" && url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        if (request.method === "GET" && url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

        if (url.pathname.startsWith("/api/admin/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "GET" && url.pathname === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
          if (request.method === "GET" && url.pathname === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
          if (request.method === "GET" && url.pathname === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH" && pathParts[3] === "users" && pathParts.length === 5) {
            return adminController.updateUser(request, pathParts[4], currentUserId!, env, corsHeaders);
          }
        }

        if (url.pathname.startsWith("/api/users/")) {
          const targetId = pathParts[3];
          if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
          if (request.method === "PATCH") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
          }
          if (request.method === "DELETE" && targetId === "me") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.deleteUser(currentUserId!, env, corsHeaders);
          }
          if (request.method === "POST" && url.pathname.endsWith("/complete-onboarding")) {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.completeOnboarding(request, currentUserId!, env, corsHeaders);
          }
        }

        if (url.pathname.startsWith("/api/commissions")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          const targetId = pathParts[3];
          if (request.method === "GET" && !targetId) return commController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST" && !targetId) return commController.create(request, currentUserId!, env, corsHeaders);
          if (targetId) {
            if (request.method === "GET" && pathParts.length === 4) return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
            if (request.method === "PATCH" && pathParts.length === 4) return commController.update(request, targetId, currentUserId!, env, corsHeaders);
            const subAction = pathParts[4];
            if (request.method === "GET" && ["deliverables", "submissions", "logs"].includes(subAction)) return commController.getDeliverables(targetId, subAction, currentUserId!, env, corsHeaders);
            if (request.method === "POST" && subAction === "submit") return commController.submitArtwork(request, targetId, currentUserId!, env, corsHeaders);
            if (request.method === "POST" && subAction === "review") return commController.reviewArtwork(request, targetId, currentUserId!, env, corsHeaders);
            if (request.method === "GET" && subAction === "messages") return commController.getMessages(targetId, currentUserId!, env, corsHeaders);
            if (request.method === "POST" && subAction === "messages") return commController.postMessage(request, targetId, currentUserId!, env, corsHeaders);
            if (request.method === "GET" && subAction === "payments") return commController.getPayments(targetId, currentUserId!, env, corsHeaders);
            if (request.method === "POST" && subAction === "payments") return commController.postPayment(request, targetId, currentUserId!, env, corsHeaders);
            if (request.method === "DELETE" && subAction === "payments") return commController.deletePayment(pathParts[5], currentUserId!, env, corsHeaders);
          }
        }

        if (url.pathname.startsWith("/api/r2/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "POST" && url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
          if (request.method === "POST" && url.pathname.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
        }

        if (url.pathname.startsWith("/api/test/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "POST" && url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
          if (request.method === "POST" && url.pathname.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
        }

        return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "後端內部錯誤", 
        message: e.message,
        stack: e.stack 
      }), { status: 500, headers: corsHeaders });
    }

    // --- 4. 處理 Vite 前端靜態資源 (SPA 路由支撐) ---
    try {
      const assetResponse = await env.ASSETS.fetch(request as any);
      if (assetResponse.status === 404 || url.pathname.includes("@")) {
        const indexRequest = new Request(new URL("/", request.url).toString(), request as any);
        return env.ASSETS.fetch(indexRequest as any);
      }
      return assetResponse as any;
    } catch (e) {
      const indexRequest = new Request(new URL("/", request.url).toString(), request as any);
      return env.ASSETS.fetch(indexRequest as any);
    }
  }
};