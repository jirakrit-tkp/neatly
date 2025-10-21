import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// Use service role key for server-side storage access (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// In-memory cache to avoid re-downloading from Supabase
// Key: "roomName_width_height", Value: { buffer, timestamp }
const imageCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Allow DELETE to clear cache (for admin after updating images)
  if (req.method === 'DELETE') {
    const { roomName } = req.query;
    
    if (roomName && typeof roomName === 'string') {
      // Clear specific room from cache
      let cleared = 0;
      for (const key of imageCache.keys()) {
        if (key.startsWith(roomName + '_')) {
          imageCache.delete(key);
          cleared++;
        }
      }
      return res.status(200).json({ 
        success: true, 
        message: `Cleared ${cleared} cached image(s) for ${roomName}`,
        remainingCache: imageCache.size
      });
    } else {
      // Clear all cache
      const size = imageCache.size;
      imageCache.clear();
      return res.status(200).json({ 
        success: true, 
        message: `Cleared all ${size} cached images`,
        remainingCache: 0
      });
    }
  }
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { roomName, width = '400', height = '300' } = req.query;

    if (!roomName || typeof roomName !== 'string') {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const targetWidth = parseInt(width as string) || 400;
    const targetHeight = parseInt(height as string) || 300;
    const cacheKey = `${roomName}_${targetWidth}_${targetHeight}`;

    // Check in-memory cache first (saves Supabase Storage Egress!)
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('✅ Serving from in-memory cache (NO Supabase download!):', { 
        roomName, 
        cacheKey,
        size: `${(cached.buffer.length / 1024).toFixed(0)}KB`,
        age: `${Math.round((Date.now() - cached.timestamp) / 1000 / 60)}min`
      });
      
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).send(cached.buffer);
    }

    // Get room image URL from database (using admin client)
    const { data: room, error } = await supabaseAdmin
      .from('room_types')
      .select('main_image')
      .eq('name', roomName)
      .single();

    if (error || !room || !room.main_image) {
      return res.status(404).json({ error: 'Room or image not found' });
    }

    // Extract file path from signed URL
    // URL format: https://.../storage/v1/object/sign/room-type/file.png?token=...
    // We need: room-type/file.png
    let filePath = '';
    try {
      const urlParts = room.main_image.split('/storage/v1/object/sign/');
      if (urlParts.length > 1) {
        filePath = urlParts[1].split('?')[0]; // Remove query params
      } else {
        throw new Error('Invalid storage URL format');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse image URL:', { url: room.main_image, parseError });
      return res.status(500).json({ error: 'Invalid image URL format' });
    }

    // Extract bucket name and file path
    const [bucket, ...pathParts] = filePath.split('/');
    const fileName = pathParts.join('/');

    console.log('🖼️ Downloading from Supabase Storage (NO CDN):', { 
      roomName, 
      bucket, 
      fileName,
      method: 'storage.download() = Storage Egress ✅'
    });

    // Use .download() with service role key to bypass CDN = pure Storage Egress
    // Service role key bypasses RLS policies and enables direct download
    const { data: imageBlob, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(fileName);
    
    if (downloadError || !imageBlob) {
      console.error('❌ Failed to download from Supabase:', { 
        roomName,
        bucket,
        fileName,
        error: downloadError
      });
      return res.status(404).json({ 
        error: 'Image not found in storage',
        details: downloadError?.message || 'Unknown error'
      });
    }

    // Get original image buffer
    const originalBuffer = await imageBlob.arrayBuffer();
    const originalSize = originalBuffer.byteLength;
    
    // Resize image based on query parameters
    const optimizedBuffer = await sharp(Buffer.from(originalBuffer))
      .resize(targetWidth, targetHeight, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 75, progressive: true }) // Optimize for web
      .toBuffer();
    
    const optimizedSize = optimizedBuffer.length;
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    
    console.log('✅ Image downloaded & optimized:', { 
      roomName, 
      originalSize: `${(originalSize / 1024).toFixed(0)}KB`,
      optimizedSize: `${(optimizedSize / 1024).toFixed(0)}KB`,
      saved: `${compressionRatio}%`,
      dimensions: `${targetWidth}x${targetHeight}`,
      source: 'Supabase Storage Egress'
    });

    // Store in cache to avoid re-downloading (saves Storage Egress!)
    imageCache.set(cacheKey, {
      buffer: optimizedBuffer,
      timestamp: Date.now()
    });

    console.log('💾 Cached for future requests:', { cacheKey, totalCached: imageCache.size });

    // Return optimized binary image
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // Cache 24h
    res.setHeader('X-Original-Size', originalSize.toString());
    res.setHeader('X-Optimized-Size', optimizedSize.toString());
    res.setHeader('X-Cache', 'MISS');
    res.status(200).send(optimizedBuffer);

  } catch (error) {
    console.error('Error fetching base64 room image:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

