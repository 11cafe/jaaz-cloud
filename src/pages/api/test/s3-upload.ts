import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { uploadImageToS3 } from "@/utils/s3Utils";

// Configure API route to accept larger payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Increase limit to 50MB
    },
  },
};

interface TestUploadRequest {
  base64Data: string;
  fileName: string;
  contentType: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { base64Data, fileName, contentType } = req.body as TestUploadRequest;

    // Validate required fields
    if (!base64Data) {
      return res.status(400).json({ error: "base64Data is required" });
    }

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    // Validate file type
    if (!contentType.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }

    // Get file format from content type
    const format = contentType.split("/")[1] || "png";

    console.log(
      `Testing S3 upload for user: ${session.user.name} (${session.user.id})`,
    );
    console.log(
      `File: ${fileName}, Type: ${contentType}, Size: ${base64Data.length} bytes (base64)`,
    );

    // Upload to S3
    const s3Url = await uploadImageToS3(base64Data, format);

    // Return success response
    res.status(200).json({
      success: true,
      s3Url: s3Url,
      message: "Upload successful",
      metadata: {
        fileName,
        contentType,
        base64Size: base64Data.length,
      },
    });

    console.log(`S3 upload test completed successfully: ${s3Url}`);
  } catch (error) {
    console.error("S3 upload test error:", error);

    // Return detailed error for testing
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}
