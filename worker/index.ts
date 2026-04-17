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

    // 處理藍新跳轉 (ReturnURL)
    if (url.pathname === "/payment/result" && request.method === "POST") {
      return Response.redirect("https://cath-commission-manager.pages.dev/artist/settings?payment=success", 302);
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

        // 🕵️ 除錯路由：讓你一眼看穿伺服器版本
        if (url.pathname === "/api/version") {
          return new Response(JSON.stringify({ 
            version: "v1.0.8_STABLE", 
            status: "Running with Fixed Decryption" 
          }), { headers: corsHeaders });
        }

        // --- Payment API ---
        if (url.pathname === "/api/payment/create" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
        }
        if (url.pathname === "/api/payment/notify" && request.method === "POST") {
          return paymentController.handleNotify(request, env);
        }

        // --- 其他路由保持不變 (但請確保邏輯一致) ---
        if (url.pathname === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
        if (url.pathname === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);

        if (url.pathname.startsWith("/api/users/")) {
          const targetId = url.pathname.split("/")[3];
          if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);
          if (request.method === "PATCH") {
            const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
            return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
          }
        }

        if (url.pathname.startsWith("/api/commissions")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          const targetId = url.pathname.split("/")[3];
          if (!targetId && request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
          if (!targetId && request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
          if (targetId && request.method === "GET") return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
        }

        if (url.pathname.startsWith("/api/r2/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        }

        if (url.pathname.startsWith("/api/test/")) {
          const authErr = requireAuth(currentUserId, corsHeaders); if (authErr) return authErr;
          if (url.pathname.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        }
        
        return new Response(JSON.stringify({ success: false, error: "Route Not Found" }), { status: 404, headers: corsHeaders });
      }
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }

    // 靜態資源處裡 (Vite Assets)
    return env.ASSETS.fetch(request);
  }
};