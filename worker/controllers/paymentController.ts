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
      const absoluteFrontendUrl = "https://commission-app.pages.dev";
      const backendUrl = env.BACKEND_URL || "https://commission-app.workers.dev";
      
      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      const tradeInfoObj: any = {
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        ItemDesc: "繪師管理系統 - 專業版訂閱 (30天)",
        Email: "user@example.com", 
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`,
        NotifyURL: `${absoluteFrontendUrl}/api/payment/notify`, 
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      };

      const params = Object.keys(tradeInfoObj)
        .map(key => `${key}=${tradeInfoObj[key]}`)
        .join('&');

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
      const rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";

      let status: string | null = null;
      let tradeInfo: string | null = null;
      let tradeSha: string | null = null;

      if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
        const jsonBody = JSON.parse(rawBody);
        status = jsonBody.Status;
        tradeInfo = jsonBody.TradeInfo;
        tradeSha = jsonBody.TradeSha;
      } else {
        const params = new URLSearchParams(rawBody);
        status = params.get("Status");
        tradeInfo = params.get("TradeInfo");
        tradeSha = params.get("TradeSha");
      }

      if (status !== "SUCCESS" || !tradeInfo || !tradeSha) return new Response("OK");

      const { newebpay } = await import("../utils/crypto");

      const computedSha = await newebpay.generateSha(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      if (computedSha !== tradeSha) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`🚨 雜湊驗證失敗！疑似偽造請求。`).run();
        return new Response("OK");
      }

      const decrypted = await newebpay.decrypt(tradeInfo.trim(), env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const decodedData = decodeURIComponent(decrypted.replace(/\+/g, " "));
      const data = JSON.parse(decodedData);
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

            const order = await env.commission_db.prepare("SELECT status, user_id FROM PaymentOrders WHERE id = ?").bind(orderId).first();
      if (!order) return new Response("OK");

      if (order.status === 'paid') {
        return new Response("OK");
      }

      const userId = order.user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      const updateUserStmt = env.commission_db.prepare(`
        UPDATE Users 
        SET plan_type = 'pro', pro_expires_at = ? 
        WHERE id = ? AND EXISTS (
          SELECT 1 FROM PaymentOrders WHERE id = ? AND status = 'pending'
        )
      `).bind(newExpiry.toISOString(), userId, orderId);

      const updateOrderStmt = env.commission_db.prepare(`
        UPDATE PaymentOrders 
        SET status = 'paid', trade_no = ?, pay_time = ? 
        WHERE id = ? AND status = 'pending'
      `).bind(tradeNo, data.Result.PayTime, orderId);

      const batchResults = await env.commission_db.batch([updateUserStmt, updateOrderStmt]);

      if (batchResults[1].meta.changes === 0) {
        console.log(`[Idempotency] Order ${orderId} was already processed concurrently.`);
        return new Response("OK");
      }

      return new Response("OK");
        } catch (error: any) {
      try {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`🚨 Notify 處理異常: ${error.message}`).run();
      } catch (logError) {
        console.error("WebhookLogs insert failed", logError);
      }
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};