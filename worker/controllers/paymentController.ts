// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";

// 🌟 正式版：保留了安全的動態引入，並恢復了完整的藍新回傳處理邏輯
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

      // 1. 在資料庫建立待付款訂單
      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
      ).bind(orderId, currentUserId, amount, plan_type).run();

      const params = new URLSearchParams({
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        ItemDesc: `Arti 繪師小幫手 - 專業版 30 天`,
        Email: "user@example.com", // 這裡未來可以換成真實使用者的 Email
        LoginType: "0",
        ReturnURL: `${env.FRONTEND_URL}/payment/result`, // 付款完成後，引導使用者回到的頁面
        NotifyURL: `${env.BACKEND_URL}/api/payment/notify`, // 🌟 藍新背景通知你付款成功的網址
        ClientBackURL: `${env.FRONTEND_URL}/artist/settings`,
      }).toString();

      // 2. 動態引入加密模組 (避免 Cloudflare 頂層崩潰)
      const { newebpay } = await import("../utils/crypto");
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      // 3. 回傳給前端
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

  // 🌟 接收藍新付款成功通知的路由
  async handleNotify(request: Request, env: Env): Promise<Response> {
    try {
      const formData = await request.formData();
      const status = formData.get("Status");
      const tradeInfo = formData.get("TradeInfo") as string;

      // 如果不是成功，或是沒有加密字串，直接回傳 OK 讓藍新安心
      if (status !== "SUCCESS" || !tradeInfo) return new Response("OK");

      // 解密
      const { newebpay } = await import("../utils/crypto");
      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      // 檢查訂單是否存在且為 pending
      const { results } = await env.commission_db.prepare(
        "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
      ).bind(orderId).all();
      
      if (results.length === 0) return new Response("OK"); // 訂單已處理過或不存在

      const order = results[0] as any;
      const userId = order.user_id;

      // 計算新的到期日
      const { results: userRes } = await env.commission_db.prepare(
        "SELECT plan_type, pro_expires_at FROM Users WHERE id = ?"
      ).bind(userId).all();
      const user = userRes[0] as any;

      let newExpiry = new Date();
      if (user.plan_type === 'pro' && user.pro_expires_at && new Date(user.pro_expires_at) > new Date()) {
        newExpiry = new Date(user.pro_expires_at); // 還有剩餘天數，從原到期日開始加
      }
      newExpiry.setDate(newExpiry.getDate() + 30); // 加上 30 天

      // 更新訂單與使用者狀態
      await env.commission_db.batch([
        env.commission_db.prepare(
          "UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?"
        ).bind(tradeNo, data.Result.PayTime, orderId),
        env.commission_db.prepare(
          "UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?"
        ).bind(newExpiry.toISOString(), userId)
      ]);

      return new Response("OK"); // 必須回傳純文字 OK，否則藍新會一直重試
    } catch (error) {
      console.error("Notify 處理失敗:", error);
      return new Response("OK"); // 發生錯誤也回傳 OK，避免藍新卡死
    }
  }
};