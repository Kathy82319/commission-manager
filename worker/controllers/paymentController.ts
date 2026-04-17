// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

export const paymentController = {
// worker/controllers/paymentController.ts

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

      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";
      const hookdeckUrl = "https://hkdk.events/3zyr10gulio2ol";

      // 🌟 修正點：恢復 Version 為 "2.0"，否則藍新會拒絕包裹
      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0", // 必須是 2.0，且 V 要大寫
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        ItemDesc: `PRO_PLAN_TEST_${Date.now()}`, 
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: hookdeckUrl,
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      const { newebpay } = await import("../utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        // 🌟 偵錯標記：把測試版本號放在這裡，而不是放在 params 裡
        // 這樣你在瀏覽器 F12 Network 看到這行，就代表上傳成功了！
        deploy_version: "v1.0.2_STABLE", 
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
    let rawBody = "";
    try {
      rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";

      await env.commission_db.prepare(
        "INSERT INTO WebhookLogs (message) VALUES (?)"
      ).bind(`[入口觸發] 格式: ${contentType}, 長度: ${rawBody.length}`).run();

      let status: string | null = null;
      let tradeInfo: string | null = null;

      // 🌟 修正點 2：支援 Hookdeck 的 JSON 格式解析
      if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
        const jsonBody = JSON.parse(rawBody);
        status = jsonBody.Status;
        tradeInfo = jsonBody.TradeInfo;
      } else {
        const params = new URLSearchParams(rawBody);
        status = params.get("Status");
        tradeInfo = params.get("TradeInfo");
      }

      if (status !== "SUCCESS" || !tradeInfo) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`狀態不符: Status=${status}`).run();
        return new Response("OK");
      }

      const { newebpay } = await import("../utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
      ).bind(orderId).all();
      
      if (results.length === 0) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`訂單處理跳過: ${orderId}`).run();
        return new Response("OK");
      }

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🎉 升級成功: 訂單 ${orderId}`).run();

      return new Response("OK");
    } catch (error: any) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🚨 Notify 錯誤: ${error.message}`).run();
      return new Response("OK");
    }
  }
};