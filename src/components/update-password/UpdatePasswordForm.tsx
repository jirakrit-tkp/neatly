import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/router";

/* ---------- โครงสร้างตรวจนโยบายรหัสผ่าน ---------- */
type PolicyState = {
  length: boolean; // ความยาว >= 8 ตัว
  upper: boolean;  // มีตัวอักษรพิมพ์ใหญ่
  digit: boolean;  // มีตัวเลข
  special: boolean; // มีอักขระพิเศษ
};

/* ---------- กำหนดกฎเงื่อนไขรหัสผ่าน ---------- */
const PASSWORD_POLICY = {
  minLen: 8,
  reUpper: /[A-Z]/,
  reDigit: /\d/,
  reSpecial: /[^A-Za-z0-9]/,
};

/* ---------- ตรวจสอบรหัสผ่านว่าผ่านกี่เงื่อนไข ---------- */
function checkPolicy(pw: string): PolicyState {
  const { minLen, reUpper, reDigit, reSpecial } = PASSWORD_POLICY;
  return {
    length: pw.length >= minLen,
    upper: reUpper.test(pw),
    digit: reDigit.test(pw),
    special: reSpecial.test(pw),
  };
}

/* ---------- ตรวจว่าทุกเงื่อนไขผ่านครบไหม ---------- */
function allPassed(p: PolicyState) {
  return p.length && p.upper && p.digit && p.special;
}

/* ---------- สร้างข้อความ error เงื่อนไขที่ไม่ผ่าน ---------- */
function policyErrorsText(p: PolicyState): string[] {
  const out: string[] = [];
  if (!p.length) out.push(`At least ${PASSWORD_POLICY.minLen} characters`);
  if (!p.upper) out.push("At least 1 uppercase letter");
  if (!p.digit) out.push("At least 1 number");
  if (!p.special) out.push("At least 1 special character");
  return out;
}

/* ---------- Component หลัก ---------- */
export default function UpdatePasswordForm() {
  const router = useRouter();

  // state ฟอร์ม
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // state สำหรับตรวจสอบ session จากลิงก์อีเมล
  const [ready, setReady] = useState(false); // พร้อมใช้งานไหม
  const [linkError, setLinkError] = useState<string | null>(null); // error จากลิงก์อีเมลไม่ถูกต้อง
  const [submitError, setSubmitError] = useState<string | null>(null); // error จากการ submit

  /* ---------- ดึง session จากลิงก์รีเซ็ตรหัสในอีเมล ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          // เอา query param ชื่อ code จาก URL (Supabase จะส่งมา)
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");

          // ถ้ามี code จะแลก code เป็น session ใหม่
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              if (mounted) setLinkError(error.message || "Invalid or expired reset link");
              return;
            }
          }
        }

        // ตรวจว่ามี session ที่ active หรือไม่
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (mounted)
            setLinkError("Invalid or expired reset link. Please request a new one.");
          return;
        }

        // พร้อมใช้งาน
        if (mounted) setReady(true);
      } catch (e) {
        if (mounted)
          setLinkError((e as Error)?.message || "Something went wrong");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- ใช้ useMemo เพื่อคำนวณเงื่อนไขใหม่เมื่อพิมพ์รหัส ---------- */
  const policy = useMemo(() => checkPolicy(password), [password]);
  const policyErrors = useMemo(() => policyErrorsText(policy), [policy]);

  // ถ้ารหัสยืนยันไม่ตรงกับช่องหลัก
  const confirmError =
    confirm.length > 0 && confirm !== password ? "Passwords do not match" : null;

  /* ---------- ฟังก์ชันกด Submit เพื่ออัปเดตรหัส ---------- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    // ถ้ารหัสไม่ผ่านกฎ > แสดง error
    if (!allPassed(policy)) {
      setSubmitError("Password does not meet the requirements.");
      return;
    }

    // ถ้ารหัสยืนยันไม่ตรง
    if (confirm !== password) {
      setSubmitError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      // เรียก Supabase API เพื่ออัปเดตรหัสผ่านของผู้ใช้ปัจจุบัน
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setSubmitError(updateErr.message || "Failed to update password");
        return;
      }

      // สำเร็จ > แสดงข้อความและ redirect กลับหน้า login
      setDone(true);
      setTimeout(() => router.replace("/customer/login"), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- แสดง error ถ้าลิงก์ reset หมดอายุหรือไม่ถูกต้อง ---------- */
  if (linkError && !ready) {
    return (
      <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
        {linkError}
        <div className="mt-3">
          <Link href="/customer/forgot-password" className="text-orange-600 underline">
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  /* ---------- Loading state ระหว่างเตรียม session ---------- */
  if (!ready) {
    return <div className="text-gray-600">Preparing reset session...</div>;
  }

  /* ---------- ฟอร์มหลัก ---------- */
  return (
    <form onSubmit={handleSubmit}>
      {/* ช่องกรอกรหัสใหม่ */}
      <div className="mb-5 md:mb-[24px]">
        <label
          htmlFor="password"
          className="block mb-2 text-[15px] md:text-[16px] text-gray-900"
        >
          New Password
        </label>

        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)} // อัปเดตรหัสผ่านเมื่อพิมพ์
          placeholder="Enter a new password"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />

        {/* แสดง error เงื่อนไขที่ไม่ผ่าน */}
        {password.length > 0 && policyErrors.length > 0 && (
          <div className="mt-1 text-sm text-red-500 space-y-0.5">
            {policyErrors.map((msg) => (
              <div key={msg}>{msg}</div>
            ))}
          </div>
        )}
      </div>

      {/* ช่องยืนยันรหัส */}
      <div className="mb-5 md:mb-[24px]">
        <label
          htmlFor="confirm"
          className="block mb-2 text-[15px] md:text-[16px] text-gray-900"
        >
          Confirm Password
        </label>

        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)} // อัปเดตค่าช่อง confirm
          placeholder="Re-enter new password"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />

        {/* ถ้ารหัสไม่ตรงกันให้แสดงข้อความ */}
        {confirmError && (
          <p className="mt-1 text-sm text-red-500">{confirmError}</p>
        )}
      </div>

      {/* Error รวม (ตอนกด Submit) */}
      <p
        className={`text-sm h-5 mt-1 ${
          submitError ? "text-red-500" : "text-transparent"
        }`}
      >
        {submitError || "placeholder"}
      </p>

      {/* ปุ่ม Update และสถานะหลังอัปเดตสำเร็จ */}
      <div className="flex flex-col">
        <button
          type="submit"
          disabled={submitting || done}
          className="w-full md:w-[452px] h-[48px] mb-4 md:mb-[16px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold leading-[16px] px-8 cursor-pointer transition hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting ? "Updating..." : done ? "Updated!" : "Update Password"}
        </button>

        {/* ข้อความแจ้งเมื่อเปลี่ยนรหัสผ่านสำเร็จ */}
        {done && (
          <p className="mb-4 text-green-700">
            ✅ Password has been updated. Redirecting to login...
          </p>
        )}

        {/* ลิงก์กลับหน้า Login */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-inter text-[15px] md:text-[16px] leading-[150%] tracking-[-0.02em] text-gray-700">
            Back to
          </p>
          <Link
            href="/customer/login"
            className="font-semibold text-orange-500 text-[15px] md:text-[16px] hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </form>
  );
}