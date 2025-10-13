import { supabase } from "@/lib/supabaseClient";

// Async function to validate promo code with database
export const validatePromoCode = async (
  code: string
): Promise<{
  isValid: boolean;
  error?: string;
  discountAmount?: number;
}> => {
  if (!code || code.trim() === "") {
    return { isValid: true }; // Empty code is valid (optional)
  }

  try {
    const { data: promotion, error } = await supabase
      .from("promo_codes")
      .select(
        "code, is_active, expires_at, max_uses, used_count, discount_amount"
      )
      .eq("code", code.trim().toUpperCase())
      .single();

    if (error || !promotion) {
      return {
        isValid: false,
        error:
          "This promo code isn't valid for this room. Try another code or room",
      };
    }

    // Check if code is active
    if (!promotion.is_active) {
      return {
        isValid: false,
        error:
          "This promo code isn't valid for this room. Try another code or room",
      };
    }

    // Check expiration
    if (promotion.expires_at && new Date(promotion.expires_at) < new Date()) {
      return {
        isValid: false,
        error:
          "This promo code isn't valid for this room. Try another code or room",
      };
    }

    // Check usage limit
    if (promotion.used_count >= promotion.max_uses) {
      return {
        isValid: false,
        error:
          "This promo code isn't valid for this room. Try another code or room",
      };
    }

    // Valid code - return discount amount
    return {
      isValid: true,
      discountAmount: promotion.discount_amount || 0,
    };
  } catch (error) {
    console.error("Error validating promo code:", error);
    return {
      isValid: false,
      error:
        "This promo code isn't valid for this room. Try another code or room",
    };
  }
};
