// worker/utils/crypto.ts

export const newebpay = {
  async encrypt(dataString: string, key: string, iv: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key.trim()); // 確保無空白
    const ivData = encoder.encode(iv.trim());   // 確保無空白
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

    const hashArray = Array.from(new Uint8Array(encryptedBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async decrypt(encryptedHex: string, key: string, iv: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key.trim()); // 確保無空白
    const ivData = encoder.encode(iv.trim());   // 確保無空白
    
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

  // 🌟 修正：加入 isResponse 參數，自動切換 Request 與 Notify 的雜湊排序
  async generateSha(aesString: string, key: string, iv: string, isResponse: boolean = false): Promise<string> {
    const combinedString = isResponse 
      ? `HashIV=${iv.trim()}&TradeInfo=${aesString}&HashKey=${key.trim()}`
      : `HashKey=${key.trim()}&${aesString}&HashIV=${iv.trim()}`;
      
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedString);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
};