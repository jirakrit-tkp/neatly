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
  rooms?: {
    guests?: number | null;
    room_type?: string | null;
    bed_type?: string | null;
  } | null;
  profiles?: Profile | null;
  [key: string]: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "GET") {
    try {
      // First attempt: include profiles join; if it fails due to missing relation, retry without profiles
      let data: BookingRow[] | null = null;
      let baseError: unknown = null;
      try {
        const result = await supabase
          .from("bookings")
          .select(
            "id, customer_name, check_in_date, check_out_date, rooms(guests, room_type, bed_type), profiles(first_name, last_name, username, full_name)"
          )
          .order("created_at", { ascending: false });
        data = (result.data as unknown as BookingRow[]) ?? null;
        baseError = result.error ?? null;
      } catch (e) {
        baseError = e;
      }

      if (baseError) {
        // Retry without the profiles relation to avoid breaking the UI
        const fallback = await supabase
          .from("bookings")
          .select("*, rooms(guests, room_type, bed_type)")
          .order("created_at", { ascending: false });
        if (fallback.error) {
          return res.status(400).json({
            success: false,
            message: "Failed to fetch bookings",
            error: fallback.error.message,
          });
        }
        data = (fallback.data as unknown as BookingRow[]) ?? null;
      }

      // Map related rooms fields and enrich names using profiles via customer_id when needed
      let enriched = (data ?? []).map((b: BookingRow) => {
        const profile = b.profiles ?? null;
        const synthesizedName =
          b.customer_name ||
          profile?.full_name ||
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          profile?.username ||
          null;

        return {
          ...b,
          customer_name: synthesizedName,
          guests: b.rooms?.guests ?? b.guests ?? null,
          room_type: b.rooms?.room_type ?? b.room_type ?? null,
          bed_type: b.rooms?.bed_type ?? b.bed_type ?? null,
        };
      });

      // If some rows still have null customer_name but have any of customer_id/user_id/profile_id, fetch their profiles in one query
      const missingIds = Array.from(
        new Set(
          enriched
            .filter(
              (b) =>
                !b.customer_name && (b.customer_id || b.user_id || b.profile_id)
            )
            .map((b) => String(b.customer_id || b.user_id || b.profile_id))
        )
      );

      if (missingIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username, full_name")
          .in("id", missingIds);

        if (!profilesError && Array.isArray(profilesData)) {
          const idToProfile: Record<string, Profile> = Object.create(null);
          for (const p of profilesData as Profile[]) {
            idToProfile[p.id] = p;
          }
          enriched = enriched.map((b) => {
            if (b.customer_name) return b;
            const key = String(
              b.customer_id || b.user_id || b.profile_id || ""
            );
            const p = key ? idToProfile[key] : undefined;
            if (!p) return b;
            const synthesized =
              p.full_name ||
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              p.username ||
              null;
            return { ...b, customer_name: synthesized };
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: "Bookings fetched successfully",
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

  return res.status(405).json({
    success: false,
    message: "Method not allowed. Use GET.",
  });
}
