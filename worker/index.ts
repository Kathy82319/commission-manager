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

    // 1. 處理藍新支付完成後的跳轉 (ReturnURL)
    if (url.pathname === "/payment/result" && request.method === "POST") {
      const redirectUrl = new URL("/artist/settings", url.origin);
      redirectUrl.searchParams.set("payment", "success");
      return Response.redirect(redirectUrl.toString(), 302);
    }

    const requestOrigin = request.headers.get("Origin") || "";
    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      if (url.pathname.startsWith("/api/")) {
        const currentUserId = await getUserIdFromRequest(request, env);

        // --- Payment API ---
        if (url.pathname === "/api/payment/create" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
        }
        if (url.pathname === "/api/payment/notify" && request.method === "POST") {
          return paymentController.handleNotify(request, env);
        }

        // --- Auth API ---
        if (url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        if (url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

        // --- User API ---
        if (url.pathname.startsWith("/api/users/")) {
          if (url.pathname === "/api/users/me/complete-onboarding" && request.method === "POST") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.completeOnboarding(request, currentUserId!, env, corsHeaders);
          }
          const targetId = url.pathname.split("/")[3];
          if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
          if (request.method === "PATCH") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
          }
        }

        // --- Admin API (修正方法名稱與參數) ---
        if (url.pathname.startsWith("/api/admin/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          
          if (url.pathname === "/api/admin/stats") {
            // 🌟 修正：使用 getDashboardStats 並傳入 currentUserId
            return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
          }
        }

        // --- Commission API ---
        if (url.pathname.startsWith("/api/commissions")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          const targetId = url.pathname.split("/")[3];
          if (!targetId && request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
          if (!targetId && request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
          if (targetId && request.method === "GET") return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
        }

        // --- Storage API (R2) ---
        if (url.pathname.startsWith("/api/r2/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        }

        // --- Test API ---
        if (url.pathname.startsWith("/api/test/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        }
        
        return new Response(JSON.stringify({ success: false, error: "Route Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }

    return env.ASSETS.fetch(request);
  }
};