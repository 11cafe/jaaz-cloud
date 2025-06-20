import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Upload base64 image data to S3
 * 上传 base64 图片数据到 S3
 */
export async function uploadImageToS3(
  base64Data: string,
  format: string = "png",
): Promise<string> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique file name
    const fileName = `generated-${nanoid()}.${format}`;
    const key = `images/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: `image/${format}`,
      // Remove ACL since bucket doesn't support it
      // ACL: "public-read",
    });

    await s3Client.send(command);

    // Return the public URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return s3Url;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw new Error(
      `Failed to upload image to S3: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
