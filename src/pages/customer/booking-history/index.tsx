import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/booking-history/BookingCard";
import { supabase } from "@/lib/supabaseClient";

/* ---------- Types ---------- */
type RoomFields = {
  room_type: string | null;
  main_image_url: string | string[] | null;
  currency: string | null;
  guests: number | null;
  promotion_price: number | null;
};

type PaymentLite = {
  card_last_three: string | null;
  amount: number | null;
};

type PromoCodeLite = {
  code?: string | null;
  discount_amount: number | null;
  discount_percent: number | null;
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
  special_requests: unknown;        
  standard_request: string[] | null;
  status: string | null;
  payment_method: string | null;

  rooms: RoomFields | RoomFields[] | null;
  payments: PaymentLite | PaymentLite[] | null;
};

/* ---------- Utils ---------- */
function calculatePromoDiscount(promo: PromoCodeLite | null, totalAmount: number): number {
  if (!promo) return 0;
  if (promo.discount_amount && promo.discount_amount > 0) {
    return Math.min(promo.discount_amount, totalAmount);
  }
  if (promo.discount_percent && promo.discount_percent > 0) {
    return (totalAmount * promo.discount_percent) / 100;
  }
  return 0;
}

function fmtDateUTC(d?: string | null) {
  if (!d) return "-";
  const safe = typeof d === "string" ? d.replace(" ", "T") : d;
  const dt = new Date(safe);
  if (Number.isNaN(dt.getTime())) return "-";
  const w = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getUTCDay()];
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getUTCMonth()];
  return `${w}, ${m} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}

function calcNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diffMs = b.getTime() - a.getTime();
  if (diffMs <= 0) return 1;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
}

const FALLBACK_IMG = "/images/sample-room-1.png";

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
    if (s && s !== "[]" && s !== '[""]') return s;
  }
  return FALLBACK_IMG;
}

function last3Mask(v?: string | null) {
  if (!v) return undefined;
  const cleaned = v.replace(/\s+/g, "").replace(/[^\d]/g, "");
  if (cleaned.length === 3) return `*${cleaned}`;
  if (cleaned.length > 3) return `*${cleaned.slice(-3)}`;
  return undefined;
}

/** ล้างคำว่า "Standard:" ออก (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
function cleanLabel(label: string): string {
  return String(label || "").replace(/^standard:\s*/i, "").trim();
}

/* ---------- Page ---------- */
const PAGE_SIZE = 6;

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const requestSeqRef = useRef(0);

  /* ---------- Auth ---------- */
  useEffect(() => {
    let mounted = true;
    setAuthLoading(true);

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setAuthLoading(false);
    });

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
    if (authLoading) return;

    const mySeq = ++requestSeqRef.current;
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

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
              standard_request,
              status,
              payment_method,
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
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
          .range(from, to)
          .abortSignal(controller.signal);

        if (userId) query = query.eq("customer_id", userId);

        const { data, error: qErr, count } = await query;
        clearTimeout(timeout);

        if (!alive || mySeq !== requestSeqRef.current) return;
        if (qErr) throw qErr;

        setTotal(count ?? 0);
        const rows = (data ?? []) as BookingRowRaw[];

        // โหลดรายละเอียด promo code ที่พบในชุดนี้
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

        const mapped: Booking[] = rows.map((row) => {
          // --- rooms normalize
          const roomsObj: RoomFields | null = Array.isArray(row.rooms)
            ? row.rooms[0] ?? null
            : row.rooms;

          const roomName = roomsObj?.room_type?.trim() || "Room";
          const imageUrl = safeImageUrl(roomsObj?.main_image_url);
          const currency: string = roomsObj?.currency ?? "THB";
          const guests: number =
            typeof roomsObj?.guests === "number" && roomsObj?.guests > 0 ? roomsObj.guests : 1;

          // 👉 จำนวนคืน
          const nights = calcNights(row.check_in_date, row.check_out_date);

          // --- แปลง special_requests -> ชื่อ + ราคา (ล้าง "Standard:")
          type SRItem = { name?: unknown; price?: unknown } | string | number | null;
          let specialReqItems: Array<{ label: string; amount: number }> = [];

          const buildItemsFromArray = (arr: unknown[]) => {
            const items: Array<{ label: string; amount: number }> = [];
            arr.forEach((it: SRItem) => {
              if (typeof it === "object" && it !== null && "name" in it) {
                const raw = String((it as { name: unknown }).name ?? "");
                const name = cleanLabel(raw);
                const priceRaw = (it as { price?: unknown }).price;
                const amount = typeof priceRaw === "number" ? priceRaw : 0;
                if (name && name !== "0" && name.toLowerCase() !== "null") {
                  items.push({ label: name, amount });
                }
              } else {
                const raw = String(it ?? "");
                const name = cleanLabel(raw);
                if (name && name !== "0" && name.toLowerCase() !== "null") {
                  items.push({ label: name, amount: 0 });
                }
              }
            });
            return items;
          };

          if (Array.isArray(row.special_requests)) {
            specialReqItems = buildItemsFromArray(row.special_requests as unknown[]);
          } else if (typeof row.special_requests === "string" && row.special_requests.trim()) {
            try {
              const parsed = JSON.parse(row.special_requests);
              if (Array.isArray(parsed)) {
                specialReqItems = buildItemsFromArray(parsed);
              } else if (parsed) {
                specialReqItems = buildItemsFromArray([parsed]);
              }
            } catch {
              const name = cleanLabel(row.special_requests.trim());
              if (name && name !== "0" && name.toLowerCase() !== "null") {
                specialReqItems = [{ label: name, amount: 0 }];
              }
            }
          }

          // --- standard_request -> แค่ข้อความ (ไม่มี "Standard:")
          let standardReqItems: Array<{ label: string; amount: number }> = [];
          if (Array.isArray(row.standard_request)) {
            standardReqItems = row.standard_request
              .map((s) => cleanLabel(String(s ?? "")))
              .filter((s) => s && s !== "0" && s.toLowerCase() !== "null")
              .map((s) => ({ label: s, amount: 0 }));
          }

          // --- รวมรายการ (เติมห้องไว้บรรทัดแรก) + ราคาห้อง * จำนวนคืน
          let items = [...specialReqItems, ...standardReqItems];
          const nightly = typeof roomsObj?.promotion_price === "number" ? roomsObj.promotion_price : 0;
          items.unshift({
            label: `${roomName} Room`,
            amount: nightly * nights,
          });

          // --- payment / total
          const paymentObj = Array.isArray(row.payments) ? row.payments[0] ?? null : row.payments;
          const mask = last3Mask(paymentObj?.card_last_three);
          const totalAmount =
            typeof paymentObj?.amount === "number" ? paymentObj.amount : Number(row.total_amount) || 0;

          // --- promo (แสดงเป็น "Promotion" เฉย ๆ)
          if (row.promo_code) {
            const promoDiscount = calculatePromoDiscount(
              promoCodeMap.get(row.promo_code) ?? null,
              totalAmount
            );
            if (promoDiscount > 0) {
              items.push({
                label: "Promotion",
                amount: -promoDiscount,
              });
            }
          }

          // ✅ หมายเหตุเวลา Check-in/Check-out ตาม Early/Late
          const labelsLower = items.map((it) => it.label.toLowerCase());
          const hasEarlyCheckIn = labelsLower.some((l) => /early\s*check[- ]?in/i.test(l));
          const hasLateCheckOut = labelsLower.some((l) => /late\s*check[- ]?out/i.test(l));

          let checkInNote = "After 2:00 PM";
          let checkOutNote = "Before 12:00 PM";
          if (hasEarlyCheckIn) checkInNote = "After 12:00 PM";
          if (hasLateCheckOut) checkOutNote = "Before 16:00 PM";

          return {
            id: row.id,
            roomName,
            imageUrl,
            checkInDate: fmtDateUTC(row.check_in_date),
            checkInNote,
            checkOutDate: fmtDateUTC(row.check_out_date),
            checkOutNote,
            bookedAtText: fmtDateUTC(row.created_at ?? row.booking_date),
            checkInAtRaw: row.check_in_date ?? undefined,
            guests,
            nights,
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
            // ไม่ส่ง promoCode เพื่อไม่ให้ BookingCard แสดงรหัส
          };
        });

        setBookings(mapped);
      } catch (e) {
        if (!alive) return;
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

    return () => {
      alive = false;
    };
  }, [authLoading, userId, page]);

  /* ---------- Handle Delete ---------- */
  const handleDeleted = (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    setTimeout(() => {
      if (bookings.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    }, 0);
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxToShow = 5;
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
            <button className="ml-3 underline text-orange-600" onClick={() => setPage((p) => p)}>
              Retry
            </button>
          </div>
        )}

        <div className="space-y-8">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onDeleted={handleDeleted} />
          ))}
        </div>

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
    </Layout>
  );
}