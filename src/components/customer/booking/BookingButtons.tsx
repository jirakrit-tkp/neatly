import React from "react";

interface BookingButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  onConfirm?: () => void;
  nextLabel?: string;
  showBack?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export const BookingButtons: React.FC<BookingButtonsProps> = ({
  onBack,
  onNext,
  onConfirm,
  nextLabel = "Next",
  showBack = true,
  disabled = false,
  loading = false,
}) => {
  return (
    <div className="flex justify-between mt-8">
      {/* Back Button */}
      {showBack && (
        <button
          onClick={onBack}
          className="flex items-center justify-center text-base font-semibold font-inter text-orange-500 transition-colors"
        >
          Back
        </button>
      )}

      {/* Next/Confirm Button */}
      <button
        onClick={onNext || onConfirm}
        disabled={disabled || loading}
        className={`flex items-center justify-center h-12 min-w-[101px] rounded px-8 py-4 text-base font-semibold font-inter transition-colors ${
          !onNext && onConfirm // If it's a confirm button, use orange-600
            ? disabled || loading
              ? "cursor-not-allowed bg-gray-300 text-gray-500"
              : "bg-orange-600 text-white hover:bg-orange-700"
            : disabled || loading
            ? "cursor-not-allowed bg-gray-300 text-gray-500"
            : "bg-orange-600 text-white hover:bg-orange-700"
        }`}
      >
        {loading ? "Loading..." : nextLabel}
      </button>
    </div>
  );
};
