// worker/index.ts
import type { Env } from "./shared/types";
import { getUserIdFromRequest, requireAuth } from "./middleware/auth";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { commController } from "./controllers/commController";
import { r2Controller } from "./controllers/r2Controller";
import { testController } from "./controllers/testController";
import { adminController } from "./controllers/adminController";
import { paymentController } from "./controllers/paymentController";

export default {
  async fetch(request: any, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";

    // --- 1. 藍新 ReturnURL 攔截 (處理刷卡後的自動跳轉) ---
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

    // 處理 CORS 預檢請求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // --- 3. API 路由分發中心 ---
      if (url.pathname.startsWith("/api/")) {
        // 先嘗試獲取使用者 ID (不一定要強制登入，部分路由才需要)
        const currentUserId = await getUserIdFromRequest(request, env);

    // 🟢 7. Payment API (金流專區)
        if (url.pathname.startsWith("/api/payment/")) {
          console.log(`[Debug] 進入 Payment API 路徑: ${url.pathname}`);

          if (request.method === "POST" && url.pathname === "/api/payment/create") {
            console.log(`[Debug] 嘗試建立訂單, userId: ${currentUserId}`);
            
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) {
               console.log("[Debug] 被 requireAuth 攔截了");
               return authErr;
            }

            // 🌟 這裡最關鍵：加一個 version 直接測試
            const response = await paymentController.createOrder(request, currentUserId!, env, corsHeaders);
            console.log("[Debug] Controller 執行完畢");
            return response;
          }
          
          if (request.method === "POST" && url.pathname === "/api/payment/notify") {
            return paymentController.handleNotify(request, env);
          }
        }

        // 🟢 1. Auth API (不需登入)
        if (request.method === "GET" && url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        if (request.method === "GET" && url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

        // 🟢 2. Admin API (需登入)
        if (url.pathname.startsWith("/api/admin/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "GET" && url.pathname === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
          if (request.method === "GET" && url.pathname === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
          if (request.method === "GET" && url.pathname === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH" && pathParts[3] === "users" && pathParts.length === 5) {
            return adminController.updateUser(request, pathParts[4], currentUserId!, env, corsHeaders);
          }
        }

        // 🟢 3. User API
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

        // 🟢 4. Commissions API
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

        // 🟢 5. R2 API
        if (url.pathname.startsWith("/api/r2/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "POST" && url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
          if (request.method === "POST" && url.pathname.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
        }

        // 🟢 6. Test API
        if (url.pathname.startsWith("/api/test/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (request.method === "POST" && url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
          if (request.method === "POST" && url.pathname.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
        }

        return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      // 捕捉所有未預期的錯誤並吐出 Stack
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