# ฟีเจอร์: สถาปัตยกรรมฐานข้อมูลและการรวมระบบ Supabase

## 1. ภาพรวม

แอปพลิเคชันใช้ Supabase เป็นแพลตฟอร์ม Backend-as-a-Service (BaaS) จัดเตรียมฐานข้อมูล PostgreSQL การยืนยันตัวตน การจัดเก็บข้อมูล และความสามารถแบบเรียลไทม์ สถาปัตยกรรมฐานข้อมูลออกแบบมาเพื่อความสามารถในการขยาย ความสมบูรณ์ของข้อมูล และการ query ที่มีประสิทธิภาพด้วยการ index และความสัมพันธ์ที่เหมาะสม

**วัตถุประสงค์:**
- การเก็บข้อมูลแบบรวมศูนย์สำหรับฟีเจอร์แอปพลิเคชันทั้งหมด
- การยืนยันตัวตนและการอนุญาตผู้ใช้ (Supabase Auth)
- การจัดเก็บไฟล์สำหรับรูปภาพ (Supabase Storage)
- การอัปเดตแบบเรียลไทม์สำหรับแชทและการจอง (Supabase Realtime)
- การค้นหาความคล้ายคลึงของ Vector สำหรับแชทบอท (pgvector extension)
- Row-level security (RLS) สำหรับการป้องกันข้อมูล

**เทคโนโลยีหลัก:**
- **PostgreSQL 15+**: ฐานข้อมูลเชิงสัมพันธ์
- **pgvector Extension**: Vector embeddings สำหรับการค้นหา AI
- **Supabase Auth**: การยืนยันตัวตนด้วย JWT
- **Supabase Storage**: การจัดเก็บ Object สำหรับไฟล์
- **Supabase Realtime**: การอัปเดตสดด้วย WebSocket
- **PostgREST**: REST API ที่สร้างอัตโนมัติ

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการเชื่อมต่อฐานข้อมูล
```
การเริ่มต้นแอปพลิเคชัน
  → โหลด Supabase Client (src/lib/supabaseClient.ts)
    ├─ NEXT_PUBLIC_SUPABASE_URL (จาก .env)
    ├─ NEXT_PUBLIC_SUPABASE_ANON_KEY (จาก .env)
    └─ เริ่มต้นด้วย config:
       ├─ persistSession: true (localStorage)
       └─ autoRefreshToken: true
  → Client พร้อมสำหรับการ query
```

### ลำดับการทำงานของ Query
```
โค้ดแอปพลิเคชัน
  → supabase.from('table_name').select('*')
  → PostgREST API (/rest/v1/table_name)
  → การทำงาน PostgreSQL Query
  → การตรวจสอบ Row-Level Security (RLS)
  → ส่งคืนผลลัพธ์ที่กรอง
  → Client รับข้อมูล
```

### ลำดับการค้นหา Vector (แชทบอท)
```
คำถามผู้ใช้
  → สร้าง OpenAI Embedding (1536 dimensions)
  → เรียก Supabase RPC: match_faqs_with_aliases(embedding, threshold)
  → PostgreSQL + pgvector: การค้นหา Cosine similarity
  → ส่งคืนการจับคู่ด้านบน (เรียงตาม similarity)
  → Client แสดง FAQ ที่ตรงกัน
```

---

## 3. เทคโนโลยีและไลบรารี

| ไลบรารี/API | วัตถุประสงค์ | ตัวอย่างการใช้งาน |
|------------|---------|---------------|
| **@supabase/supabase-js** | JavaScript client | การ query ฐานข้อมูล, auth, storage |
| **PostgreSQL 15+** | ฐานข้อมูลเชิงสัมพันธ์ | การเก็บข้อมูล, transactions |
| **pgvector** | ความคล้ายคลึงของ Vector | การค้นหาความหมายของแชทบอท |
| **PostgREST** | Auto REST API | การดำเนินการ CRUD ผ่าน HTTP |
| **Supabase Auth** | การยืนยันตัวตน | JWT tokens, sessions |
| **Supabase Storage** | การจัดเก็บไฟล์ | รูปห้อง, รูปโปรไฟล์ |
| **Supabase Realtime** | การอัปเดตสด | ข้อความแชท, การอัปเดตการจอง |

---

## 4. ตรรกะหลัก

### 4.1 การเริ่มต้น Supabase Client

```typescript
// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { 
    persistSession: true,     // เก็บ session ใน localStorage
    autoRefreshToken: true    // รีเฟรช JWT อัตโนมัติ
  }
});
```

### 4.2 รูปแบบ Query ทั่วไป

**Select แบบง่าย:**
```typescript
const { data, error } = await supabase
  .from('rooms')
  .select('*')
  .eq('is_active', true);
```

**Select พร้อมความสัมพันธ์ (JOIN):**
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
  -- ค้นหาหัวข้อ FAQ
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (f.topic_embedding <=> query_embedding) as similarity,
    'faq'::text as source
  FROM chatbot_faqs f
  WHERE 1 - (f.topic_embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- ค้นหาคำพ้องความหมาย
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

**การใช้งานใน TypeScript:**
```typescript
const { data: matches, error } = await supabase
  .rpc('match_faqs_with_aliases', {
    query_embedding: embedding,
    match_threshold: 0.6,
    match_count: 5
  });
```

### 4.4 การดำเนินการ Storage

**อัปโหลดรูปภาพ:**
```typescript
const fileExt = file.name.split('.').pop();
const fileName = `${userId}.${fileExt}`;

const { data, error } = await supabase.storage
  .from('profile-pictures')
  .upload(fileName, file);

// รับ public URL
const { data: urlData } = supabase.storage
  .from('profile-pictures')
  .getPublicUrl(fileName);

const publicUrl = urlData.publicUrl;
```

**ลบรูปภาพ:**
```typescript
const { error } = await supabase.storage
  .from('room-images')
  .remove(['deluxe_1234567890.jpg']);
```

### 4.5 Realtime Subscriptions

**สมัครรับข้อความใหม่:**
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
      console.log('ข้อความใหม่:', payload.new);
      // อัปเดต UI ด้วยข้อความใหม่
    }
  )
  .subscribe();

// ล้างข้อมูล
subscription.unsubscribe();
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ภาพรวมตารางหลัก

**การยืนยันตัวตนและผู้ใช้:**
- `auth.users` (จัดการโดย Supabase)
- `profiles` (โปรไฟล์ผู้ใช้แบบกำหนดเอง)

**การดำเนินงานโรงแรม:**
- `rooms` (ห้องพักที่จองได้)
- `room_types` (เทมเพลตห้องพัก)
- `bookings` (การจอง)
- `payments` (บันทึกการชำระเงิน)
- `promo_codes` (โค้ดส่วนลด)

**ระบบแชทบอท:**
- `chatbot_sessions` (เซสชันแชท)
- `chatbot_messages` (ข้อความแชท)
- `chatbot_faqs` (ฐานความรู้ FAQ)
- `chatbot_faq_aliases` (การใช้คำพ้องความหมาย)
- `chatbot_contexts` (บริบทเพิ่มเติม)
- `chatbot_tickets` (ตั๋วแชทสด)

### ความสัมพันธ์หลัก

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

### Indexes สำคัญ

```sql
-- Booking queries (บ่อยที่สุด)
CREATE INDEX idx_customer_bookings ON bookings(customer_id, created_at DESC);
CREATE INDEX idx_room_bookings ON bookings(room_id, check_in_date, check_out_date);
CREATE INDEX idx_booking_status ON bookings(status);

-- Room availability queries
CREATE INDEX idx_active_rooms ON rooms(is_active, status);

-- Vector search (IVFFlat สำหรับ approximate nearest neighbor)
CREATE INDEX idx_topic_embedding ON chatbot_faqs USING ivfflat (topic_embedding vector_cosine_ops);
CREATE INDEX idx_alias_embedding ON chatbot_faq_aliases USING ivfflat (embedding vector_cosine_ops);

-- Chat message queries
CREATE INDEX idx_session_messages ON chatbot_messages(session_id, created_at);
```

### Storage Buckets

```
profile-pictures/     (Public) - รูปอวาตาร์ผู้ใช้
room-images/          (Public) - รูปห้องพัก
hotel-assets/         (Public) - โลโก้โรงแรม
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **Connection Retry**: เชื่อมต่อใหม่อัตโนมัติเมื่อเครือข่ายล้มเหลว
2. **Session Refresh**: รีเฟรช JWT token อัตโนมัติ
3. **Null Handling**: การตรวจสอบ null ที่เหมาะสมใน queries
4. **Transaction Rollback**: การจัดการ error ด้วย try-catch
5. **Case-Insensitive Search**: ใช้ ILIKE สำหรับการค้นหาข้อความ

### ข้อจำกัดปัจจุบัน
1. **ไม่มี Connection Pooling**: ใช้ Supabase pooling เริ่มต้น (จำกัด)
2. **ไม่มี Query Caching**: ไม่มีชั้นแคชฝั่งไคลเอนต์
3. **ไม่มีการติดตาม Database Migrations**: การอัปเดต schema ด้วยตนเอง
4. **RLS Policies จำกัด**: บางตารางขาดความปลอดภัยระดับละเอียด
5. **ไม่มี Read Replicas**: ฐานข้อมูล instance เดียว (ข้อจำกัด Supabase)
6. **ไม่มี Sharding**: ไม่สามารถขยายฐานข้อมูลแนวนอน
7. **Vector Index Cold Start**: การค้นหา vector ครั้งแรกอาจช้า
8. **ไม่มี Database Backups**: พึ่งพาการสำรองข้อมูลอัตโนมัติของ Supabase

### TODO / การพัฒนาในอนาคต
- [ ] **เพิ่ม Connection Pooling**: ใช้ pgBouncer สำหรับ production
- [ ] **เพิ่ม Query Caching**: Redis หรือ React Query สำหรับแคช
- [ ] **Database Migrations**: การติดตามการ migrate (Prisma/TypeORM)
- [ ] **Enhanced RLS Policies**: Row-level security ระดับละเอียด
- [ ] **เพิ่ม Database Indexes**: เพิ่มประสิทธิภาพการ query ช้า
- [ ] **เพิ่ม Soft Deletes**: ใช้ `deleted_at` แทน hard deletes
- [ ] **เพิ่ม Audit Logging**: ติดตามการเปลี่ยนแปลงข้อมูลทั้งหมด
- [ ] **Database Performance Monitoring**: การวิเคราะห์ query, slow query log
- [ ] **เพิ่ม Database Seeding**: การสร้างข้อมูลทดสอบ
- [ ] **เพิ่ม Database Constraints**: CHECK constraints เพิ่มเติม
- [ ] **เพิ่มประสิทธิภาพ Vector Indexes**: ปรับแต่งพารามิเตอร์ IVFFlat
- [ ] **เพิ่ม Full-Text Search**: PostgreSQL FTS สำหรับการค้นหาข้อความ
- [ ] **เพิ่ม Data Archival**: ย้ายการจองเก่าไปตารางเก็บถาวร
- [ ] **เพิ่ม Database Views**: Materialized views สำหรับการ query ที่ซับซ้อน
- [ ] **เพิ่ม GraphQL API**: ทางเลือกแทน REST (Hasura?)

### ปัญหาที่ทราบ
- **Race Conditions**: การจองพร้อมกันอาจสำเร็จ (ต้องการ row locks)
- **Vector Index Accuracy**: IVFFlat แลกความแม่นยำเพื่อความเร็ว
- **Storage Cleanup**: รูปที่ไม่มีการใช้งานไม่ถูกลบอัตโนมัติ
- **ไม่มี Transaction Support**: การแทรกหลายรายการที่เกี่ยวข้องไม่ atomic
- **RLS Performance**: นโยบาย RLS ที่ซับซ้อนอาจทำให้ queries ช้า
- **Embedding Dimension Locked**: ไม่สามารถเปลี่ยนจาก 1536 (โมเดล OpenAI)


