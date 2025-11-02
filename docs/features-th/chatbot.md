# ฟีเจอร์: ระบบแชทบอทด้วย AI (พร้อมแชทสดและระบบตั๋วสนับสนุน)

## 1. ภาพรวม

ระบบแชทบอทเป็นผู้ช่วยสนทนา AI อัจฉริยะแบบหลายชั้นที่ช่วยแขกของโรงแรมเกี่ยวกับคำถามเรื่องห้องพัก โปรโมชัน นโยบาย และบริการต่างๆ ใช้แนวทางแบบผสมผสานที่รวมการจับคู่แบบตรงตัว การค้นหาด้วยความคล้ายคลึงของ vector และการสอบถามแบบไดนามิกตามเจตนา เพื่อให้คำตอบที่แม่นยำและสอดคล้องกับบริบท เมื่อบอทช่วยไม่ได้เพียงพอ ลูกค้าสามารถส่งต่อไปยังแชทสดกับเจ้าหน้าที่แอดมิน

**วัตถุประสงค์:**
- ให้บริการสนับสนุนลูกค้าอัตโนมัติ 24/7
- ตอบคำถามที่พบบ่อยเกี่ยวกับบริการโรงแรม นโยบาย ห้องพัก และโปรโมชัน
- แสดงการตอบกลับแบบหลากหลายรูปแบบ (ข้อความ, ตัวเลือก, การ์ดห้องพัก)
- รองรับทั้งผู้ใช้แบบ guest (ไม่ระบุตัวตน) และผู้ใช้ที่ยืนยันตัวตนแล้ว
- **ส่งต่อไปยังเจ้าหน้าที่แชทสดได้อย่างราบรื่นเมื่อจำเป็น**
- **ติดตามตั๋วสนับสนุนตลอดวงจรชีวิต (เปิด → กำลังดำเนินการ → ปิด)**
- ติดตามประวัติการสนทนาแต่ละเซสชัน
- เปิดใช้งานแชทระหว่างแอดมินและลูกค้าแบบเรียลไทม์

**ความสามารถหลัก:**
- **การตอบกลับหลายรูปแบบ**: ข้อความธรรมดา รายการตัวเลือก การ์ดประเภทห้องพักพร้อมรูปภาพ
- **Vector Search**: การจับคู่ความหมายโดยใช้ embeddings จาก OpenAI + Supabase pgvector
- **การจำแนกเจตนา**: สอบถามห้องพัก/โปรโมชันแบบไดนามิกตามเจตนาของผู้ใช้
- **บริบทการสนทนา**: รักษาประวัติแชทเพื่อการตอบกลับตามบริบท
- **การรวมระบบแชทสด**: บอทหยุดทำงานเมื่อแอดมินรับการสนทนา
- **ระบบตั๋วสนับสนุน**: สร้าง มอบหมาย และปิดตั๋วสนับสนุนลูกค้า
- **ข้อความแบบเรียลไทม์**: แอดมินและลูกค้าแชทสดผ่าน Supabase Realtime
- **การจัดการเซสชัน**: เชื่อมโยงเซสชันแบบไม่ระบุตัวตนกับบัญชีผู้ใช้เมื่อเข้าสู่ระบบ

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการตอบกลับของบอท
```
ผู้ใช้ส่งข้อความ → /api/chat/bot-response
  → ขั้นตอนที่ 1: การจับคู่แบบตรงตัว (Strict Match) (หัวข้อหรือคำพ้องความหมายใน FAQ)
    ├─ พบการจับคู่? → ส่งคืนคำตอบ FAQ
    └─ ไม่พบ → ขั้นตอนที่ 2: Vector Search (ความคล้ายคลึงเชิงความหมาย)
      ├─ พบการจับคู่ (ความคล้ายคลึง > 0.6)? → ส่งคืนคำตอบที่ตรงกัน
      └─ ไม่พบ → ขั้นตอนที่ 3: การจำแนกเจตนา (Intent Classification)
        ├─ จำแนกเจตนา: faq | rooms | promo_codes | other
        └─ จัดการเจตนา:
          ├─ faq/other → ใช้ FAQs ทั้งหมดเป็นบริบท → สร้างคำตอบ AI
          ├─ rooms → แยกตัวกรองห้องพัก → Query ฐานข้อมูล → สร้างคำตอบ
          └─ promo_codes → แยกตัวกรองโปรโมชัน → Query ฐานข้อมูล → สร้างคำตอบ
  → บันทึกข้อความบอทลงฐานข้อมูล
  → ส่งคืนคำตอบ (พร้อมรูปแบบ responseData)
```

### ลำดับการจัดการเซสชัน
```
ผู้ใช้เปิดแชทบอท → ตรวจสอบ AuthContext
  ├─ ผู้ใช้เข้าสู่ระบบ? → สร้างเซสชันด้วย customer_id
  └─ Guest? → สร้างเซสชันด้วย anonymous_id
→ โหลดข้อความก่อนหน้าสำหรับเซสชัน
→ ผู้ใช้ส่งข้อความ → บอทตอบกลับ
→ (ตัวเลือก) ผู้ใช้เข้าสู่ระบบ → เชื่อมโยงเซสชัน (อัปเดต customer_id)
```

### ลำดับแชทสดและระบบตั๋วสนับสนุน
```
ลูกค้าติดปัญหากับบอท → คลิกปุ่ม "ติดต่อเจ้าหน้าที่"
  → POST /api/ticket/tickets (สร้างตั๋ว)
    ├─ สร้างบันทึกตั๋ว (status: 'open')
    ├─ เชื่อมโยงกับ chatbot_session ปัจจุบัน
    └─ แอดมินเห็นการแจ้งเตือนตั๋วใหม่

แอดมินดูตั๋ว → คลิก "เปิดใช้แชทสด"
  → PUT /api/ticket/tickets
    ├─ ตั้งค่า status = 'in_progress'
    ├─ ตั้งค่า assigned_to = admin_id
    ├─ ตั้งค่า live_chat_enabled = true
    └─ อัปเดต session agent_id
  
Bot Response API ตรวจสอบ:
  ├─ ถ้า live_chat_enabled = true → Return { blocked: true }
  └─ บอทอยู่เงียบจนกว่าจะปิดแชท

แอดมินและลูกค้าแชทโดยตรง (เรียลไทม์ผ่าน Supabase Realtime)
  → ลูกค้าส่งข้อความ → แอดมินรับ (WebSocket)
  → แอดมินตอบกลับ → ลูกค้ารับ (WebSocket)

แอดมินแก้ไขปัญหา → คลิก "ปิดตั๋ว"
  → PUT /api/ticket/tickets
    ├─ ตั้งค่า status = 'resolved'
    ├─ ตั้งค่า resolved_at = NOW()
    ├─ ตั้งค่า live_chat_enabled = false
    └─ ตัวเลือก: เพิ่มบันทึกการแก้ไข
  → บอทกลับมาทำงานตามปกติ
```

---

## 3. เทคโนโลยีและไลบรารี

### AI และการประมวลผลภาษาหลัก

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Google Vertex AI (Gemini 2.5 Flash)** | สร้างคำตอบ AI, จำแนกเจตนา | - เร็วและถูกกว่า GPT-4<br>- รองรับหลายภาษาได้ดีกว่า (ไทย/อังกฤษ)<br>- การตอบกลับแบบ Streaming<br>- รวมกับ Google Cloud | รับ prompt ข้อความ → ประมวลผลด้วย LLM → ส่งคืนคำตอบที่มีโครงสร้าง ใช้ตัวแปร "Flash" เพื่อความเร็ว (เหมาะสำหรับแชทบอท) |
| **OpenAI API (text-embedding-3-small)** | แปลงข้อความเป็น vector embeddings | - มาตรฐานอุตสาหกรรมสำหรับ embeddings<br>- 1536 มิติ (สมดุลระหว่างความแม่นยำ/ขนาด)<br>- เข้าใจความหมายที่สอดคล้อง<br>- คุ้มค่าที่ $0.02/1M tokens | รับข้อความ → เครือข่ายประสาทเทียมเข้ารหัสความหมาย → ส่งคืน vector 1536 มิติ ข้อความที่คล้ายกันมี vector ที่คล้ายกัน (cosine similarity) |
| **Supabase pgvector** | ค้นหาความคล้ายคลึงของ Vector ใน PostgreSQL | - ส่วนขยาย PostgreSQL ดั้งเดิม<br>- ไม่ต้องใช้ vector DB แยก<br>- เข้ากันได้กับ SQL (รวมง่าย)<br>- รองรับ IVFFlat index เพื่อความเร็ว | เก็บ vectors เป็น type PostgreSQL ดั้งเดิม → ใช้ cosine distance (operator <=>) → ส่งคืน nearest neighbors IVFFlat index เปิดใช้การค้นหา approximate nearest neighbor (ANN) |

### ฐานข้อมูลและเรียลไทม์

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Supabase Database** | เก็บเซสชัน/ข้อความอย่างถาวร | - รวมระบบ auth ในตัว<br>- PostgreSQL (เชื่อถือได้, ขยายได้)<br>- สร้าง REST API อัตโนมัติ<br>- Row-level security (RLS) | ฐานข้อมูล PostgreSQL → PostgREST สร้าง REST API อัตโนมัติ → Client query ผ่าน SDK นโยบาย RLS บังคับใช้การควบคุมการเข้าถึงในระดับฐานข้อมูล |
| **Supabase Realtime** | อัปเดตข้อความสดๆ | - WebSocket ในตัวของ Supabase<br>- ไม่ต้องใช้เซิร์ฟเวอร์แยก<br>- ส่งการเปลี่ยนแปลง PostgreSQL<br>- จัดการการเชื่อมต่อใหม่อัตโนมัติ | ฟัง PostgreSQL WAL (Write-Ahead Log) → ส่ง INSERT/UPDATE/DELETE → WebSocket ส่งไปยังไคลเอนต์ที่สมัครสมาชิกแบบเรียลไทม์ |
| **React Context API** | จัดการสถานะแชทบอทส่วนกลาง | - มีใน React (ไม่ต้องพึ่งพาเพิ่ม)<br>- เหมาะสำหรับสถานะส่วนกลางแบบง่าย<br>- ไม่ต้องมี Redux boilerplate<br>- เข้าใจง่าย | Provider component เก็บสถานะ → Context.Provider ครอบแอป → hook useContext() เข้าถึงสถานะจากที่ใดก็ได้ Re-render เฉพาะ components ที่ใช้งาน |

---

## 4. ตรรกะหลัก

### 4.1 กลยุทธ์การตอบกลับ (แนวทาง 3 ชั้น)

#### ชั้นที่ 1: การจับคู่แบบตรงตัว (Strict Matching)
```typescript
// การจับคู่แบบตรงตัวกับหัวข้อ FAQ หรือคำพ้องความหมาย (ไม่สนใจตัวพิมพ์)
normalize(userMessage) === normalize(faq.topic)
OR
normalize(userMessage) === normalize(alias.alias)

→ ส่งคืน: FAQ reply_message + reply_payload
```

#### ชั้นที่ 2: Vector Search
```typescript
// ความคล้ายคลึงเชิงความหมายโดยใช้ embeddings
1. สร้าง embedding สำหรับคำถามผู้ใช้: createEmbedding(userMessage)
2. เรียก Supabase RPC: match_faqs_with_aliases(query_embedding, 0.6 threshold)
3. ส่งคืน: FAQ ที่มีคะแนนความคล้ายคลึงสูงสุด (ถ้า > 0.6)
4. ส่งคืนคำตอบ FAQ ที่ตรงกัน
```

**SQL สำหรับ Vector Search (Supabase Function):**
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
  -- ค้นหา FAQs
  SELECT 
    f.id, f.topic, f.reply_message, f.reply_format, f.reply_payload,
    1 - (f.topic_embedding <=> query_embedding) as similarity,
    'faq' as source
  FROM chatbot_faqs f
  WHERE 1 - (f.topic_embedding <=> query_embedding) > match_threshold
  
  UNION ALL
  
  -- ค้นหาคำพ้องความหมาย
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

#### ชั้นที่ 3: การสอบถามแบบไดนามิกตามเจตนา (Intent-Based)
```typescript
// เมื่อไม่พบการจับคู่ FAQ
1. จำแนกเจตนา (rooms | promo_codes | faq | other)
   → ใช้ Gemini เพื่อจำแนกคำถามของผู้ใช้
   
2. จัดการเจตนา:
   a) rooms → extractRoomFilters() → queryRoomsWithFilters() → สร้างคำตอบ
   b) promo_codes → extractPromoFilters() → queryPromosWithFilters() → สร้างคำตอบ
   c) faq/other → โหลด FAQs + contexts ทั้งหมด → สร้างคำตอบ AI พร้อมบริบท
```

**ตัวอย่างการแยกตัวกรองห้องพัก:**
```typescript
ผู้ใช้: "ห้องราคาถูกที่มี wifi"
→ extractRoomFilters() → { pricePercentile: "bottom25", amenities: ["wifi"], isActive: true }
→ Query ฐานข้อมูลด้วยตัวกรอง
→ สร้างคำตอบภาษาธรรมชาติ
```

### 4.2 รูปแบบการตอบกลับ

#### รูปแบบที่ 1: ข้อความธรรมดา (Simple Message)
```json
{
  "format": "message",
  "message": "เวลาเช็คอินคือ 14:00 น. และเช็คเอาท์คือ 12:00 น."
}
```

#### รูปแบบที่ 2: รายละเอียดตัวเลือก (Option Details)
```json
{
  "format": "option_details",
  "message": "นี่คือสิ่งอำนวยความสะดวกของโรงแรม:",
  "options": [
    { "option": "สระว่ายน้ำ", "detail": "สระว่ายน้ำกลางแจ้งขนาดโอลิมปิก เปิด 6:00-22:00 น." },
    { "option": "ฟิตเนส", "detail": "ห้องออกกำลังกาย 24 ชั่วโมง พร้อมอุปกรณ์ทันสมัย" }
  ]
}
```

#### รูปแบบที่ 3: การ์ดประเภทห้องพัก (Room Type Cards)
```json
{
  "format": "room_type",
  "message": "นี่คือประเภทห้องพักของเรา:",
  "rooms": ["Deluxe", "Suite", "Superior"],
  "buttonName": "ดูรายละเอียด",
  "roomDetails": {
    "Deluxe": {
      "id": 1,
      "main_image": "/api/images/base64-room-image?roomName=Deluxe",
      "base_price": 5000,
      "promo_price": 4500,
      "description": "ห้องพักกว้างขวางพร้อมวิวทะเล"
    }
  }
}
```

### 4.3 การตรวจสอบความมั่นใจ (Confidence Checking)
```typescript
// ตรวจสอบว่าคำตอบ AI ไม่แน่ใจหรือไม่
checkResponseConfidence(response, userQuestion):
  → ให้คะแนน 1-10 โดยพิจารณาจาก:
    - ความตรงประเด็นของคำตอบ
    - การมีวลีที่แสดงความไม่แน่ใจ ("ไม่ทราบ", "ช่วยไม่ได้")
    - ตรวจพบ "ไม่มีข้อมูล"
  
  ถ้าความมั่นใจ < 5:
    → ส่งคืน [aiResponse, fallbackMessage]
    → แสดงข้อความทั้งสองให้ผู้ใช้
```

### 4.4 ระบบแชทสดและตั๋วสนับสนุน

เมื่อแชทบอทช่วยไม่ได้เพียงพอ ลูกค้าสามารถส่งต่อไปยังเจ้าหน้าที่:

#### การสร้างตั๋ว
```typescript
// POST /api/ticket/tickets
async createTicket(sessionId: string):
  // 1. รับรายละเอียดเซสชัน
  session = SELECT * FROM chatbot_sessions WHERE id = sessionId
  If not found → Return error
  
  // 2. สร้างตั๋ว
  ticket = INSERT INTO chatbot_tickets (
    session_id: sessionId,
    status: 'open',
    live_chat_enabled: false,
    created_at: NOW()
  ) RETURNING *
  
  // 3. ตัวเลือก: ส่งการแจ้งเตือนไปยังแอดมิน (Email, Slack, push)
  
  Return: { success: true, ticket }
```

#### แอดมินเปิดใช้แชทสด
```typescript
// PUT /api/ticket/tickets
async enableLiveChat(ticketId: string, adminId: string):
  // 1. รับตั๋ว
  ticket = SELECT * FROM chatbot_tickets WHERE id = ticketId
  If not found → Return error
  
  // 2. อัปเดตตั๋ว
  Update chatbot_tickets SET
    status = 'in_progress',
    assigned_to = adminId,
    live_chat_enabled = true
  WHERE id = ticketId
  
  // 3. อัปเดตเซสชัน
  Update chatbot_sessions SET
    agent_id = adminId
  WHERE id = ticket.session_id
  
  Return: { success: true, message: 'เปิดใช้แชทสดแล้ว' }
```

#### การบล็อกการตอบกลับของบอท
```typescript
// ใน /api/chat/bot-response.ts
async handleBotResponse(sessionId: string, userMessage: string):
  // 1. ตรวจสอบแชทสดที่ใช้งานอยู่
  const { data: activeTickets } = await supabase
    .from('chatbot_tickets')
    .select('id, status, live_chat_enabled')
    .eq('session_id', sessionId)
    .eq('status', 'in_progress');
  
  // 2. บล็อกบอทถ้าแชทสดทำงานอยู่
  If activeTickets.length > 0 AND activeTickets[0].live_chat_enabled:
    Return { 
      success: true, 
      blocked: true, 
      reason: 'แชทสดทำงานอยู่',
      message: null 
    }
  
  // 3. ดำเนินการตอบกลับปกติของบอท
  ...generate bot response...
```

#### การซิงค์ข้อความแบบเรียลไทม์
**แดชบอร์ดแอดมิน (สมัครรับข้อความจากลูกค้า):**
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
        // ข้อความจากลูกค้า
        updateMessageList(newMessage);
        playNotificationSound();
      }
    }
  )
  .subscribe();
```

**แชทบอทลูกค้า (สมัครรับข้อความจากแอดมิน):**
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
        // ข้อความจากแอดมิน
        updateMessageList(newMessage);
      }
    }
  )
  .subscribe();
```

#### การแก้ไขปัญหาตั๋ว
```typescript
// PUT /api/ticket/tickets (resolve)
async resolveTicket(ticketId: string, resolutionNotes?: string):
  // 1. อัปเดตตั๋ว
  Update chatbot_tickets SET
    status = 'resolved',
    resolved_at = NOW(),
    live_chat_enabled = false,
    resolution_notes = resolutionNotes
  WHERE id = ticketId
  
  // 2. ปิดเซสชัน (ตัวเลือก)
  ticket = SELECT * FROM chatbot_tickets WHERE id = ticketId
  Update chatbot_sessions SET
    status = 'closed',
    closed_at = NOW()
  WHERE id = ticket.session_id
  
  // 3. บอทกลับมาทำงาน
  Return: { success: true, message: 'ปิดตั๋วแล้ว' }
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ตาราง: `chatbot_sessions`
```sql
CREATE TABLE chatbot_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES auth.users(id), -- NULL สำหรับ guests
  anonymous_id TEXT,                          -- สำหรับผู้ใช้ guest
  agent_id UUID REFERENCES auth.users(id),    -- เจ้าหน้าที่แอดมิน (สำหรับแชทสด)
  status TEXT DEFAULT 'active',               -- 'active' | 'closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  
  -- Index สำหรับการค้นหาเร็ว
  INDEX idx_customer_sessions ON chatbot_sessions(customer_id),
  INDEX idx_anonymous_sessions ON chatbot_sessions(anonymous_id)
);
```

### ตาราง: `chatbot_messages`
```sql
CREATE TABLE chatbot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatbot_sessions(id),
  message TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT false,
  sender_id UUID REFERENCES auth.users(id),  -- User/Admin ID (NULL สำหรับบอท)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_session_messages ON chatbot_messages(session_id, created_at)
);
```

### ตาราง: `chatbot_faqs`
```sql
CREATE TABLE chatbot_faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,                        -- คำถามหรือชื่อหัวข้อ
  reply_message TEXT NOT NULL,                -- คำตอบของบอท
  reply_format TEXT DEFAULT 'message',        -- 'message' | 'option_details' | 'room_type'
  reply_payload JSONB,                        -- ข้อมูลเพิ่มเติม (options, rooms, etc.)
  topic_embedding vector(1536),               -- OpenAI embedding สำหรับ vector search
  display_order INTEGER,                      -- สำหรับการเรียงลำดับแบบลากและวาง
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Vector similarity index (IVFFlat สำหรับการค้นหาโดยประมาณที่เร็ว)
  INDEX idx_topic_embedding ON chatbot_faqs USING ivfflat (topic_embedding vector_cosine_ops)
);
```

### ตาราง: `chatbot_faq_aliases`
```sql
CREATE TABLE chatbot_faq_aliases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faq_id UUID NOT NULL REFERENCES chatbot_faqs(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,                        -- การใช้คำพ้องความหมาย
  embedding vector(1536),                     -- Embedding แยกสำหรับคำพ้องความหมาย
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_alias_embedding ON chatbot_faq_aliases USING ivfflat (embedding vector_cosine_ops),
  INDEX idx_faq_aliases ON chatbot_faq_aliases(faq_id)
);
```

### ตาราง: `chatbot_contexts`
```sql
CREATE TABLE chatbot_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,                      -- บริบทเพิ่มเติมสำหรับ AI
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ตาราง: `chatbot_tickets` (แชทสดและสนับสนุน)
```sql
CREATE TABLE chatbot_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES chatbot_sessions(id),
  
  -- ติดตามสถานะ
  status TEXT DEFAULT 'open',              -- 'open' | 'in_progress' | 'resolved'
  
  -- การมอบหมาย
  assigned_to UUID REFERENCES auth.users(id), -- เจ้าหน้าที่แอดมินที่ได้รับมอบหมาย
  
  -- การควบคุมแชทสด
  live_chat_enabled BOOLEAN DEFAULT false, -- บล็อกบอทเมื่อเป็น true
  
  -- การแก้ไข
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

### วงจรชีวิตสถานะตั๋ว
```
┌──────┐    แอดมิน    ┌─────────────┐    แก้ไข    ┌──────────┐
│ เปิด │ ──────────> │ กำลังดำเนินการ │ ────────────> │ ปิดแล้ว │
└──────┘   มอบหมาย    └─────────────┘               └──────────┘
                      (live_chat_enabled = true)    (live_chat_enabled = false)
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **ไม่มีการจับคู่ FAQ**: ใช้การจำแนกเจตนา + การสอบถามแบบไดนามิก
2. **คำตอบที่มั่นใจต่ำ**: ส่งคืนทั้งคำตอบ AI + ข้อความสำรอง
3. **แชทสดทำงานอยู่**: บอทหยุดอัตโนมัติเมื่อแอดมินรับการสนทนา
4. **ฐานข้อมูลไม่พร้อมใช้งาน**: ส่งคืนข้อความสำรองที่ hardcode ไว้
5. **ประวัติเซสชันว่าง**: ใช้ข้อความทักทายสำหรับการโต้ตอบครั้งแรก
6. **การกรองตาม Percentile**: จัดการคำที่คลุมเครือเช่น "ถูก", "หรู", ห้อง "ใหญ่"
7. **การเชื่อมโยงเซสชัน Guest**: รักษาประวัติแชทเมื่อ guest เข้าสู่ระบบ

### ข้อจำกัดปัจจุบัน

**แชทบอทหลัก:**
1. **ไม่มี Context Window หลายรอบ**: ใช้เพียง 3-5 ข้อความล่าสุด (เพื่อปรับ token limit)
2. **ไม่สามารถอัปโหลดไฟล์**: ไม่สามารถประมวลผลรูปภาพ เอกสาร หรือไฟล์แนบ
3. **ไม่มีการรับ/ส่งเสียง**: อินเทอร์เฟซข้อความเท่านั้น
4. **อังกฤษ + ไทยเท่านั้น**: Gemini ตอบกลับในภาษาของผู้ใช้ แต่เพิ่มประสิทธิภาพสำหรับสองภาษานี้เป็นหลัก
5. **ไม่มีการวิเคราะห์อารมณ์**: ไม่สามารถตรวจจับผู้ใช้ที่หงุดหงิด/โกรธ
6. **รูปแบบการตอบกลับคงที่**: ไม่สามารถสร้าง UI components ใหม่แบบไดนามิก

**แชทสดและตั๋ว:**
7. **ไม่มีตัวบ่งชี้การพิมพ์**: แอดมิน/ลูกค้าไม่สามารถเห็น "กำลังพิมพ์..."
8. **ไม่มีการยืนยันการอ่าน**: ไม่มีการแจ้งว่าข้อความถูกอ่านแล้ว
9. **การมอบหมายแอดมินคนเดียว**: ไม่สามารถมีแอดมินหลายคนในตั๋วเดียว
10. **ไม่มีลำดับความสำคัญของตั๋ว**: ตั๋วทั้งหมดได้รับการปฏิบัติเท่าเทียม (ไม่มีคิวลำดับความสำคัญ)
11. **ไม่มีการมอบหมายอัตโนมัติ**: แอดมินต้องรับตั๋วด้วยตนเอง
12. **ไม่มีหมวดหมู่ตั๋ว**: ไม่สามารถแยกตามประเภทปัญหา
13. **ไม่มีการติดตาม SLA**: ไม่มีการติดตามเวลาตอบกลับ
14. **ไม่มีคำตอบสำเร็จรูป**: แอดมินต้องพิมพ์ข้อความทั้งหมดด้วยตนเอง

### TODO / การพัฒนาในอนาคต

**การปรับปรุงแชทบอท:**
- [ ] สร้างการติดตามบริบทหลายรอบด้วยการสรุป
- [ ] เพิ่มการอัปโหลดไฟล์ (รูปภาพความชอบห้อง, การยืนยันการจอง)
- [ ] เพิ่ม voice-to-text และ text-to-speech
- [ ] เพิ่มการวิเคราะห์อารมณ์เพื่อตรวจจับผู้ใช้ที่หงุดหงิด → ส่งต่อไปแชทสดอัตโนมัติ
- [ ] สร้างแชทบอทเชิงรุก (ทักทายผู้ใช้เก่า, แนะนำโปรโมชัน)
- [ ] เพิ่มแอนิเมชั่นตัวบ่งชี้การพิมพ์
- [ ] รองรับการจัดรูปแบบ markdown ในคำตอบของบอท
- [ ] สร้างการส่งออกเซสชันแชท (ดาวน์โหลดเป็น PDF/text)
- [ ] เพิ่มการวิเคราะห์แชทบอท (คำถามที่ถามบ่อยที่สุด, อัตราการแก้ปัญหา)
- [ ] รองรับการจองโดยตรงผ่านแชทบอท
- [ ] สร้างระบบฟีดแบ็ก (ไลค์/ไม่ไลค์คำตอบ)
- [ ] เพิ่มการรองรับหลายภาษา (แปลอัตโนมัติ)
- [ ] สร้าง framework สำหรับทดสอบ A/B ของแชทบอท

**การพัฒนาแชทสด:**
- [ ] **เพิ่มตัวบ่งชี้การพิมพ์**: แสดง "เจ้าหน้าที่กำลังพิมพ์..." แบบเรียลไทม์
- [ ] **เพิ่มการยืนยันการอ่าน**: แสดงสถานะว่าข้อความถูกอ่านแล้ว
- [ ] **เพิ่มลำดับความสำคัญของตั๋ว**: ระดับความสำคัญสูง กลาง ต่ำ
- [ ] **การมอบหมายอัตโนมัติ**: การมอบหมายตั๋วแบบ round-robin หรือตาม load
- [ ] **หมวดหมู่ตั๋ว**: Bug, คำถาม, ร้องเรียน ฯลฯ
- [ ] **คำตอบสำเร็จรูป**: เทมเพลตที่เขียนไว้แล้วสำหรับคำตอบทั่วไป
- [ ] **การติดตาม SLA**: ติดตามเวลาตอบกลับครั้งแรก เวลาแก้ปัญหา
- [ ] **แท็กตั๋ว**: ป้ายกำกับแบบกำหนดเองเพื่อจัดระเบียบที่ดีขึ้น
- [ ] **บันทึกแอดมิน**: บันทึกภายในที่ลูกค้ามองไม่เห็น
- [ ] **การโอนตั๋ว**: โอนตั๋วไปยังแอดมินอื่น
- [ ] **การรวมตั๋ว**: รวมตั๋วที่ซ้ำกัน
- [ ] **แบบสำรวจความพึงพอใจ**: ฟีดแบ็กหลังแก้ปัญหา
- [ ] **ส่งออกประวัติตั๋ว**: ดาวน์โหลดการสนทนาเป็น PDF/text
- [ ] **ระบบการแจ้งเตือน**: การแจ้งเตือนทางอีเมล/push สำหรับข้อความใหม่
- [ ] **การตรวจจับว่าง**: ปิดตั๋วอัตโนมัติถ้าไม่มีการตอบกลับเป็นเวลา X ชั่วโมง
- [ ] **การจัดการคิว**: แสดงตำแหน่งคิวของตั๋วให้ลูกค้า

### ปัญหาที่ทราบ

**ปัญหาแชทบอท:**
- **การใช้ Token**: FAQ fallback ใช้ FAQs ทั้งหมดเป็นบริบท (อาจแพงสำหรับข้อมูลจำนวนมาก)
- **Vector Index Cold Start**: การค้นหา vector ครั้งแรกอาจช้าถ้า index ยังไม่อุ่น
- **การซ้ำของคำพ้องความหมาย**: ไม่มีการตรวจสอบเพื่อป้องกันคำพ้องความหมายซ้ำใน FAQs
- **ไม่มี Rate Limiting**: ผู้ใช้สามารถส่งข้อความ spam (ไม่มีการควบคุม)
- **ประสิทธิภาพ Image Proxy**: รูปห้องพักดึงตาม demand (ไม่มีแคช)

**ปัญหาแชทสด:**
- **Race Condition**: บอทอาจตอบกลับก่อนที่ธง `live_chat_enabled` จะถูกตั้งค่า
- **ไม่มีการแก้ไขความขัดแย้ง**: แอดมินสองคนสามารถเปิดแชทสดในตั๋วเดียวกัน
- **ความล่าช้า Realtime**: Supabase Realtime อาจมีความล่าช้า 1-2 วินาที
- [ **ไม่มีการเรียงลำดับข้อความ**: ข้อความพร้อมกันอาจแสดงผลไม่เรียงลำดับ
- **การใช้เซสชันซ้ำ**: เซสชันของตั๋วที่แก้แล้วสามารถสร้างตั๋วใหม่ (ประวัติสับสน)
- **ไม่มีการติดตามความพร้อมของแอดมิน**: ระบบไม่ติดตามว่าแอดมินออนไลน์/ออฟไลน์


