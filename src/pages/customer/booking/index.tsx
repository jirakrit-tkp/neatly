import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { BookingLayout } from "@/components/customer/booking/BookingLayout";
import { BookingStepper } from "@/components/customer/booking/BookingStepper";
import { BookingSummary } from "@/components/customer/booking/BookingSummary";
import { BookingPolicies } from "@/components/customer/booking/BookingPolicies";
import { BasicInfoForm } from "@/components/customer/booking/forms/BasicInfoForm";
import { SpecialRequestForm } from "@/components/customer/booking/forms/SpecialRequestForm";
import { PaymentMethodForm } from "@/components/customer/booking/forms/PaymentMethodForm";
import { PaymentSuccessModal } from "@/components/customer/booking/modals/PaymentSuccessModal";
import { PaymentFailedModal } from "@/components/customer/booking/modals/PaymentFailedModal";
import {
  BookingStep,
  GuestInfo,
  SpecialRequest,
  PaymentMethod,
  CreditCardDetails,
  BookingFormData,
  BookingConfirmation,
  BookingError,
  BookingCalculation,
  Booking,
  Payment,
  RoomInfo,
} from "@/types/booking";
import { SPECIAL_REQUESTS } from "@/constants/booking";
import { PAYMENT_METHODS } from "@/constants/booking";
import {
  calculateBookingTotal,
  calculateNights,
  formatCurrency,
} from "@/utils/bookingUtils";
import { BookingService } from "@/services/bookingService";
import { PaymentService } from "@/services/paymentService";
import { PromotionService } from "@/services/promotionService";
import { useProfile } from "@/hooks/useProfile";
import Layout from "@/components/Layout";

interface RoomDetails {
  id: string;
  room_type: string;
  price: number;
  promotion_price?: number; // เพิ่ม field นี้
  guests: number;
  amenities: string[];
  main_image_url: string[];
}

export default function BookingPage() {
  const router = useRouter();
  const { room_type_id, checkIn, checkOut, guests, rooms } = router.query;
  const roomCount = parseInt(rooms as string) || 1;
  const { profile, isLoading: profileLoading } = useProfile();

  // Step management
  const [currentStep, setCurrentStep] = useState<BookingStep>("basic_info");
  const [loading, setLoading] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Room data
  const [availableRooms, setAvailableRooms] = useState<RoomDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetails | null>(null);

  // Form data
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    country: "",
  });

  const [specialRequests, setSpecialRequests] =
    useState<SpecialRequest[]>(SPECIAL_REQUESTS);
  const [additionalRequest, setAdditionalRequest] = useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("credit card");
  const [creditCardDetails, setCreditCardDetails] = useState<CreditCardDetails>(
    {
      cardNumber: "",
      cardOwner: "",
      expiryDate: "",
      cvc: "",
    }
  );

  const [promoCode, setPromoCode] = useState("");
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Sync promoCodeApplied with promoDiscount
  useEffect(() => {
    setPromoCodeApplied(promoDiscount > 0);
    console.log("🔍 PromoDiscount changed:", promoDiscount);
    console.log("🔍 PromoCodeApplied updated:", promoDiscount > 0);
  }, [promoDiscount]);

  // Modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState<BookingError | null>(null);
  const [bookingConfirmation, setBookingConfirmation] =
    useState<BookingConfirmation | null>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState({ minutes: 60, seconds: 0 });

  // Check room availability when component mounts
  useEffect(() => {
    const checkRoomAvailability = async () => {
      if (!room_type_id || !checkIn || !checkOut || !guests) {
        setRoomError("Missing required booking parameters");
        setRoomLoading(false);
        return;
      }

      try {
        setRoomLoading(true);
        setRoomError(null);

        const response = await fetch("/api/rooms/availability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_type_id: parseInt(room_type_id as string),
            check_in: checkIn,
            check_out: checkOut,
            guests: parseInt(guests as string),
            room_count: roomCount, // เพิ่ม room_count
          }),
        });

        const result = await response.json();

        if (result.success && result.data.available) {
          setAvailableRooms(result.data.roomDetails || []);
          // เลือกห้องแรกเป็น default
          if (result.data.roomDetails && result.data.roomDetails.length > 0) {
            setSelectedRoom(result.data.roomDetails[0]);
          }
        } else {
          setRoomError(
            result.message || "No rooms available for the selected dates"
          );
          // Redirect back to search result
          router.push("/customer/search-result");
        }
      } catch (error) {
        console.error("Error checking room availability:", error);
        setRoomError("Failed to check room availability");
      } finally {
        setRoomLoading(false);
      }
    };

    checkRoomAvailability();
  }, [room_type_id, checkIn, checkOut, guests, router]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.minutes === 0 && prev.seconds === 0) {
          router.push("/customer/search-result");
          return { minutes: 0, seconds: 0 };
        }

        if (prev.seconds === 0) {
          return { minutes: prev.minutes - 1, seconds: 59 };
        }

        return { minutes: prev.minutes, seconds: prev.seconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  // Update guest info when profile loads
  useEffect(() => {
    const updateGuestInfo = async () => {
      if (profile) {
        const { supabase } = await import("@/lib/supabaseClient");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const newGuestInfo = {
          firstName: profile.first_name || "",
          lastName: profile.last_name || "",
          email: user?.email || "",
          phone: profile.phone || "",
          dateOfBirth: profile.date_of_birth || "",
          country: profile.country || "",
        };

        setGuestInfo(newGuestInfo);
      } else if (!profileLoading) {
        const { supabase } = await import("@/lib/supabaseClient");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setGuestInfo((prev) => ({
            ...prev,
            email: user.email || "",
          }));
        }
      }
    };

    updateGuestInfo();
  }, [profile, profileLoading]);

  const steps = [
    { id: "basic_info" as BookingStep, label: "Basic Information", number: 1 },
    {
      id: "special_request" as BookingStep,
      label: "Special Request",
      number: 2,
    },
    { id: "payment_method" as BookingStep, label: "Payment Method", number: 3 },
  ];

  // Navigation handlers
  const handleNext = () => {
    switch (currentStep) {
      case "basic_info":
        setCurrentStep("special_request");
        break;
      case "special_request":
        setCurrentStep("payment_method");
        break;
      case "payment_method":
        handleConfirmBooking();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "basic_info":
        router.push("/customer/search-result");
        break;
      case "special_request":
        setCurrentStep("basic_info");
        break;
      case "payment_method":
        setCurrentStep("special_request");
        break;
    }
  };

  // Promotion code handler
  const handlePromoCodeApply = async () => {
    if (!promoCode.trim()) return;

    try {
      const result = await PromotionService.validatePromotionCode(
        promoCode,
        selectedRoom?.id || "",
        checkIn as string,
        checkOut as string
      );

      if (result.isValid && result.promotionCode) {
        const discount = PromotionService.calculateDiscount(
          calculation.subtotal + calculation.specialRequestsTotal,
          result.promotionCode
        );
        setPromoDiscount(discount);
        setPromoCodeApplied(true);
      } else {
        alert(result.error || "Invalid promotion code");
      }
    } catch (error) {
      console.error("Error applying promotion code:", error);
      alert("Failed to apply promotion code");
    }
  };

  // Booking confirmation handler
  const handleConfirmBooking = async () => {
    if (!selectedRoom) {
      alert("No room selected");
      return;
    }

    setLoading(true);

    try {
      const bookingData: BookingFormData = {
        guestInfo,
        roomId: selectedRoom.id,
        roomCount,
        roomInfo: {
          room_type: selectedRoom.room_type, // ประเภทห้อง
          price: (() => {
            // ถ้ามี promotion_price และ > 0 → ใช้ promotion_price
            if (
              selectedRoom.promotion_price &&
              selectedRoom.promotion_price > 0
            ) {
              console.log(
                "Room has promotion price:",
                selectedRoom.promotion_price
              );
              return selectedRoom.promotion_price;
            }

            // ถ้าไม่มี → ใช้ price
            console.log("Room using regular price:", selectedRoom.price);
            return selectedRoom.price;
          })(),
          promotion_price: selectedRoom.promotion_price,
          main_image_url: selectedRoom.main_image_url, // รูปภาพ
          amenities: selectedRoom.amenities, // สิ่งอำนวยความสะดวก
        } as Partial<RoomInfo>,
        checkIn: checkIn as string,
        checkOut: checkOut as string,
        guests: parseInt(guests as string),
        specialRequests: selectedSpecialRequests,
        additionalRequests: additionalRequest,
        paymentMethod,
        creditCardDetails:
          paymentMethod === PAYMENT_METHODS.CREDIT_CARD
            ? creditCardDetails
            : undefined,
        promoCode: promoCodeApplied ? promoCode : undefined,
      };

      // เพิ่ม debug logging ก่อน create booking
      console.log("=== DEBUG: Booking Data ===");
      console.log("bookingData:", bookingData);
      console.log("selectedRoom:", selectedRoom);
      console.log("guestInfo:", guestInfo);
      console.log("paymentMethod:", paymentMethod);
      console.log("creditCardDetails:", creditCardDetails);
      console.log("promoCodeApplied:", promoCodeApplied);
      console.log("promoCode:", promoCode);
      console.log("promoDiscount:", promoDiscount);
      console.log("promoCode in bookingData:", bookingData.promoCode);

      // Create booking
      const bookingResponse = await BookingService.createBooking(bookingData);

      // เพิ่ม debug logging หลัง create booking
      console.log("=== DEBUG: Booking Response ===");
      console.log("bookingResponse:", bookingResponse);

      if (bookingResponse.success && bookingResponse.data) {
        const booking = bookingResponse.data as Booking;
        console.log("=== DEBUG: Booking Created ===");
        console.log("booking:", booking);

        // Process payment
        const paymentResponse = await PaymentService.createPayment(
          booking.id,
          calculation.total,
          paymentMethod,
          paymentMethod === PAYMENT_METHODS.CREDIT_CARD
            ? creditCardDetails
            : undefined
        );

        if (paymentResponse.success && paymentResponse.data) {
          const payment = paymentResponse.data as Payment;

          // Process payment based on method
          let processResponse;
          if (paymentMethod === PAYMENT_METHODS.CREDIT_CARD) {
            processResponse = await PaymentService.processStripePayment(
              payment.id,
              "mock_stripe_payment_intent_id"
            );
          } else if (paymentMethod === PAYMENT_METHODS.CASH) {
            processResponse = await PaymentService.processCashPayment(
              payment.id
            );
          } else {
            processResponse = { success: true, data: payment };
          }

          if (processResponse.success) {
            // Show success modal
            setBookingConfirmation({
              bookingId: booking.id,
              confirmationNumber: `CONF-${booking.id.slice(-8).toUpperCase()}`,
              status: "confirmed",
              paymentStatus:
                paymentMethod === PAYMENT_METHODS.CREDIT_CARD
                  ? "completed"
                  : "pending",
              total: calculation.total,
              currency: "THB",
              checkIn: checkIn as string,
              checkOut: checkOut as string,
              roomType: selectedRoom.room_type,
              guestName: `${guestInfo.firstName} ${guestInfo.lastName}`,
              email: guestInfo.email,
            });
            setShowSuccessModal(true);
          } else {
            throw new Error("Payment processing failed");
          }
        } else {
          throw new Error("Payment creation failed");
        }
      } else {
        console.log("=== DEBUG: Booking Failed ===");
        console.log("Error:", bookingResponse.error);
        console.log("Message:", bookingResponse.message);
        throw new Error("Booking creation failed");
      }
    } catch (error) {
      console.error("Booking error:", error);
      setPaymentError({
        field: "payment",
        code: "PAYMENT_FAILED",
        message: error instanceof Error ? error.message : "Booking failed",
      });
      setShowFailedModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers
  const handleViewBooking = () => {
    setShowSuccessModal(false);
    router.push(`/customer/bookings/${bookingConfirmation?.bookingId}`);
  };

  const handleNewBooking = () => {
    setShowSuccessModal(false);
    router.push("/customer/search-result");
  };

  const handleRetryPayment = () => {
    setShowFailedModal(false);
    setPaymentError(null);
  };

  const handleTryDifferentMethod = () => {
    setShowFailedModal(false);
    setPaymentError(null);
    setCurrentStep("payment_method");
  };

  // Calculations
  const nights = calculateNights(checkIn as string, checkOut as string);
  const selectedSpecialRequests = specialRequests
    .filter((req) => req.selected)
    .map((req) => {
      const isBreakfast = req.name.toLowerCase().includes("breakfast");
      let calculatedPrice: number;

      if (isBreakfast) {
        // Breakfast: ราคา * จำนวนห้อง * จำนวนคืน
        calculatedPrice = (req.price || 0) * roomCount * nights;
      } else {
        // อื่นๆ: ราคา * จำนวนห้อง
        calculatedPrice = (req.price || 0) * roomCount;
      }

      return {
        ...req,
        calculated_price: calculatedPrice,
      };
    });
  const roomPrice = (() => {
    // ถ้ามี promotion_price และ > 0 → ใช้ promotion_price
    if (selectedRoom?.promotion_price && selectedRoom.promotion_price > 0) {
      return selectedRoom.promotion_price;
    }

    // ถ้าไม่มี → ใช้ price
    return selectedRoom?.price || 0;
  })();

  const calculation = calculateBookingTotal(
    roomPrice,
    nights,
    selectedSpecialRequests,
    roomCount,
    promoDiscount
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "basic_info":
        return (
          <BasicInfoForm
            guestInfo={guestInfo}
            onBack={() => router.push("/customer/search-result")}
            onNext={handleNext}
            disabled={loading}
            loading={loading}
          />
        );
      case "special_request":
        return (
          <SpecialRequestForm
            specialRequests={specialRequests}
            onSpecialRequestsChange={setSpecialRequests}
            additionalRequest={additionalRequest}
            onAdditionalRequestChange={setAdditionalRequest}
            onBack={handleBack}
            onNext={handleNext}
            disabled={loading}
            loading={loading}
          />
        );
      case "payment_method":
        return (
          <PaymentMethodForm
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            creditCardDetails={creditCardDetails}
            onCreditCardDetailsChange={setCreditCardDetails}
            promoCode={promoCode}
            onPromoCodeChange={setPromoCode}
            onPromoCodeApply={handlePromoCodeApply}
            promoCodeApplied={promoCodeApplied}
            promoDiscount={promoDiscount}
            onPromoDiscountUpdate={setPromoDiscount}
            onBack={handleBack}
            onConfirm={handleConfirmBooking}
            disabled={loading}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  // Loading state
  if (roomLoading || profileLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading booking information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (roomError || !selectedRoom) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Room Not Available
            </h2>
            <p className="text-gray-600 mb-4">{roomError}</p>
            <button
              onClick={() => router.push("/customer/search-result")}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Search
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <BookingLayout
        stepper={<BookingStepper currentStep={currentStep} steps={steps} />}
        sidebar={
          <div className="space-y-6">
            <BookingSummary
              roomInfo={{
                name: selectedRoom.room_type,
                price: (() => {
                  // ถ้ามี promotion_price และ > 0 → ใช้ promotion_price
                  if (
                    selectedRoom.promotion_price &&
                    selectedRoom.promotion_price > 0
                  ) {
                    return selectedRoom.promotion_price;
                  }

                  // ถ้าไม่มี → ใช้ price
                  return selectedRoom.price;
                })(),
                image: selectedRoom.main_image_url[0] || "/image/deluxe.jpg",
              }}
              checkIn={checkIn as string}
              checkOut={checkOut as string}
              guests={parseInt(guests as string)}
              roomCount={roomCount}
              calculation={calculation}
              specialRequests={selectedSpecialRequests.map((req) => ({
                name: req.name,
                price: req.price || 0,
                calculated_price: req.calculated_price || 0,
              }))}
              promotionCode={
                promoDiscount > 0
                  ? { code: promoCode, discount: promoDiscount }
                  : undefined
              }
              timeLeft={timeLeft}
            />
            <BookingPolicies />
          </div>
        }
      >
        <div className="space-y-8">{renderStepContent()}</div>

        {/* Modals */}
        <PaymentSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          confirmation={bookingConfirmation!}
          guests={parseInt(guests as string)}
          paymentMethod={paymentMethod}
          onViewBooking={handleViewBooking}
          onNewBooking={handleNewBooking}
        />

        <PaymentFailedModal
          isOpen={showFailedModal}
          onClose={() => setShowFailedModal(false)}
          error={paymentError!}
          onRetry={handleRetryPayment}
          onTryDifferentMethod={handleTryDifferentMethod}
        />
      </BookingLayout>
    </Layout>
  );
}
