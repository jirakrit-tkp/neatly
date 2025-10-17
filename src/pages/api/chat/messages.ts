import type { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";

// Helper function to verify session access
async function verifySessionAccess(
  sessionId: string,
  anonymousId?: string,
  customerId?: string
) {
  // Get session details
  const { data: session, error } = await supabase
    .from("chatbot_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    console.error("❌ Session not found:", { sessionId, error });
    throw new Error("Session not found");
  }

  // Check if session is active
  if (session.status !== 'active') {
    console.error("❌ Session is not active:", { sessionId, status: session.status });
    throw new Error("Session is not active");
  }

  // Check access permissions
  if (session.customer_id) {
    // Session belongs to a user
    if (customerId && session.customer_id === customerId) {
      return true; // User owns this session
    }
    console.error("❌ Access denied: Session belongs to another user", {
      sessionCustomerId: session.customer_id,
      providedCustomerId: customerId,
    });
    throw new Error("Access denied: Session belongs to another user");
  } else if (session.anonymous_id) {
    // Session belongs to a guest
    if (anonymousId && session.anonymous_id === anonymousId) {
      return true; // Guest owns this session
    }
    console.error("❌ Access denied: Session belongs to another guest", {
      sessionAnonymousId: session.anonymous_id,
      providedAnonymousId: anonymousId,
    });
    throw new Error("Access denied: Session belongs to another guest");
  }

  console.error("❌ Invalid session state:", session);
  throw new Error("Invalid session state");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sessionId, anonymousId, customerId } = req.query;

  if (req.method === "GET") {
    try {
      // Check if sessionId exists
      if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
      }

      // Verify session access
      await verifySessionAccess(
        sessionId as string,
        anonymousId as string,
        customerId as string
      );

      // Fetch messages for session
      const { data: messages, error } = await supabase
        .from("chatbot_messages")
        .select("*")
        .eq("session_id", sessionId as string)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      res.status(200).json({ messages: messages || [] });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch messages", details: error });
    }
  } else if (req.method === "POST") {
    try {
      const {
        message,
        isBot,
        anonymousId: bodyAnonymousId,
        customerId: bodyCustomerId,
      } = req.body;

      // Validate required fields
      if (!sessionId || !message) {
        return res
          .status(400)
          .json({ error: "Session ID and message are required" });
      }

      // Use body parameters for POST, query parameters for GET
      const authAnonymousId = bodyAnonymousId || anonymousId;
      const authCustomerId = bodyCustomerId || customerId;

      // Verify session access
      await verifySessionAccess(
        sessionId as string,
        authAnonymousId as string,
        authCustomerId as string
      );

      console.log("Saving message:", { sessionId, message, isBot });

      // Get session details to determine sender_id
      const { data: sessionData } = await supabase
        .from("chatbot_sessions")
        .select("customer_id")
        .eq("id", sessionId as string)
        .single();

      // Save user message with sender_id for authenticated users
      const messageData: {
        session_id: string | string[];
        sender_id?: string;
        customer_id?: string;
        message: string;
        is_bot: boolean;
      } = {
        session_id: sessionId,
        message,
        is_bot: isBot || false,
      };

      // Only add sender_id for authenticated users (not anonymous)
      if (sessionData?.customer_id && !isBot) {
        messageData.sender_id = sessionData.customer_id;
      }

      const { data: newMessage, error: messageError } = await supabase
        .from("chatbot_messages")
        .insert(messageData)
        .select()
        .single();

      console.log("Supabase message result:", { newMessage, messageError });

      if (messageError) {
        console.error("Supabase message error:", messageError);
        throw messageError;
      }

      // If this is a user message (not bot), trigger bot response
      if (!isBot) {
        console.log("Triggering bot response for user message:", message);

        try {
          // Get conversation history for context
          const { data: messagesData } = await supabase
            .from("chatbot_messages")
            .select("*")
            .eq("session_id", sessionId as string)
            .order("created_at", { ascending: true });

          // Call bot response API asynchronously (fire-and-forget)
          // The typing indicator will be hidden when the bot message arrives via Realtime
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
          const botResponseUrl = `${baseUrl}/api/chat/bot-response`;

          fetch(botResponseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Neatly-Internal-API",
              "X-Internal-Request": "true",
            },
            body: JSON.stringify({
              sessionId: sessionId as string,
              userMessage: message,
              conversationHistory: messagesData || [],
            }),
          })
            .then((response) => {
              console.log("Bot response API call status:", response.status);
              if (!response.ok) {
                console.error(`Bot response API returned ${response.status}: ${response.statusText}`);
                // Don't throw error, just log it - the bot will handle fallback internally
                return null;
              }
              return response.json();
            })
            .then((data) => {
              if (data) {
                console.log("Bot response generated successfully:", data);
                // Note: Typing indicator will be hidden when bot message arrives via Realtime
              }
            })
            .catch((error) => {
              console.error("Error calling bot response API:", error);
              console.error("Bot response URL:", botResponseUrl);
              console.error("Request body:", {
                sessionId: sessionId as string,
                userMessage: message,
              });
              // Note: Typing indicator will be hidden by safety timeout or fallback check
            });
        } catch (error) {
          console.error("Error triggering bot response:", error);
        }
      }

      // Return only the user message
      res.status(201).json({ message: newMessage });
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({
        error: "Failed to save message",
        details: error,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
