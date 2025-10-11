import { supabase } from "@/lib/supabaseClient";
import {
  Booking,
  BookingFormData,
  BookingApiResponse,
  BookingValidationResult,
  BookingError,
  BookingSummary,
  RoomInfo,
  BookingStatus,
} from "@/types/booking";
import {
  BOOKING_ERROR_CODES,
  BOOKING_STATUSES,
  CURRENCY,
} from "@/constants/booking";
import {
  calculateBookingTotal,
  calculateNights,
  isBookingExpired,
} from "@/utils/bookingUtils";

export class BookingService {
  // ===== CREATE BOOKING =====
  static async createBooking(
    bookingData: BookingFormData
  ): Promise<BookingApiResponse> {
    try {
      console.log("=== BookingService Debug ===");
      console.log("Input bookingData:", bookingData);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log("=== User not authenticated ===");
        return {
          success: false,
          message: "User not authenticated",
          error: "AUTH_REQUIRED",
        };
      }

      console.log("=== Authenticated User ===");
      console.log("User ID:", user.id);
      console.log("User Email:", user.email);

      // 1. Validate booking data
      const validation = await this.validateBookingData(bookingData);
      console.log("Validation result:", validation);

      if (!validation.isValid) {
        console.log("Validation failed:", validation.errors);
        return {
          success: false,
          message: "Validation failed",
          error: validation.errors.map((e) => e.message).join(", "),
        };
      }

      // 2. Check room availability
      const isAvailable = await this.checkRoomAvailability(
        bookingData.roomId,
        bookingData.checkIn,
        bookingData.checkOut
      );
      console.log("Room availability:", isAvailable);

      if (!isAvailable) {
        console.log("Room not available");
        return {
          success: false,
          message: "Room not available",
          error: BOOKING_ERROR_CODES.ROOM_NOT_AVAILABLE,
        };
      }

      // 3. Calculate total amount
      const nights = calculateNights(bookingData.checkIn, bookingData.checkOut);
      const basePrice = bookingData.roomInfo?.price || 0;
      console.log("Calculation inputs:", {
        nights,
        basePrice,
        specialRequests: bookingData.specialRequests,
      });

      const calculation = calculateBookingTotal(
        basePrice,
        nights,
        bookingData.specialRequests,
        bookingData.promotionCode?.discount || 0
      );
      console.log("Calculation result:", calculation);

      // 4. Create booking record
      const bookingInsertData = {
        room_id: bookingData.roomId,
        customer_id: user.id,
        check_in_date: bookingData.checkIn,
        check_out_date: bookingData.checkOut,
        total_amount: calculation.total,
        status: BOOKING_STATUSES.PENDING,
        promo_code: bookingData.promoCode,
        special_requests: bookingData.specialRequests.filter(
          (req) => req.type === "special" && req.selected
        ), // ← เฉพาะ special requests
        standard_request:
          bookingData.specialRequests
            .filter((req) => req.type === "standard" && req.selected) // ← เฉพาะ standard ที่เลือก
            .map((req) => req.name), // ← ส่งเป็น array ตรงๆ
        additional_request: bookingData.additionalRequests,
        payment_method: bookingData.paymentMethod,
      };

      console.log("Booking insert data:", bookingInsertData);

      const { data: booking, error } = await supabase
        .from("bookings")
        .insert(bookingInsertData)
        .select()
        .single();

      if (error) {
        console.error("=== Supabase Error ===");
        console.error("Error details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);

        return {
          success: false,
          message: "Failed to create booking",
          error: error.message,
        };
      }

      console.log("=== Booking Created Successfully ===");
      console.log("Created booking:", booking);

      return {
        success: true,
        message: "Booking created successfully",
        data: booking,
      };
    } catch (error) {
      console.error("=== BookingService Catch Error ===");
      console.error("Error:", error);
      return {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===== GET BOOKING =====
  static async getBooking(bookingId: string): Promise<BookingApiResponse> {
    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms (
            id,
            room_type,
            price,
            promotion_price,
            main_image_url,
            amenities
          )
        `
        )
        .eq("id", bookingId)
        .single();

      if (error) {
        return {
          success: false,
          message: "Booking not found",
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Booking retrieved successfully",
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve booking",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===== GET USER BOOKINGS =====
  static async getUserBookings(
    customerId: string
  ): Promise<BookingApiResponse> {
    try {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          rooms (
            id,
            room_type,
            price,
            promotion_price,
            main_image_url
          )
        `
        )
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          success: false,
          message: "Failed to retrieve bookings",
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Bookings retrieved successfully",
        data: bookings,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to retrieve bookings",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===== UPDATE BOOKING STATUS =====
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus
  ): Promise<BookingApiResponse> {
    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          message: "Failed to update booking status",
          error: error.message,
        };
      }

      return {
        success: true,
        message: "Booking status updated successfully",
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to update booking status",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===== CANCEL BOOKING =====
  static async cancelBooking(bookingId: string): Promise<BookingApiResponse> {
    try {
      // 1. Get booking details
      const bookingResponse = await this.getBooking(bookingId);
      if (!bookingResponse.success || !bookingResponse.data) {
        return bookingResponse;
      }

      const booking = Array.isArray(bookingResponse.data)
        ? bookingResponse.data[0]
        : bookingResponse.data;

      if (!booking) {
        return {
          success: false,
          message: "Booking not found",
          error: "BOOKING_NOT_FOUND",
        };
      }

      // 2. Check if booking can be cancelled (within 24 hours)
      const canCancel = this.canCancelBooking(
        booking.check_in_date, // แก้ไขเป็น check_in_date
        booking.created_at
      );
      if (!canCancel) {
        return {
          success: false,
          message: "Booking cannot be cancelled within 24 hours of check-in",
          error: BOOKING_ERROR_CODES.INVALID_DATE_RANGE,
        };
      }

      // 3. Update booking status
      return await this.updateBookingStatus(
        bookingId,
        BOOKING_STATUSES.CANCELLED
      );
    } catch (error) {
      return {
        success: false,
        message: "Failed to cancel booking",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ===== VALIDATE BOOKING DATA =====
  static async validateBookingData(
    bookingData: BookingFormData
  ): Promise<BookingValidationResult> {
    const errors: BookingError[] = [];

    // Validate guest info
    if (!bookingData.guestInfo.firstName) {
      errors.push({
        field: "firstName",
        message: "First name is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!bookingData.guestInfo.lastName) {
      errors.push({
        field: "lastName",
        message: "Last name is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!bookingData.guestInfo.email) {
      errors.push({
        field: "email",
        message: "Email is required",
        code: "REQUIRED_FIELD",
      });
    }

    // Validate dates
    const checkInDate = new Date(bookingData.checkIn);
    const checkOutDate = new Date(bookingData.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      errors.push({
        field: "checkIn",
        message: "Check-in date cannot be in the past",
        code: BOOKING_ERROR_CODES.INVALID_DATE_RANGE,
      });
    }

    if (checkOutDate <= checkInDate) {
      errors.push({
        field: "checkOut",
        message: "Check-out date must be after check-in date",
        code: BOOKING_ERROR_CODES.INVALID_DATE_RANGE,
      });
    }

    // Validate guest count
    if (bookingData.guests < 1) {
      errors.push({
        field: "guests",
        message: "Guest count must be at least 1",
        code: BOOKING_ERROR_CODES.INVALID_GUEST_COUNT,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ===== CHECK ROOM AVAILABILITY =====
  static async checkRoomAvailability(
    roomId: string,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    try {
      const { data: conflictingBookings, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("room_id", roomId)
        .eq("status", BOOKING_STATUSES.CONFIRMED)
        .or(`and(check_in_date.lt.${checkOut},check_out_date.gt.${checkIn})`); // ใช้ check_in_date, check_out_date

      if (error) {
        console.error("Room availability check error:", error);
        return false;
      }

      return conflictingBookings.length === 0;
    } catch (error) {
      console.error("Room availability check error:", error);
      return false;
    }
  }

  // ===== CANCEL BOOKING CHECK =====
  static canCancelBooking(checkInDate: string, createdAt: string): boolean {
    const checkIn = new Date(checkInDate);
    const created = new Date(createdAt);
    const now = new Date();

    // Can cancel if more than 24 hours before check-in
    const hoursUntilCheckIn =
      (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilCheckIn > 24;
  }

  // ===== GENERATE BOOKING SUMMARY =====
  static generateBookingSummary(
    booking: Booking,
    roomInfo: RoomInfo
  ): BookingSummary {
    const nights = calculateNights(
      booking.check_in_date,
      booking.check_out_date
    );
    const specialRequestsTotal =
      booking.special_requests
        ?.filter((req) => req.selected && req.price)
        .reduce((sum, req) => sum + (req.price || 0), 0) || 0;

    return {
      roomType: roomInfo.room_type,
      roomImage: roomInfo.main_image_url[0], // ← เพิ่ม [0] เพื่อเอา element แรก
      checkIn: booking.check_in_date, // แก้ไขเป็น check_in_date
      checkOut: booking.check_out_date, // แก้ไขเป็น check_out_date
      guests: 2,
      nights,
      basePrice: roomInfo.price,
      specialRequestsTotal,
      promoDiscount: 0,
      total: booking.total_amount, // แก้ไขเป็น total_amount
      currency: CURRENCY,
    };
  }

  // ===== CHECK BOOKING EXPIRY =====
  static isBookingExpired(booking: Booking): boolean {
    return isBookingExpired(booking.created_at);
  }
}
