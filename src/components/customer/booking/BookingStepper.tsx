import React from "react";
import { BookingStep } from "@/types/booking";

interface BookingStepperProps {
  currentStep: BookingStep;
  steps: {
    id: BookingStep;
    label: string;
    number: number;
  }[];
}

export const BookingStepper: React.FC<BookingStepperProps> = ({
  currentStep,
  steps,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-start mb-4 md:mb-8 pl-6 md:p-0">
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-8">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted =
            steps.findIndex((s) => s.id === currentStep) > index;
          const isInactive = !isActive && !isCompleted;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-row items-center gap-2 md:gap-[10px] py-2">
                <div
                  className={`w-[66px] h-[50px] md:h-[66px] rounded flex items-center justify-center text-[28px] font-inter font-semibold leading-[150%] tracking-[-2%] ${
                    isActive
                      ? "bg-orange-500 text-white" // Active: ส้มเข้ม ตัวเลขขาว
                      : isCompleted
                      ? "bg-orange-100 text-orange-500" // Completed: ส้มอ่อน ตัวเลขส้ม
                      : "bg-gray-200 text-gray-600" // Inactive: เทา ตัวเลขเทา
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`font-inter text-left text-[20px] font-semibold leading-[150%] tracking-[-2%] ${
                    isActive
                      ? "text-orange-500" // Active: ข้อความส้ม
                      : isCompleted
                      ? "text-gray-900" // Completed: ข้อความเทาเข้ม
                      : "text-gray-600" // Inactive: ข้อความเทา
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
