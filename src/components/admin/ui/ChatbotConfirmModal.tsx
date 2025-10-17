import { useRef } from "react";
import { ButtonShadcn as Button } from "@/components/ui/button-shadcn";

type ChatbotConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ChatbotConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
}: ChatbotConfirmModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  if (!open) return null;

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onMouseDown={onBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-[631px] max-w-full mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
        <hr className="border-gray-300 mb-4" />
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={onConfirm}
            variant="outline"
            className="cursor-pointer border-orange-500 text-orange-500 hover:bg-orange-50"
          >
            {confirmText}
          </Button>
          <Button
            onClick={onClose}
            className="bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
          >
            {cancelText}
          </Button>
        </div>
      </div>
    </div>
  );
}


