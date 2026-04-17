// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";
import { newebpay } from "../utils/crypto";

export const paymentController = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      // 🕵️ 偵錯點 1：檢查環境變數是否真的有讀到
      if (!env.NEWEBPAY_MERCHANT_ID || !env.NEWEBPAY_HASH_KEY || !env.NEWEBPAY_HASH_IV) {
        throw new Error(`環境變數缺失! MerchantID: ${!!env.NEWEBPAY_MERCHANT_ID}, Key: ${!!env.NEWEBPAY_HASH_KEY}, IV: ${!!env.NEWEBPAY_HASH_IV}`);
      }

      // 🕵️ 偵錯點 2：檢查資料庫是否綁定成功
      if (!env.commission_db) {
        throw new Error("資料庫 (commission_db) 未成功綁定到 Worker");
      }

      // 解析前端傳來的資料
      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      
      const amount = 199;
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 

      // 🕵️ 偵錯點 3：嘗試寫入資料庫 (這裡常因為沒建 Table 而崩潰)
      try {
        await env.commission_db.prepare(
          "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
        ).bind(orderId, currentUserId, amount, plan_type).run();
      } catch (dbError: any) {
        throw new Error(`資料庫寫入失敗: ${dbError.message}`);
      }

      const tradeInfoObj = {
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount,
        ItemDesc: `Arti 繪師小幫手 - 專業版 30 天`,
        Email: "user@example.com",
        LoginType: 0,
        ReturnURL: `${env.FRONTEND_URL}/payment/result`,
        NotifyURL: `${env.BACKEND_URL}/api/payment/notify`, 
        ClientBackURL: `${env.FRONTEND_URL}/artist/settings`,
      };

      const params = new URLSearchParams(tradeInfoObj as any).toString();
      
      // 🕵️ 偵錯點 4：測試 Web Crypto 加密模組
      let aesString, shaString;
      try {
        aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
        shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      } catch (cryptoError: any) {
        throw new Error(`加密模組崩潰: ${cryptoError.message}`);
      }

      // 如果一切順利，回傳正確格式
      return new Response(JSON.stringify({
        success: true,
        data: {
          MerchantID: env.NEWEBPAY_MERCHANT_ID,
          TradeInfo: aesString,
          TradeSha: shaString,
          Version: "2.0",
          PayGateWay: "https://ccore.newebpay.com/MPG/mpg_gateway"
        }
      }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });

    } catch (error: any) {
      // 🚨 終極攔截：把真正的錯誤原因包裝成 JSON 吐給前端，不讓它變成 HTML！
      return new Response(JSON.stringify({
        success: false,
        error: "偵錯攔截器觸發",
        reason: error.message,
        stack: error.stack
      }), { 
        status: 400, // 故意不用 500，確保前端能正常印出這個 JSON
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },

  // Notify 路由我們暫時不動，先專注解決 Create 的崩潰
  async handleNotify(request: Request, env: Env): Promise<Response> {
     return new Response("OK");
  }
};