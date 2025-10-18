import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/router";

type PolicyState = {
  length: boolean;
  upper: boolean;
  digit: boolean;
  special: boolean;
};

const PASSWORD_POLICY = {
  minLen: 8,
  reUpper: /[A-Z]/,
  reDigit: /\d/,
  reSpecial: /[^A-Za-z0-9]/,
};

function checkPolicy(pw: string): PolicyState {
  const { minLen, reUpper, reDigit, reSpecial } = PASSWORD_POLICY;
  return {
    length: pw.length >= minLen,
    upper: reUpper.test(pw),
    digit: reDigit.test(pw),
    special: reSpecial.test(pw),
  };
}

function allPassed(p: PolicyState) {
  return p.length && p.upper && p.digit && p.special;
}

function policyErrorsText(p: PolicyState): string[] {
  const out: string[] = [];
  if (!p.length) out.push(`At least ${PASSWORD_POLICY.minLen} characters`);
  if (!p.upper) out.push("At least 1 uppercase letter");
  if (!p.digit) out.push("At least 1 number");
  if (!p.special) out.push("At least 1 special character");
  return out;
}

export default function UpdatePasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // เตรียม session จากลิงก์อีเมล 
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const code = params.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              if (mounted) setLinkError(error.message || "Invalid or expired reset link");
              return;
            }
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (mounted) setLinkError("Invalid or expired reset link. Please request a new one.");
          return;
        }

        if (mounted) setReady(true);
      } catch (e) {
        if (mounted) setLinkError((e as Error)?.message || "Something went wrong");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const policy = useMemo(() => checkPolicy(password), [password]);
  const policyErrors = useMemo(() => policyErrorsText(policy), [policy]);
  const confirmError =
    confirm.length > 0 && confirm !== password ? "Passwords do not match" : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    // ตรวจตามเงื่อนไข
    if (!allPassed(policy)) {
      setSubmitError("Password does not meet the requirements.");
      return;
    }
    if (confirm !== password) {
      setSubmitError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setSubmitError(updateErr.message || "Failed to update password");
        return;
      }
      setDone(true);
      setTimeout(() => router.replace("/customer/login"), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  // ถ้า link reset ไม่ถูกต้อง
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

  // กำลังเตรียม session
  if (!ready) {
    return <div className="text-gray-600">Preparing reset session...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ช่อง New Password */}
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
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a new password"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />

        {/* แสดงข้อความ error เงื่อนไขที่ไม่ผ่าน */}
        {password.length > 0 && policyErrors.length > 0 && (
          <div className="mt-1 text-sm text-red-500 space-y-0.5">
            {policyErrors.map((msg) => (
              <div key={msg}>{msg}</div>
            ))}
          </div>
        )}
      </div>

      {/* ช่อง Confirm Password */}
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
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter new password"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />
        {confirmError && (
          <p className="mt-1 text-sm text-red-500">{confirmError}</p>
        )}
      </div>

      {/* Error รวมตอนกด submit */}
      <p className={`text-sm h-5 mt-1 ${submitError ? "text-red-500" : "text-transparent"}`}>
        {submitError || "placeholder"}
      </p>

      {/* ปุ่ม + ข้อความสำเร็จ */}
      <div className="flex flex-col">
        <button
          type="submit"
          disabled={submitting || done}
          className="w-full md:w-[452px] h-[48px] mb-4 md:mb-[16px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold leading-[16px] px-8 cursor-pointer transition hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting ? "Updating..." : done ? "Updated!" : "Update Password"}
        </button>

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
