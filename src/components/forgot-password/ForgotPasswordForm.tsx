// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import { supabase } from "@/lib/supabaseClient";
// import Link from "next/link";

// interface Errors {
//   username: string;
//   password: string;
// }

// export default function LoginForm() {
//   const router = useRouter();

//   const [username, setUsername] = useState<string>("");
//   const [password, setPassword] = useState<string>("");
//   const [errors, setErrors] = useState<Errors>({ username: "", password: "" });
//   const [submitting, setSubmitting] = useState(false);

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     const newErrors: Errors = { username: "", password: "" };

//     const trimmedUsername = username.trim();
//     const trimmedPassword = password.trim();

//     // validate
//     if (!trimmedUsername) {
//       newErrors.username = "Username or Email is required";
//     } else {
//       const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUsername);
//       if (!isEmail && trimmedUsername.length < 3) {
//         newErrors.username = "Username must be at least 3 characters";
//       }
//     }
//     if (!trimmedPassword) {
//       newErrors.password = "Password is required";
//     } else if (trimmedPassword.length < 6) {
//       newErrors.password = "Password must be at least 6 characters";
//     }

//     setErrors(newErrors);
//     if (newErrors.username || newErrors.password) return;

//     setSubmitting(true);

//     try {
//       // เป็นอีเมลอยู่แล้ว → ใช้อีเมลนั้น
//       const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUsername);
//       let emailToLogin = trimmedUsername;

//       // ถ้าเป็น username → เรียก RPC แปลงเป็น email (ไม่สนตัวพิมพ์ใหญ่เล็ก)
//       if (!isEmail) {
//         const { data: email, error } = await supabase
//           .rpc("get_email_by_username", { uname: trimmedUsername });

//         if (error || !email) {
//           setErrors({ username: "Username not found", password: "" });
//           return;
//         }
//         emailToLogin = email as string;
//       }

//       // ล็อกอินด้วยอีเมล + พาสเวิร์ด
//       const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
//         email: emailToLogin,
//         password: trimmedPassword,
//       });

//       if (authError) {
//         const msg =
//           authError.message === "Invalid login credentials"
//             ? "Invalid email/username or password"
//             : authError.message;
//         setErrors({ username: msg, password: "" });
//         return;
//       }

//       // After successful login, check role from profiles and redirect admins
//       const userId = authData?.user?.id;
//       if (userId) {
//         const { data: profile } = await supabase
//           .from("profiles")
//           .select("role")
//           .eq("id", userId)
//           .single();

//         if (profile?.role === "admin") {
//           router.replace("/admin");
//           return;
//         }
//       }

//       router.replace("/");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   // If already authenticated, redirect away from login page (prevents going back to login)
//   useEffect(() => {
//     let isMounted = true;
//     (async () => {
//       const { data } = await supabase.auth.getSession();
//       const userId = data.session?.user?.id;
//       if (!isMounted || !userId) return;

//       const { data: profile } = await supabase
//         .from("profiles")
//         .select("role")
//         .eq("id", userId)
//         .single();

//       if (profile?.role === "admin") {
//         router.replace("/admin");
//       } else {
//         router.replace("/");
//       }
//     })();
//     return () => {
//       isMounted = false;
//     };
//   }, [router]);

//   return (
//     <form onSubmit={handleSubmit}>
//       <div className="mb-5 md:mb-[40px]">
//         <label htmlFor="email" className="block mb-2 text-[15px] md:text-[16px] leading-[150%] text-gray-900">
//           Username or Email
//         </label>
//         <input
//           id="email"
//           type="text"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           placeholder="Enter your username or email"
//           className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
//         />
//         <p className={`text-sm h-5 mt-1 ${errors.username ? "text-red-500 visible" : "invisible"}`}>
//           {errors.username || "placeholder"}
//         </p>
//       </div>

//       <div className="mb-5 md:mb-[40px]">
//         <label htmlFor="password" className="block mb-2 text-[15px] md:text-[16px] leading-[150%] text-gray-900">
//           Password
//         </label>
//         <input
//           id="password"
//           type="password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           placeholder="Enter your password"
//           className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 focus:ring-2 focus:ring-green-100 transition"
//         />
//         <p className={`text-sm h-5 mt-1 ${errors.password ? "text-red-500 visible" : "invisible"}`}>
//           {errors.password || "placeholder"}
//         </p>
//       </div>

//       <div className="flex flex-col">
//         <button
//           type="submit"
//           disabled={submitting}
//           className="w-full md:w-[452px] h-[48px] mb-4 md:mb-[16px] rounded bg-orange-600 font-inter text-white text-[16px] font-semibold leading-[16px] px-8 cursor-pointer transition hover:bg-orange-700 disabled:opacity-60"
//         >
//           {submitting ? "Signing in..." : "Log In"}
//         </button>

//         <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
//           <p className="font-inter text-[15px] md:text-[16px] leading-[150%] tracking-[-0.02em] text-gray-700">
//             Don’t have an account yet?
//           </p>

//           <Link href="/customer/register" className="font-semibold text-orange-500 text-[15px] md:text-[16px] hover:underline">
//             Register
//           </Link>

//           <a href="#" className="w-full sm:w-auto ml-0 sm:ml-auto text-left sm:text-right mt-1 sm:mt-0 font-semibold text-orange-500 text-[15px] md:text-[16px] hover:underline">
//             Forgot Password?
//           </a>
//         </div>
//       </div>
//     </form>
//   );
// }

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const redirectTo = `${siteUrl}/auth/update-password`;

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
        redirectTo,
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
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full md:w-[452px] h-[48px] rounded border border-gray-300 bg-white pt-3 pr-4 pb-3 pl-3 text-[16px] outline-none placeholder:text-gray-500 focus:border-green-700 transition"
        />
        <p className={`text-sm h-5 mt-1 ${error ? "text-red-500 visible" : "invisible"}`}>
          {error || "placeholder"}
        </p>
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
            We’ve sent a password reset link to <b>{email}</b>. Please check your inbox (and
            spam).
          </p>
        )}

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