import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Otherroompage from "@/components/customer/room-section/Otherroom";
type RoomDetail = {
  id: string | number;
  name?: string;
  base_price?: number;
  promo_price?: number;
  guests?: number;
  room_size?: number;
  description?: string;
  amenities?: string[] | string;
  bed_type?: string;
  main_image?: string;
  gallery_images?: string[];
};

function Roomdetailpage() {
  const router = useRouter();
  const roomId = router.query.id as string;
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  console.log("Room Id", roomId);

  useEffect(() => {
    if (!router.isReady) return;

    const roomId = Array.isArray(router.query.id)
      ? router.query.id[0]
      : router.query.id;

    if (!roomId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/room_types/${roomId}`);
        if (!res.ok) throw new Error("Failed to fetch room detail");
        const data = await res.json();
        // API returns { success, data }
        const r = data?.data ?? null;
        // normalize name and image for rendering
        if (r) {
          setRoom({
            ...r,
            name: r.name || r.room_type,
            main_image: r.image || r.main_image_url,
            gallery_images: Array.isArray(r.gallery_images)
              ? r.gallery_images
              : typeof r.gallery_images === "string" && r.gallery_images
              ? r.gallery_images
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          });
        } else {
          setRoom(null);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err?.message || "Error fetching room detail");
        } else {
          console.error("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [router.isReady, router.query.id]);

  // derive amenities list (string or array → array)
  const amenities: string[] = (() => {
    if (!room?.amenities) return [];
    if (Array.isArray(room.amenities)) return room.amenities;

    return room.amenities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  })();
  // Images for gallery
  const images: string[] = (() => {
    if (!room) return [];
    const gallery = Array.isArray(room.gallery_images) ? room.gallery_images : [];
    const allImages = [
      room.main_image,
      ...gallery.filter((img) => img && img !== room.main_image),
    ].filter(Boolean) as string[];
    return allImages.slice(0, 3);
  })();

  const formatPrice = (price?: number) => {
    if (typeof price !== "number") return "";
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Slider state and handlers
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const handlePrev = () => {
    if (isSliding || images.length <= 1) return;
    setSlideDirection("left");
    setIsSliding(true);
    setTimeout(() => {
      setCurrentImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      setIsSliding(false);
      setSlideDirection(null);
    }, 350);
  };

  const handleNext = () => {
    if (isSliding || images.length <= 1) return;
    setSlideDirection("right");
    setIsSliding(true);
    setTimeout(() => {
      setCurrentImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      setIsSliding(false);
      setSlideDirection(null);
    }, 350);
  };

  const handleSelect = (idx: number) => {
    if (isSliding || idx === currentImageIdx) return;
    setSlideDirection(idx > currentImageIdx ? "right" : "left");
    setIsSliding(true);
    setTimeout(() => {
      setCurrentImageIdx(idx);
      setIsSliding(false);
      setSlideDirection(null);
    }, 350);
  };

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) handlePrev();
      else handleNext();
    }
    touchStartX.current = null;
  };

  const getSlideClass = () => {
    if (!isSliding || !slideDirection) return "";
    if (slideDirection === "left") return "animate-slide-left";
    if (slideDirection === "right") return "animate-slide-right";
    return "";
  };

  return (
    <div className="bg-[#F7F7FA] min-h-screen">
      <Navbar />
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-10">
        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-20">{error}</div>
        ) : !room ? (
          <div className="text-center text-gray-500 py-20">Room not found</div>
        ) : (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            {/* Desktop hero with side previews */}
            <div className="w-full flex flex-col items-center p-2 md:p-4 bg-white">
              <div
                className="relative w-full max-w-[1440px] h-[240px] md:h-[520px] mx-auto flex items-center justify-center overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                ref={sliderRef}
              >
                {images.length > 1 && (
                  <div
                    className={`hidden md:block absolute left-0 top-0 w-1/3 h-full z-10 transition-all duration-300 ease-in-out ${
                      isSliding && slideDirection === "right" ? "opacity-0 -translate-x-10" : "opacity-100"
                    } ${isSliding && slideDirection === "left" ? "opacity-100 -translate-x-10" : ""}`}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={images[(currentImageIdx - 1 + images.length) % images.length]}
                        alt="Previous"
                        fill
                        sizes="400px"
                        style={{ objectFit: "cover", borderRadius: "12px", filter: "brightness(0.85) blur(1.5px)" }}
                        className="transition-all duration-300"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                <div
                  className={`relative w-full h-full z-20 transition-all duration-300 ease-in-out ${getSlideClass()}`}
                  style={{ borderRadius: "12px", boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)" }}
                >
                  {images.length > 0 && (
                    <Image
                      src={images[currentImageIdx]}
                      alt={room.name || "Room"}
                      fill
                      sizes="900px"
                      style={{ objectFit: "cover", borderRadius: "12px", transition: "filter 0.3s", filter: isSliding ? "blur(2px)" : "none" }}
                      draggable={false}
                    />
                  )}
                </div>
                {images.length > 1 && (
                  <div
                    className={`hidden md:block absolute right-0 top-0 w-1/3 h-full z-10 transition-all duration-300 ease-in-out ${
                      isSliding && slideDirection === "left" ? "opacity-0 translate-x-10" : "opacity-100"
                    } ${isSliding && slideDirection === "right" ? "opacity-100 translate-x-10" : ""}`}
                    style={{ pointerEvents: "none" }}
                  >
                    <div className="relative w-full h-full">
                      <Image
                        src={images[(currentImageIdx + 1) % images.length]}
                        alt="Next"
                        fill
                        sizes="400px"
                        style={{ objectFit: "cover", borderRadius: "12px", filter: "brightness(0.85) blur(1.5px)" }}
                        className="transition-all duration-300"
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
                {images.length > 1 && (
                  <button
                    onClick={handlePrev}
                    className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent text-gray-400 rounded-full p-2 z-30"
                    style={{ border: "1.5px solid #C0C0C0", boxShadow: "none" }}
                    aria-label="Previous image"
                    disabled={isSliding}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                {images.length > 1 && (
                  <button
                    onClick={handleNext}
                    className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 bg-transparent hover:bg-transparent text-gray-400 rounded-full p-2 z-30"
                    style={{ border: "1.5px solid #C0C0C0", boxShadow: "none" }}
                    aria-label="Next image"
                    disabled={isSliding}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M9 6l6 6-6 6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-4 justify-center">
                  {images.map((img, idx) => (
                    <button key={img + idx} onClick={() => handleSelect(idx)} className={`relative w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 ${currentImageIdx === idx ? "border-[#F47A1F]" : "border-transparent"} focus:outline-none`} style={{ transition: "border 0.2s" }} aria-label={`Show image ${idx + 1}`} disabled={isSliding}>
                      <Image src={img} alt={`Thumbnail ${idx + 1}`} fill sizes="80px" style={{ objectFit: "cover" }} draggable={false} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 md:px-12 pb-10">
              {/* Title and Price Row */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr,260px] gap-6 mt-10">
                <div>
                  <h1 className="font-serif text-[#2F3E35] text-[28px] md:text-[40px] leading-tight mb-3">
                    {room.name}
                  </h1>
                  {room.description ? (
                    <p className="text-[#4B5755] text-sm md:text-[13px] leading-6 max-w-[580px]">
                      {room.description}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-4 text-xs text-gray-600 mt-5">
                    {room.guests ? <span>{room.guests} Person</span> : null}
                    {room.bed_type ? (<><span className="w-[1px] h-3 bg-gray-300" /><span>{room.bed_type}</span></>) : null}
                    {room.room_size ? (<><span className="w-[1px] h-3 bg-gray-300" /><span>{room.room_size} sqm</span></>) : null}
                  </div>
                </div>
                <div className="flex md:justify-end">
                  <div className="flex flex-col items-start md:items-end">
                    {room.promo_price && room.base_price ? (
                      <>
                        <span className="text-[11px] text-gray-400 line-through mb-1">THB {formatPrice(room.base_price)}</span>
                        <span className="text-[#2F3E35] text-sm">
                          THB{" "}<span className="text-base md:text-lg font-semibold">{formatPrice(room.promo_price)}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-[#2F3E35] text-sm">THB{" "}<span className="text-base md:text-lg font-semibold">{formatPrice(room.base_price ?? room.promo_price ?? 0)}</span></span>
                    )}
                    <button className="mt-3 bg-[#F47A1F] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[#d96a1a] transition">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-b border-gray-200 mt-6 mb-6" />

              {/* Amenities */}
              {amenities.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-[#2F3E35] font-semibold text-sm mb-4">
                    Room Amenities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[13px] text-[#4B5755]">
                    <ul className="list-disc pl-5 space-y-1">
                      {amenities
                        .filter((_, i) => i % 2 === 0)
                        .map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                    </ul>
                    <ul className="list-disc pl-5 space-y-1">
                      {amenities
                        .filter((_, i) => i % 2 === 1)
                        .map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      <Otherroompage />
      <Footer />
      <style jsx global>{`
        @keyframes slideLeft { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(-60px); opacity: 0.7; } }
        @keyframes slideRight { 0% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(60px); opacity: 0.7; } }
        .animate-slide-left { animation: slideLeft 0.35s cubic-bezier(0.4,0,0.2,1); }
        .animate-slide-right { animation: slideRight 0.35s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
    </div>
  );
}

export default Roomdetailpage;
