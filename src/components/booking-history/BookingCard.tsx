import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ConfirmModal from "@/components/ui/ConfirmModal";
import NonRefundModal from "@/components/ui/NonRefundModal";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";

/** ---- Types ---- */
export type Booking = {
  id: string;
  roomName: string;
  imageUrl: string;
  checkInDate: string;
  checkInNote?: string;
  checkOutDate: string;
  checkOutNote?: string;
  bookedAtText: string;
  checkInAtRaw?: string | null;
  guests: number;
  nights: number;
  payment: {
    status: "success" | "pending" | "failed";
    method: string;
    mask?: string;
  };
  items: Array<{ label: string; amount: number }>;
  currency: string;
  total: number;
  additionalRequest?: string;
  promoCode?: string;
  promoDiscount?: number;
};

type Props = {
  booking: Booking;
  onDeleted?: (id: string) => void;
};

/** ---- Helpers ---- */
function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
function moneyWithCurrency(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${money(n)}`;
  }
}

function normalizeToISO(rawInput?: string | null): string | null {
  if (!rawInput) return null;
  let s = rawInput.trim();
  if (!s) return null;
  if (s.includes(" ")) s = s.replace(" ", "T");
  s = s.replace(/([+\-]\d{2})(\d{2})$/, "$1:$2");
  s = s.replace(/\+00(?::?00)?$/, "Z");
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
  return s;
}

function isNonRefundWindow(checkInAtRaw?: string | null): boolean {
  const iso = normalizeToISO(checkInAtRaw);
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  const hours = (ts - Date.now()) / 36e5;
  return hours <= 24;
}

type PostgrestErrorLite = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  name?: string;
};

export default function BookingCard({ booking, onDeleted }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showNonRefundModal, setShowNonRefundModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const panelId = useId();

  const handleCancelClick = () => {
    if (isNonRefundWindow(booking.checkInAtRaw)) {
      setShowNonRefundModal(true);
    } else {
      setShowRefundModal(true);
    }
  };

  async function deleteBookingRow() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    setShowRefundModal(false);
    setShowNonRefundModal(false);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id)
        .abortSignal(controller.signal);
      clearTimeout(timeout);
      if (error) throw error as PostgrestErrorLite;
      onDeleted?.(booking.id);
    } catch (e: unknown) {
      let msg = "Failed to cancel booking";
      if (e && typeof e === "object") {
        const err = e as PostgrestErrorLite;
        if (err.name === "AbortError") msg = "Network timeout. Please try again.";
        else if (err.message) msg = err.message;
        else if (err.details) msg = err.details;
        else if (err.hint) msg = err.hint;
      }
      if (/row level security|RLS/i.test(msg))
        msg = "Permission denied. Please sign in again.";
      setDeleteError(msg);
      setOpen(true);
    } finally {
      setTimeout(() => setDeleting(false), 300);
    }
  }

  const onConfirmRefund = () => void deleteBookingRow();
  const onConfirmNonRefund = () => void deleteBookingRow();

  return (
    <article className="bg-white border-b border-gray-200 last:border-b-0 mt-6 md:mt-0">
      <div className="mx-auto max-w-[1120px] p-6">
        <div className="grid grid-cols-1 md:grid-cols-[357px_715px] md:grid-rows-[auto_auto_auto] md:gap-[48px]">
          {/* รูป */}
          <div className="relative w-full h-[220px] sm:h-[260px] md:h-[210px] md:w-[357px] md:[grid-row:1/4] md:[grid-column:1/2] mb-[20px] md:mb-0">
            <Image
              src={booking.imageUrl}
              alt={booking.roomName}
              fill
              className="rounded-[8px] object-cover"
              sizes="(max-width: 768px) 100vw, 357px"
              priority={false}
            />
          </div>

          {/* เนื้อหา */}
          <div className="w-full md:w-[715px] md:[grid-row:1/3] md:[grid-column:2/3]">
            {/* หัวข้อ + วันที่ */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h2 className="text-[28px] sm:text-[24px] md:text-[28px] font-semibold text-black font-inter">
                {booking.roomName}
              </h2>
              <div className="text-[16px] sm:text-[15px] md:text-[16px] font-inter text-gray-600">
                Booking date: {booking.bookedAtText}
              </div>
            </div>

            {/* Check-in/out */}
            <div className="mt-[24px] md:mt-[32px] flex flex-col sm:flex-row sm:gap-x-8 gap-y-4">
              <div>
                <div className="text-[16px] font-semibold font-inter text-gray-800 mb-1">
                  Check-in
                </div>
                <div className="flex items-center text-[16px] font-inter text-gray-800">
                  <span>{booking.checkInDate}</span>
                  {booking.checkInNote && (
                    <>
                      <span className="mx-2 h-4 w-px bg-gray-800" />
                      <span>{booking.checkInNote}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[16px] font-semibold text-gray-800 font-inter mb-1">
                  Check-out
                </div>
                <div className="flex items-center text-[16px] font-inter text-gray-800">
                  <span>{booking.checkOutDate}</span>
                  {booking.checkOutNote && (
                    <>
                      <span className="mx-2 h-4 w-px bg-gray-800" />
                      <span>{booking.checkOutNote}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ปุ่ม Booking Detail */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-[24px] md:mt-[32px] w-full flex items-center justify-between bg-gray-200 px-4 sm:px-5 py-3 text-[16px] font-inter font-semibold text-gray-900 hover:bg-gray-100"
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span>Booking Detail</span>

              {/*  ลูกศร + สีและทิศทางตามสถานะ */}
              <svg
                className={`w-6 h-6 transition-transform duration-200 ${
                  open ? "rotate-0 text-gray-900" : "rotate-180 text-orange-500"
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.13l3.71-2.9a.75.75 0 11.92 1.18l-4.2 3.28a.75.75 0 01-.92 0l-4.2-3.28a.75.75 0 01.02-1.2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* รายละเอียด */}
            {open && (
              <div id={panelId} className="overflow-hidden">
                <div className="px-4 sm:px-6 py-5 bg-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-gray-600 text-[14px] sm:text-[15px]">
                    <div>
                      <span className="text-gray-700 text-[16px] font-inter">
                        {booking.guests} {booking.guests > 1 ? "Guests" : "Guest"}
                      </span>
                      <span className="text-gray-700 text-[16px] font-inter">
                        {" "}
                        ({booking.nights} {booking.nights > 1 ? "Nights" : "Night"})
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-gray-700 text-[16px] font-inter">{`Payment ${booking.payment.status} via `}</span>
                      <span className="text-gray-700 text-[16px] font-inter font-semibold">
                        {booking.payment.method}
                        {booking.payment.mask ? ` - ${booking.payment.mask}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    {booking.items.map((it, idx) => (
                      <Row key={idx} label={it.label} amount={money(it.amount)} />
                    ))}

                    {booking.promoDiscount && booking.promoDiscount > 0 && (
                      <div className="py-2 flex items-start justify-between">
                        <span className="font-inter text-[16px] text-green-600">
                          Promotion
                        </span>
                        <span className="font-inter text-[16px] text-green-600 font-semibold">
                          -{moneyWithCurrency(booking.promoDiscount, booking.currency)}
                        </span>
                      </div>
                    )}

                    {/* 🔸 เส้นคั่นก่อนบรรทัด Total */}
                    <div className="mt-4 border-t border-gray-400 pt-3 flex items-center justify-between">
                      <span className="text-gray-700 text-[16px] font-inter">Total</span>
                      <span className="text-[20px] font-inter font-semibold text-gray-900">
                        {moneyWithCurrency(
                          booking.total - (booking.promoDiscount || 0),
                          booking.currency
                        )}
                      </span>
                    </div>
                  </div>

                  {deleteError && (
                    <div className="mt-4 text-sm text-red-600">{deleteError}</div>
                  )}
                </div>

                {booking.additionalRequest && (
                  <div className="bg-gray-300 px-4 sm:px-6 py-4 text-[16px] font-inter text-gray-700">
                    <div className="font-semibold font-inter text-gray-700 mb-1">
                      Additional Request
                    </div>
                    <div>{booking.additionalRequest}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ปุ่มล่าง Desktop */}
          <div className="hidden md:flex md:[grid-row:3/4] md:[grid-column:1/3] items-center justify-between">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={deleting}
              className={`text-[16px] text-orange-500 font-semibold font-inter hover:underline ${
                deleting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {deleting ? "Cancelling..." : "Cancel Booking"}
            </button>

            <div className="flex items-center gap-6 shrink-0">
              <Link
                href={`/customer/bookings/${booking.id}`}
                className="text-[16px] text-orange-500 font-semibold font-inter hover:underline"
              >
                Room Detail
              </Link>

              <Link
                href={`/customer/customer-bookings/change/${booking.id}`}
                passHref
              >
                <button
                  type="button"
                  className="rounded-md bg-orange-600 text-white px-5 py-2 text-[16px] font-semibold font-inter cursor-pointer hover:brightness-110"
                >
                  Change Date
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Refund modal */}
      <ConfirmModal
        open={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onConfirm={onConfirmRefund}
        title="Cancel Booking"
        message="Are you sure you would like to cancel this booking?"
        confirmText="Yes, I want to cancel and request refund"
        cancelText="No, Don’t Cancel"
      />

      {/* Non-refund modal */}
      <NonRefundModal
        open={showNonRefundModal}
        onClose={() => setShowNonRefundModal(false)}
        onConfirm={onConfirmNonRefund}
      />
    </article>
  );
}

function Row({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="py-2 flex items-start justify-between">
      <span className="font-inter text-[16px] text-gray-700">{label}</span>
      <span className="font-inter text-[16px] text-gray-900 font-semibold">
        {amount}
      </span>
    </div>
  );
}