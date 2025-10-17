import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Data = {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
};

type Profile = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
};

type Room = {
  guests?: number | null;
  room_type?: string | null;
  bed_type?: string | null;
  main_image_url?: string[] | null;
};

// Type for raw Supabase response (with arrays from joins)
export type SupabaseBookingRow = {
  id: string;
  customer_name?: string | null;
  customer_id?: string | null;
  user_id?: string | null;
  profile_id?: string | null;
  guests?: number | null;
  room_type?: string | null;
  bed_type?: string | null;
  main_image_url?: string[] | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  created_at?: string | null;
  additional_request?: string | null;
  special_requests?: string | null;
  standard_request?: string | null;
  cancellation_date?: string | null;
  promo_code?: string | null;
  rooms?: Room | null; // Array from join
  profiles?: Profile[] | null; // Array from join
  [key: string]: unknown;
};

// Type for enriched response (flattened data)
type EnrichedBookingRow = {
  id: string;
  customer_name: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  created_at?: string | null;
  additional_request?: string | null;
  special_requests?: string | null;
  standard_request?: string | null;
  cancellation_date?: string | null;
  promo_code?: string | null;
  guests: number | null;
  room_type: string | null;
  bed_type: string | null;
  main_image_url: string[] | null;
  [key: string]: unknown;
};

// Helper to synthesize customer name
function getCustomerName(data: SupabaseBookingRow) {
  const profile = data.profiles?.[0]; // Get first profile from array
  return (
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.username ||
    data.customer_name ||
    null
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query as { id?: string };

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Booking id is required",
      error: "Missing id",
    });
  }

  try {
    if (req.method === "GET") {
      // Fetch booking
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id, customer_name, check_in_date, check_out_date, created_at, additional_request, special_requests, standard_request, cancellation_date, promo_code,
          rooms(guests, room_type, bed_type, main_image_url),
          profiles(first_name, last_name, username)
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
          error: error?.message ?? "No data",
        });
      }

      console.log(`Data : `, data);

      // Type assertion for Supabase response
      const rawData = data as unknown as SupabaseBookingRow;
      console.log("Raw data", rawData);

      // Extract first room from array (if exists)
      const room = rawData.rooms;

      console.log(`room is : `, room);

      const testValue = room?.guests ?? rawData.guests ?? null;

      console.log(`guest should be : `, testValue);

      const enriched: EnrichedBookingRow = {
        id: rawData.id,
        customer_name: getCustomerName(rawData),
        check_in_date: rawData.check_in_date,
        check_out_date: rawData.check_out_date,
        created_at: rawData.created_at,
        additional_request: rawData.additional_request,
        special_requests: rawData.special_requests,
        standard_request: rawData.standard_request,
        cancellation_date: rawData.cancellation_date,
        promo_code: rawData.promo_code,
        guests: room?.guests ?? rawData.guests ?? null,
        room_type: room?.room_type ?? rawData.room_type ?? null,
        bed_type: room?.bed_type ?? rawData.bed_type ?? null,
        main_image_url: room?.main_image_url ?? rawData.main_image_url ?? null,
      };

      return res.status(200).json({
        success: true,
        message: "Booking fetched successfully",
        data: enriched,
      });
    }

    if (req.method === "PUT") {
      const { check_in_date, check_out_date, status, cancellation_date } =
        req.body;

      // Build the update object dynamically
      const updateData: {
        check_in_date?: string;
        check_out_date?: string;
        status?: string;
        cancellation_date?: string;
      } = {};

      // Handle date changes (for change booking page)
      if (check_in_date && check_out_date) {
        try {
          updateData.check_in_date = new Date(check_in_date).toISOString();
          updateData.check_out_date = new Date(check_out_date).toISOString();
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid date format",
            error: e instanceof Error ? e.message : "Invalid date",
          });
        }
      }

      // Handle cancellation (for cancel booking page)
      if (status) {
        updateData.status = status;
      }

      if (cancellation_date) {
        try {
          updateData.cancellation_date = new Date(
            cancellation_date
          ).toISOString();
        } catch (e) {
          return res.status(400).json({
            success: false,
            message: "Invalid cancellation date format",
            error: e instanceof Error ? e.message : "Invalid date",
          });
        }
      }

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided to update",
        });
      }

      // Update booking
      const { data, error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Failed to update booking",
          error: error.message,
        });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking updated successfully",
        data: data[0],
      });
    }

    // 🗑️ DELETE booking by ID
    if (req.method === "DELETE") {
      const { error } = await supabase.from("bookings").delete().eq("id", id);

      if (error) {
        return res.status(400).json({
          success: false,
          message: "Failed to delete booking",
          error: error.message,
        });
      }

      return res.status(200).json({
        success: true,
        message: "Booking deleted successfully",
      });
    }

    // Method not allowed
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use GET, PUT, or DELETE.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
