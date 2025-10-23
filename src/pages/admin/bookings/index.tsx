import Layout from "@/components/admin/Layout";
import { useEffect, useMemo, useState } from "react";
import type { Booking } from "@/types/bookings";
import { useRouter } from "next/router";

export default function IndexPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings");
        const body = await res.json();
        const raw = Array.isArray(body?.data) ? body.data : [];
        // Move rows without a customer display name to the end, preserving relative order
        const getHasName = (b: Booking) =>
          Boolean(
            b.customer_name ||
              b.full_name ||
              [b.first_name, b.last_name].filter(Boolean).join(" ") ||
              b.username
          );
        const sorted = [...raw].sort((a: Booking, b: Booking) => {
          const aHas = getHasName(a) ? 1 : 0;
          const bHas = getHasName(b) ? 1 : 0;
          return bHas - aHas;
        });
        setBookings(sorted);
      } catch (err) {
        console.error("Failed to fetch bookings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const totalPages = useMemo(() => {
    if (bookings.length === 0) return 1;
    return Math.ceil(bookings.length / pageSize);
  }, [bookings.length]);

  const currentRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bookings.slice(start, start + pageSize);
  }, [bookings, page]);

  // Generate page numbers to display (sliding window like room-types)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
      } else if (page >= totalPages - 2) {
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        for (let i = page - 2; i <= page + 2; i++) pages.push(i);
      }
    }
    return pages;
  };

  return (
    <Layout>
      <main className="flex-1 w-full bg-[#F6F7FC]">
        <div>
          {/* Header (standardized like room-types) */}
          <div className="bg-white border-b border-gray-400">
            <div className="flex flex-row items-center justify-between py-5 ml-10 mr-7">
              <p className="text-xl font-semibold">Customer Booking</p>
              <div className="flex justify-end">
                <div className="flex items-center border pl-3 pr-10 gap-2 bg-white border-gray-500/30 h-[46px] rounded-md overflow-hidden max-w-md w-full">
                  <img src="/assets/search.png" className="w-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full h-full outline-none text-gray-500 placeholder-gray-500 text-sm"
                  />
                </div>
                {/* <div className="w-40" /> */}
              </div>
            </div>
          </div>

          {/* List (standardized to room-types/room-management style) */}
          <div className="max-w-7xl mt-10 mx-auto p-6 bg-[#F6F7FC] min-h-screen">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
              {/* Header */}
              <div className="grid grid-cols-7 gap-5 p-4 bg-white font-medium text-sm text-gray-700">
                <div>Customer name</div>
                <div>Guest(s)</div>
                <div>Room type</div>
                <div>Amount</div>
                <div>Bed Type</div>
                <div>Check-in</div>
                <div>Check-out</div>
              </div>

              {/* Rows */}
              <div className="min-h-[600px]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-7 gap-4 p-4 border-b border-gray-100"
                    >
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-8 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-52 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-8 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                    </div>
                  ))
                ) : bookings.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 border-t">
                    No bookings found
                  </div>
                ) : (
                  currentRooms.map((booking, idx) => (
                    <div
                      key={String(booking.id ?? idx)}
                      onClick={() => {
                        const bid = booking.id ?? idx;
                        router.push(`/admin/bookings/${bid}`);
                      }}
                      className="grid grid-cols-7 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center text-sm text-gray-700 cursor-pointer"
                    >
                      <div className="whitespace-nowrap text-gray-900 font-medium">
                        {booking.customer_name ||
                          booking.full_name ||
                          [booking.first_name, booking.last_name]
                            .filter(Boolean)
                            .join(" ") ||
                          booking.username ||
                          "-"}
                      </div>
                      <div>{booking.guests ?? "-"}</div>
                      <div className="truncate">{booking.room_type ?? "-"}</div>
                      <div>{booking.amount ?? 1}</div>
                      <div>{booking.bed_type ?? "-"}</div>
                      <div className="whitespace-nowrap">
                        {booking.check_in_date || booking.check_in
                          ? new Date(
                              (booking.check_in_date ||
                                booking.check_in) as string
                            ).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                      <div className="whitespace-nowrap">
                        {booking.check_out_date || booking.check_out
                          ? new Date(
                              (booking.check_out_date ||
                                booking.check_out) as string
                            ).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-center p-6 border-t border-gray-400 bg-gray-50">
                <div className="flex items-center space-x-2">
                  <button
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <img
                      className="w-2"
                      src="/assets/arrow-left.png"
                      alt="Previous"
                    />
                  </button>

                  {getPageNumbers().map((p) => (
                    <button
                      key={p}
                      className={`px-3 py-1 rounded-md text-sm ${
                        p === page
                          ? "bg-white text-gray-700 border border-gray-600"
                          : "text-gray-700 hover:bg-gray-200"
                      }`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  {totalPages > 5 && page < totalPages - 2 && (
                    <span className="text-gray-400">...</span>
                  )}

                  <button
                    className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <img
                      className="w-2"
                      src="/assets/arrow-right.png"
                      alt="Next"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
