import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ConfirmModal from "@/components/ui/ConfirmModal";
import NonRefundModal from "@/components/ui/NonRefundModal";
import { useRouter } from "next/router";

/** ---- Types ---- */
// โครงสร้างข้อมูลการจองที่การ์ดนี้ต้องการรับเข้ามาเป็น props
export type Booking = {
  id: string;
  roomName: string;
  imageUrl: string;

  checkInDate: string; // วันที่ check-in ในรูปแบบข้อความพร้อมแสดง
  checkInNote?: string; // หมายเหตุเวลาเช็กอิน (เช่น After 2:00 PM)
  checkOutDate: string; // วันที่ check-out
  checkOutNote?: string; // หมายเหตุเวลาเช็กเอาต์

  bookedAtText: string; // วันที่ทำการจอง (เพื่อแสดง "Booking date")
  cancelled?: boolean; // สถานะถูกยกเลิกแล้วหรือยัง
  cancelledAtText?: string; // ถ้ายกเลิกแล้ว แสดงวันยกเลิก
  checkInAtRaw?: string | null; // ใช้เทียบว่าเลย "วัน" เช็กอิน (ตามเวลาไทย) หรือยัง

  guests: number; // จำนวนผู้เข้าพัก
  nights: number; // จำนวนคืน
  payment: {
    status: "success" | "pending" | "failed"; // สถานะการจ่ายเงิน
    method: string; // ช่องทางการชำระ
    mask?: string; // เลขบัตร เช่น *123
  };
  items: Array<{ label: string; amount: number }>; // รายการค่าใช้จ่ายต่างๆ
  currency: string; // สกุลเงิน (เช่น THB)
  total: number; // ยอดรวมทั้งหมด
  additionalRequest?: string; // คำขอเพิ่มเติม

  promoCode?: string; // โค้ดโปรโมชัน (ถ้ามี)
  promoDiscount?: number; // ส่วนลดจากโปรโมชัน (ถ้ามี)
};

type Props = {
  booking: Booking; // ข้อมูลการจองตัวเดียวที่ใช้แสดงการ์ด
  onDeleted?: (id: string) => void; // callback เผื่อมีการลบ (ยังไม่ได้ใช้)
};

/** ---- Helpers ---- */
// ฟังก์ชันแปลงจำนวนเงินให้มีทศนิยมสองตำแหน่ง
function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// ฟังก์ชันแปลงจำนวนเงินพร้อมสกุลเงิน (พยายามใช้รูปแบบ locale/ISO ถ้าใช้ไม่ได้ fallback เป็น "CUR 1,234.00")
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

/** ปรับสตริงวันเวลาให้เป็น ISO ที่ Date.parse ได้แน่ๆ (กันเคส format เพี้ยน) */
function normalizeToISO(rawInput?: string | null): string | null {
  if (!rawInput) return null;
  let s = rawInput.trim();
  if (!s) return null;

  // ถ้าเป็นแค่ YYYY-MM-DD (ไม่มีเวลา) ให้ตีความเป็น 00:00:00Z (UTC)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00Z`;

  // แทนที่ช่องว่างระหว่างวันกับเวลาด้วย 'T' ให้เป็นรูปแบบ ISO
  if (s.includes(" ")) s = s.replace(" ", "T");

  // เติม ':' ให้ timezone offset ถ้าเขียนเป็น +0700 ให้กลายเป็น +07:00
  s = s.replace(/([+\-]\d{2})(\d{2})$/, "$1:$2");

  // กรณีท้ายเป็น +00 หรือ +0000 ให้ปรับเป็น 'Z' (UTC)
  s = s.replace(/\+00(?::?00)?$/, "Z");

  // ถ้าไม่มี timezone เลย ให้เติม 'Z' (UTC) ท้ายสตริง
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s = `${s}Z`;
  return s;
}

/** ตรวจหน้าต่าง non-refund 24 ชั่วโมงก่อนเวลา check-in (ใช้ timestamp เปรียบเทียบกับตอนนี้) */
function isNonRefundWindow(checkInAtRaw?: string | null): boolean {
  const iso = normalizeToISO(checkInAtRaw);
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  const hours = (ts - Date.now()) / 36e5; // ความต่างเป็นชั่วโมง
  return hours <= 24;
}

/** แปลง Date ให้เป็นเลข key yyyyMMdd ตามโซนเวลาไทย โดยใช้ Intl เพื่อความแม่นยำ */
function thaiYmdKey(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", // โซนเวลาไทย
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const day = get("day");
  return Number(`${y}${m}${day}`); // เช่น 20251019
}

/** ถือว่า "เลยวันเช็กอิน" ก็ต่อเมื่อ (วันนี้ในโซนไทย) > (วันเช็กอินในโซนไทย) เท่านั้น */
function isPastCheckIn(checkInAtRaw?: string | null): boolean {
  const iso = normalizeToISO(checkInAtRaw);
  if (!iso) return false;
  const check = new Date(iso);
  if (Number.isNaN(check.getTime())) return false;

  const todayKeyTH = thaiYmdKey(new Date());
  const checkInKeyTH = thaiYmdKey(check);

  // ถ้าวันนี้(ไทย) มากกว่าวันเช็กอิน(ไทย) -> ถือว่าเลยแล้ว (ซ่อนปุ่ม)
  return todayKeyTH > checkInKeyTH;
}

const FALLBACK_IMG = "/images/sample-room-1.png";

/** ---- Room → URL mapping ---- */
// แมปชื่อห้องที่ normalize แล้วไปยังหน้า Room Detail เฉพาะแต่ละประเภท
const ROOM_PATHS: Record<string, string> = {
  "superior garden view": "/customer/search-result/1",
  deluxe: "/customer/search-result/2",
  superior: "/customer/search-result/3",
  supreme: "/customer/search-result/4",
  "premier sea view": "/customer/search-result/5",
  suite: "/customer/search-result/6",
};

// normalize ชื่อห้อง: ตัดคำว่า "room" ท้าย, trim, และทำให้เป็นตัวพิมพ์เล็ก
function normaliseRoomName(name: string) {
  return (name || "")
    .replace(/\s*room\s*$/i, "")
    .trim()
    .toLowerCase();
}

// คืน path สำหรับปุ่ม Room Detail; ถ้าไม่เจอใน mapping ให้ fallback ไปหน้า booking detail เดิม
function getRoomDetailPath(roomName: string, bookingId: string) {
  const key = normaliseRoomName(roomName);
  return ROOM_PATHS[key] ?? `/customer/bookings/${bookingId}`;
}

/** ---- Component ---- */
export default function BookingCard({ booking }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false); // toggle panel "Booking Detail"
  const [showRefundModal, setShowRefundModal] = useState(false); // modal กรณีขอคืนเงินได้
  const [showNonRefundModal, setShowNonRefundModal] = useState(false); // modal กรณี non-refund
  const [deleting] = useState(false); // state เผื่ออนาคต (ตอนนี้ยังไม่ใช้ลบ)
  const [deleteError] = useState<string | null>(null); // แสดง error ตอนลบ (ถ้ามี)
  const panelId = useId(); // id สำหรับ aria-controls

  // คลิก "Cancel Booking"
  const handleCancelClick = () => {
    // ถ้าอยู่ในหน้าต่าง non-refund (ภายใน 24 ชม.ก่อนเช็กอิน) ให้เปิด modal non-refund
    if (isNonRefundWindow(booking.checkInAtRaw)) setShowNonRefundModal(true);
    else setShowRefundModal(true); // นอกนั้นเปิด modal ปกติ (ขอคืนเงินได้)
  };

  // ยืนยัน cancel แล้วไปหน้า refund request
  const onConfirmRefund = () => {
    setShowRefundModal(false);
    router.push(
      `/customer/customer-bookings/cancel/${booking.id}/refund-request`
    );
  };
  // ยืนยัน cancel แบบ non-refund แล้วไปหน้าดำเนินการยกเลิก
  const onConfirmNonRefund = () => {
    setShowNonRefundModal(false);
    router.push(`/customer/customer-bookings/cancel/${booking.id}`);
  };

  // สร้างลิงก์ Room Detail ตาม mapping
  const roomDetailHref = getRoomDetailPath(booking.roomName, booking.id);

  // แสดงปุ่ม action ก็ต่อเมื่อยังไม่ถูกยกเลิก และยังไม่ "เลยวันเช็กอิน (ไทย)"
  const showActions =
    !booking.cancelled && !isPastCheckIn(booking.checkInAtRaw);

  return (
    <article className="border-b border-gray-400 last:border-b-0 mt-6 md:mt-0">
      <div className="mx-auto max-w-[1120px] p-6">
        {/* Layout หลัก: ซ้ายเป็นภาพ ขวาเป็นรายละเอียด */}
        <div className="grid grid-cols-1 md:grid-cols-[357px_minmax(0,1fr)] md:grid-rows-[auto_auto_auto] md:gap-[48px]">
          {/* รูปห้องพัก */}
          <div className="relative w-full h-[220px] sm:h-[260px] md:h-[210px] md:[grid-row:1/4] md:[grid-column:1/2] mb-[20px] md:mb-0">
            <Image
              src={booking.imageUrl || FALLBACK_IMG}
              alt={booking.roomName || "Room photo"}
              fill
              className="rounded-[8px] object-cover"
              sizes="(max-width: 768px) 100vw, 357px"
              placeholder="empty"
              priority={false}
            />
          </div>

          {/* เนื้อหา */}
          <div className="w-full md:[grid-row:1/3] md:[grid-column:2/3]">
            {/* ส่วนหัว: ชื่อห้อง + วันที่จอง/ยกเลิก */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <h2 className="text-[28px] sm:text-[24px] md:text-[28px] font-semibold text-black font-inter">
                {booking.roomName}
              </h2>
              <div className="text-[16px] sm:text-[15px] md:text-[16px] font-inter text-gray-600 md:text-right">
                <div>Booking date: {booking.bookedAtText}</div>
                {booking.cancelled && (
                  <div className="mt-0.5 text-gray-600">
                    Cancellation date: {booking.cancelledAtText}
                  </div>
                )}
              </div>
            </div>

            {/* ส่วนวันที่ Check-in / Check-out + หมายเหตุ */}
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

            {/* ปุ่มสรุปรายละเอียด (accordion) */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-[24px] md:mt-[32px] w-full flex items-center justify-between bg-gray-200 px-4 sm:px-5 py-3 text-[16px] font-inter font-semibold text-gray-800 hover:bg-gray-100"
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span>Booking Detail</span>
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

            {/* แผงรายละเอียด (แสดงเมื่อ open = true) */}
            {open && (
              <div id={panelId} className="overflow-hidden">
                <div className="px-4 sm:px-6 py-5 bg-gray-200">
                  {/* แถวบน: จำนวนผู้เข้าพัก/คืน + สถานะ/วิธีชำระเงิน */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-gray-600 text-[14px] sm:text-[15px]">
                    <div>
                      <span className="text-gray-700 text-[16px] font-inter">
                        {booking.guests}{" "}
                        {booking.guests > 1 ? "Guests" : "Guest"}
                      </span>
                      <span className="text-gray-700 text-[16px] font-inter">
                        {" "}
                        ({booking.nights}{" "}
                        {booking.nights > 1 ? "Nights" : "Night"})
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-gray-700 text-[16px] font-inter">{`Payment ${booking.payment.status} via `}</span>
                      <span className="text-gray-700 text-[16px] font-inter font-semibold">
                        {booking.payment.method}
                        {booking.payment.mask
                          ? ` - ${booking.payment.mask}`
                          : ""}
                      </span>
                    </div>
                  </div>

                  {/* รายการค่าใช้จ่ายย่อย + Total */}
                  <div className="mt-6">
                    {booking.items.map((it, idx) => (
                      <Row
                        key={idx}
                        label={it.label}
                        amount={money(it.amount)}
                      />
                    ))}

                    {/* เส้นคั่นก่อน Total */}
                    <div className="mt-4 border-t border-gray-400 pt-3 flex items-center justify-between">
                      <span className="text-gray-700 text-[16px] font-inter">
                        Total
                      </span>
                      <span className="text-[20px] font-inter font-semibold text-gray-900">
                        {moneyWithCurrency(booking.total, booking.currency)}
                      </span>
                    </div>
                  </div>

                  {/* แสดง error ตอนลบ ถ้ามี (ตอนนี้ยังไม่ได้ใช้จริง) */}
                  {deleteError && (
                    <div className="mt-4 text-sm text-red-600">
                      {deleteError}
                    </div>
                  )}
                </div>

                {/* คำขอเพิ่มเติมจากลูกค้า */}
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

          {/* ปุ่มล่างสำหรับ Desktop: Cancel / Room Detail / Change Date */}
          {showActions && (
            <div className="hidden md:flex md:[grid-row:3/4] md:[grid-column:1/3] items-center justify-between">
              <button
                type="button"
                onClick={handleCancelClick}
                disabled={deleting}
                className={`text-[16px] text-orange-500 font-semibold font-inter hover:underline ${
                  deleting ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                Cancel Booking
              </button>

              <div className="flex items-center gap-6 shrink-0">
                <Link
                  href={roomDetailHref}
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
          )}

          {/* ปุ่มล่างสำหรับ Mobile/Tablet: เรียงใหม่ให้เหมาะกับจอเล็ก */}
          {showActions && (
            <div className="mt-6 md:hidden">
              <div className="flex items-center justify-end gap-10">
                <Link
                  href={roomDetailHref}
                  className="text-[16px] text-orange-500 font-semibold font-inter"
                >
                  Room Detail
                </Link>

                <Link
                  href={`/customer/customer-bookings/change/${booking.id}`}
                  passHref
                >
                  <button
                    type="button"
                    className="rounded-md bg-orange-600 text-white px-10 py-4 text-[16px] font-semibold font-inter"
                  >
                    Change Date
                  </button>
                </Link>
              </div>

              <div className="mt-4 flex">
                <button
                  type="button"
                  onClick={handleCancelClick}
                  className="ml-auto text-[16px] text-orange-500 font-semibold font-inter"
                >
                  Cancel Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal ยืนยันยกเลิก (แบบขอคืนเงิน) */}
      <ConfirmModal
        open={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onConfirm={onConfirmRefund}
        title="Cancel Booking"
        message="Are you sure you would like to cancel this booking?"
        confirmText="Yes, I want to cancel and request refund"
        cancelText="No, Don’t Cancel"
      />

      {/* Modal ยืนยันยกเลิก (แบบคืนเงินไม่ได้) */}
      <NonRefundModal
        open={showNonRefundModal}
        onClose={() => setShowNonRefundModal(false)}
        onConfirm={onConfirmNonRefund}
      />
    </article>
  );
}

// แถวแสดง label + amount ใช้ในส่วน Booking Detail
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
