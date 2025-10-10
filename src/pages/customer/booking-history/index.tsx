import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/booking-history/BookingCard";
import { supabase } from "@/lib/supabaseClient";

type RoomFields = {
  room_type: string | null;
  main_image_url: string | string[] | null;
  currency: string | null;
  guests: number | null;
};

type PaymentLite = {
  card_last_four: string | null;
  amount: number | null;
};

type BookingRowRaw = {
  id: string;
  room_id: string | null;
  created_at: string | null;
  booking_date: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  total_amount: number | null;
  additional_request: string | null;
  promo_code: string | null;
  special_requests: string[] | string | null;
  status: string | null;
  payment_method: string | null;

  // ความสัมพันธ์ (join) จากตารางอื่นๆ
  rooms: RoomFields | RoomFields[] | null;
  payments: PaymentLite | PaymentLite[] | null;
};

type PostgrestErrorLite = { message?: string } | null;

/* ---------- Utils (ฟังก์ชันช่วย) ---------- */
// แปลง string วันที่ (UTC) ให้เป็นข้อความอ่านง่าย เช่น "Fri, Oct 10, 2025"
function fmtDateUTC(d?: string | null) {
  if (!d) return "-";
  const safe = typeof d === "string" ? d.replace(" ", "T") : d; // กัน format "YYYY-MM-DD HH:mm:ss"
  const dt = new Date(safe);
  if (Number.isNaN(dt.getTime())) return "-";
  const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const m = [
    "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
  ][dt.getUTCMonth()];
  const day = dt.getUTCDate();
  const year = dt.getUTCFullYear();
  return `${w}, ${m} ${day}, ${year}`;
}

// คำนวณจำนวนคืนระหว่าง check-in กับ check-out (อย่างน้อย 1 คืน)
function calcNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diffMs = b.getTime() - a.getTime();
  if (diffMs <= 0) return 1;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
}

const FALLBACK_IMG = "/images/sample-room-1.png";

// คืน URL รูปที่ปลอดภัย (รองรับทั้ง string, array, หรือ string ที่เป็น JSON)
function safeImageUrl(raw: string | string[] | null | undefined): string {
  if (!raw) return FALLBACK_IMG;
  if (Array.isArray(raw)) {
    const first = raw.find((s) => typeof s === "string" && s.trim().length > 0);
    return first ?? FALLBACK_IMG;
  }
  const s = String(raw).trim();
  if (!s) return FALLBACK_IMG;
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const first = parsed.find((x) => typeof x === "string" && x.trim().length > 0);
      return first ?? FALLBACK_IMG;
    }
    if (typeof parsed === "string" && parsed.trim()) return parsed;
  } catch {
    // ถ้า parse ไม่ได้และไม่ใช่ค่ากลวง ให้ใช้ raw เดิม
    if (s && s !== "[]" && s !== '[""]') return s;
  }
  return FALLBACK_IMG;
}

// ทำหน้ากากเลขบัตร 4 ตัวท้าย (รองรับหลายรูปแบบ)
function last4Mask(v?: string | null) {
  if (!v) return undefined;
  const cleaned = v.replace(/\s+/g, "").replace(/[^\d]/g, "");
  if (cleaned.length >= 3 && cleaned.length <= 4) return `*${cleaned}`;
  if (cleaned.length > 4) return `*${cleaned.slice(-4)}`;
  return undefined;
}

/* ---------- Page ---------- */
const PAGE_SIZE = 6;

export default function BookingHistoryPage() {
  // รายการจองที่แปลงแล้ว -> ส่งให้ BookingCard แสดง
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);          // สถานะกำลังโหลด
  const [error, setError] = useState<string | null>(null); // ข้อความผิดพลาดถ้ามี
  const [page, setPage] = useState(1);                   // หน้า pagination ปัจจุบัน
  const [total, setTotal] = useState(0);                 // จำนวนทั้งหมด (ไว้คำนวณหน้ารวม)

  const [userId, setUserId] = useState<string | null>(null); // id ผู้ใช้จาก Supabase Auth
  const [authLoading, setAuthLoading] = useState(true);      // รอเช็ค session ให้เรียบร้อยก่อน

  // requestSeqRef: ตัวนับลำดับ request ล่าสุด เพื่อกัน race condition
  // ถ้า response เก่ากลับมาทีหลัง จะไม่เอามาทับ state ปัจจุบัน
  const requestSeqRef = useRef(0);

  /* ---------- Auth ---------- */
  useEffect(() => {
    let mounted = true;
    setAuthLoading(true);

    // ดึง session ปัจจุบัน (โหลดครั้งแรก)
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthLoading(false);
    });

    // subscribe การเปลี่ยนแปลงสถานะ auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* ---------- Fetch Data ---------- */
  useEffect(() => {
    if (authLoading) return; // ยังไม่รู้ user → รอ

    // เพิ่มลำดับ request (seq) เพื่อบอกว่า request ชุดนี้ใหม่สุด
    const mySeq = ++requestSeqRef.current;

    let alive = true;       // flag กัน setState ตอน component unmount แล้ว
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // คำนวณช่วงแถวที่ต้องดึงตามหน้า
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // ใส่ AbortController + timeout 15s กันเน็ตค้าง
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // สร้าง query หลัก
        let query = supabase
          .from("bookings")
          .select(
            `
            id,
            room_id,
            created_at,
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
            ),
            payments:payments!booking_id (
              card_last_four,
              amount
            )
          `,
            { count: "exact" } // ให้ Supabase ส่ง count มาด้วย
          )
          .order("created_at", { ascending: false })
          .range(from, to)
          .abortSignal(controller.signal);

        // ถ้ามี user ให้กรองเฉพาะของคนนั้น
        if (userId) query = query.eq("customer_id", userId);

        // ยิง query
        const { data, error: qErr, count } = await query;
        clearTimeout(timeout);

        // ถ้า effect ถูก cleanup ไปแล้ว หรือมี request ใหม่กว่า -> ไม่อัปเดต state
        if (!alive || mySeq !== requestSeqRef.current) return;
        if (qErr) throw qErr;

        // เก็บจำนวนรวมไว้ทำ pagination
        setTotal(count ?? 0);

        // map ข้อมูลจาก DB ในรูปแบบที่การ์ดใช้
        const rows = (data ?? []) as BookingRowRaw[];
        const mapped: Booking[] = rows.map((row) => {
          // rooms อาจเป็น object หรือ array → normalize เอาตัวแรก
          const roomsObj: RoomFields | null = Array.isArray(row.rooms)
            ? (row.rooms[0] ?? null)
            : row.rooms;

          const roomName = roomsObj?.room_type?.trim() || "Room";
          const imageUrl = safeImageUrl(roomsObj?.main_image_url);
          const currency: string = roomsObj?.currency ?? "THB";
          const guests: number =
            typeof roomsObj?.guests === "number" && roomsObj?.guests > 0
              ? roomsObj.guests
              : 1;

          // แปลง special_requests ให้เป็น array ของ string 
          let requests: string[] = [];
          const sr = row.special_requests;
          if (Array.isArray(sr)) {
            requests = [...sr];
          } else if (typeof sr === "string" && sr.trim()) {
            try {
              const parsed = JSON.parse(sr);
              requests = Array.isArray(parsed)
                ? parsed.filter(Boolean)
                : sr.split(",").map((s) => s.trim()).filter(Boolean);
            } catch {
              requests = sr.split(",").map((s) => s.trim()).filter(Boolean);
            }
          }
          requests.sort();
          const items = requests.map((r) => ({ label: r, amount: 0 }));

          // ดึงข้อมูลจ่ายเงินตัวแรก (ถ้ามีหลาย payment)
          const paymentObj = Array.isArray(row.payments)
            ? row.payments[0] ?? null
            : row.payments;

          const mask = last4Mask(paymentObj?.card_last_four);
          // ถ้าไม่มีจำนวนเงินใน payments ใช้ total_amount ใน bookings แทน
          const totalAmount =
            typeof paymentObj?.amount === "number"
              ? paymentObj.amount
              : Number(row.total_amount) || 0;

          return {
            id: row.id,
            roomName,
            imageUrl,
            checkInDate: fmtDateUTC(row.check_in_date),
            checkOutDate: fmtDateUTC(row.check_out_date),
            bookedAtText: fmtDateUTC(row.created_at ?? row.booking_date),
            checkInAtRaw: row.check_in_date ?? undefined, // เก็บ raw ไว้ใช้คำนวณฝั่งการ์ด
            guests,
            nights: calcNights(row.check_in_date, row.check_out_date),
            payment: {
              status:
                row.status === "confirmed"
                  ? "success"
                  : row.status === "refunded" || row.status === "cancelled"
                  ? "failed"
                  : "pending",
              method: row.payment_method ?? "credit card",
              mask,
            },
            items,
            currency,
            total: totalAmount,
            additionalRequest: row.additional_request || undefined,
            promoCode: row.promo_code || undefined,
          };
        });

        setBookings(mapped);
      } catch (e) {
        if (!alive) return; // ถ้า unmount แล้วให้หยุด
        const msg =
          (e as { name?: string; message?: string })?.name === "AbortError"
            ? "Request timed out"
            : (e as { message?: string })?.message || "Failed to load bookings";
        setError(msg);
        setBookings([]);
        setTotal(0);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    // cleanup: แจ้งว่า effect นี้ไม่ active แล้ว (กัน setState หลัง unmount)
    return () => {
      alive = false;
    };
  }, [authLoading, userId, page]);

  /* ---------- Handle Delete (ส่งสัญญาณมาหลังลบสำเร็จ) ---------- */
  const handleDeleted = (id: string) => {
    // เอาการ์ดที่ถูกลบทิ้งออกจาก state
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setTotal((t) => Math.max(0, t - 1));

    // ถ้าหน้าปัจจุบันว่างและยังมีหน้าก่อนหน้า → ถอยหน้า 1 ขั้น
    setTimeout(() => {
      if (bookings.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    }, 0);
  };

  // จำนวนหน้าทั้งหมด (อย่างน้อย 1 หน้า)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // สร้างกลุ่มหมายเลขหน้าให้แสดง (แถบ pagination)
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxToShow = 5;           // แสดงได้สูงสุดกี่ปุ่ม
    const totalP = totalPages;
    if (totalP <= maxToShow) {
      for (let i = 1; i <= totalP; i++) pages.push(i);
      return pages;
    }
    let start = Math.max(1, page - 2);
    const end = Math.min(totalP, start + maxToShow - 1);
    if (end - start + 1 < maxToShow) start = Math.max(1, end - maxToShow + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  /* ---------- Render ---------- */
  return (
    <Layout>
      <main className="max-w-[1120px] mx-auto md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
        <h1 className="text-[44px] sm:text-[52px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
          Booking History
        </h1>

        {/* สถานะต่างๆตอนบน */}
        {(authLoading || loading) && <div className="px-5 text-gray-600">Loading...</div>}

        {!authLoading && !loading && !error && userId && bookings.length === 0 && (
          <div className="px-5 text-gray-600">No bookings found.</div>
        )}

        {!authLoading && !userId && (
          <div className="px-5 text-gray-600">Please sign in to view your bookings.</div>
        )}

        {error && !loading && (
          <div className="px-5 text-red-600">
            Error: {error}{" "}
            <button
              className="ml-3 underline text-orange-600"
              onClick={() => setPage((p) => p)} // ปุ่ม retry: กระตุ้น useEffect ให้ดึงใหม่
            >
              Retry
            </button>
          </div>
        )}

        {/* รายการการ์ดการจอง */}
        <div className="space-y-8">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onDeleted={handleDeleted} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 px-5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`h-8 w-8 grid place-items-center rounded-md text-gray-400 hover:text-gray-700 ${
                page === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
              aria-label="Previous page"
            >
              ‹
            </button>

            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-8 min-w-8 px-3 rounded-md text-sm transition cursor-pointer ${
                  p === page
                    ? "bg-white border border-green-600 text-green-700"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`h-8 w-8 grid place-items-center rounded-md text-gray-400 hover:text-gray-700 ${
                page === totalPages ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        )}
      </main>
      <Footer />
    </Layout>
  );
}