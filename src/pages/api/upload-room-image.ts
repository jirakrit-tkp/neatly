import type { NextApiRequest, NextApiResponse } from "next";
import multer from "multer";
import Jimp from "jimp";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const IMAGE_QUALITY = 80;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

// Multer setup with file size limit
const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

const upload = multerUpload.single("mainImage");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  upload(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is ${
            MAX_FILE_SIZE / 1024 / 1024
          }MB`,
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (req as any).file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      console.log('📤 [Upload Room Image] Starting image processing...');
      console.log('   Original file size:', (file.size / 1024).toFixed(2), 'KB');
      
      // Optimize image using Jimp (pure JavaScript, no native dependencies)
      const image = await Jimp.read(file.buffer);
      const originalWidth = image.getWidth();
      const originalHeight = image.getHeight();
      
      console.log('   Original dimensions:', originalWidth, 'x', originalHeight);
      
      // Resize only if image is larger than max dimensions
      if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
        console.log('   ⚠️ Image exceeds max dimensions, resizing...');
        await image.scaleToFit(MAX_WIDTH, MAX_HEIGHT);
        console.log('   ✂️ After resize:', image.getWidth(), 'x', image.getHeight());
      } else {
        console.log('   ✅ Image within limits, no resize needed');
      }
      
      // Set quality and convert to JPEG
      console.log('   🎨 Applying quality:', IMAGE_QUALITY);
      await image.quality(IMAGE_QUALITY);
      const optimizedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
      
      console.log('   ✅ Optimized size:', (optimizedBuffer.length / 1024).toFixed(2), 'KB');
      console.log('   💾 Compression ratio:', ((1 - optimizedBuffer.length / file.size) * 100).toFixed(2) + '%');

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `rooms/${timestamp}_${sanitizedName}`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from("neatly")
        .upload(filePath, optimizedBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to upload image",
        });
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("neatly")
        .getPublicUrl(filePath);

      // Return success with metadata
      res.status(200).json({
        success: true,
        url: publicData.publicUrl,
        metadata: {
          originalSize: file.size,
          optimizedSize: optimizedBuffer.length,
          compressionRatio:
            ((1 - optimizedBuffer.length / file.size) * 100).toFixed(2) + "%",
        },
      });
    } catch (error) {
      console.error("Image processing error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process image",
      });
    }
  });
}
