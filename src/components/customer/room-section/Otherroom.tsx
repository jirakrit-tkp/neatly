import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

type Room = {
  id: string | number;
  name: string;
  main_image?: string;
  room_type?: string;
  // add more fields as needed
};

// Custom hook to detect the current number of visible rooms based on screen width
const useResponsiveCarousel = () => {
  // 768px is the 'md' breakpoint in Tailwind CSS
  const getVisibleCount = () => (window.innerWidth >= 768 ? 3 : 1);

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      // Use requestAnimationFrame to batch and avoid excessive layout thrashing
      window.requestAnimationFrame(() => {
        setVisibleCount(getVisibleCount());
      });
    };

    window.addEventListener("resize", handleResize);
    // Cleanup the event listener on component unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return visibleCount;
};

export default function Otherroompage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // currentSlideIndex tracks the index of the first visible room
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Use the responsive hook to get the correct count (3 on desktop, 1 on mobile)
  const VISIBLE_ROOMS_COUNT = useResponsiveCarousel();

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/room_types");
        if (!response.ok) {
          throw new Error("Failed to fetch rooms");
        }
        const data = await response.json();
        setRooms(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        if (err instanceof Error) {
          setError(err?.message || "Error fetching rooms");
          setRooms([]);
        } else {
          console.error("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();

    // Reset index whenever rooms are loaded or VISIBLE_ROOMS_COUNT changes (on resize)
    // This is crucial for smooth transition between mobile/desktop views
    setCurrentSlideIndex(0);
  }, [VISIBLE_ROOMS_COUNT]); // IMPORTANT: Re-run when the screen size changes

  // --- Carousel Logic (Responsive) ---

  // Calculate the maximum index the carousel can scroll to before hitting the end.
  const maxSlides =
    rooms.length > VISIBLE_ROOMS_COUNT ? rooms.length - VISIBLE_ROOMS_COUNT : 0;

  const isCarouselActive = rooms.length > VISIBLE_ROOMS_COUNT;

  const translateXValue = useMemo(() => {
    if (!isCarouselActive || rooms.length === 0) return 0;

    // We translate by the percentage of one item's width relative to the *track's total width*.
    const itemPercentageOfTrack = 100 / rooms.length;

    // Translate by the current index multiplied by the percentage of one item's width.
    return -(currentSlideIndex * itemPercentageOfTrack);
  }, [currentSlideIndex, isCarouselActive, rooms.length]);

  const handlePrev = () => {
    if (!isCarouselActive) return;
    setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (!isCarouselActive) return;
    // Ensure the index does not exceed maxSlides
    setCurrentSlideIndex((prev) => Math.min(maxSlides, prev + 1));
  };

  // --- End Carousel Logic ---

  return (
    <section className="w-full bg-green-200 py-10 md:py-16 mt-10">
      <div className="max-w-[1200px] mx-auto">
        <h2 className="text-center font-noto text-[#2F3E35] text-[28px] md:text-5xl mb-10">
          Other Rooms
        </h2>
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            Loading rooms...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : (
          <>
            <div className="overflow-hidden">
              {/* This is the main visible viewport, overflow is hidden */}
              <div
                className="flex gap-6 transition-transform duration-500 ease-in-out"
                style={{
                  // The track width must be wide enough for ALL rooms to sit side-by-side
                  width: `${(rooms.length * 100) / VISIBLE_ROOMS_COUNT}%`,
                  // Smoothly translate the entire track based on the current index
                  transform: `translateX(${translateXValue}%)`,
                }}
              >
                {rooms.length === 0 ? (
                  <div className="w-full text-center text-gray-500 py-10">
                    No rooms found.
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room.id}
                      className="relative shadow bg-white group transition-all duration-200"
                      style={{
                        flexShrink: 0,
                        // Item width is 1 / rooms.length * total track width
                        // The actual pixel size is enforced by the <style jsx> below
                        width: `${100 / rooms.length}%`,
                      }}
                    >
                      <Link
                        href={`/customer/search-result/${room.id}`}
                        className="block w-full h-full"
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          {room.main_image ? (
                            <Image
                              src={room.main_image}
                              alt={room.name}
                              width={800}
                              height={600}
                              className="w-full h-full object-cover rounded-sm transition-transform duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 309px, 548px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                              No Image
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30" />
                        </div>
                        <div className="absolute left-0 bottom-0 w-full px-6 pb-6 pt-10 flex flex-col justify-end z-10">
                          <span className="text-white font-noto text-[24px] md:text-[28px] font-semibold drop-shadow">
                            {room.name}
                          </span>
                          <span className="mt-2 inline-block text-white text-[15px] font-medium hover:text-[#E2B16A] transition">
                            Explore Room &nbsp; &rarr;
                          </span>
                        </div>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Carousel Navigation Buttons */}
            {isCarouselActive && (
              <div className="flex justify-center gap-6 mt-10">
                <button
                  className="w-[48px] h-[48px] rounded-full border border-[#B3BBC4] flex items-center justify-center bg-transparent hover:bg-transparent transition disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Previous"
                  onClick={handlePrev}
                  disabled={currentSlideIndex === 0}
                >
                  <Image
                    src="/icons/left.png"
                    alt="Previous"
                    width={68}
                    height={68}
                    style={{
                      filter:
                        "brightness(0) saturate(100%) invert(70%) sepia(8%) saturate(500%) hue-rotate(200deg) brightness(90%) contrast(85%)",
                    }}
                  />
                </button>
                <button
                  className="w-[48px] h-[48px] rounded-full border border-[#B3BBC4] flex items-center justify-center bg-transparent hover:bg-transparent transition disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label="Next"
                  onClick={handleNext}
                  disabled={currentSlideIndex === maxSlides}
                >
                  <Image
                    src="/icons/right.png"
                    alt="Next"
                    width={68}
                    height={68}
                    style={{
                      filter:
                        "brightness(0) saturate(100%) invert(70%) sepia(8%) saturate(500%) hue-rotate(200deg) brightness(90%) contrast(85%)",
                    }}
                  />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* REVISED CSS: Fixed size enforcement using original dimensions */}
      <style jsx>{`
        /* Desktop: 3 cards visible, using original sizes */
        @media (min-width: 768px) {
          .overflow-hidden > div.flex > div {
            /* Width calculation based on FIXED PIXELS to match original design */
            width: 548px !important;
            height: 340px !important;
          }
        }

        /* Mobile: 1 card visible, using original sizes */
        @media (max-width: 767px) {
          .overflow-hidden > div.flex > div {
            /* Width calculation based on FIXED PIXELS to match original design */
            width: 309px !important;
            height: 206px !important;
          }
        }
      `}</style>
    </section>
  );
}
