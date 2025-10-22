/**
 * Navbar.tsx
 *
 * คอมโพเนนต์ Navbar สำหรับ Next.js (Client Component)
 *
 * - รองรับ Responsive: Desktop (1440x100) และ Mobile (375x48)
 * - Desktop: แสดงโลโก้, เมนูนำทาง, ปุ่ม Login หรือ User Menu
 * - Mobile: แสดงโลโก้, Hamburger menu, เมนูเลื่อนออกด้านข้าง
 * - ใช้ Supabase สำหรับจัดการสถานะผู้ใช้ (login/logout, ดึงข้อมูลโปรไฟล์)
 * - ใช้ TailwindCSS สำหรับ styling
 * - สามารถปรับ navItems, loginLabel, logo ได้ผ่าน props
 */

"use client"; // บอก Next.js ว่าคอมโพเนนต์นี้รันฝั่ง client

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// ประเภทของเมนูนำทางแต่ละอัน
type NavItem = {
  label: string;
  path: string;
};

// ประเภทของ props ที่ Navbar รับได้
type NavbarProps = {
  navItems?: NavItem[];
  loginLabel?: string;
  logo?: React.ReactNode;
};

// เมนูนำทางเริ่มต้น (scroll ไป section ตาม id)
const defaultNavItems: NavItem[] = [
  { label: "About Neatly", path: "#about" },
  { label: "Service & Facilities", path: "#services" },
  { label: "Rooms & Suits", path: "#rooms" },
];

// โลโก้เริ่มต้น (ใช้ไฟล์ public/logo.png)
const defaultLogo = (
  <div className="flex items-center space-x-2">
    <Image
      src="/logo.png"
      alt="Neatly Logo"
      width={100}
      height={100}
      className="object-contain"
      priority
    />
  </div>
);

/**
 * ฟังก์ชันดึงข้อมูลโปรไฟล์ผู้ใช้ (username, avatar)
 * - ถ้าไม่มี username หรือรูป ให้ fallback เป็น email และรูป default
 */
async function fetchProfileInfo(user: { id: string; email: string | null }) {
  const fallbackName = user.email ?? ""; // ถ้าไม่มี username ใช้อีเมลแทน
  const fallbackAvatar = "/Images/avatar.png"; // รูป default

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, profile_image")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return { displayName: fallbackName, avatarUrl: fallbackAvatar };

    const username = (data?.username ?? "").toString().trim();
    const profileImage = (data?.profile_image ?? "").toString().trim();

    return {
      displayName: username || fallbackName,
      avatarUrl: profileImage || fallbackAvatar,
    };
  } catch {
    return { displayName: fallbackName, avatarUrl: fallbackAvatar };
  }
}

/**
 * UserMenu
 * - แสดงปุ่ม Login ถ้ายังไม่ได้ล็อกอิน
 * - แสดงชื่อผู้ใช้ (username/email) + รูป avatar + dropdown เมนู ถ้าล็อกอินแล้ว
 * - ใช้ supabase ตรวจสอบสถานะผู้ใช้และ logout
 */
function UserMenu() {
  const [user, setUser] = useState<null | { id: string; email: string | null }>(
    null
  );
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("/Images/avatar.png");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // โหลดสถานะผู้ใช้และ subscribe การเปลี่ยนแปลง auth
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data?.user
        ? { id: data.user.id, email: (data.user.email as string) ?? null }
        : null;
      setUser(u);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: (session.user.email as string) ?? null }
        : null;
      setUser(u);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // โหลดชื่อและรูปโปรไฟล์
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setDisplayName("");
          setAvatarUrl("/Images/avatar.png");
        }
        return;
      }
      const { displayName, avatarUrl } = await fetchProfileInfo(user);
      if (!cancelled) {
        setDisplayName(displayName);
        setAvatarUrl(avatarUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  // ปิด dropdown ถ้าคลิกนอกเมนู
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // ฟังก์ชัน logout
  const handleLogout = async () => {
    try {
      setOpen(false);
      await supabase.auth.signOut();
    } finally {
      // redirect ไปหน้า http://localhost:3000/ หลัง logout
      window.location.replace("/");
    }
  };

  if (loading) {
    return <span className="text-gray-400 text-sm">Loading...</span>;
  }

  if (!user) {
    // ยังไม่ล็อกอิน
    return (
      <Link
        href="/customer/login"
        className="text-[#F47A1F] text-sm font-semibold hover:underline"
      >
        Log in
      </Link>
    );
  }

  // ล็อกอินแล้ว
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-[#F47A1F] w-6-sm font-semibold hover:underline"
      >
        <Image
          width={800}
          height={600}
          src={avatarUrl}
          className="w-7 h-7 rounded-full object-cover"
          alt="User avatar"
        />
        <span className="hidden md:inline">{displayName}</span>
        <svg
          className="w-3 h-3"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.146l3.71-3.916a.75.75 0 111.08 1.04l-4.24 4.48a.75.75 0 01-1.08 0l-4.24-4.48a.75.75 0 01.02-1.06z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border bg-white shadow-md z-50">
          <Link
            href="/customer/profile"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            Account
          </Link>
          <Link
            href="/customer/settings"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            Settings
          </Link>
          <Link
            href="/customer/booking-history"
            className="block px-4 py-2 hover:bg-gray-50"
          >
            Booking History
          </Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * MobileUserMenu
 * - แสดงข้อมูลผู้ใช้และเมนูต่าง ๆ สำหรับ mobile drawer เมื่อ login แล้ว
 */
function MobileUserMenu({
  user,
  onLogout,
}: {
  user: { id: string; email: string | null };
  onLogout: () => void;
}) {
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("/Images/avatar.png");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        if (!cancelled) {
          setName("");
          setAvatar("/Images/avatar.png");
        }
        return;
      }
      const { displayName, avatarUrl } = await fetchProfileInfo(user);
      if (!cancelled) {
        setName(displayName);
        setAvatar(avatarUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-3 px-2 pt-4 pb-2">
        <Image
          width={800}
          height={600}
          src={avatar}
          alt="User avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
        <span className="font-medium text-[#222] text-sm">{name}</span>
      </div>
      <hr className="my-2 border-t border-gray-200" />
      <nav className="flex flex-col gap-2">
        <Link
          href="/customer/profile"
          className="flex items-center gap-2 px-2 py-2 text-[#222] text-sm hover:text-[#F47A1F]"
        >
          Profile
        </Link>
        <Link
          href="/customer/payment"
          className="flex items-center gap-2 px-2 py-2 text-[#222] text-sm hover:text-[#F47A1F]"
        >
          Payment Method
        </Link>
        <Link
          href="/customer/booking-history"
          className="flex items-center gap-2 px-2 py-2 text-[#222] text-sm hover:text-[#F47A1F]"
        >
          Booking History
        </Link>
      </nav>
      <hr className="my-2 border-t border-gray-200" />
      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-2 py-2 text-[#222] text-sm hover:text-[#F47A1F] text-left"
      >
        Log out
      </button>
    </div>
  );
}

/**
 * scrollToSection
 * - ฟังก์ชันช่วย scroll ไปยัง section ตาม id (ใช้สำหรับ anchor menu)
 */
function scrollToSection(id: string) {
  if (typeof window === "undefined") return;
  const sectionId = id.replace(/^#/, "");
  const el = document.getElementById(sectionId);
  if (!el) return;
  const yOffset = window.innerWidth >= 768 ? -100 : -80; // กันชนกับ navbar
  const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

/**
 * Navbar
 * - คอมโพเนนต์หลักของ Navbar
 * - แสดงโลโก้, เมนู, user menu, hamburger, mobile drawer
 *
 * ปรับตามคำขอ: ให้เมนูไปอยู่ติดกับโลโก้ (ด้านขวา) และเว้นช่องว่างมากขึ้น
 */
const Navbar = ({
  navItems = defaultNavItems,
  loginLabel = "Log in",
  logo = defaultLogo,
}: NavbarProps) => {
  const [open, setOpen] = useState(false); // สถานะเปิด/ปิด mobile drawer
  const [user, setUser] = useState<null | { id: string; email: string | null }>(
    null
  );
  const [loading, setLoading] = useState(true);

  // โหลดสถานะผู้ใช้ (สำหรับ mobile menu)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data?.user
        ? { id: data.user.id, email: (data.user.email as string) ?? null }
        : null;
      setUser(u);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user
        ? { id: session.user.id, email: (session.user.email as string) ?? null }
        : null;
      setUser(u);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // ฟังก์ชัน render เมนูนำทาง (desktop)
  const renderNavItems = (onClick?: () => void) =>
    navItems.map((item) => (
      <button
        key={item.label}
        className="text-[#4B5755] text-sm font-medium px-0 py-2 text-left hover:text-[#F47A1F] transition-colors whitespace-nowrap"
        style={{ width: "100%" }}
        onClick={() => {
          scrollToSection(item.path);
          if (onClick) onClick();
        }}
      >
        {item.label}
      </button>
    ));

  // Hamburger icon (mobile)
  const Hamburger = (
    <button
      className="flex flex-col justify-center items-center w-8 h-8 md:hidden"
      aria-label="Toggle menu"
      onClick={() => setOpen((prev) => !prev)}
    >
      <span
        className={`block w-6 h-0.5 bg-[#4B5755] mb-1 rounded transition-all duration-300 ${
          open ? "rotate-45 translate-y-2" : ""
        }`}
      />
      <span
        className={`block w-6 h-0.5 bg-[#4B5755] mb-1 rounded transition-all duration-300 ${
          open ? "opacity-0" : ""
        }`}
      />
      <span
        className={`block w-6 h-0.5 bg-[#4B5755] rounded transition-all duration-300 ${
          open ? "-rotate-45 -translate-y-2" : ""
        }`}
      />
    </button>
  );

  // Mobile drawer menu
  const MobileMenu = (
    <div
      className={`fixed top-0 left-0 h-full w-full z-50 bg-white transition-transform duration-300 md:hidden ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ minWidth: 0 }}
    >
      <div
        className="flex items-center px-4 py-3 border-b"
        style={{ height: 48 }}
      >
        <div
          className="flex-shrink-0 cursor-pointer"
          onClick={() => {
            setOpen(false);
            window.location.href = "/";
          }}
        >
          {logo}
        </div>
        <div className="ml-auto">{Hamburger}</div>
      </div>
      <nav className="flex flex-col px-4 pt-6">
        {/* ถ้ายังไม่ได้ login แสดงเมนูและปุ่ม login */}
        {!user ? (
          <>
            {navItems.map((item) => (
              <button
                key={item.label}
                className="text-[#222] text-sm font-normal py-2 text-left hover:text-[#F47A1F] transition-colors whitespace-nowrap"
                style={{ width: "100%" }}
                onClick={() => {
                  scrollToSection(item.path);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
            <hr className="my-6 border-t border-gray-200" />
            <Link
              href="/customer/login"
              className="block text-[#F47A1F] text-sm font-semibold hover:underline py-2"
              onClick={() => setOpen(false)}
            >
              {loginLabel}
            </Link>
          </>
        ) : (
          // ถ้า login แล้ว แสดงเมนูผู้ใช้
          <MobileUserMenu
            user={user}
            onLogout={async () => {
              setOpen(false);
              await supabase.auth.signOut();
              window.location.replace("http://localhost:3000/");
            }}
          />
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Navbar หลัก (fixed) */}
      <header className="fixed top-0 left-0 w-full z-40 bg-white shadow-sm">
        <div
          className="mx-auto flex items-center justify-between px-4 md:px-12"
          style={{ maxWidth: 1440, height: 100 }}
        >
          {/* โลโก้ (คลิกกลับหน้าแรก) */}
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            {logo}
          </div>

          {/* Desktop: เมนูนำทางอยู่ติดกับโลโก้ (ด้านขวา) และเว้นช่องว่างมากขึ้น */}
          <nav
            className="hidden md:flex items-center"
            style={{ marginLeft: 48, gap: 32, flex: 1 }}
          >
            <div className="flex items-center space-x-8">
              {renderNavItems()}
            </div>
          </nav>

          {/* Desktop: user menu (ชื่อ+รูปจาก profiles) ชิดขวาสุด */}
          <div className="hidden md:inline-block ml-16">
            <UserMenu />
          </div>

          {/* Hamburger (mobile) */}
          <div className="md:hidden">{Hamburger}</div>
        </div>

        {/* Mobile drawer menu */}
        {MobileMenu}
      </header>

      {/* Spacer สำหรับ fixed navbar (กันเนื้อหาถูกบัง) */}
      <div className="block md:hidden" style={{ height: 48 }} />
    </>
  );
};

export default Navbar;
