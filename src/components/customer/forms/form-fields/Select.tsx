import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ErrorIcon } from "@/components/customer/icons/ErrorIcon";
import {
  Select as RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectProps {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      className,
      error,
      options,
      placeholder,
      value,
      onValueChange,
      disabled,
      ...props
    },
    ref
  ) => (
    <div className="relative">
      <RadixSelect
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          ref={ref}
          className={cn(
            // Base styles from design system
            "w-full h-12 pt-3 pr-4 pb-3 pl-3 border rounded",
            "bg-white border-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500",
            "transition-colors duration-200",

            // Typography from design system
            "font-inter text-base font-normal leading-6 tracking-normal",
            "text-gray-900", // Text color เมื่อเลือก
            "data-[placeholder]:text-gray-600", // Placeholder สีเทากลาง

            // Error state
            error && "border-red focus:ring-red focus:border-red",

            // Disabled state
            disabled &&
              "bg-gray-200 border-gray-400 text-gray-600 cursor-not-allowed",

            // Override Radix UI default styles
            "!h-12 !py-0", // Force height และ reset padding

            // ซ่อน Radix UI dropdown arrow เมื่อมี error
            error && "[&>svg]:hidden",

            // Custom className
            className
          )}
          {...props}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent className="bg-white border border-gray-400 rounded shadow-lg">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="font-inter text-base font-normal leading-[150%] tracking-[0%] text-[#646D89] hover:bg-gray-100 focus:bg-gray-100 px-3 py-2 cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </RadixSelect>

      {/* Error Icon - แสดงเฉพาะเมื่อมี error */}
      {error && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <ErrorIcon size={14} className="text-red" />
        </div>
      )}
    </div>
  )
);

Select.displayName = "Select";
