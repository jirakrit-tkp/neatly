import React, { useState, useRef, useEffect } from "react";

// Helper functions
function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// CalendarPopup component
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
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startDate = new Date(year, month, 1 - daysToSubtract);

  const dates: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    dates.push(date);
  }

  function isCurrentMonth(d: Date) {
    return d.getMonth() === month;
  }

  function isSelected(d: Date) {
    return selectedDate && isSameDay(d, parseLocalYmd(selectedDate));
  }

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
      className="bg-white rounded-lg shadow-lg border border-gray-200 z-30"
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: "4px",
        minWidth: "320px",
      }}
    >
      <div className="p-4 select-none">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => handleMonthChange("prev")}
            className="p-2 hover:bg-orange-50 rounded-full transition-colors flex-shrink-0"
          >
            <svg
              width={20}
              height={20}
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
          <span className="text-lg font-semibold text-gray-900 px-2">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() => handleMonthChange("next")}
            className="p-2 hover:bg-orange-50 rounded-full transition-colors flex-shrink-0"
          >
            <svg
              width={20}
              height={20}
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
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
            <div
              key={idx}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
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
                  aspect-square min-h-[36px] text-sm rounded-lg flex items-center justify-center transition
                  ${
                    !isCurrentMonth(date) || disabled
                      ? "text-gray-300 bg-transparent cursor-not-allowed"
                      : "hover:bg-orange-50 text-gray-800 cursor-pointer"
                  }
                  ${
                    isSelected(date)
                      ? "bg-orange-500 text-white hover:bg-orange-600 font-semibold"
                      : ""
                  }
                  ${
                    isToday(date) && !isSelected(date)
                      ? "border-2 border-orange-400 font-semibold"
                      : ""
                  }
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

// DatePicker component
type DateInputProps = {
  id?: string;
  label?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
  min?: string;
  max?: string;
  required?: boolean;
};

export default function DatePicker({
  id = "date",
  label = "",
  value,
  onChange,
  className = "",
  min,
  max,
  required = false,
}: DateInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? parseLocalYmd(value) : new Date()
  );
  const calendarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const selectDate = (date: Date) => {
    const formatted = formatLocalYmd(date);
    if (onChange) {
      const syntheticEvent = {
        target: { value: formatted, id },
        currentTarget: { value: formatted, id },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const disabledDay = (date: Date): boolean => {
    const dateStr = formatLocalYmd(date);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const displayValue = value
    ? parseLocalYmd(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm hidden font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 flex items-center justify-between gap-2"
        >
          <span
            className={`flex-1 min-w-0 ${
              value ? "text-gray-800" : "text-gray-400"
            }`}
          >
            {displayValue || "Select date"}
          </span>
          <svg
            width={18}
            height={18}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="text-gray-400 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>

        {isOpen && (
          <CalendarPopup
            calendarRef={calendarRef}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            selectDate={selectDate}
            selectedDate={value}
            disabledDay={disabledDay}
          />
        )}
      </div>

      {/* Hidden input for form compatibility */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={value || ""}
        required={required}
      />
    </div>
  );
}

// Demo
function Demo() {
  const [date, setDate] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto mt-8">
        <h1 className="text-2xl font-bold mb-6">Custom DatePicker Demo</h1>

        <DatePicker
          id="demo-date"
          label="Select a date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min="2024-01-01"
          max="2025-12-31"
          required
          className="mb-4"
        />

        <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <p className="text-sm text-gray-600">
            Selected date:{" "}
            <strong className="text-gray-900">{date || "None"}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
