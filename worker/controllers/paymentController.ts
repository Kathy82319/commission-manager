// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";
import { newebpay } from "../utils/crypto";

export const paymentController = {
  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { plan_type } = await request.json() as any;
    
    const amount = 199;
    const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 

    // 先在資料庫建立一筆待付款紀錄
    await env.commission_db.prepare(
      "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, 'pending')"
    ).bind(orderId, currentUserId, amount, plan_type).run();

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
    
    // 🌟 關鍵修改：加上 await
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
    }), { status: 200, headers: corsHeaders });
  },

  async handleNotify(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const status = formData.get("Status");
    const tradeInfo = formData.get("TradeInfo") as string;

    if (status !== "SUCCESS") return new Response("OK");

    // 🌟 關鍵修改：加上 await
    const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
    const data = JSON.parse(decodeURIComponent(decrypted.replace(/\+/g, " ")));
    const orderId = data.Result.MerchantOrderNo;
    const tradeNo = data.Result.TradeNo;

    const { results } = await env.commission_db.prepare(
      "SELECT * FROM PaymentOrders WHERE id = ? AND status = 'pending'"
    ).bind(orderId).all();

    if (results.length === 0) return new Response("Order Not Found");

    const order = results[0] as any;
    const userId = order.user_id;

    const { results: userRes } = await env.commission_db.prepare(
      "SELECT plan_type, pro_expires_at FROM Users WHERE id = ?"
    ).bind(userId).all();
    const user = userRes[0] as any;

    let newExpiry: Date;
    const now = new Date();

    if (user.plan_type === 'pro' && user.pro_expires_at && new Date(user.pro_expires_at) > now) {
      newExpiry = new Date(user.pro_expires_at);
      newExpiry.setDate(newExpiry.getDate() + 30);
    } else {
      newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
    }

    await env.commission_db.batch([
      env.commission_db.prepare(
        "UPDATE PaymentOrders SET status = 'paid', trade_no = ?, pay_time = ? WHERE id = ?"
      ).bind(tradeNo, data.Result.PayTime, orderId),
      env.commission_db.prepare(
        "UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?"
      ).bind(newExpiry.toISOString(), userId)
    ]);

    return new Response("OK");
  }
};