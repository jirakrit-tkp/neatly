import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CreditCardIconProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * CreditCardIcon – 29×22 (ตาม Figma)
 */
export const CreditCardIcon = forwardRef<SVGSVGElement, CreditCardIconProps>(
  ({ width = 29, height = 22, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox="0 0 29 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current", className)}
      {...props}
    >
      <path
        d="M1.5 6H27.5M1.5 7H27.5M5.5 14H13.5M5.5 17H9.5M4.5 21H24.5C25.2957 21 26.0587 20.6839 26.6213 20.1213C27.1839 19.5587 27.5 18.7956 27.5 18V4C27.5 3.20435 27.1839 2.44129 26.6213 1.87868C26.0587 1.31607 25.2957 1 24.5 1H4.5C3.70435 1 2.94129 1.31607 2.37868 1.87868C1.81607 2.44129 1.5 3.20435 1.5 4V18C1.5 18.7956 1.81607 19.5587 2.37868 20.1213C2.94129 20.6839 3.70435 21 4.5 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
);

CreditCardIcon.displayName = "CreditCardIcon";
