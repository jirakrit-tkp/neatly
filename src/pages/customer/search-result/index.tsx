import Navbar from "@/components/Navbar";
import SearchBox from "@/components/customer/searchbar/Searchbox";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import Footer from "@/components/Footer";
import { Room } from "@/types/rooms";
import { SearchParams } from "@/components/customer/searchbar/Searchbox";
import { RoomType } from "@/types/roomTypes";
import Chatbot from "@/components/Chatbot";

function SearchResultPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ดึงข้อมูลห้องพักจาก API
  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      // read query params for filtering
      const { checkIn, checkOut, room, guests } = router.query as {
        [key: string]: string;
      };
      const searchParams = new URLSearchParams();
      if (checkIn) searchParams.set("checkIn", checkIn);
      if (checkOut) searchParams.set("checkOut", checkOut);
      if (room) searchParams.set("room", room);
      if (guests) searchParams.set("guests", guests);
      const qs = searchParams.toString();
      const response = await fetch(`/api/room_types${qs ? `?${qs}` : ""}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await response.json();
      // สมมติว่า API ส่ง { data: [...] }
      const list = Array.isArray(data?.data) ? data.data : [];
      setRooms(list);

      // Filter only rooms with status "Vacant"
      setRooms(list); // ใช้ข้อมูลทั้งหมด
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

  // refetch whenever query changes
  useEffect(() => {
    if (!router.isReady) return;
    fetchRooms();
  }, [router.isReady, router.query]);

  // ฟังก์ชันเมื่อกดปุ่ม Room Detail
  // แก้ไขให้รับ id แทน room object
  const handleRoomDetailClick = (id: number | string) => {
    // รับทั้ง number และ string
    if (!id) return;
    router.push(`/customer/search-result/${id}`);
  };

  // เพิ่มฟังก์ชันนี้ใน SearchResultPage component

  const handleBookNow = async (roomTypeId: number) => {
    try {
      setLoading(true);

      // แก้ไข: ใช้ชื่อที่ตรงกับ router.query (checkIn, checkOut)
      const { checkIn, checkOut, guests } = router.query;

      if (!checkIn || !checkOut || !guests) {
        alert("Missing search parameters. Please search again.");
        return;
      }

      const response = await fetch("/api/rooms/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type_id: roomTypeId,
          check_in: checkIn, // ใช้ checkIn (ตัวใหญ่)
          check_out: checkOut, // ใช้ checkOut (ตัวใหญ่)
          guests: parseInt(guests as string),
        }),
      });

      const result = await response.json();

      if (result.success && result.data.available) {
        router.push(
          `/customer/booking?room_type_id=${roomTypeId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
        );
      } else {
        alert(
          result.message || "ห้องไม่ว่างในช่วงวันที่เลือก กรุณาเลือกวันที่อื่น"
        );
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      alert("เกิดข้อผิดพลาดในการตรวจสอบห้องว่าง");
    } finally {
      setLoading(false);
    }
  };

  console.log("Rooms", rooms);

  return (
    <div className="bg-[#F7F7FA] min-h-screen">
      <Navbar />
      <div className="h-6" />
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="pt-6 pb-2">
          <SearchBox
            defaultValues={{
              checkIn: (router.query.checkIn as string) || undefined,
              checkOut: (router.query.checkOut as string) || undefined,
              room: (router.query.room as string) || undefined,
              guests: (router.query.guests as string) || undefined,
            }}
            onSearch={(params: SearchParams) => {
              const q = new URLSearchParams({
                checkIn: params.checkIn,
                checkOut: params.checkOut,
                room: params.room,
                guests: params.guests,
              }).toString();
              router.push(`/customer/search-result?${q}`);
            }}
          />
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-500 text-lg">
            Loading rooms...
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500 text-lg">{error}</div>
        ) : (
          <div className="flex flex-col gap-6 mt-4">
            {rooms.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No vacant rooms found.
              </div>
            ) : (
              rooms.map((room: RoomType, index: number) => (
                <div
                  key={room.id ?? index}
                  className="flex flex-col md:flex-row bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mx-auto"
                  style={{
                    // Mobile: 375x649, Desktop: 1120x400
                    width: "100%",
                    maxWidth: "1120px",
                    minWidth: 0,
                    ...(typeof window !== "undefined"
                      ? window.innerWidth >= 768
                        ? {
                            width: "1120px",
                            minWidth: "1120px",
                            maxWidth: "1120px",
                            height: "400px",
                            minHeight: "400px",
                          }
                        : {
                            width: "375px",
                            minWidth: "375px",
                            maxWidth: "375px",
                            height: "649px",
                            minHeight: "649px",
                          }
                      : {}),
                  }}
                >
                  {/* Room Image */}
                  <div
                    className="relative flex-shrink-0"
                    style={
                      typeof window !== "undefined" && window.innerWidth >= 768
                        ? {
                            width: "453px",
                            minWidth: "453px",
                            maxWidth: "453px",
                            height: "400px",
                          }
                        : {
                            width: "100%",
                            minWidth: 0,
                            maxWidth: "100%",
                            height: "200px",
                          }
                    }
                  >
                    {room.main_image ? (
                      <Image
                        src={room.main_image}
                        alt={room.name || "Room image"}
                        width={800}
                        height={600}
                        style={{
                          objectFit: "cover",
                          width: "100%",
                          height: "100%",
                          display: "block",
                        }}
                        className="rounded-t-xl md:rounded-l-xl md:rounded-tr-none w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                        No Image
                      </div>
                    )}
                  </div>
                  {/* Room Info */}
                  <div
                    className="flex flex-1 flex-col justify-between p-6 gap-4"
                    style={
                      typeof window !== "undefined" && window.innerWidth >= 768
                        ? { minHeight: "400px" }
                        : { minHeight: "auto" }
                    }
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-[#2F3E35] mb-10">
                        {room.name}
                      </h2>
                      <div className="flex items-center gap-2 text-s text-gray-500 mb-10">
                        <span>
                          {room.guests ?? 2}{" "}
                          {room.guests > 1 ? "Guests" : "Guest"}
                        </span>
                        <span className="mx-2">·</span>
                        <span>{room.bed_type}</span>
                        <span className="mx-2">·</span>
                        <span>
                          {room.room_size ? `${room.room_size} sqm` : "32 sqm"}
                        </span>
                        {room.name && (
                          <>
                            <span className="mx-2">·</span>
                            <span>{room.name}</span>
                          </>
                        )}
                      </div>
                      <div className="text-gray-500 text-s mb-4 line-clamp-2">
                        {room.description ||
                          "Elegant modern decor with garden or city view. Includes balcony, bathtub, and free WiFi."}
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between min-w-[160px]">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-gray-400 line-through mb-1">
                          {room.base_price
                            ? `THB ${room.base_price.toLocaleString()}`
                            : ""}
                        </span>
                        <span className="text-xl font-bold text-black mb-1">
                          {room.promo_price
                            ? `THB ${room.promo_price.toLocaleString()}`
                            : "THB 0"}
                        </span>
                        <span className="text-xs text-gray-400">Per Night</span>
                        <span className="text-xs text-gray-400">
                          Including Taxes & Fees
                        </span>
                      </div>
                      <div className="flex flex-row gap-2 mt-4">
                        <button
                          className="text-[#F47A1F] border border-white bg-white rounded-md font-medium text-xs hover:bg-[#f7e7d7] transition"
                          style={{
                            width: "143px",
                            height: "48px",
                            minWidth: "143px",
                            minHeight: "48px",
                            fontSize: "16px",
                          }}
                          onClick={() =>
                            handleRoomDetailClick(room.id.toString())
                          } // แปลง number เป็น string
                        >
                          Room Detail
                        </button>
                        <button
                          onClick={() => handleBookNow(room.id)} // room.id จาก room_types table = room_type_id
                          className="bg-[#F47A1F] text-white rounded-lg font-semibold text-sm hover:bg-[#d96a1a] transition"
                          style={{
                            width: "143px",
                            height: "48px",
                            minWidth: "143px",
                            minHeight: "48px",
                            fontSize: "16px",
                          }}
                        >
                          {loading ? "Checking..." : "Book Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <Footer />

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}

export default SearchResultPage;
