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
import { showcaseController } from "./controllers/showcaseController";

export default {
  async fetch(request: any, env: Env): Promise<any> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const requestOrigin = request.headers.get("Origin") || "";
    
    // 支付結果回傳處理
    if (url.pathname === "/payment/result" && request.method === "POST") {
      const redirectUrl = new URL("/artist/settings", url.origin);
      redirectUrl.searchParams.set("payment", "success");
      return Response.redirect(redirectUrl.toString(), 303);
    }
    
    // CORS 跨域設定
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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API 路由處理
    if (url.pathname.startsWith("/api/")) {
      const currentUserId = await getUserIdFromRequest(request, env);

      // 支付相關 API
      if (url.pathname === "/api/payment/create" && request.method === "POST") {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
      }
      if (url.pathname === "/api/payment/notify" && request.method === "POST") {
        return paymentController.handleNotify(request, env);
      }

      // LINE Auth API
      if (request.method === "GET" && url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
      if (request.method === "GET" && url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

      // 徵委託項目路由 (需要驗證)
      if (url.pathname.startsWith("/api/showcase")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;

        const targetId = pathParts[3];
        if (request.method === "GET" && !targetId) return showcaseController.getMyItems(currentUserId!, env, corsHeaders);
        if (request.method === "POST") return showcaseController.create(request, currentUserId!, env, corsHeaders);
        if (request.method === "PATCH" && targetId) return showcaseController.update(request, targetId, currentUserId!, env, corsHeaders);
        if (request.method === "DELETE" && targetId) return showcaseController.delete(targetId, currentUserId!, env, corsHeaders);
      }

      // 公開展示接口 (不需驗證)
      if (url.pathname.startsWith("/api/public/showcase/")) {
        const artistId = pathParts[4];
        return showcaseController.getPublicList(artistId, env, corsHeaders);
      }

      // 管理員 API
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

      // 使用者設定與資料 API
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

      // 委託案管理 API
      if (url.pathname.startsWith("/api/commissions")) {
        const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
        
        const targetId = pathParts[3]; 
        const subAction = pathParts[4]; 

        if (!targetId) {
          if (request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
        } else if (targetId && !subAction) {
          if (request.method === "GET") return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH") return commController.update(request, targetId, currentUserId, env, corsHeaders);
        } else if (targetId && subAction) {
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
            case "change-request":
              if (request.method === "POST") return commController.changeRequest(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "change-response":
              if (request.method === "POST") return commController.respondToChange(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "payments":
              if (request.method === "GET") return commController.getPayments(targetId, currentUserId!, env, corsHeaders);
              if (request.method === "POST") return commController.postPayment(request, targetId, currentUserId!, env, corsHeaders);
              if (request.method === "DELETE" && pathParts[5]) return commController.deletePayment(pathParts[5], currentUserId!, env, corsHeaders);
              break;
            case "messages":
              if (request.method === "GET") return commController.getMessages(targetId, currentUserId!, env, corsHeaders);
              if (request.method === "POST") return commController.postMessage(request, targetId, currentUserId!, env, corsHeaders);
              break;
          }
        }
      }

      // R2 檔案傳輸 API
      if (url.pathname.startsWith("/api/r2/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && url.pathname.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
      }

      // 測試用途 API
      if (url.pathname.startsWith("/api/test/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && url.pathname.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
      }

      if (request.method === "GET" && url.pathname === "/api/auth/testing-bypass") {
        return authController.testingBypass(request, env, corsHeaders);
      }
 
      return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
    }

    // 靜態資源處理 (Cloudflare Pages Assets)
    const assetResponse = await env.ASSETS.fetch(request as any);
    if (assetResponse.status === 404 || url.pathname.includes("@")) {
      const indexRequest = new Request(new URL("/", request.url).toString(), request as any);
      return env.ASSETS.fetch(indexRequest as any);
    }
    return assetResponse as any;
  }  
};