// worker/index.ts
import type { Env } from "./shared/types";
import { paymentController } from "./controllers/paymentController";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";

    // 1. 基礎 CORS 設定
    const corsHeaders = {
      "Access-Control-Allow-Origin": requestOrigin || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    // 處理預檢請求
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 🕵️ 測試重點：手動觸發金流訂單建立
      if (url.pathname === "/api/payment/create") {
        console.log("正在執行測試版 CreateOrder...");

        // 🌟 使用你提供的真實 ID，確保資料庫外鍵約束檢查通過
        const testUserId = "Ue29d02da79b805e9df46bdf6442aa24c";

        return await paymentController.createOrder(
          request, 
          testUserId, 
          env, 
          corsHeaders
        );
      }

      // 🕵️ 處理藍新/Hookdeck 的回傳通知
      if (url.pathname === "/api/payment/notify") {
        return await paymentController.handleNotify(request, env);
      }

      // 其他路徑回傳 404
      return new Response(JSON.stringify({ 
        success: false, 
        message: "除錯模式：僅開放 /api/payment/create 與 notify",
        current_path: url.pathname
      }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (e: any) {
      // 捕捉所有執行期崩潰
      return new Response(JSON.stringify({
        success: false,
        error: "Worker 執行期潰散",
        message: e.message,
        stack: e.stack
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
};