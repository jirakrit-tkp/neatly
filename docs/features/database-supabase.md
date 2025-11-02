# Feature: Database Architecture & Supabase Integration

## 1. Overview

The application uses Supabase as its Backend-as-a-Service (BaaS) platform, providing PostgreSQL database, authentication, storage, and real-time capabilities. The database architecture is designed for scalability, data integrity, and efficient querying with proper indexing and relationships.

**Purpose:**
- Centralized data persistence for all application features
- User authentication and authorization (Supabase Auth)
- File storage for images (Supabase Storage)
- Real-time updates for chat and bookings (Supabase Realtime)
- Vector similarity search for chatbot (pgvector extension)
- Row-level security (RLS) for data protection

**Key Technologies:**
- **PostgreSQL 15+**: Relational database
- **pgvector Extension**: Vector embeddings for AI search
- **Supabase Auth**: JWT-based authentication
- **Supabase Storage**: Object storage for files
- **Supabase Realtime**: WebSocket-based live updates
- **PostgREST**: Auto-generated REST API

---

## 2. Architecture / Flow

### Database Connection Flow
```
Application Initialization
  → Load Supabase Client (src/lib/supabaseClient.ts)
    ├─ NEXT_PUBLIC_SUPABASE_URL (from .env)
    ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY (from .env)
    └─ Initialize with config:
       ├─ persistSession: true (localStorage)
       └─ autoRefreshToken: true
  → Client ready for queries
```

### Query Execution Flow
```
Application Code
  → supabase.from('table_name').select('*')
  → PostgREST API (/rest/v1/table_name)
  → PostgreSQL Query Execution
  → Row-Level Security (RLS) Check
  → Return filtered results
  → Client receives data
```

### Vector Search Flow (Chatbot)
```
User Question
  → Generate OpenAI Embedding (1536 dimensions)
  → Call Supabase RPC: match_faqs_with_aliases(embedding, threshold)
  → PostgreSQL + pgvector: Cosine similarity search
  → Return top matches (sorted by similarity)
  → Client displays matched FAQ
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| **@supabase/supabase-js** | JavaScript client | Database queries, auth, storage |
| **PostgreSQL 15+** | Relational database | Data persistence, transactions |
| **pgvector** | Vector similarity | Chatbot semantic search |
| **PostgREST** | Auto REST API | CRUD operations via HTTP |
| **Supabase Auth** | Authentication | JWT tokens, sessions |
| **Supabase Storage** | File storage | Room images, profile pictures |
| **Supabase Realtime** | Live updates | Chat messages, booking updates |

---

## 4. Core Logic

### 4.1 Supabase Client Initialization

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { 
    persistSession: true,     // Store session in localStorage
    autoRefreshToken: true    // Automatically refresh JWT
  }
});
```

### 4.2 Common Query Patterns

**Simple Select:**
```typescript
const { data, error } = await supabase
  .from('rooms')
  .select('*')
  .eq('is_active', true);
```

**Select with Relations (JOIN):**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *,
    rooms (
      id,
      room_type,
      price,
      main_image_url
    )
  `)
  .eq('customer_id', userId);
```

**Insert:**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .insert({
    room_id: roomId,
    customer_id: userId,
    check_in_date: checkIn,
    check_out_date: checkOut,
    total_amount: total
  })
  .select()
  .single();
```

**Update:**
```typescript
const { data, error } = await supabase
  .from('bookings')
  .update({ status: 'Confirmed' })
  .eq('id', bookingId)
  .select()
  .single();
```

**Delete:**
```typescript
const { error } = await supabase
  .from('rooms')
  .delete()
  .eq('id', roomId);
```

### 4.3 Vector Search (RPC Function)

```sql
-- Supabase Database Function
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
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Search FAQ topics
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (f.topic_embedding <=> query_embedding) as similarity,
    'faq'::text as source
  FROM chatbot_faqs f
  WHERE 1 - (f.topic_embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- Search aliases
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (a.embedding <=> query_embedding) as similarity,
    'alias'::text as source
  FROM chatbot_faq_aliases a
  JOIN chatbot_faqs f ON a.faq_id = f.id
  WHERE 1 - (a.embedding <=> query_embedding) > match_threshold
  
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
```

**Usage in TypeScript:**
```typescript
const { data: matches, error } = await supabase
  .rpc('match_faqs_with_aliases', {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: 5
  });
```

### 4.4 Storage Operations

**Upload Image:**
```typescript
const fileExt = file.name.split('.').pop();
const fileName = `${userId}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('profile-pictures')
  .upload(fileName, file);

// Get public URL
const { data: urlData } = supabase.storage
  .from('profile-pictures')
  .getPublicUrl(fileName);

const publicUrl = urlData.publicUrl;
```

**Delete Image:**
```typescript
const { error } = await supabase.storage
  .from('room-images')
  .remove(['deluxe_1234567890.jpg']);
```

### 4.5 Real-time Subscriptions

**Subscribe to New Messages:**
```typescript
const subscription = supabase
  .channel('chatbot_messages')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chatbot_messages',
      filter: `session_id=eq.${sessionId}`
    },
    (payload) => {
      console.log('New message:', payload.new);
      // Update UI with new message
    }
  )
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

---

## 5. Data Model / Database Schema

### Core Tables Overview

**Authentication & Users:**
- `auth.users` (Supabase managed)
- `profiles` (Custom user profiles)

**Hotel Operations:**
- `rooms` (Bookable room instances)
- `room_types` (Room templates)
- `bookings` (Reservations)
- `payments` (Payment records)
- `promo_codes` (Discount codes)

**Chatbot System:**
- `chatbot_sessions` (Chat sessions)
- `chatbot_messages` (Chat messages)
- `chatbot_faqs` (FAQ knowledge base)
- `chatbot_faq_aliases` (Alternative phrasings)
- `chatbot_contexts` (Additional context)
- `chatbot_tickets` (Live chat tickets)

### Key Relationships

```
auth.users (1) ──< profiles (1)
profiles (1) ──< bookings (*)
rooms (1) ──< bookings (*)
bookings (1) ──< payments (*)
bookings (*) ── promo_codes (*)

chatbot_sessions (1) ──< chatbot_messages (*)
chatbot_sessions (1) ──< chatbot_tickets (*)
chatbot_faqs (1) ──< chatbot_faq_aliases (*)
```

### Critical Indexes

```sql
-- Booking queries (most frequent)
CREATE INDEX idx_customer_bookings ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_room_bookings ON bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_booking_status ON bookings(status);

-- Room availability queries
CREATE INDEX idx_active_rooms ON rooms(is_active, status);

-- Vector search (IVFFlat for approximate nearest neighbor)
CREATE INDEX idx_topic_embedding ON chatbot_faqs USING ivfflat (topic_embedding vector_cosine_ops);
CREATE INDEX idx_alias_embedding ON chatbot_faq_aliases USING ivfflat (embedding vector_cosine_ops);

-- Chat message queries
CREATE INDEX idx_session_messages ON chatbot_messages(session_id, created_at);
```

### Storage Buckets

```
profile-pictures/     (Public) - User avatars
room-images/          (Public) - Room photos
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **Connection Retry**: Auto-reconnect on network failure
2. **Session Refresh**: Automatic JWT token refresh
3. **Null Handling**: Proper null checks in queries
4. **Transaction Rollback**: Error handling with try-catch
5. **Case-Insensitive Search**: Using ILIKE for text searches

### Current Limitations
1. **No Connection Pooling**: Uses default Supabase pooling (limited)
2. **No Query Caching**: No client-side caching layer
3. **No Database Migrations Tracking**: Manual schema updates
4. **Limited RLS Policies**: Some tables lack fine-grained security
5. **No Read Replicas**: Single database instance (Supabase limitation)
6. **No Sharding**: Cannot horizontally scale database
7. **Vector Index Cold Start**: First vector search may be slow
8. **No Database Backups**: Relies on Supabase automated backups

### TODO / Future Enhancements
- [ ] **Implement Connection Pooling**: Use pgBouncer for production
- [ ] **Add Query Caching**: Redis or React Query for caching
- [ ] **Database Migrations**: Implement migration tracking (Prisma/TypeORM)
- [ ] **Enhanced RLS Policies**: Fine-grained row-level security
- [ ] **Add Database Indexes**: Optimize slow queries
- [ ] **Implement Soft Deletes**: Use `deleted_at` instead of hard deletes
- [ ] **Add Audit Logging**: Track all data changes
- [ ] **Database Performance Monitoring**: Query analytics, slow query log
- [ ] **Implement Database Seeding**: Test data generation
- [ ] **Add Database Constraints**: More CHECK constraints
- [ ] **Optimize Vector Indexes**: Tune IVFFlat parameters
- [ ] **Add Full-Text Search**: PostgreSQL FTS for text searches
- [ ] **Implement Data Archival**: Move old bookings to archive tables
- [ ] **Add Database Views**: Materialized views for complex queries
- [ ] **Implement GraphQL API**: Alternative to REST (Hasura?)

### Known Issues
- **Race Conditions**: Concurrent bookings may succeed (need row locks)
- **Vector Index Accuracy**: IVFFlat trades accuracy for speed
- **Storage Cleanup**: Orphaned images not automatically deleted
- **No Transaction Support**: Multiple related inserts not atomic
- **RLS Performance**: Complex RLS policies can slow queries
- **Embedding Dimension Locked**: Cannot change from 1536 (OpenAI model)

