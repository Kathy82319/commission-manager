// worker/services/r2.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../shared/types";

/**
 * 內部函式：初始化並取得 S3 Client (對接 Cloudflare R2)
 */
function getS3Client(env: Env) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID || 'f72c79d82828e2419ab5fb0e1d323ce5'}.r2.cloudflarestorage.com`, 
    forcePathStyle: true, 
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * 產生 R2 PUT (上傳) 專用的預簽章網址
 */
export async function generateUploadUrl(env: Env, bucketName: string, fileName: string, contentType: string): Promise<string> {
  const s3 = getS3Client(env);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: contentType 
  });

  // 回傳有效時間 10 分鐘 (600秒) 的上傳通行證
  return await getSignedUrl(s3, command, { expiresIn: 600 });
}

/**
 * 產生 R2 GET (下載) 專用的預簽章網址，並強制瀏覽器觸發下載動作
 */
export async function generateDownloadUrl(env: Env, bucketName: string, fileName: string): Promise<string> {
  const s3 = getS3Client(env);
  const rawFileName = fileName.split('/').pop() || 'download';
  
  const command = new GetObjectCommand({ 
    Bucket: bucketName, 
    Key: fileName,
    ResponseContentDisposition: `attachment; filename="${rawFileName}"` 
  });
  
  // 回傳有效時間 10 分鐘 (600秒) 的下載通行證
  return await getSignedUrl(s3, command, { expiresIn: 600 });
}