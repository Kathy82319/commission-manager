// worker/utils/security.ts

/**
 * 產生 HMAC-SHA256 簽章
 */
export async function generateSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * 產生包含過期時間與簽章的 Session Token
 */
export async function generateToken(userId: string, secret: string, expiresInDays = 30): Promise<string> {
  const expires = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload = `${userId}|${expires}`;
  const signature = await generateSignature(payload, secret);
  return `${payload}|${signature}`;
}

/**
 * 驗證 Token 是否合法且未過期
 */
export async function verifyToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('|');
  if (parts.length !== 3) return null;

  const [userId, expires, signature] = parts;
  if (Date.now() > parseInt(expires, 10)) return null;

  const expectedSig = await generateSignature(`${userId}|${expires}`, secret);
  return signature === expectedSig ? userId : null;
}

/**
 * 基礎 XSS 防護與長度限制
 */
export function sanitizeAndLimit(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  const limitedStr = str.substring(0, maxLength); 
  return limitedStr.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}


/**
 * 專為富文本 (Rich Text) 設計的限制器
 * 保留 HTML 排版標籤，但簡單過濾危險的 <script> 標籤
 */
export function limitRichText(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  const limitedStr = str.substring(0, maxLength); 
  // 移除 <script>...</script>，保留其餘 HTML 排版
  return limitedStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * 驗證是否為安全的 URL (僅允許 http/https)
 */
export function isValidSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}