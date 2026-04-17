// worker/controllers/testController.ts
import type { Env } from "../shared/types";

export const testController = {
  /**
   * 開啟 15 天試用
   */
  async startTrial(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: userRes } = await env.commission_db.prepare("SELECT role, plan_type, trial_start_at FROM Users WHERE id = ?").bind(currentUserId).all();
    const user = userRes[0] as any;

    if (user.role === 'deleted') return new Response(JSON.stringify({ success: false, error: "此帳號已停用，請聯絡客服恢復權限。" }), { status: 403, headers: corsHeaders });
    if (user.plan_type !== 'free') return new Response(JSON.stringify({ success: false, error: "目前狀態無法開啟試用" }), { status: 400, headers: corsHeaders });
    if (user.trial_start_at) return new Response(JSON.stringify({ success: false, error: "您已經使用過免費試用囉！" }), { status: 403, headers: corsHeaders }); 

    const now = new Date();
    const end = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    
    await env.commission_db.prepare(`UPDATE Users SET plan_type = 'trial', trial_start_at = ?, trial_end_at = ? WHERE id = ?`)
      .bind(now.toISOString(), end.toISOString(), currentUserId).run();
    
    return new Response(JSON.stringify({ success: true, message: "15 天專業版試用開啟！" }), { status: 200, headers: corsHeaders });
  },

  /**
   * 模擬付款，開通 30 天專業版
   */
  async mockUpgrade(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const { results: userRes } = await env.commission_db.prepare("SELECT role FROM Users WHERE id = ?").bind(currentUserId).all();
    if (userRes[0]?.role === 'deleted') return new Response(JSON.stringify({ success: false, error: "此帳號已停用，無法進行付款操作。" }), { status: 403, headers: corsHeaders });

    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    await env.commission_db.prepare(`UPDATE Users SET plan_type = 'pro', pro_expires_at = ? WHERE id = ?`)
      .bind(end.toISOString(), currentUserId).run();
    
    return new Response(JSON.stringify({ success: true, message: "模擬付款成功！專業版已開通 30 天。" }), { status: 200, headers: corsHeaders });
  }
};