import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface WalletIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

export const WalletIcon = forwardRef<SVGSVGElement, WalletIconProps>(
  ({ size = 32, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 43 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-current", className)}
      {...props}
    >
      <path
        d="M1 13.2672L6.73896 6.81268C7.50622 5.94925 8.44768 5.25815 9.50135 4.78487C10.555 4.3116 11.697 4.06691 12.8521 4.06689H13.2671M1 30.6456H12.2449L20.4229 24.5121C20.4229 24.5121 22.079 23.3937 24.512 21.4453C29.6233 17.3563 24.512 10.8833 19.4007 14.2895C15.238 17.0639 11.2226 19.4008 11.2226 19.4008"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2676 18.3784V5.08904C13.2676 4.00456 13.6984 2.96449 14.4652 2.19765C15.2321 1.43081 16.2721 1 17.3566 1H37.8018C38.8863 1 39.9263 1.43081 40.6932 2.19765C41.46 2.96449 41.8908 4.00456 41.8908 5.08904V17.3561C41.8908 18.4406 41.46 19.4807 40.6932 20.2475C39.9263 21.0144 38.8863 21.4452 37.8018 21.4452H24.5124"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M36.7796 11.2433L36.8 11.2208M18.3789 11.2433L18.3994 11.2208M27.5792 15.3119C26.4948 15.3119 25.4547 14.8811 24.6879 14.1142C23.921 13.3474 23.4902 12.3073 23.4902 11.2228C23.4902 10.1383 23.921 9.09828 24.6879 8.33144C25.4547 7.5646 26.4948 7.13379 27.5792 7.13379C28.6637 7.13379 29.7038 7.5646 30.4706 8.33144C31.2375 9.09828 31.6683 10.1383 31.6683 11.2228C31.6683 12.3073 31.2375 13.3474 30.4706 14.1142C29.7038 14.8811 28.6637 15.3119 27.5792 15.3119Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
);

WalletIcon.displayName = "WalletIcon";
