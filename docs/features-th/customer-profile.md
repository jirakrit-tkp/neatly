# ฟีเจอร์: การจัดการโปรไฟล์ลูกค้า

## 1. ภาพรวม

ระบบจัดการโปรไฟล์ลูกค้าช่วยให้ผู้ใช้สามารถดูและอัปเดตข้อมูลส่วนตัวของตนเอง รวมถึงรูปโปรไฟล์ รายละเอียดการติดต่อ และการตั้งค่าบัญชี ระบบรวมกับ Supabase Auth อย่างแน่นหนาและจัดเตรียมอินเทอร์เฟซที่ใช้งานง่ายสำหรับการปรับแต่งโปรไฟล์

**วัตถุประสงค์:**
- อนุญาตให้ลูกค้าจัดการข้อมูลบัญชีของตน
- อัปเดตรูปโปรไฟล์ด้วยการอัปโหลดรูปภาพ
- แก้ไขรายละเอียดส่วนตัว (ชื่อ, เบอร์โทร, ที่อยู่ ฯลฯ)
- ดูข้อมูลบัญชี (อีเมล, วันที่ลงทะเบียน)
- รักษาความสอดคล้องระหว่างตาราง auth.users และ profiles

**ฟีเจอร์หลัก:**
- **การอัปโหลดรูปโปรไฟล์**: อัปโหลดและอัปเดตรูปอวาตาร์
- **การแก้ไขข้อมูลส่วนตัว**: อัปเดตชื่อ, เบอร์โทร, วันเกิด, ประเทศ
- **การแสดงอีเมล**: ดูอีเมลที่ลงทะเบียน (อ่านอย่างเดียว จัดการโดย auth)
- **ความปลอดภัยของบัญชี**: เปลี่ยนรหัสผ่านผ่าน Supabase Auth
- **การตรวจสอบข้อมูล**: การตรวจสอบฝั่งไคลเอนต์และเซิร์ฟเวอร์

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการโหลดโปรไฟล์
```
ผู้ใช้ไปที่หน้าโปรไฟล์ (/customer/profile)
  → ตรวจสอบการยืนยันตัวตน (AuthContext)
    ถ้าไม่ได้เข้าสู่ระบบ → เปลี่ยนเส้นทางไป /login
  → โหลดข้อมูลผู้ใช้:
    ├─ ข้อมูล auth.users (อีเมล, id)
    └─ ข้อมูลตาราง profiles (username, name, phone ฯลฯ)
  → แสดงฟอร์มโปรไฟล์พร้อมค่าปัจจุบัน
```

### ลำดับการอัปเดตโปรไฟล์
```
ผู้ใช้แก้ไขฟิลด์โปรไฟล์ → การตรวจสอบฝั่งไคลเอนต์
  → ผู้ใช้คลิก "บันทึกการเปลี่ยนแปลง"
    → ถ้ารูปโปรไฟล์เปลี่ยน:
      ├─ อัปโหลดรูปไปยัง Supabase Storage 'profile-pictures'
      └─ รับ public URL
    → PUT /api/profile
      ├─ ตรวจสอบข้อมูลที่ป้อน
      ├─ อัปเดตตาราง profiles
      └─ อัปเดต auth.users metadata (ตัวเลือก)
    → สำเร็จ → รีเฟรชข้อมูลโปรไฟล์
    → แสดงการแจ้งเตือนความสำเร็จ
```

### ลำดับการอัปโหลดรูปโปรไฟล์
```
ผู้ใช้เลือกไฟล์รูปภาพ → ตรวจสอบ:
  ├─ ประเภทไฟล์ (PNG, JPG, JPEG)
  ├─ ขนาดไฟล์ (< 5MB)
  └─ ขนาดรูปภาพ (ตัวเลือก)
→ อัปโหลดไปยัง Supabase Storage
  ├─ ชื่อไฟล์: {userId}.{extension}
  ├─ แทนที่ไฟล์ที่มีอยู่ (เขียนทับอัตโนมัติ)
  └─ รับ public URL
→ อัปเดต profiles.profile_image ด้วย URL
→ แสดงรูปโปรไฟล์ใหม่
```

---

## 3. เทคโนโลยีและไลบรารี

| ไลบรารี/API | วัตถุประสงค์ | ตัวอย่างการใช้งาน |
|------------|---------|---------------|
| **Supabase Auth** | การยืนยันตัวตนผู้ใช้ | รับ user ID ปัจจุบัน |
| **Supabase Database** | จัดเก็บข้อมูลโปรไฟล์ | CRUD บนตาราง profiles |
| **Supabase Storage** | จัดเก็บรูปโปรไฟล์ | อัปโหลด/ดึงรูปอวาตาร์ |
| **React Hook Form** | การจัดการสถานะฟอร์ม | ฟอร์มแก้ไขโปรไฟล์ |
| **Zod** | การตรวจสอบ schema | ตรวจสอบข้อมูลโปรไฟล์ |
| **profileService** | ชั้นตรรกะทางธุรกิจ | อัปเดตโปรไฟล์ อัปโหลดรูป |

---

## 4. ตรรกะหลัก

### 4.1 Profile Service (src/services/profileService.ts)

**รับโปรไฟล์ผู้ใช้:**
```typescript
async getUserProfile(userId: string):
  // 1. รับข้อมูลผู้ใช้ auth
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. รับข้อมูลโปรไฟล์
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  
  // 3. รวมข้อมูล
  ส่งคืน {
    id: user.id,
    email: user.email,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    dateOfBirth: profile.date_of_birth,
    country: profile.country,
    profileImage: profile.profile_image,
    role: profile.role
  }
```

**อัปเดตโปรไฟล์:**
```typescript
async updateProfile(userId: string, data: ProfileUpdateData):
  // 1. ตรวจสอบข้อมูล
  validateProfileData(data)
  
  // 2. อัปเดตตาราง profiles
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      date_of_birth: data.dateOfBirth,
      country: data.country,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  // 3. อัปเดต auth.users metadata (ตัวเลือก)
  await supabase.auth.updateUser({
    data: {
      first_name: data.firstName,
      last_name: data.lastName
    }
  });
  
  ส่งคืน updatedProfile
```

**อัปโหลดรูปโปรไฟล์:**
```typescript
async uploadProfilePicture(userId: string, file: File):
  // 1. ตรวจสอบไฟล์
  ถ้า file.size > 5 * 1024 * 1024:
    throw Error('ขนาดไฟล์ต้องน้อยกว่า 5MB')
  
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
  ถ้า !allowedTypes.includes(file.type):
    throw Error('อนุญาตเฉพาะรูปภาพ PNG และ JPG เท่านั้น')
  
  // 2. สร้างชื่อไฟล์
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  
  // 3. ลบรูปเก่า (ถ้ามี)
  await supabase.storage
    .from('profile-pictures')
    .remove([fileName])
  
  // 4. อัปโหลดรูปใหม่
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file)
  
  if (error) throw error
  
  // 5. รับ public URL
  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName)
  
  // 6. อัปเดต profile_image ในตาราง profiles
  await supabase
    .from('profiles')
    .update({ profile_image: urlData.publicUrl })
    .eq('id', userId)
  
  ส่งคืน urlData.publicUrl
```

### 4.2 การตรวจสอบโปรไฟล์

```typescript
import { z } from 'zod';

const profileSchema = z.object({
  firstName: z.string().min(1, 'ต้องระบุชื่อ').max(50),
  lastName: z.string().min(1, 'ต้องระบุนามสกุล').max(50),
  phone: z.string()
    .regex(/^[0-9+\-\s()]+$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง')
    .optional(),
  dateOfBirth: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const age = (new Date() - birthDate) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 120;
    },
    { message: 'คุณต้องมีอายุอย่างน้อย 18 ปี' }
  ).optional(),
  country: z.string().optional()
});

function validateProfileData(data: ProfileUpdateData) {
  const result = profileSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues.map(i => i.message).join(', '));
  }
  return result.data;
}
```

### 4.3 Custom Hook: useProfile

```typescript
// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getUserProfile(user.id);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const updateProfile = async (data) => {
    try {
      const updated = await profileService.updateProfile(user.id, data);
      setProfile(updated);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  const uploadProfilePicture = async (file) => {
    try {
      const url = await profileService.uploadProfilePicture(user.id, file);
      setProfile(prev => ({ ...prev, profileImage: url }));
      return { success: true, url };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  return { profile, loading, error, updateProfile, uploadProfilePicture, refreshProfile: loadProfile };
}
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### ตาราง: `profiles` (ส่วนขยาย)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  
  -- ข้อมูลส่วนตัว
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  country TEXT,
  
  -- รูปโปรไฟล์
  profile_image TEXT,                     -- Supabase Storage URL
  
  -- การตั้งค่าบัญชี
  role TEXT DEFAULT 'customer',           -- 'customer' | 'admin'
  
  -- การตั้งค่า (อนาคต)
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'THB',
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_phone CHECK (phone ~ '^[0-9+\-\s()]+$'),
  CONSTRAINT valid_role CHECK (role IN ('customer', 'admin')),
  
  -- Indexes
  INDEX idx_username ON profiles(username)
);
```

### Storage Bucket: `profile-pictures`
```
Bucket สาธารณะสำหรับรูปโปรไฟล์ผู้ใช้
การตั้งชื่อ: {userId}.{extension}
ตัวอย่าง:
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890.png
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **การตรวจสอบขนาดไฟล์**: ป้องกันการอัปโหลด > 5MB
2. **การตรวจสอบประเภทไฟล์**: อนุญาตเฉพาะ PNG, JPG, JPEG
3. **การเขียนทับรูปโปรไฟล์**: การอัปโหลดใหม่แทนที่รูปเก่า
4. **การตรวจสอบอายุ**: ต้องมีอายุ 18+ ปี
5. **การตรวจสอบรูปแบบเบอร์โทร**: ยอมรับรูปแบบสากล

### ข้อจำกัดปัจจุบัน
1. **ไม่มีการครอปรูป**: ไม่สามารถครอป/ปรับขนาดก่อนอัปโหลด
2. **ไม่มีการเปลี่ยนอีเมล**: อีเมลจัดการโดย Supabase Auth (ต้องยืนยัน)
3. **ไม่มีการเปลี่ยนรหัสผ่าน**: ต้องใช้ Supabase Auth flow แยก
4. **ไม่มีการลบบัญชี**: ผู้ใช้ไม่สามารถลบบัญชีของตนเองได้
5. **ไม่มีการตั้งค่าความเป็นส่วนตัว**: ฟิลด์โปรไฟล์ทั้งหมดมองเห็นได้ (ไม่มีสลับสาธารณะ/ส่วนตัว)
6. **ไม่มีการเลือกอวาตาร์**: ไม่มีตัวเลือกเลือกจากอวาตาร์ที่ตั้งไว้
7. **รูปโปรไฟล์เดียว**: ไม่สามารถมีหลายรูป/รูปสำรอง

### TODO / การพัฒนาในอนาคต
- [ ] **การครอปรูป**: เพิ่มเครื่องมือครอปก่อนอัปโหลด
- [ ] **แกลเลอรีอวาตาร์**: จัดเตรียมอวาตาร์ที่ตั้งไว้ให้เลือก
- [ ] **การเปลี่ยนอีเมล**: สร้างการอัปเดตอีเมลพร้อมการยืนยัน
- [ ] **การเปลี่ยนรหัสผ่าน**: เพิ่มฟอร์มเปลี่ยนรหัสผ่านในแอป
- [ ] **การลบบัญชี**: การลบบัญชีด้วยตนเองพร้อมการยืนยัน
- [ ] **การตั้งค่าความเป็นส่วนตัว**: ควบคุมการมองเห็นฟิลด์โปรไฟล์
- [ ] **การยืนยันตัวตนสองขั้นตอน**: เพิ่มการตั้งค่า 2FA ในโปรไฟล์
- [ ] **ประวัติการเข้าสู่ระบบ**: แสดงกิจกรรมการเข้าสู่ระบบล่าสุด
- [ ] **บัญชีที่เชื่อมต่อ**: เชื่อมโยงบัญชีโซเชียลมีเดีย
- [ ] **การตั้งค่าการแจ้งเตือน**: ควบคุมการแจ้งเตือนแบบละเอียด
- [ ] **ดาวน์โหลดข้อมูลโปรไฟล์**: การส่งออกข้อมูลตาม GDPR
- [ ] **ความสมบูรณ์ของโปรไฟล์**: แสดง progress bar สำหรับโปรไฟล์ที่สมบูรณ์
- [ ] **การจัดการที่อยู่**: เพิ่ม/จัดการหลายที่อยู่
- [ ] **ผู้ติดต่อฉุกเฉิน**: เพิ่มข้อมูลผู้ติดต่อฉุกเฉิน
- [ ] **ภาษาที่ต้องการ**: การตั้งค่าหลายภาษา

### ปัญหาที่ทราบ
- **แคชรูปโปรไฟล์**: เบราว์เซอร์อาจแคชรูปเก่าหลังอัปเดต
- **การอัปเดตพร้อมกัน**: ไม่มีการล็อกแบบ optimistic (เขียนครั้งสุดท้ายชนะ)
- **ไม่สามารถเปลี่ยน Username**: ไม่มี UI เพื่ออัปเดต username หลังลงทะเบียน
- **ไม่ลบรูปโปรไฟล์**: รูปเก่าไม่ถูกลบออกจาก storage เมื่ออัปเดต
- **Timezone วันเกิด**: อาจมีกรณีพิเศษที่เกี่ยวกับ timezone


