# Feature: AI-Powered Chatbot System (with Live Chat & Support Tickets)

## 1. Overview

The chatbot system is an intelligent, multi-layered conversational AI assistant that helps hotel guests with inquiries about rooms, promotions, policies, and services. It uses a hybrid approach combining strict matching, vector similarity search, and intent-based dynamic queries to provide accurate and contextual responses. When the bot cannot adequately help, customers can escalate to live chat with human admin support.

**Purpose:**
- Provide 24/7 automated customer support
- Answer FAQs about hotel services, policies, rooms, and promotions
- Display rich responses (text, options, room cards)
- Support both guest (anonymous) and authenticated users
- **Seamlessly escalate to live chat agents when needed**
- **Track support tickets through lifecycle (open → in_progress → resolved)**
- Track conversation history per session
- Enable real-time admin-customer chat

**Key Capabilities:**
- **Multi-format Responses**: Plain text, option lists, room type cards with images
- **Vector Search**: Semantic matching using OpenAI embeddings + Supabase pgvector
- **Intent Classification**: Dynamically queries rooms/promos based on user intent
- **Conversation Context**: Maintains chat history for contextual responses
- **Live Chat Integration**: Bot pauses when admin takes over conversation
- **Support Ticket System**: Create, assign, and resolve customer support tickets
- **Real-time Messaging**: Admin and customer chat live via Supabase Realtime
- **Session Management**: Links anonymous sessions to user accounts on login

---

## 2. Architecture / Flow

### Bot Response Flow
```
User sends message → /api/chat/bot-response
  → Step 1: Strict Match (exact topic/alias match in FAQ)
    ├─ Match found? → Return FAQ answer
    └─ No match → Step 2: Vector Search (semantic similarity)
      ├─ Match found (similarity > 0.6)? → Return matched answer
      └─ No match → Step 3: Intent Classification
        ├─ Classify intent: faq | rooms | promo_codes | other
        └─ Handle Intent:
          ├─ faq/other → Use all FAQs as context → Generate AI response
          ├─ rooms → Extract room filters → Query database → Generate response
          └─ promo_codes → Extract promo filters → Query database → Generate response
  → Save bot message to database
  → Return response (with responseData format)
```

### Session Management Flow
```
User opens chatbot → Check AuthContext
  ├─ User logged in? → Create session with customer_id
  └─ Guest? → Create session with anonymous_id
→ Load previous messages for session
→ User sends messages → Bot responds
→ (Optional) User logs in → Link session (update customer_id)
```

### Live Chat & Support Ticket Flow
```
Customer struggling with bot → Clicks "Talk to Agent" button
  → POST /api/ticket/tickets (create ticket)
    ├─ Create ticket record (status: 'open')
    ├─ Link to current chatbot_session
    └─ Admin sees new ticket notification

Admin views ticket → Clicks "Enable Live Chat"
  → PUT /api/ticket/tickets
    ├─ Set status = 'in_progress'
    ├─ Set assigned_to = admin_id
    ├─ Set live_chat_enabled = true
    └─ Update session agent_id
  
Bot Response API checks:
  ├─ If live_chat_enabled = true → Return { blocked: true }
  └─ Bot stays silent until chat disabled

Admin and customer chat directly (real-time via Supabase Realtime)
  → Customer sends message → Admin receives (WebSocket)
  → Admin replies → Customer receives (WebSocket)

Admin resolves issue → Clicks "Resolve Ticket"
  → PUT /api/ticket/tickets
    ├─ Set status = 'resolved'
    ├─ Set resolved_at = NOW()
    ├─ Set live_chat_enabled = false
    └─ Optional: Add resolution notes
  → Bot resumes normal operation
```

---

## 3. Tech Stack & Libraries

### Core AI & Language Processing

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Google Vertex AI (Gemini 2.5 Flash)** | AI response generation, intent classification | - Faster and cheaper than GPT-4<br>- Better multilingual support (Thai/English)<br>- Streaming responses<br>- Google Cloud integration | Receives text prompt → Processes with LLM → Returns structured response. Uses "Flash" variant for speed (optimized for chatbot use cases) |
| **OpenAI API (text-embedding-3-small)** | Convert text to vector embeddings | - Industry standard for embeddings<br>- 1536 dimensions (good balance of accuracy/size)<br>- Consistent semantic understanding<br>- Cost-effective at $0.02/1M tokens | Takes text input → Neural network encodes semantic meaning → Returns 1536-dimensional vector. Similar texts have similar vectors (cosine similarity) |
| **Supabase pgvector** | Vector similarity search in PostgreSQL | - Native PostgreSQL extension<br>- No separate vector DB needed<br>- SQL-compatible (easy to integrate)<br>- Supports IVFFlat index for speed | Stores vectors as native PostgreSQL type → Uses cosine distance (<=> operator) → Returns nearest neighbors. IVFFlat index enables approximate nearest neighbor (ANN) search |

### Database & Real-time

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Supabase Database** | Session/message persistence | - Built-in auth integration<br>- PostgreSQL (reliable, scalable)<br>- Auto-generated REST API<br>- Row-level security (RLS) | PostgreSQL database → PostgREST auto-generates REST API → Client queries via SDK. RLS policies enforce access control at database level |
| **Supabase Realtime** | Live message updates | - WebSocket built into Supabase<br>- No separate server needed<br>- Broadcasts PostgreSQL changes<br>- Auto-reconnection handling | Listens to PostgreSQL WAL (Write-Ahead Log) → Broadcasts INSERT/UPDATE/DELETE → WebSocket pushes to subscribed clients in real-time |
| **React Context API** | Global chatbot state management | - Built into React (no extra dependency)<br>- Suitable for simple global state<br>- No Redux boilerplate needed<br>- Easy to understand | Provider component holds state → Context.Provider wraps app → useContext() hook accesses state from anywhere. Re-renders only consuming components |

---

## 4. Core Logic

### 4.1 Response Strategy (3-Layer Approach)

#### Layer 1: Strict Matching
```typescript
// Exact match on FAQ topic or alias (case-insensitive)
normalize(userMessage) === normalize(faq.topic)
OR
normalize(userMessage) === normalize(alias.alias)

→ Return: FAQ reply_message + reply_payload
```

#### Layer 2: Vector Search
```typescript
// Semantic similarity using embeddings
1. Generate embedding for user question: createEmbedding(userMessage)
2. Call Supabase RPC: match_faqs_with_aliases(query_embedding, 0.6 threshold)
3. Returns: FAQ with highest similarity score (if > 0.6)
4. Return matched FAQ answer
```

**Vector Search SQL (Supabase Function):**
```sql
CREATE OR REPLACE FUNCTION match_faqs_with_aliases(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  topic text,
  reply_message text,
  reply_format text,
  reply_payload jsonb,
  similarity float,
  source text
)
AS $$
BEGIN
  RETURN QUERY
  -- Search FAQs
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (f.topic_embedding <=> query_embedding) as similarity,
    'faq' as source
  FROM chatbot_faqs f
  WHERE 1 - (f.topic_embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- Search aliases
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (a.embedding <=> query_embedding) as similarity,
    'alias' as source
  FROM chatbot_faq_aliases a
  JOIN chatbot_faqs f ON a.faq_id = f.id
  WHERE 1 - (a.embedding <=> query_embedding) > match_threshold
  
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

#### Layer 3: Intent-Based Dynamic Query
```typescript
// When no FAQ match found
1. Classify Intent (rooms | promo_codes | faq | other)
   → Use Gemini to classify user question
   
2. Handle Intent:
   a) rooms → extractRoomFilters() → queryRoomsWithFilters() → Generate response
   b) promo_codes → extractPromoFilters() → queryPromosWithFilters() → Generate response
   c) faq/other → Load all FAQs + contexts → Generate AI response with context
```

**Room Filter Extraction Example:**
```typescript
User: "cheap rooms with wifi"
→ extractRoomFilters() → { pricePercentile: "bottom25", amenities: ["wifi"], isActive: true }
→ Query database with filters
→ Generate natural language response
```

### 4.2 Response Formats

#### Format 1: Simple Message
```json
{
  "format": "message",
  "message": "Check-in time is 2:00 PM and check-out is 12:00 PM."
}
```

#### Format 2: Option Details (List with expandable details)
```json
{
  "format": "option_details",
  "message": "Here are our hotel facilities:",
  "options": [
    { "option": "Swimming Pool", "detail": "Olympic-size outdoor pool open 6 AM - 10 PM" },
    { "option": "Fitness Center", "detail": "24/7 gym with modern equipment" }
  ]
}
```

#### Format 3: Room Type Cards (with images)
```json
{
  "format": "room_type",
  "message": "Here are our available room types:",
  "rooms": ["Deluxe", "Suite", "Superior"],
  "buttonName": "View Details",
  "roomDetails": {
    "Deluxe": {
      "id": 1,
      "main_image": "/api/images/base64-room-image?roomName=Deluxe",
      "base_price": 5000,
      "promo_price": 4500,
      "description": "Spacious room with sea view"
    }
  }
}
```

### 4.3 Confidence Checking
```typescript
// Check if AI response is uncertain
checkResponseConfidence(response, userQuestion):
  → Score 1-10 based on:
    - Directness of answer
    - Presence of uncertainty phrases ("don't know", "cannot help")
    - "No information available" detected
  
  If confidence < 5:
    → Return [aiResponse, fallbackMessage]
    → Display both messages to user
```

### 4.4 Live Chat & Support Ticket System

When the chatbot cannot adequately help, customers can escalate to human support:

#### Ticket Creation
```typescript
// POST /api/ticket/tickets
async createTicket(sessionId: string):
  // 1. Get session details
  session = SELECT * FROM chatbot_sessions WHERE id = sessionId
  If not found → Return error
  
  // 2. Create ticket
  ticket = INSERT INTO chatbot_tickets (
    session_id: sessionId,
    status: 'open',
    live_chat_enabled: false,
    created_at: NOW()
  ) RETURNING *
  
  // 3. Optional: Send notification to admins (Email, Slack, push)
  
  Return: { success: true, ticket }
```

#### Admin Enable Live Chat
```typescript
// PUT /api/ticket/tickets
async enableLiveChat(ticketId: string, adminId: string):
  // 1. Get ticket
  ticket = SELECT * FROM chatbot_tickets WHERE id = ticketId
  If not found → Return error
  
  // 2. Update ticket
  Update chatbot_tickets SET
    status = 'in_progress',
    assigned_to = adminId,
    live_chat_enabled = true
  WHERE id = ticketId
  
  // 3. Update session
  Update chatbot_sessions SET
    agent_id = adminId
  WHERE id = ticket.session_id
  
  Return: { success: true, message: 'Live chat enabled' }
```

#### Bot Response Blocking
```typescript
// In /api/chat/bot-response.ts
async handleBotResponse(sessionId: string, userMessage: string):
  // 1. Check for active live chat
  const { data: activeTickets } = await supabase
    .from('chatbot_tickets')
    .select('id, status, live_chat_enabled')
    .eq('session_id', sessionId)
    .eq('status', 'in_progress');
  
  // 2. Block bot if live chat active
  If activeTickets.length > 0 AND activeTickets[0].live_chat_enabled:
    Return { 
      success: true, 
      blocked: true, 
      reason: 'Live chat is active',
      message: null 
    }
  
  // 3. Continue with normal bot response
  ...generate bot response...
```

#### Real-time Message Sync
**Admin Dashboard (Subscribe to Customer Messages):**
```typescript
const subscription = supabase
  .channel('admin_messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chatbot_messages',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      const newMessage = payload.new;
      if (!newMessage.is_bot && newMessage.sender_id !== adminId) {
        // Customer message
        updateMessageList(newMessage);
        playNotificationSound();
      }
    }
  )
  .subscribe();
```

**Customer Chatbot (Subscribe to Admin Messages):**
```typescript
const subscription = supabase
  .channel('customer_messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chatbot_messages',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      const newMessage = payload.new;
      if (!newMessage.is_bot && newMessage.sender_id !== customerId) {
        // Admin message
        updateMessageList(newMessage);
      }
    }
  )
  .subscribe();
```

#### Ticket Resolution
```typescript
// PUT /api/ticket/tickets (resolve)
async resolveTicket(ticketId: string, resolutionNotes?: string):
  // 1. Update ticket
  Update chatbot_tickets SET
    status = 'resolved',
    resolved_at = NOW(),
    live_chat_enabled = false,
    resolution_notes = resolutionNotes
  WHERE id = ticketId
  
  // 2. Close session (optional)
  ticket = SELECT * FROM chatbot_tickets WHERE id = ticketId
  Update chatbot_sessions SET
    status = 'closed',
    closed_at = NOW()
  WHERE id = ticket.session_id
  
  // 3. Bot resumes operation
  Return: { success: true, message: 'Ticket resolved' }
```

---

## 5. Data Model / Database Schema

### Table: `chatbot_sessions`
```sql
CREATE TABLE chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id), -- NULL for guests
  anonymous_id TEXT,                          -- For guest users
  agent_id UUID REFERENCES auth.users(id),    -- Admin agent (for live chat)
  status TEXT DEFAULT 'active',               -- 'active' | 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  -- Index for fast lookups
  INDEX idx_customer_sessions ON chatbot_sessions(customer_id),
  INDEX idx_anonymous_sessions ON chatbot_sessions(anonymous_id)
);
```

### Table: `chatbot_messages`
```sql
CREATE TABLE chatbot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatbot_sessions(id),
  message TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT false,
  sender_id UUID REFERENCES auth.users(id),  -- User/Admin ID (NULL for bot)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_session_messages ON chatbot_messages(session_id, created_at)
);
```

### Table: `chatbot_faqs`
```sql
CREATE TABLE chatbot_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,                        -- Question or topic name
  reply_message TEXT NOT NULL,                -- Bot response
  reply_format TEXT DEFAULT 'message',        -- 'message' | 'option_details' | 'room_type'
  reply_payload JSONB,                        -- Additional data (options, rooms, etc.)
  topic_embedding vector(1536),               -- OpenAI embedding for vector search
  display_order INTEGER,                      -- For admin drag-and-drop ordering
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vector similarity index (IVFFlat for fast approximate search)
  INDEX idx_topic_embedding ON chatbot_faqs USING ivfflat (topic_embedding vector_cosine_ops)
);
```

### Table: `chatbot_faq_aliases`
```sql
CREATE TABLE chatbot_faq_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faq_id UUID NOT NULL REFERENCES chatbot_faqs(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                        -- Alternative phrasing
  embedding vector(1536),                     -- Separate embedding for alias
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_alias_embedding ON chatbot_faq_aliases USING ivfflat (embedding vector_cosine_ops),
  INDEX idx_faq_aliases ON chatbot_faq_aliases(faq_id)
);
```

### Table: `chatbot_contexts`
```sql
CREATE TABLE chatbot_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,                      -- Additional context for AI
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `chatbot_tickets` (Live Chat & Support)
```sql
CREATE TABLE chatbot_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatbot_sessions(id),
  
  -- Status tracking
  status TEXT DEFAULT 'open',              -- 'open' | 'in_progress' | 'resolved'
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id), -- Admin agent assigned
  
  -- Live chat control
  live_chat_enabled BOOLEAN DEFAULT false, -- Blocks bot when true
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_ticket_status ON chatbot_tickets(status),
  INDEX idx_ticket_session ON chatbot_tickets(session_id),
  INDEX idx_assigned_tickets ON chatbot_tickets(assigned_to, status)
);
```

### Ticket Status Lifecycle
```
┌──────┐    Admin     ┌─────────────┐    Resolve    ┌──────────┐
│ Open │ ──────────> │ In Progress │ ────────────> │ Resolved │
└──────┘   Assigns    └─────────────┘               └──────────┘
                      (live_chat_enabled = true)    (live_chat_enabled = false)
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **No FAQ Match**: Falls back to intent classification + dynamic query
2. **Low Confidence Response**: Returns both AI response + fallback message
3. **Live Chat Active**: Bot pauses automatically when admin takes over
4. **Database Unavailable**: Returns hardcoded fallback message
5. **Empty Session History**: Uses greeting message for first interaction
6. **Percentile Filtering**: Handles vague terms like "cheap", "luxury", "big" rooms
7. **Guest Session Linking**: Preserves chat history when guest logs in

### Current Limitations

**Chatbot Core:**
1. **No Multi-turn Context Window**: Only uses last 3-5 messages (token limit optimization)
2. **No File Upload**: Cannot process images, documents, or attachments
3. **No Voice Input/Output**: Text-only interface
4. **English + Thai Only**: Gemini responds in user's language but primarily optimized for these two
5. **No Sentiment Analysis**: Cannot detect frustrated/angry users
6. **Fixed Response Formats**: Cannot dynamically generate new UI components

**Live Chat & Tickets:**
7. **No Typing Indicators**: Admin/customer cannot see "typing..."
8. **No Read Receipts**: No indication if message was read
9. **Single Admin Assignment**: Cannot have multiple admins on one ticket
10. **No Ticket Priority**: All tickets treated equally (no priority queue)
11. **No Auto-Assignment**: Admin must manually pick up tickets
12. **No Ticket Categories**: Cannot categorize by issue type
13. **No SLA Tracking**: No response time tracking
14. **No Canned Responses**: Admin must type all messages manually

### TODO / Future Enhancements

**Chatbot Improvements:**
- [ ] Implement multi-turn context tracking with summarization
- [ ] Add file upload support (room preference images, booking confirmations)
- [ ] Implement voice-to-text and text-to-speech
- [ ] Add sentiment analysis to detect frustrated users → auto-escalate to live chat
- [ ] Implement proactive chatbot (greet returning users, suggest promotions)
- [ ] Add typing indicator animation
- [ ] Support markdown formatting in bot responses
- [ ] Implement chat session export (download as PDF/text)
- [ ] Add chatbot analytics (most asked questions, resolution rate)
- [ ] Support for booking directly through chatbot
- [ ] Implement feedback system (thumbs up/down on responses)
- [ ] Add multi-language support (automatic translation)
- [ ] Implement chatbot A/B testing framework

**Live Chat Enhancements:**
- [ ] **Add Typing Indicators**: Show "Agent is typing..." in real-time
- [ ] **Implement Read Receipts**: Show message read status
- [ ] **Add Ticket Priority**: High, Medium, Low priority levels
- [ ] **Auto-Assignment**: Round-robin or load-based ticket assignment
- [ ] **Ticket Categories**: Bug, Question, Complaint, etc.
- [ ] **Canned Responses**: Pre-written templates for common replies
- [ ] **SLA Tracking**: Monitor first response time, resolution time
- [ ] **Ticket Tags**: Custom labels for better organization
- [ ] **Admin Notes**: Internal notes not visible to customer
- [ ] **Ticket Transfer**: Transfer ticket to another admin
- [ ] **Ticket Merge**: Combine duplicate tickets
- [ ] **Customer Satisfaction Survey**: Post-resolution feedback
- [ ] **Ticket History Export**: Download conversation as PDF/text
- [ ] **Notification System**: Email/push notifications for new messages
- [ ] **Idle Detection**: Auto-close ticket if no response for X hours
- [ ] **Queue Management**: Show ticket queue position to customer

### Known Issues

**Chatbot Issues:**
- **Token Usage**: FAQ fallback uses all FAQs as context (can be expensive for large datasets)
- **Vector Index Cold Start**: First vector search may be slow if index not warmed
- **Alias Duplication**: No validation to prevent duplicate aliases across FAQs
- **No Rate Limiting**: Users can spam messages (no throttling implemented)
- **Image Proxy Performance**: Room images fetched on-demand (no caching)

**Live Chat Issues:**
- **Race Condition**: Bot may respond before `live_chat_enabled` flag is set
- **No Conflict Resolution**: Two admins can enable live chat on same ticket
- **Realtime Lag**: Supabase Realtime may have 1-2 second delay
- **No Message Ordering**: Concurrent messages may display out of order
- **Session Reuse**: Resolved ticket's session can create new ticket (confusing history)
- **No Admin Availability**: System doesn't track online/offline admins

