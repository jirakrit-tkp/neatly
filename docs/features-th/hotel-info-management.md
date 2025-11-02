# ฟีเจอร์: การจัดการข้อมูลโรงแรม

## 1. ภาพรวม

ระบบจัดการข้อมูลโรงแรมช่วยให้ผู้ดูแลระบบสามารถอัปเดตและจัดการรายละเอียดหลักของโรงแรมที่แสดงทั่วเว็บไซต์ รวมถึงชื่อโรงแรม คำอธิบาย และโลโก้ ข้อมูลนี้สามารถเข้าถึงได้ทั่วโลกผ่าน React Context และถูกใช้ในหน้าลูกค้า (หน้าหลัก, ส่วนเกี่ยวกับเรา, ส่วนท้าย) และแผงแอดมิน

**วัตถุประสงค์:**
- การจัดการแบรนด์และข้อมูลโรงแรมแบบรวมศูนย์
- การอัปเดตแบบไดนามิกโดยไม่ต้อง deploy โค้ด
- ข้อมูลโรงแรมที่สอดคล้องกันทุกหน้า
- รองรับการอัปเดตโลโก้ด้วยการอัปโหลดรูปภาพ
- คำอธิบายที่เป็นมิตรกับ SEO

**ฟีเจอร์หลัก:**
- **การจัดการสถานะส่วนกลาง**: React Context จัดเตรียมข้อมูลโรงแรมให้กับ components ทั้งหมด
- **การอัปเดตแบบไดนามิก**: การเปลี่ยนแปลงแสดงผลทันทีโดยไม่ต้องโหลดหน้าใหม่
- **การอัปโหลดโลโก้**: แอดมินสามารถอัปโหลดโลโก้โรงแรมแบบกำหนดเอง
- **ตัวแก้ไขคำอธิบาย**: พื้นที่ข้อความหลายบรรทัดสำหรับคำอธิบายโรงแรม
- **สำรองค่าเริ่มต้น**: ค่าเริ่มต้นที่ hardcode ไว้ถ้าดึงข้อมูลจากฐานข้อมูลล้มเหลว

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการโหลดข้อมูลโรงแรม
```
การเริ่มต้นแอปพลิเคชัน → HotelInfoProvider mounts
  → useEffect กระตุ้น fetchHotelInfo()
    → GET /api/hotel-info
      ├─ ดึงจากตาราง hotel_info (หรือ Supabase config)
      └─ ส่งคืน: { name, description, logoUrl }
    → อัปเดตสถานะ React Context
    → Components ที่ใช้ useHotelInfo() re-render
```

### ลำดับการอัปเดตข้อมูลโรงแรม (แอดมิน)
```
แอดมินไปที่หน้า Hotel Info (/admin/hotel-info)
  → โหลดข้อมูลโรงแรมปัจจุบันจาก Context
  → แอดมินแก้ไขฟอร์ม (ชื่อ, คำอธิบาย, อัปโหลดโลโก้)
  → แอดมินคลิก "บันทึก"
    → ถ้าโลโก้เปลี่ยน: อัปโหลดไปยัง Supabase Storage
    → PUT /api/hotel-info
      ├─ ตรวจสอบการป้อนข้อมูล (ต้องมีชื่อ, ความยาวคำอธิบาย)
      └─ อัปเดตตาราง hotel_info
    → เรียก refreshHotelInfo() ใน Context
    → การแจ้งเตือนความสำเร็จ → UI อัปเดตทั่วโลก
```

### ลำดับการอัปโหลดโลโก้
```
แอดมินเลือกไฟล์โลโก้ → ตรวจสอบไฟล์:
  ├─ ตรวจสอบประเภทไฟล์ (PNG, JPG, SVG)
  ├─ ตรวจสอบขนาดไฟล์ (< 2MB)
  └─ ตรวจสอบขนาด (แนะนำ 500x200)
→ อัปโหลดไปยัง Supabase Storage bucket 'hotel-assets'
  ├─ สร้างชื่อไฟล์: logo_{timestamp}.{ext}
  └─ รับ public URL
→ อัปเดต hotel_info.logoUrl ด้วย URL ใหม่
→ ลบโลโก้เก่า (การล้างข้อมูลเป็นตัวเลือก)
```

---

## 3. เทคโนโลยีและไลบรารี

| ไลบรารี/API | วัตถุประสงค์ | ตัวอย่างการใช้งาน |
|------------|---------|---------------|
| **React Context API** | การจัดการสถานะส่วนกลาง | `HotelInfoContext`, `useHotelInfo()` |
| **Supabase Database** | จัดเก็บถาวร | เก็บชื่อโรงแรม, คำอธิบาย |
| **Supabase Storage** | จัดเก็บรูปโลโก้ | อัปโหลด/ดึงรูปโลโก้ |
| **Next.js API Routes** | Backend endpoints | /api/hotel-info (GET, PUT) |
| **React Hook Form** | การจัดการฟอร์ม | ฟอร์มแก้ไขข้อมูลโรงแรม |

---

## 4. ตรรกะหลัก

### 4.1 HotelInfoContext (src/context/HotelInfoContext.tsx)

**การจัดการสถานะ:**
```typescript
interface HotelInfo {
  name: string;
  description: string;
  logoUrl: string;
}

const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
  name: "Neatly Hotel",
  description: "ตั้งอยู่ในกรุงเทพฯ ประเทศไทย โรงแรม Neatly Hotel มีห้องพัก 5 ดาว...",
  logoUrl: "/logo.png"
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**ดึงข้อมูลโรงแรม:**
```typescript
const fetchHotelInfo = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/hotel-info');
    const result = await response.json();
    
    if (result.success) {
      setHotelInfo(result.data);
    } else {
      setError(result.message || 'ไม่สามารถดึงข้อมูลโรงแรม');
    }
  } catch (err) {
    setError('เกิดข้อผิดพลาดเครือข่าย');
    console.error('Error fetching hotel info:', err);
  } finally {
    setLoading(false);
  }
};

// โหลดเมื่อ mount
useEffect(() => {
  fetchHotelInfo();
}, []);
```

**อัปเดตข้อมูลโรงแรม:**
```typescript
const updateHotelInfo = async (data: Partial<HotelInfo>): Promise<boolean> => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/hotel-info', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      setHotelInfo(result.data);
      return true;
    } else {
      setError(result.message || 'ไม่สามารถอัปเดตข้อมูลโรงแรม');
      return false;
    }
  } catch (err) {
    setError('เกิดข้อผิดพลาดเครือข่าย');
    return false;
  } finally {
    setLoading(false);
  }
};
```

### 4.2 API Route: /api/hotel-info

**GET Request (ดึงข้อมูล):**
```typescript
// GET /api/hotel-info
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // ตัวเลือก 1: ดึงจากตารางฐานข้อมูล
      const { data, error } = await supabase
        .from('hotel_info')
        .select('*')
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: {
          name: data.name,
          description: data.description,
          logoUrl: data.logo_url
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลโรงแรม'
      });
    }
  }
}
```

**PUT Request (อัปเดต):**
```typescript
// PUT /api/hotel-info
export default async function handler(req, res) {
  if (req.method === 'PUT') {
    try {
      const { name, description, logoUrl } = req.body;
      
      // ตรวจสอบการป้อนข้อมูล
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'ต้องระบุชื่อโรงแรม'
        });
      }
      
      // อัปเดตฐานข้อมูล
      const { data, error } = await supabase
        .from('hotel_info')
        .update({
          name,
          description,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1) // สมมติว่ามีบันทึกโรงแรมเดียว
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: {
          name: data.name,
          description: data.description,
          logoUrl: data.logo_url
        },
        message: 'อัปเดตข้อมูลโรงแรมสำเร็จ'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถอัปเดตข้อมูลโรงแรม'
      });
    }
  }
}
```

### 4.3 การอัปโหลดโลโก้

```typescript
async function uploadLogo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `logo_${Date.now()}.${fileExt}`;
  
  // อัปโหลดไปยัง Supabase Storage
  const { data, error } = await supabase.storage
    .from('hotel-assets')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // รับ public URL
  const { data: urlData } = supabase.storage
    .from('hotel-assets')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

### 4.4 การใช้งานใน Components

```typescript
// ตัวอย่าง: แสดงชื่อโรงแรมใน Navbar
import { useHotelInfo } from '@/context/HotelInfoContext';

const Navbar = () => {
  const { hotelInfo, loading } = useHotelInfo();
  
  return (
    <nav>
      <img src={hotelInfo.logoUrl} alt={hotelInfo.name} />
      <h1>{hotelInfo.name}</h1>
    </nav>
  );
};

// ตัวอย่าง: อัปเดตข้อมูลโรงแรมในแผงแอดมิน
const HotelInfoPage = () => {
  const { hotelInfo, updateHotelInfo, loading } = useHotelInfo();
  
  const handleSubmit = async (formData) => {
    const success = await updateHotelInfo(formData);
    if (success) {
      alert('อัปเดตข้อมูลโรงแรมแล้ว!');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input defaultValue={hotelInfo.name} name="name" />
      <textarea defaultValue={hotelInfo.description} name="description" />
      <button type="submit" disabled={loading}>บันทึก</button>
    </form>
  );
};
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ตาราง: `hotel_info`
```sql
CREATE TABLE hotel_info (
  id INTEGER PRIMARY KEY DEFAULT 1,          -- บันทึกเดียว (singleton pattern)
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  
  -- ฟิลด์เพิ่มเติม (ส่วนขยายในอนาคต)
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- โซเชียลมีเดีย
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint เพื่อบังคับบันทึกเดียว
  CONSTRAINT single_hotel_info CHECK (id = 1)
);

-- แทรกบันทึกเริ่มต้น
INSERT INTO hotel_info (id, name, description, logo_url) VALUES (
  1,
  'Neatly Hotel',
  'ตั้งอยู่ในกรุงเทพฯ ประเทศไทย โรงแรม Neatly Hotel มีห้องพัก 5 ดาวพร้อมสระว่ายน้ำกลางแจ้ง สโมสรเด็ก สิ่งอำนวยความสะดวกด้านกีฬา และศูนย์ฟิตเนส นอกจากนี้ยังมีสปา สระว่ายน้ำในร่ม และซาวน่า

ห้องพักทั้งหมดที่โรงแรมมีพื้นที่นั่งเล่น โทรทัศน์จอแบนพร้อมช่องรายการดาวเทียม พื้นที่รับประทานอาหาร และห้องน้ำส่วนตัวพร้อมเครื่องใช้ส่วนตัวฟรี อ่างอาบน้ำ และเครื่องเป่าผม ห้องพักทุกห้องใน Neatly Hotel มีระเบียงที่มีเฟอร์นิเจอร์ บางห้องมีเครื่องชงกาแฟ

Wi-Fi ฟรีและสิ่งอำนวยความสะดวกด้านความบันเทิงมีให้บริการที่โรงแรม นอกจากนี้ยังมีบริการเช่าเพื่อสำรวจพื้นที่',
  '/logo.png'
);
```

### Storage Bucket: `hotel-assets`
```
Bucket สาธารณะสำหรับสินทรัพย์แบรนด์โรงแรม
ไฟล์:
  - logo_{timestamp}.png
  - banner_{timestamp}.jpg
  - favicon_{timestamp}.ico
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **สำรองค่าเริ่มต้น**: ค่าเริ่มต้นที่ hardcode ไว้ถ้าดึงข้อมูลจากฐานข้อมูลล้มเหลว
2. **สถานะการโหลด**: แสดงตัวบ่งชี้การโหลดระหว่างดึงข้อมูล
3. **การจัดการ Error**: แสดงข้อความ error ถ้าการอัปเดตล้มเหลว
4. **รูปแบบบันทึกเดียว**: ประกันว่ามีบันทึกข้อมูลโรงแรมเพียงหนึ่งรายการ

### ข้อจำกัดปัจจุบัน
1. **โรงแรมเดียวเท่านั้น**: ไม่สามารถจัดการหลายที่พัก
2. **ไม่มีประวัติเวอร์ชัน**: ไม่สามารถย้อนกลับข้อมูลโรงแรมก่อนหน้า
3. **ไม่บังคับขนาดโลโก้**: ไม่มีการตรวจสอบขนาด/ขนาดโลโก้
4. **ไม่มีตัวแก้ไข Rich Text**: คำอธิบายเป็นข้อความธรรมดาเท่านั้น
5. **ไม่มี SEO Metadata**: ไม่มี meta description, keywords แยก
6. **ไม่มีการแปลภาษา**: ภาษาเดียวเท่านั้น (ไม่มี i18n)
7. **ไม่มีโหมดตัวอย่าง**: ไม่สามารถดูตัวอย่างการเปลี่ยนแปลงก่อนบันทึก

### TODO / การพัฒนาในอนาคต
- [ ] **รองรับหลายที่พัก**: จัดการหลายสถานที่โรงแรม
- [ ] **ประวัติเวอร์ชัน**: ติดตามการเปลี่ยนแปลงและอนุญาตให้ย้อนกลับ
- [ ] **ตัวแก้ไข Rich Text**: ตัวแก้ไข WYSIWYG สำหรับคำอธิบาย
- [ ] **การครอปรูป**: ครอป/ปรับขนาดโลโก้ก่อนอัปโหลด
- [ ] **ฟิลด์ SEO**: เพิ่ม meta description, keywords, structured data
- [ ] **การแปลภาษา**: รองรับหลายภาษาสำหรับข้อมูลโรงแรม
- [ ] **โหมดตัวอย่าง**: ดูตัวอย่างการเปลี่ยนแปลงก่อนเผยแพร่
- [ ] **ข้อมูลติดต่อ**: เพิ่มฟิลด์โทรศัพท์, อีเมล, ที่อยู่
- [ ] **ลิงก์โซเชียลมีเดีย**: Facebook, Instagram, Twitter ฯลฯ
- [ ] **เวลาทำการ**: เวลาเปิด/ปิด
- [ ] **รายการสิ่งอำนวยความสะดวก**: เวลาเช็คอิน, สิ่งอำนวยความสะดวก, บริการ
- [ ] **แผนที่สถานที่**: ฝัง Google Maps
- [ ] **แกลเลอรีรูป**: รูปโรงแรมหลายรูป
- [ ] **รางวัล/การรับรอง**: แสดงตรา, คะแนน
- [ ] **ขั้นตอนการอนุมัติการเปลี่ยนแปลง**: ต้องได้รับการอนุมัติก่อนเผยแพร่

### ปัญหาที่ทราบ
- **ไม่ล้างโลโก้**: โลโก้เก่าไม่ถูกลบเมื่ออัปโหลดโลโก้ใหม่
- **Race Condition ใน Context**: การอัปเดตหลายครั้งอย่างรวดเร็วอาจขัดแย้ง
- **ไม่มีแคช**: ดึงข้อมูลโรงแรมทุกครั้งที่เริ่มต้นแอป (ไม่มีแคช)
- **สมมติฐานบันทึกเดียว**: โค้ดสมมติว่า id=1 มีอยู่ (เสียถ้าลบ)


