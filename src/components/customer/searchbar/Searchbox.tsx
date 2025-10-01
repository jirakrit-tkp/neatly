import React, { useState, useRef } from "react";

// Helper to get today's date in yyyy-mm-dd format
function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to format date as "Thu, 19 Oct 2022"
function formatDateString(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface SearchParams {
  checkIn: string;
  checkOut: string;
  room: string; // number of rooms
  guests: string; // number of guests
  [key: string]: string; // index signature for URLSearchParams compatibility
}

interface SearchBoxProps {
  onSearch?: (params: SearchParams) => void;
  defaultValues?: Partial<SearchParams>;
}

export default function SearchBox({ onSearch, defaultValues }: SearchBoxProps) {
  // Parse default values
  const defaultRoom = defaultValues?.room ? Number(defaultValues.room) : 1;
  const defaultGuest = defaultValues?.guests ? Number(defaultValues.guests) : 2;

  const [checkIn, setCheckIn] = useState<string>(defaultValues?.checkIn || getTodayDateString());
  const [checkOut, setCheckOut] = useState<string>(defaultValues?.checkOut || getTodayDateString());
  
  // Format dates for display
  const checkInDisplay = formatDateString(checkIn);
  const checkOutDisplay = formatDateString(checkOut);
  const [room, setRoom] = useState<number>(defaultRoom);
  const [guest, setGuest] = useState<number>(defaultGuest);

  // For dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState<'checkin' | 'checkout' | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const dropdownButtonRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Ensure checkout is always at least checkin + 1 day
  React.useEffect(() => {
    try {
      const ci = parseLocalYmd(checkIn);
      const minCo = addDays(ci, 1);
      const currentCo = parseLocalYmd(checkOut);
      if (!checkOut || startOfDay(currentCo) <= startOfDay(ci)) {
        setCheckOut(formatLocalYmd(minCo));
      }
    } catch {
      // noop
    }
  }, [checkIn]);

  // Close dropdown on outside click
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

  // Label for the selector
  const roomGuestLabel = `${room} room${room > 1 ? "s" : ""}, ${guest} guest${guest > 1 ? "s" : ""}`;

  // Minimums
  const minRoom = 1;
  const minGuest = 1;

  // Maximums (arbitrary, can adjust)
  const maxRoom = 10;
  const maxGuest = 20;

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getDaysArray = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), i));
    }
    
    return days;
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Format Date -> 'YYYY-MM-DD' in local time (avoid timezone shifts)
  const formatLocalYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Parse 'YYYY-MM-DD' to Date in local time
  const parseLocalYmd = (ymd: string): Date => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const isSameDate = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() && 
           date1.getMonth() === date2.getMonth() && 
           date1.getFullYear() === date2.getFullYear();
  };

  const handleDateClick = (date: Date) => {
    if (calendarOpen === 'checkin') {
      setCheckIn(formatLocalYmd(date));
      // Keep highlight on the selected check-in date
      setSelectedDate(startOfDay(date));
      // Stay on check-in calendar (do not auto-switch)
      return;
    }
    if (calendarOpen === 'checkout') {
      // Guard: checkout must be strictly greater than checkin
      const ci = checkIn ? startOfDay(parseLocalYmd(checkIn)) : startOfDay(new Date());
      if (startOfDay(date) <= ci) {
        return; // ignore invalid selection
      }
      setCheckOut(formatLocalYmd(date));
      setCalendarOpen(null);
      setSelectedDate(startOfDay(date));
      return;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  // Calendar SVG
  const calendarIcon = (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
      <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
        <rect x="3" y="5" width="14" height="12" rx="2" stroke="#BDBDBD" strokeWidth="1.2" />
        <path d="M7 3v2M13 3v2" stroke="#BDBDBD" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="7" y="9" width="2" height="2" rx="1" fill="#BDBDBD" />
        <rect x="11" y="9" width="2" height="2" rx="1" fill="#BDBDBD" />
      </svg>
    </span>
  );

  // --- MOBILE SIZE 375*364 ---
  // We'll use inline style for the outermost container to force the size on mobile.
  // On desktop, let it be responsive as before.

  return (
    <div
      className={`
        flex
        items-center
        justify-center
        px-4 md:px-0
        relative
        z-10
      `}
      style={{
        maxWidth: "100vw",
        width: "100%",
        marginTop: "0",
      }}
    >
      <style>
        {`
          @media (max-width: 767px) {
            .searchbox-outer-border {
              width: 375px !important;
              min-width: 375px !important;
              max-width: 375px !important;
              height: 364px !important;
              min-height: 364px !important;
              max-height: 364px !important;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              box-sizing: border-box;
              background: #fff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0 auto;
            }
            .searchbox-mobile-size {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              flex-direction: column !important;
              gap: 16px !important;
            }
            .searchbox-field {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: auto !important;
              max-height: none !important;
            }
            .searchbox-btn {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
              align-self: stretch !important;
            }
            .searchbox-input {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
            }
            .searchbox-btn button {
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
            }
            .searchbox-row-equal {
              display: flex !important;
              flex-direction: column !important;
              gap: 16px !important;
              width: 100% !important;
            }
          }
          @media (min-width: 768px) {
            .searchbox-outer-border {
              width: 1120px !important;
              min-width: 1120px !important;
              max-width: 1120px !important;
              height: 196px !important;
              min-height: 196px !important;
              max-height: 196px !important;
              border: 6px solid #fff;
              border-radius: 1.25rem; /* 20px */
              box-sizing: border-box;
              background: #fff;
              box-shadow: 0 6px 32px 0 rgba(0,0,0,0.08);
              padding: 0.5rem;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .searchbox-mobile-size {
              width: 100%;
              height: 100%;
              flex-direction: row !important;
              gap: 24px !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
              align-items: center !important;
              position: relative;
            }
            .searchbox-field {
              width: 260px !important;
              min-width: 200px !important;
              max-width: 320px !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
            }
            .searchbox-btn {
              min-width: 144px !important;
              max-width: 144px !important;
              width: 144px !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
              align-self: center !important;
            }
            .searchbox-input {
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
            }
            .searchbox-btn button {
              min-width: 144px !important;
              max-width: 144px !important;
              width: 144px !important;
              height: 48px !important;
              min-height: 48px !important;
              max-height: 48px !important;
            }
          }
          /* Custom: Make Rooms & Guests and Search button in a row, no gap between them */
          @media (min-width: 768px) {
            .searchbox-row-group {
              display: flex;
              flex-direction: row;
              align-items: flex-end;
              gap: 0 !important;
            }
            .searchbox-field.searchbox-roomguest {
              margin-right: 0 !important;
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            }
            .searchbox-btn {
              margin-left: 0 !important;
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;
            }
          }
          @media (max-width: 767px) {
            .searchbox-row-group {
              display: flex;
              flex-direction: column;
              gap: 0 !important;
              width: 100%;
            }
            .searchbox-field.searchbox-roomguest,
            .searchbox-btn {
              width: 100% !important;
              margin-right: 0 !important;
              margin-left: 0 !important;
            }
          }
          /* Make checkin, checkout, and roomguest fields the same width in row layout */
          @media (min-width: 768px) {
            .searchbox-row-equal {
              display: flex;
              flex-direction: row;
              align-items: flex-end;
              gap: 0 !important;
              width: 100%;
            }
            .searchbox-field.searchbox-checkin,
            .searchbox-field.searchbox-checkout,
            .searchbox-field.searchbox-roomguest {
              flex: 1 1 0%;
              width: 0 !important;
              min-width: 0 !important;
              max-width: none !important;
            }
            .searchbox-field.searchbox-checkin {
              border-top-right-radius: 0 !important;
              border-bottom-right-radius: 0 !important;
            }
            .searchbox-field.searchbox-checkout {
              border-radius: 0 !important;
            }
            .searchbox-field.searchbox-roomguest {
              border-top-left-radius: 0 !important;
              border-bottom-left-radius: 0 !important;
            }
          }
          @media (max-width: 767px) {
            .searchbox-row-equal {
              display: flex;
              flex-direction: column;
              gap: 16px !important;
              width: 100%;
            }
            .searchbox-field.searchbox-checkin,
            .searchbox-field.searchbox-checkout,
            .searchbox-field.searchbox-roomguest,
            .searchbox-btn {
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              margin-right: 0 !important;
              margin-left: 0 !important;
            }
          }
        `}
      </style>
      <div
        className="searchbox-outer-border flex justify-center items-center"
        style={{
          // Forcibly set for mobile, but let desktop be responsive
          width: "375px",
          minWidth: "375px",
          maxWidth: "375px",
          height: "364px",
          minHeight: "364px",
          maxHeight: "364px",
        }}
      >
        <div
          className={`
            bg-white
            rounded-xl
            shadow
            mx-auto
            flex
            items-center
            justify-center
            px-0
            relative
            z-10
            w-full
            h-full
          `}
          style={{
            width: "100%",
            height: "100%",
            marginTop: "0",
          }}
        >
          <form
            className={`
              searchbox-mobile-size
              flex
              items-center
              justify-center
              w-full
              h-full
              py-0
            `}
            style={{
              width: "100%",
              height: "100%",
            }}
            onSubmit={e => { 
              e.preventDefault(); 
              if (onSearch) {
                onSearch({ checkIn, checkOut, room: room.toString(), guests: guest.toString() });
              }
            }}
          >
            {/* Check In, Check Out, Rooms & Guests + Search Button in a row */}
            <div className="searchbox-row-equal w-full">
              {/* Check In */}
              <div
                className={`
                  searchbox-field searchbox-checkin
                  flex flex-col
                  justify-end
                `}
                style={{
                  marginRight: 0,
                }}
              >
                <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkin">
                  Check In
                </label>
                <div className="relative h-full">
                  <input
                    id="checkin"
                    type="text"
                    className="searchbox-input w-full h-[48px] border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                    value={checkInDisplay}
                    readOnly
                    onClick={() => {
                      // Open check-in at its current month and keep highlight at current check-in
                      setCalendarOpen('checkin');
                      const ci = checkIn ? parseLocalYmd(checkIn) : new Date();
                      setCurrentMonth(new Date(ci.getFullYear(), ci.getMonth(), 1));
                      setSelectedDate(startOfDay(ci));
                    }}
                    style={{
                      height: "48px",
                      minHeight: "48px",
                      maxHeight: "48px",
                    }}
                  />
                  {calendarIcon}
                  
                  {/* Calendar Dropdown for Check In */}
                  {calendarOpen === 'checkin' && (
                    <div 
                      ref={calendarRef}
                      className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-30 w-full max-w-md"
                      style={{
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <div className="p-4">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatMonthYear(currentMonth)}
                          </h3>
                          <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Days of week */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                            <div key={index} className="text-center text-sm font-medium text-gray-500 py-2">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysArray(currentMonth).map((date, index) => {
                            if (!date) {
                              return <div key={index} className="h-10"></div>;
                            }

                        const isSelected = isSameDate(date, selectedDate);
                        const isToday = isSameDate(date, new Date());
                        const isHovered = isSameDate(date, hoveredDate);
                        const todayStart = startOfDay(new Date());
                        const checkInBase = checkIn ? startOfDay(parseLocalYmd(checkIn)) : todayStart;
                        const isPast = calendarOpen === 'checkin'
                          ? startOfDay(date) < todayStart
                          : startOfDay(date) <= checkInBase;

                            return (
                              <button
                                key={index}
                                onClick={() => !isPast && handleDateClick(date)}
                                onMouseEnter={() => setHoveredDate(date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                disabled={isPast}
                                className={`
                                  h-10 w-10 rounded-full text-sm font-medium transition-colors
                              ${isPast 
                                ? 'text-gray-300 bg-gray-100 cursor-not-allowed' 
                                    : 'text-gray-700 hover:bg-orange-50 cursor-pointer'
                                  }
                                  ${isSelected 
                                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                    : (!isPast && isHovered && !isSelected)
                                    ? 'bg-orange-100 text-orange-700'
                                    : (!isPast && isToday && !isSelected)
                                    ? 'bg-gray-100 text-gray-900'
                                    : ''
                                  }
                                `}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => setCalendarOpen(null)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setCalendarOpen(null)}
                            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Check Out */}
              <div
                className={`
                  searchbox-field searchbox-checkout
                  flex flex-col
                  justify-end
                `}
                style={{
                  marginRight: 0,
                }}
              >
                <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkout">
                  Check Out
                </label>
                <div className="relative h-full">
                  <input
                    id="checkout"
                    type="text"
                    className="searchbox-input w-full h-[48px] border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                    value={checkOutDisplay}
                    readOnly
                    onClick={() => {
                      // Open at month of (check-in + 1 day) for check-out
                      const base = checkIn ? parseLocalYmd(checkIn) : new Date();
                      const nextDay = addDays(base, 1);
                      const currentCo = checkOut ? parseLocalYmd(checkOut) : nextDay;
                      setCalendarOpen('checkout');
                      setCurrentMonth(new Date(currentCo.getFullYear(), currentCo.getMonth(), 1));
                      setSelectedDate(startOfDay(currentCo));
                    }}
                    style={{
                      height: "48px",
                      minHeight: "48px",
                      maxHeight: "48px",
                    }}
                  />
                  {calendarIcon}
                  
                  {/* Calendar Dropdown for Check Out */}
                  {calendarOpen === 'checkout' && (
                    <div 
                      ref={calendarRef}
                      className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-30 w-full max-w-md"
                      style={{
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                      }}
                    >
                      <div className="p-4">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={() => navigateMonth('prev')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatMonthYear(currentMonth)}
                          </h3>
                          <button
                            onClick={() => navigateMonth('next')}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>

                        {/* Days of week */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                            <div key={index} className="text-center text-sm font-medium text-gray-500 py-2">
                              {day}
                            </div>
                          ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysArray(currentMonth).map((date, index) => {
                            if (!date) {
                              return <div key={index} className="h-10"></div>;
                            }

                            const isSelected = isSameDate(date, selectedDate);
                            const isToday = isSameDate(date, new Date());
                            const isHovered = isSameDate(date, hoveredDate);
                            const todayStart = startOfDay(new Date());
                            const checkInBase = checkIn ? startOfDay(parseLocalYmd(checkIn)) : todayStart;
                            // In checkout calendar, block days <= check-in
                            const isPast = startOfDay(date) <= checkInBase;

                            return (
                              <button
                                key={index}
                                onClick={() => !isPast && handleDateClick(date)}
                                onMouseEnter={() => setHoveredDate(date)}
                                onMouseLeave={() => setHoveredDate(null)}
                                disabled={isPast}
                                className={`
                                  h-10 w-10 rounded-full text-sm font-medium transition-colors
                                  ${isPast 
                                    ? 'text-gray-300 bg-gray-100 cursor-not-allowed pointer-events-none' 
                                    : 'text-gray-700 hover:bg-orange-50 cursor-pointer'
                                  }
                                  ${isSelected 
                                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                    : isHovered && !isSelected
                                    ? 'bg-orange-100 text-orange-700'
                                    : isToday && !isSelected
                                    ? 'bg-gray-100 text-gray-900'
                                    : ''
                                  }
                                `}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={() => setCalendarOpen(null)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setCalendarOpen(null)}
                            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Rooms & Guests */}
              <div
                className={`
                  searchbox-field searchbox-roomguest
                  flex flex-col
                  justify-end
                  relative
                `}
                ref={dropdownButtonRef}
                style={{
                  marginRight: 0,
                }}
              >
                <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="roomguest">
                  Rooms & Guests
                </label>
                <div className="relative h-full">
                  <button
                    id="roomguest"
                    type="button"
                    className="searchbox-select w-full h-[48px] border border-gray-300 rounded-lg px-3 pr-8 text-sm text-left bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 appearance-none flex items-center"
                    style={{
                      height: "48px",
                      minHeight: "48px",
                      maxHeight: "48px",
                    }}
                    onClick={() => setDropdownOpen((v) => !v)}
                    tabIndex={0}
                  >
                    {roomGuestLabel}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                      <svg width="16" height="16" fill="none" viewBox="0 0 20 20">
                        <path d="M6 8l4 4 4-4" stroke="#BDBDBD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </button>
                  {dropdownOpen && (
                    <div
                      className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg py-3 px-4 z-20 w-full min-w-[240px] max-w-[320px]"
                      style={{
                        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)",
                      }}
                      ref={dropdownPanelRef}
                    >
                      {/* Room */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">Room</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition disabled:opacity-50"
                            onClick={() => setRoom((r) => Math.max(minRoom, r - 1))}
                            disabled={room <= minRoom}
                            aria-label="Decrease room"
                          >
                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <circle cx="9" cy="9" r="8" stroke="#F47A1F" strokeWidth="1.5" fill="none"/>
                              <rect x="5" y="8.25" width="8" height="1.5" rx="0.75" fill="#F47A1F"/>
                            </svg>
                          </button>
                          <span className="w-5 text-center text-base text-gray-700">{room}</span>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition"
                            onClick={() => setRoom((r) => Math.min(maxRoom, r + 1))}
                            aria-label="Increase room"
                          >
                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <circle cx="9" cy="9" r="8" stroke="#F47A1F" strokeWidth="1.5" fill="none"/>
                              <rect x="8.25" y="5" width="1.5" height="8" rx="0.75" fill="#F47A1F"/>
                              <rect x="5" y="8.25" width="8" height="1.5" rx="0.75" fill="#F47A1F"/>
                            </svg>
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
                            onClick={() => setGuest((g) => Math.max(minGuest, g - 1))}
                            disabled={guest <= minGuest}
                            aria-label="Decrease guest"
                          >
                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <circle cx="9" cy="9" r="8" stroke="#F47A1F" strokeWidth="1.5" fill="none"/>
                              <rect x="5" y="8.25" width="8" height="1.5" rx="0.75" fill="#F47A1F"/>
                            </svg>
                          </button>
                          <span className="w-5 text-center text-base text-gray-700">{guest}</span>
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-orange-400 text-orange-400 hover:bg-orange-50 transition"
                            onClick={() => setGuest((g) => Math.min(maxGuest, g + 1))}
                            aria-label="Increase guest"
                          >
                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                              <circle cx="9" cy="9" r="8" stroke="#F47A1F" strokeWidth="1.5" fill="none"/>
                              <rect x="8.25" y="5" width="1.5" height="8" rx="0.75" fill="#F47A1F"/>
                              <rect x="5" y="8.25" width="8" height="1.5" rx="0.75" fill="#F47A1F"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Search Button */}
              <div
                className={`
                  searchbox-btn
                  flex flex-row
                  justify-center
                  items-center
                `}
                style={{
                  marginLeft: 0,
                  height: "48px",
                  alignSelf: "flex-end",
                }}
              >
                <button
                  type="submit"
                  className={`
                    bg-orange-500 text-white
                    border border-orange-500
                    rounded-lg text-sm font-semibold
                    hover:bg-orange-600 hover:border-orange-600 transition-colors
                    w-full
                    h-[48px]
                    focus:outline-none focus:ring-2 focus:ring-orange-400
                  `}
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
