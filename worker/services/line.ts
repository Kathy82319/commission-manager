// worker/services/line.ts
import type { Env } from "../shared/types";


export function getLineLoginUrl(env: Env, state: string): string {
  if (!env.LINE_CHANNEL_ID || !env.LINE_REDIRECT_URI) {
    throw new Error("LINE 環境變數未設定");
  }
  return `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${env.LINE_CHANNEL_ID}&redirect_uri=${encodeURIComponent(env.LINE_REDIRECT_URI)}&state=${state}&scope=profile%20openid`;
}


export async function getLineToken(code: string, env: Env): Promise<string> {
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", 
      code,
      redirect_uri: env.LINE_REDIRECT_URI,
      client_id: env.LINE_CHANNEL_ID,
      client_secret: env.LINE_CHANNEL_SECRET,
    }),
  });
  
  const tokenData: any = await tokenRes.json();
  if (tokenData.error) {
    throw new Error("LINE Token 取得失敗");
  }
  
  return tokenData.access_token;
}


export async function getLineProfile(accessToken: string): Promise<any> {
  const profileRes = await fetch("https://api.line.me/v2/profile", { 
    headers: { Authorization: `Bearer ${accessToken}` } 
  });
  
  const profile: any = await profileRes.json();
  if (profile.error) {
    throw new Error("LINE Profile 取得失敗");
  }
  
  return profile;
}