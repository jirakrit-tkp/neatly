import React from "react";
import { BookingConfirmation } from "@/types/booking";
import { formatCurrency, formatDate } from "@/utils/bookingUtils";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  confirmation: BookingConfirmation;
  guests: number;
  paymentMethod: string;
  onViewBooking?: () => void;
  onNewBooking?: () => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  isOpen,
  onClose,
  confirmation,
  guests,
  paymentMethod,
  onViewBooking,
  onNewBooking,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[95vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 text-center bg-[var(--color-green-500)] text-white rounded-t-lg">
          <div className="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-white bg-opacity-20 rounded-full">
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold font-[var(--font-inter)]">
            Payment Successful!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[var(--color-green-100)] font-[var(--font-inter)]">
            Your booking has been confirmed
          </p>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Booking Details */}
          <div className="mb-4 sm:mb-6 space-y-4">
            <div className="mb-4 text-center">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--color-gray-900)] font-[var(--font-inter)]">
                Booking Confirmation
              </h3>
              <p className="text-xl sm:text-2xl font-bold text-[var(--color-green-600)] font-[var(--font-inter)]">
                #{confirmation.bookingId}
              </p>
            </div>

            <div className="p-3 sm:p-4 space-y-3 border rounded-lg bg-[var(--color-gray-50)]">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-[var(--color-gray-600)] font-[var(--font-inter)]">
                  Room:
                </span>
                <span className="font-medium font-[var(--font-inter)]">
                  {confirmation.roomType}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-[var(--color-gray-600)] font-[var(--font-inter)]">
                  Check-in:
                </span>
                <span className="font-medium font-[var(--font-inter)]">
                  {formatDate(confirmation.checkIn)}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-[var(--color-gray-600)] font-[var(--font-inter)]">
                  Check-out:
                </span>
                <span className="font-medium font-[var(--font-inter)]">
                  {formatDate(confirmation.checkOut)}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-[var(--color-gray-600)] font-[var(--font-inter)]">
                  Guests:
                </span>
                <span className="font-medium font-[var(--font-inter)]">
                  {guests}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-[var(--color-gray-600)] font-[var(--font-inter)]">
                  Total:
                </span>
                <span className="text-base sm:text-lg font-bold text-[var(--color-green-600)] font-[var(--font-inter)]">
                  {formatCurrency(confirmation.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-4 sm:mb-6">
            <h4 className="mb-2 text-sm sm:text-base font-medium text-[var(--color-gray-900)] font-[var(--font-inter)]">
              Payment Method
            </h4>
            <div className="p-3 border rounded-lg bg-[var(--color-gray-50)]">
              <p className="text-sm sm:text-base text-[var(--color-gray-700)] font-[var(--font-inter)]">
                {paymentMethod === "credit card" && "💳 Credit Card"}
                {paymentMethod === "cash" && "💵 Cash"}
              </p>
            </div>
          </div>

          {/* Next Steps */}
          <div className="mb-4 sm:mb-6">
            <h4 className="mb-3 text-sm sm:text-base font-medium text-[var(--color-gray-900)] font-[var(--font-inter)]">
              What&apos;s Next?
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-gray-600)] font-[var(--font-inter)]">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-[var(--color-green-500)] rounded-full"></span>
                <span>Confirmation email sent to your email address</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-[var(--color-green-500)] rounded-full"></span>
                <span>Check-in after 2:00 PM on your arrival date</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-2 h-2 mt-2 mr-3 bg-[var(--color-green-500)] rounded-full"></span>
                <span>Bring a valid ID for check-in</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {onViewBooking && (
              <button
                onClick={onViewBooking}
                className="w-full px-4 py-3 text-sm sm:text-base font-medium text-white transition-colors rounded-lg bg-[var(--color-orange-500)] hover:bg-[var(--color-orange-600)] font-[var(--font-inter)]"
              >
                View My Booking
              </button>
            )}

            {onNewBooking && (
              <button
                onClick={onNewBooking}
                className="w-full px-4 py-3 text-sm sm:text-base font-medium transition-colors rounded-lg bg-[var(--color-gray-100)] text-[var(--color-gray-700)] hover:bg-[var(--color-gray-200)] font-[var(--font-inter)]"
              >
                Make Another Booking
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm sm:text-base font-medium transition-colors rounded-lg text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] font-[var(--font-inter)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
