import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

/** หาต้นทาง (base URL) ของเว็บ
 *  - ถ้าอยู่ฝั่งเบราว์เซอร์ ใช้ window.location.origin
 *  - ถ้าอยู่ฝั่ง server ให้ fallback จาก ENV (เช่น ตอน SSR / build)
 */
function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
}

export default function ForgotPasswordForm() {
  // เก็บค่าฟอร์มและสถานะการส่งคำขอ
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false); // กันกดซ้ำ/แสดง "Sending..."
  const [sent, setSent] = useState(false);             // แสดงผลลัพธ์ว่าอีเมลถูกส่งแล้ว
  const [error, setError] = useState<string | null>(null); // ข้อความ error ให้ผู้ใช้

  // ลิงก์ปลายทางที่ Supabase จะส่งผู้ใช้ไปหลังคลิกปุ่มในอีเมล (Reset Password)
  // เพื่อที่จะเรียก supabase.auth.updateUser() ต่อ
  const redirectTo = `${getBaseUrl()}/customer/update-password`;

  /** เมื่อกด Submit ฟอร์ม */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();   // กันรีเฟรชหน้า
    setError(null);

    // ตรวจรูปแบบอีเมลแบบง่าย ๆ (trim + regex)
    const trimmed = email.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!trimmed || !isEmail) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      // เรียก Supabase ให้ส่งลิงก์ Reset Password ไปยังอีเมล
      // redirectTo จะถูกแทนค่าเป็น {{ .ConfirmationURL }} ในอีเมลของ Supabase
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });

      // ถ้ามี error จากฝั่ง Supabase ให้แสดงข้อความ
      if (resetErr) {
        setError(resetErr.message || "Failed to send reset link");
        return;
      }

      // สำเร็จ: เปลี่ยนสถานะเพื่อเปลี่ยนปุ่ม/ข้อความแจ้งผู้ใช้
      setSent(true);
    } finally {
      // ไม่ว่าจะสำเร็จหรือไม่ ให้ปิดสถานะกำลังส่ง
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ช่องกรอกอีเมล + แถบ error ด้านล่าง */}
      <div className="mb-5 md:mb-[40px]">
        <label
          htmlFor="email"
          className="block mb-2 text-[15px] md:text-[16px] leading-[150%] text-gray-900"
        >
          Email
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)} // อัปเดต state ตามที่ผู้ใช้พิมพ์
          placeholder="Enter your email"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />

        {/* แสดง error ถ้ามี */}
        <p className={`text-sm h-5 mt-1 ${error ? "text-red-500 visible" : "invisible"}`}>
          {error || "placeholder"}
        </p>
      </div>

      <div className="flex flex-col">
        {/* ปุ่มส่งคำขอ: ปิดการกดเมื่อกำลังส่งหรือส่งสำเร็จแล้ว */}
        <button
          type="submit"
          disabled={submitting || sent}
          className="w-full md:w-[452px] h-[48px] mb-4 md:mb-[16px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold leading-[16px] px-8 cursor-pointer transition hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting ? "Sending..." : sent ? "Email Sent" : "Send reset link"}
        </button>

        {/* ข้อความแจ้งเมื่อส่งลิงก์สำเร็จ */}
        {sent && (
          <p className="mb-4 text-green-700">
            We’ve sent a password reset link to <b>{email}</b>. Please check your inbox (and spam).
          </p>
        )}

        {/* ลิงก์นำทางกลับไปหน้า Login */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-inter text-[15px] md:text-[16px] leading-[150%] tracking-[-0.02em] text-gray-700">
            Remember your password?
          </p>
          <Link
            href="/customer/login"
            className="font-semibold text-orange-500 text-[15px] md:text-[16px] hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </form>
  );
}