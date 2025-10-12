import Layout from "@/components/admin/Layout";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import type { Booking } from "@/types/bookings";

export default function BookingDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${id}`);
        const body = await res.json();
        if (body?.success) {
          setBooking(body.data);
        } else {
          setError(body?.error || "Failed to load booking");
        }
      } catch (e) {
        setError("Failed to load booking");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const priceDisplay = useMemo(() => {
    if (!booking) return "-";
    const promotion = booking.promotion_price ?? undefined;
    const price = booking.price ?? undefined;
    if (promotion && promotion > 0 && promotion < (price ?? 0)) {
      return `THB ${promotion.toLocaleString()} (was THB ${price?.toLocaleString?.()})`;
    }
    return price ? `THB ${price.toLocaleString()}` : "-";
  }, [booking]);

  return (
    <Layout>
      <main className="flex-1 w-full bg-[#F6F7FC]">
        {/* Header: back arrow + customer name and room type (left-aligned) */}
        <div className="bg-white border-b border-gray-400">
          <div className="flex flex-row items-center gap-3 py-5 mx-10">
            <ArrowLeft
              className="w-5 mt-1 cursor-pointer"
              onClick={() => router.push("/admin/bookings")}
            />
            <span className="text-gray-900 font-medium truncate max-w-[30ch]">
              {booking
                ? booking.customer_name ||
                  booking.full_name ||
                  [booking.first_name, booking.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                  booking.username ||
                  "-"
                : "-"}
            </span>
            <span className="text-gray-500 truncate max-w-[40ch]">
              {booking?.room_type || "-"}
            </span>
          </div>
        </div>

        <div className="px-10 py-10">
          <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : !booking ? (
              <div className="text-sm text-gray-500">Booking not found</div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div className="space-y-6">
                    <InfoItem
                      label="Customer name"
                      value={
                        booking.customer_name ||
                        booking.full_name ||
                        [booking.first_name, booking.last_name]
                          .filter(Boolean)
                          .join(" ") ||
                        (booking.username ?? "-")
                      }
                    />
                    <InfoItem label="Guest(s)" value={booking.guests ?? "-"} />
                    <InfoItem
                      label="Room type"
                      value={booking.room_type || "-"}
                    />
                    <InfoItem
                      label="Amount"
                      value={(booking.amount ?? 1) + " room"}
                    />
                    <InfoItem
                      label="Bed type"
                      value={booking.bed_type ?? "-"}
                    />
                    <InfoItem
                      label="Check-in"
                      value={
                        booking.check_in_date || booking.check_in
                          ? new Date(
                              (booking.check_in_date ||
                                booking.check_in) as string
                            ).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"
                      }
                    />
                    <InfoItem
                      label="Check-out"
                      value={
                        booking.check_out_date || booking.check_out
                          ? new Date(
                              (booking.check_out_date ||
                                booking.check_out) as string
                            ).toLocaleDateString("en-GB", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"
                      }
                    />
                    <InfoItem
                      label="Stay (total)"
                      value={booking.stay_total_nights ?? "-"}
                    />
                    <InfoItem
                      label="Booking date"
                      value={
                        booking.created_at
                          ? new Date(booking.created_at).toDateString()
                          : "-"
                      }
                    />
                  </div>
                </div>

                {/* Payment Summary (full width, below) */}
                <div className="mt-8 overflow-hidden rounded-md border border-gray-200">
                  <div className="flex items-center justify-end gap-6 bg-gray-50 px-4 py-2 text-xs sm:text-sm text-gray-600">
                    <span>Payment success via</span>
                    <span className="text-gray-700">Credit Card - *888</span>
                  </div>
                  <div className="p-0">
                    <div className="px-4 py-3 text-sm text-gray-700 flex items-center justify-between border-b border-gray-100">
                      <span>{booking.room_type || "Room"}</span>
                      <span>
                        {booking.price ? booking.price.toLocaleString() : "-"}
                      </span>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-700 flex items-center justify-between border-b border-gray-100">
                      <span>Airport transfer</span>
                      <span>200.00</span>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-700 flex items-center justify-between border-b border-gray-100">
                      <span>Promotion Code</span>
                      <span className="text-red-600">
                        {booking.promotion_price
                          ? `-${
                              booking.price &&
                              booking.promotion_price < booking.price
                                ? (
                                    booking.price - booking.promotion_price
                                  ).toLocaleString()
                                : 0
                            }`
                          : "-0"}
                      </span>
                    </div>
                    <div className="px-4 py-3 text-sm text-gray-900 font-medium flex items-center justify-between">
                      <span>Total</span>
                      <span>{priceDisplay}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Request (full width, below) */}
                <div className="mt-6 overflow-hidden rounded-md border border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
                    Additional Request
                  </div>
                  <div className="px-4 py-3 text-sm text-gray-700">-</div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-gray-800">{value}</div>
    </div>
  );
}
