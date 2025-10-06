// import Layout from "@/components/Layout";
// import Footer from "@/components/Footer";
// import BookingCard, { type Booking } from "@/components/bookings/BookingCard";
// import { supabase } from "@/lib/supabaseClient";

// const data: Booking[] = [
//   {
//     id: "bk_1001",
//     roomName: "Superior Garden View",
//     imageUrl: "/images/sample-room-1.png",
//     checkInDate: "Wed, 1 Oct 2025",
//     checkInNote: "After 2:00 PM",
//     checkOutDate: "Thu, 2 Oct 2025",
//     checkOutNote: "Before 12:00 PM",
//     bookedAtText: "Tue, 30 Sep 2025",
//     guests: 2,
//     nights: 1,
//     payment: { status: "success", method: "Credit Card", mask: "*888" },
//     items: [
//       { label: "Superior Garden View Room", amount: 2500.0 },
//       { label: "Airport transfer", amount: 200.0 },
//       { label: "Promotion Code", amount: -400.0 },
//     ],
//     currency: "THB",
//     total: 2300.0,
//     additionalRequest: "Can i have some chocolate?",
//   },
//   {
//     id: "bk_1002",
//     roomName: "Deluxe",
//     imageUrl: "/images/sample-room-2.png",
//     checkInDate: "Thu, 2 Oct 2025",
//     checkInNote: "After 2:00 PM",
//     checkOutDate: "Fri, 3 Oct 2025",
//     checkOutNote: "Before 12:00 PM",
//     bookedAtText: "Tue, 16 Oct 2022",
//     guests: 2,
//     nights: 1,
//     payment: { status: "success", method: "Credit Card", mask: "*123" },
//     items: [
//       { label: "Deluxe Room", amount: 3200.0 },
//       { label: "Breakfast", amount: 300.0 },
//       { label: "Promo", amount: -500.0 },
//     ],
//     currency: "THB",
//     total: 3000.0,
//     additionalRequest: "Late check-out if possible.",
//   },
//   {
//     id: "bk_1003",
//     roomName: "Premier Sea View",
//     imageUrl: "/images/sample-room-3.png",
//     checkInDate: "Fri, 4 Oct 2025",
//     checkInNote: "After 2:00 PM",
//     checkOutDate: "Sat, 5 Oct 2025",
//     checkOutNote: "Before 12:00 PM",
//     bookedAtText: "Tue, 16 Oct 2022",
//     guests: 3,
//     nights: 2,
//     payment: { status: "success", method: "Bank Transfer" },
//     items: [
//       { label: "Premier Sea View", amount: 4200.0 },
//       { label: "Extra bed", amount: 600.0 },
//     ],
//     currency: "THB",
//     total: 4800.0,
//   },
// ];

// export default function BookingHistoryPage() {
//   return (
//     <Layout>
//       <main className="max-w-[1120px] mx-auto  md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
//         <h1 className="text-[44px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
//           Booking History
//         </h1>

//         <div className="space-y-8">
//           {data.map((item) => (
//             <BookingCard key={item.id} booking={item} />
//           ))}
//         </div>
//       </main>
//       <Footer />
//     </Layout>
//   );
// }

// import { useEffect, useState } from "react";
// import Layout from "@/components/Layout";
// import Footer from "@/components/Footer";
// import BookingCard, { type Booking } from "@/components/bookings/BookingCard";
// import { supabase } from "@/lib/supabaseClient";

// // แปลงวันที่ให้อ่านง่าย
// function fmtDate(d?: string | null) {
//   if (!d) return "-";
//   const dt = new Date(d);
//   return dt.toLocaleDateString("en-US", {
//     weekday: "short",
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//   });
// }

// export default function BookingHistoryPage() {
//   const [bookings, setBookings] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchBookings() {
//       setLoading(true);
//       setError(null);

//       // ✅ ดึงเฉพาะคอลัมน์ที่ต้องการ + promo_code
//       const { data, error } = await supabase
//         .from("bookings") // ถ้าชื่อจริงเป็น "booking" ให้แก้ตรงนี้
//         .select(
//           "id, booking_date, check_in_date, check_out_date, total_amount, additional_request, promo_code"
//         )
//         .order("booking_date", { ascending: false });

//       if (error) {
//         setError(error.message);
//         setLoading(false);
//         return;
//       }

//       const mapped: Booking[] = (data || []).map((row: any) => ({
//         id: row.id,
//         roomName: "Room", // ยังไม่มีชื่อห้องในตารางนี้ → ใส่ไว้ก่อน
//         imageUrl: "/images/sample-room-1.png",

//         checkInDate: fmtDate(row.check_in_date),
//         checkOutDate: fmtDate(row.check_out_date),
//         bookedAtText: fmtDate(row.booking_date),

//         // ✅ promo code
//         promoCode: row.promo_code || undefined,

//         // ฟิลด์อื่น ๆ ให้ default ไว้ก่อนเพื่อให้การ์ดทำงานได้ครบ
//         checkInNote: undefined,
//         checkOutNote: undefined,
//         guests: 1,
//         nights: 1,
//         payment: { status: "success", method: "Credit Card" },
//         items: [{ label: "Room total", amount: Number(row.total_amount) || 0 }],
//         currency: "THB",
//         total: Number(row.total_amount) || 0,
//         additionalRequest: row.additional_request || undefined,
//       }));

//       setBookings(mapped);
//       setLoading(false);
//     }

//     fetchBookings();
//   }, []);

//   return (
//     <Layout>
//       <main className="max-w-[1120px] mx-auto md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
//         <h1 className="text-[44px] sm:text-[52px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
//           Booking History
//         </h1>

//         {loading && <div className="px-5 text-gray-600">Loading...</div>}
//         {error && <div className="px-5 text-red-600">Error: {error}</div>}

//         <div className="space-y-8">
//           {bookings.map((b) => (
//             <BookingCard key={b.id} booking={b} />
//           ))}
//         </div>
//       </main>
//       <Footer />
//     </Layout>
//   );
// }

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/bookings/BookingCard";
import { supabase } from "@/lib/supabaseClient";

// แปลงวันที่ให้อ่านง่าย
function fmtDate(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);

      // ✅ ดึงเฉพาะคอลัมน์ที่ต้องการจากตาราง bookings
      const { data, error } = await supabase
        .from("bookings") // ถ้าชื่อจริงเป็น booking ให้แก้ตรงนี้
        .select(
          "id, booking_date, check_in_date, check_out_date, total_amount, additional_request, promo_code, special_requests"
        )
        .order("booking_date", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // ✅ Map ข้อมูลจากฐานให้ตรงกับโครง BookingCard
      const mapped: Booking[] = (data || []).map((row: any) => {
        // special_requests เป็น array ของ string เช่น ["Breakfast","Extra bed"]
        const requests =
          Array.isArray(row.special_requests) && row.special_requests.length > 0
            ? [...row.special_requests].sort() // เรียงตามตัวอักษร
            : [];

        // แปลงเป็น items (ไม่มีราคา)
        const items = requests.map((r: string) => ({
          label: r,
          amount: 0,
        }));

        return {
          id: row.id,
          roomName: "Room", // ตอนนี้ยังไม่มีข้อมูลห้องในตารางนี้
          imageUrl: "/images/sample-room-1.png",

          checkInDate: fmtDate(row.check_in_date),
          checkOutDate: fmtDate(row.check_out_date),
          bookedAtText: fmtDate(row.booking_date),

          promoCode: row.promo_code || undefined,

          guests: 1,
          nights: 1,
          payment: { status: "success", method: "Credit Card" },

          // ✅ ใช้ special_requests เป็นรายการแสดงใน BookingCard
          items,
          currency: "THB",
          total: Number(row.total_amount) || 0,
          additionalRequest: row.additional_request || undefined,
        };
      });

      setBookings(mapped);
      setLoading(false);
    }

    fetchBookings();
  }, []);

  return (
    <Layout>
      <main className="max-w-[1120px] mx-auto md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
        <h1 className="text-[44px] sm:text-[52px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
          Booking History
        </h1>

        {loading && <div className="px-5 text-gray-600">Loading...</div>}
        {error && <div className="px-5 text-red-600">Error: {error}</div>}

        <div className="space-y-8">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      </main>
      <Footer />
    </Layout>
  );
}