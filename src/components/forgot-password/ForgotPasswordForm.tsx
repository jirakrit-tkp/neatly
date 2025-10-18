import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

function getBaseUrl() {
  // ใช้ค่า runtime ก่อน (หน้า client-side)
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  // fallback จาก ENV 
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
}

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${getBaseUrl()}/customer/update-password`;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!trimmed || !isEmail) {
      setError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo, // จะกลายเป็น {{ .ConfirmationURL }} ในอีเมล
      });
      if (resetErr) {
        setError(resetErr.message || "Failed to send reset link");
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ฟิลด์อีเมล + ปุ่ม */}
      <div className="mb-5 md:mb-[40px]">
        <label htmlFor="email" className="block mb-2 text-[15px] md:text-[16px] leading-[150%] text-gray-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />
        <p className={`text-sm h-5 mt-1 ${error ? "text-red-500 visible" : "invisible"}`}>{error || "placeholder"}</p>
      </div>

      <div className="flex flex-col">
        <button
          type="submit"
          disabled={submitting || sent}
          className="w-full md:w-[452px] h-[48px] mb-4 md:mb-[16px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold leading-[16px] px-8 cursor-pointer transition hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting ? "Sending..." : sent ? "Email Sent" : "Send reset link"}
        </button>

        {sent && (
          <p className="mb-4 text-green-700">
            We’ve sent a password reset link to <b>{email}</b>. Please check your inbox (and spam).
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-inter text-[15px] md:text-[16px] leading-[150%] tracking-[-0.02em] text-gray-700">
            Remember your password?
          </p>
          <Link href="/customer/login" className="font-semibold text-orange-500 text-[15px] md:text-[16px] hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </form>
  );
}