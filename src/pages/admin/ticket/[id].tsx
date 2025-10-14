import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Layout from "@/components/admin/Layout";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { Input } from "@/components/ui/input";
import { supabase } from '@/lib/supabaseClient';
import TicketActions from "@/components/admin/TicketActions";

interface ChatMessage {
  id: string;
  message: string;
  is_bot: boolean;
  created_at: string;
}

// Bot Message Renderer Component
function BotMessageRenderer({ message, onOptionClick }: { message: ChatMessage; onOptionClick: (option: string) => void }) {
  try {
    // Try to parse the message as JSON (for encoded responseData)
    const parsed = JSON.parse(message.message);
    if (parsed.responseData) {
      const { text, responseData } = parsed;
      
      // Render based on format
      if (responseData.format === 'option_details') {
        return (
          <div className="text-sm">
            <p className="whitespace-pre-wrap mb-3">{text}</p>
            <div className="space-y-2">
              {responseData.options?.map((option: { option: string; detail: string }, index: number) => (
                <div 
                  key={index} 
                  className="bg-orange-100 rounded-md p-3 cursor-pointer hover:bg-orange-200"
                  onClick={() => onOptionClick(option.option)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-orange-700">{option.option}</span>
                    <svg className="w-4 h-4 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      } else if (responseData.format === 'room_type') {
        return (
          <div className="text-sm">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        );
      }
    }
  } catch (error) {
    // Not JSON, treat as regular message
  }
  
  // Default: render as regular message
  return <p className="text-sm whitespace-pre-wrap">{message.message.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
}

interface Ticket {
  id: string;
  session_id: string;
  user_message: string;
  status: string;
  created_at: string;
  closed_at?: string;
  agent_id?: string;
}

interface UserInfo {
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

export default function TicketDetail() {
  const router = useRouter();
  const { id } = router.query;
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  
  // Chat states
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isLiveChat, setIsLiveChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Ref for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollStates, setScrollStates] = useState<{ [key: string]: { canScrollLeft: boolean; canScrollRight: boolean } }>({});

  // Card navigation functions
  const updateScrollState = useCallback((messageId: string) => {
    const scrollContainer = cardScrollRefs.current[messageId];
    if (scrollContainer) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const canScrollLeft = scrollLeft > 5;
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5;
      
      setScrollStates(prev => {
        const current = prev[messageId];
        if (!current || current.canScrollLeft !== canScrollLeft || current.canScrollRight !== canScrollRight) {
          return {
            ...prev,
            [messageId]: { canScrollLeft, canScrollRight }
          };
        }
        return prev;
      });
    }
  }, []);

  const scrollCardsLeft = useCallback((messageId: string) => {
    const scrollContainer = cardScrollRefs.current[messageId];
    if (scrollContainer) {
      const cardWidth = 255 + 16;
      scrollContainer.scrollBy({ left: -cardWidth, behavior: 'smooth' });
      requestAnimationFrame(() => updateScrollState(messageId));
    }
  }, [updateScrollState]);

  const scrollCardsRight = useCallback((messageId: string) => {
    const scrollContainer = cardScrollRefs.current[messageId];
    if (scrollContainer) {
      const cardWidth = 255 + 16;
      scrollContainer.scrollBy({ left: cardWidth, behavior: 'smooth' });
      requestAnimationFrame(() => updateScrollState(messageId));
    }
  }, [updateScrollState]);

  // Get admin user ID
  useEffect(() => {
    const getAdminUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setAdminUserId(session.user.id);
      }
    };
    getAdminUser();
  }, []);

  useEffect(() => {
    if (id) {
      fetchTicketData();
    }
  }, [id]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto scroll to bottom when page loads
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      // Use setTimeout to ensure DOM is rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [loading]); // Trigger when loading is complete

  // Realtime subscription for new messages
  useEffect(() => {
    if (!ticket?.session_id) return;

    console.log('Setting up realtime subscription for session:', ticket.session_id);

    const channel = supabase
      .channel(`chat:${ticket.session_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_messages',
          filter: `session_id=eq.${ticket.session_id}`
        },
        (payload) => {
          console.log('New message received:', payload);
          const newMessage = payload.new as ChatMessage;
          
          // Add new message to state if it's not already there
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (!exists) {
              return [...prev, newMessage];
            }
            return prev;
          });
        }
      )
      .on('broadcast', { event: 'typing_status' }, (payload) => {
        if (payload.payload?.userType === 'user') {
          setUserTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [ticket?.session_id]);

  const fetchTicketData = async () => {
    try {
      setLoading(true);
      
      // Fetch ticket details
      const ticketResponse = await fetch(`/api/ticket/tickets?id=${id}`);
      const ticketData = await ticketResponse.json();
      
      if (!ticketResponse.ok) {
        throw new Error(ticketData.error || 'Failed to fetch ticket');
      }
      
      setTicket(ticketData.ticket);
      
      // Set live chat status from ticket data
      setIsLiveChat(ticketData.ticket.live_chat_enabled || false);
      
      // Fetch session to get customer_id
      const { data: session } = await supabase
        .from('chatbot_sessions')
        .select('customer_id, anonymous_id')
        .eq('id', ticketData.ticket.session_id)
        .single();
      
      // Fetch user info if customer_id exists
      if (session?.customer_id) {
        const { data: user } = await supabase
          .from('profiles')
          .select('username, first_name, last_name')
          .eq('id', session.customer_id)
          .single();
        
        if (user) {
          setUserInfo({
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}`
              : user.username || 'Unknown User'
          });
        }
      } else if (session?.anonymous_id) {
        setUserInfo({ full_name: 'Guest User', username: session.anonymous_id });
      }
      
      // Fetch chat messages for this session
      const messagesResponse = await fetch(`/api/admin/messages?session_id=${ticketData.ticket.session_id}`);
      const messagesData = await messagesResponse.json();
      
      if (messagesResponse.ok) {
        setMessages(messagesData.messages || []);
      }
      
    } catch (err) {
      console.error('Error fetching ticket data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  // Send typing status
  const sendTypingStatus = async (typing: boolean) => {
    if (!ticket?.session_id) return;
    
    try {
      await fetch('/api/chat/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: ticket.session_id,
          isTyping: typing,
          userType: 'admin'
        })
      });
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  };

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Send typing status if there's text
    if (value.trim()) {
      if (!isTyping) {
        setIsTyping(true);
      }
      sendTypingStatus(true);
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
      setTypingTimeout(null);
    }, 1000);

    setTypingTimeout(timeout);
  };

  // Send message function
  const sendMessage = async () => {
    if (!newMessage.trim() || !ticket?.session_id) return;

    // Stop typing status
    setIsTyping(false);
    sendTypingStatus(false);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }

    setSendingMessage(true);
    try {
      // Prepare message data with sender_id for admin
      const messageData: {
        session_id: string;
        message: string;
        is_bot: boolean;
        sender_id: string;
      } = {
        session_id: ticket.session_id,
        message: newMessage.trim(),
        is_bot: true, // Admin messages are treated as bot messages
        sender_id: adminUserId || ''
      };

      const { data, error } = await supabase
        .from('chatbot_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
      } else {
        setNewMessage('');
        // Add message to local state immediately
        setMessages(prev => [...prev, data]);
        
        // Update ticket status to "in_progress" if it's still "open"
        if (ticket?.status === 'open') {
          try {
            const updateResponse = await fetch(`/api/ticket/tickets?id=${ticket.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'in_progress' })
            });
            
            if (updateResponse.ok) {
              setTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
              console.log('✅ Ticket status updated to in_progress');
            }
          } catch (updateError) {
            console.error('Error updating ticket status:', updateError);
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-green-100 text-green-800';
      case 'solved':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Pending';
      case 'in_progress':
        return 'Accepted';
      case 'solved':
        return 'Solved';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="bg-gray-100 flex-1 flex items-center justify-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading ticket...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !ticket) {
    return (
      <Layout>
        <div className="bg-gray-100 flex-1 flex items-center justify-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Ticket not found'}</p>
            <Button onClick={() => router.push('/admin/ticket')} variant="outline">
              Back to Tickets
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-100 flex-1" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="w-full px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ticket #{ticket.id.substring(0, 8)}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {getStatusText(ticket.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created: {new Date(ticket.created_at).toLocaleString('en-US')}
                  </span>
                  {ticket.closed_at && (
                    <span className="text-sm text-gray-500">
                      Closed: {new Date(ticket.closed_at).toLocaleString('en-US')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => router.push('/admin/ticket')}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  Back
                </Button>
                <TicketActions
                  ticketId={ticket.id}
                  status={ticket.status}
                  onStatusUpdate={(newStatus) => {
                    setTicket(prev => prev ? { 
                      ...prev, 
                      status: newStatus,
                      // If accepting ticket, set agent_id to current admin
                      agent_id: newStatus === 'in_progress' ? (adminUserId || undefined) : prev.agent_id
                    } : null);
                  }}
                  variant="detail"
                  showViewDetail={false}
                  hideDelete={true}
                  adminUserId={adminUserId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full px-6 py-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Ticket Info */}
             <div className="mb-6">
               <h2 className="text-lg font-semibold text-gray-600 mb-4">Ticket Information</h2>
               <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                 {userInfo && (
                   <p className="text-gray-800">
                     <strong>User:</strong> {userInfo.full_name || userInfo.username || 'Unknown'}
                     {userInfo.username && userInfo.full_name && userInfo.username !== userInfo.full_name && (
                       <span className="text-sm text-gray-500 ml-2">(@{userInfo.username})</span>
                     )}
                   </p>
                 )}
                 <p className="text-gray-800">
                   <strong>Issue:</strong> {ticket.user_message}
                 </p>
                 <p className="text-sm text-gray-500">
                   <strong>Session ID:</strong> {ticket.session_id}
                 </p>
               </div>
             </div>

            {/* Chat History */}
            <div>
              <h2 className="text-lg font-semibold text-gray-600 mb-4">Chat History</h2>
              {messages.length > 0 ? (
                <div className="bg-gray-50 rounded-lg shadow-[inset_0_-16px_16px_-8px_rgba(0,0,0,0.1)] space-y-2 max-h-96 overflow-y-auto">
                   <div className="py-4 px-4 space-y-2">
                   {messages.map((message) => {
                     // Check if this is a room_type message
                     let isRoomTypeMessage = false;
                     let roomTypeData = null;
                     
                     // Check if this is a room_type message
                     if (message.is_bot) {
                       try {
                         const parsed = JSON.parse(message.message);
                         if (parsed.responseData && parsed.responseData.format === 'room_type') {
                           isRoomTypeMessage = true;
                           roomTypeData = parsed.responseData;
                         }
                       } catch (error) {
                         // Not JSON, treat as regular message
                       }
                     }

                     return (
                       <div key={message.id} className="w-full">
                         {/* Text Message */}
                         <div className={`flex flex-col ${message.is_bot ? 'items-end' : 'items-start'}`}>
                           <div className={`max-w-[80%] p-3 rounded-lg ${
                             message.is_bot 
                               ? 'bg-orange-600 text-white' 
                               : 'bg-white text-gray-800'
                           }`}>
                             {message.is_bot ? (
                               <BotMessageRenderer 
                                 message={message} 
                                 onOptionClick={(option) => {
                                   // Admin can't send messages as customer, just show the option
                                   console.log('Option clicked:', option);
                                 }}
                               />
                             ) : (
                               <p className="text-sm whitespace-pre-wrap">{message.message.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                             )}
                           </div>
                           <p className="text-xs mt-1 text-gray-500 px-1">
                             {new Date(message.created_at).toLocaleTimeString('th-TH', { 
                               hour: '2-digit', 
                               minute: '2-digit'
                             })}
                           </p>
                         </div>

                         {/* Room Type Cards */}
                         {isRoomTypeMessage && roomTypeData && (
                           <div className="mt-2 w-full overflow-hidden relative flex justify-end">
                             <div 
                               ref={(el) => {
                                 cardScrollRefs.current[message.id] = el;
                                 if (el) {
                                   requestAnimationFrame(() => updateScrollState(message.id));
                                   let scrollTimeout: NodeJS.Timeout;
                                   el.addEventListener('scroll', () => {
                                     if (scrollTimeout) clearTimeout(scrollTimeout);
                                     scrollTimeout = setTimeout(() => updateScrollState(message.id), 50);
                                   });
                                 }
                               }}
                               className="flex flex-row flex-nowrap gap-4 overflow-x-hidden pb-2 scroll-smooth max-w-[80%]"
                             >
                               {roomTypeData.rooms?.map((roomName: string, index: number) => {
                                 const roomData = roomTypeData.roomDetails?.[roomName];
                                 if (!roomData) return null;
                                 
                                 return (
                                   <div key={index} className="bg-white rounded-lg shadow-sm flex-shrink-0 flex flex-col" style={{ width: '255px', height: '317px' }}>
                                     {/* Room Image */}
                                     {roomData.main_image && (
                                       <div className="w-full rounded-t-lg overflow-hidden flex-shrink-0" style={{ height: '50%' }}>
                                         <img 
                                           src={roomData.main_image} 
                                           alt={roomName}
                                           className="w-full h-full object-cover"
                                         />
                                       </div>
                                     )}
                                     
                                     {/* Room Details */}
                                     <div className="p-3 flex flex-col justify-between flex-shrink-0" style={{ height: '37.5%' }}>
                                       <div>
                                         <h3 className="font-bold text-gray-900 mb-0 text-base">{roomName}</h3>
                                         
                                         {/* Pricing */}
                                         <div className="mb-2">
                                           {roomData.promo_price && roomData.promo_price < roomData.base_price ? (
                                             <div className="flex items-center gap-2">
                                               <span className="text-base font-bold text-orange-500">
                                                 THB {roomData.promo_price.toLocaleString()}.00
                                               </span>
                                               <span className="text-sm text-gray-500 line-through">
                                                 THB {roomData.base_price.toLocaleString()}.00
                                               </span>
                                             </div>
                                           ) : (
                                             <span className="text-base font-bold text-gray-900">
                                               THB {roomData.base_price.toLocaleString()}.00
                                             </span>
                                           )}
                                         </div>
                                         
                                         {/* Description */}
                                         {roomData.description && (
                                           <p className="text-gray-600 text-sm line-clamp-2">
                                             {roomData.description}
                                           </p>
                                         )}
                                       </div>
                                     </div>
                                       
                                     {/* Call to Action Button */}
                                     <Button
                                       className="w-full bg-orange-100 text-orange-500 hover:bg-orange-200 text-sm font-semibold flex-shrink-0 rounded-none"
                                       style={{ height: '12.5%' }}
                                       onClick={() => {
                                         if (roomData.id) {
                                           window.open(`/customer/search-result/${roomData.id}`, '_blank');
                                         } else {
                                           console.error('Room ID is undefined');
                                         }
                                       }}
                                     >
                                       <span className="flex items-center justify-between w-full px-3">
                                         <span>{roomTypeData.buttonName || 'View Details'}</span>
                                         <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                         </svg>
                                       </span>
                                     </Button>
                                   </div>
                                 );
                               })}
                             </div>
                             
                             {/* Navigation Buttons */}
                             {scrollStates[message.id]?.canScrollLeft && (
                               <button
                                 onClick={() => scrollCardsLeft(message.id)}
                                 className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center z-10 shadow-md transition-opacity"
                               >
                                 <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                 </svg>
                               </button>
                             )}
                             {scrollStates[message.id]?.canScrollRight && (
                               <button
                                 onClick={() => scrollCardsRight(message.id)}
                                 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center z-10 shadow-md transition-opacity"
                               >
                                 <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                 </svg>
                               </button>
                             )}
                           </div>
                         )}
                       </div>
                     );
                   })}
                   
                   {/* User Typing Indicator - Same as Bot Typing */}
                   {userTyping && (
                     <div className="flex flex-col items-start">
                       <div className="w-12 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                         <div className="flex gap-1">
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                           <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                         </div>
                       </div>
                     </div>
                   )}
                   
                   {/* Invisible div for auto-scroll */}
                   <div ref={messagesEndRef} />
                   </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No chat messages found for this ticket.</p>
                </div>
              )}
            </div>

            {/* Admin Chat Input */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-semibold text-gray-600 mb-4">Reply to Customer</h3>
              {ticket.status === 'open' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-4 px-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-800 text-sm">
                        Please accept this ticket first to start chatting with the customer.
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <Button
                      onClick={() => router.push('/admin/ticket')}
                      variant="outline"
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    >
                      Back
                    </Button>
                    <TicketActions
                      ticketId={ticket.id}
                      status={ticket.status}
                      onStatusUpdate={(newStatus) => {
                        setTicket(prev => prev ? { 
                          ...prev, 
                          status: newStatus,
                          // If accepting ticket, set agent_id to current admin
                          agent_id: newStatus === 'in_progress' ? (adminUserId || undefined) : prev.agent_id
                        } : null);
                      }}
                      variant="detail"
                      showViewDetail={false}
                      hideDelete={true}
                      adminUserId={adminUserId}
                    />
                  </div>
                </div>
              ) : ticket.status === 'solved' ? (
                <div className="space-y-4">
                  {/* Ticket Solved Message */}
                  <div className="flex items-center justify-center py-4 px-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-green-800 text-sm font-medium">
                        Ticket has been solved successfully!
                      </span>
                    </div>
                  </div>
                </div>
              ) : ticket.agent_id && ticket.agent_id !== adminUserId ? (
                <div className="space-y-4">
                  {/* Ticket Assigned to Another Agent */}
                  <div className="flex items-center justify-center py-4 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-blue-800 text-sm">
                        This ticket has been assigned to another agent. You cannot send messages.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Live Chat Toggle */}
                  <div className="flex items-center justify-between py-3 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700 text-sm">
                        Live Chat: {isLiveChat ? 'ON' : 'OFF'} - {isLiveChat ? 'Bot responses disabled' : 'Bot responses enabled'}
                      </span>
                    </div>
                    <Button 
                      onClick={async () => {
                        try {
                          const newLiveChatStatus = !isLiveChat;
                          const response = await fetch('/api/admin/live-chat', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              ticketId: ticket.id, 
                              liveChatEnabled: newLiveChatStatus 
                            })
                          });
                          
                          if (response.ok) {
                            setIsLiveChat(newLiveChatStatus);
                            console.log(`✅ Live chat ${newLiveChatStatus ? 'enabled' : 'disabled'}`);
                          }
                        } catch (error) {
                          console.error('Error toggling live chat:', error);
                        }
                      }}
                      variant={isLiveChat ? "outline" : "default"}
                      className={`px-4 py-1 text-sm cursor-pointer ${
                        isLiveChat 
                          ? 'border-orange-600 text-orange-600 hover:bg-orange-50' 
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      {isLiveChat ? 'Turn OFF' : 'Turn ON'}
                    </Button>
                  </div>

                  {/* Chat Input */}
                  {isLiveChat ? (
                    <div className="flex gap-2 items-center">
                      <Input 
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Type your message to the customer..." 
                        className="flex-1 border-gray-200 hover:border-orange-400 focus:ring-orange-500 focus:border-orange-500 rounded-full px-4 py-2"
                        disabled={sendingMessage}
                      />
                      <Button 
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sendingMessage}
                        className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600 rounded-full p-2 w-10 h-10 flex items-center justify-center"
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-600 text-sm">
                          Turn ON Live Chat to start messaging the customer
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
