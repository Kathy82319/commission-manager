// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

export const paymentController = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.NEWEBPAY_MERCHANT_ID || !env.commission_db) {
        return new Response(JSON.stringify({ success: false, error: "系統環境配置錯誤" }), { status: 500, headers: corsHeaders });
      }

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      const amount = 199;
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 

      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      // 🌟 直接將網址寫死，確保藍新 100% 拿到正確地址！
      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";
      const absoluteBackendUrl = "https://cath-commission-manager.pages.dev";

      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        ItemDesc: `Arti 繪師小幫手 - 專業版 30 天`,
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: `${absoluteBackendUrl}/api/payment/notify`, // 絕對正確的地址
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      const { newebpay } = await import("../utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        data: {
          MerchantID: env.NEWEBPAY_MERCHANT_ID,
          TradeInfo: aesString,
          TradeSha: shaString,
          Version: "2.0",
          PayGateWay: "https://ccore.newebpay.com/MPG/mpg_gateway"
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: corsHeaders });
    }
  },

  async handleNotify(request: Request, env: Env): Promise<Response> {
    try {
      const formData = await request.formData();
      const status = formData.get("Status");
      const tradeInfo = formData.get("TradeInfo") as string;


      // 🕵️ 監視器啟動：只要藍新來敲門，不管成功失敗，先記錄下來！
      const text = await request.text();
      await env.commission_db.prepare(
        "INSERT INTO WebhookLogs (message) VALUES (?)"
      ).bind(`收到請求原始內容: ${text.substring(0, 100)}...`).run();

      if (status !== "SUCCESS" || !tradeInfo) return new Response("OK");

      // 載入 Web Crypto API 進行解密
      const { newebpay } = await import("../utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      // 檢查訂單
      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
      ).bind(orderId).all();
      
      if (results.length === 0) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`找不到訂單或已付款: ${orderId}`).run();
        return new Response("OK"); 
      }

      const order = results[0] as any;
      const userId = order.user_id;

      // 更新訂單與帳號
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare(
          "UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?"
        ).bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare(
          "UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?"
        ).bind(newExpiry.toISOString(), userId)
      ]);

      // 🕵️ 記錄成功升級
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`完美升級成功！使用者: ${userId}`).run();

      return new Response("OK"); 
    } catch (error: any) {
      // 🕵️ 如果解密或資料庫出錯，記錄詳細錯誤
      return new Response(`Notify Error: ${error.message}`, { status: 500 });
    }
  }
};