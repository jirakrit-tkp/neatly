# Chatbot Session Cleanup System

ระบบทำความสะอาด sessions ของ anonymous users ที่ไม่ active เกิน 12 ชั่วโมง

## API Endpoints

### 1. Manual Cleanup
```
POST /api/chat/cleanup-anon-sessions
```

**Description:** ลบ sessions ของ anonymous users ที่ไม่ active เกิน 12 ชั่วโมง

**Response:**
```json
{
  "success": true,
  "message": "Anonymous sessions cleanup completed",
  "deletedSessions": 5,
  "deletedMessages": 25,
  "deletedTickets": 0,
  "cleanupTime": "2024-01-15T10:30:00.000Z"
}
```

### 2. Scheduled Cleanup
```
POST /api/chat/scheduled-cleanup
```

**Description:** API สำหรับ cron job ที่จะเรียกใช้ cleanup อัตโนมัติ

## Cron Job Configuration

ระบบจะทำความสะอาดทุก 6 ชั่วโมง (0 */6 * * *) ตามการตั้งค่าใน `vercel.json`:

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

## การทำงาน

1. **หาสessions ที่ต้องลบ:**
   - เฉพาะ sessions ที่มี `anonymous_id` (ไม่ใช่ `customer_id`)
   - Sessions ที่ยังมี status = 'active'
   - Sessions ที่สร้างขึ้นมากกว่า 12 ชั่วโมงแล้ว

2. **ลบข้อมูลที่เกี่ยวข้อง:**
   - ลบข้อความใน `chatbot_messages` ที่เกี่ยวข้อง
   - ลบ tickets ใน `chatbot_tickets` ที่เกี่ยวข้อง (ถ้ามี)

3. **อัปเดต session status:**
   - เปลี่ยน status เป็น 'closed'
   - ตั้งค่า `closed_at` เป็นเวลาปัจจุบัน

## การทดสอบ

### ทดสอบ Manual Cleanup
```bash
curl -X POST http://localhost:3000/api/chat/cleanup-anon-sessions \
  -H "Content-Type: application/json"
```

### ทดสอบ Scheduled Cleanup
```bash
curl -X POST http://localhost:3000/api/chat/scheduled-cleanup \
  -H "Content-Type: application/json"
```

## หมายเหตุ

- ระบบจะไม่ลบ sessions ของ logged-in users (`customer_id`)
- เฉพาะ anonymous sessions (`anonymous_id`) เท่านั้นที่จะถูกลบ
- การลบจะทำแบบ cascade (ลบ messages และ tickets ที่เกี่ยวข้องด้วย)
- Sessions จะถูกเปลี่ยนเป็น 'closed' แทนการลบเพื่อเก็บประวัติ
