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
      {/* Image Carousel */}
      <div
        className="relative w-full flex flex-col items-center"
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          marginTop: "48px",
          height: "600px",
        }}
      >
        <div className="relative w-full h-[600px] overflow-hidden rounded-2xl shadow-lg bg-[#F7F7FA]">
          {/* ปุ่มเลื่อนซ้าย */}
          <button
            aria-label="Previous image"
            onClick={goToPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow p-2 transition-colors"
            style={{ outline: "none", border: "none" }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
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
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow p-2 transition-colors"
            style={{ outline: "none", border: "none" }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <AnimatePresence>
            <motion.img
              key={images[index].src}
              src={images[index].src}
              alt={images[index].alt}
              className="w-full h-full object-cover absolute"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.8 }}
              style={{ minHeight: "600px", maxHeight: "600px" }}
            />
          </AnimatePresence>
          {/* จุดบอกตำแหน่ง (Indicators) */}
          <div className="absolute bottom-4 w-full flex justify-center gap-2 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-colors duration-300 ${
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
