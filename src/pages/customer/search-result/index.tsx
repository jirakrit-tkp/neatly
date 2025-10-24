import Layout from "@/components/Layout";
import SearchBox from "@/components/customer/searchbar/Searchbox";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { SearchParams } from "@/components/customer/searchbar/Searchbox";
import { RoomType } from "@/types/roomTypes";

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

      // ใช้ localStorage เป็น fallback ถ้า router.query ว่าง
      const { checkIn, checkOut, guests, room } = router.query;

      // ถ้า router.query ว่าง ให้ลองอ่านจาก localStorage
      const fallbackCheckIn = checkIn || localStorage.getItem("searchCheckIn");
      const fallbackCheckOut =
        checkOut || localStorage.getItem("searchCheckOut");
      const fallbackGuests = guests || localStorage.getItem("searchGuests");
      const fallbackRoom = room || localStorage.getItem("searchRoom");

      console.log("handleBookNow - router.query:", router.query);
      console.log("handleBookNow - localStorage fallback:", {
        checkIn: fallbackCheckIn,
        checkOut: fallbackCheckOut,
        guests: fallbackGuests,
        room: fallbackRoom,
      });

      if (
        !fallbackCheckIn ||
        !fallbackCheckOut ||
        !fallbackGuests ||
        !fallbackRoom
      ) {
        console.error("Missing parameters:", {
          checkIn: fallbackCheckIn,
          checkOut: fallbackCheckOut,
          guests: fallbackGuests,
          room: fallbackRoom,
        });
        alert("Missing search parameters. Please search again.");
        return;
      }

      const response = await fetch("/api/rooms/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_type_id: roomTypeId,
          check_in: fallbackCheckIn,
          check_out: fallbackCheckOut,
          guests: parseInt(fallbackGuests as string),
          room_count: parseInt(fallbackRoom as string), // ส่ง room_count ให้ API
        }),
      });

      const result = await response.json();

      if (result.success && result.data.available) {
        router.push(
          `/customer/booking?room_type_id=${roomTypeId}&checkIn=${fallbackCheckIn}&checkOut=${fallbackCheckOut}&guests=${fallbackGuests}&rooms=${fallbackRoom}`
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
    <Layout>
      <div className="bg-[#F7F7FA] min-h-screen flex flex-1 flex-col">
        <div className="h-6" />
        <div className="flex flex-col mt-10 md:mt-20 items-center">
          <div className="pt-6 md:pt-0 md:fixed md:z-10">
            <SearchBox
              defaultValues={{
                checkIn: (router.query.checkIn as string) || undefined,
                checkOut: (router.query.checkOut as string) || undefined,
                room: (router.query.room as string) || undefined,
                guests: (router.query.guests as string) || undefined,
              }}
              onSearch={(params: SearchParams) => {
                // บันทึก parameters ใน localStorage
                localStorage.setItem("searchCheckIn", params.checkIn);
                localStorage.setItem("searchCheckOut", params.checkOut);
                localStorage.setItem("searchRoom", params.room);
                localStorage.setItem("searchGuests", params.guests);

                // Don't navigate to the same page, just update the current search
                const q = new URLSearchParams({
                  checkIn: params.checkIn,
                  checkOut: params.checkOut,
                  room: params.room,
                  guests: params.guests,
                }).toString();
                // Use router.replace to update URL without triggering navigation
                router.replace(`/customer/search-result?${q}`, undefined, {
                  shallow: true,
                });
              }}
            />
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            <div className="text-center py-10 text-gray-500 text-lg md:mb-30">
              Loading rooms...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500 text-lg md:mb-30">
              {error}
            </div>
          ) : (
            <div className="flex flex-col gap-6 mt-4 md:mt-70 md:mb-30">
              {rooms.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  No vacant rooms found.
                </div>
              ) : (
                rooms.map((room: RoomType, index: number) => (
                  <div
                    key={room.id ?? index}
                    className="flex flex-col md:flex-row  overflow-hidden border-b border-gray-500 mx-auto md:py-5"
                    style={{
                      // Mobile: 375x649, Desktop: 1120x400
                      width: "100%",
                      maxWidth: "1150px",
                      minWidth: 0,
                    }}
                  >
                    {/* Room Image */}
                    <div className="relative">
                      {room.main_image ? (
                        <Image
                          src={room.main_image}
                          alt={room.name || "Room image"}
                          width={800}
                          height={600}
                          loading="lazy"
                          className="rounded-md w-full md:w-[460px] h-[265px] md:h-[380px] object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                          No Image
                        </div>
                      )}
                    </div>
                    {/* Room Info */}
                    <div
                      className="flex flex-1 flex-col justify-between p-6 gap-4 md:ml-10"
                      style={
                        typeof window !== "undefined" &&
                        window.innerWidth >= 768
                          ? { minHeight: "400px" }
                          : { minHeight: "auto" }
                      }
                    >
                      <div className="flex flex-col md:flex-row h-full">
                        {/* Left Side of Room Info */}
                        <div className="flex flex-col flex-1">
                          <h2 className="text-3xl font-bold text-[#2F3E35] mb-5">
                            {room.name}
                          </h2>
                          <div className="flex items-center gap-2 text-md text-gray-700 mb-7">
                            <span>
                              {room.guests ?? 2}{" "}
                              {room.guests > 1 ? "Guests" : "Guest"}
                            </span>
                            <span className="mx-2">|</span>
                            <span>{room.bed_type}</span>
                            <span className="mx-2">|</span>
                            <span>
                              {room.room_size
                                ? `${room.room_size} sqm`
                                : "32 sqm"}
                            </span>
                          </div>
                          <div className="text-gray-700 text-s mb-4 flex-wrap">
                            {room.description ||
                              "Elegant modern decor with garden or city view. Includes balcony, bathtub, and free WiFi."}
                          </div>

                          {/* Right Side of Room Info */}
                        </div>
                        <div className="flex flex-col items-end justify-between min-w-[160px]">
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-gray-700 line-through mb-1">
                              {room.base_price
                                ? `THB ${room.base_price.toLocaleString()}`
                                : ""}
                            </span>
                            <span className="text-xl font-bold text-black mb-1">
                              {room.promo_price
                                ? `THB ${room.promo_price.toLocaleString()}`
                                : "THB 0"}
                            </span>
                            <span className="text-sm text-gray-700">
                              Per Night
                            </span>
                            <span className="text-sm text-gray-700">
                              Including Taxes & Fees
                            </span>
                          </div>
                          <div className="flex flex-row gap-20 md:gap-4 mt-4">
                            <button
                              className="text-[#F47A1F] bg-[#F7F7FA] rounded-md font-medium text-xs hover:bg-[#f7e7d7] transition cursor-pointer"
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
                              className="bg-orange-600 text-white rounded-md font-semibold text-sm hover:bg-[#d96a1a] transition cursor-pointer"
                              style={{
                                width: "160px",
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
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default SearchResultPage;
