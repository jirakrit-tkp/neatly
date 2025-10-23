import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ErrorIcon } from "@/components/customer/icons/ErrorIcon";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="relative">
      <input
        ref={ref}
        className={cn(
          // Base styles from design system
          "w-full h-[48px] pt-3 pr-4 pb-3 pl-3 border rounded",
          "bg-white border-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-orange-500",
          "transition-colors duration-200",

          // Typography from design system
          "text-base font-inter font-normal leading-6 tracking-normal",
          "text-black", // Text color เมื่อพิมพ์
          "placeholder:text-gray-600", // Placeholder text color

          // Error state
          error && "border-red focus:ring-red",

          // Custom className
          className
        )}
        {...props}
      />

      {/* Error Icon */}
      {error && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <ErrorIcon size={14} className="text-red" />
        </div>
      )}
    </div>
  )
);

Input.displayName = "Input";
