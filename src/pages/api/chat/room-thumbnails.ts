import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { getChatbotThumbnail } from '@/lib/chatbotOptimization';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { roomNames } = req.query;

    if (!roomNames || typeof roomNames !== 'string') {
      return res.status(400).json({ error: 'Room names are required' });
    }

    const roomNameList = roomNames.split(',').filter(name => name.trim());
    
    if (roomNameList.length === 0) {
      return res.status(400).json({ error: 'At least one room name is required' });
    }

    // Fetch room data with optimized image URLs
    const { data: roomTypes, error } = await supabase
      .from('room_types')
      .select('id, name, main_image, base_price, promo_price, description')
      .in('name', roomNameList);

    if (error) {
      console.error('Error fetching room thumbnails:', error);
      return res.status(500).json({ error: 'Failed to fetch room data' });
    }

    // Optimize images for chatbot (smaller size, WebP format)
    const optimizedRooms = roomTypes?.map(room => ({
      id: room.id,
      name: room.name,
      main_image: getChatbotThumbnail(room.main_image || ''),
      base_price: room.base_price || 0,
      promo_price: room.promo_price,
      description: room.description || ''
    })) || [];

    res.status(200).json({ 
      rooms: optimizedRooms,
      optimized: true,
      cached: false // This endpoint doesn't cache, but serves optimized images
    });

  } catch (error) {
    console.error('Error in room thumbnails API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room thumbnails',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
