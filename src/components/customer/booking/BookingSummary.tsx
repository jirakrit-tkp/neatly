import React from "react";
import { BookingCalculation } from "@/types/booking";
import { formatCurrency, formatDate, formatPrice } from "@/utils/bookingUtils";
import { BagIcon } from "@/components/customer/icons/BagIcon";

interface BookingSummaryProps {
  roomInfo: {
    name: string;
    price: number;
    image?: string;
  };
  checkIn: string;
  checkOut: string;
  guests: number;
  roomCount: number;
  calculation: BookingCalculation;
  specialRequests?: Array<{
    name: string;
    price: number;
    calculated_price?: number;
  }>;
  standardRequests?: Array<{
    name: string;
    selected: boolean;
  }>;
  promotionCode?: {
    code: string;
    discount: number;
  };
  timeLeft?: {
    minutes: number;
    seconds: number;
  };
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  roomInfo,
  checkIn,
  checkOut,
  guests,
  roomCount,
  calculation,
  specialRequests = [],
  standardRequests = [],
  promotionCode,
  timeLeft,
}) => {
  // ตรวจสอบ standard requests
  const hasEarlyCheckIn = standardRequests.some(
    (req) => req.name.toLowerCase().includes("early check-in") && req.selected
  );
  const hasLateCheckOut = standardRequests.some(
    (req) => req.name.toLowerCase().includes("late check-out") && req.selected
  );

  // กำหนดเวลาตรวจสอบเข้า-ออก
  const checkInTime = hasEarlyCheckIn ? "12:00 PM" : "2:00 PM";
  const checkOutTime = hasLateCheckOut ? "4:00 PM" : "12:00 PM";

  return (
    <div className="w-full md:w-[358px] h-fit rounded-md overflow-hidden">
      {/* ส่วนบน - Header (เขียวเข้ม green-800) */}
      <div className="flex items-center justify-between w-full h-fit px-6 py-4 bg-[var(--color-green-800)] text-[var(--color-white)]">
        <div className="flex items-center">
          <BagIcon className="w-[18px] h-[18px] mr-2 text-green-500" />
          <h3 className="text-lg font-semibold font-[var(--font-inter)]">
            Booking Detail
          </h3>
        </div>

        {timeLeft && (
          <div className="flex items-center justify-center rounded w-[56px] h-[25px] bg-[var(--color-orange-200)]">
            <span className="text-sm font-semibold leading-none tracking-normal text-[var(--color-orange-700)] font-[var(--font-inter)]">
              {timeLeft.minutes.toString().padStart(2, "0")}:
              {timeLeft.seconds.toString().padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {/* ส่วนล่าง - Content (เขียวอ่อน green-600) */}
      <div className="flex flex-col p-6 gap-10 bg-[var(--color-green-700)] text-[var(--color-white)]">
        {/* Check-in/Check-out Times */}
        <div className="flex gap-6 mb-4">
          {/* Check-in (Left) */}
          <div className="text-left">
            <div className="mb-2 text-base font-semibold tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
              Check-in
            </div>
            <div className="text-base font-normal tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
              {hasEarlyCheckIn ? "After" : "After"} {checkInTime}
            </div>
          </div>

          {/* Check-out (Right) */}
          <div className="text-left">
            <div className="mb-2 text-base font-semibold tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
              Check-out
            </div>
            <div className="text-base font-normal text-[var(--color-white)] font-[var(--font-inter)]">
              Before {checkOutTime}
            </div>
          </div>
        </div>

        {/* Dates, Rooms and Guests */}
        <div className="mb-6">
          <p className="mb-1 text-base font-[var(--font-inter)]">
            {formatDate(checkIn)} - {formatDate(checkOut)}
          </p>
          <p className="text-base font-[var(--font-inter)]">
            {roomCount} Room{roomCount > 1 ? "s" : ""}, {guests} Guest
            {guests > 1 ? "s" : ""}
          </p>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 mb-4">
          {/* Room Price */}
          <div className="flex justify-between mb-2">
            <div className="flex flex-col">
              <div className="text-base tracking-tight text-[var(--color-green-300)] font-[var(--font-inter)]">
                {roomInfo.name}
              </div>
              <div className="text-xs text-[var(--color-green-200)] font-[var(--font-inter)] ml-0">
                ({roomCount} room{roomCount > 1 ? "s" : ""}
                {calculation.nights > 1
                  ? `, ${calculation.nights} nights`
                  : `, ${calculation.nights} night`}
                )
              </div>
            </div>
            <div className="text-base tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
              {formatPrice(calculation.subtotal)}
            </div>
          </div>

          {/* Special Requests */}
          {specialRequests && specialRequests.length > 0 && (
            <>
              {specialRequests.map((request, index) => {
                // ตรวจสอบว่าเป็น Breakfast หรือไม่ (คิดตามจำนวนคืน)
                const isBreakfast = request.name
                  .toLowerCase()
                  .includes("breakfast");
                const nightsText =
                  calculation.nights > 1
                    ? `, ${calculation.nights} nights`
                    : `, ${calculation.nights} night`;
                const roomsText = roomCount > 1 ? "rooms" : "room";

                // ใช้ calculated_price ที่คำนวณแล้วจาก database
                const totalRequestPrice = request.calculated_price || 0;

                return (
                  <div key={index} className="flex justify-between mb-2">
                    <div className="flex flex-col">
                      <div className="text-base tracking-tight text-[var(--color-green-300)] font-[var(--font-inter)]">
                        {request.name}
                      </div>
                      <div className="text-xs text-[var(--color-green-200)] font-[var(--font-inter)] ml-0">
                        ({roomCount} {roomsText}
                        {isBreakfast ? nightsText : ""})
                      </div>
                    </div>
                    <div className="text-base tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
                      {formatPrice(totalRequestPrice)}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Promotion Code */}
          {promotionCode && promotionCode.discount > 0 && (
            <div className="flex justify-between mb-2">
              <div className="text-base text-[var(--color-green-300)] font-[var(--font-inter)]">
                Promotion ({promotionCode.code})
              </div>
              <div className="text-base text-white font-[var(--font-inter)]">
                -{formatPrice(promotionCode.discount)}
              </div>
            </div>
          )}

          {/* Divider Line */}
          <div className="my-4 border-t border-[var(--color-green-600)]"></div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <div className="text-base tracking-tight text-[var(--color-green-300)] font-[var(--font-inter)]">
              Total
            </div>
            <div className="text-xl font-semibold tracking-tight text-[var(--color-white)] font-[var(--font-inter)]">
              {formatCurrency(calculation.total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
