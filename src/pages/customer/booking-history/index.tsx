import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import BookingCard, { type Booking } from "@/components/booking-history/BookingCard";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types from DB ---------- */
// โครงสร้างฟิลด์ของตาราง rooms (ฟิลด์ที่ดึงมาใช้)
type RoomFields = {
  room_type: string | null;
  main_image_url: string | string[] | null;
  currency: string | null;
  guests: number | null;
  promotion_price: number | null;
};

// โครงสร้างฟิลด์การจ่ายเงินแบบย่อ
type PaymentLite = {
  card_last_three: string | null;
  amount: number | null;
};

// โครงสร้างโปรโมโค้ดแบบย่อ (ไว้คำนวณส่วนลด)
type PromoCodeLite = {
  code?: string | null;
  discount_amount: number | null;
  discount_percent: number | null;
};

// โครงแถวข้อมูลที่ได้จาก query bookings (raw จาก DB)
type BookingRowRaw = {
  id: string;
  room_id: string | null;
  created_at: string | null;
  booking_date: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  cancellation_date: string | null;
  total_amount: number | null;
  additional_request: string | null;
  promo_code: string | null;
  special_requests: unknown;         // อาจมาได้หลายรูปแบบ (array / json string / string)
  standard_request: string[] | null;
  status: string | null;
  payment_method: string | null;
  guest_count: number | null;
  room_count: number | null;         // จำนวนห้องที่จอง
  rooms: RoomFields | RoomFields[] | null; // join กับตาราง rooms
  payments: PaymentLite | PaymentLite[] | null; // join กับตาราง payments
};

/* ---------- Utils ---------- */
// คำนวณส่วนลดจากโปรโมโค้ด (มีได้ทั้งแบบจำนวนเงินและเปอร์เซ็นต์)
function calculatePromoDiscount(promo: PromoCodeLite | null, totalAmount: number): number {
  if (!promo) return 0;
  if (promo.discount_amount && promo.discount_amount > 0) return Math.min(promo.discount_amount, totalAmount);
  if (promo.discount_percent && promo.discount_percent > 0) return (totalAmount * promo.discount_percent) / 100;
  return 0;
}

// แปลงวันที่ให้เป็นรูปแบบ "Wed, Oct 2, 2025" (อ่านตาม UTC)
function fmtDateUTC(d?: string | null) {
  if (!d) return "-";
  const safe = typeof d === "string" ? d.replace(" ", "T") : d; // กันเคสมีช่องว่าง
  const dt = new Date(safe);
  if (Number.isNaN(dt.getTime())) return "-";
  const w = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getUTCDay()];
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getUTCMonth()];
  return `${w}, ${m} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

// คำนวณจำนวนคืนจาก check-in / check-out (อย่างน้อย 1 คืน)
function calcNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diffMs = b.getTime() - a.getTime();
  if (diffMs <= 0) return 1;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
}

const FALLBACK_IMG = "/images/sample-room-1.png";

// เคลียร์ค่ารูปภาพจาก rooms.main_image_url ให้เป็น string ใช้ได้เสมอ
function safeImageUrl(raw: string | string[] | null | undefined): string {
  if (!raw) return FALLBACK_IMG;
  if (Array.isArray(raw)) {
    const first = raw.find((s) => typeof s === "string" && s.trim().length > 0);
    return first ?? FALLBACK_IMG;
  }
  const s = String(raw).trim();
  if (!s) return FALLBACK_IMG;
  try {
    // เผื่อกรณีเป็น JSON string ที่เก็บเป็น array ของ url
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const first = parsed.find((x) => typeof x === "string" && x.trim().length > 0);
      return first ?? FALLBACK_IMG;
    }
    if (typeof parsed === "string" && parsed.trim()) return parsed;
  } catch {
    // ถ้าไม่ใช่ JSON ก็ใช้ค่าตรงๆ ถ้าไม่ใช่ [] หรือ [""]
    if (s && s !== "[]" && s !== '[""]') return s;
  }
  return FALLBACK_IMG;
}

// แปลงเลขท้ายบัตรเป็นรูปแบบ *123
function last3Mask(v?: string | null) {
  if (!v) return undefined;
  const cleaned = v.replace(/\s+/g, "").replace(/[^\d]/g, "");
  if (cleaned.length === 3) return `*${cleaned}`;
  if (cleaned.length > 3) return `*${cleaned.slice(-3)}`;
  return undefined;
}

// ลบ prefix "standard:" ออกจาก label (ให้ชื่อดูสะอาด)
function cleanLabel(label: string): string {
  return String(label || "").replace(/^standard:\s*/i, "").trim();
}

/* ---------- Page ---------- */
const PAGE_SIZE = 6; // จำนวนรายการต่อหน้า

export default function BookingHistoryPage() {
  // สเตตหลักสำหรับแสดงผล
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);         // แสดงสถานะโหลด
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);                  // หน้าปัจจุบัน
  const [total, setTotal] = useState(0);                // จำนวนรายการทั้งหมด (ใช้คำนวณจำนวนหน้า)

  // auth
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ใช้กัน race-conditions ระหว่างคำขอหลายชุด (เช่นเปลี่ยนหน้าเร็วๆ)
  const requestSeqRef = useRef(0);

  // ไว้ใช้ scroll กลับขึ้นบนเมื่อเปลี่ยนหน้า
  const mainRef = useRef<HTMLDivElement>(null);

  // ฟังก์ชันเลื่อนขึ้นบนนิดหน่อยเพื่อ UX
  const scrollTop = () => {
    if (mainRef.current) mainRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    else if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goToPage = (p: number) => { setPage(p); scrollTop(); };

  /* ---------- Auth ---------- */
  useEffect(() => {
    let mounted = true;
    setAuthLoading(true);

    // ดึง session ปัจจุบัน
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthLoading(false);
    });

    // subscribe การเปลี่ยนสถานะ auth (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id ?? null);
      setAuthLoading(false);
    });

    // cleanup subscription เมื่อ unmount
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  /* ---------- Fetch Data ---------- */
  useEffect(() => {
    if (authLoading) return; // รอให้รู้ก่อนว่า user คือใคร

    const mySeq = ++requestSeqRef.current; // ล็อกลำดับคำขอรอบนี้
    let alive = true;                      // กัน setState หลัง unmount
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // คำนวณช่วง index สำหรับหน้า (range ของ Supabase เป็น inclusive)
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // ตั้ง abort เผื่อโหลดนานผิดปกติ
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s

        // สร้าง query หลักไปที่ bookings (join rooms + payments)
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
              cancellation_date,
              total_amount,
              additional_request,
              promo_code,
              special_requests,
              standard_request,
              status,
              payment_method,
              guest_count,
              room_count,
              rooms:room_id (
                room_type,
                main_image_url,
                currency,
                guests,
                promotion_price
              ),
              payments:payments!booking_id (
                card_last_three,
                amount
              )
            `,
            { count: "exact" } // ขอให้บอกจำนวนรายการรวมด้วย
          )
          .order("created_at", { ascending: false }) // เรียงรายการใหม่ล่าสุดก่อน
          .range(from, to)                           // ระบุช่วงข้อมูล
          .abortSignal(controller.signal);          // ผูกกับ abort controller

        // filter ตาม user ถ้ามี userId
        if (userId) query = query.eq("customer_id", userId);

        // ยิงคำขอ
        const { data, error: qErr, count } = await query;
        clearTimeout(timeout); // เคลียร์ timeout เมื่อสำเร็จ/ล้มเหลว

        if (!alive || mySeq !== requestSeqRef.current) return; // ถ้าไม่ใช่คำขอปัจจุบันให้ทิ้ง
        if (qErr) throw qErr;

        setTotal(count ?? 0); // ตั้งค่าจำนวนทั้งหมดสำหรับ pagination
        const rows = (data ?? []) as BookingRowRaw[];

        // ดึงโปรโมโค้ดทั้งหมดที่เกี่ยวข้องในหน้านี้ครั้งเดียว (เพื่อคำนวณส่วนลด)
        const promoCodeMap = new Map<string, PromoCodeLite>();
        const uniquePromoCodes = [...new Set(rows.map((r) => r.promo_code).filter(Boolean))] as string[];
        if (uniquePromoCodes.length > 0) {
          const { data: promoCodes } = await supabase
            .from("promo_codes")
            .select("code, discount_amount, discount_percent")
            .in("code", uniquePromoCodes);
          promoCodes?.forEach((p) =>
            promoCodeMap.set(p.code, {
              code: p.code,
              discount_amount: p.discount_amount,
              discount_percent: p.discount_percent,
            })
          );
        }

        // แปลงข้อมูลดิบจาก DB เป็นโครง Booking ที่การ์ดต้องการ
        const mapped: Booking[] = rows.map((row) => {
          // rooms อาจมาเป็น array หรือ object เดี่ยว เลย normalize ให้เป็น object
          const roomsObj: RoomFields | null = Array.isArray(row.rooms) ? row.rooms[0] ?? null : row.rooms;

          const roomName = roomsObj?.room_type?.trim() || "Room";
          const imageUrl = safeImageUrl(roomsObj?.main_image_url); // จัดการรูปให้ชัวร์ว่าเป็น URL string
          const currency: string = roomsObj?.currency ?? "THB";

          const guests: number =
            typeof row.guest_count === "number" && row.guest_count > 0 ? row.guest_count : 1;

          const nights = calcNights(row.check_in_date, row.check_out_date);
          const roomCount = typeof row.room_count === "number" && row.room_count > 0 ? row.room_count : 1;

          // แสดง (N Rooms) ต่อท้ายชื่อห้อง
          const roomCountText = `(${roomCount} Room${roomCount > 1 ? "s" : ""})`;

          // ---------- แปลง special_requests / standard_request เป็น items ----------
          type SRItem = { name?: unknown; price?: unknown } | string | number | null;
          let specialReqItems: Array<{ label: string; amount: number }> = [];

          // แปลง array ของ special_requests เป็นรายการคิดเงินได้
          const buildItemsFromArray = (arr: unknown[]) => {
            const items: Array<{ label: string; amount: number }> = [];
            arr.forEach((raw: unknown) => {
              const it = raw as SRItem;
              if (typeof it === "object" && it !== null && "name" in it) {
                const rawName = String((it as { name: unknown }).name ?? "");
                const name = cleanLabel(rawName);
                const priceRaw = (it as { price?: unknown }).price;
                const base = typeof priceRaw === "number" ? priceRaw : 0;
                const amount = base * roomCount; // ถ้าเป็นราคา/ห้อง ให้คูณจำนวนห้อง
                if (name && name.toLowerCase() !== "null") items.push({ label: name, amount });
              } else {
                const rawStr = String(it ?? "");
                const name = cleanLabel(rawStr);
                if (name && name.toLowerCase() !== "null") items.push({ label: name, amount: 0 });
              }
            });
            return items;
          };

          // เคส special_requests มาได้หลายแบบ: array / json string / string ธรรมดา
          if (Array.isArray(row.special_requests)) {
            specialReqItems = buildItemsFromArray(row.special_requests as unknown[]);
          } else if (typeof row.special_requests === "string" && row.special_requests.trim()) {
            try {
              const parsed = JSON.parse(row.special_requests);
              if (Array.isArray(parsed)) specialReqItems = buildItemsFromArray(parsed as unknown[]);
              else if (parsed) specialReqItems = buildItemsFromArray([parsed] as unknown[]);
            } catch {
              const name = cleanLabel(row.special_requests.trim());
              if (name && name.toLowerCase() !== "null") specialReqItems = [{ label: name, amount: 0 }];
            }
          }

          // standard_request เป็น array ของข้อความธรรมดา ไม่คิดเงิน
          let standardReqItems: Array<{ label: string; amount: number }> = [];
          if (Array.isArray(row.standard_request)) {
            standardReqItems = row.standard_request
              .map((s) => cleanLabel(String(s ?? "")))
              .filter((s) => s && s.toLowerCase() !== "null")
              .map((s) => ({ label: s, amount: 0 }));
          }

          // รวมทั้งหมดเป็น items
          const items = [...specialReqItems, ...standardReqItems];

          // ราคาห้องหลัก = nightly * nights * roomCount
          const nightly = typeof roomsObj?.promotion_price === "number" ? roomsObj.promotion_price : 0;
          items.unshift({ label: `${roomName} ${roomCountText}`, amount: nightly * nights * roomCount });

          // ค่าชำระเงิน
          const paymentObj = Array.isArray(row.payments) ? row.payments[0] ?? null : row.payments;
          const mask = last3Mask(paymentObj?.card_last_three);
          const totalAmount =
            typeof paymentObj?.amount === "number" ? paymentObj.amount : Number(row.total_amount) || 0;

          // ใช้โปรโมโค้ด (ถ้ามี) ใส่เป็นรายการลบ
          if (row.promo_code) {
            const promoDiscount = calculatePromoDiscount(promoCodeMap.get(row.promo_code) ?? null, totalAmount);
            if (promoDiscount > 0) items.push({ label: "Promotion", amount: -promoDiscount });
          }

          // ตั้ง note เวลา check-in/check-out ตาม add-on
          const labelsLower = items.map((it) => it.label.toLowerCase());
          const hasEarlyCheckIn = labelsLower.some((l) => /early\s*check[- ]?in/i.test(l));
          const hasLateCheckOut = labelsLower.some((l) => /late\s*check[- ]?out/i.test(l));

          let checkInNote = "After 2:00 PM";
          let checkOutNote = "Before 12:00 PM";
          if (hasEarlyCheckIn) checkInNote = "After 12:00 PM";
          if (hasLateCheckOut) checkOutNote = "Before 4:00 PM";

          // สถานะการยกเลิก
          const cancelled = !!row.cancellation_date;
          const cancelledAtText = cancelled ? fmtDateUTC(row.cancellation_date) : undefined;

          // คืนค่าเป็นรูปแบบ Booking ที่การ์ดอ่านได้
          return {
            id: row.id,
            roomName,
            imageUrl,
            checkInDate: fmtDateUTC(row.check_in_date),
            checkInNote,
            checkOutDate: fmtDateUTC(row.check_out_date),
            checkOutNote,
            bookedAtText: fmtDateUTC(row.created_at ?? row.booking_date),
            cancelled,
            cancelledAtText,
            checkInAtRaw: row.check_in_date ?? null, // เก็บค่าเดิมไว้ใช้ logic อื่นต่อ
            guests,
            nights,
            payment: {
              status:
                row.status === "confirmed"
                  ? "success"
                  : row.status === "refunded" || row.status === "cancelled"
                  ? "failed"
                  : "pending",
              method: row.payment_method ?? "cash",
              mask,
            },
            items,
            currency,
            total: totalAmount,
            additionalRequest: row.additional_request || undefined,
          };
        });

        // อัปเดตสเตตให้ UI แสดงผล
        setBookings(mapped);
      } catch (e) {
        // จัดการ error (รวมถึง AbortError)
        if (!alive) return;
        const msg =
          (e as { name?: string; message?: string })?.name === "AbortError"
            ? "Request timed out" // กำหนดข้อความเมื่อ abort (timeout)
            : (e as { message?: string })?.message || "Failed to load bookings";
        setError(msg);
        setBookings([]);
        setTotal(0);
      } finally {
        // ปิดสถานะโหลดเมื่อจบรอบ (และยัง alive)
        if (alive) setLoading(false);
      }
    })();

    // cleanup: บอกว่ารอบนี้ไม่ alive แล้ว กัน setState หลัง unmount/เปลี่ยน deps
    return () => { alive = false; };
  }, [authLoading, userId, page]); // เปลี่ยนหน้า/เปลี่ยน user จะยิงใหม่

  // จำนวนหน้าทั้งหมด = ปัดขึ้น(total/PAGE_SIZE) อย่างน้อย 1 หน้า
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // คำนวณปุ่มเลขหน้าให้แสดงไม่เกิน 5 ปุ่ม และเลื่อนไปตามหน้าปัจจุบัน
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxToShow = 5;
    if (totalPages <= maxToShow) { for (let i = 1; i <= totalPages; i++) pages.push(i); return pages; }
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxToShow - 1);
    if (end - start + 1 < maxToShow) start = Math.max(1, end - maxToShow + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <Layout>
      {/* ref เอาไว้ใช้ scrollTop ตอนเปลี่ยนหน้า */}
      <main ref={mainRef} className="max-w-[1120px] mx-auto md:px-6 pb-5 pt-[80px] sm:pt-[96px] md:pt-12">
        <h1 className="text-[44px] sm:text-[52px] md:text-[68px] px-5 font-noto font-medium text-green-700 leading-[125%] tracking-[-0.02em] mb-6">
          Booking History
        </h1>

        {/* สถานะการโหลด/ว่าง/เออร์เรอร์ */}
        {(authLoading || loading) && <div className="px-5 text-gray-600">Loading...</div>}
        {!authLoading && !loading && !error && bookings.length === 0 && (
          <div className="px-5 text-gray-600">No bookings found.</div>
        )}
        {error && !loading && (
          <div className="px-5 text-red-600">
            Error: {error}{" "}
            {/* ปุ่ม retry จะเรียก goToPage(page) เพื่อโหลดหน้าปัจจุบันซ้ำ */}
            <button className="ml-3 underline text-orange-600" onClick={() => goToPage(page)}>
              Retry
            </button>
          </div>
        )}

        {/* ลิสต์การจอง */}
        <div className="space-y-8">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>

        {/* แถบ pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 px-5">
            {/* ปุ่มย้อนหน้า */}
            <button
              type="button"
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`h-8 w-8 grid place-items-center rounded-md text-gray-400 hover:text-gray-700 ${
                page === 1 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
              aria-label="Previous page"
            >
              ‹
            </button>

            {/* ปุ่มเลขหน้าแบบไดนามิก */}
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`h-8 min-w-8 px-3 rounded-md text-sm transition cursor-pointer ${
                  p === page ? "bg-white border border-green-600 text-green-700" : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {p}
              </button>
            ))}

            {/* ปุ่มไปหน้าถัดไป */}
            <button
              type="button"
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
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
    </Layout>
  );
}