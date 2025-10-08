import { useEffect, useRef } from "react";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title = "Cancel Booking",
  message = "Are you sure you would like to cancel this booking?",
  confirmText = "Yes, I want to cancel and request refund",
  cancelText = "No, Don’t Cancel",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 0);
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
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-[631px] rounded-[12px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
          <h2
            id="confirm-modal-title"
            className="font-inter font-semibold text-[20px] leading-[150%] tracking-[-2%] text-black"
          >
            {title}
          </h2>

          {/* Close button */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <span className="text-[20px] leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-[16px] font-inter leading-[150%] tracking-[-2%] text-gray-900">
            {message}
          </p>

          {/* Buttons row */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              ref={confirmBtnRef}
              type="button"
              onClick={onConfirm}
              className="
                inline-flex h-12 items-center justify-center
                rounded-md border border-orange-500
                px-6 text-[16px] font-semibold text-orange-500
                hover:bg-orange-50 font-inter
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
                cursor-pointer
              "
            >
              {confirmText}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="
                inline-flex h-12 items-center justify-center
                rounded-md bg-orange-600 px-6
                text-[16px] font-semibold text-white
                hover:brightness-110
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
                min-w-[200px]
                cursor-pointer
              "
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}