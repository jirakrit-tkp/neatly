import { useState, useRef, useEffect, useCallback } from "react";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import axios from "axios";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { ChatMessage, ChatSession } from "@/types/chat";

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
                  className="bg-green-100 rounded-md p-3 cursor-pointer hover:bg-green-200"
                  onClick={() => onOptionClick(option.option)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-700">{option.option}</span>
                    <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

type SuggestionFAQ = {
  id?: string;
  topic?: string;
};

type CurrentTicket = {
  status?: string | undefined;
  live_chat_enabled?: boolean | undefined;
};

export default function Chatbot() {
  const auth = useAuth();
  const { user, anonymousId, isGuest } = auth || {};

  // Debug auth state
  // console.log('🤖 Chatbot auth state:', {
  //   hasAuth: !!auth,
  //   user: !!user,
  //   userId: user?.id,
  //   anonymousId,
  //   isGuest,
  //   authStatus: user ? 'authenticated' : (anonymousId ? 'guest' : 'none')
  // });
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );
  const [inputValue, setInputValue] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState<string>("");
  const [suggestionFAQs, setSuggestionFAQs] = useState<SuggestionFAQ[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Ticket modal states
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketTopic, setTicketTopic] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // Ticket status states
  const [currentTicket, setCurrentTicket] = useState<CurrentTicket | null>(
    null
  );
  const [isTicketSolved, setIsTicketSolved] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const subscriptionReadyPromise = useRef<Promise<void> | null>(null);
  const subscriptionResolve = useRef<(() => void) | null>(null);
  const displayedBotMessages = useRef<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cardScrollRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [scrollStates, setScrollStates] = useState<{ [key: string]: { canScrollLeft: boolean; canScrollRight: boolean } }>({});

  // Card navigation functions
  const updateScrollState = useCallback((messageId: string) => {
    const scrollContainer = cardScrollRefs.current[messageId];
    if (scrollContainer) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      const canScrollLeft = scrollLeft > 5; // เพิ่ม threshold
      const canScrollRight = scrollLeft < scrollWidth - clientWidth - 5; // เพิ่ม threshold
      
      setScrollStates(prev => {
        const current = prev[messageId];
        // Update only if state actually changed
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
      const cardWidth = 255 + 16; // card width + gap
      scrollContainer.scrollBy({ left: -cardWidth, behavior: 'smooth' });
      // Update state immediately instead of setTimeout
      requestAnimationFrame(() => updateScrollState(messageId));
    }
  }, [updateScrollState]);

  const scrollCardsRight = useCallback((messageId: string) => {
    const scrollContainer = cardScrollRefs.current[messageId];
    if (scrollContainer) {
      const cardWidth = 255 + 16; // card width + gap
      scrollContainer.scrollBy({ left: cardWidth, behavior: 'smooth' });
      // Update state immediately instead of setTimeout
      requestAnimationFrame(() => updateScrollState(messageId));
    }
  }, [updateScrollState]);

  const handleClose = (withAnimation = true) => {
    if (withAnimation) {
      setIsClosing(true);
      setTimeout(() => {
        setOpen(false);
        setIsExpanded(false);
        setIsClosing(false);
      }, 200); // Match animation duration
    } else {
      setOpen(false);
      setIsExpanded(false);
      setIsClosing(false);
    }
  };

  const handleClearMessages = () => {
    console.log('🗑️ Clear button clicked - showing confirmation dialog');
    setShowClearConfirm(true);
  };

  const confirmClearMessages = async () => {
    if (!currentSession?.id) {
      console.log('❌ Cannot clear messages - no active session');
      return;
    }

    console.log('🗑️ Confirming clear messages for session:', currentSession.id);
    console.log('📊 Current messages count:', messages.length);

    try {
      console.log('🔄 Calling clear messages API...');
      
      const response = await fetch('/api/chat/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'manual',
          sessionId: currentSession.id,
        }),
      });

      console.log('📡 API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API error response:', errorData);
        throw new Error(`API returned ${response.status}: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ API success response:', result);

      // Clear local state
      setMessages([]);
      setShowClearConfirm(false);
      
      // Clear ticket state as well
      setCurrentTicket(null);
      setIsTicketSolved(false);
      setIsBotTyping(false);
      
      // Reset session so the next message creates a fresh session
      // This prevents posting to a deleted session id
      setCurrentSession(null);
      
      console.log('✅ Messages and tickets cleared successfully');
      console.log('📊 Messages count after clear:', 0);
      console.log('🎫 Ticket state cleared');
    } catch (error) {
      console.error('❌ Error clearing messages:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      // Still close the dialog even if there's an error
      setShowClearConfirm(false);
    }
  };

  const cancelClearMessages = () => {
    console.log('❌ Clear operation cancelled by user');
    setShowClearConfirm(false);
  };

  // Handle scroll to expand
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      if (scrollTop > 50 && !isExpanded) {
        setIsExpanded(true);
      }
    }
  };

  // Handle touch events for drag interactions
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768) return; // Only on mobile
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || window.innerWidth >= 768) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || window.innerWidth >= 768) return;

    setIsDragging(false);

    if (dragY > 100) {
      // Drag down: Close chat without animation
      handleClose(false);
    } else if (dragY < -50 && !isExpanded) {
      // Drag up: Expand to fullscreen
      setIsExpanded(true);
    }

    setDragY(0);
  };

  // Session will be created when user sends first message

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset states when chat closes
  useEffect(() => {
    if (!open) {
      setIsExpanded(false);
      setDragY(0);
    }
  }, [open]);

  // ดึง FAQs และ session ที่มีอยู่เมื่อเปิด chatbot
  useEffect(() => {
    if (open) {
      fetchFAQs();
      loadExistingSession();
    }
  }, [open, user, anonymousId]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    if (!currentSession?.id) return;

    console.log(
      "Setting up Realtime subscription for session:",
      currentSession.id
    );

    // Clear displayed bot messages for new session
    displayedBotMessages.current.clear();

    // Create promise for subscription ready
    subscriptionReadyPromise.current = new Promise<void>((resolve) => {
      subscriptionResolve.current = resolve;
    });

    const channel = supabase
      .channel(`chat:${currentSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chatbot_messages",
          filter: `session_id=eq.${currentSession.id}`,
        },
        async (payload) => {
          console.log("📡 New message received via Realtime:", {
            id: payload.new?.id,
            is_bot: payload.new?.is_bot,
            message: payload.new?.message?.substring(0, 50) + "...",
            created_at: payload.new?.created_at,
          });
          console.log("📡 Full payload:", payload);
          console.log("📡 Current state before processing:", { currentTicket });

          const newMessage = payload.new as ChatMessage;

          // เพิ่มข้อความใหม่เข้า state
          setMessages((prev) => {
            // ตรวจสอบว่าไม่มีข้อความนี้อยู่แล้ว (ป้องกัน duplicate)
            const existsById = prev.some((msg) => msg.id === newMessage.id);
            const alreadyDisplayed = displayedBotMessages.current.has(
              newMessage.id
            );

            // ตรวจสอบ user messages ด้วย (ป้องกัน duplicate user messages)
            if (!newMessage.is_bot) {
              const duplicateUserMessage = prev.some(
                (msg) =>
                  !msg.is_bot &&
                  msg.message === newMessage.message &&
                  Math.abs(
                    new Date(msg.created_at).getTime() -
                      new Date(newMessage.created_at).getTime()
                  ) < 2000
              );
              if (duplicateUserMessage) {
                console.log(
                  "Duplicate user message detected, skipping:",
                  newMessage.message
                );
                return prev;
              }
            }

            if (existsById || alreadyDisplayed) {
              console.log("Message already exists, skipping:", newMessage.id);
              return prev;
            }
            console.log("Adding new message to state:", newMessage.id);

            // Add message to state first
            const updatedMessages = [...prev, newMessage];

            // Hide typing indicator if this is a bot message (after adding to state)
            if (newMessage.is_bot) {
              console.log(
                "🤖 Bot message received via Realtime, hiding typing indicator"
              );
              console.log("🤖 Bot message content:", newMessage.message);
              console.log("🤖 Current ticket state:", { currentTicket });

              displayedBotMessages.current.add(newMessage.id);

              // Hide typing indicator after a short delay to ensure message is rendered
              setTimeout(() => {
                setIsBotTyping(false);
                console.log(
                  "🤖 Bot response received via Realtime, hiding typing indicator"
                );
              }, 200);
            }

            return updatedMessages;
          });

          // Auto scroll to bottom after adding message
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
          }, 100);
        }
      )
      .on("broadcast", { event: "typing_status" }, (payload) => {
        if (payload.payload?.userType === "admin") {
          setAdminTyping(payload.payload.isTyping);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);

          // Resolve the promise when subscription is ready
          if (subscriptionResolve.current) {
            subscriptionResolve.current();
            subscriptionResolve.current = null;
          }
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            "❌ Realtime subscription error for session:",
            currentSession.id
          );
          setIsSubscribed(false);

          // Retry subscription after error
          setTimeout(() => {
            console.log("Retrying Realtime subscription...");
            channel.subscribe();
          }, 2000);
        } else {
          setIsSubscribed(false);
        }
      });

    // Cleanup subscription
    return () => {
      console.log(
        "Cleaning up Realtime subscription for session:",
        currentSession.id
      );
      supabase.removeChannel(channel);
    };
  }, [currentSession?.id]);

  // Supabase Realtime subscription for ticket updates
  useEffect(() => {
    if (!currentSession?.id) return;

    console.log(
      "Setting up ticket Realtime subscription for session:",
      currentSession.id
    );

    const ticketChannel = supabase
      .channel(`tickets:${currentSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "chatbot_tickets",
          filter: `session_id=eq.${currentSession.id}`,
        },
        async (payload) => {
          console.log("🎫 Ticket update received via Realtime:", payload);

          // Update current ticket state when ticket is updated
          if (payload.eventType === "UPDATE") {
            if (payload.new?.status === "closed") {
              // Clear ticket immediately when closed
              setCurrentTicket(null);
              setIsTicketSolved(false);
              setIsBotTyping(false); // Hide bot typing when ticket is closed
              console.log("🔓 Ticket closed - cleared ticket state (can open new ticket now)");
            } else if (payload.new?.status === "solved") {
              // Show success message, then clear ticket state
              setCurrentTicket(null); // Clear immediately so user can open new ticket
              setIsTicketSolved(true);
              setIsBotTyping(false); // Hide bot typing when ticket is solved
              console.log("✅ Ticket solved - cleared ticket state (can open new ticket now)");
              // Clear success message after 3 seconds
              setTimeout(() => {
                setIsTicketSolved(false);
                console.log("✅ Cleared success message");
              }, 3000);
            } else {
              // Update ticket info when status changes (open -> in_progress)
              setCurrentTicket(payload.new);
              setIsTicketSolved(false);
              console.log("🎫 Ticket updated:", payload.new);
            }
          } else if (payload.eventType === "INSERT") {
            // New ticket created
            setCurrentTicket(payload.new);
            setIsTicketSolved(false);
            console.log("🎫 New ticket created:", payload.new);
          }
        }
      )
      .subscribe(async (status) => {
        console.log("Ticket Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(
            "✅ Ticket Realtime subscription active for session:",
            currentSession.id
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error(
            "❌ Ticket Realtime subscription error for session:",
            currentSession.id
          );
        }
      });

    return () => {
      console.log(
        "Cleaning up ticket Realtime subscription for session:",
        currentSession.id
      );
      supabase.removeChannel(ticketChannel);
    };
  }, [currentSession?.id]);

  const loadExistingSession = async () => {
    try {
      setIsLoadingSession(true);

      if (!user && !anonymousId) {
        console.log("❌ No user ID or anonymous ID available");
        setIsLoadingSession(false);
        return;
      }

      // Check for existing sessions
      const params: {
        customerId?: string;
        anonymousId?: string;
      } = {};
      if (user?.id) {
        params.customerId = user.id;
      } else if (anonymousId) {
        params.anonymousId = anonymousId;
      }

      const { data } = await axios.get("/api/chat/sessions", { params });

      if (data.sessions && data.sessions.length > 0) {
        const existingSession = data.sessions[0]; // Get the most recent session
        console.log("✅ Found existing session:", existingSession.id);
        setCurrentSession(existingSession);

        // Fetch existing messages for this session
        await fetchMessages(existingSession.id);
      } else {
        console.log(
          "ℹ️ No existing session found, will create new one when needed"
        );
      }
    } catch (error) {
      console.error("Error loading existing session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const createChatSession = async () => {
    try {
      setIsLoadingSession(true);
      console.log("🔄 Creating chat session with auth:", {
        user: !!user,
        userId: user?.id,
        anonymousId,
        isGuest,
      });

      if (!user && !anonymousId) {
        console.error("❌ No user ID or anonymous ID available");
        setIsLoadingSession(false);
        return;
      }

      // Use real API with appropriate ID
      const sessionData: {
        customerId?: string;
        anonymousId?: string;
      } = {};
      if (user?.id) {
        sessionData.customerId = user.id;
      } else if (anonymousId) {
        sessionData.anonymousId = anonymousId;
      }

      const { data } = await axios.post("/api/chat/sessions", sessionData);
      setCurrentSession(data.session);

      // Fetch existing messages for this session
      await fetchMessages(data.session.id);
    } catch (error) {
      console.error("Error creating chat session:", error);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      // Use real API with authentication
      const { data } = await axios.get(`/api/chat/messages`, {
        params: {
          sessionId,
          anonymousId: isGuest ? anonymousId : undefined,
          customerId: user?.id || undefined,
        },
      });
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const { data } = await axios.get("/api/chat/faqs");
      const faqs = data.faqs || [];

      // หา greeting message
      const greetingFaq = faqs.find(
        (faq: { topic: string }) => faq.topic === "::greeting::"
      );
      if (greetingFaq) {
        setGreetingMessage(greetingFaq.reply_message);
      }

      // หา suggestion FAQs (ไม่รวม greeting และ fallback)
      const suggestions = faqs.filter(
        (faq: { topic: string }) =>
          faq.topic !== "::greeting::" && faq.topic !== "::fallback::"
      );
      setSuggestionFAQs(suggestions);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    }
  };

  // Send typing status
  const sendTypingStatus = async (typing: boolean) => {
    if (!currentSession?.id) return;

    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          isTyping: typing,
          userType: "user",
        }),
      });
    } catch (error) {
      console.error("Error sending typing status:", error);
    }
  };

  // Handle input change with typing detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Send typing status only if there's an active ticket with live chat enabled
    if (currentTicket && currentTicket.live_chat_enabled) {
      // Send typing status if there's text
      if (value.trim()) {
        sendTypingStatus(true);
      }

      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Set new timeout to stop typing
      const timeout = setTimeout(() => {
        sendTypingStatus(false);
        setTypingTimeout(null);
      }, 1000);

      setTypingTimeout(timeout);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const userMessage = overrideText || inputValue.trim();

    if (!userMessage) return;

    // Stop typing status
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    if (currentTicket && currentTicket.live_chat_enabled) {
      sendTypingStatus(false);
    }

    if (!overrideText) {
      setInputValue("");
    }

    // Optimistic UI: Show message immediately
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      session_id: currentSession?.id || "temp",
      sender_id: null,
      message: userMessage,
      is_bot: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      // Create session if it doesn't exist (first message)
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        setIsLoadingSession(true);

        const sessionData: { customerId?: string; anonymousId?: string } = {};
        if (user?.id) {
          sessionData.customerId = user.id;
        } else if (anonymousId) {
          sessionData.anonymousId = anonymousId;
        }

        const { data } = await axios.post("/api/chat/sessions", sessionData);
        sessionToUse = data.session;
        setCurrentSession(sessionToUse);
        setIsLoadingSession(false);

        // Wait for subscription to be ready after creating new session
        console.log("Waiting for Realtime subscription to be ready...");
        if (subscriptionReadyPromise.current) {
          await subscriptionReadyPromise.current;
          console.log("✅ Realtime subscription is ready");

          // Additional wait to ensure subscription is fully established
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Show bot typing indicator only if:
      // 1. No ticket exists (pure bot mode), OR
      // 2. Ticket exists but is not closed/solved AND live_chat is disabled
      const ticketIsClosed = currentTicket?.status === 'closed' || currentTicket?.status === 'solved';
      const liveChatEnabled = currentTicket?.live_chat_enabled === true;
      
      if (ticketIsClosed) {
        console.log("🤖 Ticket is closed/solved - skipping bot typing indicator");
      } else if (liveChatEnabled) {
        console.log("🤖 Live chat enabled - skipping bot typing indicator");
      } else {
        // Show typing: either no ticket or ticket with bot handling
        setIsBotTyping(true);
        console.log("🤖 Bot typing indicator shown", { 
          hasTicket: !!currentTicket,
          ticketStatus: currentTicket?.status 
        });
      }

      // Send message using the session with authentication

      const { data } = await axios.post(
        `/api/chat/messages`,
        {
          message: userMessage,
          isBot: false,
          anonymousId: isGuest ? anonymousId : undefined,
          customerId: user?.id || undefined,
        },
        {
          params: { sessionId: sessionToUse!.id },
        }
      );

      // Replace temp message with real message from database
      // Note: Realtime will also receive this message, but we replace it anyway
      // to ensure we have the correct database ID and timestamp
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === tempMessage.id ? data.message : msg
        );

        // ตรวจสอบและลบ duplicate messages
        const uniqueMessages = updated.filter((msg, index) => {
          // หาข้อความที่ซ้ำกัน
          const duplicateIndex = updated.findIndex(
            (otherMsg, otherIndex) =>
              otherIndex < index &&
              !msg.is_bot &&
              !otherMsg.is_bot &&
              msg.message === otherMsg.message &&
              Math.abs(
                new Date(msg.created_at).getTime() -
                  new Date(otherMsg.created_at).getTime()
              ) < 2000
          );

          return duplicateIndex === -1; // ไม่ซ้ำ
        });

        return uniqueMessages;
      });

      console.log("Message sent successfully:", data.message);

      // Fallback: Check for bot response after intent classification completes
      // Wait longer to account for intent classification time (4-5 seconds)
      setTimeout(async () => {
        try {
          console.log(
            "🔍 Fallback check: Looking for bot message in database..."
          );
          const { data: latestMessages } = await axios.get(
            `/api/chat/messages`,
            {
              params: {
                sessionId: sessionToUse!.id,
                anonymousId: isGuest ? anonymousId : undefined,
                customerId: user?.id || undefined,
              },
            }
          );

          console.log(
            "🔍 Fallback check: Found",
            latestMessages.messages?.length || 0,
            "total messages"
          );

          // Find the latest bot message that was created AFTER the user's last message
          const userMessages = latestMessages.messages.filter(
            (msg: ChatMessage) => !msg.is_bot
          );
          const lastUserMessage = userMessages.sort(
            (a: ChatMessage, b: ChatMessage) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0];

          const latestBotMessage = latestMessages.messages
            .filter((msg: ChatMessage) => {
              if (!msg.is_bot) return false;
              // Only consider bot messages created after the last user message
              if (lastUserMessage) {
                return (
                  new Date(msg.created_at).getTime() >
                  new Date(lastUserMessage.created_at).getTime()
                );
              }
              return true;
            })
            .sort(
              (a: ChatMessage, b: ChatMessage) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0];

          console.log(
            "🔍 Fallback check: Last user message:",
            lastUserMessage
              ? {
                  id: lastUserMessage.id,
                  message: lastUserMessage.message.substring(0, 50) + "...",
                  created_at: lastUserMessage.created_at,
                }
              : "None found"
          );

          console.log(
            "🔍 Fallback check: Latest bot message (after user message):",
            latestBotMessage
              ? {
                  id: latestBotMessage.id,
                  message: latestBotMessage.message.substring(0, 50) + "...",
                  created_at: latestBotMessage.created_at,
                }
              : "None found"
          );

          if (latestBotMessage) {
            const messageExists = messages.some(
              (msg) => msg.id === latestBotMessage.id
            );
            const alreadyDisplayed = displayedBotMessages.current.has(
              latestBotMessage.id
            );

            console.log(
              "🔍 Fallback check: Message exists in UI:",
              messageExists,
              "Already displayed:",
              alreadyDisplayed
            );

            if (!messageExists && !alreadyDisplayed) {
              console.log(
                "Fallback: Adding bot message that was missed by Realtime:",
                latestBotMessage.id
              );
              setMessages((prev) => {
                // ตรวจสอบว่าไม่มี bot message ซ้ำกัน
                const hasDuplicateBot = prev.some(
                  (msg) =>
                    msg.is_bot &&
                    msg.message === latestBotMessage.message &&
                    Math.abs(
                      new Date(msg.created_at).getTime() -
                        new Date(latestBotMessage.created_at).getTime()
                    ) < 2000
                );

                if (hasDuplicateBot) {
                  console.log(
                    "Duplicate bot message detected in fallback, skipping"
                  );
                  return prev;
                }

                return [...prev, latestBotMessage];
              });
              displayedBotMessages.current.add(latestBotMessage.id);
              setIsBotTyping(false);
              console.log(
                "🤖 Bot response received via fallback, hiding typing indicator"
              );
            } else {
              console.log(
                "Bot message already exists in UI, skipping fallback"
              );
              setIsBotTyping(false);
              console.log(
                "🤖 Bot response already exists, hiding typing indicator"
              );
            }
          } else {
            console.log(
              "🤖 No NEW bot message found after user message, keeping typing indicator"
            );
            // Don't hide typing indicator here - let safety timeout handle it
          }
        } catch (error) {
          console.error("Error in fallback message check:", error);
        }
      }, 8000); // Check after 8 seconds (account for intent classification time)
    } catch (error) {
      console.error("Error sending message:", error);

      // Remove temp message if API fails
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessage.id));

      // Hide loading state and typing indicator on error
      setIsLoadingSession(false);
      setIsBotTyping(false);
    } finally {
      // Don't hide typing indicator here - let it be hidden when bot response is received
      // setIsBotTyping(false); // Removed - let bot response hide it
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpenTicket = () => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
      return;
    }
    setShowTicketModal(true);
  };

  const handleCreateTicket = async () => {
    if (!ticketTopic.trim()) {
      return;
    }

    setIsCreatingTicket(true);
    try {
      const response = await fetch("/api/ticket/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_message: ticketTopic.trim(),
          session_id: currentSession?.id,
        }),
      });

      if (response.ok) {
        setTicketTopic("");
        setShowTicketModal(false);

        // Update current ticket state
        const ticketData = await response.json();
        setCurrentTicket(ticketData.ticket);
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Function to check ticket status
  const checkTicketStatus = async () => {
    if (!currentSession?.id) return;

    try {
      const response = await fetch(
        `/api/ticket/tickets?session_id=${currentSession.id}`
      );
      const data = await response.json();

      if (data.tickets && data.tickets.length > 0) {
        const activeTicket = data.tickets.find(
          (ticket: { status: string }) =>
            ticket.status === "open" || ticket.status === "in_progress"
        );

        if (activeTicket) {
          setCurrentTicket(activeTicket);
          console.log("🎫 Found active ticket:", activeTicket);
        } else {
          setCurrentTicket(null);
          console.log("🔓 No active ticket found");
        }
      } else {
        setCurrentTicket(null);
        console.log("🔓 No tickets found");
      }
    } catch (error) {
      console.error("❌ Error checking ticket status:", error);
    }
  };

  // Check ticket status when session changes
  useEffect(() => {
    if (currentSession?.id) {
      checkTicketStatus();
    }
  }, [currentSession?.id]);

  return (
    <>
      {/* Floating Button */}
      <Image
        src={open ? "/chatbot-close.svg" : "/chatbot.svg"}
        alt={open ? "Close chat" : "Open chat"}
        width={56}
        height={56}
        className="fixed bottom-6 right-6 w-14 h-14 cursor-pointer z-50 transition-all duration-200"
        onClick={() => {
          if (open) {
            handleClose();
          } else {
            setOpen(true);
          }
        }}
      />

      {/* Chat Widget - Fixed Positioned */}
      {open && (
        <>
          {/* Mobile Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => handleClose()}
          />

          <div
            ref={chatRef}
            className={`
              fixed z-50 flex flex-col
              bg-white shadow-xl
              transition-all duration-300
              
              /* Mobile: Dynamic height bottom sheet */
              bottom-0 left-0 right-0
              ${isExpanded ? "h-screen" : "h-[80vh]"}
              ${isExpanded ? "rounded-none" : "rounded-t-xl"}
              
              /* Desktop: Corner popup */
              md:bottom-20 md:right-6 md:left-auto
              md:w-96 md:h-[500px]
              md:rounded-xl
              
              /* Animations */
              ${
                isClosing
                  ? "animate-out slide-out-to-bottom-4 duration-200 ease-in"
                  : "animate-in slide-in-from-bottom-4 duration-300 ease-out"
              }
            `}
            style={{
              transform: isDragging ? `translateY(${dragY}px)` : "none",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag Handle (Mobile only) */}
            {!isExpanded && (
              <div className="md:hidden flex justify-center py-1">
                <div className="w-8 h-1 bg-gray-400 rounded-full" />
              </div>
            )}

            {/* Header */}
            <div
              className={`flex justify-between items-center p-4 bg-white ${
                isExpanded ? "rounded-none" : "rounded-t-xl"
              } md:rounded-t-xl`}
            >
              <div className="flex items-center gap-2">
                <Image
                  src="/chatbot.svg"
                  alt="Neatly Assistant"
                  width={36}
                  height={36}
                />
                <h2 className="font-semibold text-gray-800">
                  Neatly Assistant
                </h2>
                {/* <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowTopics(!showTopics)}
                  className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1"
                >
                  Topics
                </Button> */}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowTopics(!showTopics)}
                  className="text-gray-600 hover:text-gray-800 text-xs px-2 py-1"
                >
                  Topics
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleClearMessages()}
                  className="text-gray-600 hover:text-red-600 text-xs px-2 py-1"
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleClose()}
                  className="text-gray-500 hover:text-gray-700 h-8 w-8"
                >
                  ╳
                </Button>
              </div>
            </div>

            {/* Ticket Status Bar - Only show for active tickets (not solved/closed) */}
            {currentTicket && currentTicket.status !== 'solved' && currentTicket.status !== 'closed' && (
              <div
                className={`px-4 py-2 border-b ${
                  currentTicket.status === "open"
                    ? "bg-gray-100 border-gray-300"
                    : currentTicket.live_chat_enabled
                    ? "bg-orange-50 border-orange-100"
                    : "bg-green-50 border-green-100"
                }`}
              >
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${
                        currentTicket.status === "open"
                          ? "bg-gray-600"
                          : currentTicket.live_chat_enabled
                          ? "bg-orange-500"
                          : "bg-green-500"
                      }`}
                    ></div>
                    <span
                      className={`text-xs font-medium ${
                        currentTicket.status === "open"
                          ? "text-gray-800"
                          : currentTicket.live_chat_enabled
                          ? "text-orange-700"
                          : "text-green-700"
                      }`}
                    >
                      {currentTicket.status === "open"
                        ? "Ticket Pending"
                        : currentTicket.live_chat_enabled
                        ? "Live Chat: Bot Disabled"
                        : "Ticket Accepted"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Solved Message */}
            {isTicketSolved && (
              <div className="px-4 py-2 border-b bg-green-50 border-green-100">
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs font-medium text-green-700">
                      Ticket Solved - Thank you for your patience!
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <ScrollArea
              ref={scrollRef}
              className="bg-gray-50 shadow-[inset_0_-16px_16px_-8px_rgba(0,0,0,0.1)] h-[calc(100%-120px)] overflow-y-auto"
              onScrollCapture={handleScroll}
            >
               <div className="py-4 space-y-2">
                {/* Loading Session */}
                {isLoadingSession && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                      <span className="text-sm">Loading chat session...</span>
                    </div>
                  </div>
                )}

                 {/* Greeting message */}
                {!isLoadingSession && greetingMessage && (
                  <div className="flex flex-col items-start !px-4 !mx-0">
                     <div className="max-w-[80%] p-3 rounded-lg bg-white text-gray-800">
                       <p className="text-sm">{greetingMessage}</p>
                     </div>
                   </div>
                 )}

                 {/* Suggestion buttons */}
                {!isLoadingSession && suggestionFAQs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 !px-4 !mx-0">
                     {suggestionFAQs.map((faq) => (
                       <Button
                         key={faq.id}
                         onClick={() => sendMessage(faq.topic)}
                         variant="outline"
                         size="sm"
                         className="px-3 py-1.5 rounded-full border-2 border-green-300 bg-green-100 text-green-700 text-sm hover:bg-green-200 cursor-pointer"
                       >
                         {faq.topic}
                       </Button>
                     ))}
                   </div>
                 )}

                {/* Messages */}
                {!isLoadingSession &&
                   messages.map((message) => {
                     // Check if this is a room_type message
                     let isRoomTypeMessage = false;
                     let roomTypeData = null;
                     
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
                         <div
                     className={`flex flex-col px-4 ${
                       message.is_bot ? "items-start" : "items-end"
                     }`}
                   >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.is_bot
                            ? "bg-white text-gray-800"
                            : "bg-orange-600 text-white"
                        }`}
                      >
                        {message.is_bot ? (
                          <BotMessageRenderer 
                            message={message} 
                            onOptionClick={(option) => sendMessage(option)}
                          />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.message.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                        )}
                      </div>

                      {/* Fallback message with Ticket button - outside message box */}
                      {message.is_bot && message.message.includes("ticket") && (() => {
                        const hasActiveTicket = currentTicket && currentTicket.status !== 'solved' && currentTicket.status !== 'closed';
                        return (
                          <div className="mt-2">
                            <Button
                              onClick={hasActiveTicket ? undefined : handleOpenTicket}
                              variant="outline"
                              size="sm"
                              disabled={!!hasActiveTicket}
                              className={`px-3 py-1.5 border-2 rounded-full text-sm ${
                                hasActiveTicket
                                  ? "border-gray-300 bg-gray-50 text-gray-500 cursor-not-allowed"
                                  : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer"
                              }`}
                            >
                              {hasActiveTicket ? "Ticket Active" : "Open Ticket"}
                            </Button>
                          </div>
                        );
                      })()}

                      <p className="text-xs mt-1 text-gray-500 px-1">
                        {new Date(message.created_at).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>

                          {/* Room Type Cards - Navigation buttons layout */}
                          {isRoomTypeMessage && roomTypeData && (
                             <div className="mt-2 w-[100vw] md:w-[384px] overflow-hidden relative">
                               <div 
                                 ref={(el) => {
                                   cardScrollRefs.current[message.id] = el;
                                   if (el) {
                                     // Initial scroll state check
                                     requestAnimationFrame(() => updateScrollState(message.id));
                                     // Add throttled scroll event listener
                                     let scrollTimeout: NodeJS.Timeout;
                                     el.addEventListener('scroll', () => {
                                       if (scrollTimeout) clearTimeout(scrollTimeout);
                                       scrollTimeout = setTimeout(() => updateScrollState(message.id), 50);
                                     });
                                   }
                                 }}
                                 className="flex flex-row flex-nowrap gap-4 overflow-x-hidden pb-2 px-4 scroll-smooth"
                               >
                               {roomTypeData.rooms?.map((roomName: string, index: number) => {
                                 const roomData = roomTypeData.roomDetails?.[roomName];
                                 if (!roomData) return null;
                                 
                                  return (
                                    <div key={index} className="bg-white rounded-lg shadow-sm flex-shrink-0 flex flex-col" style={{ width: '255px', height: '317px' }}>
                                     {/* Room Image - 50% height */}
                                     {roomData.main_image && (
                                       <div className="w-full rounded-t-lg overflow-hidden flex-shrink-0" style={{ height: '50%' }}>
                                         <img 
                                           src={roomData.main_image} 
                                           alt={roomName}
                                           className="w-full h-full object-cover"
                                           loading="lazy"
                                           decoding="async"
                                         />
                                       </div>
                                     )}
                                     
                                     {/* Room Details - 37.5% height */}
                                     <div className="p-3 flex flex-col justify-between flex-shrink-0" style={{ height: '37.5%' }}>
                                       <div>
                                         {/* Room Name */}
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
                                       
                                     {/* Call to Action Button - 12.5% height */}
                                     <Button
                                       className="w-full bg-orange-100 text-orange-500 hover:bg-orange-200 text-sm font-semibold flex-shrink-0 rounded-none"
                                       style={{ height: '12.5%' }}
                                       onClick={() => {
                                         // Navigate to search result page with room type id
                                         if (roomData.id) {
                                           window.location.href = `/customer/search-result/${roomData.id}`;
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

                {/* Bot Typing Indicator - Only show when Live Chat is OFF and no active ticket */}
                {!isLoadingSession &&
                  isBotTyping &&
                  !(currentTicket && currentTicket.live_chat_enabled) &&
                  !(currentTicket && (currentTicket.status === 'closed' || currentTicket.status === 'solved')) && (
                   <div
                     key="bot-typing-indicator"
                     className="flex flex-col items-start px-4"
                   >
                      <div className="w-12 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                        <div className="flex gap-1">
                          <div
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Admin Typing Indicator - Same as Bot Typing */}
                 {adminTyping && (
                  <div
                    key="admin-typing-indicator"
                    className="flex flex-col items-start px-4"
                  >
                    <div className="w-12 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <div className="flex gap-1">
                        <div
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invisible div for auto-scroll */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Topics button suggestion buttons */}
            {!isLoadingSession && showTopics && suggestionFAQs.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  {suggestionFAQs.map((faq) => (
                    <Button
                      key={`topic-${faq.id}`}
                      onClick={() => {
                        sendMessage(faq.topic);
                        setShowTopics(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="px-3 py-1.5 rounded-full border-2 border-green-300 bg-green-100 text-green-700 text-sm hover:bg-green-200 cursor-pointer"
                    >
                      {faq.topic}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            {!isLoadingSession && (
              <div className="p-4 bg-white rounded-b-xl md:rounded-b-xl">
                <div className="flex gap-2 items-center">
                  <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Write your message"
                    className="flex-1 border-gray-200 hover:border-orange-400 focus:ring-orange-500 focus:border-orange-500 rounded-full px-4 py-2"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={!inputValue.trim()}
                    className="bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600 rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M22 2L11 13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M22 2L15 22L11 13L2 9L22 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[631px] max-w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Create Support Ticket
            </h2>
            <hr className="border-gray-300 mb-4" />
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Ticket Topic
                </label>
                <textarea
                  value={ticketTopic}
                  onChange={(e) => setTicketTopic(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="w-full p-3 border border-gray-300 hover:border-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 rounded-md h-24 resize-none outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setShowTicketModal(false);
                    setTicketTopic("");
                  }}
                  variant="outline"
                  className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  disabled={isCreatingTicket || !ticketTopic.trim()}
                  className="bg-orange-600 text-white hover:bg-orange-700 disabled:bg-gray-300 disabled:text-gray-600 cursor-pointer"
                >
                  {isCreatingTicket ? "Creating..." : "Create Ticket"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Messages Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[631px] max-w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Clear Chat History
            </h2>
            <hr className="border-gray-300 mb-4" />
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all messages in this chat? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={cancelClearMessages}
                variant="outline"
                className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmClearMessages}
                className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
              >
                Clear Messages
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
