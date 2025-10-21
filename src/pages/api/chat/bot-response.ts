import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { chatWithGemini, directGeminiCall, historyType } from '@/lib/chat';
import { createEmbedding } from '@/lib/embedding';

// =====================================
// Type Definitions for Intent Filters
// =====================================

// Token estimation utility
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English, 1-2 chars for Thai
  // More accurate for monitoring purposes
  const thaiChars = (text.match(/[\u0E00-\u0E7F]/g) || []).length;
  const otherChars = text.length - thaiChars;
  return Math.ceil((thaiChars * 0.7) + (otherChars * 0.25));
}

interface RoomFilters {
  priceMin?: number;
  priceMax?: number;
  guests?: number;
  roomType?: string;
  bedType?: string;
  roomSizeMin?: number;
  amenities?: string[];
  promoOnly?: boolean;
  isActive?: boolean;
}

interface PromoFilters {
  discountMin?: number;
  activeOnly?: boolean;
  hasUsageLeft?: boolean;
  codeSearch?: string;
  expiresAfter?: string; // ISO date string
}

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

  // Log request details for debugging
  console.log('🤖 Bot response API called:', {
    method: req.method,
    headers: req.headers,
    body: req.body,
    userAgent: req.headers['user-agent'],
    internalRequest: req.headers['x-internal-request']
  });

  try {
    const { sessionId, userMessage } = req.body;

    if (!sessionId || !userMessage) {
      return res.status(400).json({ error: 'Session ID and user message are required' });
    }

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('chatbot_sessions')
      .select('id, status, anonymous_id, customer_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('❌ Session not found:', { sessionId, error: sessionError });
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
      console.error('❌ Session is not active:', { sessionId, status: session.status });
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Check if there's an active ticket with in_progress status AND live chat is enabled
    const { data: activeTickets, error: ticketError } = await supabase
      .from('chatbot_tickets')
      .select('id, status, live_chat_enabled')
      .eq('session_id', sessionId)
      .eq('status', 'in_progress');

    if (!ticketError && activeTickets && activeTickets.length > 0) {
      const ticket = activeTickets[0];
      // Check if live chat is enabled
      if (ticket.live_chat_enabled) {
        console.log('🚫 Bot response blocked - live chat active:', ticket);
        return res.status(200).json({ 
          message: null,
          success: true,
          blocked: true,
          reason: 'Live chat is active'
        });
      }
    }

    // 1. Strict match: JOIN chatbot_faqs + chatbot_faq_aliases
    let botResponse = '';
    interface BotResponseData {
      format: 'message' | 'option_details' | 'room_type';
      message: string;
      options?: Array<{ option: string; detail: string }>;
      rooms?: string[];
      buttonName?: string;
      roomDetails?: { [roomName: string]: { id: number; main_image: string; base_price: number; promo_price?: number; description: string } };
    }
    
    let botResponseData: BotResponseData | null = null;

    // Helper function to fetch room details
    const fetchRoomDetails = async (roomNames: string[]) => {
      if (!roomNames || roomNames.length === 0) return {};
      
      // Filter out undefined/null values
      const validRoomNames = roomNames.filter(name => name && name !== 'undefined');
      if (validRoomNames.length === 0) return {};
      
      const { data: roomTypes, error } = await supabase
        .from('room_types')
        .select('id, name, main_image, base_price, promo_price, description')
        .in('name', validRoomNames);
      
      if (error) {
        console.error('Error fetching room details:', error);
        return {};
      }
      
      const roomDetails: { [roomName: string]: { id: number; main_image: string; base_price: number; promo_price?: number; description: string } } = {};
      roomTypes?.forEach(room => {
        roomDetails[room.name] = {
          id: room.id,
          // Use base64 API to avoid cachedEgress (uses Storage Egress instead, which has more quota available)
          main_image: `/api/images/base64-room-image?roomName=${encodeURIComponent(room.name)}&width=400&height=300&t=${Date.now()}`,
          base_price: room.base_price || 0,
          promo_price: room.promo_price,
          description: room.description || ''
        };
      });
      
      return roomDetails;
    };
    try {
      const normalize = (s: string) => s.trim().toLowerCase();
      const userQuery = normalize(userMessage);
      console.log('🔍 STRICT MATCH DEBUG:', { userQuery, originalMessage: userMessage });

      // Check FAQ questions first
      const { data: faqMatches, error: faqError } = await supabase
        .from('chatbot_faqs')
        .select('topic, reply_message, reply_format, reply_payload')
        .neq('topic', '::greeting::')
        .neq('topic', '::fallback::');

      if (!faqError && faqMatches) {
        for (const faq of faqMatches) {
          if (userQuery === normalize(faq.topic)) {
            console.log('🎯 STRICT MATCH by topic:', { 
              userQuery, 
              matchedTopic: faq.topic, 
              replyFormat: faq.reply_format 
            });
            // Set response based on format
            if (faq.reply_format === 'message') {
              botResponse = faq.reply_message;
              botResponseData = {
                format: 'message',
                message: faq.reply_message
              };
            } else if (faq.reply_format === 'option_details') {
              botResponse = faq.reply_message;
              botResponseData = {
                format: 'option_details',
                message: faq.reply_message,
                options: faq.reply_payload
              };
            } else if (faq.reply_format === 'room_type') {
              botResponse = faq.reply_message;
              const rooms = faq.reply_payload?.rooms || [];
              const roomDetails = await fetchRoomDetails(rooms);
              botResponseData = {
                format: 'room_type',
                message: faq.reply_message,
                rooms: rooms,
                buttonName: faq.reply_payload?.buttonName || 'View Details',
                roomDetails: roomDetails
              };
            }
            break;
          }
          
          // Check option_details format for option matching
          if (faq.reply_format === 'option_details' && faq.reply_payload) {
            try {
              const options = Array.isArray(faq.reply_payload) ? faq.reply_payload : JSON.parse(faq.reply_payload);
              if (Array.isArray(options)) {
                for (const option of options) {
                  if (option.option && userQuery === normalize(option.option)) {
                    botResponse = option.detail || option.option;
                    botResponseData = {
                      format: 'message',
                      message: option.detail || option.option
                    };
                    console.log('✅ STRICT MATCH found in option_details:', { option: option.option, detail: option.detail });
                    break;
                  }
                }
              }
            } catch (error) {
              console.error('Error parsing reply_payload for option_details:', error);
            }
            
            if (botResponse) break;
          }
        }
      }

      // If no FAQ match, check aliases
      if (!botResponse) {
        const { data: aliasMatches, error: aliasError } = await supabase
          .from('chatbot_faq_aliases')
          .select('alias, faq_id');

        if (!aliasError && aliasMatches) {
          for (const aliasMatch of aliasMatches) {
            if (userQuery === normalize(aliasMatch.alias)) {
              // Get FAQ answer by faq_id with full data
              const { data: faqData } = await supabase
                .from('chatbot_faqs')
                .select('topic, reply_message, reply_format, reply_payload')
                .eq('id', aliasMatch.faq_id)
                .single();

              if (faqData?.reply_message) {
                console.log('🎯 STRICT MATCH by alias:', { 
                  userQuery, 
                  matchedAlias: aliasMatch.alias,
                  matchedTopic: faqData.topic || 'Unknown',
                  replyFormat: faqData.reply_format 
                });
                // Set response based on format
                if (faqData.reply_format === 'message') {
                  botResponse = faqData.reply_message;
                  botResponseData = {
                    format: 'message',
                    message: faqData.reply_message
                  };
                } else if (faqData.reply_format === 'option_details') {
                  botResponse = faqData.reply_message;
                  botResponseData = {
                    format: 'option_details',
                    message: faqData.reply_message,
                    options: faqData.reply_payload
                  };
                } else if (faqData.reply_format === 'room_type') {
                  botResponse = faqData.reply_message;
                  const rooms = faqData.reply_payload?.rooms || [];
                  const roomDetails = await fetchRoomDetails(rooms);
                  botResponseData = {
                    format: 'room_type',
                    message: faqData.reply_message,
                    rooms: rooms,
                    buttonName: faqData.reply_payload?.buttonName || 'View Details',
                    roomDetails: roomDetails
                  };
                }
                break;
              }
            }
          }
        }
      }

      if (botResponse) {
        console.log('✅ STRICT MATCH found:', botResponse);
      } else {
        // 2. Vector search: JOIN chatbot_faqs + chatbot_faq_aliases
        try {
          const queryEmbedding = await createEmbedding(userMessage);

          const { data: matches, error: rpcError } = await supabase
            .rpc('match_faqs_with_aliases', {
              query_embedding: queryEmbedding,
              match_threshold: 0.6,
              match_count: 5
            });

          if (rpcError) {
            console.error('Vector search error:', rpcError);
          } else if (matches && matches.length > 0) {
            const bestMatch = matches[0];
            botResponse = bestMatch.reply_message;
            
            // Set response data based on format from vector match
            if (bestMatch.reply_format === 'message') {
              botResponseData = {
                format: 'message',
                message: bestMatch.reply_message
              };
            } else if (bestMatch.reply_format === 'option_details') {
              botResponseData = {
                format: 'option_details',
                message: bestMatch.reply_message,
                options: bestMatch.reply_payload
              };
            } else if (bestMatch.reply_format === 'room_type') {
              const rooms = bestMatch.reply_payload?.rooms || [];
              const roomDetails = await fetchRoomDetails(rooms);
              botResponseData = {
                format: 'room_type',
                message: bestMatch.reply_message,
                rooms: rooms,
                buttonName: bestMatch.reply_payload?.buttonName || 'View Details',
                roomDetails: roomDetails
              };
            }
            
            console.log('🔍 VECTOR MATCH found:', {
              source: bestMatch.source,
              similarity: bestMatch.similarity,
              reply_message: bestMatch.reply_message,
              format: bestMatch.reply_format
            });
          }
        } catch (err) {
          console.error('Vector RPC search failed, using fallback:', err);
          botResponse = await getFallbackContext();
          botResponseData = {
            format: 'message',
            message: botResponse
          };
          console.log('⚠️ FALLBACK MESSAGE:', botResponse);
        }
      }
    } catch (error) {
      console.error('Error during strict FAQ matching:', error);
    }

    // 3. Intent Classification + Handle Intent (if no FAQ/alias match found)
    if (!botResponse) {
      try {
        console.log('🎯 Starting intent classification...');
        
        // ดึงประวัติล่าสุดสำหรับ context
        const { data: recentMessages } = await supabase
          .from('chatbot_messages')
          .select('message, is_bot')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(10);

        // Classify Intent
        const intent = await classifyIntent(userMessage, recentMessages?.reverse() || []);
        console.log('🎯 CLASSIFIED INTENT:', intent);

        // Handle Intent
        const intentResult = await handleIntent(intent, userMessage, recentMessages?.reverse() || []);
        console.log('🎯 INTENT HANDLED:', { intent, responseType: Array.isArray(intentResult) ? 'multiple' : 'single' });
        
        // If multiple messages returned (low confidence case), handle them
        if (Array.isArray(intentResult)) {
          // Save first message (AI response)
          const { data: firstMsg, error: firstError } = await supabase
            .from('chatbot_messages')
            .insert({
              session_id: sessionId,
              message: intentResult[0],
              is_bot: true
            })
            .select()
            .single();
          
          if (firstError) {
            console.error('Error saving first message:', firstError);
          }
          
          // Save second message (fallback)
          const { data: secondMsg, error: secondError } = await supabase
            .from('chatbot_messages')
            .insert({
              session_id: sessionId,
              message: intentResult[1],
              is_bot: true
            })
            .select()
            .single();
          
          if (secondError) {
            console.error('Error saving second message:', secondError);
          }
          
          console.log('✅ Saved 2 messages (low confidence + fallback)');
          
          // Return early with both messages
          return res.status(201).json({ 
            messages: [firstMsg, secondMsg],
            success: true,
            multipleMessages: true
          });
        } else {
          botResponse = intentResult;
        }

      } catch (error) {
        console.error('Intent classification/handling failed:', error);
        // Fallback to FAQ table
        try {
          botResponse = await getFallbackContext();
        } catch (fallbackError) {
          console.error('Fallback context failed:', fallbackError);
          throw fallbackError;
        }
        console.log('⚠️ FALLBACK MESSAGE (after intent handling failed):', botResponse);
      }
    }

    // Save bot response to database with retry mechanism
    let botMessage;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Prepare message content - if we have responseData, encode it in the message
    let messageContent = botResponse;
    if (botResponseData && botResponseData.format !== 'message') {
      // For non-message formats, encode the responseData as JSON in the message
      messageContent = JSON.stringify({
        text: botResponse,
        responseData: botResponseData
      });
    }
    
    while (retryCount < maxRetries) {
      try {
        const { data, error } = await supabase
          .from('chatbot_messages')
          .insert({
            session_id: sessionId,
            message: messageContent,
            is_bot: true
          })
          .select()
          .single();

        if (error) {
          console.error(`Error saving bot message (attempt ${retryCount + 1}):`, error);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          continue;
        }

        botMessage = data;
        console.log('Bot response saved successfully:', botMessage);
        break;
        
      } catch (err) {
        console.error(`Database error (attempt ${retryCount + 1}):`, err);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          throw err;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      }
    }

    res.status(201).json({ 
      message: botMessage,
      responseData: botResponseData,
      success: true 
    });

  } catch (error) {
    console.error('❌ Error in bot response:', error);
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return a fallback response instead of 500 error
    try {
      const fallbackMessage = await getFallbackContext();

      // Save fallback message to database
      const { data: botMessage, error: saveError } = await supabase
        .from('chatbot_messages')
        .insert({
          session_id: req.body.sessionId,
          message: fallbackMessage,
          is_bot: true
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ Error saving fallback message:', saveError);
      }

      return res.status(200).json({
        message: botMessage || { message: fallbackMessage, is_bot: true },
        responseData: {
          format: 'message',
          message: fallbackMessage
        },
        success: true,
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (fallbackError) {
      console.error('❌ Fallback response failed:', fallbackError);
      // Last resort hardcoded message (only if database is completely unavailable)
      const lastResortMessage = "I'm sorry, the system is experiencing temporary issues. Please try again later.";
      return res.status(200).json({
        message: { message: lastResortMessage, is_bot: true },
        responseData: {
          format: 'message',
          message: lastResortMessage
        },
        success: true,
        fallback: true,
        error: 'Fallback response failed'
      });
    }
  }
}

// =====================================
// Parameter Extraction Functions
// =====================================

async function extractRoomFilters(userQuestion: string, conversationHistory?: historyType[]): Promise<RoomFilters> {
  // Build conversation context to understand references like "cheaper", "that one", etc.
  let contextString = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5); // Last 5 messages
    contextString = recentHistory
      .map((msg) => `${msg.is_bot ? "Bot" : "User"}: ${msg.message}`)
      .join("\n");
  }

  const prompt = `Extract room search filters from user question. Return JSON only.
${contextString ? `Conversation context:\n${contextString}\n` : ""}
Schema (all optional):
{
  "priceMin": number, "priceMax": number, "guests": number,
  "roomType": string, "bedType": string, "roomSizeMin": number,
  "amenities": string[], "promoOnly": boolean, "isActive": boolean
}

Guidelines:
- Price in THB. roomType: Deluxe, Suite, Superior, etc.
- bedType: Double bed, King bed, Twin bed, Single bed
- amenities: ["wifi", "pool", "gym", "spa", "parking"]
- Use context for "cheaper", "bigger", "more" references

Examples:
- "rooms under 5000" → {"priceMax":5000,"isActive":true}
- "4 guests with wifi" → {"guests":4,"amenities":["wifi"],"isActive":true}
- "Deluxe with king bed" → {"roomType":"Deluxe","bedType":"King bed","isActive":true}
- "rooms with pool and gym" → {"amenities":["pool","gym"],"isActive":true}
- Context: "3000 baht", Question: "cheaper than this" → {"priceMax":2500,"isActive":true}

Question: "${userQuestion}"
JSON:`;

  try {
    const response = await directGeminiCall(prompt); // ใช้ directGeminiCall แทน (ไม่มี system prompt)
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const filters: RoomFilters = JSON.parse(cleanedResponse);
    
    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof RoomFilters] === null) {
        delete filters[key as keyof RoomFilters];
      }
    });
    
    console.log('🏨 Extracted Room Filters:', filters);
    return filters;
  } catch (error) {
    console.error('Error extracting room filters:', error);
    return { isActive: true }; // Default: show only active rooms
  }
}

async function extractPromoFilters(userQuestion: string, conversationHistory?: historyType[]): Promise<PromoFilters> {
  // Build conversation context to understand references
  let contextString = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-5); // Last 5 messages
    contextString = recentHistory
      .map((msg) => `${msg.is_bot ? "Bot" : "User"}: ${msg.message}`)
      .join("\n");
  }

  const prompt = `Extract promo code filters from user question. Return JSON only.
${contextString ? `Conversation context:\n${contextString}\n` : ""}
Schema (all optional):
{
  "discountMin": number, "activeOnly": boolean, "hasUsageLeft": boolean,
  "codeSearch": string, "expiresAfter": string
}

Guidelines:
- discountMin: minimum discount percentage (10 = 10%)
- activeOnly: default true (only active promos)
- hasUsageLeft: default true (only usable promos)
- codeSearch: search by code name

Examples:
- "any promotions?" → {"activeOnly":true,"hasUsageLeft":true}
- "discount over 20%" → {"discountMin":20,"activeOnly":true}
- "code SUMMER" → {"codeSearch":"SUMMER","activeOnly":true}
- "active promo codes" → {"activeOnly":true,"hasUsageLeft":true}
- Context: "15% discount", Question: "more than this?" → {"discountMin":20,"activeOnly":true}

Question: "${userQuestion}"
JSON:`;

  try {
    const response = await directGeminiCall(prompt); // ใช้ directGeminiCall แทน (ไม่มี system prompt)
    const cleanedResponse = response.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const filters: PromoFilters = JSON.parse(cleanedResponse);
    
    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof PromoFilters] === null) {
        delete filters[key as keyof PromoFilters];
      }
    });
    
    console.log('🎟️ Extracted Promo Filters:', filters);
    return filters;
  } catch (error) {
    console.error('Error extracting promo filters:', error);
    return { activeOnly: true, hasUsageLeft: true }; // Default: show only active, usable promos
  }
}

// =====================================
// Query Builder Functions with Pre-defined Operations
// =====================================

async function queryRoomsWithFilters(filters: RoomFilters) {
  console.log('🏨 Querying rooms with filters:', filters);
  
  let query = supabase
    .from('rooms')
    .select('id, room_type, room_type_id, description, price, promotion_price, currency, guests, room_size, bed_type, amenities, main_image_url, gallery_images, is_active, status');
  
  // Pre-defined safe operations
  if (filters.priceMin !== undefined) {
    query = query.gte('price', filters.priceMin);
  }
  
  if (filters.priceMax !== undefined) {
    query = query.lte('price', filters.priceMax);
  }
  
  if (filters.guests !== undefined) {
    query = query.gte('guests', filters.guests);
  }
  
  if (filters.roomType !== undefined) {
    query = query.ilike('room_type', `%${filters.roomType}%`);
  }
  
  if (filters.bedType !== undefined) {
    query = query.ilike('bed_type', `%${filters.bedType}%`);
  }
  
  if (filters.roomSizeMin !== undefined) {
    query = query.gte('room_size', filters.roomSizeMin);
  }
  
  if (filters.amenities && filters.amenities.length > 0) {
    // Check if amenities array contains all requested amenities
    query = query.contains('amenities', filters.amenities);
  }
  
  if (filters.promoOnly === true) {
    query = query.not('promotion_price', 'is', null);
  }
  
  if (filters.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error querying rooms:', error);
    throw error;
  }
  
  console.log('🏨 Found rooms:', data?.length || 0);
  return data;
}

async function queryPromosWithFilters(filters: PromoFilters) {
  console.log('🎟️ Querying promos with filters:', filters);
  
  let query = supabase
    .from('promo_codes')
    .select('id, code, description, discount_percent, discount_amount, is_active, expires_at, max_uses, used_count');
  
  // Pre-defined safe operations
  if (filters.activeOnly === true) {
    query = query.eq('is_active', true);
    query = query.gt('expires_at', new Date().toISOString());
  }
  
  // Note: hasUsageLeft will be filtered client-side after query (PostgREST doesn't support column-to-column comparison)
  
  if (filters.discountMin !== undefined) {
    // Match if discount_percent OR discount_amount >= discountMin
    query = query.or(`discount_percent.gte.${filters.discountMin},discount_amount.gte.${filters.discountMin}`);
  }
  
  if (filters.codeSearch !== undefined) {
    query = query.ilike('code', `%${filters.codeSearch}%`);
  }
  
  if (filters.expiresAfter !== undefined) {
    query = query.gt('expires_at', filters.expiresAfter);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error querying promos:', error);
    throw error;
  }
  
  // Client-side filter for hasUsageLeft (only promos where used_count < max_uses or max_uses is 0 meaning unlimited)
  let filteredData = data;
  if (filters.hasUsageLeft === true && data) {
    filteredData = data.filter(promo => 
      promo.max_uses === 0 || promo.used_count < promo.max_uses
    );
  }
  
  console.log('🎟️ Found promos:', filteredData?.length || 0);
  return filteredData;
}

// =====================================
// Intent Classification & Handling
// =====================================

// Intent Classification Function
async function classifyIntent(userQuestion: string, conversationHistory: historyType[]): Promise<string> {
  console.log("🎯 INTENT CLASSIFICATION for:", userQuestion);

  // Build conversation context
  let contextString = "";
  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-3); // Last 3 messages
    contextString = recentHistory
      .map(
        (msg: { message: string; is_bot: boolean }) =>
          `${msg.is_bot ? "Bot" : "User"}: ${msg.message}`
      )
      .join("\n");
  }

  const intentPrompt = `Classify hotel chatbot question into: faq, rooms, promo_codes, or other

Categories:
- rooms: room availability, types, prices, features, booking
- promo_codes: promotions, discounts, codes, deals
- faq: policies, services, facilities, check-in/out, cancellation
- other: greetings, thanks, unclear

Keywords:
- rooms: ห้อง, room, ราคา, price, ว่าง, available, จอง, book
- promo_codes: โปรโมชั่น, promo, ส่วนลด, discount, โค้ด, code
- faq: เช็คอิน, check-in, นโยบาย, policy, ยกเลิก, cancel

Examples:
- "any Deluxe rooms available?" → rooms
- "rooms around 5000" → rooms
- "room for 4 people" → rooms
- "any promotions?" → promo_codes
- "discount codes available?" → promo_codes
- "what time is check-in?" → faq
- "cancellation policy?" → faq
- "hello" → other
- "thank you" → other

${contextString ? `Context:\n${contextString}\n` : ""}
Question: "${userQuestion}"

Answer: (faq/rooms/promo_codes/other only)`;

  // Token monitoring
  const estimatedTokens = estimateTokens(intentPrompt);
  console.log("📊 Intent Classification Tokens:", {
    estimatedInputTokens: estimatedTokens,
    promptLength: intentPrompt.length
  });

  const intentResponse = await directGeminiCall(intentPrompt); // ใช้ directGeminiCall แทน (ไม่มี system prompt)
  const intent = intentResponse.trim().toLowerCase();

  // Validate intent
  const validIntents = ["faq", "rooms", "promo_codes", "other"];
  const classifiedIntent = validIntents.includes(intent) ? intent : "other";

  console.log("🎯 CLASSIFIED INTENT:", classifiedIntent);
  return classifiedIntent;
}

// Handle Intent Function
async function handleIntent(intent: string, userQuestion: string, conversationHistory: historyType[]): Promise<string | string[]> {
  console.log("🎯 HANDLING INTENT:", { intent, userQuestion });

  let botResponse: string | string[];

  switch (intent) {
    case "faq":
    case "other":
      botResponse = await handleFAQIntent(userQuestion, conversationHistory);
      break;

    case "rooms":
      botResponse = await handleRoomsIntent(userQuestion, conversationHistory);
      break;

    case "promo_codes":
      botResponse = await handlePromoCodesIntent(userQuestion, conversationHistory);
      break;

    default:
      botResponse = await handleFAQIntent(userQuestion, conversationHistory);
      break;
  }

  console.log("🎯 INTENT HANDLED:", {
    intent,
    isMultiple: Array.isArray(botResponse),
  });

  return botResponse;
}

// FAQ Intent Handler
async function handleFAQIntent(userQuestion: string, conversationHistory?: historyType[]): Promise<string | string[]> {
  try {
    console.log("📚 FAQ FALLBACK - Getting all FAQ and context data...");

    // ดึง FAQ ทั้งหมดเป็น context (รวม reply_payload แต่ไม่รวม reply_format และไม่เอา room_type)
    const { data: allFAQs, error: faqError } = await supabase
      .from("chatbot_faqs")
      .select("topic, reply_message, reply_payload")
      .neq("topic", "::greeting::")
      .neq("topic", "::fallback::")
      .neq("reply_format", "room_type");

    if (faqError) {
      console.error("Error fetching FAQs for context:", faqError);
      throw faqError;
    }

    // ดึง contexts เพิ่มเติม
    const { data: contexts, error: contextError } = await supabase
      .from("chatbot_contexts")
      .select("content")
      .order("created_at", { ascending: true });

    if (contextError) {
      console.error("Error fetching contexts:", contextError);
      // ไม่ throw error เพราะ contexts เป็น optional
    }

    // สร้าง context string จาก FAQ ทั้งหมด (รวม payload ถ้ามี)
    const faqContext =
      allFAQs
        ?.map((faq) => {
          let faqText = `Q: ${faq.topic}\nA: ${faq.reply_message}`;
          
          // เพิ่ม payload ถ้ามี (สำหรับ option_details หรือข้อมูลเพิ่มเติม)
          if (faq.reply_payload) {
            try {
              const payload = typeof faq.reply_payload === 'string' 
                ? JSON.parse(faq.reply_payload) 
                : faq.reply_payload;
              
              // ถ้าเป็น option_details (array of {option, detail})
              if (Array.isArray(payload)) {
                const options = payload
                  .map((item: { option: string; detail: string }) => 
                    `  - ${item.option}: ${item.detail}`
                  )
                  .join('\n');
                faqText += `\nOptions:\n${options}`;
              }
            } catch (error) {
              console.error('Error parsing reply_payload:', error);
            }
          }
          
          return faqText;
        })
        .join("\n\n") || "";

    // สร้าง context string จาก contexts
    const additionalContext =
      contexts?.map((ctx) => ctx.content).join("\n") || "";

    const faqPrompt = `Answer user question based on FAQ database.

FAQ Database:
${faqContext}

${additionalContext ? `Additional Information:\n${additionalContext}\n` : ""}
User Question: "${userQuestion}"

Use FAQ database to answer accurately. If no match, ask for clarification.`;

    // Token monitoring
    const estimatedTokens = estimateTokens(faqPrompt);
    console.log("📊 FAQ Intent Tokens:", {
      estimatedInputTokens: estimatedTokens,
      faqCount: allFAQs?.length || 0,
      contextCount: contexts?.length || 0,
      promptLength: faqPrompt.length,
      warning: estimatedTokens > 2000 ? "⚠️ HIGH TOKEN USAGE!" : null
    });

    const response = await chatWithGemini(faqPrompt, conversationHistory);

    // ตรวจสอบความมั่นใจของคำตอบ (รวมการตรวจสอบ "no info" ด้วย)
    const confidence = await checkResponseConfidence(response, userQuestion);
    if (confidence < 5) {
      console.log("🤖 FAQ response needs fallback (low confidence or no info)", {
        confidence,
        responsePreview: response.substring(0, 200) + (response.length > 200 ? "..." : "")
      });
      // ส่งทั้ง AI response + fallback message แยกกัน
      const fallbackMsg = await getFallbackContext();
      return [response, fallbackMsg];
    }

    return response;
  } catch (error) {
    console.error("FAQ fallback failed:", error);
    // Fallback to context table
    return await getFallbackContext();
  }
}

// Rooms Intent Handler
async function handleRoomsIntent(userQuestion: string, conversationHistory?: historyType[]): Promise<string | string[]> {
  try {
    console.log("🏨 ROOMS INTENT - Extracting filters...");

    // Step 1: Extract parameters from user question (LLM as interpreter with conversation context)
    const filters = await extractRoomFilters(userQuestion, conversationHistory);

    // Step 2: Query with pre-defined safe operations
    const rooms = await queryRoomsWithFilters(filters);

    console.log("🏨 Query result:", rooms?.length || 0, "rooms");

    // Step 3: Generate natural language response from results (or no results)
    const responsePrompt = rooms && rooms.length > 0
      ? `User asked: "${userQuestion}"

Found ${rooms.length} available room(s):
${JSON.stringify(rooms, null, 2)}

Summarize these rooms for the user:
- Highlight: price, room_type, guests, bed_type, room_size, amenities
- Mention promotion_price if available
- Help user choose the right room`
      : `User asked: "${userQuestion}"

Search result: No rooms found matching the criteria.

Inform the user politely that no rooms match their requirements and suggest:
- Try adjusting search criteria
- Contact staff for more options`;

    // Token monitoring (ไม่นับ history เพราะ chat.ts จะใส่ให้)
    const estimatedTokens = estimateTokens(responsePrompt);
    console.log("📊 Rooms Intent Tokens:", {
      estimatedInputTokens: estimatedTokens,
      roomsFound: rooms.length,
      filtersApplied: JSON.stringify(filters),
      promptLength: responsePrompt.length
    });

    // ส่ง conversationHistory ให้ chatWithGemini จัดการ (ไม่ซ้ำ!)
    const response = await chatWithGemini(responsePrompt, conversationHistory);

    // ตรวจสอบความมั่นใจของคำตอบ (รวมการตรวจสอบ "no info" ด้วย)
    const confidence = await checkResponseConfidence(response, userQuestion);
    
    if (confidence < 5) {
      console.log("🤖 Rooms response needs fallback (low confidence or no info)", {
        confidence,
        responsePreview: response.substring(0, 200) + (response.length > 200 ? "..." : "")
      });
      // ส่งทั้ง AI response + fallback message แยกกัน
      const fallbackMsg = await getFallbackContext();
      return [response, fallbackMsg];
    }

    return response;
  } catch (error) {
    console.error("Rooms intent failed:", error);
    return await getFallbackContext();
  }
}

// Promo Codes Intent Handler
async function handlePromoCodesIntent(userQuestion: string, conversationHistory?: historyType[]): Promise<string | string[]> {
  try {
    console.log("🎟️ PROMO CODES INTENT - Extracting filters...");

    // Step 1: Extract parameters from user question (LLM as interpreter with conversation context)
    const filters = await extractPromoFilters(userQuestion, conversationHistory);

    // Step 2: Query with pre-defined safe operations
    const promos = await queryPromosWithFilters(filters);

    console.log("🎟️ Query result:", promos?.length || 0, "promo codes");

    // Step 3: Generate natural language response from results (or no results)
    const responsePrompt = promos && promos.length > 0
      ? `User asked: "${userQuestion}"

Found ${promos.length} promo code(s):
${JSON.stringify(promos, null, 2)}

Explain these promo codes to the user:
- List codes clearly and make them easy to copy
- Explain discount_percent or discount_amount
- Mention expires_at if relevant
- Mention usage limits (max_uses, used_count) if relevant`
      : `User asked: "${userQuestion}"

Search result: No promo codes found matching the criteria.

Inform the user politely that no promotions match their requirements and suggest:
- Check back later for new promotions
- Contact staff for current offers`;

    // Token monitoring (ไม่นับ history เพราะ chat.ts จะใส่ให้)
    const estimatedTokens = estimateTokens(responsePrompt);
    console.log("📊 Promo Intent Tokens:", {
      estimatedInputTokens: estimatedTokens,
      promosFound: promos.length,
      filtersApplied: JSON.stringify(filters),
      promptLength: responsePrompt.length
    });

    // ส่ง conversationHistory ให้ chatWithGemini จัดการ (ไม่ซ้ำ!)
    const response = await chatWithGemini(responsePrompt, conversationHistory);

    // ตรวจสอบความมั่นใจของคำตอบ (รวมการตรวจสอบ "no info" ด้วย)
    const confidence = await checkResponseConfidence(response, userQuestion);
    
    if (confidence < 5) {
      console.log("🤖 Promo codes response needs fallback (low confidence or no info)", {
        confidence,
        responsePreview: response.substring(0, 200) + (response.length > 200 ? "..." : "")
      });
      // ส่งทั้ง AI response + fallback message แยกกัน
      const fallbackMsg = await getFallbackContext();
      return [response, fallbackMsg];
    }

    return response;
  } catch (error) {
    console.error("Promo codes intent failed:", error);
    return await getFallbackContext();
  }
}

// Helper function to check response confidence
async function checkResponseConfidence(response: string, userQuestion: string): Promise<number> {
  try {
    const confidencePrompt = `
Rate the confidence of this response (1-10):
Response: "${response}"
Question: "${userQuestion}"

Consider:
- Does the response directly answer the question?
- Is the response specific and informative?
- Does the response indicate uncertainty or lack of knowledge?
- Does the response say "cannot help", "don't know", or show uncertainty?
- IMPORTANT: If the response says "no information", "don't have data", "not found", "not available" → score 1-4 (low confidence)

Scoring:
- 8-10: Direct, specific, confident answer with data
- 5-7: Somewhat helpful but vague or generic
- 1-4: Uncertain, unhelpful, says cannot help, OR no information/data available

Answer only with a number from 1-10.`;

    const confidenceText = await directGeminiCall(confidencePrompt);
    const confidence = parseInt(confidenceText.trim());

    // Validate confidence score
    if (isNaN(confidence) || confidence < 1 || confidence > 10) {
      console.log("🤖 Invalid confidence score, defaulting to 4");
      console.log("🤖 Response being checked:", response.substring(0, 200) + (response.length > 200 ? "..." : ""));
      return 4; // Default to low-medium to trigger fallback
    }

    console.log("🤖 Response confidence:", {
      score: confidence,
      question: userQuestion,
      response: response.substring(0, 200) + (response.length > 200 ? "..." : ""),
      responseLength: response.length
    });
    return confidence;
  } catch (error) {
    console.error("Error checking response confidence:", error);
    return 4; // Default to low-medium to trigger fallback
  }
}

// Helper function to get fallback context (จาก chatbot_faqs table)
async function getFallbackContext(): Promise<string> {
  try {
    const { data: fallbackContext, error } = await supabase
      .from("chatbot_faqs")
      .select("reply_message")
      .eq("topic", "::fallback::")
      .single();

    if (!error && fallbackContext) {
      return fallbackContext.reply_message;
    }

    // No fallback message found in database
    throw new Error("No fallback message found in database");
  } catch (error) {
    console.error("Error getting fallback context:", error);
    throw error;
  }
}