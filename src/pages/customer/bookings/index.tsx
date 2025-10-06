import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/bookings/BookingCard";
import { supabase } from "@/lib/supabaseClient";

// ฟังก์ชันแปลงวันที่ให้อ่านง่าย
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

// ฟังก์ชันคำนวณจำนวนคืนจาก check-in / check-out
function calcNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diffMs = b.getTime() - a.getTime();

  // ถ้าเวลาไม่ถูกต้องหรือเป็นวันเดียวกัน
  if (diffMs <= 0) return 1;

  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return nights || 1;
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);

      // join ตาราง rooms ผ่าน room_id เพื่อดึงข้อมูลห้อง
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          room_id,
          booking_date,
          check_in_date,
          check_out_date,
          total_amount,
          additional_request,
          promo_code,
          special_requests,
          status,
          payment_method,
          rooms:room_id (
            room_type,
            main_image_url,
            currency,
            guests
          )
        `)
        .order("booking_date", { ascending: false });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const mapped: Booking[] = (data || []).map((row: any) => {
        // ชื่อห้องจาก room_type
        const roomName: string = row?.rooms?.room_type ?? "Room";

        // ✅ ใช้ main_image_url เป็นรูปห้อง
        const rawImg = row?.rooms?.main_image_url;
        let imageUrl = "/images/sample-room-1.png";
        if (Array.isArray(rawImg) && rawImg.length > 0) imageUrl = rawImg[0];
        else if (typeof rawImg === "string" && rawImg.trim()) {
          try {
            const parsed = JSON.parse(rawImg);
            if (Array.isArray(parsed) && parsed[0]) imageUrl = parsed[0];
            else imageUrl = rawImg;
          } catch {
            imageUrl = rawImg;
          }
        }

        //  ใช้ currency กับ guests จาก rooms
        const currency: string = row?.rooms?.currency ?? "THB";
        const guests: number =
          typeof row?.rooms?.guests === "number" && row.rooms.guests > 0
            ? row.rooms.guests
            : 1;

        // แปลง special_requests เป็น array
        let requests: string[] = [];
        const sr = row?.special_requests;
        if (Array.isArray(sr)) {
          requests = [...sr];
        } else if (typeof sr === "string" && sr.trim()) {
          try {
            const parsed = JSON.parse(sr);
            if (Array.isArray(parsed)) requests = parsed.filter(Boolean);
          } catch {
            requests = sr.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }
        requests.sort();

        // คำนวณจำนวนคืน
        const nights = calcNights(row?.check_in_date, row?.check_out_date);

        //  แสดงเป็นรายการ (ไม่มีราคา)
        const items = requests.map((r: string) => ({
          label: r,
          amount: 0,
        }));

        return {
          id: row.id,
          roomName,
          imageUrl,
          checkInDate: fmtDate(row?.check_in_date),
          checkOutDate: fmtDate(row?.check_out_date),
          bookedAtText: fmtDate(row?.booking_date),
          promoCode: row?.promo_code || undefined,

          checkInNote: undefined,
          checkOutNote: undefined,
          guests,
          nights, // ✅ ใส่ nights ที่คำนวณได้
          payment: {
            status:
              row?.status === "confirmed"
                ? "success"
                : row?.status === "refunded" || row?.status === "cancelled"
                ? "failed"
                : "pending",
            method: row?.payment_method ?? "Credit Card",
          },
          items,
          currency,
          total: Number(row?.total_amount) || 0,
          additionalRequest: row?.additional_request || undefined,
        } as Booking;
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