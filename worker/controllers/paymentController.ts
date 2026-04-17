// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";
import { newebpay } from "../utils/crypto";

export const paymentController = {
  /**
   * 1. 產生藍新支付表單資料 (POST /api/payment/create)
   */
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { plan_type } = await request.json() as any;
    
    // 目前設定專業版 30 天，金額 199 元 (測試用)
    const amount = 199;
    const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; // 產生唯一訂單編號

    // 先在資料庫建立一筆待付款紀錄
    await env.commission_db.prepare(
      "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
    ).bind(orderId, currentUserId, amount, plan_type).run();

    // 準備藍新要求的交易資料
    const tradeInfoObj = {
      MerchantID: env.NEWEBPAY_MERCHANT_ID,
      RespondType: "JSON",
      TimeStamp: Math.floor(Date.now() / 1000),
      Version: "2.0",
      MerchantOrderNo: orderId,
      Amt: amount,
      ItemDesc: `Arti 繪師小幫手 - 專業版 30 天`,
      Email: "user@example.com", // 這裡可選填，或從 User 表撈
      LoginType: 0,
      // 支付成功後，使用者瀏覽器跳轉回來的網址
      ReturnURL: `${env.FRONTEND_URL}/payment/result`,
      // 🌟 最重要：藍新後端通知我方後端的網址
      NotifyURL: `${env.BACKEND_URL}/api/payment/notify`, 
      ClientBackURL: `${env.FRONTEND_URL}/artist/settings`,
    };

    // 將物件轉為字串並加密
    const params = new URLSearchParams(tradeInfoObj as any).toString();
    const aesString = newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
    const shaString = newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

    return new Response(JSON.stringify({
      success: true,
      data: {
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        TradeInfo: aesString,
        TradeSha: shaString,
        Version: "2.0",
        PayGateWay: "https://ccore.newebpay.com/MPG/mpg_gateway" // 藍新測試環境網址
      }
    }), { status: 200, headers: corsHeaders });
  },

  /**
   * 2. 接收藍新支付結果通知 (POST /api/payment/notify)
   * ⚠️ 注意：這個路由不需要 requireAuth，因為是藍新伺服器打過來的
   */
  async handleNotify(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const status = formData.get("Status");
    const tradeInfo = formData.get("TradeInfo") as string;

    if (status !== "SUCCESS") {
      return new Response("OK"); // 即使失敗也要回藍新 OK，不然他會一直重傳
    }

    // 解密資料
    const decrypted = newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
    const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
    const orderId = data.Result.MerchantOrderNo;
    const tradeNo = data.Result.TradeNo;

    // 1. 找出這筆訂單
    const { results } = await env.commission_db.prepare(
      "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
    ).bind(orderId).all();

    if (results.length === 0) return new Response("Order Not Found");

    const order = results[0] as any;
    const userId = order.user_id;

    // 2. 取得使用者目前的方案狀態
    const { results: userRes } = await env.commission_db.prepare(
      "SELECT plan_type, pro_expires_at FROM Users WHERE id = ?"
    ).bind(userId).all();
    const user = userRes[0] as any;

    // 3. 核心展延邏輯
    let newExpiry: Date;
    const now = new Date();

    if (user.plan_type === 'pro' && user.pro_expires_at && new Date(user.pro_expires_at) > now) {
      // 如果已經是 Pro 且沒過期 -> 在舊到期日上加 30 天
      newExpiry = new Date(user.pro_expires_at);
      newExpiry.setDate(newExpiry.getDate() + 30);
    } else {
      // 否則 (免費版、試用期、或過期 Pro) -> 從今天起算 30 天
      newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
    }

    // 4. 更新資料庫 (使用 Transaction 的概念一次更新兩張表)
    await env.commission_db.batch([
      // 更新訂單狀態
      env.commission_db.prepare(
        "UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?"
      ).bind(tradeNo, data.Result.PayTime, orderId),
      // 升級使用者方案與日期
      env.commission_db.prepare(
        "UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?"
      ).bind(newExpiry.toISOString(), userId)
    ]);

    // 回覆藍新 OK
    return new Response("OK");
  }
};