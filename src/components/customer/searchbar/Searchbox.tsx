import React, { useState, useRef } from "react";

// ปฎิทิน Calendar utility
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}
function formatDateString(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function parseLocalYmd(ymd: string): Date {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function formatLocalYmd(date: Date): string {
  // "yyyy-mm-dd" - ใช้ local time แทน UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function isSameDay(date1: Date, date2: Date) {
  return startOfDay(date1).getTime() === startOfDay(date2).getTime();
}
function isToday(date: Date) {
  return isSameDay(date, new Date());
}
function isPast(date: Date) {
  return startOfDay(date) < startOfDay(new Date());
}
function isBefore(date1: Date, date2: Date) {
  return startOfDay(date1) < startOfDay(date2);
}

export interface SearchParams {
  checkIn: string;
  checkOut: string;
  room: string;
  guests: string;
  [key: string]: string;
}

interface SearchBoxProps {
  onSearch?: (params: SearchParams) => void;
  defaultValues?: Partial<SearchParams>;
}

export default function SearchBox({ onSearch, defaultValues }: SearchBoxProps) {
  const defaultRoom = defaultValues?.room ? Number(defaultValues.room) : 1;
  const defaultGuest = defaultValues?.guests ? Number(defaultValues.guests) : 2;
  const [checkIn, setCheckIn] = useState<string>(
    defaultValues?.checkIn || getTodayDateString()
  );
  const [checkOut, setCheckOut] = useState<string>(
    defaultValues?.checkOut || getTodayDateString()
  );
  const [room, setRoom] = useState<number>(defaultRoom);
  const [guest, setGuest] = useState<number>(defaultGuest);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState<
    "checkin" | "checkout" | null
  >(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [validationError, setValidationError] = useState<string>("");
  const dropdownButtonRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Ensure checkout is at least checkin + 1 วัน
  React.useEffect(() => {
    try {
      const ci = parseLocalYmd(checkIn);
      const minCo = addDays(ci, 1);
      const currentCo = parseLocalYmd(checkOut);
      if (!checkOut || isBefore(currentCo, minCo) || isSameDay(currentCo, ci)) {
        setCheckOut(formatLocalYmd(minCo));
      }
    } catch {}
  }, [checkIn]);

  // Guest capacity validation
  const validateGuestCapacity = (roomCount: number, guestCount: number) => {
    // Default max guests per room (can be overridden by API later)
    const maxGuestsPerRoom = 2;
    const maxTotalGuests = roomCount * maxGuestsPerRoom;

    if (guestCount > maxTotalGuests) {
      setValidationError(
        `Maximum ${maxTotalGuests} guests for ${roomCount} room(s). Each room accommodates up to ${maxGuestsPerRoom} guests.`
      );
      return false;
    }
    setValidationError("");
    return true;
  };

  // Validate guest capacity when room or guest count changes
  React.useEffect(() => {
    validateGuestCapacity(room, guest);
  }, [room, guest]);

  // ปิด dropdown/calendar เมื่อคลิกข้างนอก
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node) &&
        dropdownPanelRef.current &&
        !dropdownPanelRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setCalendarOpen(null);
      }
    }
    if (dropdownOpen || calendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen, calendarOpen]);

  // Room/Guest label
  const roomGuestLabel = `${room} room${room > 1 ? "s" : ""}, ${guest} guest${
    guest > 1 ? "s" : ""
  }`;

  // Calendar
  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") newMonth.setMonth(prev.getMonth() - 1);
      else newMonth.setMonth(prev.getMonth() + 1);
      return newMonth;
    });
  };

  const calendarIcon = (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
      <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
        <rect
          x="3"
          y="5"
          width="14"
          height="12"
          rx="2"
          stroke="#BDBDBD"
          strokeWidth="1.2"
        />
        <path
          d="M7 3v2M13 3v2"
          stroke="#BDBDBD"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <rect x="7" y="9" width="2" height="2" rx="1" fill="#BDBDBD" />
        <rect x="11" y="9" width="2" height="2" rx="1" fill="#BDBDBD" />
      </svg>
    </span>
  );

  return (
    <div className="flex items-center justify-center px-4 md:px-0 relative z-10">
        <style jsx>{`
         .searchbox-container { 
           width: 343px; 
           height: 396px;
           padding: 24px;
         }
         @media (min-width:768px) { 
           .searchbox-container { 
              width: 1120px !important;
              height: 196px !important;
             padding: 20px !important;
            }
          }
          @media (max-width: 767px) {
           html, body {
             overflow: visible !important;
             height: auto !important;
           }
           * {
             overflow: visible !important;
           }
           .calendar-mobile {
             position: fixed !important;
             top: 50% !important;
             left: 50% !important;
             transform: translate(-50%, -50%) !important;
             z-index: 99999 !important;
             width: 360px !important;
             height: 420px !important;
             max-height: 420px !important;
             overflow: visible !important;
             border-radius: 12px !important;
             box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
           }
           .calendar-mobile .calendar-content {
             overflow: visible !important;
             max-height: none !important;
             height: auto !important;
             min-height: 380px !important;
             padding: 20px !important;
           }
           .calendar-mobile .calendar-dates {
             overflow: visible !important;
             max-height: none !important;
             display: grid !important;
             grid-template-columns: repeat(7, 1fr) !important;
             gap: 0px !important;
             margin-top: 4px !important;
           }
           .calendar-mobile .calendar-dates button {
             width: 32px !important;
             height: 32px !important;
             font-size: 12px !important;
             border-radius: 6px !important;
           }
           .calendar-mobile * {
             overflow: visible !important;
             position: relative !important;
           }
         }
        `}</style>
      <div className="bg-white shadow-lg searchbox-container">
        <form
          className="flex flex-col gap-4 md:flex-row md:gap-6 items-center justify-center h-full"
            onSubmit={e => { 
              e.preventDefault(); 
              if (onSearch) {
                onSearch({ checkIn, checkOut, room: room.toString(), guests: guest.toString() });
              }
            }}
          >
              {/* Check In */}
            <div className="flex flex-col w-full md:w-[240px]">
              <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkin">Check In</label>
              <div className="relative">
                  <input
                    id="checkin"
                    type="text"
                  className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                  value={formatDateString(checkIn)}
                    readOnly
                    onClick={() => {
                      setCalendarOpen('checkin');
                      const ci = checkIn ? parseLocalYmd(checkIn) : new Date();
                      setCurrentMonth(new Date(ci.getFullYear(), ci.getMonth(), 1));
                  }}
                />
                {calendarIcon}
                {calendarOpen === 'checkin' && (
                  <div className="absolute left-0 top-full w-full">
                    <CalendarPopup
                      calendarRef={calendarRef}
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      selectDate={date => {
                        setCheckIn(formatLocalYmd(date));
                        setCalendarOpen(null);
                      }}
                      selectedDate={checkIn}
                      disabledDay={date => isPast(date)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Separator */}
            <div className="hidden md:flex items-center justify-center w-4 h-12 mt-4">
              <div className="w-2 h-px bg-black"></div>
            </div>

            {/* Check Out */}
            <div className="flex flex-col w-full md:w-[240px]">
              <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkout">Check Out</label>
              <div className="relative">
                  <input
                    id="checkout"
                    type="text"
                  className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                  value={formatDateString(checkOut)}
                    readOnly
                    onClick={() => {
                      setCalendarOpen('checkout');
                    const co = checkOut ? parseLocalYmd(checkOut) : new Date();
                    setCurrentMonth(new Date(co.getFullYear(), co.getMonth(), 1));
                  }}
                />
                {calendarIcon}
                {calendarOpen === 'checkout' && (
                  <div className="absolute left-0 top-full w-full">
                    <CalendarPopup
                      calendarRef={calendarRef}
                      currentMonth={currentMonth}
                      setCurrentMonth={setCurrentMonth}
                      selectDate={date => {
                        setCheckOut(formatLocalYmd(date));
                        setCalendarOpen(null);
                      }}
                      selectedDate={checkOut}
                      disabledDay={date => isPast(date) || (checkIn ? (isBefore(date, parseLocalYmd(checkIn)) || isSameDay(date, parseLocalYmd(checkIn))) : false)}
                    />
                  </div>
                  )}
                </div>
              </div>
          {/* ห้อง / คน */}
          <div className="flex flex-col w-full md:w-[240px] relative" ref={dropdownButtonRef}>
            <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="roomguest">
              Rooms & Guests
            </label>
            <button
              id="roomguest"
              type="button"
              className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-8 text-sm text-left bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 appearance-none flex items-center"
              onClick={() => setDropdownOpen(v => !v)}
              tabIndex={0}
            >
              {roomGuestLabel}
              <span className="absolute right-3 top-[72%] -translate-y-1/2 text-gray-400 pointer-events-none">
                {/* ปรับตำแหน่ง v ให้เลื่อนลงมา (top-[72%] จาก top-1/2 เดิม) */}
                <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
                  <path d="M6 8l4 4 4-4" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </button>
            {dropdownOpen && (
              <div
                className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg py-3 px-4 z-20 w-full min-w-[240px] max-w-[320px]"
                style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)" }}
                ref={dropdownPanelRef}
              >
                      {/* Room */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">Room</span>
                        <div className="flex items-center gap-2">
                    <button type="button" className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition disabled:opacity-50"
                      onClick={() => setRoom(r => Math.max(1, r - 1))} disabled={room <= 1} aria-label="Decrease room">
                      -
                    </button>
                    <span className="w-5 text-center text-base text-gray-700">
                      {room}
                    </span>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition"
                      onClick={() => setRoom((r) => Math.min(10, r + 1))}
                      aria-label="Increase room"
                    >
                      +
                    </button>
                  </div>
                </div>
                {/* Guest */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Guest</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition disabled:opacity-50"
                      onClick={() => setGuest((g) => Math.max(1, g - 1))}
                      disabled={guest <= 1}
                      aria-label="Decrease guest"
                    >
                      -
                    </button>
                    <span className="w-5 text-center text-base text-gray-700">
                      {guest}
                    </span>
                    <button
                      type="button"
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition disabled:opacity-50"
                      onClick={() => setGuest((g) => Math.min(20, g + 1))}
                      disabled={guest >= room * 2}
                      aria-label="Increase guest"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Validation Error */}
                {validationError && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {validationError}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Search Button */}
          <div className="flex flex-col w-full md:w-[144px]">
            <label
              className="text-sm text-gray-700 mb-2 font-medium"
              htmlFor="search"
            >
              &nbsp;
            </label>
            <button
              type="submit"
              disabled={!!validationError}
              className={`w-full h-12 border rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                validationError
                  ? "bg-gray-400 text-gray-200 border-gray-400 cursor-not-allowed"
                  : "bg-orange-600 text-white border-orange-500 hover:bg-orange-600 hover:border-orange-600"
              }`}
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Component ปฎิทิน
type CalendarProps = {
  calendarRef: React.RefObject<HTMLDivElement | null>;
  currentMonth: Date;
  setCurrentMonth: (month: Date | ((prev: Date) => Date)) => void;
  selectDate: (date: Date) => void;
  selectedDate?: string;
  disabledDay?: (date: Date) => boolean;
};
function CalendarPopup({
  calendarRef,
  currentMonth,
  setCurrentMonth,
  selectDate,
  selectedDate,
  disabledDay,
}: CalendarProps) {
  // สร้างกริดวันที่ของเดือน
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // คำนวณวันที่เริ่มต้นของกริด (วันจันทร์ของสัปดาห์แรก)
  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startDate = new Date(year, month, 1 - daysToSubtract);

  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    // 6 สัปดาห์
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(date);
  }

  function isCurrentMonth(d: Date) {
    return d.getMonth() === month;
  }
  function isSelected(d: Date) {
    return selectedDate && isSameDay(d, parseLocalYmd(selectedDate));
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (calendarRef.current) {
      const evt = new CustomEvent("navigate-calendar", {
        detail: { direction },
      });
      calendarRef.current.dispatchEvent(evt);
    }
  };

  // Handle month navigation
  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  return (
    <div
      ref={calendarRef}
      className="bg-white rounded-lg shadow-lg border border-gray-200 z-30 calendar-mobile"
      style={{ 
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        height: 280, 
        maxHeight: 280, 
        overflow: "hidden",
        position: "relative"
      }}
    >
      <div className="p-3 h-full flex flex-col select-none calendar-content">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => handleMonthChange("prev")}
            className="p-2 hover:bg-orange-50 rounded-full transition-colors"
          >
            <svg
              width={18}
              height={18}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => handleMonthChange("next")}
            className="p-2 hover:bg-orange-50 rounded-full transition-colors"
          >
            <svg
              width={18}
              height={18}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
        {/* Calendar Days Header */}
         <div className="grid grid-cols-7 gap-0 mb-1">
           {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
             <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">{day}</div>
           ))}
         </div>
        {/* Calendar Dates */}
        <div className="grid grid-cols-7 gap-0 calendar-dates">
          {dates.map((date, index) => {
            const disabled = disabledDay ? disabledDay(date) : false;
            return (
              <button
                key={index}
                type="button"
                disabled={disabled || !isCurrentMonth(date)}
                onClick={() => {
                  if (!disabled && isCurrentMonth(date)) selectDate(date);
                }}
                className={`
                  w-7 h-7 text-xs rounded-full flex items-center justify-center transition
                  ${(!isCurrentMonth(date) || disabled ? 'text-gray-300 bg-transparent cursor-not-allowed' : 'hover:bg-orange-50 text-gray-800')}
                  ${isSelected(date) ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}
                  ${isToday(date) && !isSelected(date) ? 'border border-orange-400' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
