# ฟีเจอร์: แดชบอร์ดแอดมินและการวิเคราะห์ (พร้อม Google Analytics 4)

## 1. ภาพรวม

แดชบอร์ดแอดมินจัดเตรียมเครื่องมือวิเคราะห์และจัดการที่ครอบคลุมสำหรับผู้ดูแลระบบโรงแรม แสดงเมตริกประสิทธิภาพหลัก สถิติการจอง การติดตามรายได้ และรวมระบบกับ Google Analytics 4 สำหรับการวิเคราะห์เว็บขั้นสูงและการติดตามพฤติกรรมผู้ใช้ แดชบอร์ดช่วยให้การตัดสินใจตามข้อมูลผ่านการแสดงภาพและข้อมูลแบบเรียลไทม์

**วัตถุประสงค์:**
- ติดตามเมตริกประสิทธิภาพโรงแรม (การจอง, รายได้, อัตราการเข้าพัก)
- แสดงผลข้อมูลผ่านกราฟและแผนภูมิ
- ติดตามพฤติกรรมลูกค้าและอัตราการแปลงผ่าน GA4
- จัดการการดำเนินงานโรงแรมทั้งหมดจากอินเทอร์เฟซกลาง
- รวมระบบ Google Analytics 4 สำหรับการวิเคราะห์เว็บ
- จัดเตรียมการควบคุมการเข้าถึงตามบทบาท (แอดมินเท่านั้น)
- ติดตามการโต้ตอบผู้ใช้, การดูหน้า และเหตุการณ์แบบกำหนดเอง

**ส่วนหลัก:**
1. **แดชบอร์ดภาพรวม**: KPIs (การจองทั้งหมด, รายได้, อัตราการเข้าพัก)
2. **การจัดการการจอง**: ดู/จัดการการจองทั้งหมด
3. **การจัดการห้องพัก**: การดำเนินการ CRUD สำหรับห้อง
4. **การจัดการแชทบอท**: FAQ, บริบท, ตั๋วแชทสด
5. **การวิเคราะห์**: การรวม GA4, การวิเคราะห์การเข้าชม, การติดตามการแปลง
6. **การจัดการข้อมูลโรงแรม**: อัปเดตรายละเอียดโรงแรม

---

## 2. สถาปัตยกรรม / ลำดับการทำงาน

### ลำดับการโหลดแดชบอร์ด
```
แอดมินเข้าสู่ระบบ → ตรวจสอบ role === 'admin'
  → โหลดหน้าแดชบอร์ด (/admin)
    ├─ ดึงสถิติ (/api/statistics)
    │   ├─ การจองทั้งหมด
    │   ├─ รายได้ทั้งหมด
    │   ├─ อัตราการเข้าพัก
    │   └─ การจองที่รอดำเนินการ
    ├─ ดึงการจองล่าสุด
    ├─ ดึงเมตริก GA4 (/api/sync-ga4-stats)
    │   ├─ การดูหน้า
    │   ├─ ผู้ใช้ที่ใช้งานอยู่
    │   └─ หน้าที่ดูมากที่สุด
    └─ Render Dashboard Components
```

### ลำดับการคำนวณสถิติ
```
/api/statistics:
  // 1. การจองทั้งหมด
  totalBookings = COUNT(*) FROM bookings
  
  // 2. รายได้ทั้งหมด
  totalRevenue = SUM(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')
  
  // 3. อัตราการเข้าพัก
  totalRooms = COUNT(*) FROM rooms WHERE is_active = true
  occupiedRooms = COUNT(DISTINCT room_id) FROM bookings 
    WHERE status IN ('Confirmed', 'Checked-In') 
    AND check_in_date <= TODAY 
    AND check_out_date > TODAY
  occupancyRate = (occupiedRooms / totalRooms) * 100
  
  // 4. การจองที่รอดำเนินการ
  pendingBookings = COUNT(*) FROM bookings WHERE status = 'Pending'
  
  ส่งคืน: { totalBookings, totalRevenue, occupancyRate, pendingBookings }
```

### ลำดับการรวมระบบ Google Analytics 4

#### การติดตามฝั่งไคลเอนต์ (gtag.js)
```
ผู้ใช้โหลดหน้า → Next.js _app.tsx เริ่มต้น
  → โหลด gtag script จาก Google Tag Manager
  → เริ่มต้น GA4 ด้วย measurement ID (G-XXXXXXXXXX)
  → ติดตามการดูหน้าอัตโนมัติ
  
ผู้ใช้ไปที่หน้าใหม่ (Next.js router)
  → useEffect ใน _app.tsx ตรวจพบการเปลี่ยนเส้นทาง
  → ส่งเหตุการณ์การดูหน้าไปยัง GA4
  → gtag('event', 'page_view', { page_path: newPath })
```

#### Server-Side Analytics API
```
แอดมินเปิดแดชบอร์ดการวิเคราะห์ → ดึงข้อมูล GA4
  → GET /api/sync-ga4-stats
    ├─ เริ่มต้น BetaAnalyticsDataClient ด้วย service account credentials
    ├─ เรียก runReport() ด้วย:
    │   ├─ property: 'properties/{PROPERTY_ID}'
    │   ├─ dateRanges: [{ startDate, endDate }]
    │   ├─ dimensions: ['pagePath', 'date', 'source', etc.]
    │   └─ metrics: ['screenPageViews', 'activeUsers', etc.]
    └─ ส่งคืนข้อมูลรวม
  → แสดงในกราฟ/ตาราง (Recharts)
```

---

## 3. เทคโนโลยีและไลบรารี

### การแสดงผลข้อมูลและกราฟ

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Recharts** | ไลบรารีกราฟ React | - สร้างสำหรับ React (รองรับ hooks ดั้งเดิม)<br>- Declarative API (ใช้ง่าย)<br>- Responsive ตามค่าเริ่มต้น<br>- น้ำหนักเบา (vs D3.js)<br>- เอกสารดี | Components เช่น `<LineChart>`, `<BarChart>` ครอบ D3.js → รับอาร์เรย์ข้อมูล → คำนวณ scales, axes อัตโนมัติ → Render SVG แบบ Composable: รวมกราฟ, แกน, tooltips เป็น React components |

### การรวมระบบ Google Analytics

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **@google-analytics/data** | GA4 Data API ฝั่งเซิร์ฟเวอร์ | - ไลบรารี Google อย่างเป็นทางการ<br>- ดึงข้อมูลวิเคราะห์ในอดีต<br>- รันรายงานแบบกำหนดเอง<br>- ปลอดภัย (ใช้ service account)<br>- ไม่เปิดเผยข้อมูลฝั่งไคลเอนต์ | Service account ยืนยันตัวตน → `BetaAnalyticsDataClient.runReport()` ส่ง query ไปยัง GA4 → GA4 รวมข้อมูล → ส่งคืนคำตอบ JSON การ query สามารถกรองตามวันที่ dimensions, metrics |
| **gtag.js** | การติดตามเหตุการณ์ฝั่งไคลเอนต์ | - Google Analytics tag อย่างเป็นทางการ<br>- มาตรฐานอุตสาหกรรม<br>- ติดตามการดูหน้าอัตโนมัติ<br>- รองรับเหตุการณ์ E-commerce<br>- การเก็บข้อมูลแบบเรียลไทม์ | Script โหลด → สร้างอาร์เรย์ `dataLayer` → ฟังก์ชัน `gtag()` ส่งเหตุการณ์ → เหตุการณ์ถูกจัดกลุ่มและส่งไปยังเซิร์ฟเวอร์ GA → ปรากฏในคอนโซล GA4 ภายในไม่กี่วินาที |
| **Next.js Script Component** | การโหลด script ที่เพิ่มประสิทธิภาพ | - มีใน Next.js<br>- ควบคุม strategy (afterInteractive, lazyOnload)<br>- ป้องกันการบล็อก render<br>- เพิ่มประสิทธิภาพการโหลดอัตโนมัติ | `<Script strategy="afterInteractive">` → โหลดหลังหน้าโต้ตอบได้ → ไม่บล็อก → ทำงานเมื่อเบราว์เซอร์ idle คะแนน Core Web Vitals ดีขึ้น |

### ฐานข้อมูลและการจัดการสถานะ

| ไลบรารี/API | วัตถุประสงค์ | เหตุผลที่เลือกใช้ | วิธีการทำงาน |
|------------|---------|----------------|--------------|
| **Supabase Database** | Query สถิติรวม | - PostgreSQL (การรวมที่ทรงพลัง)<br>- PostgREST auto-API<br>- รวม auth ในตัว<br>- Row-level security | SQL aggregation queries (SUM, COUNT, AVG) → PostgREST แปลงเป็น REST API → JavaScript SDK ทำ query แบบ type-safe การรวมและคำนวณที่ซับซ้อนทำงานอย่างมีประสิทธิภาพในฐานข้อมูล |
| **React Context API** | แชร์สถานะ auth | - มีใน React<br>- ไม่มี dependency เพิ่ม<br>- เรียบง่ายสำหรับสถานะผู้ใช้ส่วนกลาง<br>- เพียงพอสำหรับการตรวจสอบบทบาทแอดมิน | `AuthProvider` ครอบแอป → เก็บ object `user` → hook `useAuth()` เข้าถึงจาก component ใดก็ได้ → Re-render เฉพาะ consumers เมื่อผู้ใช้เปลี่ยน |
| **date-fns** | การจัดการวันที่ | - แบบโมดูล (tree-shakeable)<br>- Immutable API (ปลอดภัยกว่า)<br>- รองรับ TypeScript<br>- เล็กกว่า Moment.js | ฟังก์ชันเช่น `format()`, `subDays()`, `isAfter()` → ฟังก์ชันบริสุทธิ์ → ไม่มี prototype pollution → import เฉพาะฟังก์ชันที่ต้องการ ตัวอย่าง: `format(new Date(), 'yyyy-MM-dd')` |

---

## 4. ตรรกะหลัก

### 4.1 ตัวชี้วัดประสิทธิภาพหลัก (KPIs)

**การจองทั้งหมด:**
```sql
SELECT COUNT(*) as total_bookings
FROM bookings;
```

**รายได้ทั้งหมด:**
```sql
SELECT SUM(total_amount) as total_revenue
FROM bookings
WHERE status IN ('Confirmed', 'Completed');
```

**อัตราการเข้าพัก:**
```sql
-- คำนวณสำหรับวันนี้
WITH total_rooms AS (
  SELECT COUNT(*) as count FROM rooms WHERE is_active = true
),
occupied_rooms AS (
  SELECT COUNT(DISTINCT room_id) as count
  FROM bookings
  WHERE status IN ('Confirmed', 'Checked-In')
  AND check_in_date <= CURRENT_DATE
  AND check_out_date > CURRENT_DATE
)
SELECT 
  (occupied_rooms.count::FLOAT / total_rooms.count) * 100 as occupancy_rate
FROM total_rooms, occupied_rooms;
```

**มูลค่าการจองเฉลี่ย:**
```sql
SELECT AVG(total_amount) as avg_booking_value
FROM bookings
WHERE status IN ('Confirmed', 'Completed');
```

### 4.2 Components แดชบอร์ดการวิเคราะห์

**กราฟแนวโน้มการจอง (Line Chart):**
```typescript
// โครงสร้างข้อมูลสำหรับ Recharts
const bookingTrendsData = [
  { date: '2025-01-01', bookings: 15, revenue: 45000 },
  { date: '2025-01-02', bookings: 20, revenue: 60000 },
  // ... ข้อมูลเพิ่มเติม
];

<LineChart data={bookingTrendsData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="bookings" stroke="#8884d8" />
  <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
</LineChart>
```

**การกระจายประเภทห้อง (Pie Chart):**
```typescript
const roomTypeData = [
  { name: 'Deluxe', value: 45, bookings: 120 },
  { name: 'Suite', value: 30, bookings: 80 },
  { name: 'Superior', value: 25, bookings: 65 }
];

<PieChart>
  <Pie data={roomTypeData} dataKey="value" nameKey="name" />
</PieChart>
```

**รายได้ต่อเดือน (Bar Chart):**
```typescript
const revenueByMonth = [
  { month: 'Jan', revenue: 450000 },
  { month: 'Feb', revenue: 520000 },
  // ... เดือนเพิ่มเติม
];

<BarChart data={revenueByMonth}>
  <XAxis dataKey="month" />
  <YAxis />
  <Bar dataKey="revenue" fill="#8884d8" />
</BarChart>
```

### 4.3 การใช้งาน Google Analytics 4

#### Client-Side Setup (src/lib/gtag.ts)

```typescript
// src/lib/gtag.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// ติดตามการดูหน้า
export const pageview = (url: string) => {
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url
  });
};

// ติดตามเหตุการณ์แบบกำหนดเอง
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
};
```

#### การรวมระบบ Next.js App (pages/_app.tsx)

```typescript
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Script from 'next/script';
import * as gtag from '@/lib/gtag';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // ติดตามการดูหน้าเมื่อเปลี่ยนเส้นทาง
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
  
  return (
    <>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `
        }}
      />
      
      <Component {...pageProps} />
    </>
  );
}
```

#### ตัวอย่างการติดตามเหตุการณ์แบบกำหนดเอง

**ติดตามการจองเสร็จสมบูรณ์:**
```typescript
import * as gtag from '@/lib/gtag';

// หลังชำระเงินการจองสำเร็จ
gtag.event({
  action: 'purchase',
  category: 'Booking',
  label: roomType,
  value: totalAmount
});

// ทางเลือก: ใช้เหตุการณ์ e-commerce มาตรฐาน
window.gtag('event', 'purchase', {
  transaction_id: bookingId,
  value: totalAmount,
  currency: 'THB',
  items: [{
    item_id: roomId,
    item_name: roomType,
    price: pricePerNight,
    quantity: nightCount
  }]
});
```

**ติดตามการโต้ตอบแชทบอท:**
```typescript
// เมื่อผู้ใช้เปิดแชทบอท
gtag.event({
  action: 'chatbot_open',
  category: 'Chatbot',
  label: 'ผู้ใช้เปิด widget แชทบอท'
});

// เมื่อผู้ใช้ถามคำถาม
gtag.event({
  action: 'chatbot_message',
  category: 'Chatbot',
  label: 'ผู้ใช้ส่งข้อความ'
});
```

---

## 5. โมเดลข้อมูล / โครงสร้างฐานข้อมูล

### View/Query: `dashboard_statistics`
```sql
-- สามารถเป็น materialized view สำหรับประสิทธิภาพ
CREATE VIEW dashboard_statistics AS
SELECT
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT SUM(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')) as total_revenue,
  (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') as pending_bookings,
  (SELECT COUNT(DISTINCT customer_id) FROM bookings) as unique_customers,
  (SELECT AVG(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')) as avg_booking_value;
```

### ตาราง: `ga4_stats` (การแคชเป็นตัวเลือก)
```sql
CREATE TABLE ga4_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  page_path TEXT,
  page_views INTEGER,
  unique_users INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ga4_date ON ga4_stats(date),
  INDEX idx_ga4_page ON ga4_stats(page_path)
);
```

### การตั้งค่า GA4 Service Account

**ga4-access-key.json:**
```json
{
  "type": "service_account",
  "project_id": "neatly-hotel",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ga4-api@neatly-hotel.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### ตัวแปร Environment

```env
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=properties/507618812
```

---

## 6. กรณีพิเศษ / ข้อจำกัด / TODO

### กรณีพิเศษที่จัดการแล้ว
1. **ไม่มีการจอง**: แดชบอร์ดแสดงค่า 0 อย่างสวยงาม
2. **GA4 API Errors**: ย้อนกลับไปยังข้อมูลแคชหรือแสดงข้อความ error
3. **ชุดข้อมูลใหญ่**: Pagination สำหรับรายการการจอง
4. **การตรวจสอบช่วงวันที่**: ป้องกันช่วงวันที่ที่ไม่ถูกต้อง
5. **การเข้าถึงตามบทบาท**: ผู้ใช้ที่ไม่ใช่แอดมินถูกเปลี่ยนเส้นทาง
6. **การอัปเดตแบบเรียลไทม์**: รีเฟรชสถิติเป็นระยะ
7. **Ad Blockers**: GA4 scripts อาจถูกบล็อก (degradation อย่างสง่างาม)
8. **API Rate Limits**: การจัดการ error สำหรับ GA4 quota limits

### ข้อจำกัดปัจจุบัน
1. **ไม่มีข้อมูลเรียลไทม์**: สถิติรีเฟรชเมื่อโหลดหน้า (ไม่ใช่ WebSocket สด)
2. **GA4 Property เดียว**: รองรับเพียง GA4 property เดียว
3. **ไม่มีการส่งออก**: ไม่สามารถส่งออกข้อมูลแดชบอร์ดเป็น PDF/Excel
4. **ช่วงวันที่คงที่**: ช่วงที่ตั้งไว้จำกัด (ไม่มี custom date picker)
5. **ไม่มีการเปรียบเทียบ**: ไม่สามารถเปรียบเทียบช่วงเวลา (เดือนนี้ vs เดือนที่แล้ว)
6. **ไม่มีการคาดการณ์**: ไม่มีการวิเคราะห์เชิงคาดการณ์
7. **ไม่มีการแจ้งเตือน**: ไม่มีการแจ้งเตือนอัตโนมัติสำหรับความผิดปกติ
8. **การแสดงผลพื้นฐาน**: ประเภทกราฟจำกัด
9. **GA4 Data Delay**: ความล่าช้า 24-48 ชั่วโมงในการรายงาน GA4
10. **ไม่มี Custom Dimensions**: ไม่ใช้ GA4 custom dimensions

### TODO / การพัฒนาในอนาคต

**การปรับปรุงแดชบอร์ด:**
- [ ] **แดชบอร์ดเรียลไทม์**: การอัปเดต WebSocket สำหรับข้อมูลสด
- [ ] **Custom Date Range Picker**: การเลือกวันที่ที่ยืดหยุ่น
- [ ] **การเปรียบเทียบช่วงเวลา**: เปรียบเทียบช่วงปัจจุบัน vs ช่วงก่อนหน้า
- [ ] **ฟังก์ชันการส่งออก**: การส่งออก PDF, Excel, CSV
- [ ] **กราฟขั้นสูง**: Heatmaps, funnel charts, cohort analysis
- [ ] **การคาดการณ์**: อัตราการเข้าพักและรายได้เชิงคาดการณ์
- [ ] **ระบบแจ้งเตือน**: การแจ้งเตือนทาง Email/SMS สำหรับอัตราการเข้าพักต่ำ การยกเลิกสูง
- [ ] **รองรับหลายที่พัก**: จัดการหลายที่พักโรงแรม
- [ ] **เมตริกแบบกำหนดเอง**: KPIs ที่ผู้ใช้กำหนด
- [ ] **รายงานแบบ Drill-down**: คลิกกราฟเพื่อดูการแยกย่อยโดยละเอียด
- [ ] **รายงานตามกำหนดการ**: รายงานทาง Email อัตโนมัติรายวัน/รายสัปดาห์
- [ ] **แดชบอร์ดตามบทบาท**: มุมมองที่แตกต่างกันสำหรับบทบาทแอดมินต่างๆ
- [ ] **แดชบอร์ดมือถือ**: แอปแอดมินมือถือที่เพิ่มประสิทธิภาพ

**การพัฒนา GA4:**
- [ ] **Enhanced E-commerce Tracking**: การติดตามช่องทางเต็มรูปแบบ
- [ ] **User ID Tracking**: เชื่อมโยงข้อมูล GA4 กับผู้ใช้ที่ยืนยันตัวตน
- [ ] **Custom Dimensions**: ติดตามประเภทห้อง โค้ดส่วนลด ฯลฯ
- [ ] **Funnel Visualization**: ติดตามการหลุดออกของช่องทางการจอง
- [ ] **Cohort Analysis**: ติดตามการรักษาผู้ใช้ตามเวลา
- [ ] **A/B Testing Integration**: ติดตามตัวแปรการทดลอง
- [ ] **Cross-Domain Tracking**: ติดตามผู้ใช้ข้าม subdomain
- [ ] **Event Debugging**: เพิ่มการรวม GA4 DebugView
- [ ] **Privacy Controls**: ฟีเจอร์ตาม GDPR/CCPA
- [ ] **Consent Management**: การรวมความยินยอม Cookie
- [ ] **Custom Alerts**: การแจ้งเตือนทาง Email สำหรับความผิดปกติของการเข้าชม
- [ ] **Heatmap Integration**: การติดตามการโต้ตอบผู้ใช้แบบภาพ

### ปัญหาที่ทราบ
- **GA4 API Rate Limits**: อาจถึง quota limits กับคำขอบ่อยๆ (25,000/วัน)
- **ปัญหา Timezone**: สถิติอาจไม่สอดคล้องกับเขตเวลาท้องถิ่นของโรงแรม
- **Cached Stats Staleness**: ไม่มีการทำให้แคชเป็นโมฆะอัตโนมัติ
- **ประสิทธิภาพชุดข้อมูลใหญ่**: การ query ช้าสำหรับโรงแรมที่มีข้อมูลหลายปี
- **ไม่มีนโยบายการเก็บรักษาข้อมูล**: ข้อมูลในอดีตเติบโตไม่มีกำหนด
- **Ad Blockers**: ~30% ของผู้ใช้อาจบล็อก GA4 scripts
- **โหมดความเป็นส่วนตัว**: Safari ITP อาจจำกัดความแม่นยำในการติดตาม
- **ข้อมูลล่าช้า**: ข้อมูล GA4 มีความล่าช้าในการประมวลผล 24-48 ชั่วโมง
- **Sampling**: ชุดข้อมูลใหญ่ใน GA4 อาจถูก sampled (ไม่แม่นยำ)


