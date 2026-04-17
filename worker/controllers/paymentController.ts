// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

// 🚨🚨🚨 注意：最上面絕對不要 import 任何 crypto 或 security 相關的檔案！🚨🚨🚨

export const paymentController = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      // 🕵️ 1. 基礎檢查
      if (!env.NEWEBPAY_MERCHANT_ID) throw new Error("環境變數未讀取");
      if (!env.commission_db) throw new Error("資料庫未綁定");

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      const orderId = `ORD${Date.now()}`;

      try {
        await env.commission_db.prepare(
          "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
        ).bind(orderId, currentUserId, 199, plan_type).run();
      } catch (dbError: any) {
        throw new Error(`資料庫寫入失敗: ${dbError.message}`);
      }

      const params = new URLSearchParams({
         MerchantID: env.NEWEBPAY_MERCHANT_ID,
         RespondType: "JSON",
         TimeStamp: Math.floor(Date.now() / 1000).toString(),
         Version: "2.0",
         MerchantOrderNo: orderId,
         Amt: "199",
         ItemDesc: `Arti 專業版 30 天`,
         LoginType: "0"
      }).toString();

      // 🌟🌟🌟 2. 動態引入 (Dynamic Import) 🌟🌟🌟
      // 這是抓出頂層崩潰的關鍵！我們強迫程式走到這裡才去讀取加密邏輯
      let aesString, shaString;
      try {
        const { newebpay } = await import("../utils/crypto");
        aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
        shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      } catch (cryptoErr: any) {
        throw new Error(`加密模組載入或執行崩潰: ${cryptoErr.message}`);
      }

      return new Response(JSON.stringify({
        success: true,
        data: { TradeInfo: aesString }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
      // 🚨 如果有任何錯誤，100% 會變成 JSON 印出來
      return new Response(JSON.stringify({
        success: false,
        error: "動態偵錯攔截器觸發",
        reason: error.message
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  },

  async handleNotify(request: Request, env: Env): Promise<Response> {
     return new Response("OK");
  }
};