import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Allow browser caching to reduce repeated requests
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.setHeader('Last-Modified', new Date().toUTCString());

  try {
    const { roomName, width = '400', height = '300' } = req.query;

    if (!roomName || typeof roomName !== 'string') {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Get room image URL from database
    const { data: room, error } = await supabase
      .from('room_types')
      .select('main_image')
      .eq('name', roomName)
      .single();

    if (error || !room || !room.main_image) {
      return res.status(404).json({ error: 'Room or image not found' });
    }

    // Extract path from full URL
    const imagePath = room.main_image.split('/').pop();
    if (!imagePath) {
      return res.status(404).json({ error: 'Invalid image path' });
    }

    // Fetch image from Supabase Storage as buffer (uses Storage Egress, NOT cachedEgress)
    const { data: imageBuffer, error: imageError } = await supabase.storage
      .from('neatly')
      .download(imagePath);

    if (imageError || !imageBuffer) {
      console.error('Image download error:', imageError);
      return res.status(404).json({ error: 'Image not found in storage' });
    }

    // Convert buffer to base64
    const arrayBuffer = await imageBuffer.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = imageBuffer.type || 'image/jpeg';

    // Add timestamp to ensure cache busting when needed
    const timestamp = Date.now();
    
    // Return base64 image - browser can cache this
    res.status(200).json({
      image: `data:${mimeType};base64,${base64}`,
      roomName,
      size: `${width}x${height}`,
      cached: true, // Browser can cache this
      timestamp: timestamp,
      note: 'Using Storage Egress (not cachedEgress) to preserve CDN quota'
    });

  } catch (error) {
    console.error('Error fetching base64 room image:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

