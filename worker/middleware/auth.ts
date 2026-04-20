// worker/middleware/auth.ts
import type { Env } from "../shared/types";
import { verifyToken } from "../utils/security";


export async function getUserIdFromRequest(request: Request, env: Env): Promise<string | null> {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const trimmedCookie = cookie.trim();
    const splitIndex = trimmedCookie.indexOf("=");
    if (splitIndex > -1) {
      const name = trimmedCookie.substring(0, splitIndex);
      const value = trimmedCookie.substring(splitIndex + 1);
      acc[name] = value;
    }
    return acc;
  }, {} as Record<string, string>);
  
  return await verifyToken(cookies["user_session"], env.ID_SALT);
}


export function requireAuth(userId: string | null, corsHeaders: HeadersInit): Response | null {
  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: "未登入或憑證已過期" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
    });
  }
  return null; 
}