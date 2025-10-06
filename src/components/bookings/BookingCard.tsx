import { useId, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type Booking = {
  id: string;
  roomName: string;
  imageUrl: string;

  checkInDate: string;
  checkInNote?: string;
  checkOutDate: string;
  checkOutNote?: string;

  bookedAtText: string;

  guests: number;
  nights: number;
  payment: {
    status: "success" | "pending" | "failed";
    method: string;
    mask?: string;
  };
  items: Array<{ label: string; amount: number }>;
  currency: "THB" | "USD" | string;
  total: number;
  additionalRequest?: string;
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const moneyWithCurrency = (n: number) => {
    try {
      // ถ้า currency เป็นรหัสมาตรฐาน (THB, USD ฯลฯ) จะฟอร์แมตเป็นเงินเลย
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: booking.currency as string,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch (_) {
      // ถ้าไม่ใช่รหัสมาตรฐาน ตกกลับเป็น <CUR> 1,234.00
      return `${booking.currency} ${money(n)}`;
    }
  };

  return (
    <article className="bg-white border-b border-gray-200 last:border-b-0 mt-6 md:mt-0">
      <div className="mx-auto max-w-[1120px] p-6">
        {/* กริดหลัก */}
        <div className="grid grid-cols-1 md:grid-cols-[357px_715px] md:grid-rows-[auto_auto_auto] md:gap-[48px]">
          {/* รูป: ใช้ next/image เพื่อ perf ที่ดีกว่า */}
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
                <div className="text-[16px] sm:text-[16px] font-semibold font-inter text-gray-800 mb-1">
                  Check-in
                </div>
                <div className="flex items-center text-[16px] sm:text-[16px] font-inter text-gray-800">
                  <span>{booking.checkInDate}</span>
                  {booking.checkInNote && (
                    <>
                      <span className="mx-2 sm:mx-3 h-4 w-px bg-gray-800" aria-hidden />
                      <span>{booking.checkInNote}</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[16px] sm:text-[16px] font-semibold text-gray-800 font-inter mb-1">
                  Check-out
                </div>
                <div className="flex items-center text-[16px] sm:text-[16px] font-inter text-gray-800">
                  <span>{booking.checkOutDate}</span>
                  {booking.checkOutNote && (
                    <>
                      <span className="mx-2 sm:mx-3 h-4 w-px bg-gray-800" aria-hidden />
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
              className="mt-[24px] md:mt-[32px] w-full flex items-center justify-between bg-gray-200 px-4 sm:px-5 py-3 text-[16px] sm:text-[16px] font-inter font-semibold text-gray-900 hover:bg-gray-100"
              aria-expanded={open}
              aria-controls={panelId}
            >
              <span>Booking Detail</span>
              <svg
                className={`h-5 w-5 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
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
                        {" "}({booking.nights} {booking.nights > 1 ? "Nights" : "Night"})
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
                    <div className="my-4" />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 text-[16px] font-inter">Total</span>
                      <span className="text-[20px] font-inter font-semibold text-gray-900">
                        {moneyWithCurrency(booking.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {booking.additionalRequest && (
                  <div className="bg-gray-300 px-4 sm:px-6 py-4 text-[16px] font-inter text-gray-700">
                    <div className="font-semibold font-inter text-gray-700 mb-1">Additional Request</div>
                    <div>{booking.additionalRequest}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ปุ่มล่าง — Mobile */}
          <div className="mt-[24px] md:mt-0 md:[grid-row:3/4] md:[grid-column:1/3] md:hidden">
            {/* แถว Room Detail + Change Date (กว้างเท่ากัน) */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href={`/customer/bookings/${booking.id}`}
                className="inline-flex h-11 w-full items-center justify-center text-[16px] font-semibold font-inter text-orange-500 hover:underline"
              >
                Room Detail
              </Link>
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-orange-600 font-semibold font-inter px-4 text-[16px] text-white hover:brightness-110"
              >
                Change Date
              </button>
            </div>

            {/* แถว Cancel Booking ชิดขวา */}
            <div className="mt-3 flex w-full justify-end">
              <button type="button" className="text-[16px] font-inter font-semibold text-orange-500 hover:underline">
                Cancel Booking
              </button>
            </div>
          </div>

          {/* ปุ่มล่าง — Desktop */}
          <div className="hidden md:flex md:[grid-row:3/4] md:[grid-column:1/3] items-center justify-between">
            <button
              type="button"
              className="text-[16px] text-orange-500 font-semibold font-inter hover:underline cursor-pointer"
            >
              Cancel Booking
            </button>

            <div className="flex items-center gap-6 shrink-0">
              <Link
                href={`/customer/bookings/${booking.id}`}
                className="text-[16px] text-orange-500 font-semibold font-inter hover:underline"
              >
                Room Detail
              </Link>
              <button
                type="button"
                className="rounded-md bg-orange-600 text-white px-5 py-2 text-[16px] font-semibold font-inter cursor-pointer hover:brightness-110"
              >
                Change Date
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="py-2 flex items-start justify-between">
      <span className="font-inter text-[16px] text-gray-700">{label}</span>
      <span className="font-inter text-[16px] text-gray-900 font-semibold">{amount}</span>
    </div>
  );
}