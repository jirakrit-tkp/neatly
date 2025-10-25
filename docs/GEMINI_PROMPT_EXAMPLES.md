# 🤖 Gemini Prompt Examples - Real Scenarios

นี่คือ **Prompt จริงๆ** ที่ Gemini จะได้รับเมื่อ `chatWithGemini()` ผสมกับแต่ละ Intent Handler

---

## 📚 System Prompt (ใช้ในทุก `chatWithGemini()`)

จาก `src/lib/chat.ts`:

```typescript
// Function signature (Refactored ✅)
export async function chatWithGemini(
  prompt: string,
  conversationHistory?: historyType[]
)
```

```
- You are a female hotel staff member at Neatly Hotel
- Answer in the same language the user used
- Be friendly, professional, and concise
- Review conversation history for context

IMPORTANT:
- Only use provided information - don't make things up
- If you don't have the answer, be honest about it
- DO NOT say you will "check" or "investigate"
- For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

Conversation History:
[3 messages ล่าสุด]

Task:
[Prompt ทั้งก้อนจาก Intent Handler]
```

---

## 🎯 Scenario 1: FAQ Intent Handler

### สถานการณ์:
- User ถาม: "เช็คอินกี่โมง?"
- มี conversation history 2 ข้อความ
- Vector match ไม่เจอ → classify intent → FAQ
- System ดึง FAQ ทั้งหมดมาเป็น context

### faqPrompt ที่ส่งเข้า chatWithGemini():
```typescript
const faqPrompt = `Answer user question based on FAQ database.

FAQ Database:
${faqContext}

${additionalContext ? `Additional Information:\n${additionalContext}\n` : ""}
User Question: "${userQuestion}"

Instructions:
- Continue the conversation naturally (no greetings)
- Keep response SHORT and CONCISE (2-3 sentences max)
- Answer directly from FAQ database
- Use friendly, conversational tone
- If no match, ask for clarification briefly`;

// เรียกใช้
const response = await chatWithGemini(faqPrompt, conversationHistory);
```

### Prompt ที่ Gemini ได้รับ (Full):

```text
  ┌─────────────────────────────────────────────────────────────
  │ จาก chatWithGemini() - System Instructions
  └─────────────────────────────────────────────────────────────
  - You are a female hotel staff member at Neatly Hotel
  - Answer in the same language the user used
  - Be friendly, professional, and concise
  - Review conversation history for context
  
  IMPORTANT:
  - Only use provided information - don't make things up
  - If you don't have the answer, be honest about it
  - DO NOT say you will "check" or "investigate"
  - For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

  ┌─────────────────────────────────────────────────────────────
  │ จาก chatWithGemini() - Conversation History (3 messages)
  └─────────────────────────────────────────────────────────────
  Conversation History:
  User: สวัสดีค่ะ
Assistant: สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel มีอะไรให้ช่วยไหมคะ

  ┌─────────────────────────────────────────────────────────────
  │ จาก chatWithGemini() wrapper - เติม "Task:" นำหน้า
  │ ข้างล่างทั้งหมดคือ faqPrompt ที่ส่งเข้ามา
  └─────────────────────────────────────────────────────────────
  Task:
  Answer user question based on FAQ database.
  ┌─────────────────────────────────────────────────────────────
  │ ↑ เริ่มต้น faqPrompt
  └─────────────────────────────────────────────────────────────

FAQ Database:
Q: Check-in and check-out times
A: Check-in is at 2:00 PM and check-out is at 12:00 PM (noon).

Q: Cancellation policy
A: Free cancellation up to 24 hours before arrival. Late cancellations incur a one-night charge.

Q: Pet policy
A: We welcome pets under 15kg. Additional fee of 500 THB per night applies.

Q: Parking availability
A: Free parking is available for all guests in our underground parking facility.

Q: WiFi
A: Complimentary high-speed WiFi is available throughout the hotel.

Q: Airport transfer
A: Airport transfer service available at 800 THB per trip. Book at reception.

Q: Breakfast hours
A: Breakfast is served from 6:30 AM to 10:30 AM daily.

Q: Pool hours
A: Swimming pool is open from 6:00 AM to 10:00 PM.

Q: Gym access
A: Fitness center is open 24/7 for all guests.

Q: Room service
A: Room service available 24/7. Menu available in your room.

Additional Information:
Hotel Contact: +66 2 123 4567
Email: info@neatlyhotel.com
Address: 123 Sukhumvit Road, Bangkok 10110

User Question: "เช็คอินกี่โมง?"

Instructions:
- Continue the conversation naturally (no greetings)
- Keep response SHORT and CONCISE (2-3 sentences max)
- Answer directly from FAQ database
- Use friendly, conversational tone
- If no match, ask for clarification briefly

  ┌─────────────────────────────────────────────────────────────
  │ ↑ สิ้นสุด faqPrompt (ทั้งหมดตั้งแต่ "Answer user..." ถึง "briefly")
  └─────────────────────────────────────────────────────────────
  
```

> **⚠️ หมายเหตุ:** 
> - `chatWithGemini()` ห่อ faqPrompt ด้วย System Instructions + History + "Task:"
> - เปลี่ยนจาก "Question:" เป็น "Task:" เพราะ prompt เป็น instruction ไม่ใช่คำถาม
> - ทั้งหมดตั้งแต่ "Answer user question..." จนถึง "...ask for clarification briefly" คือ faqPrompt

---

## 🏨 Scenario 2: Rooms Intent Handler (เจอห้อง)

### สถานการณ์:
- User ถาม: "มีห้องราคาถูกไหม?"
- มี conversation history 4 ข้อความ
- Intent: rooms → Extract filters: `{"pricePercentile":"bottom25","isActive":true}`
- Query ได้ห้อง 3 ห้อง

### วิธีการเรียก:
```typescript
// จาก bot-response.ts line 1112
const response = await chatWithGemini(responsePrompt, conversationHistory);
// ส่ง responsePrompt ทั้งก้อนเป็น parameter "prompt"
```

### Prompt ที่ Gemini ได้รับ (Full):

```text
  - You are a female hotel staff member at Neatly Hotel
  - Answer in the same language the user used
  - Be friendly, professional, and concise
  - Review conversation history for context
  
  IMPORTANT:
  - Only use provided information - don't make things up
  - If you don't have the answer, be honest about it
  - DO NOT say you will "check" or "investigate"
  - For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

  
  Conversation History:
  User: สวัสดีค่ะ
Assistant: สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel มีอะไรให้ช่วยไหมคะ
User: อยากจองห้องพักค่ะ
Assistant: ดีมากเลยค่ะ อยากทราบว่าสนใจห้องแบบไหนคะ มีข้อกำหนดอะไรเป็นพิเศษไหม เช่น ราคา, ขนาดห้อง, หรือสิ่งอำนวยความสะดวกที่ต้องการ

  Task:
  User asked: "มีห้องราคาถูกไหม?"

Found 3 available room(s):
[
  {
    "id": 1,
    "room_type": "Superior Garden View",
    "room_type_id": 101,
    "description": "Cozy room with garden view, perfect for couples",
    "price": 1500,
    "promotion_price": 1200,
    "currency": "THB",
    "guests": 2,
    "room_size": 32,
    "bed_type": "King bed",
    "amenities": ["WiFi", "TV", "Air conditioning", "Mini bar"],
    "main_image_url": "https://...",
    "gallery_images": ["..."],
    "is_active": true,
    "status": "available"
  },
  {
    "id": 2,
    "room_type": "Superior",
    "room_type_id": 102,
    "description": "Comfortable room with modern amenities",
    "price": 1800,
    "promotion_price": null,
    "currency": "THB",
    "guests": 2,
    "room_size": 30,
    "bed_type": "Double bed",
    "amenities": ["WiFi", "TV", "Air conditioning"],
    "main_image_url": "https://...",
    "gallery_images": ["..."],
    "is_active": true,
    "status": "available"
  },
  {
    "id": 3,
    "room_type": "Deluxe",
    "room_type_id": 103,
    "description": "Spacious room with city view",
    "price": 2200,
    "promotion_price": 1900,
    "currency": "THB",
    "guests": 2,
    "room_size": 38,
    "bed_type": "King bed",
    "amenities": ["WiFi", "TV", "Air conditioning", "Mini bar", "Bathtub"],
    "main_image_url": "https://...",
    "gallery_images": ["..."],
    "is_active": true,
    "status": "available"
  }
]

Instructions:
- Continue the conversation naturally (no greetings)
- Keep response SHORT and CONCISE (2-4 sentences max)
- Present rooms as a brief list or summary
- Highlight: price, room_type, guests, bed_type, room_size
- Mention promotion_price if available
- Use friendly, conversational tone
  
```

---

## 🏨 Scenario 3: Rooms Intent Handler (ไม่เจอห้อง)

### สถานการณ์:
- User ถาม: "มีห้อง 10 คนไหม?"
- Intent: rooms → Extract filters: `{"guests":10,"isActive":true}`
- Query ได้ห้อง 0 ห้อง

### วิธีการเรียก:
```typescript
// จาก bot-response.ts line 1112 (same function)
const response = await chatWithGemini(responsePrompt, conversationHistory);
```

### Prompt ที่ Gemini ได้รับ (Full):

```text
  - You are a female hotel staff member at Neatly Hotel
  - Answer in the same language the user used
  - Be friendly, professional, and concise
  - Review conversation history for context
  
  IMPORTANT:
  - Only use provided information - don't make things up
  - If you don't have the answer, be honest about it
  - DO NOT say you will "check" or "investigate"
  - For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

  
  Conversation History:
  User: อยากจองห้องพักค่ะ
Assistant: ดีมากเลยค่ะ อยากทราบว่าสนใจห้องแบบไหนคะ
User: จะไปกันหลายคน

  Task:
  User asked: "มีห้อง 10 คนไหม?"

Search result: No rooms found matching the criteria.

Instructions:
- Continue the conversation naturally (no greetings)
- Keep response SHORT (1-2 sentences)
- Politely inform no rooms match and suggest adjusting criteria
  
```

---

## 🎟️ Scenario 4: Promo Codes Intent Handler (เจอโปรโมชั่น)

### สถานการณ์:
- User ถาม: "มีโค้ดส่วนลดไหม?"
- Intent: promo_codes → Extract filters: `{"activeOnly":true,"hasUsageLeft":true}`
- Query ได้ 2 promo codes

### วิธีการเรียก:
```typescript
// จาก bot-response.ts line 1182
const response = await chatWithGemini(responsePrompt, conversationHistory);
```

### Prompt ที่ Gemini ได้รับ (Full):

```text
  - You are a female hotel staff member at Neatly Hotel
  - Answer in the same language the user used
  - Be friendly, professional, and concise
  - Review conversation history for context
  
  IMPORTANT:
  - Only use provided information - don't make things up
  - If you don't have the answer, be honest about it
  - DO NOT say you will "check" or "investigate"
  - For additional help: suggest opening a "ticket" (English) - DO NOT translate to "ตั๋ว" or any other language

  
  Conversation History:
  User: สวัสดีค่ะ
Assistant: สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel มีอะไรให้ช่วยไหมคะ

  Task:
  User asked: "มีโค้ดส่วนลดไหม?"

Found 2 promo code(s):
[
  {
    "id": 1,
    "code": "SUMMER2025",
    "discount_percent": 20,
    "discount_amount": null,
    "max_uses": 100,
    "uses_count": 45,
    "expires_at": "2025-08-31T23:59:59",
    "is_active": true,
    "description": "Summer special - 20% off all rooms"
  },
  {
    "id": 2,
    "code": "EARLYBIRD",
    "discount_percent": 15,
    "discount_amount": null,
    "max_uses": 50,
    "uses_count": 12,
    "expires_at": "2025-12-31T23:59:59",
    "is_active": true,
    "description": "Book early and save 15%"
  }
]

Instructions:
- Continue the conversation naturally (no greetings)
- Keep response SHORT and CONCISE (2-4 sentences max)
- List promo codes clearly (easy to copy)
- Briefly explain discount_percent or discount_amount
- Mention expires_at only if relevant
- Use friendly, conversational tone
  
```

---

## 🔍 Scenario 5: Intent Classification (ก่อนจะเข้า Handler)

### สถานการณ์:
- User ถาม: "ห้องที่มีวิวทะเล"
- Strict/Vector match ไม่เจอ → ต้อง classify intent

### Prompt ที่ Gemini ได้รับ:

```text
You are an intent classification assistant for a hotel chatbot.

Categories:
- faq: General questions about hotel (policies, facilities, services)
- rooms: Questions about room types, prices, availability, amenities
- promo_codes: Questions about discounts, promotions, promo codes
- other: Greetings, thanks, chitchat, unclear questions

Examples:
- "what rooms do you have?" → rooms
- "cheapest room?" → rooms
- "rooms with sea view?" → rooms
- "rooms under 3000 baht?" → rooms
- "discount codes available?" → promo_codes
- "what time is check-in?" → faq
- "cancellation policy?" → faq
- "hello" → other
- "thank you" → other

Context:
User: สวัสดีค่ะ
Bot: สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel มีอะไรให้ช่วยไหมคะ
User: อยากจองห้องพักค่ะ
Bot: ดีมากเลยค่ะ อยากทราบว่าสนใจห้องแบบไหนคะ
User: มีงบประมาณไม่เกิน 3000

Question: "ห้องที่มีวิวทะเล"

Answer: (faq/rooms/promo_codes/other only)
```

**Expected Output:** `rooms`

---

## 🔍 Scenario 6: Room Filters Extraction

### สถานการณ์:
- Intent = "rooms"
- User ถาม: "ห้องที่มีวิวทะเล"
- มี conversation context

### Prompt ที่ Gemini ได้รับ:

```text
Extract room filters from user question. Return JSON only.
Conversation context:
User: สวัสดีค่ะ
Bot: สวัสดีค่ะ ยินดีต้อนรับสู่ Neatly Hotel มีอะไรให้ช่วยไหมคะ
User: อยากจองห้องพักค่ะ
Bot: ดีมากเลยค่ะ อยากทราบว่าสนใจห้องแบบไหนคะ
User: มีงบประมาณไม่เกิน 3000

Schema (all optional):
{
  "priceMin": number, "priceMax": number, "guests": number,
  "roomType": string, "bedType": string, "roomSizeMin": number,
  "roomSizeMax": number, "amenities": string[], "promoOnly": boolean,
  "isActive": boolean, "pricePercentile": "bottom25" | "top25",
  "sizePercentile": "bottom25" | "top25"
}

Guidelines:
- priceMin/priceMax: Use when user specifies numbers (e.g. "under 3000" = priceMax: 3000)
- guests: Number of people (e.g. "2 people" = guests: 2)
- roomType: Deluxe, Suite, Superior, Supreme (case-insensitive, partial match OK)
- bedType: Single, Double, King, Queen (case-insensitive, partial match OK)
- roomSizeMin/roomSizeMax: Room size in sqm (e.g. "bigger than 40 sqm" = roomSizeMin: 40)
- amenities: array of amenities (e.g. ["pool", "gym", "sea view"])
- promoOnly: true if asking for rooms with promotions
- isActive: Default true (show only active rooms)
- pricePercentile: Use "bottom25" for cheap/affordable, "top25" for expensive/luxury
- sizePercentile: Use "bottom25" for small/compact, "top25" for big/spacious

Examples:
- "cheap rooms?" → {"pricePercentile":"bottom25","isActive":true}
- "rooms under 5000 baht" → {"priceMax":5000,"isActive":true}
- "Deluxe with king bed" → {"roomType":"Deluxe","bedType":"King bed","isActive":true}
- "rooms with pool and gym" → {"amenities":["pool","gym"],"isActive":true}
- "bigger than 40 sqm" → {"roomSizeMin":40,"isActive":true}
- "rooms with promotions" → {"promoOnly":true,"isActive":true}
- "sea view suite over 50 sqm" → {"roomType":"Suite","amenities":["sea view"],"roomSizeMin":50,"isActive":true}
- Context: "3000 baht", Question: "cheaper than this" → {"priceMax":2500,"isActive":true}

Question: "ห้องที่มีวิวทะเล"
JSON:
```

**Expected Output:** 
```json
{
  "amenities": ["sea view"],
  "priceMax": 3000,
  "isActive": true
}
```

---

## 🔍 Scenario 7: Response Confidence Check

### สถานการณ์:
- Gemini ตอบ: "ขออภัยค่ะ ไม่มีข้อมูลเกี่ยวกับเรื่องนี้"
- System ต้องเช็คว่าควรจะ fallback ไหม

### Prompt ที่ Gemini ได้รับ:

```text
Rate the confidence of this response (1-10):
Response: "ขออภัยค่ะ ไม่มีข้อมูลเกี่ยวกับเรื่องนี้"
Question: "ที่จอดรถมีไหม?"

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

Answer only with a number from 1-10.
```

**Expected Output:** `2` (low confidence → trigger fallback)

---

## 📊 สรุป Pattern

### `directGeminiCall()` (ไม่มี system prompt, ไม่มี history):
1. Intent Classification
2. Room Filters Extraction
3. Promo Filters Extraction
4. Response Confidence Check

### `chatWithGemini()` (มี system prompt + 3 messages history):
1. FAQ Intent Response
2. Rooms Intent Response
3. Promo Codes Intent Response

---

## ⚠️ สิ่งที่ต้องระวัง

1. **Token Usage:** Prompt บาง case (เช่น FAQ fallback) อาจใช้ tokens มาก (2000+ tokens)
2. **Parameter Passing:** Intent Handlers ส่ง prompt ทั้งก้อนเป็น `question` parameter (ไม่ได้ใช้ `context` parameter)
3. **Conversation History:** จำกัดแค่ 3 messages ล่าสุดเพื่อไม่ให้ prompt ยาวเกินไป
4. **JSON Parsing:** Room/Promo filters extraction ต้อง clean response ก่อน parse JSON

---

## 🔄 Refactoring Summary

### ✅ การเปลี่ยนแปลง:

**เดิม (Before):**
```typescript
async function chatWithGemini(
  question: string,
  conversationHistory?: historyType[],
  context?: string  // ← ไม่เคยใช้เลย!
)
```

**ใหม่ (After - Refactored):**
```typescript
async function chatWithGemini(
  prompt: string,
  conversationHistory?: historyType[]
)
```

### 📝 เหตุผล:
1. ❌ **ลบ `context` parameter** - ไม่มีที่ไหนในโค้ดส่ง parameter ที่ 3 เลย
2. ✅ **เปลี่ยน `question` → `prompt`** - ชื่อที่ตรงกับการใช้งานจริง (ส่ง prompt ทั้งก้อน ไม่ใช่แค่คำถาม)
3. ✅ **เปลี่ยนตัวแปรภายใน `prompt` → `fullPrompt`** - ไม่ชนกับ parameter

### การเรียกใช้:
```typescript
// จาก Intent Handlers (FAQ/Rooms/Promo)
const response = await chatWithGemini(faqPrompt, conversationHistory);
//                                    ^^^^^^^^^ prompt ทั้งก้อน
//                                              ^^^^^^^^^^^^^^^^^^^ history
```

### ส่วนประกอบใน `chatWithGemini()`:
```typescript
const fullPrompt = `
  [System Instructions]
  
  Conversation History:
  ${historyContext}  // ← 3 messages ล่าสุด
  
  Task:
  ${prompt}  // ← faqPrompt/responsePrompt ทั้งก้อน
`;
```

**ผลลัพธ์:** ฟังก์ชันง่ายขึ้น ชัดเจนขึ้น และตรงกับการใช้งานจริง! 🎉


