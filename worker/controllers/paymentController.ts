// worker/controllers/paymentController.ts
import type { Env } from "../shared/types";
// 💡 修正一：將原本在 method 內部的動態載入，提到最頂部進行標準的靜態導入，
// 這能完美突破 Cloudflare Workers 的執行期動態加載限制，徹底消滅 400 錯誤。
import { newebpay } from "../utils/crypto";

export const paymentController = {

  async createOrder(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    try {
      if (!env.commission_db) {
        return new Response(JSON.stringify({ success: false, error: "系統配置錯誤：找不到 D1 資料庫綁定" }), { status: 500, headers: corsHeaders });
      }
      if (!env.NEWEBPAY_MERCHANT_ID || !env.NEWEBPAY_HASH_KEY || !env.NEWEBPAY_HASH_IV) {
        return new Response(JSON.stringify({ success: false, error: "系統配置錯誤：金鑰遺失" }), { status: 500, headers: corsHeaders });
      }

      await env.commission_db.prepare(`
        DELETE FROM PaymentOrders 
        WHERE user_id = ? AND status = 'pending' AND datetime(created_at) <= datetime('now', '-1 hour')
      `).bind(currentUserId).run();  

      const { results: pendingRes } = await env.commission_db.prepare(`
        SELECT COUNT(*) as count FROM PaymentOrders 
        WHERE user_id = ? AND status = 'pending'
      `).bind(currentUserId).all();

      if (((pendingRes[0]?.count as number) || 0) >= 5) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: "已達到未付款單上限（5次），請等一小時或聯繫管理員" 
        }), { status: 200, headers: corsHeaders });
      }

      const body = await request.json().catch(() => ({}));
      const plan_type = (body as any).plan_type || 'pro';
      
      const amount = 150; // 都已經很便宜了就別玩我了QAQ
      const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 100)}`; 
      
      // 商業邏輯優化：動態讀取環境變數，確保轉移網域時，金流導向與主網域完全一致
      const absoluteFrontendUrl = (env.FRONTEND_URL || "https://arti7.net").replace(/\/$/, "");
      const backendUrl = env.BACKEND_URL;
      
      // 💡 修正：將 5 個欄位全面做成 5 個問號 '?'，讓 D1 完美對齊變數繫結數量
      await env.commission_db.prepare(
        "INSERT INTO PaymentOrders (id, user_id, amount, plan_type, status) VALUES (?, ?, ?, ?, ?)"
      ).bind(orderId, currentUserId, amount, plan_type, 'pending').run();

      const tradeInfoObj: any = {
        MerchantID: env.NEWEBPAY_MERCHANT_ID,
        RespondType: "JSON",
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        Version: "2.0",
        MerchantOrderNo: orderId,
        Amt: amount.toString(),
        ItemDesc: "繪師管理系統 - 專業版訂閱 (30天)",
        Email: "cath40286@gmail.com", 
        LoginType: "0",
        ReturnURL: `${absoluteFrontendUrl}/payment/result`,
        NotifyURL: `${backendUrl}/api/payment/notify`,
        ClientBackURL: `${absoluteFrontendUrl}/artist/settings`,
      };

      const params = Object.keys(tradeInfoObj)
        .map(key => `${key}=${tradeInfoObj[key]}`)
        .join('&');

      // 💡 修正二：這裡直接調用最頂部已經就緒的 newebpay 模組，不走 dynamic import
      const aesString = await newebpay.encrypt(params, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const shaString = await newebpay.generateSha(aesString, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);

      return new Response(JSON.stringify({
        success: true,
        data: {
          MerchantID: env.NEWEBPAY_MERCHANT_ID,
          TradeInfo: aesString,
          TradeSha: shaString,
          Version: "2.0",
          PayGateWay: "https://core.newebpay.com/MPG/mpg_gateway"
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
      // 💡 修正三：全面升級支付單建立的偵錯細節輸出，一旦內部有任何閃失，直接在前端噴出原因
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || "無可用堆疊軌跡";
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `[Payment Debug] 建立支付單崩潰: ${errorMessage}`,
          stack: errorStack 
        }), 
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
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
      
      const computedSha = await newebpay.generateSha(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      if (computedSha !== tradeSha) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`🚨 雜湊驗證失敗！預期: ${tradeSha}, 計算結果: ${computedSha}`).run();
        return new Response("OK");
      }

      const decrypted = await newebpay.decrypt(tradeInfo, env.NEWEBPAY_HASH_KEY, env.NEWEBPAY_HASH_IV);
      const decodedData = decodeURIComponent(decrypted.replace(/\+/g, " "));
      const data = JSON.parse(decodedData);
      
      const orderId = data.Result.MerchantOrderNo;
      const tradeNo = data.Result.TradeNo;

      const order = await env.commission_db.prepare("SELECT status, user_id, amount FROM PaymentOrders WHERE id = ?").bind(orderId).first();
      if (!order) return new Response("OK");

      if (order.status === 'paid' || order.status === 'fraud') {
        return new Response("OK");
      }

      const userId = order.user_id;
      
      const actualAmt = parseInt(data.Result.Amt, 10);
      const expectedAmt = order.amount;

      if (actualAmt !== expectedAmt) {
        await env.commission_db.prepare("INSERT INTO WebhookLogs (message) VALUES (?)")
          .bind(`🚨【異常監測 - 結帳金額不符】User: ${userId}, Order: ${orderId}, Expected: ${expectedAmt}, Actual: ${actualAmt}`)
          .run();
        console.warn(`Amount mismatch for user ${userId} on order ${orderId}`);
      }

      const userRecord = await env.commission_db.prepare("SELECT plan_type, pro_expires_at FROM Users WHERE id = ?").bind(userId).first();
      
      let newExpiry = new Date();
      if (userRecord && userRecord.plan_type === 'pro' && userRecord.pro_expires_at) {
        const currentExpiry = new Date(userRecord.pro_expires_at as string);
        if (currentExpiry > new Date()) {
          newExpiry = currentExpiry; 
        }
      }
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