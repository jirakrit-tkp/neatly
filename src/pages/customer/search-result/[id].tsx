import Layout from "@/components/Layout";
import Image from "next/image";
import { useEffect, useState } from "react";
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

function splitAmenities(amenities: string[]) {
  // Split for two columns, balance right for odd amount
  const col1 = [];
  const col2 = [];
  for (let i = 0; i < amenities.length; i++) {
    if (i < Math.ceil(amenities.length / 2)) col1.push(amenities[i]);
    else col2.push(amenities[i]);
  }
  return [col1, col2];
}

// Silver Circle for wrapping arrow buttons
function SilverCircle({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-center absolute top-1/2 -translate-y-1/2 " +
        className
      }
      style={{
        width: "56px",
        height: "56px",
        minWidth: "56px",
        minHeight: "56px",
        background: "#FFFFFF",
        border: "2px solid #A0A4B8",
        borderRadius: "50%",
        zIndex: 40,
        ...props.style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// Arrow button wrapped in SilverCircle
const SilverArrowButton = ({
  onClick,
  disabled,
  direction,
  className = "",
  ...rest
}: {
  onClick?: () => void;
  disabled?: boolean;
  direction: "left" | "right";
  className?: string;
  [key: string]: unknown;
}) => (
  <SilverCircle
    className={
      (direction === "left" ? "left-0 " : "right-0 ") + // <-- Move arrows to edge
      className
    }
    style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    tabIndex={-1}
  >
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous image" : "Next image"}
      className="flex items-center justify-center w-full h-full rounded-full transition duration-200 !p-0 bg-transparent border-none focus:outline-none"
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        background: "transparent",
      }}
      {...rest}
    >
      <Image
        src={direction === "left" ? "/icons/left.png" : "/icons/right.png"}
        alt={direction === "left" ? "Previous" : "Next"}
        width={56}
        height={56}
      />
    </button>
  </SilverCircle>
);

function Roomdetailpage() {
  const router = useRouter();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const [amenitiesLeft, amenitiesRight] = splitAmenities(amenities);

  // Images for gallery (first, second, third for desktop)
  const images: string[] = (() => {
    if (!room) return [];
    const gallery = Array.isArray(room.gallery_images)
      ? room.gallery_images
      : [];
    const allImages = [
      room.main_image,
      ...gallery.filter((img) => img && img !== room.main_image),
    ].filter(Boolean) as string[];
    return allImages.slice(0, 3);
  })();

  const formatPrice = (price?: number) => {
    if (typeof price !== "number") return "";
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Slider state and handlers
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  // const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  // const sliderRef = useRef<HTMLDivElement | null>(null);

  const handleNext = () => {
    if (isSliding) return;
    setIsSliding(true);
    setCurrentImageIdx((prev) => prev + 1);

    setTimeout(() => {
      setIsSliding(false);
      if (currentImageIdx + 1 >= images.length) {
        setCurrentImageIdx(0); // jump to first real image
      }
    }, 500);
  };

  const handlePrev = () => {
    if (isSliding) return;
    setIsSliding(true);
    setCurrentImageIdx((prev) => prev - 1);

    setTimeout(() => {
      setIsSliding(false);
      if (currentImageIdx - 1 < 0) {
        setCurrentImageIdx(images.length - 1); // jump to last real image
      }
    }, 500);
  };

  // Helper to get the correct image for desktop slider
  const getImageByOffset = (offset: number) => {
    // For desktop view, with possible 1-3 images, always show 3 slots (or as many images available, wrapped)
    if (!images.length) return "";
    const len = images.length;
    // screen shows: prev | current | next
    // offset: -1 => prev, 0 => current, 1 => next
    // handle wrap-around
    const showIdx = (currentImageIdx + offset + len) % len;
    return images[showIdx];
  };

  return (
    <Layout>
      <div className="bg-[#F7F7FA] min-h-screen">
        <div className="max-w-[1440px] mx-auto md:px-6 md:py-20 flex flex-col items-center">
          {loading ? (
            <div className="text-center text-gray-500 py-20">Loading...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-20">{error}</div>
          ) : !room ? (
            <div className="text-center text-gray-500 py-20">
              Room not found
            </div>
          ) : (
            <>
              {/* Mobile Layout */}
              <div className="block md:hidden w-full mt-10">
                {/* Mobile Hero Image Carousel */}
                <div className="relative w-full overflow-hidden rounded-md h-[249px] mb-6">
                  {/* Sliding Track */}
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      transform: `translateX(-${currentImageIdx * 100}%)`,
                    }}
                  >
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="flex-shrink-0 w-full h-[249px] relative"
                      >
                        <Image
                          src={img}
                          alt={room.name || "Room"}
                          fill
                          style={{ objectFit: "cover" }}
                          draggable={false}
                          className="block w-full h-full"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <SilverArrowButton
                        onClick={() =>
                          setCurrentImageIdx(
                            (prev) => (prev - 1 + images.length) % images.length
                          )
                        }
                        direction="left"
                        disabled={isSliding}
                        className="absolute top-1/2 left-2 -translate-y-1/2 z-10"
                      />
                      <SilverArrowButton
                        onClick={() =>
                          setCurrentImageIdx(
                            (prev) => (prev + 1) % images.length
                          )
                        }
                        direction="right"
                        disabled={isSliding}
                        className="absolute top-1/2 right-2 -translate-y-1/2 z-10"
                      />
                    </>
                  )}
                </div>

                {/* Mobile Room Details */}
                <div className="px-6">
                  {/* Room Title */}
                  <h1 className="font-noto text-[#2F3E35] text-5xl leading-tight mb-3">
                    {room.name}
                  </h1>

                  {/* Room Description */}
                  {room.description && (
                    <p className="text-[#4B5755] text-sm leading-6 mb-4">
                      {room.description}
                    </p>
                  )}

                  {/* Room Specifications */}
                  <div className="flex gap-4 text-sm text-gray-800 mb-6">
                    {room.guests && <span>{room.guests} Person</span>}
                    {room.bed_type && (
                      <>
                        <span className="w-[1px] h-4 bg-gray-300" />
                        <span>{room.bed_type}</span>
                      </>
                    )}
                    {room.room_size && (
                      <>
                        <span className="w-[1px] h-4 bg-gray-300" />
                        <span>{room.room_size} sqm</span>
                      </>
                    )}
                  </div>

                  {/* Price and Book Now */}
                  <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
                    {/* Price */}
                    <div className="flex flex-col">
                      {room.promo_price && room.base_price ? (
                        <>
                          <span className="text-sm text-gray-600 line-through">
                            THB {formatPrice(room.base_price)}
                          </span>
                          <span className="text-[#2F3E35] text-lg font-semibold">
                            THB {formatPrice(room.promo_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#2F3E35] text-lg font-semibold">
                          THB{" "}
                          {formatPrice(
                            room.base_price ?? room.promo_price ?? 0
                          )}
                        </span>
                      )}
                    </div>

                    {/* Book Now Button */}
                    <button className="bg-orange-600 text-white px-6 py-3 rounded-md text-sm font-semibold hover:bg-[#d96a1a] transition-colors cursor-pointer">
                      Book Now
                    </button>
                  </div>

                  {/* Room Amenities */}
                  {amenities.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-black font-semibold text-base mb-4">
                        Room Amenities
                      </h3>
                      <div className="grid grid-cols-1 gap-2 text-sm text-[#4B5755]">
                        {amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                            <span>{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:block w-full">
                {/* Desktop Gallery with arrows (same as mobile functionality) */}
                <div className="w-full flex flex-col items-center p-0 relative">
                  <div className="w-full flex flex-col items-center p-0 mt-20 relative">
                    <div className="relative w-[1440px] h-[581px] overflow-hidden flex items-center justify-center">
                      {/* Image Track */}
                      <div className="relative w-[1440px] h-[581px] overflow-hidden">
                        <div
                          className="flex transition-transform duration-500 ease-in-out"
                          style={{
                            width: `${(images.length + 2) * 864}px`,
                            transform: `translateX(-${
                              (currentImageIdx + 1) * 864
                            }px)`,
                          }}
                        >
                          {/* Clone last image at start */}
                          <div className="flex-shrink-0 w-[864px] h-[581px] relative">
                            <Image
                              src={images[images.length - 1]}
                              alt="Previous peek"
                              fill
                              style={{ objectFit: "cover" }}
                              draggable={false}
                            />
                          </div>

                          {/* All real images */}
                          {images.map((img, idx) => (
                            <div
                              key={idx}
                              className="flex-shrink-0 w-[864px] h-[581px] relative"
                            >
                              <Image
                                src={img}
                                alt={room.name || `Room ${idx + 1}`}
                                fill
                                style={{ objectFit: "cover" }}
                                draggable={false}
                              />
                            </div>
                          ))}

                          {/* Clone first image at end */}
                          <div className="flex-shrink-0 w-[864px] h-[581px] relative">
                            <Image
                              src={images[0]}
                              alt="Next peek"
                              fill
                              style={{ objectFit: "cover" }}
                              draggable={false}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Left Arrow */}
                      {images.length > 1 && (
                        <SilverArrowButton
                          onClick={handlePrev}
                          direction="left"
                          disabled={isSliding}
                          className="absolute left-20 top-1/2 -translate-y-1/2 z-50"
                        />
                      )}

                      {/* Right Arrow */}
                      {images.length > 1 && (
                        <SilverArrowButton
                          onClick={handleNext}
                          direction="right"
                          disabled={isSliding}
                          className="absolute right-20 top-1/2 -translate-y-1/2 z-50"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop Room Details Content */}
                <div className="w-full max-w-[1200px] mx-auto px-6 md:px-50 pb-10">
                  {/* Room Title */}

                  <div className="mb-6 mt-8">
                    <h1 className="font-noto text-[#2F3E35] text-[32px] md:text-7xl font-medium leading-tight mb-4">
                      {room.name}
                    </h1>
                  </div>

                  {/* Price and Details Row */}
                  <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-15 mb-8 border-b border-gray-400">
                    {/* Room Details */}
                    <div className="flex items-center gap-4 text-sm text-gray-800 w-full md:w-auto md:order-1 order-2 md:justify-start justify-center md:mb-0 mb-4">
                      <div className="flex flex-col">
                        {room.description && (
                          <p className="text-[#4B5755] text-sm md:text-base leading-6 max-w-[450px] md:mx-0 mx-auto text-left">
                            {room.description}
                          </p>
                        )}
                        <div className="flex flex-row gap-2">
                          {room.guests && <span>{room.guests} Person</span>}
                          <span>|</span>
                          {room.bed_type && <span>{room.bed_type}</span>}
                          <span>|</span>
                          {room.room_size && <span>{room.room_size} sqm</span>}
                        </div>
                      </div>
                    </div>
                    {/* Price and Book Now Button (move this to the right) */}
                    <div className="flex flex-col items-center md:items-end gap-4 w-full md:w-auto md:order-2 order-1">
                      {/* Price */}
                      <div className="flex flex-col items-center md:items-end">
                        {room.promo_price && room.base_price ? (
                          <>
                            <span className="text-sm text-gray-600 line-through">
                              THB {formatPrice(room.base_price)}
                            </span>
                            <span className="text-[#2F3E35] text-lg md:text-xl font-semibold">
                              THB {formatPrice(room.promo_price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-[#2F3E35] text-lg md:text-xl font-semibold">
                            THB{" "}
                            {formatPrice(
                              room.base_price ?? room.promo_price ?? 0
                            )}
                          </span>
                        )}
                      </div>
                      {/* Book Now Button */}
                      <button className="bg-orange-600 text-white px-8 py-3 rounded-md text-sm font-semibold hover:bg-orange-600 transition-colors cursor-pointer">
                        Book Now
                      </button>
                    </div>
                  </div>

                  {/* Room Amenities */}
                  {amenities.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-[#2F3E35] font-semibold text-lg mb-6 text-start">
                        Room Amenities
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-[#4B5755]">
                        <ul className="list-disc pl-6 space-y-2">
                          {amenitiesLeft.map((amenity) => (
                            <li key={amenity}>{amenity}</li>
                          ))}
                        </ul>
                        <ul className="list-disc pl-6 space-y-2">
                          {amenitiesRight.map((amenity) => (
                            <li key={amenity}>{amenity}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <Otherroompage />
        <style jsx global>{`
          @keyframes slideLeft {
            0% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(-60px);
              opacity: 0.7;
            }
          }
          @keyframes slideRight {
            0% {
              transform: translateX(0);
              opacity: 1;
            }
            100% {
              transform: translateX(60px);
              opacity: 0.7;
            }
          }
          .animate-slide-left {
            animation: slideLeft 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .animate-slide-right {
            animation: slideRight 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </div>
    </Layout>
  );
}

export default Roomdetailpage;
