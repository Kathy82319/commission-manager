// worker/services/db.ts
import type { Env } from "../shared/types";


export async function getUserById(env: Env, userId: string) {
  const { results } = await env.commission_db.prepare("SELECT * FROM Users WHERE id = ?").bind(userId).all();
  return results.length > 0 ? results[0] : null;
}

export async function createNewUser(env: Env, userId: string, displayName: string, pictureUrl: string) {
  const publicId = `User_${Math.floor(10000 + Math.random() * 90000)}`;
  
  await env.commission_db.prepare(`
    INSERT INTO Users (id, public_id, line_id, display_name, avatar_url, role, plan_type, created_at) 
    VALUES (?, ?, ?, ?, ?, 'pending', 'free', CURRENT_TIMESTAMP)
  `).bind(
    userId, publicId, userId, displayName, pictureUrl
  ).run();
}