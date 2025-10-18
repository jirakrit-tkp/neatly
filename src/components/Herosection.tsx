// โค้ดนี้คือคอมโพเนนต์ Hero Section สำหรับหน้าแรก (Landing Page) ของเว็บจองโรงแรม
// โดยแสดงภาพพื้นหลังแบบเต็มจอ, ตัวหนังสือ headline, และกล่องค้นหาโรงแรม (SearchBox)

import Image from "next/image"; // ใช้สำหรับแสดงรูปภาพพื้นหลังแบบ Responsive
import SearchBox from "./customer/searchbar/Searchbox"; // คอมโพเนนต์กรอกข้อมูลการค้นหาโรงแรม
import { useRouter } from "next/router"; // ใช้เปลี่ยนหน้า/redirect ไปหน้าค้นหาเมื่อค้นหาโรงแรม

// ฟังก์ชันช่วยสำหรับคืนวันที่วันนี้ในรูปแบบ yyyy-mm-dd (ไม่ได้ถูกใช้งานในไฟล์นี้ แต่เป็น utility ทั่วไป)
function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function Herosection() {
  const router = useRouter();

  const handleSearch = (params: {
    checkIn: string;
    checkOut: string;
    room: string;
    guests: string;
  }) => {
    const query = new URLSearchParams(params).toString();
    router.push(`/customer/search-result?${query}`);
  };

  // ส่วนนี้คือ layout หลักของ Hero Section
  return (
    <section
      id="hero"
      className="fixed top-0 left-0 w-screen h-screen min-h-[600px] max-h-none z-0 flex flex-col overflow-hidden"
      style={{
        minWidth: "100vw",
        width: "100vw",
        maxWidth: "100vw",
        minHeight: "600px",
        height: "100vh",
        maxHeight: "none",
        position: "relative", // ทำให้ position เป็น relative เพื่อรองรับการจัดวางองค์ประกอบภายในที่ absolute
        top: 0,
        left: 0,
        margin: "0",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        border: "none",
        boxShadow: "none",
        padding: "0",
        background: "transparent", // ไม่มีพื้นหลังขาว
      }}
    >
      {/* พื้นหลังเป็นรูปภาพ */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/herosection.jpg"
          alt="Hero Section"
          fill
          style={{
            objectFit: "cover",
            objectPosition: "center",
          }}
          priority
          sizes="100vw"
        />
      </div>
      {/* เลเยอร์ overlay สีดำโปร่งแสง เพื่อความอ่านง่ายของตัวอักษรด้านบน */}
      <div className="absolute inset-0 bg-black/40 z-10" />
      {/* Centered content: กล่องกลางจอทั้ง headline และกล่องค้นหา */}
      <div className="relative z-20 flex flex-col items-center w-full h-full">
        <div 
          className="flex flex-col items-center justify-center w-full h-full"
          style={{ position: "relative" }}
        >
          <h1
            className="text-white text-center font-serif"
            style={{
              fontSize: "clamp(2.75rem, 7vw, 88px)", // ฟอนต์ขนาด responsive: 44px บนมือถือ ถึง 68px บน Desktop
              lineHeight: "clamp(3rem, 8vw, 92px)",
              marginTop: "-1cm", // ดันขึ้นบน (เหนือกึ่งกลางจอ)
              marginBottom: "32px",
              textShadow: "0 2px 16px rgba(0,0,0,0.25)",
              letterSpacing: 0.5,
              fontWeight: 500,
              maxWidth: 1000,
              width: "100%",
              display: "block",
            }}
          >
            {/* Headline แบบ Responsive (ขึ้นบรรทัดใหม่บนจอเล็ก) */}
            <span className="hidden sm:inline">
              A Best Place for Your
              <br />
              Neatly Experience
            </span>
            <span className="inline sm:hidden">
              A Best Place
              <br />
              for Your
              <br />
              Neatly Experience
            </span>
          </h1>
          {/* Spacer (ระยะห่าง) */}
          <div style={{ height: 0 }} />
          {/* กล่อง SearchBox สำหรับค้นหาโรงแรม */}
          <div
            className={`
              w-full
              max-w-[900px]
              min-h-[60px]
              flex
              justify-center
              items-center
            `}
            style={{
              margin: "0 auto",
              minWidth: 320,
              maxWidth: 900,
              minHeight: 80,
              height: "auto",
            }}
          >
            {/* ส่งฟังก์ชัน handleSearch ให้กับ SearchBox เมื่อยืนยันข้อมูล จะ redirect ไปหน้าผลลัพธ์ */}
            <SearchBox onSearch={handleSearch} />
          </div>
        </div>
      </div>
    </section>
  );
}
