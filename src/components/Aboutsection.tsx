"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHotelInfo } from "@/context/HotelInfoContext";

const images = [
  { src: "/image/deluxe.jpg", alt: "Deluxe" },
  { src: "/image/premiersea.jpg", alt: "Premier Sea View" },
  { src: "/image/suite.jpg", alt: "Suite" },
  { src: "/image/superior.jpg", alt: "Superior" },
  { src: "/image/superiorgarden.jpg", alt: "Superior Garden View" },
  { src: "/image/supreme.jpg", alt: "Supreme" },
];

export default function Aboutsection() {
  const { hotelInfo, loading } = useHotelInfo();
  const [index, setIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ฟังก์ชันเปลี่ยนภาพ
  const goToPrev = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
    resetTimer();
  };

  const goToNext = () => {
    setIndex((prev) => (prev + 1) % images.length);
    resetTimer();
  };

  // รีเซ็ต timer เมื่อกดปุ่ม
  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000);
  };

  // เปลี่ยนภาพทุก 8 วิ
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <section
      id="about"
      className="w-full flex flex-col items-center bg-white"
      style={{
        minWidth: "100vw",
        width: "100vw",
        maxWidth: "100vw",
        minHeight: "1178px",
        height: "1178px",
        margin: "0 auto",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        paddingTop: "0",
        paddingBottom: "0",
      }}
    >
      {/* Title & Description */}
      <div
        className="w-full flex flex-col items-center"
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          marginTop: "64px",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <h2
          className="font-serif text-[#2F3E35] text-[40px] md:text-[48px] leading-[48px] md:leading-[56px] font-Noto mb-6 text-left self-start"
          style={{
            marginTop: 0,
            marginBottom: 0,
            letterSpacing: 0,
          }}
        >
          {loading ? "Loading..." : hotelInfo.name}
        </h2>
        <div
          className="text-[#4B5755] text-[10px] md:text-[12px] leading-[26px] md:leading-[30px] font-Noto text-left w-full max-w-[700px] mb-0"
          style={{
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          {loading ? (
            <p>Loading hotel description...</p>
          ) : (
            hotelInfo.description.split('\n\n').map((paragraph, index) => (
              <p key={index} className={index < hotelInfo.description.split('\n\n').length - 1 ? "mb-2 md:mb-4" : ""}>
                {paragraph}
              </p>
            ))
          )}
        </div>
      </div>
      {/* Image Carousel - Horizontal Strip Style */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          marginTop: "48px",
        }}
      >
        <div
          className="
            relative
            flex
            items-center
            w-full
            overflow-x-hidden
            bg-[#F7F7FA]
            rounded-2xl
            shadow-lg
            py-4
            md:py-8
          "
          style={{
            minHeight: "250px",
            maxWidth: "100vw",
          }}
        >
          {/* ปุ่มเลื่อนซ้าย */}
          <button
            aria-label="Previous image"
            onClick={goToPrev}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow p-1 md:p-2 transition-colors"
            style={{ outline: "none", border: "none" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {/* ปุ่มเลื่อนขวา */}
          <button
            aria-label="Next image"
            onClick={goToNext}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow p-1 md:p-2 transition-colors"
            style={{ outline: "none", border: "none" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {/* Carousel Images as horizontal strip */}
          <div
            className="flex gap-2 md:gap-4 w-full justify-center items-center transition-transform duration-700"
            style={{
              transform: `translateX(calc(${-index * 100}% / 5))`,
              transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
              width: "100%",
              overflow: "visible",
            }}
          >
            {images.map((img, i) => (
              <motion.div
                key={img.src}
                className="flex-shrink-0 rounded-xl overflow-hidden bg-white"
                style={{
                  width: "180px",
                  height: "225px",
                  boxShadow: i === index ? "0 4px 24px rgba(0,0,0,0.10)" : "0 2px 8px rgba(0,0,0,0.06)",
                  border: i === index ? "2px solid #fff" : "2px solid transparent",
                  opacity: i === index ? 1 : 0.7,
                  transform: i === index ? "scale(1.04)" : "scale(0.96)",
                  transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                  zIndex: i === index ? 2 : 1,
                }}
                animate={{
                  opacity: i === index ? 1 : 0.7,
                  scale: i === index ? 1.04 : 0.96,
                }}
                transition={{ duration: 0.4 }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="object-cover w-full h-full"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "0.75rem",
                  }}
                />
              </motion.div>
            ))}
          </div>
          {/* จุดบอกตำแหน่ง (Indicators) */}
          <div className="absolute bottom-2 md:bottom-4 w-full flex justify-center gap-1 md:gap-2 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors duration-300 ${
                  i === index ? "bg-white" : "bg-gray-400"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
