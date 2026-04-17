// worker/index.ts
import { paymentController } from "./controllers/paymentController";

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 🕵️ 測試點：手動繞過所有邏輯，直接看 Controller 有沒有反應
    if (url.pathname === "/api/payment/create") {
      try {
        const mockCors = { "Access-Control-Allow-Origin": "*" };
        // 我們直接呼叫原本的 controller
        return await paymentController.createOrder(request, "TEST_USER_123", env, mockCors);
      } catch (e: any) {
        return new Response(`Controller 崩潰了: ${e.message}`);
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};