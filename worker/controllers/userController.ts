// worker/controllers/userController.ts
import type { Env } from "../shared/types";
import { sanitizeAndLimit } from "../utils/security";

export const userController = {
  /**
   * 取得使用者資料 (GET /api/users/:id)
   */
  async getUser(userIdParam: string, currentUserId: string | null, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const isMe = userIdParam === "me" || userIdParam === currentUserId;
    const targetId = userIdParam === "me" ? currentUserId : userIdParam;

    if (userIdParam === "me" && !currentUserId) {
      return new Response(JSON.stringify({ success: false, error: "未登入" }), { status: 401, headers: corsHeaders });
    }

    const { results } = await env.commission_db.prepare(`
      SELECT 
        u.*, 
        ap.tos_content, ap.about_me, ap.portfolio_urls, ap.commission_process, 
        ap.payment_info, ap.usage_rules, ap.custom_1_title, ap.custom_1_content,
        ap.custom_2_title, ap.custom_2_content, ap.custom_3_title, ap.custom_3_content
      FROM Users u
      LEFT JOIN ArtistProfiles ap ON u.id = ap.user_id
      WHERE u.id = ? OR u.public_id = ?
    `).bind(targetId, targetId).all();

    if (results.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "找不到使用者" }), { status: 404, headers: corsHeaders });
    }
    
    const user: any = results[0];

    if (!isMe && user.role === 'deleted') {
      return new Response(JSON.stringify({ success: false, error: "此帳號已停用或刪除" }), { status: 404, headers: corsHeaders });
    }

    let parsedSettings: any = {};
    try {
      parsedSettings = JSON.parse(user.profile_settings || '{}');
    } catch (e) {}

    if (user.about_me !== null && user.about_me !== undefined) {
      parsedSettings.detailed_intro = user.about_me || parsedSettings.detailed_intro;
      parsedSettings.process = user.commission_process || parsedSettings.process;
      parsedSettings.payment = user.payment_info || parsedSettings.payment;
      parsedSettings.rules = user.usage_rules || parsedSettings.rules;
      try {
        if (user.portfolio_urls && user.portfolio_urls !== '[]') {
          parsedSettings.portfolio = JSON.parse(user.portfolio_urls);
        }
      } catch(e) {}

      const cs = [];
      if (user.custom_1_title || user.custom_1_content) cs.push({ id: 'custom_1', title: user.custom_1_title, content: user.custom_1_content });
      if (user.custom_2_title || user.custom_2_content) cs.push({ id: 'custom_2', title: user.custom_2_title, content: user.custom_2_content });
      if (user.custom_3_title || user.custom_3_content) cs.push({ id: 'custom_3', title: user.custom_3_title, content: user.custom_3_content });
      if (cs.length > 0) parsedSettings.custom_sections = cs;
    }

    user.profile_settings = JSON.stringify(parsedSettings);
    
    delete user.tos_content; delete user.about_me; delete user.portfolio_urls;
    delete user.commission_process; delete user.payment_info; delete user.usage_rules;
    delete user.custom_1_title; delete user.custom_1_content; delete user.custom_2_title;
    delete user.custom_2_content; delete user.custom_3_title; delete user.custom_3_content;

    const now = new Date();
    let planChanged = false;

    if (user.plan_type === 'trial' && user.trial_end_at) {
      if (now > new Date(user.trial_end_at)) {
        user.plan_type = 'free';
        planChanged = true;
      }
    } else if (user.plan_type === 'pro' && user.pro_expires_at) {
      if (now > new Date(user.pro_expires_at)) {
        user.plan_type = 'free';
        planChanged = true;
      }
    }

    if (planChanged) {
      await env.commission_db.prepare("UPDATE Users SET plan_type = 'free' WHERE id = ?").bind(user.id).run();
      user.plan_type = 'free';
    }

    if (isMe) {
      let usedQuota = 0;
      let maxQuota = 3;

      if (user.plan_type === 'trial') {
        maxQuota = 20; 
        const { results: countRes } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Commissions WHERE artist_id = ?").bind(user.id).all();
        usedQuota = countRes[0].count as number;
      } else if (user.plan_type === 'pro') {
        maxQuota = -1; 
      } else {
        // 修正：基礎免費版配額設為 3
        maxQuota = 3; 
        const { results: countRes } = await env.commission_db.prepare("SELECT COUNT(*) as count FROM Commissions WHERE artist_id = ?").bind(user.id).all();
        usedQuota = countRes[0].count as number;
      }

      user.used_quota = usedQuota;
      user.max_quota = maxQuota;
    } else {
      if (user.plan_type === 'free' && user.profile_settings) {
        try {
          const settings = JSON.parse(user.profile_settings);
          if (settings.portfolio && settings.portfolio.length > 6) {
            settings.portfolio = settings.portfolio.slice(0, 6); 
          }
          user.profile_settings = JSON.stringify(settings);
        } catch (e) {}
      }
    }

    return new Response(JSON.stringify({ success: true, data: user }), { status: 200, headers: corsHeaders });
  },

  async updateUser(request: Request, userIdParam: string, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const targetId = userIdParam === "me" ? currentUserId : userIdParam;

    if (currentUserId !== targetId) {
      return new Response(JSON.stringify({ success: false, error: "權限不足" }), { status: 403, headers: corsHeaders });
    }

    const { results: userBase } = await env.commission_db.prepare("SELECT plan_type FROM Users WHERE id = ?").bind(targetId).all();
    const userPlan = userBase[0]?.plan_type || 'free';

    const body: any = await request.json();
    let settings: any = {};
    try {
      settings = typeof body.profile_settings === 'string' 
        ? JSON.parse(body.profile_settings) 
        : (body.profile_settings || {});
    } catch (e) {
      settings = {};
    }

    const limits: Record<string, number> = { free: 6, trial: 20, pro: 30 };
    const currentLimit = limits[userPlan as string] || 6;

    if (Array.isArray(settings.portfolio)) {
      if (settings.portfolio.length > 40) {
        return new Response(JSON.stringify({ success: false, error: "系統容量極限為 40 張" }), { status: 403, headers: corsHeaders });
      }
      if (settings.portfolio.length > currentLimit) {
        return new Response(JSON.stringify({ success: false, error: "免費版本已達上限" }), { status: 403, headers: corsHeaders });
      }
    }

    const updateUsers = env.commission_db.prepare(`
      UPDATE Users SET display_name = ?, avatar_url = ?, bio = ?, profile_settings = ? WHERE id = ?
    `).bind(
      sanitizeAndLimit(body.display_name, 100), 
      body.avatar_url || '', 
      sanitizeAndLimit(body.bio, 500), 
      JSON.stringify(settings), 
      targetId
    );

    const c1 = settings.custom_sections?.[0] || {};
    const c2 = settings.custom_sections?.[1] || {};
    const c3 = settings.custom_sections?.[2] || {};

    const updateProfile = env.commission_db.prepare(`
      INSERT INTO ArtistProfiles (
        user_id, about_me, tos_content, portfolio_urls, commission_process, 
        payment_info, usage_rules, custom_1_title, custom_1_content,
        custom_2_title, custom_2_content, custom_3_title, custom_3_content
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        about_me = excluded.about_me,
        tos_content = excluded.tos_content,
        portfolio_urls = excluded.portfolio_urls,
        commission_process = excluded.commission_process,
        payment_info = excluded.payment_info,
        usage_rules = excluded.usage_rules,
        custom_1_title = excluded.custom_1_title,
        custom_1_content = excluded.custom_1_content,
        custom_2_title = excluded.custom_2_title,
        custom_2_content = excluded.custom_2_content,
        custom_3_title = excluded.custom_3_title,
        custom_3_content = excluded.custom_3_content
    `).bind(
      targetId,
      settings.detailed_intro || '',
      settings.rules || '',
      JSON.stringify(settings.portfolio || []),
      settings.process || '',
      settings.payment || '',
      settings.rules || '',
      c1.title || '', c1.content || '',
      c2.title || '', c2.content || '',
      c3.title || '', c3.content || ''
    );

    await env.commission_db.batch([updateUsers, updateProfile]);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  },

  async deleteUser(currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    await env.commission_db.prepare(`
      UPDATE Users 
      SET role = 'deleted', 
          display_name = '已停用帳號', 
          avatar_url = '', 
          bio = '', 
          profile_settings = '{}'
      WHERE id = ?
    `).bind(currentUserId).run();

    return new Response(JSON.stringify({ success: true, message: "帳號已成功刪除" }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Set-Cookie": "user_session=; Path=/; Max-Age=0; SameSite=None; Secure; HttpOnly"
      }
    });
  },

  async completeOnboarding(request: Request, currentUserId: string, env: Env, corsHeaders: HeadersInit): Promise<Response> {
    const body: { display_name: string; role: string } = await request.json();
    const newRole = body.role === 'artist' ? 'artist' : 'client';
    const newName = sanitizeAndLimit(body.display_name || '未命名', 100);

    await env.commission_db.prepare(`
      UPDATE Users SET display_name = ?, role = ? WHERE id = ?
    `).bind(newName, newRole, currentUserId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  }
};