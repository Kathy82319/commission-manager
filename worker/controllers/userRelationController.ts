// worker/controllers/userRelationController.ts
import type { Env } from '../shared/types';

export const userRelationController = {
  async getMyRelations(userId: string, env: Env, corsHeaders: any) {
    try {
      const { results } = await env.commission_db.prepare(`
        SELECT 
          r.id,
          r.target_user_id,
          r.relation_type,
          r.custom_note,
          r.created_at,
          u.display_name,
          u.avatar_url,
          u.public_id
        FROM UserRelations r
        JOIN Users u ON r.target_user_id = u.id
        WHERE r.source_user_id = ?
        ORDER BY r.created_at DESC
      `).bind(userId).all();

      return new Response(JSON.stringify({ success: true, data: results }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders });
    }
  },

  async upsertRelation(userId: string, targetId: string, type: string, note: string, env: Env, corsHeaders: any) {
    if (userId === targetId) {
      return new Response(JSON.stringify({ success: false, error: "您不能標記自己" }), { status: 400, headers: corsHeaders });
    }

    if (type !== 'favorite' && type !== 'blacklist') {
      return new Response(JSON.stringify({ success: false, error: "無效的標記類型" }), { status: 400, headers: corsHeaders });
    }

    const safeNote = note ? note.trim() : '';
    if (safeNote.length > 200) {
      return new Response(JSON.stringify({ success: false, error: "備註內容過長，請限制在 200 字以內" }), { status: 400, headers: corsHeaders });
    }

    try {
      const relationId = crypto.randomUUID();
      
      await env.commission_db.prepare(`
        INSERT INTO UserRelations (id, source_user_id, target_user_id, relation_type, custom_note)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(source_user_id, target_user_id) DO UPDATE SET
          relation_type = excluded.relation_type,
          custom_note = excluded.custom_note
      `).bind(relationId, userId, targetId, type, safeNote).run();

      return new Response(JSON.stringify({ success: true, message: "關係已更新" }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  },

  async deleteRelation(userId: string, targetId: string, env: Env, corsHeaders: any) {
    if (!targetId || targetId.trim() === '') {
      return new Response(JSON.stringify({ success: false, error: "缺少目標 ID" }), { status: 400, headers: corsHeaders });
    }

    try {
      await env.commission_db.prepare(`
        DELETE FROM UserRelations 
        WHERE source_user_id = ? AND target_user_id = ?
      `).bind(userId, targetId).run();

      return new Response(JSON.stringify({ success: true, message: "關係已移除" }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
    }
  }
};