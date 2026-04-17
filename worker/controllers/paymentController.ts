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
        // 跳轉到 Hookdeck 監聽，確保能收到藍新的通知
        NotifyURL: "https://hkdk.events/3zyr10gulio2ol", 
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
    let rawBody = "";
    try {
      rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";

      // 🕵️ 寫入初始日誌，幫我們確認收到的格式
      await env.commission_db.prepare(
        "INSERT INTO WebhookLogs (message) VALUES (?)"
      ).bind(`[入口觸發] 格式: ${contentType}, 長度: ${rawBody.length}`).run();

      let status: string | null = null;
      let tradeInfo: string | null = null;

      // 🌟 核心修復：根據 Content-Type 決定解析方式
      if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
        // 如果是 Hookdeck 轉發的 JSON 格式
        const jsonBody = JSON.parse(rawBody);
        status = jsonBody.Status;
        tradeInfo = jsonBody.TradeInfo;
      } else {
        // 如果是原始的表單格式
        const params = new URLSearchParams(rawBody);
        status = params.get("Status");
        tradeInfo = params.get("TradeInfo");
      }

      if (status !== "SUCCESS" || !tradeInfo) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`狀態不符或無資料: Status=${status}`).run();
        return new Response("OK");
      }

      // --- 以下加解密與資料庫邏輯維持不變 ---
      const { newebpay } = await import("../utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
      ).bind(orderId).all();
      
      if (results.length === 0) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`訂單不存在或已處理: ${orderId}`).run();
        return new Response("OK");
      }

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🎉 恭喜！訂單 ${orderId} 處理完成，使用者 ${userId} 已升級`).run();

      return new Response("OK");
    } catch (error: any) {
      try {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)").bind(`🚨 Notify 崩潰: ${error.message}`).run();
      } catch (dbErr) {
        console.error("資料庫寫入失敗", dbErr);
      }
      return new Response("OK");
    }
  }
};