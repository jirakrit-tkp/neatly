import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { ProfileForm } from "@/components/customer/forms/ProfileForm";
import { UserProfile } from "@/types/user.type";
import Layout from "@/components/Layout";
import { User } from "@supabase/supabase-js";
import Chatbot from "@/components/Chatbot";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * ตรวจสอบการล็อกอิน
   */
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          // ถ้าไม่ได้ล็อกอิน ให้ redirect ไปหน้า login
          router.push("/customer/login");
          return;
        }

        setUser(user);
      } catch (error) {
        console.error("Error checking user:", error);
        router.push("/customer/login");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  /**
   * จัดการเมื่ออัปเดตโปรไฟล์สำเร็จ
   */
  const handleProfileUpdate = (profile: UserProfile | null) => {
    console.log("Profile updated:", profile);

    // แสดง notification (ถ้ามี)
    // toast.success("อัปเดตโปรไฟล์สำเร็จ!");

    // หรือ redirect ไปหน้าอื่น
    // router.push("/customer/dashboard");
  };

  /**
   * จัดการเมื่อยกเลิกการแก้ไข
   */
  const handleCancel = () => {
    // ถ้าต้องการให้ redirect ไปหน้าอื่น
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>{" "}
          {/* กำลังตรวจสอบการล็อกอิน... */}
        </div>
      </div>
    );
  }

  // ถ้าไม่ได้ล็อกอิน จะ redirect ไปหน้า login
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-bg">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 mt-10 md:mt-0">
          <ProfileForm
            onSuccess={handleProfileUpdate}
            onCancel={handleCancel}
          />
        </div>
      </div>

      {/* Chatbot */}
      <Chatbot />
    </Layout>
  );
}
