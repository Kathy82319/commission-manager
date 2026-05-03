// worker/utils/crypto.ts
import { createDecipheriv } from 'node:crypto';

export const newebpay = {
  async encrypt(dataString: string, key: string, iv: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const ivData = encoder.encode(iv);
    const textData = encoder.encode(dataString);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]
    );

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv: ivData }, cryptoKey, textData
    );

    const hashArray = Array.from(new Uint8Array(encryptedBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async decrypt(encryptedHex: string, key: string, iv: string): Promise<string> {
    // 🌟 關鍵修正：改用 Node.js 的 crypto，強制關閉嚴格的 PKCS7 檢查
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false); 
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // 藍新會補空位字元 (\x00)，我們手動把它們清掉，還原乾淨的字串
    return decrypted.replace(/[\x00-\x1F\x7F-\x9F]+/g, "").trim();
  },

  async generateSha(aesString: string, key: string, iv: string): Promise<string> {
    // 🌟 恢復正確的藍新 SHA 順序 (Request 和 Notify 其實是一樣的)
    const combinedString = `HashKey=${key}&${aesString}&HashIV=${iv}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedString);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
};