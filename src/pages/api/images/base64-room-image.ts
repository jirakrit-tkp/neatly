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

  // Prevent any caching to ensure fresh images
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Last-Modified', new Date().toUTCString());

  try {
    const { roomName, width = '200', height = '150', t } = req.query;

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

    // Fetch image from Supabase Storage as buffer
    const { data: imageBuffer, error: imageError } = await supabase.storage
      .from('neatly') // or whatever bucket contains room images
      .download(room.main_image.split('/').pop() || '');

    if (imageError || !imageBuffer) {
      return res.status(404).json({ error: 'Image not found in storage' });
    }

    // Convert buffer to base64
    const arrayBuffer = await imageBuffer.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = imageBuffer.type || 'image/jpeg';

    // Add timestamp to ensure fresh data
    const timestamp = Date.now();
    
    // Return base64 image with fresh timestamp
    res.status(200).json({
      image: `data:${mimeType};base64,${base64}`,
      roomName,
      size: `${width}x${height}`,
      cached: false, // This bypasses CDN cache
      timestamp: timestamp,
      lastModified: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching base64 room image:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
