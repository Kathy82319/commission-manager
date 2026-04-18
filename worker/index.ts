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
  async fetch(request: any, env: Env): Promise<any> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";
    
    // 1. 處理藍新支付完成後的跳轉 (ReturnURL)
    // 藍新完成支付後會以 POST 方式打到此端點
    if (url.pathname === "/payment/result" && request.method === "POST") {
      const redirectUrl = new URL("/artist/settings", url.origin);
      redirectUrl.searchParams.set("payment", "success");
      // 建議：將 POST 導向 GET 頁面，使用 303 See Other 會比 302 更符合 HTTP 語意
      return Response.redirect(redirectUrl.toString(), 303);
    }
    
    const allowedOrigins = [
      env.FRONTEND_URL, 
      "http://localhost:5173", 
      "https://commission-app.pages.dev",
      "https://cath-commission-manager.pages.dev"
    ];
    const safeOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.FRONTEND_URL || "";

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

    // API 路由分發中心
    if (url.pathname.startsWith("/api/")) {
      const currentUserId = await getUserIdFromRequest(request, env);

      // --- 0. Payment API (藍新金流) ---
      if (url.pathname === "/api/payment/create" && request.method === "POST") {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
      }
      if (url.pathname === "/api/payment/notify" && request.method === "POST") {
        // 注意：此處不需 requireAuth，因為是藍新伺服器發起的回傳，但需在 controller 內驗證 Hash
        return paymentController.handleNotify(request, env);
      }

      // 1. Auth API (不需登入)
      if (request.method === "GET" && url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
      if (request.method === "GET" && url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

      // 2. Admin API
      if (url.pathname.startsWith("/api/admin/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        
        if (request.method === "GET" && url.pathname === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
        if (request.method === "GET" && url.pathname === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
        if (request.method === "GET" && url.pathname === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
        
        if (request.method === "PATCH" && pathParts[3] === "users" && pathParts.length === 5) {
          const targetId = pathParts[4];
          return adminController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
        }
      }

      // 3. User API
      if (url.pathname.startsWith("/api/users/")) {
        const targetId = pathParts[3];
        if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
        
        if (request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders); 
          if (authErr) return authErr;
          return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
        }
        if (request.method === "DELETE" && targetId === "me") {
          const authErr = requireAuth(currentUserId, corsHeaders); 
          if (authErr) return authErr;
          return userController.deleteUser(currentUserId!, env, corsHeaders);
        }
        if (request.method === "POST" && url.pathname.endsWith("/complete-onboarding")) {
          const authErr = requireAuth(currentUserId, corsHeaders); 
          if (authErr) return authErr;
          return userController.completeOnboarding(request, currentUserId!, env, corsHeaders);
        }
      }

// --- Commission API ---
// --- Commission API ---
if (url.pathname.startsWith("/api/commissions")) {
  const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
  
  const pathParts = url.pathname.split("/");
  const targetId = pathParts[3]; // 這是 ID (例如 12345)
  const subAction = pathParts[4]; // 這是動作 (例如 submit, review, deliverables)

  // 1. 無 ID 的操作
  if (!targetId) {
    if (request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
    if (request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
  }

  // 2. 有 ID 但沒有子動作的操作 (詳情或更新)
  if (targetId && !subAction) {
    if (request.method === "GET") return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
    if (request.method === "PATCH") return commController.update(request, targetId, currentUserId, env, corsHeaders);
  }

  // 3. 有子動作的操作 (這部分是原本漏掉或被攔截的關鍵)
  if (targetId && subAction) {
    switch (subAction) {
      case "deliverables":
      case "submissions":
      case "logs":
        return commController.getDeliverables(targetId, subAction, currentUserId!, env, corsHeaders);
      case "submit":
        if (request.method === "POST") return commController.submitArtwork(request, targetId, currentUserId!, env, corsHeaders);
        break;
      case "review":
        if (request.method === "POST") return commController.reviewArtwork(request, targetId, currentUserId!, env, corsHeaders);
        break;
      case "change-request": // 異動申請
        if (request.method === "POST") return commController.changeRequest(request, targetId, currentUserId!, env, corsHeaders);
        break;
      case "change-response": // 異動回應
        if (request.method === "POST") return commController.respondToChange(request, targetId, currentUserId!, env, corsHeaders);
        break;
      case "payments":
        if (request.method === "GET") return commController.getPayments(targetId, currentUserId!, env, corsHeaders);
        if (request.method === "POST") return commController.postPayment(request, targetId, currentUserId!, env, corsHeaders);
        break;
      case "messages":
        if (request.method === "GET") return commController.getMessages(targetId, currentUserId!, env, corsHeaders);
        if (request.method === "POST") return commController.postMessage(request, targetId, currentUserId!, env, corsHeaders);
        break;
    }
  }
}

// --- Storage API (R2) ---
if (url.pathname.startsWith("/api/r2/")) {
  const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
  if (url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
  if (url.pathname.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
}

      // 5. R2 API
      if (url.pathname.startsWith("/api/r2/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && url.pathname.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
      }

      // 6. Test API
      if (url.pathname.startsWith("/api/test/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && url.pathname.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
      }

      // 找不到 API 路由
      return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
    }

    // 處理 Vite 前端靜態資源
    const assetResponse = await env.ASSETS.fetch(request as any);
    if (assetResponse.status === 404 || url.pathname.includes("@")) {
      const indexRequest = new Request(new URL("/", request.url).toString(), request as any);
      return env.ASSETS.fetch(indexRequest as any);
    }
    return assetResponse as any;
  }  
};