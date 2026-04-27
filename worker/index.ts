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
import { customerController } from "./controllers/customerController";
import { bulletinController } from "./controllers/bulletinController"; 

export default {
  async fetch(request: any, env: Env): Promise<any> {
    const url = new URL(request.url);
    const sanitizedPath = url.pathname.replace(/\/$/, "");
    const pathParts = sanitizedPath.split("/");
    const requestOrigin = request.headers.get("Origin") || "";
    
    if (sanitizedPath === "/payment/result" && request.method === "POST") {
      const redirectUrl = new URL("/artist/settings", url.origin);
      redirectUrl.searchParams.set("payment", "success");
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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (sanitizedPath.startsWith("/api/")) {
      const currentUserId = await getUserIdFromRequest(request, env);

      // --- [新增] 許願池 (Bulletins) 路由 ---
      if (sanitizedPath.startsWith("/api/bulletins")) {

if (sanitizedPath === "/api/bulletins/client/inbox" && request.method === "GET") {
  const authErr = requireAuth(currentUserId, corsHeaders);
  if (authErr) return authErr;
  return bulletinController.getClientInbox(currentUserId!, env, corsHeaders);
}

if (sanitizedPath === "/api/bulletins/artist/inbox" && request.method === "GET") {
  const authErr = requireAuth(currentUserId, corsHeaders);
  if (authErr) return authErr;
  return bulletinController.getArtistInbox(currentUserId!, env, corsHeaders);
}        
        const targetId = pathParts[3]; // e.g. /api/bulletins/123 -> 123
        const subAction = pathParts[4]; // e.g. inquire

        if (!targetId) {
          if (request.method === "GET") return bulletinController.getList(env, corsHeaders);
          if (request.method === "POST") {
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) return authErr;
            return bulletinController.create(request, currentUserId!, env, corsHeaders);
          }
        } else if (targetId && subAction === "inquire" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.inquire(request, targetId, currentUserId!, env, corsHeaders);
        }
      }

      // --- 意向投遞 (Inquiries) 相關路由 ---
      if (sanitizedPath.startsWith("/api/inquiries/")) {
        const targetId = pathParts[3];
        const subAction = pathParts[4];
        
        // 原有的婉拒 API
        if (targetId && subAction === "decline" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.declineInquiry(request, targetId, currentUserId!, env, corsHeaders);
        }

        // 新增的送出回覆 API
        if (targetId && subAction === "submit-response" && request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.submitResponse(request, targetId, currentUserId!, env, corsHeaders);
        }
if (targetId && subAction === "accept" && request.method === "POST") {
  const authErr = requireAuth(currentUserId, corsHeaders);
  if (authErr) return authErr;
  return bulletinController.acceptInquiry(request, targetId, currentUserId!, env, corsHeaders);
}        

      }
      // ----------------------------------------

      if (sanitizedPath.startsWith("/api/customers")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;

        const targetId = pathParts[3]; 
        const subAction = pathParts[4]; 

        if (!targetId) {
          if (request.method === "GET") return customerController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return customerController.create(request, currentUserId!, env, corsHeaders);
        } else if (targetId && subAction === "history") {
          if (request.method === "GET") return customerController.getHistory(targetId, currentUserId!, env, corsHeaders);
        } else {
          if (request.method === "GET") return customerController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH") return customerController.update(request, targetId, currentUserId!, env, corsHeaders);
          if (request.method === "DELETE") return customerController.delete(targetId, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath === "/api/payment/create" && request.method === "POST") {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath === "/api/payment/notify" && request.method === "POST") {
        return paymentController.handleNotify(request, env);
      }

      if (request.method === "GET" && sanitizedPath === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
      if (request.method === "GET" && sanitizedPath === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);
      if (request.method === "GET" && sanitizedPath === "/api/auth/testing-bypass") return authController.testingBypass(request, env, corsHeaders);

      if (sanitizedPath.startsWith("/api/showcase")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        const targetId = pathParts[3];
        if (request.method === "GET" && !targetId) return showcaseController.getMyItems(currentUserId!, env, corsHeaders);
        if (request.method === "POST") return showcaseController.create(request, currentUserId!, env, corsHeaders);
        if (request.method === "PATCH" && targetId) return showcaseController.update(request, targetId, currentUserId!, env, corsHeaders);
        if (request.method === "DELETE" && targetId) return showcaseController.delete(targetId, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath.startsWith("/api/public/showcase/")) {
        const artistId = pathParts[4];
        return showcaseController.getPublicList(artistId, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/admin/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "GET" && sanitizedPath === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
        if (request.method === "GET" && sanitizedPath === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
        if (request.method === "GET" && sanitizedPath === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
        if (request.method === "PATCH" && pathParts[3] === "users" && pathParts.length === 5) {
          return adminController.updateUser(request, pathParts[4], currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath.startsWith("/api/users/")) {
        const targetId = pathParts[3];
        if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
        
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;

        if (request.method === "PATCH") return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
        if (request.method === "DELETE" && targetId === "me") return userController.deleteUser(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/complete-onboarding")) return userController.completeOnboarding(request, currentUserId!, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/commissions")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
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

      if (sanitizedPath.startsWith("/api/r2/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && sanitizedPath.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath.startsWith("/api/test/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && sanitizedPath.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
      }

      return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
    }

    const assetResponse = await env.ASSETS.fetch(request as any);
    if (assetResponse.status === 404 || sanitizedPath.includes("@")) {
      const indexRequest = new Request(new URL("/", request.url).toString(), request as any);
      return env.ASSETS.fetch(indexRequest as any);
    }
    return assetResponse as any;
  }   
};