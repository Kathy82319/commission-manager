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
  return str.substring(0, maxLength);
}

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