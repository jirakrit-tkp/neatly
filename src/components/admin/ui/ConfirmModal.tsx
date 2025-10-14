import { useEffect, useRef } from "react";

type ConfirmModalProps = {
  /** Controls visibility of the modal */
  open: boolean;

  /** Optional: Title text at the top */
  title?: string;

  /** Optional: Description or message */
  message?: string | React.ReactNode;

  /** Optional: Text for confirm button */
  confirmText?: string;

  /** Optional: Text for cancel button */
  cancelText?: string;

  /** Optional: Custom styling for confirm button (e.g. color) */
  confirmButtonClassName?: string;

  /** Optional: Custom styling for cancel button */
  cancelButtonClassName?: string;

  /** Handler when user confirms */
  onConfirm: () => void;

  /** Handler when user closes modal (either X or backdrop or cancel) */
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClassName = "border border-orange-500 text-orange-500 hover:bg-orange-50",
  cancelButtonClassName = "bg-orange-600 text-white hover:brightness-110",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  // Handle Escape key + focus
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
            className="font-inter font-semibold text-[20px] text-black"
          >
            {title}
          </h2>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-[16px] font-inter leading-[150%] text-gray-900">
            {message}
          </p>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              ref={confirmBtnRef}
              onClick={onConfirm}
              className={`inline-flex h-12 items-center justify-center rounded-md px-6 text-[16px] font-semibold focus-visible:ring-2 focus-visible:ring-orange-400 ${confirmButtonClassName}`}
            >
              {confirmText}
            </button>

            <button
              onClick={onClose}
              className={`inline-flex h-12 items-center justify-center rounded-md px-6 text-[16px] font-semibold focus-visible:ring-2 focus-visible:ring-orange-400 ${cancelButtonClassName}`}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
