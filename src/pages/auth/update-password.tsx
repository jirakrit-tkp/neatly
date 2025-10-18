import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Layout from "@/components/Layout";
import { useRouter } from "next/router";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) {
        setError(upErr.message || "Failed to update password");
        return;
      }
      setDone(true);
      // ส่งกลับหน้า login สักครู่
      setTimeout(() => router.replace("/customer/login"), 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-[1120px] mx-auto md:px-6 pb-10 pt-[80px] sm:pt-[96px] md:pt-12">
        <h1 className="text-[32px] sm:text-[40px] md:text-[48px] px-5 font-noto font-medium text-green-700 mb-6">
          Set a New Password
        </h1>

        <form onSubmit={handleSubmit} className="px-5">
          <div className="mb-5 md:mb-[24px]">
            <label htmlFor="new-password" className="block mb-2 text-[15px] md:text-[16px] text-gray-900">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a new password"
              className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
            />
          </div>

          <div className="mb-5 md:mb-[24px]">
            <label htmlFor="confirm-password" className="block mb-2 text-[15px] md:text-[16px] text-gray-900">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter the new password"
              className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
            />
          </div>

          <p className={`text-sm h-5 mt-1 ${error ? "text-red-500" : "text-transparent"}`}>{error || "placeholder"}</p>

          <button
            type="submit"
            disabled={submitting || done}
            className="mt-4 w-full md:w-[452px] h-[48px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold px-8 transition hover:bg-orange-700 disabled:opacity-60"
          >
            {submitting ? "Updating..." : done ? "Updated" : "Update Password"}
          </button>
        </form>
      </main>
    </Layout>
  );
}