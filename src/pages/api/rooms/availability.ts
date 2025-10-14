import { NextApiRequest, NextApiResponse } from "next";
import { supabase } from "@/lib/supabaseClient";
import { BOOKING_STATUSES } from "@/constants/booking";

interface AvailabilityRequest {
  room_type_id: number;
  check_in: string;
  check_out: string;
  guests: number;
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
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      error: "Only POST method is allowed",
    });
  }

  try {
    const { room_type_id, check_in, check_out, guests }: AvailabilityRequest =
      req.body;

    // Validate required fields
    if (!room_type_id || !check_in || !check_out || !guests) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error: "room_type_id, check_in, check_out, and guests are required",
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

    // 1. Get all rooms of the specified room type
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
      .gte("guests", guests);

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch rooms",
        error: roomsError.message,
      });
    }

    if (!rooms || rooms.length === 0) {
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

    // 2. Check for conflicting bookings
    // แก้ไข query ให้ใช้ชื่อคอลัมน์ที่ถูกต้องตาม schema
    const { data: conflictingBookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("room_id")
      .in(
        "room_id",
        rooms.map((room) => room.id)
      )
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
    const availableRooms = rooms.filter((room) => !bookedRoomIds.has(room.id));

    // 4. Prepare response
    const response = {
      available: availableRooms.length > 0,
      availableRooms: availableRooms.length,
      totalRooms: rooms.length,
      roomDetails: availableRooms.map((room) => ({
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
      message:
        availableRooms.length > 0
          ? `Found ${availableRooms.length} available room(s)`
          : "No rooms available for the selected dates",
      data: response,
    });
  } catch (error) {
    console.error("Room availability API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
