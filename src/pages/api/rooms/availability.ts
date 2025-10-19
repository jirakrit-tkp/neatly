import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { BOOKING_STATUSES } from "@/constants/booking";

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

interface AvailabilityRequest {
  room_type_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  room_count: number;
}

interface AvailabilityResponse {
  success: boolean;
  message: string;
  data?: {
    available: boolean;
    availableRooms: number;
    totalRooms: number;
    roomDetails?: {
      id: string;
      room_type: string;
      price: number;
      promotion_price?: number;
      guests: number;
      amenities: string[];
      main_image_url: string[];
    }[];
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailabilityResponse>
) {
  console.log("Availability API - Starting handler");

  if (req.method !== "POST") {
    console.log("Availability API - Method not allowed:", req.method);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      error: "Only POST method is allowed",
    });
  }

  try {
    console.log("Availability API - Request body:", req.body);

    const {
      room_type_id,
      check_in,
      check_out,
      guests,
      room_count,
    }: AvailabilityRequest = req.body;

    console.log("Availability API - Parsed values:", {
      room_type_id,
      check_in,
      check_out,
      guests,
      room_count,
    });

    // Validate required fields
    if (!room_type_id || !check_in || !check_out || !guests || !room_count) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error:
          "room_type_id, check_in, check_out, guests, and room_count are required",
      });
    }

    // Validate dates
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        message: "Invalid check-in date",
        error: "Check-in date cannot be in the past",
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
        error: "Check-out date must be after check-in date",
      });
    }

    if (guests < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid guest count",
        error: "Guest count must be at least 1",
      });
    }

    if (room_count < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid room count",
        error: "Room count must be at least 1",
      });
    }

    // Validate guest capacity for multi-room booking
    const maxGuestsPerRoom = 2; // Each room can accommodate up to 2 guests
    const totalCapacity = room_count * maxGuestsPerRoom;

    console.log(
      `Validation: room_count=${room_count}, guests=${guests}, totalCapacity=${totalCapacity}, maxGuestsPerRoom=${maxGuestsPerRoom}`
    );

    if (guests > totalCapacity) {
      console.log(
        `Validation failed: guests (${guests}) > totalCapacity (${totalCapacity})`
      );
      return res.status(400).json({
        success: false,
        message: "Guest count exceeds room capacity",
        error: `Maximum ${totalCapacity} guests for ${room_count} room(s). Each room accommodates up to ${maxGuestsPerRoom} guests.`,
      });
    }

    console.log(
      `Validation passed: guests (${guests}) <= totalCapacity (${totalCapacity})`
    );

    // Calculate guests per room needed for multi-room booking
    const guestsPerRoom = Math.ceil(guests / room_count);

    console.log(
      `Multi-room availability check: ${room_count} rooms for ${guests} guests (${guestsPerRoom} guests per room)`
    );

    // 1. Get all rooms of the specified room type that can accommodate the guests per room
    console.log(
      `Database query: room_type_id=${room_type_id}, guestsPerRoom=${guestsPerRoom}`
    );

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select(
        `
        id,
        room_type_id,
        room_type,
        price,
        promotion_price,
        guests,
        amenities,
        main_image_url,
        status,
        is_active
      `
      )
      .eq("room_type_id", room_type_id)
      .eq("is_active", true)
      .in("status", getAvailableRoomStatuses()) // ✅ เพิ่มการกรองตาม room status
      .gte("guests", guestsPerRoom);

    console.log(
      `Database query result: rooms=${rooms?.length || 0}, error=${
        roomsError?.message || "none"
      }`
    );
    console.log(
      `Available room statuses filter: ${JSON.stringify(
        getAvailableRoomStatuses()
      )}`
    );

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch rooms",
        error: roomsError.message,
      });
    }

    // Ensure rooms is an array and filter out any null/undefined elements before processing
    const validRooms = (rooms || []).filter(Boolean); // Filter out null/undefined elements
    console.log(
      `Valid rooms after filtering null/undefined: ${validRooms.length}`
    );

    if (validRooms.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No rooms available for this room type",
        data: {
          available: false,
          availableRooms: 0,
          totalRooms: 0,
        },
      });
    }

    // Check if we have enough total rooms of this type
    if (validRooms.length < room_count) {
      return res.status(200).json({
        success: true,
        message: "Not enough rooms available for this room type",
        data: {
          available: false,
          availableRooms: validRooms.length,
          totalRooms: validRooms.length,
        },
      });
    }

    // 2. Check for conflicting bookings
    // แก้ไข query ให้ใช้ชื่อคอลัมน์ที่ถูกต้องตาม schema
    const roomIds = validRooms.map((room) => room.id);
    console.log(`Room IDs for booking check: ${roomIds.length} rooms`);

    const { data: conflictingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id")
      .in("room_id", roomIds)
      .eq("status", BOOKING_STATUSES.CONFIRMED)
      .or(`and(check_in_date.lt.${check_out},check_out_date.gt.${check_in})`); // ใช้ check_in_date, check_out_date

    if (bookingsError) {
      console.error("Error checking bookings:", bookingsError);
      return res.status(500).json({
        success: false,
        message: "Failed to check room availability",
        error: bookingsError.message,
      });
    }

    // 3. Find available rooms
    const bookedRoomIds = new Set(
      conflictingBookings?.map((b) => b.room_id) || []
    );
    const availableRooms = validRooms.filter(
      (room) => !bookedRoomIds.has(room.id)
    );
    console.log(`Available rooms after filtering: ${availableRooms.length}`);

    // 4. Check if we have enough available rooms for the requested room count
    const hasEnoughRooms = availableRooms.length >= room_count;

    // 5. Prepare response
    const response = {
      available: hasEnoughRooms,
      availableRooms: availableRooms.length,
      totalRooms: validRooms.length,
      roomDetails: availableRooms.slice(0, room_count).map((room) => ({
        id: room.id,
        room_type: room.room_type,
        price: room.price,
        promotion_price: room.promotion_price,
        guests: room.guests,
        amenities: room.amenities || [],
        main_image_url: room.main_image_url || [],
      })),
    };

    return res.status(200).json({
      success: true,
      message: hasEnoughRooms
        ? `Found ${availableRooms.length} available room(s), ${room_count} needed`
        : availableRooms.length > 0
        ? `Only ${availableRooms.length} room(s) available, ${room_count} needed`
        : "No rooms available for the selected dates",
      data: response,
    });
  } catch (error) {
    console.error("Room availability API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack"
    );
    console.error("Request body that caused error:", req.body);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
