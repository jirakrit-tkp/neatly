import React from "react";
import { SpecialRequest } from "@/types/booking";
import { SPECIAL_REQUESTS } from "@/constants/booking";
import { formatCurrency } from "@/utils/bookingUtils";
import { BookingButtons } from "../BookingButtons";

interface SpecialRequestFormProps {
  specialRequests: SpecialRequest[];
  onSpecialRequestsChange: (requests: SpecialRequest[]) => void;
  additionalRequest: string;
  onAdditionalRequestChange: (request: string) => void;
  onBack?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const SpecialRequestForm: React.FC<SpecialRequestFormProps> = ({
  specialRequests,
  onSpecialRequestsChange,
  additionalRequest,
  onAdditionalRequestChange,
  onBack,
  onNext,
  disabled = false,
  loading = false,
}) => {
  const handleRequestToggle = (requestId: string) => {
    const updatedRequests = specialRequests.map((request) =>
      request.id === requestId
        ? { ...request, selected: !request.selected }
        : request
    );
    onSpecialRequestsChange(updatedRequests);
  };

  const selectedRequests = specialRequests.filter((req) => req.selected);
  const totalSpecialRequestsPrice = selectedRequests.reduce(
    (sum, req) => sum + (req.price || 0),
    0
  );

  return (
    <div className="w-full p-6 space-y-8 border rounded md:w-[740px] md:p-10 bg-white border-gray-300">
      {/* Standard Requests Section */}
      <div className="mb-8">
        <h2 className="text-xl text-gray-800 font-semibold font-inter leading-normal tracking-tight">
          Standard Request
        </h2>
        <p className="mb-6 text-sm text-gray-600 font-medium font-inter leading-normal tracking-tight">
          These requests are not confirmed (Depend on the available room)
        </p>

        <div className="space-y-6">
          {SPECIAL_REQUESTS.filter((req) => req.type === "standard").map(
            (request) => {
              const isSelected =
                specialRequests.find((req) => req.id === request.id)
                  ?.selected || false;

              return (
                <div
                  key={request.id}
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={() => handleRequestToggle(request.id)}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex items-center justify-center w-6 h-6 border-2 rounded transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500"
                        : "border-gray-300 hover:border-orange-500"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Label */}
                  <span className="text-base text-gray-700 font-normal font-inter leading-normal tracking-normal">
                    {request.name}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Special Requests Section */}
      <div className="mb-8">
        <h2 className="text-xl text-gray-800 font-semibold font-inter leading-normal tracking-tight">
          Special Request
        </h2>
        <p className="mb-6 text-sm text-gray-600 font-medium font-inter leading-normal tracking-tight">
          Additional charge may apply
        </p>

        <div className="space-y-6">
          {SPECIAL_REQUESTS.filter((req) => req.type === "special").map(
            (request) => {
              const isSelected =
                specialRequests.find((req) => req.id === request.id)
                  ?.selected || false;

              return (
                <div
                  key={request.id}
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={() => handleRequestToggle(request.id)}
                >
                  {/* Checkbox */}
                  <div
                    className={`flex items-center justify-center w-6 h-6 border-2 rounded transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-500"
                        : "border-gray-300 hover:border-orange-500"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Label with Price */}
                  <div className="flex-1">
                    <span className="text-base text-gray-700 font-normal font-inter leading-normal tracking-normal">
                      {request.name}
                    </span>
                    <span className="ml-1 text-base text-gray-700 font-normal font-inter leading-normal tracking-normal">
                      (+{formatCurrency(request.price || 0)})
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Selected Requests Summary */}
      {/* {selectedRequests.length > 0 && (
        <div className="p-4 mb-6 border rounded-lg bg-gray-50">
          <h3 className="mb-3 text-gray-900 font-medium font-inter">
            Selected Requests
          </h3>
          <div className="space-y-2">
            {selectedRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between text-sm font-inter"
              >
                <span className="text-gray-700">{request.name}</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(request.price || 0)}
                </span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-200">
              <div className="flex items-center justify-between text-gray-900 font-medium font-inter">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">
                  {formatCurrency(totalSpecialRequestsPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Additional Request */}
      <div>
        <label className="block mb-2 text-sm text-gray-700 font-medium font-inter">
          Additional Request
        </label>
        <textarea
          value={additionalRequest}
          onChange={(e) => onAdditionalRequestChange(e.target.value)}
          rows={4}
          className="w-full pr-4 pl-3 py-3 border border-gray-300 rounded font-inter focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
        />
      </div>

      {/* Skip Button */}
      {/* <div className="mt-6 text-center">
        <button
          onClick={() => {
            // Clear all selections and additional request
            const clearedRequests = specialRequests.map((req) => ({
              ...req,
              selected: false,
            }));
            onSpecialRequestsChange(clearedRequests);
            onAdditionalRequestChange("");
          }}
          className="text-sm text-orange-500 font-medium font-inter underline transition-colors hover:text-orange-600"
        >
          Skip Special Requests
        </button>
      </div> */}

      {/* BookingButtons - Desktop Only */}
      <div className="hidden md:block">
        <BookingButtons
          onBack={onBack}
          onNext={onNext}
          nextLabel="Next"
          showBack={true}
          disabled={disabled}
          loading={loading}
        />
      </div>
    </div>
  );
};
