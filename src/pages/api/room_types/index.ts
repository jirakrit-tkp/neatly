import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { RoomType } from "@/types/roomTypes";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Data = {
  success: boolean;
  message: string;
  data?: RoomType[];
  error?: string;
};

// ✅ เพิ่มฟังก์ชัน filter rooms ตาม status
const getAvailableRoomStatuses = () => {
  // รองรับเฉพาะ status ที่ว่าง/พร้อมใช้งาน
  return [
    "Vacant",
    "Vacant Clean",
    "Vacant Clean Inspected",
    "Vacant Clean Pick Up",
  ];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "GET") {
    // ✅ Fetch room types with filtering
    try {
      // Get query parameters
      const { room, guests } = req.query;

      // ✅ แก้ไข query ให้ join กับ rooms table และ filter ตาม status
      let query = supabase
        .from("room_types")
        .select(
          `
          *,
          rooms!inner(
            id,
            status,
            is_active
          )
        `
        )
        // ✅ Filter เฉพาะห้องที่มี status ที่ว่างและ active
        .in("rooms.status", getAvailableRoomStatuses())
        .eq("rooms.is_active", true);

      // Filter by guest capacity with multi-room support
      if (guests && room) {
        const guestCount = parseInt(guests as string);
        const roomCount = parseInt(room as string);

        if (!isNaN(guestCount) && !isNaN(roomCount)) {
          // Calculate guests per room needed
          const guestsPerRoom = Math.ceil(guestCount / roomCount);

          // Validate that total capacity is sufficient
          const maxGuestsPerRoom = 2; // Each room can accommodate up to 2 guests
          const totalCapacity = roomCount * maxGuestsPerRoom;

          if (guestCount > totalCapacity) {
            // If guests exceed total capacity, return empty result
            console.log(
              `Guest count ${guestCount} exceeds total capacity ${totalCapacity} for ${roomCount} rooms`
            );
            return res.status(200).json({
              success: true,
              message: "No rooms available - guest count exceeds capacity",
              data: [],
            });
          }

          // Filter room types that can accommodate the required guests per room
          query = query.gte("guests", guestsPerRoom);
          console.log(
            `Multi-room booking: ${roomCount} rooms for ${guestCount} guests (${guestsPerRoom} guests per room, max capacity: ${totalCapacity})`
          );
        }
      } else if (guests) {
        // Single room booking - filter by guest capacity
        const guestCount = parseInt(guests as string);
        if (!isNaN(guestCount)) {
          query = query.gte("guests", guestCount);
          console.log(`Single room booking: ${guestCount} guests`);
        }
      }

      // TODO: Add checkIn/checkOut and room count filtering logic
      // This would require checking room availability in the rooms table

      const { data, error } = await query;

      if (error) {
        console.error("❌ Error:", error.message);
        return res.status(400).json({
          success: false,
          message: "Failed to fetch room types",
          error: error.message,
        });
      }

      // ✅ Filter out duplicate room types (เพราะ join อาจส่งผลให้มี room_type เดียวกันหลายครั้ง)
      const uniqueRoomTypes = (data || []).reduce(
        (acc: RoomType[], roomType: RoomType & { rooms?: unknown }) => {
          const existing = acc.find((rt: RoomType) => rt.id === roomType.id);
          if (!existing) {
            // Remove the rooms data from response เพื่อไม่ให้ frontend สับสน
            const { rooms: _, ...cleanRoomType } = roomType;
            acc.push(cleanRoomType as RoomType);
          }
          return acc;
        },
        [] as RoomType[]
      );

      console.log(
        `✅ Found ${uniqueRoomTypes.length} available room types after filtering by status`
      );

      return res.status(200).json({
        success: true,
        message: "Room types fetched successfully",
        data: uniqueRoomTypes || [],
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (req.method === "POST") {
    // ✅ Create a new room type
    try {
      const {
        id,
        name,
        description,
        base_price,
        promo_price,
        guests,
        room_size,
        bed_type,
        amenities,
        main_image,
        gallery_images,
      } = req.body;

      if (
        !id ||
        !name ||
        !description ||
        !base_price ||
        !guests ||
        !room_size ||
        !bed_type ||
        !amenities ||
        !main_image ||
        !gallery_images
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const { data, error } = await supabase
        .from("room_types")
        .insert([
          {
            id,
            name,
            description,
            base_price,
            promo_price,
            guests,
            room_size,
            bed_type,
            amenities,
            main_image,
            gallery_images,
          },
        ])
        .select(); // return the created room type

      if (error) {
        console.error("❌ Insert Error:", error.message);
        return res.status(400).json({
          success: false,
          message: "Failed to create room type",
          error: error.message,
        });
      }

      return res.status(201).json({
        success: true,
        message: "Room type created successfully",
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // ❌ Other methods not allowed
  return res.status(405).json({
    success: false,
    message: "Method not allowed. Use GET or POST.",
  });
}
