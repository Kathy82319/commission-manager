// worker/services/db.ts
import type { Env } from "../shared/types";

/**
 * 透過 LINE ID (或 User ID) 取得使用者資料
 */
export async function getUserById(env: Env, userId: string) {
  const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ?").bind(userId).all();
  return results.length > 0 ? results[0] : null;
}

/**
 * 建立全新使用者 (首次登入時觸發)
 */
export async function createNewUser(env: Env, userId: string, displayName: string, pictureUrl: string) {
  // 產生一組給前台公開用的隨機 ID
  const publicId = `User_${Math.floor(10000 + Math.random() * 90000)}`;
  
  await env.commission_db.prepare(`
    INSERT INTO Users (id, public_id, line_id, display_name, avatar_url, role, plan_type, created_at) 
    VALUES (?, ?, ?, ?, ?, 'pending', 'free', CURRENT_TIMESTAMP)
  `).bind(
    userId, publicId, userId, displayName, pictureUrl
  ).run();
}