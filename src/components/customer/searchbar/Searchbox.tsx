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

  // Room/Guest limits
  const minRoom = 1;
  const maxRoom = 10;
  const minGuest = 1;
  const maxGuest = 20;

  // Room/Guest label
  const roomGuestLabel = `${room} room${room > 1 ? 's' : ''}, ${guest} guest${guest > 1 ? 's' : ''}`;

  // Date utility functions
  function parseLocalYmd(ymd: string): Date {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatLocalYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return startOfDay(date1).getTime() === startOfDay(date2).getTime();
  }

  function isToday(date: Date): boolean {
    return isSameDay(date, new Date());
  }

  function isPast(date: Date): boolean {
    return startOfDay(date) < startOfDay(new Date());
  }

  function isBefore(date1: Date, date2: Date): boolean {
    return startOfDay(date1) < startOfDay(date2);
  }

  // Calendar navigation
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

  return (
    <div className="flex items-center justify-center px-4 md:px-0 relative z-10">
      <style jsx>{`
        .searchbox-container {
          width: 343px;
          height: 396px;
          padding: 24px;
        }
        .searchbox-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }
        .searchbox-field {
          width: 100%;
        }
        .searchbox-separator {
          display: none;
        }
        .searchbox-button {
          width: 100%;
          height: 48px;
        }
        
        @media (min-width: 768px) {
          .searchbox-container {
            width: 1120px !important;
            height: 196px !important;
            padding: 20px !important;
          }
          .searchbox-form {
            flex-direction: row !important;
            gap: 16px !important;
            height: 100% !important;
            align-items: center !important;
            justify-content: center !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
          }
          .searchbox-field {
            width: 240px !important;
            height: 48px !important;
            margin-right: 0 !important;
            flex-shrink: 0 !important;
            min-width: 240px !important;
            max-width: 240px !important;
          }
          .searchbox-separator {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 16px !important;
            height: 48px !important;
            flex-shrink: 0 !important;
          }
          .searchbox-separator-line {
            width: 16px !important;
            height: 1px !important;
            background: #D1D5DB !important;
          }
          .searchbox-button {
            width: 144px !important;
            height: 48px !important;
            margin-left: 0 !important;
            flex-shrink: 0 !important;
            min-width: 144px !important;
            max-width: 144px !important;
          }
          .searchbox-field input,
          .searchbox-field button {
            width: 100% !important;
            height: 48px !important;
            min-width: 240px !important;
            max-width: 240px !important;
          }
          .searchbox-button {
            min-width: 144px !important;
            max-width: 144px !important;
            width: 144px !important;
          }
          .searchbox-field {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-end !important;
            align-items: flex-start !important;
          }
          .searchbox-field label {
            margin-bottom: 8px !important;
            line-height: 1 !important;
            font-size: 14px !important;
            color: #374151 !important;
            font-weight: 500 !important;
          }
        }
      `}</style>
      
      <div className="bg-white rounded-xl shadow-lg searchbox-container">
        <form
          className="searchbox-form"
          onSubmit={e => { 
            e.preventDefault(); 
            if (onSearch) {
              onSearch({ checkIn, checkOut, room: room.toString(), guests: guest.toString() });
            }
          }}
        >
          {/* Check In */}
          <div className="searchbox-field flex flex-col">
            <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkin">
              Check In
            </label>
            <div className="relative">
              <input
                id="checkin"
                type="text"
                className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                value={checkInDisplay}
                readOnly
                onClick={() => {
                  setCalendarOpen('checkin');
                  const ci = checkIn ? parseLocalYmd(checkIn) : new Date();
                  setCurrentMonth(new Date(ci.getFullYear(), ci.getMonth(), 1));
                  setSelectedDate(startOfDay(ci));
                }}
              />
              {calendarIcon}
              
              {/* Calendar Dropdown for Check In */}
              {calendarOpen === 'checkin' && (
                <div 
                  ref={calendarRef}
                  className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-30"
                  style={{
                    width: "240px",
                    height: "280px",
                    maxHeight: "280px",
                    overflow: "hidden",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                >
                  <div className="p-2 h-full flex flex-col">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button type="button"
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0 mb-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0 flex-1">
                      {(() => {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const startDate = new Date(firstDay);
                        // Adjust to start from Monday (0 = Sunday, 1 = Monday)
                        const dayOfWeek = firstDay.getDay();
                        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        startDate.setDate(startDate.getDate() - daysToSubtract);
                        
                        const dates = [];
                        for (let i = 0; i < 42; i++) {
                          const date = new Date(startDate);
                          date.setDate(startDate.getDate() + i);
                          dates.push(date);
                        }
                        
                        return dates.map((date, index) => {
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = selectedDate && isSameDay(date, selectedDate);
                          const isHovered = hoveredDate && isSameDay(date, hoveredDate);
                          const isTodayDate = isToday(date);
                          const isDisabled = isPast(date) || !isCurrentMonth;
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                if (!isDisabled) {
                                  setCheckIn(formatLocalYmd(date));
                                  setSelectedDate(startOfDay(date));
                                  setCalendarOpen(null);
                                }
                              }}
                              onMouseEnter={() => setHoveredDate(date)}
                              onMouseLeave={() => setHoveredDate(null)}
                              className={`
                                w-6 h-6 text-xs rounded-full transition-colors flex items-center justify-center
                                ${isDisabled 
                                  ? 'text-gray-300 bg-gray-100 cursor-not-allowed pointer-events-none' 
                                  : 'text-gray-700 hover:bg-orange-50 cursor-pointer'
                                }
                                ${isSelected 
                                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                  : isHovered && !isSelected
                                  ? 'bg-orange-100 text-orange-700'
                                  : isTodayDate && !isSelected
                                  ? 'bg-gray-100 text-gray-900'
                                  : ''
                                }
                              `}
                            >
                              {date.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="searchbox-separator">
            <div className="searchbox-separator-line"></div>
          </div>

          {/* Check Out */}
          <div className="searchbox-field flex flex-col">
            <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="checkout">
              Check Out
            </label>
            <div className="relative">
              <input
                id="checkout"
                type="text"
                className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer bg-white"
                value={checkOutDisplay}
                readOnly
                onClick={() => {
                  setCalendarOpen('checkout');
                  const co = checkOut ? parseLocalYmd(checkOut) : new Date();
                  setCurrentMonth(new Date(co.getFullYear(), co.getMonth(), 1));
                  setSelectedDate(startOfDay(co));
                }}
              />
              {calendarIcon}
              
              {/* Calendar Dropdown for Check Out */}
              {calendarOpen === 'checkout' && (
                <div 
                  ref={calendarRef}
                  className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-30"
                  style={{
                    width: "240px",
                    height: "280px",
                    maxHeight: "280px",
                    overflow: "hidden",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                  }}
                >
                  <div className="p-2 h-full flex flex-col">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </h3>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => navigateMonth('prev')}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button type="button"
                          onClick={() => navigateMonth('next')}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-0 mb-1">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0 flex-1">
                      {(() => {
                        const year = currentMonth.getFullYear();
                        const month = currentMonth.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const startDate = new Date(firstDay);
                        // Adjust to start from Monday (0 = Sunday, 1 = Monday)
                        const dayOfWeek = firstDay.getDay();
                        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        startDate.setDate(startDate.getDate() - daysToSubtract);
                        
                        const dates = [];
                        for (let i = 0; i < 42; i++) {
                          const date = new Date(startDate);
                          date.setDate(startDate.getDate() + i);
                          dates.push(date);
                        }
                        
                        return dates.map((date, index) => {
                          const isCurrentMonth = date.getMonth() === month;
                          const isSelected = selectedDate && isSameDay(date, selectedDate);
                          const isHovered = hoveredDate && isSameDay(date, hoveredDate);
                          const isTodayDate = isToday(date);
                          const checkInDate = parseLocalYmd(checkIn);
                          const isDisabled = isPast(date) || !isCurrentMonth || isBefore(date, checkInDate);
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                if (!isDisabled) {
                                  setCheckOut(formatLocalYmd(date));
                                  setSelectedDate(startOfDay(date));
                                  setCalendarOpen(null);
                                }
                              }}
                              onMouseEnter={() => setHoveredDate(date)}
                              onMouseLeave={() => setHoveredDate(null)}
                              className={`
                                w-6 h-6 text-xs rounded-full transition-colors flex items-center justify-center
                                ${isDisabled 
                                  ? 'text-gray-300 bg-gray-100 cursor-not-allowed pointer-events-none' 
                                  : 'text-gray-700 hover:bg-orange-50 cursor-pointer'
                                }
                                ${isSelected 
                                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                  : isHovered && !isSelected
                                  ? 'bg-orange-100 text-orange-700'
                                  : isTodayDate && !isSelected
                                  ? 'bg-gray-100 text-gray-900'
                                  : ''
                                }
                              `}
                            >
                              {date.getDate()}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rooms & Guests */}
          <div className="searchbox-field flex flex-col relative" ref={dropdownButtonRef}>
            <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="roomguest">
              Rooms & Guests
            </label>
            <div className="relative">
              <button
                id="roomguest"
                type="button"
                className="w-full h-12 border border-gray-300 rounded-lg px-3 pr-8 text-sm text-left bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 appearance-none flex items-center"
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
          <div className="searchbox-field flex flex-col">
            <label className="text-sm text-gray-700 mb-2 font-medium" htmlFor="search">
              &nbsp;
            </label>
            <button
              type="submit"
              className="searchbox-button bg-orange-500 text-white border border-orange-500 rounded-lg text-sm font-semibold hover:bg-orange-600 hover:border-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}