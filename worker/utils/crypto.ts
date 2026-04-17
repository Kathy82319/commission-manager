// worker/utils/crypto.ts

/**
 * 藍新金流專用加密工具 (Web Crypto API 原生版)
 * 🌟 絕對相容 Cloudflare Workers，不依賴 node:crypto
 */
export const newebpay = {
  // 將資料加密為藍新要求的 AES 字串
  async encrypt(dataString: string, key: string, iv: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const ivData = encoder.encode(iv);
    const textData = encoder.encode(dataString);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-CBC" },
      false,
      ["encrypt"]
    );

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: ivData },
      cryptoKey,
      textData
    );

    // 轉換為 Hex 字串
    const hashArray = Array.from(new Uint8Array(encryptedBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 將藍新回傳的加密資料解密
  async decrypt(encryptedHex: string, key: string, iv: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const ivData = encoder.encode(iv);

    // 將 Hex 字串轉回 Uint8Array
    const encryptedBytes = new Uint8Array(
      encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: ivData },
      cryptoKey,
      encryptedBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  },

  // 產生 SHA256 雜湊 (TradeSha)
  async generateSha(aesString: string, key: string, iv: string): Promise<string> {
    const combinedString = `HashKey=${key}&${aesString}&HashIV=${iv}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedString);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
};