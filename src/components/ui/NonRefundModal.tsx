import { useEffect, useRef } from "react";

type NonRefundModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function NonRefundModal({
  open,
  onClose,
  onConfirm,
}: NonRefundModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* MODAL CONTAINER */}
      <div className="w-full max-w-[631px] rounded-[12px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 h-[56px]">
          <h2 className="font-inter font-semibold text-[20px] leading-[150%] tracking-[-2%] text-black">
            Cancel Booking
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none"
          >
            <span className="text-[22px] leading-none">×</span>
          </button>
        </div>

        {/* BODY */}
        <div className="px-6 py-[24px]">
          <div className="text-[16px] font-inter leading-[150%] tracking-[-2%] text-gray-900">
            <p>Cancellation of the booking now will not be able to request a refund.</p>
            <p>Are you sure you would like to cancel this booking?</p>
          </div>

          {/* BUTTONS */}
          <div className="mt-[24px] flex justify-end gap-[16px]">
            {/* ปุ่มซ้าย */}
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              type="button"
              className="cursor-pointer h-[48px] w-[221px] rounded-md border border-orange-500 text-orange-500 font-semibold text-[16px] hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              Yes, I want to cancel
            </button>

            {/* ปุ่มขวา */}
            <button
              onClick={onClose}
              type="button"
              className="cursor-pointer h-[48px] w-[208px] rounded-md bg-orange-600 text-white font-semibold text-[16px] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              No, Don’t Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}