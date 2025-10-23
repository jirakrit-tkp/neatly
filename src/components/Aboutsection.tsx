"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useHotelInfo } from "@/context/HotelInfoContext";

// Images array remains unchanged
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // When screen <= 700, treat as mobile
  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth <= 700);
    }
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Carousel auto play - for both mobile and desktop
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Desktop: Get extended array for infinite scroll effect
  const getExtendedImages = () => {
    // Create array with images before, current, and after for smooth infinite scroll
    const extended = [];
    for (let i = -1; i < 6; i++) {
      const idx = (currentIndex + i + images.length) % images.length;
      extended.push({ ...images[idx], key: `${idx}-${i}` });
    }
    return extended;
  };

  // Mobile: Get 3 images centered on current
  const getMobileImages = () => {
    const mobile = [];
    for (let i = -1; i <= 1; i++) {
      const idx = (currentIndex + i + images.length) % images.length;
      mobile.push({ ...images[idx], key: `${idx}-${i}` });
    }
    return mobile;
  };

  // Style helpers
  const sectionStyle: React.CSSProperties = isMobile
    ? {
        minWidth: 0,
        width: "100vw",
        maxWidth: "100vw",
        minHeight: undefined,
        height: "auto",
        margin: 0,
        paddingTop: 0,
        paddingBottom: 0,
        boxSizing: "border-box",
        background: "#fff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }
    : {
        minWidth: "1440px",
        width: "1440px",
        maxWidth: "1440px",
        minHeight: "1100px",
        height: "auto",
        marginLeft: "auto",
        marginRight: "auto",
        paddingTop: 0,
        boxSizing: "border-box",
        background: "#fff",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      };

  const textBoxStyle: React.CSSProperties = isMobile
    ? {
        width: "100vw",
        maxWidth: "100vw",
        background: "white",
        borderRadius: "0px 0px 24px 24px",
        margin: "0",
        padding: "32px 20px 24px 20px",
        boxSizing: "border-box",
        boxShadow: "0 2px 8px 0 rgba(20,36,46,0.05)",
        marginTop: "0",
        marginBottom: "0",
      }
    : {
        maxWidth: "950px",
        margin: "0 auto",
        marginTop: "120px",
        marginBottom: "52px",
        width: "100%",
      };

  const titleStyle: React.CSSProperties = isMobile
    ? {
        color: "#2F3E35",
        fontSize: "28px",
        marginBottom: "20px",
        marginTop: "0",
        letterSpacing: "0",
        lineHeight: "36px",
        textAlign: "center",
        width: "100%",
      }
    : {
        fontSize: "clamp(3rem, 7vw, 68px)",
        textAlign: "left",
        width: "100%",
        marginTop: 0,
        marginBottom: "40px",
        letterSpacing: 0,
        color: "#2F3E35",
        fontFamily: "Noto Serif, serif",
      };

  const descriptionStyle: React.CSSProperties = isMobile
    ? {
        color: "#4B5755",
        fontSize: "14px",
        lineHeight: "23px",
        textAlign: "center",
        marginBottom: 0,
        marginTop: 0,
      }
    : {
        marginTop: "20px",
        marginBottom: 0,
      };

  // Split paragraphs
  const descriptionParagraphs = loading
    ? []
    : hotelInfo.description
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean);

  return (
    <>
      <style jsx>{`
        .calendar-overflow-container {
          position: relative;
          z-index: 1;
        }
        @media (max-width: 767px) {
          .calendar-overflow-container {
            z-index: 1 !important;
            overflow: visible !important;
            position: relative !important;
          }
          .calendar-overflow-container * {
            overflow: visible !important;
            position: relative !important;
          }
          .calendar-overflow-container section {
            overflow: visible !important;
            position: relative !important;
            z-index: 1 !important;
          }
          .calendar-overflow-container .calendar-mobile {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 99999 !important;
            width: 360px !important;
            height: 480px !important;
            max-height: 480px !important;
            overflow: visible !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2) !important;
          }
          .calendar-overflow-container .calendar-mobile * {
            overflow: visible !important;
            position: relative !important;
          }
        }

        .carousel-track {
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <section
        id="about"
        style={sectionStyle}
        className="calendar-overflow-container"
      >
        {/* MOBILE VERSION */}
        {isMobile ? (
          <>
            {/* Title & Description */}
            <div style={textBoxStyle}>
              <h2
                className="font-noto"
                style={{
                  ...titleStyle,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                {loading ? "Loading..." : hotelInfo.name}
              </h2>
              <div style={descriptionStyle}>
                {loading ? (
                  <p>Loading hotel description...</p>
                ) : (
                  descriptionParagraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "14px",
                        lineHeight: "23px",
                        textAlign: "start",
                        marginBottom:
                          i < descriptionParagraphs.length - 1 ? "15px" : "0px",
                      }}
                    >
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            </div>
            {/* Mobile 3-image carousel */}
            {/* Carousel Section */}
            <div className="relative w-full max-w-[1440px] overflow-hidden flex justify-center items-center mt-8 md:mt-16">
              <div
                className="flex transition-transform duration-500 ease-in-out mb-10"
                style={{
                  transform: `translateX(-${currentIndex * 188}px)`,
                }}
              >
                {[...images, ...images].map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 180,
                      height: 225,
                      marginRight: 8,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={180}
                      height={225}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Prev Button */}
              <button
                aria-label="Previous images"
                onClick={handlePrev}
                className="absolute top-1/2 -translate-y-1/2 left-2 md:left-6 bg-white/90 border border-gray-300 w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <Image
                  src="/icons/left.png"
                  alt="Previous"
                  width={24}
                  height={24}
                />
              </button>

              {/* Next Button */}
              <button
                aria-label="Next images"
                onClick={handleNext}
                className="absolute top-1/2 -translate-y-1/2 right-2 md:right-6 bg-white/90 border border-gray-300 w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <Image
                  src="/icons/right.png"
                  alt="Next"
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </>
        ) : (
          // DESKTOP VERSION
          <>
            {/* Title & Description */}
            <div
              className="w-full flex flex-col items-center md:mt-[120px] md:mb-[52px] md:px-0 md:items-center max-md:mt-[20px] max-md:mb-[20px] max-md:px-[15px] max-md:items-start"
              style={{
                maxWidth: "950px",
                margin: "0 auto",
                marginTop: "120px",
                marginBottom: "52px",
              }}
            >
              <h2
                className="text-[#2F3E35] text-[40px] md:text-[48px] leading-[48px] md:leading-[56px] font-noto max-md:text-left max-md:w-full"
                style={{
                  fontSize: "clamp(3rem, 7vw, 68px)",
                  textAlign: "left",
                  width: "100%",
                  marginTop: 0,
                  marginBottom: "40px",
                  letterSpacing: 0,
                }}
              >
                {loading ? "Loading..." : hotelInfo.name}
              </h2>
              <div
                className="text-[#4B5755] text-[18px] md:text-[14px] leading-[26px] md:leading-[30px] font-Noto text-left w-full max-w-[800px] mb-0 md:mt-[20px] max-md:mt-[15px] max-md:text-left max-md:w-full max-md:max-w-none max-md:px-0 max-md:text-[16px] max-md:leading-[24px]"
                style={{
                  marginTop: "20px",
                  marginBottom: 0,
                }}
              >
                {loading ? (
                  <p>Loading hotel description...</p>
                ) : (
                  hotelInfo.description.split("\n\n").map((paragraph, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "clamp(1rem, 7vw, 16px)",
                        marginBottom:
                          i < hotelInfo.description.split("\n\n").length - 1
                            ? "20px"
                            : "0px",
                        marginTop: "0px",
                      }}
                    >
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            </div>
            {/* Desktop carousel with smooth infinite scroll */}
            {/* Carousel Section */}
            <div className="relative w-full max-w-[1440px] overflow-hidden flex justify-center items-center mt-8 md:mt-16">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * (272 + 20)}px)`, // 272px image + 20px margin
                  width: `${images.length * (272 + 20)}px`, // total width of images
                }}
              >
                {[...images, ...images].map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: 272,
                      height: 370,
                      marginRight: 15,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      width={272}
                      height={370}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Prev Button */}
              <button
                aria-label="Previous images"
                onClick={handlePrev}
                className="absolute top-1/2 -translate-y-1/2 left-2 md:left-6 border border-white w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <Image
                  src="/icons/left.png"
                  alt="Previous"
                  width={24}
                  height={24}
                />
              </button>

              {/* Next Button */}
              <button
                aria-label="Next images"
                onClick={handleNext}
                className="absolute top-1/2 -translate-y-1/2 left-340 border border-white w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              >
                <Image
                  src="/icons/right.png"
                  alt="Next"
                  width={24}
                  height={24}
                />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
