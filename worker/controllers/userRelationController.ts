// worker/controllers/userRelationController.ts
import type { Env } from '../shared/types';

export const userRelationController = {
  /**
   * 取得我標記的所有關係名單 (收藏或黑名單)
   * 會 JOIN Users 表格以取得對方的基本資訊
   */
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

  /**
   * 新增或更新關係 (收藏 / 黑名單)
   */
  async upsertRelation(userId: string, targetId: string, type: 'favorite' | 'blacklist', note: string, env: Env, corsHeaders: any) {
    if (userId === targetId) {
      return new Response(JSON.stringify({ success: false, error: "您不能標記自己" }), { headers: corsHeaders });
    }

    try {
      const relationId = crypto.randomUUID();
      
      // 使用 ON CONFLICT 處理重複建立的情況
      await env.commission_db.prepare(`
        INSERT INTO UserRelations (id, source_user_id, target_user_id, relation_type, custom_note)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(source_user_id, target_user_id) DO UPDATE SET
          relation_type = excluded.relation_type,
          custom_note = excluded.custom_note
      `).bind(relationId, userId, targetId, type, note).run();

      return new Response(JSON.stringify({ success: true, message: "關係已更新" }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders });
    }
  },

  /**
   * 移除關係
   */
  async deleteRelation(userId: string, targetId: string, env: Env, corsHeaders: any) {
    try {
      await env.commission_db.prepare(`
        DELETE FROM UserRelations 
        WHERE source_user_id = ? AND target_user_id = ?
      `).bind(userId, targetId).run();

      return new Response(JSON.stringify({ success: true, message: "關係已移除" }), { headers: corsHeaders });
    } catch (error: any) {
      return new Response(JSON.stringify({ success: false, error: error.message }), { headers: corsHeaders });
    }
  }
};