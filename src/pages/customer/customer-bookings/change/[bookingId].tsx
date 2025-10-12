import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Image from "next/image";
import { useQuery } from "@/hooks/useQuery";
import ChangeDateForm from "@/components/booking/ChangeDateForm";
import OriginalBookingDetail from "@/components/booking/OriginalBookingDetail";
import LoadingScreen from "@/components/admin/LoadingScreen";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { calculateNights } from "@/utils/dateUtils";

interface RoomforBookings {
  guests: number;
  bed_type: string;
  room_type: string;
  main_image_url: string[];
}

interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  customer_id: string;
  status: "pending" | "confirmed" | "cancelled" | "refunded";
  booking_date: string;
  payment_method: string;
  check_in_date: string;
  check_out_date: string;
  total_amount: number;
  special_requests?: string[];
  additional_request?: string[];
  standard_request?: string[];
  created_at: string;
  rooms?: RoomforBookings | undefined;
}

type BookingApiResponse = {
  success: boolean;
  message: string;
  data?: Booking | null;
  error?: string;
};

export default function ChangeBookingPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Fetch booking data using useQuery
  const { data: bookingResponse, loading } = useQuery<BookingApiResponse>(
    `/api/bookings/${bookingId}`
  );

  const booking = bookingResponse?.data;

  // Update form fields when booking data is loaded
  useEffect(() => {
    if (booking) {
      setCheckIn(booking.check_in_date);
      setCheckOut(booking.check_out_date);
    }
  }, [booking]);

  // Validate number of nights whenever dates change
  useEffect(() => {
    if (booking && checkIn && checkOut) {
      const originalNights = calculateNights(
        booking.check_in_date,
        booking.check_out_date
      );
      const newNights = calculateNights(checkIn, checkOut);

      if (newNights !== originalNights) {
        setValidationError(
          `Number of nights must match the original booking (${originalNights} ${
            originalNights === 1 ? "night" : "nights"
          }). Currently selected: ${newNights} ${
            newNights === 1 ? "night" : "nights"
          }.`
        );
      } else {
        setValidationError("");
      }
    }
  }, [checkIn, checkOut, booking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    // Final validation before submission
    const originalNights = calculateNights(
      booking.check_in_date,
      booking.check_out_date
    );
    const newNights = calculateNights(checkIn, checkOut);

    if (newNights !== originalNights) {
      alert(
        `Cannot update booking: Number of nights must match the original booking (${originalNights} ${
          originalNights === 1 ? "night" : "nights"
        }).`
      );
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          check_in_date: checkIn,
          check_out_date: checkOut,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking");
      }

      alert("Booking updated successfully!");
      router.push("/customer/booking-history");
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking. Please try again.");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleOpenModal = () => {
    // Prevent opening modal if validation fails
    if (validationError) {
      return;
    }
    setIsModalOpen(true);
  };

  if (!booking) {
    return (
      <Layout>
        <LoadingScreen />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <p className="text-red-500">
            {error ? "Error loading booking." : "Booking not found."}
          </p>
        </div>
      </Layout>
    );
  }

  const originalNights = calculateNights(
    booking.check_in_date,
    booking.check_out_date
  );

  return (
    <Layout>
      <div className="min-h-screen bg-[#F7F7FB]">
        <div className="min-w-screen md:px-20 pt-25">
          {/* Header */}
          <h1 className="text-6xl md:text-7xl text-green-700 mb-5 md:mb-12 font-noto font-medium px-5 ">
            <span>Change </span>
            <br className="md:hidden" />
            <span>Check-in </span>
            <br className="hidden md:block" />
            <span>and Check-out Date</span>
          </h1>

          {/* Booking Card */}
          <div className="bg-[#F7F7FB] md:mt-30">
            <div className="flex flex-col md:flex-row">
              {/* Room Image */}
              <div>
                {/* Room Image */}
                <div className="w-full md:w-[370px] h-50 md:h-[200px] relative md:rounded-md overflow-hidden">
                  <Image
                    src={
                      booking?.rooms?.main_image_url[0] ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945"
                    }
                    alt={booking?.rooms?.room_type || "room-image"}
                    fill
                    className="block object-cover"
                  />
                </div>

                {/* Desktop Cancel Button */}
                <div className="flex h-full">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="hidden md:block px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Booking Details Section */}
              <div className="md:w-full">
                {/* Original Booking Detail Component */}
                {booking && (
                  <OriginalBookingDetail
                    roomType={booking?.rooms?.room_type}
                    bookingDate={booking?.booking_date}
                    checkInDate={booking?.check_in_date}
                    checkOutDate={booking?.check_out_date}
                  />
                )}

                {/* Validation Error Message */}
                {validationError && (
                  <div className="p-5 md:p-0 md:pl-15 mb-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                      {validationError}
                    </div>
                  </div>
                )}

                {/* Display original nights info */}
                <div className="p-5 md:p-0 md:pl-15 mb-4">
                  <p className="text-gray-600 text-sm">
                    Original booking: {originalNights}{" "}
                    {originalNights === 1 ? "night" : "nights"}
                  </p>
                </div>

                {isModalOpen && (
                  <ConfirmModal
                    open={isModalOpen}
                    title="Change Date"
                    message="Are you sure you want to change your check-in and check-out date?"
                    confirmText="Yes, I want to change"
                    cancelText="No, I don't"
                    onConfirm={handleSubmit}
                    onClose={() => setIsModalOpen(false)}
                  />
                )}

                {/* Change Date Form Component - wrapped in padding div */}
                <div className="p-5 md:p-0 md:pl-15">
                  <ChangeDateForm
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onCheckInChange={setCheckIn}
                    onCheckOutChange={setCheckOut}
                    onSubmit={handleSubmit}
                    onClick={handleOpenModal}
                    onCancel={handleCancel}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
