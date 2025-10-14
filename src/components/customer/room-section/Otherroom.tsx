import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Room = {
  id: string | number;
  name: string;
  main_image?: string;
  room_type?: string;
  // add more fields as needed
};

export default function Otherroompage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        // fetch from the same API as /customer/search-result
        const response = await fetch("/api/room_types");
        if (!response.ok) {
          throw new Error("Failed to fetch rooms");
        }
        const data = await response.json();
        // สมมติว่า API ส่ง { data: [...] }
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
  }, []);

  // Show only 3 rooms as "carousel"
  const showCount = 3;
  let displayRooms: Room[] = [];
  if (rooms.length <= showCount) {
    displayRooms = rooms;
  } else {
    // Carousel logic: slice out showCount rooms starting from current (wrap around if at the end)
    for (let i = 0; i < showCount; i++) {
      displayRooms.push(rooms[(current + i) % rooms.length]);
    }
  }

  const handlePrev = () => {
    if (!rooms.length) return;
    setCurrent((prev) => (prev - 1 + rooms.length) % rooms.length);
  };

  const handleNext = () => {
    if (!rooms.length) return;
    setCurrent((prev) => (prev + 1) % rooms.length);
  };

  return (
    <section className="w-full bg-green-300 py-10 md:py-16">
      <div className="max-w-[1200px] mx-auto px-4">
        <h2 className="text-center font-serif text-[#2F3E35] text-[28px] md:text-[32px] font-semibold mb-10">
          Other Rooms
        </h2>
        {loading ? (
          <div className="text-center text-gray-500 py-10">
            Loading rooms...
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">{error}</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center md:items-stretch">
            {displayRooms.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No rooms found.
              </div>
            ) : (
              displayRooms.map((room, idx) => (
                <div
                  key={room.id}
                  className="relative rounded-xl overflow-hidden shadow bg-white group transition-all duration-200"
                  style={{
                    width: "309px",
                    height: "206px",
                    maxWidth: "100%",
                  }}
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
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{
                          width: "100%",
                          height: "100%",
                        }}
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
                    <span className="text-white font-serif text-[24px] md:text-[28px] font-semibold drop-shadow">
                      {room.name}
                    </span>
                    <Link
                      href={`/customer/search-result/${room.id}`}
                      className="mt-2 inline-block text-white text-[15px] font-medium underline underline-offset-4 hover:text-[#E2B16A] transition"
                    >
                      Explore Room &nbsp; &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {/* Carousel Navigation Buttons */}
        <div className="flex justify-center gap-6 mt-10">
          <button
            className="w-[48px] h-[48px] rounded-full border border-[#B3BBC4] flex items-center justify-center bg-transparent hover:bg-transparent transition"
            aria-label="Previous"
            onClick={handlePrev}
            disabled={rooms.length <= showCount}
            style={{
              cursor: rooms.length <= showCount ? "not-allowed" : "pointer",
              opacity: rooms.length <= showCount ? 0.6 : 1,
            }}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#97a4b6"
              strokeWidth="2"
              style={{ display: "block" }}
            >
             
              <path d="M14.5 8l-4 4 4 4" stroke="#97A4B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="w-[48px] h-[48px] rounded-full border border-[#B3BBC4] flex items-center justify-center bg-transparent hover:bg-transparent transition"
            aria-label="Next"
            onClick={handleNext}
            disabled={rooms.length <= showCount}
            style={{
              cursor: rooms.length <= showCount ? "not-allowed" : "pointer",
              opacity: rooms.length <= showCount ? 0.6 : 1,
            }}
          >
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="#97a4b6"
              strokeWidth="2"
              style={{ display: "block" }}
            >
              {/* Removed <circle .../> */}
              <path d="M9.5 8l4 4-4 4" stroke="#97A4B6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 768px) {
          section > div > div.flex > div {
            width: 548px !important;
            height: 340px !important;
            min-width: 0;
          }
        }
        @media (max-width: 767px) {
          section > div > div.flex > div {
            width: 309px !important;
            height: 206px !important;
            min-width: 0;
          }
        }
      `}</style>
    </section>
  );
}
