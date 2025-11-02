# ฟีเจอร์: การจัดการห้องพักและประเภทห้องพัก

## 1. ภาพรวม

ระบบจัดการห้องพักช่วยให้ผู้ดูแลระบบสามารถสร้าง อัปเดต และจัดการห้องพักและประเภทห้องพักของโรงแรม จัดการคลังห้องพัก ราคา (ปกติ + โปรโมชัน) รูปภาพ (รูปหลัก + แกลเลอรี) สิ่งอำนวยความสะดวก และการติดตามสถานะห้องพัก ระบบรองรับการจัดระเบียบห้องพักแบบลำดับชั้นด้วย `room_types` เป็นเทมเพลตและ `rooms` เป็นหน่วยที่จองได้แต่ละรายการ

**วัตถุประสงค์:**
- กำหนดประเภทห้องพัก (Deluxe, Suite, Superior ฯลฯ) พร้อมคุณสมบัติพื้นฐาน
- สร้างห้องพักแต่ละรายการที่สามารถจองได้
- จัดการราคาห้องพัก (ราคาฐาน + ราคาโปรโมชัน)
- อัปโหลดและจัดการรูปห้องพัก (รูปหลัก + แกลเลอรี)
- ติดตามสถานะห้องว่างและสถานะการทำความสะอาด
- ควบคุมการมองเห็นห้อง (ทำงาน/ไม่ทำงาน)
- กำหนดสิ่งอำนวยความสะดวกและคุณสมบัติห้องพัก

**ฟีเจอร์หลัก:**
- **โครงสร้างสองชั้น**: ประเภทห้องพัก (เทมเพลต) → ห้องพัก (รายการ)
- **การจัดการรูปภาพ**: รูปหลัก + รูปแกลเลอรีหลายรูป
- **ราคาโปรโมชัน**: ราคาส่วนลดเป็นตัวเลือก
- **การติดตามสถานะห้อง**: สถานะการทำความสะอาด (ว่าง, เข้าพัก, สกปรก ฯลฯ)
- **การจัดการสิ่งอำนวยความสะดวก**: อาร์เรย์คุณสมบัติที่ยืดหยุ่น (wifi, สระว่ายน้ำ, ยิม ฯลฯ)
- **การเรียงลำดับแบบลากและวาง**: แอดมินสามารถเรียงลำดับห้องสำหรับการแสดงผล
- **การปรับแต่งรูปภาพ**: การปรับขนาดรูปภาพฝั่งเซิร์ฟเวอร์ด้วย jimp

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการสร้างประเภทห้องพัก (แอดมิน)
```
แอดมินกรอกฟอร์มประเภทห้องพัก → การตรวจสอบ (Zod schema)
  → อัปโหลดรูปหลัก → Supabase Storage
  → อัปโหลดรูปแกลเลอรี → Supabase Storage
  → สร้างบันทึก room_type
    ├─ name, description, base_price, promo_price
    ├─ main_image (URL), gallery_images (URLs)
    └─ amenities, room_size, bed_type, guests
  → สำเร็จ → เปลี่ยนเส้นทางไปรายการประเภทห้องพัก
```

### ลำดับการสร้างห้องพัก (จากประเภทห้องพัก)
```
แอดมินสร้างห้องจากประเภทห้องพัก → เติมฟิลด์อัตโนมัติจาก room_type
  → ตั้งค่าคุณสมบัติเฉพาะ:
    ├─ room_id (ตัวระบุเฉพาะ)
    ├─ price (คัดลอกจาก base_price หรือกำหนดเอง)
    ├─ promotion_price (ตัวเลือก)
    └─ status (ค่าเริ่มต้น: 'Vacant')
  → สร้างบันทึกห้อง
  → เชื่อมโยงห้องกับ room_type ผ่าน room_type_id
```

### ลำดับการอัปเดตห้องพัก
```
แอดมินแก้ไขห้อง → โหลดข้อมูลปัจจุบัน
  → แก้ไขฟิลด์ (ราคา, สถานะ, รูปภาพ, สิ่งอำนวยความสะดวก)
  → ถ้ารูปภาพเปลี่ยน:
    ├─ อัปโหลดรูปใหม่ไปยัง Supabase Storage
    └─ ลบรูปเก่า (การล้างข้อมูลเป็นตัวเลือก)
  → อัปเดตบันทึกห้องผ่าน /api/rooms/[id] PUT
  → สำเร็จ → รีเฟรชรายการ
```

### ลำดับการลบห้องพัก
```
แอดมินลบห้อง → ยืนยันการลบ
  → ตรวจสอบการจองที่ใช้งานอยู่ (ป้องกันการลบถ้ามีการจอง)
  → Soft delete: ตั้งค่า is_active = false (เก็บประวัติ)
    หรือ Hard delete: ลบบันทึกห้อง
  → ตัวเลือก: ลบรูปภาพที่เกี่ยวข้องจาก storage
  → สำเร็จ → รีเฟรชรายการ
```

---

## 3. เทคโนโลยีและไลบรารี

| ไลบรารี/API | วัตถุประสงค์ | ตัวอย่างการใช้งาน |
|------------|---------|---------------|
| **Supabase Database** | จัดเก็บข้อมูลห้องพัก | การดำเนินการ CRUD บนตาราง rooms, room_types |
| **Supabase Storage** | จัดเก็บรูปภาพ | อัปโหลด/ดึงรูปห้องพัก |
| **jimp** | การปรับแต่งรูปภาพ | ปรับขนาดรูปภาพก่อนจัดเก็บ |
| **multer** | การจัดการการอัปโหลดไฟล์ | แยกวิเคราะห์ข้อมูลฟอร์มหลายส่วน |
| **React Hook Form** | การจัดการสถานะฟอร์ม | ฟอร์มสร้าง/แก้ไขห้อง |
| **Zod** | การตรวจสอบ schema | ตรวจสอบข้อมูลห้อง (roomSchema) |
| **roomPayload util** | การแปลงข้อมูล | แปลงข้อมูลฟอร์มเป็น API payload |
| **roomService** | ชั้นตรรกะทางธุรกิจ | สร้าง อัปเดต ลบห้อง |

---

## 4. ตรรกะหลัก

### 4.1 ประเภทห้องพัก กับ ห้องพัก

**ประเภทห้องพัก (ตาราง `room_types`):**
- เทมเพลต/หมวดหมู่ (เช่น "Deluxe Sea View", "Executive Suite")
- กำหนดคุณสมบัติพื้นฐาน: คำอธิบาย, base_price, สิ่งอำนวยความสะดวก
- ใช้โดยแชทบอทสำหรับคำแนะนำห้อง
- ประเภทห้องพักหนึ่งรายการ → ห้องพักหลายห้อง

**ห้องพัก (ตาราง `rooms`):**
- หน่วยที่จองได้แต่ละรายการ (เช่น "Deluxe-101", "Deluxe-102")
- สืบทอดคุณสมบัติจาก room_type แต่สามารถกำหนดเองได้
- มีราคา สถานะ และห้องว่างที่เฉพาะเจาะจง
- เชื่อมโยงผ่าน foreign key `room_type_id`

### 4.2 การสร้างห้องพัก (roomService.createRoom)

```typescript
async createRoom(formData: RoomFormData, hasPromotion: boolean):
  // 1. สร้าง payload
  payload = {
    room_type: formData.roomType,
    room_size: formData.roomSize,
    bed_type: formData.bedType,
    guests: formData.guests,
    price: formData.pricePerNight,
    promotion_price: hasPromotion ? formData.promotionPrice : null,
    description: formData.description,
    main_image_url: [formData.mainImgUrl],
    gallery_images: formData.galleryImageUrls,
    amenities: formData.amenities
  }
  
  // 2. ส่งไปยัง API
  POST /api/rooms
  Body: JSON.stringify(payload)
  
  // 3. Backend สร้างห้อง
  แทรกลงในตาราง rooms
  
  ส่งคืน: room object ที่สร้าง
```

### 4.3 การอัปเดตห้องพัก (roomService.updateRoom)

```typescript
async updateRoom(roomId: string, formData: RoomFormData, hasPromotion: boolean):
  // 1. สร้าง update payload
  payload = buildRoomPayload(formData, hasPromotion)
  
  // 2. ส่งไปยัง API
  PUT /api/rooms/[roomId]
  Body: JSON.stringify(payload)
  
  // 3. Backend อัปเดตห้อง
  อัปเดต rooms SET 
    room_type = payload.room_type,
    price = payload.price,
    promotion_price = payload.promotion_price,
    main_image_url = payload.main_image_url,
    gallery_images = payload.gallery_images,
    amenities = payload.amenities,
    ...ฟิลด์อื่นๆ
  WHERE id = roomId
  
  ส่งคืน: room object ที่อัปเดต
```

### 4.4 ลำดับการอัปโหลดรูปภาพ

**API อัปโหลดหลายรูป (`/api/upload-multiple-images`):**
```typescript
POST /api/upload-multiple-images
Content-Type: multipart/form-data

1. แยกวิเคราะห์ไฟล์ที่อัปโหลดด้วย multer
2. สำหรับแต่ละไฟล์:
   a) ปรับแต่งด้วย jimp:
      - ปรับขนาดสูงสุด 1920x1080 (รักษาอัตราส่วน)
      - บีบอัดเป็นคุณภาพ 80%
      - แปลงเป็น JPEG
   b) สร้างชื่อไฟล์เฉพาะ: roomType_timestamp_index.jpg
   c) อัปโหลดไปยัง Supabase Storage bucket 'room-images'
   d) รับ public URL
3. ส่งคืน: { success: true, urls: [...] }
```

**การปรับแต่งรูปภาพ (jimp):**
```typescript
const image = await Jimp.read(buffer)
await image
  .scaleToFit(1920, 1080)  // ปรับขนาดรักษาอัตราส่วน
  .quality(80)              // บีบอัดเป็น 80%
  .getBufferAsync(Jimp.MIME_JPEG)
```

### 4.5 การจัดการสถานะห้องพัก

**สถานะห้องพัก (การทำความสะอาด):**
- `Vacant`: ห้องว่างและสะอาด พร้อมให้จอง
- `Vacant Clean`: ห้องทำความสะอาดแล้วแต่ยังไม่ได้ตรวจสอบ
- `Vacant Clean Inspected`: ห้องทำความสะอาด ตรวจสอบแล้ว พร้อม
- `Vacant Clean Pick Up`: ห้องทำความสะอาด รอแขกมาถึง
- `Occupied`: แขกเช็คอินอยู่ในปัจจุบัน
- `Dirty`: ห้องต้องทำความสะอาดหลังเช็คเอาท์
- `Out of Order`: ห้องไม่พร้อมใช้งานชั่วคราว

**ตรรกะอัปเดตสถานะ:**
```typescript
// เฉพาะสถานะ Vacant เท่านั้นที่จองได้
const BOOKABLE_STATUSES = [
  'Vacant', 
  'Vacant Clean', 
  'Vacant Clean Inspected', 
  'Vacant Clean Pick Up'
];

function isRoomBookable(room):
  ส่งคืน room.is_active && BOOKABLE_STATUSES.includes(room.status)
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ตาราง: `room_types`
```sql
CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,              -- "Deluxe Sea View", "Executive Suite"
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  promo_price DECIMAL(10,2),
  main_image TEXT,                        -- URL รูปภาพเดียว
  room_size INTEGER,                      -- ตารางเมตร
  bed_type TEXT,                          -- "King bed", "Double bed"
  guests INTEGER DEFAULT 2,
  amenities TEXT[],                       -- ['wifi', 'sea view', 'balcony']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ตาราง: `rooms`
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id INTEGER REFERENCES room_types(id),
  room_type TEXT NOT NULL,                -- Denormalized เพื่อประสิทธิภาพ
  
  -- ราคา (สามารถแทนที่ room_type base_price)
  price DECIMAL(10,2) NOT NULL,
  promotion_price DECIMAL(10,2),
  currency TEXT DEFAULT 'THB',
  
  -- คุณสมบัติห้อง
  room_size INTEGER,
  bed_type TEXT,
  guests INTEGER DEFAULT 2,
  amenities TEXT[],
  
  -- รูปภาพ
  main_image_url TEXT[],                  -- รูปเดียวเก็บเป็น array
  gallery_images TEXT[],                  -- รูปแกลเลอรีหลายรูป
  
  -- ห้องว่าง
  status TEXT DEFAULT 'Vacant',           -- สถานะการทำความสะอาด
  is_active BOOLEAN DEFAULT true,         -- มองเห็นสำหรับการจอง?
  
  -- ข้อมูลเมตา
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_guests CHECK (guests > 0),
  CONSTRAINT valid_price CHECK (price > 0),
  
  -- Indexes
  INDEX idx_room_type ON rooms(room_type_id),
  INDEX idx_active_rooms ON rooms(is_active, status),
  INDEX idx_room_price ON rooms(price)
);
```

### Storage Bucket: `room-images`
```
Bucket สาธารณะสำหรับรูปห้องพัก
รูปแบบการตั้งชื่อ: {roomType}_{timestamp}_{index}.jpg
ตัวอย่าง: Deluxe_1703456789_0.jpg
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **การปรับแต่งรูปภาพ**: รูปใหญ่ปรับขนาดเพื่อป้องกันการใช้พื้นที่จัดเก็บมาก
2. **รูปแกลเลอรี**: รองรับหลายรูปต่อห้อง
3. **ราคาโปรโมชัน**: ฟิลด์ promotion_price เป็นตัวเลือก
4. **สถานะห้อง**: เฉพาะสถานะที่จองได้อนุญาตให้จอง
5. **การสลับทำงาน/ไม่ทำงาน**: Soft delete ผ่านธง is_active
6. **การแทนที่ราคา**: ห้องสามารถมีราคาที่กำหนดเองแตกต่างจาก room_type

### ข้อจำกัดปัจจุบัน
1. **ไม่มีการครอปรูป**: ปรับขนาดอัตโนมัติเท่านั้น (ไม่มีการควบคุมอัตราส่วน)
2. **ไม่มีการลบรูป**: รูปเก่าไม่ถูกล้างเมื่ออัปเดต
3. **ไม่มีหมายเลขห้อง**: ไม่มีฟิลด์หมายเลขห้องจริง (201, 305 ฯลฯ)
4. **ไม่มีชั้น/อาคาร**: ไม่มีการจัดระเบียบแบบลำดับชั้น
5. **ประเภทห้องพักเดียว**: ห้องสังกัด room_type เดียวเท่านั้น
6. **ไม่มีการดำเนินการเป็นกลุ่ม**: ไม่สามารถอัปเดตหลายห้องพร้อมกัน
7. **ไม่มี Image Versioning**: ไม่สามารถย้อนกลับไปรูปก่อนหน้า
8. **ไม่มีขีดจำกัดคลังห้องพัก**: ไม่มีจำนวนห้องสูงสุดต่อ room_type

### TODO / การพัฒนาในอนาคต
- [ ] เพิ่มฟิลด์หมายเลขห้องจริง (อาคาร-ชั้น-หมายเลข)
- [ ] สร้างการครอป/แก้ไขรูปก่อนอัปโหลด
- [ ] เพิ่มการสร้างห้องเป็นกลุ่ม (สร้าง Deluxe 10 ห้องพร้อมกัน)
- [ ] สร้างการล้างข้อมูลรูป (ลบรูปเก่าเมื่ออัปเดต/ลบ)
- [ ] เพิ่มรูปผังห้อง/layout
- [ ] รองรับรูป virtual tour 360°
- [ ] สร้างการโคลนห้อง (คัดลอกห้องพร้อมแก้ไข)
- [ ] เพิ่มการติดตามตารางบำรุงรักษาห้อง
- [ ] รองรับราคาตามฤดูกาล (ราคาแตกต่างตามช่วงวันที่)
- [ ] สร้างราคาแบบไดนามิก (วันธรรมดา กับ วันหยุดสุดสัปดาห์)
- [ ] เพิ่มการเตือนคลังห้องพัก (แจ้งเตือนห้องว่างน้อย)
- [ ] รองรับแพ็กเกจห้อง (ห้อง + สปา + อาหารเช้า)
- [ ] เพิ่มเครื่องมือเปรียบเทียบห้อง (คุณสมบัติเคียงข้างกัน)
- [ ] สร้าง room upgrade matrix (เส้นทางการอัพเกรด)
- [ ] เพิ่มการติดตามคุณสมบัติการเข้าถึง (วีลแชร์, การได้ยิน ฯลฯ)

### ปัญหาที่ทราบ
- **Image Storage Leak**: รูปที่ลบ/อัปเดตไม่ถูกลบออกจาก storage
- **ไม่มีการตรวจสอบรูป**: ไม่มีการตรวจสอบรูปแบบรูปภาพที่ถูกต้องหรือขีดจำกัดขนาดใน API
- **การลบประเภทห้องพัก**: การลบ room_type ไม่ cascade ไปยังห้อง (ห้องกำพร้า)
- **ความไม่สอดคล้องของสิ่งอำนวยความสะดวก**: ไม่มีการตรวจสอบรูปแบบอาร์เรย์ amenities
- **ลำดับรูปแกลเลอรี**: ไม่มีการเรียงลำดับที่ชัดเจนสำหรับรูปแกลเลอรี (ใช้ลำดับของอาร์เรย์)


