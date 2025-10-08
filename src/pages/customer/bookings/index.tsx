import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import BookingCard, { type Booking } from "@/components/bookings/BookingCard";
import { supabase } from "@/lib/supabaseClient";

// แปลงวันที่ UTC ให้ตรงกับใน Supabase
function fmtDateUTC(d?: string | null) {
  if (!d) return "-";
  const safe = typeof d === "string" ? d.replace(" ", "T") : d;
  const dt = new Date(safe);
  if (isNaN(dt.getTime())) return "-";
  const w = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getUTCMonth()];
  const day = dt.getUTCDate();
  const year = dt.getUTCFullYear();
  return `${w}, ${m} ${day}, ${year}`;
}

// คำนวณจำนวนคืน
function calcNights(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return 1;
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const diffMs = b.getTime() - a.getTime();
  if (diffMs <= 0) return 1;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;
}

// Pagination config
const PAGE_SIZE = 6;

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0); // total rows in supabase

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("bookings")
        .select(
          `
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
        `,
          { count: "exact" }
        )
        .order("booking_date", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setTotal(count ?? 0);

      const mapped: Booking[] = (data || []).map((row: any) => {
        const roomName: string = row?.rooms?.room_type ?? "Room";

        //  รูปจาก main_image_url
        const rawImg = row?.rooms?.main_image_url;
        let imageUrl = "/images/sample-room-1.png";
        if (Array.isArray(rawImg) && rawImg.length > 0) imageUrl = rawImg[0];
        else if (typeof rawImg === "string" && rawImg.trim()) {
          try {
            const parsed = JSON.parse(rawImg);
            imageUrl = Array.isArray(parsed) && parsed[0] ? parsed[0] : rawImg;
          } catch {
            imageUrl = rawImg;
          }
        }

        const currency: string = row?.rooms?.currency ?? "THB";
        const guests: number =
          typeof row?.rooms?.guests === "number" && row.rooms.guests > 0
            ? row.rooms.guests
            : 1;

        // special_requests
        let requests: string[] = [];
        const sr = row?.special_requests;
        if (Array.isArray(sr)) requests = [...sr];
        else if (typeof sr === "string" && sr.trim()) {
          try {
            const parsed = JSON.parse(sr);
            if (Array.isArray(parsed)) requests = parsed.filter(Boolean);
          } catch {
            requests = sr.split(",").map((s) => s.trim()).filter(Boolean);
          }
        }
        requests.sort();

        const nights = calcNights(row?.check_in_date, row?.check_out_date);
        const items = requests.map((r: string) => ({ label: r, amount: 0 }));

        return {
          id: row.id,
          roomName,
          imageUrl,
          checkInDate: fmtDateUTC(row?.check_in_date),
          checkOutDate: fmtDateUTC(row?.check_out_date),
          bookedAtText: fmtDateUTC(row?.booking_date),
          promoCode: row?.promo_code || undefined,
          checkInAtRaw: row?.check_in_date ?? null,
          bookingDateRaw: row?.booking_date ?? null,
          checkInNote: undefined,
          checkOutNote: undefined,
          guests,
          nights,
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

      // sort ฝั่ง client อีกชั้น
      mapped.sort((a, b) => {
        const ta = (a as any).bookingDateRaw
          ? new Date((a as any).bookingDateRaw).getTime()
          : 0;
        const tb = (b as any).bookingDateRaw
          ? new Date((b as any).bookingDateRaw).getTime()
          : 0;
        return tb - ta;
      });

      setBookings(mapped);
      setLoading(false);
    }

    fetchBookings();

    // scroll to top เมื่อเปลี่ยนหน้า
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [page]);

  // สร้างเลขหน้าที่จะแสดง (สูงสุด 5 ตัว)
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const maxToShow = 5;
    const totalP = totalPages;

    if (totalP <= maxToShow) {
      for (let i = 1; i <= totalP; i++) pages.push(i);
      return pages;
    }
    let start = Math.max(1, page - 2);
    let end = Math.min(totalP, start + maxToShow - 1);
    if (end - start + 1 < maxToShow) start = Math.max(1, end - maxToShow + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

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

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-2 px-5">
          {/* Prev */}
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

          {/* Numbers */}
          {visiblePages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`h-8 min-w-8 px-3 rounded-md text-sm transition cursor-pointer
                ${
                  p === page
                    ? "bg-white border border-green-600 text-green-700"
                    : "text-gray-400 hover:text-gray-700"
                }`}
            >
              {p}
            </button>
          ))}

          {/* Next */}
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
      </main>
      <Footer />
    </Layout>
  );
}