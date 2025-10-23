import React from "react";
import { GuestInfo } from "@/types/booking";
import { BookingButtons } from "../BookingButtons";

interface BasicInfoFormProps {
  guestInfo: GuestInfo;
  onBack?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const COUNTRY_OPTIONS = [
  { value: "thailand", label: "Thailand" },
  { value: "singapore", label: "Singapore" },
  { value: "malaysia", label: "Malaysia" },
  { value: "indonesia", label: "Indonesia" },
  { value: "philippines", label: "Philippines" },
  { value: "vietnam", label: "Vietnam" },
  { value: "other", label: "Other" },
];

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  guestInfo,
  onBack,
  onNext,
  disabled = false,
  loading = false,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getCountryLabel = (countryCode: string) => {
    const country = COUNTRY_OPTIONS.find((c) => c.value === countryCode);
    return country ? country.label : countryCode;
  };

  return (
    <div className="w-full p-4 space-y-6 border rounded-lg bg-white border-gray-200 md:p-6 md:space-y-8 md:w-[740px] md:p-10">
      <h3 className="text-xl font-inter font-semibold leading-[150%] tracking-[-2%] text-gray-600 md:text-gray-800 pt-3">
        Basic Information
      </h3>

      <div className="space-y-4 md:space-y-6">
        {/* First Row - First Name & Last Name */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
              First name
            </label>
            <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
              {guestInfo.firstName}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
              Last name
            </label>
            <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
              {guestInfo.lastName}
            </div>
          </div>
        </div>

        {/* Second Row - Email */}
        <div className="space-y-2">
          <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
            Email
          </label>
          <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
            {guestInfo.email}
          </div>
        </div>

        {/* Third Row - Phone number */}
        <div className="space-y-2">
          <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
            Phone number
          </label>
          <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
            {guestInfo.phone}
          </div>
        </div>

        {/* Fourth Row - Date of Birth */}
        <div className="space-y-2">
          <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
            Date of Birth
          </label>
          <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
            {formatDate(guestInfo.dateOfBirth)}
          </div>
        </div>

        {/* Fifth Row - Country */}
        <div className="space-y-2">
          <label className="block text-base font-inter font-normal leading-[150%] tracking-normal text-gray-900">
            Country
          </label>
          <div className="flex items-center w-full h-[48px] px-3 py-3 border rounded bg-white border-gray-400 text-base font-inter font-normal leading-[150%] tracking-normal text-black">
            {getCountryLabel(guestInfo.country)}
          </div>
        </div>
      </div>

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
