// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

export const paymentController = {
  /**
   * 1. 產生藍新支付表單資料
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

      // 建立訂單紀錄
      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      const absoluteFrontendUrl = "https://cath-commission-manager.pages.dev";

      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        // 🌟 使用唯一字串，確保這絕對是 v1.0.8 版本發出的請求
        ItemDesc: `PRO_PLAN_STABLE_v1.0.8_${Date.now()}`, 
        Email: "user@example.com",
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`, 
        NotifyURL: "https://hkdk.events/3zyr10gulio2ol", 
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      }).toString();

      const { newebpay } = await import("../utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        deploy_version: "v1.0.8_STABLE", // 增加版號回傳給前端 Console
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
   * 2. 接收藍新通知 (Webhook)
   */
  async handleNotify(request: Request, env: Env): Promise<Response> {
    try {
      const rawBody = await request.text();
      const contentType = request.headers.get("content-type") || "";

      // 🕵️ 日誌：追蹤封包進入
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`[Notify] 收到請求, 長度: ${rawBody.length}, 格式: ${contentType}`).run();

      let status: string | null = null;
      let tradeInfo: string | null = null;

      // 解析邏輯
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
        return new Response("OK"); 
      }

      // 🌟 加解密與資料更新 (強化版)
      const { newebpay } = await import("../utils/crypto");
      
      // 1. 修剪字串，避免不可見字元破壞 AES 長度
      const encryptedData = tradeInfo.trim(); 
      
      // 2. 執行解密
      const decrypted = await newebpay.decrypt(encryptedData, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      
      // 3. 解析內容
      const decodedData = decodeURIComponent(decrypted.replace(/\+/g, " "));
      const data = JSON.parse(decodedData);
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      // 4. 更新資料庫
      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ?"
      ).bind(orderId).all();
      
      if (results.length === 0) return new Response("OK");

      const userId = (results[0] as any).user_id;
      let newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30); 

      await env.commission_db.batch([
        env.commission_db.prepare("UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?").bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare("UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?").bind(newExpiry.toISOString(), userId)
      ]);

      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🎉 升級成功: 訂單 ${orderId}, 使用者 ${userId}`).run();

      return new Response("OK");
    } catch (error: any) {
      await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
        .bind(`🚨 Notify 處理崩潰: ${error.message}`).run();
      return new Response("OK");
    }
  }
};