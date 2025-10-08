"use client";
import { useState } from "react";
import NonRefundModal from "@/components/ui/NonRefundModal";

export default function TestModalPage() {
  // สร้าง state เพื่อควบคุม modal
  const [openModal, setOpenModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      {/* ปุ่มทดสอบ */}
      <button
        onClick={() => setOpenModal(true)}
        className="px-6 py-3 rounded-md bg-orange-600 text-white font-semibold hover:brightness-110"
      >
        Open Non-Refund Modal
      </button>

      {/* เรียก Modal */}
      <NonRefundModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onConfirm={() => {
          alert("ยืนยันยกเลิก (ไม่คืนเงิน)");
          setOpenModal(false);
        }}
      />
    </div>
  );
}