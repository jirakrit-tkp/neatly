import { useState } from "react";
import Link from "next/link";

export type Booking = {
  id: string;
  roomName: string;
  imageUrl: string;
  checkInDate: string;
  checkInNote?: string;
  checkOutDate: string;
  checkOutNote?: string;
  bookedAtText: string;
};

export default function BookingCard({ booking }: { booking: Booking }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="bg-white border-b border-gray-200 last:border-b-0">
      <div className="mx-auto max-w-[1120px] p-6">
        {/* รูปซ้าย + เนื้อหาขวา */}
        <div className="grid grid-cols-1 md:grid-cols-[357px_715px] md:gap-[48px]">
          {/* รูป */}
          <img
            src={booking.imageUrl}
            alt={booking.roomName}
            className="w-full md:w-[357px] h-[210px] object-cover rounded-[8px] mb-[20px] md:mb-0"
          />

          {/* เนื้อหาขวา */}
          <div className="w-full md:w-[715px]">
            {/* หัวเรื่อง + วันที่จอง */}
            <div className="flex items-start justify-between">
              <h2 className="text-[28px] font-semibold text-black">
                {booking.roomName}
              </h2>
              <div className="text-[16px] font-inter text-gray-600 mt-1">
                Booking date: {booking.bookedAtText}
              </div>
            </div>

            {/* Check-in / Check-out — เรียงชิดกัน ไม่มีกรอบ */}
            <div className="mt-[32px] flex flex-wrap items-start gap-x-8 gap-y-2">
              {/* Check-in */}
              <div>
                <div className="text-[16px] font-semibold text-gray-800 mb-1">
                  Check-in
                </div>
                <div className="flex items-center text-[16px] font-inter text-gray-800">
                  <span className="whitespace-nowrap">{booking.checkInDate}</span>
                  {booking.checkInNote && (
                    <>
                      <span className="mx-3 h-4 w-px bg-gray-300" aria-hidden />
                      <span className="whitespace-nowrap">{booking.checkInNote}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Check-out */}
              <div>
                <div className="text-[16px] font-semibold text-gray-800 mb-1">
                  Check-out
                </div>
                <div className="flex items-center text-[16px] font-inter text-gray-800">
                  <span className="whitespace-nowrap">{booking.checkOutDate}</span>
                  {booking.checkOutNote && (
                    <>
                      <span className="mx-3 h-4 w-px bg-gray-300" aria-hidden />
                      <span className="whitespace-nowrap">{booking.checkOutNote}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ปุ่มแถบ Booking Detail */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-[32px] w-full flex items-center justify-between bg-gray-200 px-5 py-3 text-[16px] font-inter font-semibold text-gray-700 hover:bg-gray-100"
              aria-expanded={open}
            >
              <span>Booking Detail</span>
              <svg
                className={`h-5 w-5 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.13l3.71-2.9a.75.75 0 11.92 1.18l-4.2 3.28a.75.75 0 01-.92 0l-4.2-3.28a.75.75 0 01.02-1.2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* รายละเอียดเมื่อกดเปิด */}
            {open && (
              <div className="mt-4 overflow-hidden">
                <div className="px-6 py-5 bg-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-gray-600 text-[15px]">
                    <div className="mb-3 sm:mb-0">
                      <span className="text-gray-800">2 Guests</span>
                      <span className="text-gray-400"> (1 Night)</span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-gray-500">Payment success via </span>
                      <span className="font-medium text-gray-700">Credit Card - *888</span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Row label="Superior Garden View Room" amount="2,500.00" />
                    <Row label="Airport transfer" amount="200.00" />
                    <Row label="Promotion Code" amount="-400.00" />
                    <div className="my-4 border-t" />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total</span>
                      <span className="text-[18px] font-semibold text-gray-900">
                        THB 2,300.00
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-300 px-6 py-4 border-t text-sm text-gray-700">
                  <div className="font-medium text-gray-700 mb-1">Additional Request</div>
                  <div>Can i have some chocolate?</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* แถวล่าง */}
        <div className="mt-[32px] flex items-center justify-between">
          <button className="text-[15px] text-orange-600 hover:underline">Cancel Booking</button>
          <div className="flex items-center gap-6">
            <Link href={`/customer/bookings/${booking.id}`} className="text-[15px] text-gray-700 hover:underline">
              Room Detail
            </Link>
            <button className="rounded-md bg-orange-600 text-white px-5 py-2 text-[15px] hover:brightness-110">
              Change Date
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* แถวซ้าย-ขวาในรายละเอียด */
function Row({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="py-2 flex items-start justify-between">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900 tabular-nums">{amount}</span>
    </div>
  );
}