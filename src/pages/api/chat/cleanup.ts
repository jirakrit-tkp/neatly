import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent, X-Internal-Request');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { sessionId, mode = 'manual' } = req.body;

    // Mode: 'manual' = ลบ session ที่ระบุ, 'auto' = ลบ anonymous sessions เก่า
    if (mode === 'manual') {
      return await handleManualCleanup(req, res, sessionId);
    } else if (mode === 'auto') {
      return await handleAutoCleanup(req, res);
    } else {
      return res.status(400).json({ 
        error: 'Invalid mode. Use "manual" or "auto"' 
      });
    }

  } catch (error) {
    console.error('❌ Error in cleanup API:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      message: 'Cleanup operation failed'
    });
  }
}

// Manual cleanup: ลบ session ที่ระบุ (สำหรับผู้ใช้ลบประวัติ)
async function handleManualCleanup(
  req: NextApiRequest, 
  res: NextApiResponse, 
  sessionId: string
) {
  if (!sessionId) {
    console.log('❌ Manual cleanup: Missing sessionId');
    return res.status(400).json({ error: 'Session ID is required for manual cleanup' });
  }

  console.log('🗑️ Manual cleanup called for session:', sessionId);

  try {
    // Count messages before deletion
    const { count: messageCount, error: countError } = await supabase
      .from('chatbot_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      console.error('❌ Error counting messages:', countError);
    } else {
      console.log('📊 Messages count before deletion:', messageCount);
    }

    // Count tickets before deletion
    const { count: ticketCount, error: ticketCountError } = await supabase
      .from('chatbot_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (ticketCountError) {
      console.error('❌ Error counting tickets:', ticketCountError);
    } else {
      console.log('🎫 Tickets count before deletion:', ticketCount);
    }

    // Delete all messages in session
    const { error: deleteMessagesError } = await supabase
      .from('chatbot_messages')
      .delete()
      .eq('session_id', sessionId);

    if (deleteMessagesError) {
      console.error('❌ Error deleting messages:', deleteMessagesError);
      throw deleteMessagesError;
    }

    // Delete all tickets in session
    const { error: deleteTicketsError } = await supabase
      .from('chatbot_tickets')
      .delete()
      .eq('session_id', sessionId);

    if (deleteTicketsError) {
      console.error('❌ Error deleting tickets:', deleteTicketsError);
      throw deleteTicketsError;
    }

    // Delete the session completely (instead of just closing it)
    const { error: deleteSessionError } = await supabase
      .from('chatbot_sessions')
      .delete()
      .eq('id', sessionId);

    if (deleteSessionError) {
      console.error('❌ Error deleting session:', deleteSessionError);
      throw deleteSessionError;
    }

    console.log('✅ Manual cleanup completed:', {
      sessionId,
      deletedMessages: messageCount || 0,
      deletedTickets: ticketCount || 0
    });

    res.status(200).json({
      success: true,
      mode: 'manual',
      sessionId: sessionId,
      deletedMessages: messageCount || 0,
      deletedTickets: ticketCount || 0,
      message: 'Session cleaned up successfully'
    });

  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    throw error;
  }
}

// Auto cleanup: ลบ anonymous sessions เก่า (สำหรับ cron job)
async function handleAutoCleanup(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧹 Starting auto cleanup of anonymous sessions...');

  try {
    // คำนวณเวลาที่ 12 ชั่วโมงก่อนหน้านี้ (ค่าใช้งานจริง)
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

    console.log('🕐 Cleaning up sessions older than:', twelveHoursAgo.toISOString());

    // หา anonymous sessions ที่ไม่ active เกิน 12 ชั่วโมง
    const { data: inactiveAnonSessions, error: sessionsError } = await supabase
      .from('chatbot_sessions')
      .select('id, anonymous_id, created_at')
      .not('anonymous_id', 'is', null) // เฉพาะ sessions ที่มี anonymous_id
      .is('customer_id', null) // และต้องไม่มี customer_id
      .lt('created_at', twelveHoursAgo.toISOString())
      .eq('status', 'active'); // เฉพาะ sessions ที่ยัง active

    if (sessionsError) {
      console.error('❌ Error fetching inactive anonymous sessions:', sessionsError);
      throw sessionsError;
    }

    if (!inactiveAnonSessions || inactiveAnonSessions.length === 0) {
      console.log('✅ No inactive anonymous sessions found');
      return res.status(200).json({
        success: true,
        mode: 'auto',
        message: 'No inactive anonymous sessions found',
        deletedSessions: 0,
        deletedMessages: 0,
        deletedTickets: 0
      });
    }

    console.log(`🔍 Found ${inactiveAnonSessions.length} inactive anonymous sessions to clean up`);

    const sessionIds = inactiveAnonSessions.map(session => session.id);
    let deletedMessages = 0;
    let deletedTickets = 0;

    // ลบข้อความที่เกี่ยวข้องกับ sessions เหล่านี้
    const { error: messagesError } = await supabase
      .from('chatbot_messages')
      .delete()
      .in('session_id', sessionIds);

    if (messagesError) {
      console.error('❌ Error deleting messages:', messagesError);
      throw messagesError;
    }

    // นับจำนวนข้อความที่ถูกลบ
    const { count: messagesCount } = await supabase
      .from('chatbot_messages')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds);

    deletedMessages = messagesCount || 0;

    // ลบ tickets ที่เกี่ยวข้องกับ sessions เหล่านี้
    const { error: ticketsError } = await supabase
      .from('chatbot_tickets')
      .delete()
      .in('session_id', sessionIds);

    if (ticketsError) {
      console.error('❌ Error deleting tickets:', ticketsError);
      throw ticketsError;
    }

    // นับจำนวน tickets ที่ถูกลบ
    const { count: ticketsCount } = await supabase
      .from('chatbot_tickets')
      .select('*', { count: 'exact', head: true })
      .in('session_id', sessionIds);

    deletedTickets = ticketsCount || 0;

    // ลบ sessions ทั้งหมด (แทนการปิด)
    const { error: deleteSessionsError } = await supabase
      .from('chatbot_sessions')
      .delete()
      .in('id', sessionIds);

    if (deleteSessionsError) {
      console.error('❌ Error deleting sessions:', deleteSessionsError);
      throw deleteSessionsError;
    }

    console.log('✅ Auto cleanup completed successfully:', {
      sessionsProcessed: inactiveAnonSessions.length,
      messagesDeleted: deletedMessages,
      ticketsDeleted: deletedTickets
    });

    res.status(200).json({
      success: true,
      mode: 'auto',
      message: 'Anonymous sessions cleanup completed',
      deletedSessions: inactiveAnonSessions.length,
      deletedMessages: deletedMessages,
      deletedTickets: deletedTickets,
      cleanupTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Auto cleanup failed:', error);
    throw error;
  }
}
