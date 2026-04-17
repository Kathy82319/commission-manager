// worker/utils/crypto.ts
import crypto from 'node:crypto';

/**
 * 藍新金流專用加密工具
 */
export const newebpay = {
  // 將資料加密為藍新要求的 AES 字串
  encrypt(dataString: string, key: string, iv: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  },

  // 將藍新回傳的加密資料解密
  decrypt(encryptedData: string, key: string, iv: string): string {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(true); // 藍新有使用 Padding
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  },

  // 產生 SHA256 雜湊 (TradeSha)
  generateSha(aesString: string, key: string, iv: string): string {
    const combinedString = `HashKey=${key}&${aesString}&HashIV=${iv}`;
    return crypto.createHash('sha256').update(combinedString).digest('hex').toUpperCase();
  }
};