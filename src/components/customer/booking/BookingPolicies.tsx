import React from "react";
import { BOOKING_POLICIES } from "@/constants/booking";

export const BookingPolicies: React.FC = () => {
  return (
    <div className="flex flex-col p-4 gap-5 rounded w-full h-fit bg-gray-300 md:w-[358px]">
      <div className="space-y-2 text-xs text-green-600 font-inter">
        <div className="flex items-start">
          <span className="flex-shrink-0 w-1 h-1 mt-2 mr-3 rounded-full bg-green-600"></span>
          <span>{BOOKING_POLICIES.refund_policy}</span>
        </div>
        <div className="flex items-start">
          <span className="flex-shrink-0 w-1 h-1 mt-2 mr-3 rounded-full bg-green-600"></span>
          <span>{BOOKING_POLICIES.change_policy}</span>
        </div>
      </div>
    </div>
  );
};
