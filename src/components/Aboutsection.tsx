"use client";
import { useState, useEffect, useRef } from "react";
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
  const [mobileIndex, setMobileIndex] = useState(0);
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

  // Carousel auto play - for desktop only
  useEffect(() => {
    if (!isMobile) {
      timerRef.current = setInterval(() => {
        setMobileIndex((prev) => (prev + 1) % images.length);
      }, 8000); // Change to 8 seconds (8000ms)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMobile]);

  const handleMobilePrev = () => {
    setMobileIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleMobileNext = () => {
    setMobileIndex((prev) => (prev + 1) % images.length);
  };

  // Desktop carousel functions
  const getVisibleImages = () => {
    const visibleImages = [];
    for (let i = 0; i < 5; i++) {
      const idx = (mobileIndex + i) % images.length;
      visibleImages.push(images[idx]);
    }
    return visibleImages;
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
        minHeight: "1178px",
        height: "auto",
        marginLeft: "auto",
        marginRight: "auto",
        paddingTop: 0,
        paddingBottom: "48px",
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
        fontFamily: "Noto Serif, serif",
        color: "#2F3E35",
        fontSize: "28px",
        fontWeight: "600",
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
            box-shadow: 0 20px 40px rgba(0,0,0,0.2) !important;
          }
          .calendar-overflow-container .calendar-mobile * {
            overflow: visible !important;
            position: relative !important;
          }
        }
      `}</style>
      <section id="about" style={sectionStyle} className="calendar-overflow-container">
        {/* MOBILE VERSION */}
        {isMobile ? (
          <>
            {/* Title & Description */}
            <div style={textBoxStyle}>
              <h2
                style={{
                  ...titleStyle,
                  textAlign: "left",
                  width: "100%",
                  fontFamily: "Noto Sans, Noto Serif, sans-serif",
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
            {/* Static 3-image triptych */}
            <div
              style={{
                width: "100vw",
                maxWidth: "100vw",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxSizing: "border-box",
                paddingTop: "18px",
                paddingBottom: "16px",
                borderRadius: "0px 0px 24px 24px",
                boxShadow: "0 2px 8px 0 rgba(20,36,46,0.04)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "18px",
                  paddingLeft: "18px",
                  paddingRight: "18px",
                  background: "#fff",
                }}
              >
                {/* Static 3-image triptych - shows first 3 images */}
                {images.slice(0, 3).map((image, index) => (
                  <div
                    key={image.src}
                    style={{
                      width: 160,
                      height: 200,
                      borderRadius: "0px",
                      overflow: "hidden",
                      background: "#fff",
                      boxShadow: "0 2px 8px 0 rgba(20,36,46,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "0 0 160px",
                    }}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "0px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          // DESKTOP VERSION (UNCHANGED)
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
                className="font-serif text-[#2F3E35] text-[40px] md:text-[48px] leading-[48px] md:leading-[56px] font-Noto max-md:text-left max-md:w-full"
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
                  hotelInfo.description.split('\n\n').map((paragraph, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize: "clamp(1rem, 7vw, 16px)",
                        marginBottom: i < hotelInfo.description.split('\n\n').length - 1 ? "20px" : "0px",
                        marginTop: "0px"
                      }}
                    >
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            </div>
            {/* Image horizontal strip with left/right buttons */}
            <div
              className="w-full flex flex-row items-end justify-center gap-0 md:mt-[0px] md:px-0 max-md:mt-[10px] max-md:px-[15px]"
              style={{
                maxWidth: "1440px",
                width: "1440px",
                margin: "0 auto",
                minHeight: "370px",
                marginTop: "100px",
                marginBottom: 0,
                position: "relative",
                background: "#fff", 
              }}
            >
              {/* Left Button */}
              <div
                style={{
                  height: "370px",
                  display: "flex",
                  alignItems: "center",
                  position: "absolute",
                  left: 0,
                  zIndex: 3,
                }}
              >
                <button
                  aria-label="Previous images"
                  onClick={() => setMobileIndex((prev) => (prev - 1 + images.length) % images.length)}
                  style={{
                    background: "transparent",
                    borderRadius: "50%",
                    boxShadow: "none",
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    minHeight: 48,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #ccc",
                    marginLeft: 24,
                    cursor: "pointer",
                    position: "relative",
                  }}
                  tabIndex={0}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      color: '#999',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ‹
                  </span>
                </button>
              </div>
              {/* Images */}
              <div
                className="flex flex-row items-end justify-center gap-0"
                style={{
                  margin: "0 auto",
                  width: "100%",
                  minWidth: 0,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {getVisibleImages().map((img, i) => (
                  <div
                    key={img.src}
                    className="overflow-hidden bg-white md:w-[272px] md:h-[370px] max-md:w-[160px] max-md:h-[200px]"
                    style={{
                      width: "272px",
                      height: "370px",
                      minWidth: "0",
                      minHeight: "0",
                      aspectRatio: "1 / 1",
                      objectFit: "cover",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                      marginLeft: i === 0 ? 0 : "24px",
                      marginRight: 0,
                      display: "flex",
                      alignItems: "flex-end",
                      borderRadius: "0px",
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="object-cover w-full h-full"
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "0px",
                        aspectRatio: "1/1",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* Right Button */}
              <div
                style={{
                  height: "370px",
                  display: "flex",
                  alignItems: "center",
                  position: "absolute",
                  right: 0,
                  zIndex: 3,
                }}
              >
                <button
                  aria-label="Next images"
                  onClick={() => setMobileIndex((prev) => (prev + 1) % images.length)}
                  style={{
                    background: "transparent",
                    borderRadius: "50%",
                    boxShadow: "none",
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    minHeight: 48,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #ccc",
                    marginRight: 24,
                    cursor: "pointer",
                    position: "relative",
                  }}
                  tabIndex={0}
                >
                  <span
                    style={{
                      fontSize: '20px',
                      color: '#999',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ›
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}