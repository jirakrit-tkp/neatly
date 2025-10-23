import React from "react";

interface BookingLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  stepper?: React.ReactNode;
}

export const BookingLayout: React.FC<BookingLayoutProps> = ({
  children,
  sidebar,
  stepper,
}) => {
  return (
    <div className="w-full pt-[72px] md:pt-[48px] md:px-40 bg-bg">
      {/* Header */}
      <div className="px-6 md:px-0">
        <h1 className="text-[44px] md:text-[68px] font-noto font-medium leading-[125%] tracking-[-2%] text-green-800">
          Booking Room
        </h1>
      </div>

      {/* Stepper Container */}
      <div className="py-6 md:py-10">{stepper}</div>

      {/* Main Content - Form and Sidebar */}
      <div className="flex flex-col items-start gap-0 md:gap-8 lg:flex-row">
        {/* Left Panel - Form (Responsive Width) */}
        <div className="w-full lg:flex-shrink-0 lg:w-[740px]">{children}</div>

        {/* Right Panel - Sidebar (Responsive Width) */}
        <div className="w-full lg:w-auto lg:min-w-[358px]">{sidebar}</div>
      </div>
    </div>
  );
};
