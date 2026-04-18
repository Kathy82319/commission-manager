// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

export const paymentController = {
  /**
   * 1. 產生藍新支付表單資料 (POST /api/payment/create)
   */
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.NEWEBPAY_MERCHANT_ID || !env.commission_db) {
        return new Response(JSON.stringify({ success: false, error: "系統環境配置錯誤" }), { status: 500, headers: corsHeaders });
      }

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      
      const amount = 199;
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 
      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";

      // 寫入資料庫待付款紀錄
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
        Email: "user@example.com", // 建議未來可從資料庫抓取真實 Email
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`,
        NotifyURL: `${absoluteFrontendUrl}/api/payment/notify`, // 直接對接 Cloudflare
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

  /**
   * 2. 接收藍新通知 (Webhook) (POST /api/payment/notify)
   */
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

      // 🛡️ 資安補強：驗證雜湊值，確保資料未被竄改
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

      const { results } = await env.commission_db.prepare("SELECT user_id FROM PaymentOrders WHERE id = ?").bind(orderId).all();
      if (results.length === 0) return new Response("OK");

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      return new Response("OK");
    } catch (error: any) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🚨 Notify 處理異常: ${error.message}`).run();
      return new Response("OK");
    }
  }
};