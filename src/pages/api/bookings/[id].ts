import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  full_name?: string | null;
};

type BookingRow = {
  id: string;
  customer_name?: string | null;
  customer_id?: string | null;
  user_id?: string | null;
  profile_id?: string | null;
  guests?: number | null;
  room_type?: string | null;
  bed_type?: string | null;
  main_image_url?: string[] | null;
  rooms?: {
    guests?: number | null;
    room_type?: string | null;
    bed_type?: string | null;
    main_image_url?: string[] | null;
  } | null;
  profiles?: Profile | null;
  [key: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query as { id?: string };

  // ✅ 1. Validate ID
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Booking id is required",
      error: "Missing id",
    });
  }

  // ✅ 2. Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed. Use GET.",
    });
  }

  try {
    // ✅ 3. Try main query (bookings + rooms + profiles)
    const result = await supabase
      .from("bookings")
      .select(
        `
        *,
        rooms(guests, room_type, bed_type, main_image_url),
        profiles(first_name, last_name, username, full_name)
      `
      )
      .eq("id", id)
      .single();

    let data = result.data as BookingRow | null;
    const error = result.error;

    // ✅ 4. Fallback if join fails
    if (error) {
      const fallback = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms(guests, room_type, bed_type, main_image_url)
        `
        )
        .eq("id", id)
        .single();

      if (fallback.error) {
        return res.status(400).json({
          success: false,
          message: "Failed to fetch booking",
          error: fallback.error.message,
        });
      }
      data = fallback.data as BookingRow;
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // ✅ 5. Enrich / synthesize data
    const profile = data.profiles;
    const synthesizedName =
      data.customer_name ||
      profile?.full_name ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      profile?.username ||
      null;

    let enriched: BookingRow = {
      ...data,
      customer_name: synthesizedName,
      guests: data.rooms?.guests ?? data.guests ?? null,
      room_type: data.rooms?.room_type ?? data.room_type ?? null,
      bed_type: data.rooms?.bed_type ?? data.bed_type ?? null,
      main_image_url: data.rooms?.main_image_url ?? data.main_image_url ?? null,
    };

    // ✅ 6. If still missing name → fetch from profiles table
    if (
      !enriched.customer_name &&
      (enriched.customer_id || enriched.user_id || enriched.profile_id)
    ) {
      const profileId =
        enriched.customer_id || enriched.user_id || enriched.profile_id;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, username, full_name")
        .eq("id", profileId)
        .single();

      if (!profileError && profileData) {
        const synthesized =
          profileData.full_name ||
          [profileData.first_name, profileData.last_name]
            .filter(Boolean)
            .join(" ") ||
          profileData.username ||
          null;

        enriched = { ...enriched, customer_name: synthesized };
      }
    }

    // ✅ 7. Send success response
    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully",
      data: enriched,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
