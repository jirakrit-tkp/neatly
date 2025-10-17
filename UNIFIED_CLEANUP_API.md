# Unified Chatbot Cleanup API

API เดียวที่รวมการทำความสะอาดทั้งแบบ manual และ auto สำหรับระบบ chatbot

## API Endpoint

```
POST /api/chat/cleanup
```

## การใช้งาน

### 1. Manual Cleanup (ลบ session ที่ระบุ)

**สำหรับ:** ผู้ใช้ลบประวัติแชทใน session ปัจจุบัน

```json
{
  "mode": "manual",
  "sessionId": "uuid-of-session"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "manual",
  "sessionId": "uuid-of-session",
  "deletedMessages": 15,
  "deletedTickets": 2,
  "message": "Session cleaned up successfully"
}
```

**การทำงาน:**
- ลบข้อความทั้งหมดใน `chatbot_messages`
- ลบ tickets ทั้งหมดใน `chatbot_tickets`
- ลบ session ทั้งหมดใน `chatbot_sessions`

### 2. Auto Cleanup (ลบ anonymous sessions เก่า)

**สำหรับ:** Cron job ทำความสะอาดอัตโนมัติ

```json
{
  "mode": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "auto",
  "message": "Anonymous sessions cleanup completed",
  "deletedSessions": 5,
  "deletedMessages": 25,
  "deletedTickets": 0,
  "cleanupTime": "2024-01-15T10:30:00.000Z"
}
```

**การทำงาน:**
- หา anonymous sessions ที่ไม่ active เกิน 12 ชั่วโมง
- ลบข้อความและ tickets ที่เกี่ยวข้อง
- ลบ sessions ทั้งหมด

## Cron Job Configuration

```json
{
  "crons": [
    {
      "path": "/api/chat/scheduled-cleanup",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## การทดสอบ

### ทดสอบ Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/chat/cleanup \
  -H "Content-Type: application/json" \
  -d '{"mode": "manual", "sessionId": "your-session-id"}'
```

### ทดสอบ Auto Cleanup
```bash
curl -X POST http://localhost:3000/api/chat/cleanup \
  -H "Content-Type: application/json" \
  -d '{"mode": "auto"}'
```

## Migration จาก API เก่า

### เปลี่ยนจาก clear-messages
```javascript
// เก่า
fetch('/api/chat/clear-messages', {
  method: 'POST',
  body: JSON.stringify({ sessionId })
});

// ใหม่
fetch('/api/chat/cleanup', {
  method: 'POST',
  body: JSON.stringify({ mode: 'manual', sessionId })
});
```

### เปลี่ยนจาก cleanup-anon-sessions
```javascript
// เก่า
fetch('/api/chat/cleanup-anon-sessions', {
  method: 'POST'
});

// ใหม่
fetch('/api/chat/cleanup', {
  method: 'POST',
  body: JSON.stringify({ mode: 'auto' })
});
```

## ข้อดีของการรวม API

1. **ลดความซ้ำซ้อน:** ใช้โค้ดเดียวกันสำหรับการลบข้อมูล
2. **ง่ายต่อการบำรุงรักษา:** แก้ไขที่เดียวได้ผลทุกที่
3. **Consistent behavior:** การทำงานเหมือนกันทุกโหมด
4. **Better logging:** Log แบบเดียวกันทุกการทำงาน
5. **Unified response format:** Response structure เหมือนกัน

## หมายเหตุ

- **Manual mode:** ต้องระบุ `sessionId`
- **Auto mode:** ไม่ต้องระบุ `sessionId` (ระบบจะหาเอง)
- **Complete deletion:** ทั้งสองโหมดจะลบ session ทั้งหมด (ไม่ใช่แค่ปิด)
- **Session validation:** ระบบจะตรวจสอบ session status ก่อนอนุญาตให้ส่งข้อความ
- **Compatibility:** ยังคงรองรับ API เก่าได้ (แต่แนะนำให้ใช้ API ใหม่)

## Security Improvements

- **Session validation:** เพิ่มการตรวจสอบ session status ใน `messages.ts` และ `bot-response.ts`
- **Prevent ghost sessions:** ป้องกันการส่งข้อความใน session ที่ไม่มีอยู่แล้ว
- **Complete cleanup:** ลบ session ทั้งหมดแทนการปิดเพื่อความปลอดภัย
