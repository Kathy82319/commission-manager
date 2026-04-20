// worker/services/r2.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../shared/types";


function getS3Client(env: Env) {
  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
    throw new Error("R2 認證資訊缺失，請檢查環境變數設定");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, 
    forcePathStyle: true, 
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}


export async function generateUploadUrl(env: Env, bucketName: string, fileName: string, contentType: string): Promise<string> {
  const s3 = getS3Client(env);
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: contentType 
  });

  return await getSignedUrl(s3, command, { 
    expiresIn: 600,
    signableHeaders: new Set(["content-type"])
  });
}


export async function generateDownloadUrl(env: Env, bucketName: string, fileName: string): Promise<string> {
  const s3 = getS3Client(env);
  const rawFileName = fileName.split('/').pop() || 'download';
  
  const command = new GetObjectCommand({ 
    Bucket: bucketName, 
    Key: fileName,
    ResponseContentDisposition: `attachment; filename="${rawFileName}"` 
  });
  
  return await getSignedUrl(s3, command, { expiresIn: 600 });
}