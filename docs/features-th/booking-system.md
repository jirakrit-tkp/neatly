# ฟีเจอร์: ระบบจองและชำระเงิน

## 1. ภาพรวม

ระบบจองและชำระเงินจัดการวงจรชีวิตการจองห้องพักและธุรกรรมทางการเงินของโรงแรมอย่างครบวงจร ตั้งแต่การเลือกห้องและตรวจสอบห้องว่างไปจนถึงการประมวลผลการชำระเงินและยืนยันการจอง รวมการจัดการการจองเข้ากับ payment gateway ของ Stripe อย่างราบรื่นเพื่อให้ประสบการณ์การจองที่ปลอดภัยแบบครบวงจร

**วัตถุประสงค์:**
- ให้ลูกค้าค้นหาและจองห้องพักโรงแรมได้
- จัดการห้องว่างและป้องกันการจองซ้อนทับ
- คำนวณราคาพร้อมคำขอพิเศษและโปรโมชัน
- **ประมวลผลการชำระเงินที่ปลอดภัยผ่าน Stripe หรือรับชำระเงินสด**
- **เชื่อมโยงการชำระเงินกับการจองและอัปเดตสถานะอัตโนมัติ**
- จัดการการแก้ไขและยกเลิกการจอง
- ติดตามวงจรชีวิตสถานะการจอง (รอดำเนินการ → ยืนยัน → เช็คอิน → เสร็จสิ้น/ยกเลิก)
- **จัดการวงจรชีวิตการชำระเงิน (รอดำเนินการ → เสร็จสิ้น → คืนเงิน)**
- รองรับหลายห้องและจำนวนแขกหลายท่าน
- **ประมวลผลการคืนเงินสำหรับการจองที่ยกเลิก**

**ฟีเจอร์หลัก:**

**การจอง:**
- **ตรวจสอบห้องว่างแบบเรียลไทม์**: ป้องกันการจองที่ขัดแย้ง
- **ราคาแบบไดนามิก**: ราคาฐาน, ราคาโปรโมชัน, คำขอพิเศษ, โค้ดส่วนลด
- **คำขอพิเศษที่ยืดหยุ่น**: แบบมาตรฐาน (ฟรี) และแบบเสียค่าใช้จ่าย
- **นโยบายยกเลิกภายใน 24 ชั่วโมง**: แขกสามารถยกเลิกได้ถ้า >24 ชั่วโมงก่อนเช็คอิน
- **ติดตามสถานะ**: การจัดการวงจรชีวิตการจองแบบเต็มรูปแบบ
- **รองรับหลายห้อง**: จองหลายห้องประเภทเดียวกันในธุรกรรมเดียว

**การชำระเงิน:**
- **การรวมระบบ Stripe**: ประมวลผลบัตรเครดิตอย่างปลอดภัย (โหมดทดสอบ)
- **รองรับบัตรทดสอบ**: ตรวจสอบบัตรทดสอบ Stripe สำหรับการพัฒนา
- **การจำลองการชำระเงิน**: จำลองสถานการณ์สำเร็จ/ล้มเหลว
- **ตัวเลือกชำระเงินสด**: ชำระเงินเมื่อมาถึงโรงแรม
- **อัปเดตสถานะอัตโนมัติ**: ยืนยันการจองเมื่อชำระเงินสำเร็จ
- **การประมวลผลการคืนเงิน**: จัดการการคืนเงินสำหรับการยกเลิก
- **ข้อมูลเมตาการชำระเงิน**: เก็บข้อมูลบัตร (3 หลักสุดท้าย, เจ้าของ, วันหมดอายุ)

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการสร้างการจอง
```
ผู้ใช้เลือกห้อง + วันที่ → การตรวจสอบฝั่ง Frontend
  → ขั้นตอนที่ 1: ตรวจสอบข้อมูลการจอง
    ├─ ตรวจสอบข้อมูลแขก (ชื่อ, อีเมล, เบอร์โทร)
    ├─ ตรวจสอบช่วงวันที่ (วันเช็คอิน < วันเช็คเอาท์, ไม่อยู่ในอดีต)
    └─ ตรวจสอบจำนวนแขก
  → ขั้นตอนที่ 2: ตรวจสอบห้องว่าง
    ├─ Query สถานะห้อง (ต้องเป็น Vacant/Clean/Active)
    └─ ตรวจสอบการจองที่ขัดแย้งที่ยืนยันแล้ว
  → ขั้นตอนที่ 3: คำนวณจำนวนเงินรวม
    ├─ ราคาฐาน (ใช้ promotion_price ถ้ามี)
    ├─ คูณด้วยจำนวนคืนและจำนวนห้อง
    ├─ บวกคำขอพิเศษ (ที่เสียค่าใช้จ่ายเท่านั้น)
    └─ ใช้ส่วนลดจากโค้ดส่วนลด (ถ้ามี)
  → ขั้นตอนที่ 4: สร้างบันทึกการจอง
    ├─ แทรกลงในตาราง bookings (สถานะ: pending)
    └─ ส่งคืน booking ID
  → ขั้นตอนที่ 5: กระบวนการชำระเงิน
    ├─ ผู้ใช้ชำระเงิน (บัตรเครดิต หรือ เงินสด)
    └─ อัปเดตสถานะการจองเป็น confirmed
```

### ตรรกะการตรวจสอบห้องว่าง
```sql
-- ห้องว่างถ้า:
1. Room.is_active = true
2. Room.status IN ('Vacant', 'Vacant Clean', 'Vacant Clean Inspected', 'Vacant Clean Pick Up')
3. ไม่มีการจองที่ยืนยันแล้วที่ทับซ้อนกับวันที่ที่ร้องขอ:
   NOT EXISTS (
     SELECT 1 FROM bookings 
     WHERE room_id = :roomId 
     AND status = 'Confirmed'
     AND check_in_date < :checkOut 
     AND check_out_date > :checkIn
   )
```

### ลำดับการยกเลิกการจอง
```
ผู้ใช้ร้องขอยกเลิก → ตรวจสอบสถานะการจอง
  → ตรวจสอบคุณสมบัติการยกเลิก (>24h ก่อนเช็คอิน)
  → อัปเดตสถานะการจองเป็น 'Cancelled'
  → กระตุ้นการคืนเงิน (ถ้าชำระเงินเสร็จสิ้นแล้ว)
  → ปล่อยห้องให้ว่าง
```

### ลำดับการประมวลผลการชำระเงิน

#### การชำระเงินด้วยบัตรเครดิต (Stripe)
```
การจองที่สร้าง (สถานะ: Pending) → ผู้ใช้ป้อนรายละเอียดบัตร
  → ขั้นตอนที่ 1: สร้างบันทึกการชำระเงิน
    ├─ แทรก payment (สถานะ: pending, วิธีการ: Credit Card)
    └─ ส่งคืน payment ID
  → ขั้นตอนที่ 2: ประมวลผล Stripe Payment
    ├─ ตรวจสอบบัตรทดสอบ (ตรวจสอบว่าเป็นบัตรทดสอบ Stripe ที่ถูกต้อง)
    ├─ จำลองการประมวลผลการชำระเงิน (สำเร็จ/ล้มเหลวตามบัตร)
    ├─ อัปเดต payment: stripe_payment_id, status (completed/failed)
    └─ เก็บข้อมูลเมตาของบัตร (3 หลักสุดท้าย, ประเภทบัตร, เจ้าของ)
  → ขั้นตอนที่ 3: อัปเดตสถานะการจอง
    ├─ ถ้าชำระเงินสำเร็จ → สถานะการจอง = 'Confirmed'
    └─ ถ้าชำระเงินล้มเหลว → สถานะการจองยังคงเป็น 'Pending'
  → ส่งคืน: ผลการชำระเงิน
```

#### การชำระเงินสด
```
การจองที่สร้าง (สถานะ: Pending) → ผู้ใช้เลือกชำระเงินสด
  → ขั้นตอนที่ 1: สร้างบันทึกการชำระเงิน
    ├─ แทรก payment (สถานะ: pending, วิธีการ: Cash)
    └─ ส่งคืน payment ID
  → ขั้นตอนที่ 2: ประมวลผลการชำระเงินสด
    ├─ อัปเดตสถานะการชำระเงินเป็น 'Pending' (รอเช็คอิน)
    └─ อัปเดตสถานะการจองเป็น 'Confirmed'
  → แขกชำระเงินสดเมื่อเช็คอิน
  → เจ้าหน้าที่อัปเดตสถานะการชำระเงินเป็น 'Completed'
```

#### ลำดับการคืนเงิน
```
ผู้ใช้ยกเลิกการจอง → ตรวจสอบคุณสมบัติการยกเลิก
  → ขั้นตอนที่ 1: รับรายละเอียดการชำระเงิน
  → ขั้นตอนที่ 2: ตรวจสอบคุณสมบัติการคืนเงิน
    └─ การชำระเงินต้องอยู่ในสถานะ 'Completed'
  → ขั้นตอนที่ 3: ประมวลผลการคืนเงิน
    ├─ อัปเดตสถานะการชำระเงินเป็น 'Refunded'
    └─ อัปเดตสถานะการจองเป็น 'Cancelled'
  → (ใน production: เรียก Stripe refund API)
```

---

## 3. เทคโนโลยีและไลบรารี

### การจัดการการจอง

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Supabase Database** | เก็บการจองและการชำระเงินอย่างถาวร | - PostgreSQL (ACID compliance)<br>- รวมระบบ auth ในตัว<br>- การสมัครรับข้อมูลแบบเรียลไทม์<br>- สร้าง REST API อัตโนมัติ | เก็บ bookings/payments ใน PostgreSQL → PostgREST สร้าง API → JavaScript SDK query ด้วย type-safety Transactions ประกันความสอดคล้องของข้อมูลระหว่าง bookings และ payments |
| **date-fns** | การคำนวณและตรวจสอบวันที่ | - แบบโมดูล (tree-shakeable)<br>- Immutable API (ปลอดภัยกว่า)<br>- รองรับ TypeScript<br>- เล็กกว่า Moment.js (เล็กกว่า 69%) | ฟังก์ชันบริสุทธิ์สำหรับวันที่ → `differenceInDays(checkOut, checkIn)` คำนวณจำนวนคืน → ไม่มีการเปลี่ยนแปลง timezone → import เฉพาะฟังก์ชันที่ต้องการ (ลดขนาด bundle) |
| **React Hook Form** | การจัดการสถานะฟอร์ม | - ประสิทธิภาพ (re-render น้อยกว่า)<br>- มีการตรวจสอบในตัว<br>- รองรับ TypeScript<br>- 8.6KB gzipped (vs Formik 15KB) | ลงทะเบียน inputs → ติดตามการเปลี่ยนแปลงด้วย refs (ไม่ใช่ state) → ตรวจสอบเมื่อ submit/blur → Re-render น้อยที่สุด (เฉพาะข้อความ error อัปเดต) |
| **Zod** | การตรวจสอบ schema | - TypeScript-first (infer types)<br>- Composable schemas<br>- ความปลอดภัยของ type ขณะ runtime<br>- ข้อความ error ดีกว่า Yup | กำหนด schema → `bookingSchema.parse(data)` → ตรวจสอบขณะ runtime → Throw ถ้าไม่ถูกต้อง → TypeScript infer type จาก schema อัตโนมัติ |

### การประมวลผลการชำระเงิน

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Stripe.js** | จัดการบัตรฝั่ง Frontend | - PCI-compliant (จัดการข้อมูลละเอียดอ่อน)<br>- ไม่มีข้อมูลบัตรที่เซิร์ฟเวอร์ของคุณ<br>- Tokenization ในตัว<br>- มาตรฐานอุตสาหกรรม | ผู้ใช้ป้อนบัตร → Stripe.js ทำ tokenize → สร้าง PaymentMethod → ส่งคืน token → ส่ง token ไปยัง backend (ไม่ใช่ข้อมูลบัตรดิบ) |
| **@stripe/stripe-js** | Stripe SDK loader | - โหลดแบบ async (ไม่บล็อก render)<br>- แพ็กเกจ Stripe อย่างเป็นทางการ<br>- Type-safe<br>- แคช Stripe.js instance | โหลด Stripe.js script → สร้าง object `stripe` → `loadStripe(publishableKey)` → ส่งคืน promise → ใช้สำหรับสร้าง payment methods |
| **stripe (Node SDK)** | การดำเนินการชำระเงิน Backend | - Stripe SDK อย่างเป็นทางการสำหรับ Node.js<br>- จัดการการยืนยันตัวตน<br>- มี retry logic ในตัว<br>- รองรับ Idempotency | ยืนยันตัวตนด้วย secret key → เรียก Stripe API (create payment intent, refund, etc.) → จัดการ webhooks → ส่งคืนคำตอบที่มีโครงสร้าง |

### บริการตรรกะทางธุรกิจ

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **BookingService** | ตรรกะทางธุรกิจการจอง | - แยกความกังวล<br>- ใช้ซ้ำได้ใน API routes<br>- การตรวจสอบแบบรวมศูนย์<br>- ทดสอบง่ายขึ้น | Class พร้อม static methods → `BookingService.createBooking(data)` → ตรวจสอบ → ตรวจสอบห้องว่าง → คำนวณราคา → แทรกลง DB |
| **PaymentService** | ตรรกะทางธุรกิจการชำระเงิน | - ห่อหุ้มตรรกะการชำระเงิน<br>- รวมกับ Stripe<br>- เชื่อมโยงกับ BookingService<br>- จัดการการคืนเงิน | Class พร้อม static methods → `PaymentService.processStripePayment(id, card)` → ตรวจสอบบัตร → เรียก Stripe → อัปเดตสถานะการชำระเงิน → อัปเดตสถานะการจอง |
| **PromotionService** | ตรรกะโค้ดส่วนลด | - ตรวจสอบโค้ดส่วนลด<br>- คำนวณส่วนลด<br>- ติดตามการใช้งาน<br>- บังคับใช้ขีดจำกัด | Query ตาราง promo_codes → ตรวจสอบหมดอายุ/ใช้งาน/การใช้ → คำนวณส่วนลด (คงที่หรือ %) → เพิ่ม used_count → ส่งคืนจำนวนส่วนลด |

---

## 4. ตรรกะหลัก

### 4.1 การสร้างการจอง (BookingService.createBooking)

```typescript
async createBooking(bookingData: BookingFormData):
  // 1. ยืนยันตัวตนผู้ใช้
  รับผู้ใช้ปัจจุบันจาก Supabase Auth
  ถ้าไม่ได้ยืนยันตัวตน → ส่งคืน error
  
  // 2. ตรวจสอบข้อมูลการจอง
  validateBookingData(bookingData)
  ├─ ตรวจสอบฟิลด์ที่ต้องการ (ข้อมูลแขก, วันที่)
  ├─ ตรวจสอบช่วงวันที่ (เช็คอิน < เช็คเอาท์, ไม่อยู่ในอดีต)
  └─ ตรวจสอบจำนวนแขก (>= 1)
  
  // 3. ตรวจสอบห้องว่าง
  isAvailable = checkRoomAvailability(roomId, checkIn, checkOut)
  ถ้าไม่ว่าง → ส่งคืน error
  
  // 4. คำนวณราคา
  nights = calculateNights(checkIn, checkOut)
  basePrice = roomInfo.promotion_price || roomInfo.price
  specialRequestsTotal = sum(คำขอพิเศษที่เลือกและมีราคา)
  subtotal = (basePrice * nights * roomCount) + specialRequestsTotal
  
  // 5. ใช้โค้ดส่วนลด (ถ้ามี)
  ถ้ามี promoCode:
    promoDiscount = getPromoDiscountFromDatabase(promoCode, subtotal)
    ถ้าโค้ดส่วนลดไม่ถูกต้อง → ส่งคืน error
  ไม่เช่นนั้น:
    promoDiscount = 0
  
  finalTotal = subtotal - promoDiscount
  
  // 6. สร้างบันทึกการจอง
  แทรกลง bookings:
    room_id, customer_id, check_in_date, check_out_date,
    total_amount, status='Pending', promo_code, room_count, guest_count,
    special_requests, standard_request, additional_request, payment_method
  
  ส่งคืน: booking object
```

### 4.2 การตรวจสอบห้องว่าง

```typescript
async checkRoomAvailability(roomId, checkIn, checkOut):
  // ขั้นตอนที่ 1: ตรวจสอบสถานะห้องและธง active
  room = SELECT status, is_active FROM rooms WHERE id = roomId
  
  ถ้าไม่พบห้อง หรือ !room.is_active → ส่งคืน false
  
  availableStatuses = ['Vacant', 'Vacant Clean', 'Vacant Clean Inspected', 'Vacant Clean Pick Up']
  ถ้า room.status ไม่อยู่ใน availableStatuses → ส่งคืน false
  
  // ขั้นตอนที่ 2: ตรวจสอบการจองที่ขัดแย้ง
  conflictingBookings = SELECT * FROM bookings
    WHERE room_id = roomId
    AND status = 'Confirmed'
    AND check_in_date < checkOut
    AND check_out_date > checkIn
  
  ถ้า conflictingBookings.length > 0 → ส่งคืน false
  
  ส่งคืน true (ห้องว่าง)
```

### 4.3 การคำนวณราคา

```typescript
function calculateBookingTotal(
  basePrice: number,
  nights: number,
  specialRequests: SpecialRequest[],
  roomCount: number,
  promoDiscount: number
):
  // ต้นทุนห้องพักฐาน
  roomTotal = basePrice * nights * roomCount
  
  // คำขอพิเศษ (เฉพาะที่เสียค่าใช้จ่าย)
  specialRequestsTotal = specialRequests
    .filter(req => req.selected && req.type === 'special' && req.price)
    .reduce((sum, req) => sum + (req.calculated_price || req.price), 0)
  
  // ยอดรวมก่อนส่วนลด
  subtotal = roomTotal + specialRequestsTotal
  
  // ใช้ส่วนลด
  finalTotal = Math.max(0, subtotal - promoDiscount)
  
  ส่งคืน {
    nights,
    basePrice,
    roomTotal,
    specialRequestsTotal,
    subtotal,
    promoDiscount,
    total: finalTotal
  }
```

### 4.4 นโยบายการยกเลิก

```typescript
function canCancelBooking(checkInDate, createdAt):
  now = new Date()
  checkIn = new Date(checkInDate)
  
  hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60)
  
  // สามารถยกเลิกได้ถ้ามากกว่า 24 ชั่วโมงก่อนเช็คอิน
  ส่งคืน hoursUntilCheckIn > 24
```

### 4.5 การสร้างการชำระเงิน (PaymentService)

```typescript
async createPayment(
  bookingId: string,
  amount: number,
  paymentMethod: 'Credit Card' | 'Cash',
  cardDetails?: { cardNumber, cardOwner, expiryDate, cvc }
):
  // 1. ตรวจสอบข้อมูลการชำระเงิน
  validatePaymentData(amount, paymentMethod, cardDetails)
  ├─ Amount ต้อง > 0
  ├─ ถ้าบัตรเครดิต: ตรวจสอบฟิลด์บัตร (หมายเลข, เจ้าของ, หมดอายุ, CVC)
  └─ ส่งคืน errors ถ้าการตรวจสอบล้มเหลว
  
  // 2. เตรียมบันทึกการชำระเงิน
  paymentData = {
    booking_id: bookingId,
    amount: amount,
    payment_method: paymentMethod,
    status: 'Pending'
  }
  
  // 3. เพิ่มข้อมูลเมตาของบัตร (ถ้าเป็นบัตรเครดิต)
  ถ้า paymentMethod === 'Credit Card':
    paymentData.card_last_three = cardNumber.slice(-3)
    paymentData.meta = { card_owner, expiry_date }
  
  // 4. แทรกบันทึกการชำระเงิน
  แทรกลงในตาราง payments
  
  ส่งคืน: payment object
```

### 4.6 การประมวลผล Stripe Payment

```typescript
async processStripePayment(
  paymentId, cardNumber, cardOwner, expiryDate, cvc
):
  // 1. ตรวจสอบบัตรทดสอบ
  cardValidation = StripeService.validateTestCard(cardNumber)
  ถ้าไม่ใช่บัตรทดสอบ Stripe ที่ถูกต้อง → ส่งคืน error
  
  // 2. รับบันทึกการชำระเงิน
  payment = SELECT * FROM payments WHERE id = paymentId
  ถ้าไม่พบ → ส่งคืน error
  
  // 3. จำลองการชำระเงิน Stripe
  simulationResult = StripeService.simulatePayment(cardNumber, amount)
  
  // 4a. การชำระเงินล้มเหลว
  ถ้า simulationResult.success === false:
    อัปเดต payments:
      status = 'Failed',
      stripe_payment_id = 'pi_failed_' + timestamp,
      meta = { error, card_info }
    ส่งคืน: { success: false, error }
  
  // 4b. การชำระเงินสำเร็จ
  อัปเดต payments:
    status = 'Completed',
    stripe_payment_id = simulationResult.paymentIntentId,
    paid_at = NOW(),
    meta = { card_info, processed_at }
  
  // 5. อัปเดตสถานะการจองเป็น Confirmed
  อัปเดต bookings SET status = 'Confirmed' WHERE id = payment.booking_id
  
  ส่งคืน: { success: true, data: payment }
```

**บัตรทดสอบ Stripe (StripeService):**
```typescript
const STRIPE_TEST_CARDS = {
  // ✅ บัตรสำเร็จ
  VISA_SUCCESS: '4242424242424242',
  MASTERCARD_SUCCESS: '5555555555554444',
  AMEX_SUCCESS: '378282246310005',
  
  // ❌ บัตรล้มเหลว
  DECLINED: '4000000000000002',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119',
  INSUFFICIENT_FUNDS: '4000000000009995'
};

function validateTestCard(cardNumber: string):
  cleanNumber = cardNumber.replace(/\s/g, '')
  
  ถ้า cleanNumber อยู่ใน STRIPE_TEST_CARDS:
    ส่งคืน { isValid: true, info: getTestCardInfo(cleanNumber) }
  ไม่เช่นนั้น:
    ส่งคืน { isValid: false, error: 'บัตรทดสอบไม่ถูกต้อง' }

function simulatePayment(cardNumber: string, amount: number):
  cardInfo = getTestCardInfo(cardNumber)
  
  // จำลองผลลัพธ์ที่แตกต่างกันตามบัตร
  ถ้า cardNumber === DECLINED:
    ส่งคืน { success: false, error: 'บัตรของคุณถูกปฏิเสธ' }
  
  ถ้า cardNumber === INSUFFICIENT_FUNDS:
    ส่งคืน { success: false, error: 'เงินไม่พอ' }
  
  ถ้า cardNumber อยู่ใน SUCCESS_CARDS:
    ส่งคืน { 
      success: true, 
      paymentIntentId: 'pi_test_' + randomId()
    }
```

### 4.7 การประมวลผลการชำระเงินสด

```typescript
async processCashPayment(paymentId: string):
  // 1. อัปเดตสถานะการชำระเงิน (รอเงินสดเมื่อมาถึง)
  อัปเดต payments SET status = 'Pending' WHERE id = paymentId
  
  // 2. ยืนยันการจอง (การชำระเงินสดได้รับการยืนยันล่วงหน้า)
  payment = SELECT * FROM payments WHERE id = paymentId
  อัปเดต bookings SET status = 'Confirmed' WHERE id = payment.booking_id
  
  ส่งคืน: { success: true, message: 'บันทึกการชำระเงินสดแล้ว' }
```

### 4.8 การประมวลผลการคืนเงิน

```typescript
async refundPayment(paymentId: string):
  // 1. รับรายละเอียดการชำระเงิน
  payment = SELECT * FROM payments WHERE id = paymentId
  ถ้าไม่พบ → ส่งคืน error
  
  // 2. ตรวจสอบคุณสมบัติการคืนเงิน
  ถ้า payment.status !== 'Completed':
    ส่งคืน error: 'เฉพาะการชำระเงินที่เสร็จสิ้นเท่านั้นที่สามารถคืนเงินได้'
  
  // 3. อัปเดตสถานะการชำระเงิน
  อัปเดต payments SET status = 'Refunded' WHERE id = paymentId
  
  // 4. อัปเดตสถานะการจอง
  อัปเดต bookings SET status = 'Cancelled' WHERE id = payment.booking_id
  
  // TODO: ใน production เรียก Stripe refund API
  // stripe.refunds.create({ payment_intent: payment.stripe_payment_id })
  
  ส่งคืน: { success: true, data: updatedPayment }
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ตาราง: `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- รายละเอียดการจอง
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_count INTEGER DEFAULT 1,
  guest_count INTEGER NOT NULL,
  
  -- ราคา
  total_amount DECIMAL(10,2) NOT NULL,
  promo_code TEXT,
  
  -- คำขอ
  special_requests JSONB,           -- Add-ons ที่เสียค่าใช้จ่าย: [{ name, price, selected, calculated_price }]
  standard_request TEXT[],          -- Add-ons ฟรี: ['Early check-in', 'Late check-out']
  additional_request TEXT,          -- คำขอเพิ่มเติมแบบข้อความอิสระ
  
  -- การชำระเงิน
  payment_method TEXT,              -- 'Credit Card' | 'Cash'
  
  -- ติดตามสถานะ
  status TEXT DEFAULT 'Pending',    -- 'Pending' | 'Confirmed' | 'Checked-In' | 'Completed' | 'Cancelled'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_guest_count CHECK (guest_count >= 1),
  CONSTRAINT valid_room_count CHECK (room_count >= 1),
  
  -- Indexes
  INDEX idx_customer_bookings ON bookings(customer_id, created_at DESC),
  INDEX idx_room_bookings ON bookings(room_id, check_in_date, check_out_date),
  INDEX idx_booking_status ON bookings(status)
);
```

### ตาราง: `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  
  -- รายละเอียดการชำระเงิน
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,          -- 'Credit Card' | 'Cash'
  
  -- ติดตามสถานะ
  status TEXT DEFAULT 'Pending',         -- 'Pending' | 'Completed' | 'Failed' | 'Refunded'
  
  -- การรวม Stripe
  stripe_payment_id TEXT,                -- Stripe PaymentIntent ID
  
  -- ข้อมูลเมตาของบัตร (สำหรับบัตรเครดิต)
  card_last_three TEXT,                  -- 3 หลักสุดท้าย (สำหรับอ้างอิง)
  meta JSONB,                            -- { card_owner, expiry_date, card_info }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,                   -- เมื่อการชำระเงินเสร็จสิ้น
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('Credit Card', 'Cash')),
  
  -- Indexes
  INDEX idx_booking_payments ON payments(booking_id),
  INDEX idx_payment_status ON payments(status),
  INDEX idx_stripe_payments ON payments(stripe_payment_id)
);
```

### ตาราง: `rooms` (ฟิลด์ที่เกี่ยวข้อง)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  room_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  promotion_price DECIMAL(10,2),    -- ราคาส่วนลด (ใช้ถ้ามีการตั้งค่า)
  guests INTEGER NOT NULL,
  room_size INTEGER,
  bed_type TEXT,
  status TEXT DEFAULT 'Vacant',     -- สถานะการทำความสะอาดห้อง
  is_active BOOLEAN DEFAULT true,   -- พร้อมให้จองหรือไม่?
  amenities TEXT[],
  main_image_url TEXT[],
  gallery_images TEXT[]
);
```

### ความสัมพันธ์
```
bookings (1) ←→ (*) payments
  - payment.booking_id → bookings.id
  - การจองหนึ่งรายการสามารถมีความพยายามชำระเงินหลายครั้ง
  - มีเพียงหนึ่งการชำระเงิน 'Completed' ต่อการจอง

bookings (*) ←→ (1) rooms
  - booking.room_id → rooms.id
  - การจองหลายรายการสามารถอ้างถึงห้องเดียวกัน (วันที่ต่างกัน)
```

### วงจรชีวิตสถานะการชำระเงิน
```
┌─────────┐     สำเร็จ      ┌───────────┐     คืนเงิน     ┌──────────┐
│ รอ │ ───────────────> │ เสร็จสิ้น │ ─────────────> │ คืนเงินแล้ว │
└─────────┘                  └───────────┘                └──────────┘
     │                             ↑
     │ ล้มเหลว                     │
     ↓                             │
┌────────┐                         │
│ ล้มเหลว │                         │
└────────┘                         │
                                   │
Triggers:                          │
- Completed → สถานะการจอง = 'Confirmed'
- Refunded → สถานะการจอง = 'Cancelled'
```

### วงจรชีวิตสถานะการจอง
```
┌─────────┐     การชำระเงิน     ┌───────────┐     เช็คอิน    ┌────────────┐
│ รอ │ ──────────────> │ ยืนยัน │ ──────────────> │ เช็คอินแล้ว │
└─────────┘                 └───────────┘                 └────────────┘
     │                           │                               │
     │ ยกเลิก                    │ ยกเลิก (>24h)                 │ เช็คเอาท์
     ↓                           ↓                               ↓
┌───────────┐             ┌───────────┐                 ┌───────────┐
│ ยกเลิกแล้ว │             │ ยกเลิกแล้ว │                 │ เสร็จสิ้น │
└───────────┘             └───────────┘                 └───────────┘
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว

#### การจอง
1. **การตรวจสอบวันที่**: ป้องกันวันเช็คอินในอดีต, เช็คเอาท์ก่อนเช็คอิน
2. **การป้องกันการจองซ้อน**: ตรวจสอบทั้งสถานะห้องและการจองที่ขัดแย้ง
3. **ห้องที่ไม่ทำงาน**: ห้องที่มี `is_active=false` ไม่สามารถจองได้
4. **การตรวจสอบสถานะห้อง**: เฉพาะสถานะ "Vacant" เท่านั้นที่จองได้
5. **การตรวจสอบโค้ดส่วนลด**: ตรวจสอบหมดอายุ, ขีดจำกัดการใช้, สถานะใช้งาน
6. **การยกเลิก 24 ชั่วโมง**: บังคับใช้นโยบายเพื่อป้องกันการยกเลิกนาทีสุดท้าย
7. **ลำดับความสำคัญของราคาโปรโมชัน**: ใช้ `promotion_price` แทน `price` เมื่อมี
8. **ราคาหลายห้อง**: คำนวณยอดรวมสำหรับหลายห้องอย่างถูกต้อง

#### การชำระเงิน
9. **การตรวจสอบบัตรทดสอบ**: ยอมรับเฉพาะบัตรทดสอบ Stripe ที่ถูกต้อง
10. **การติดตามสถานะการชำระเงิน**: เชื่อมโยงสถานะการชำระเงินกับการยืนยันการจอง
11. **การจัดการการชำระเงินล้มเหลว**: เก็บการจองเป็น 'Pending' ถ้าการชำระเงินล้มเหลว
12. **คุณสมบัติการคืนเงิน**: อนุญาตให้คืนเงินเฉพาะการชำระเงินที่เสร็จสิ้น
13. **การเก็บข้อมูลเมตาของบัตร**: เก็บ 3 หลักสุดท้าย + ชื่อเจ้าของ (ไม่เคยบัตรเต็ม)
14. **การยืนยันการชำระเงินสด**: ยืนยันการจองอัตโนมัติด้วยการชำระเงินสด
15. **ความพยายามชำระเงินหลายครั้ง**: อนุญาตให้ลองใหม่ถ้าการชำระเงินครั้งแรกล้มเหลว

### ข้อจำกัดปัจจุบัน

#### ระบบจอง
1. **ไม่มีการยกเลิกบางส่วน**: ไม่สามารถยกเลิกบางห้องในการจองหลายห้อง
2. **ไม่มีการแก้ไขวันที่**: ไม่สามารถเปลี่ยนวันที่หลังจองแล้ว (ต้องยกเลิก + จองใหม่)
3. **ไม่มีการเปลี่ยนห้อง**: ไม่สามารถเปลี่ยนประเภทห้องหลังสร้างการจอง
4. **ประเภทห้องเดี่ยว**: ไม่สามารถจองหลายประเภทห้องในการจองเดียว
5. **ไม่มีระบบเงินมัดจำ**: ต้องชำระเงินเต็ม (ไม่มีตัวเลือกเงินมัดจำบางส่วน)
6. **นโยบายยกเลิกคงที่**: กฎ 24 ชั่วโมงใช้กับการจองทั้งหมด (ไม่มีความยืดหยุ่น)

#### ระบบการชำระเงิน
7. **โหมดทดสอบเท่านั้น**: ปัจจุบันใช้สภาพแวดล้อมทดสอบของ Stripe (ยังไม่พร้อม production)
8. **บัตรทดสอบเท่านั้น**: ยอมรับเฉพาะบัตรทดสอบ Stripe ที่กำหนดไว้ล่วงหน้า
9. **การเรียก Stripe แบบจำลอง**: การประมวลผลการชำระเงินเป็นการจำลอง (ไม่ใช่การเรียก Stripe API จริง)
10. **ไม่มี Webhook Support**: ไม่มีการใช้ Stripe webhooks สำหรับการอัปเดตการชำระเงิน async
11. **ไม่มีการคืนเงินบางส่วน**: สามารถคืนเงินเฉพาะจำนวนเต็ม (ไม่มีการคืนเงินบางส่วน)
12. **การทำให้เสร็จสิ้นเงินสดด้วยตนเอง**: เจ้าหน้าที่ต้องทำเครื่องหมายการชำระเงินสดเป็น 'Completed' ด้วยตนเอง
13. **ไม่มีการสร้างลิงก์การชำระเงิน**: ไม่สามารถส่งลิงก์การชำระเงินไปยังลูกค้า
14. **การชำระเงินเดียวต่อการจอง**: ไม่สามารถแบ่งการชำระเงินผ่านหลายบัตร

#### อื่นๆ
15. **ไม่มีการจองกลุ่ม**: ไม่มีการจัดการพิเศษสำหรับกลุ่มใหญ่หรืออีเวนต์
16. **ไม่มีโปรแกรมความภักดี**: ไม่มีคะแนน รางวัล หรือส่วนลดสมาชิก

### TODO / การพัฒนาในอนาคต

#### ระบบจอง
- [ ] สร้างการแก้ไขการจอง (เปลี่ยนวันที่, ประเภทห้อง, จำนวนแขก)
- [ ] เพิ่มการชำระเงินบางส่วน / ระบบเงินมัดจำ
- [ ] รองรับการจองหลายประเภทห้องในธุรกรรมเดียว
- [ ] สร้างนโยบายการยกเลิกที่ยืดหยุ่นต่อประเภทห้อง
- [ ] เพิ่มการหมดอายุการจอง (ยกเลิกการจองที่ไม่ชำระเงินหลังจาก X ชั่วโมงอัตโนมัติ)
- [ ] สร้าง waitlist สำหรับวันที่เต็ม
- [ ] เพิ่มการจองซ้ำ (พักรายสัปดาห์/รายเดือน)
- [ ] สร้างส่วนลดการจองกลุ่ม
- [ ] เพิ่มการแจ้งเตือนการจอง (การยืนยันทาง SMS/Email)
- [ ] รองรับบัญชีองค์กร / เครดิตเทอม
- [ ] สร้างค่าเช็คอินเร็ว / เช็คเอาท์สาย (ราคาแบบไดนามิก)
- [ ] เพิ่มการส่งออกประวัติการจอง (ใบเสร็จ PDF)
- [ ] สร้างมุมมองปฏิทินการจองสำหรับลูกค้า
- [ ] เพิ่มฟีเจอร์ "จองอีกครั้ง" สำหรับการจองซ้ำ

#### ระบบการชำระเงิน
- [ ] **เปลี่ยนไปใช้ Stripe Production**: ย้ายจากโหมดทดสอบไปสภาพแวดล้อม live
- [ ] **สร้างการเรียก Stripe API จริง**: แทนที่การจำลองด้วยการประมวลผลการชำระเงินจริง
- [ ] **เพิ่ม Stripe Webhooks**: จัดการเหตุการณ์การชำระเงิน async (สำเร็จ, ล้มเหลว, ข้อพิพาท)
- [ ] **รองรับบัตรเครดิตจริง**: ลบการตรวจสอบบัตรทดสอบ ใช้ tokenization จริง
- [ ] **การคืนเงินบางส่วน**: อนุญาตให้คืนเงินบางส่วนสำหรับค่าบริการ
- [ ] **การชำระเงินแบบแยก**: รองรับการชำระเงินด้วยหลายบัตรหรือวิธีการ
- [ ] **ลิงก์การชำระเงิน**: สร้างลิงก์ที่ปลอดภัยสำหรับการชำระเงินระยะไกล
- [ ] **การติดตามการชำระเงินสดอัตโนมัติ**: รวมกับระบบ POS สำหรับการอัปเดตแบบเรียลไทม์
- [ ] **การสร้างใบเสร็จการชำระเงิน**: สร้างและส่งใบเสร็จ PDF อัตโนมัติ
- [ ] **รองรับสกุลเงิน**: เพิ่มการประมวลผลการชำระเงินหลายสกุลเงิน
- [ ] **แผนการชำระเงิน**: รองรับการชำระเงินแบบผ่อนสำหรับการจองระยะยาว
- [ ] **การยืนยันตัวตน 3D Secure**: เพิ่ม SCA (Strong Customer Authentication) สำหรับบัตร EU
- [ ] **ตรรกะลองชำระเงินใหม่**: ลองชำระเงินที่ล้มเหลวอีกครั้งอัตโนมัติด้วย exponential backoff
- [ ] **การจัดการ Chargeback**: สร้าง workflow การแก้ไขข้อพิพาท

### ปัญหาที่ทราบ

#### ระบบจอง
- **Race Condition**: การจองพร้อมกันสำหรับห้องเดียวกันอาจสำเร็จ (ไม่มีการล็อกระดับแถว)
- **ระยะเวลาโค้ดส่วนลด**: Promo used_count เพิ่มขึ้นแม้ว่าการชำระเงินล้มเหลว
- **ไม่มีการติดตามการคืนเงิน**: ไม่เก็บสถานะการคืนเงินในตาราง bookings
- **การตรวจสอบคำขอพิเศษ**: ไม่มีการตรวจสอบความยาวข้อความ additional_request แบบกำหนดเอง
- **จำนวนแขกกับความจุห้อง**: ไม่มีการบังคับใช้ขีดจำกัด room.guests ในการตรวจสอบการจอง

#### ระบบการชำระเงิน
- **ไม่มี Idempotency Keys**: การคลิกหลายครั้งสามารถสร้างความพยายามชำระเงินซ้ำ
- **ความล้มเหลวที่จำลอง**: ความล้มเหลวของบัตรทดสอบเป็นการจำลอง ไม่ใช่คำตอบ Stripe จริง
- **ไม่มี Retry Mechanism**: การชำระเงินที่ล้มเหลวต้องลองใหม่ด้วยตนเองโดยผู้ใช้
- **ข้อมูลเมตาของบัตรไม่สมบูรณ์**: เก็บเพียง 3 หลักสุดท้าย (ไม่มี brand ของบัตร, ประเทศ, etc.)
- **ไม่มีการหมดเวลาการชำระเงิน**: การชำระเงินที่รออยู่ค้างไว้ไม่มีกำหนด (ไม่มีการหมดอายุ)
- **การตรวจสอบการชำระเงินสด**: ไม่มีการเก็บหลักฐานการชำระเงินสำหรับธุรกรรมเงินสด
- **การคืนเงินแบบจำลองเท่านั้น**: การคืนเงินไม่ได้เรียก Stripe API จริงๆ


