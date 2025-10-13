import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log('🕐 Scheduled cleanup triggered at:', new Date().toISOString());

    // เรียกใช้ cleanup API (auto mode)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cleanupResponse = await fetch(`${baseUrl}/api/chat/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true' // เพื่อระบุว่าเป็น internal request
      },
      body: JSON.stringify({ mode: 'auto' })
    });

    if (!cleanupResponse.ok) {
      throw new Error(`Cleanup API failed with status: ${cleanupResponse.status}`);
    }

    const cleanupResult = await cleanupResponse.json();

    console.log('✅ Scheduled cleanup completed:', cleanupResult);

    res.status(200).json({
      success: true,
      message: 'Scheduled cleanup completed successfully',
      cleanupResult: cleanupResult,
      triggeredAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error during scheduled cleanup:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Scheduled cleanup failed',
      triggeredAt: new Date().toISOString()
    });
  }
}
