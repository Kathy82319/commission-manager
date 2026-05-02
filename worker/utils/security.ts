// worker/utils/security.ts

export async function generateSignature(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function generateToken(userId: string, secret: string, expiresInDays = 30): Promise<string> {
  const expires = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload = `${userId}|${expires}`;
  const signature = await generateSignature(payload, secret);
  return `${payload}|${signature}`;
}

export async function verifyToken(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('|');
  if (parts.length !== 3) return null;

  const [userId, expires, signature] = parts;
  if (Date.now() > parseInt(expires, 10)) return null;

  const expectedSig = await generateSignature(`${userId}|${expires}`, secret);
  return signature === expectedSig ? userId : null;
}

export function sanitizeAndLimit(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  const limitedStr = str.substring(0, maxLength); 
  return limitedStr.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            // 💡 解除雙引號和單引號的封印，讓 JSON 可以活下去，但擋掉 XSS 標籤
            // 注意：我們移除了對 " 和 ' 的轉換，因為這會破壞 JSON 結構
            // 只要我們擋住了 < 和 >，XSS 腳本就無法執行
            ;
}

// 🌟 新增：專門用來清理物件的遞迴函數
export function sanitizeObject(obj: any, maxLength: number = 10000): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeAndLimit(obj, maxLength);
  if (typeof obj === 'number' || typeof obj === 'boolean') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, maxLength));
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = sanitizeObject(obj[key], maxLength);
    }
    return newObj;
  }
  return obj;
}

export function limitRichText(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  const limitedStr = str.substring(0, maxLength); 
  return limitedStr.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export function isValidSafeUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}