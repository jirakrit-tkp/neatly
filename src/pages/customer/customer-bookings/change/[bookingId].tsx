import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Image from "next/image";
import { useQuery } from "@/hooks/useQuery";
import { formatDate } from "@/utils/formatDate";

import ChangeDateForm from "@/components/booking/changeDateForm";
export default function ChangeBookingPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Fetch booking data using useQuery
  const { data: bookingResponse } = useQuery<BookingApiResponse>(
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
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
      router.push("/booking-history");
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Failed to update booking. Please try again.");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </Layout>
    );
  }

  if (error || !booking) {
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
                      booking.rooms?.main_image_url[0] ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945"
                    }
                    alt={booking.rooms?.room_type || "room-image"}
                    fill
                    className="block object-cover"
                  />
                </div>

                {/* Desktop Cancel Button */}
                <div className="flex h-full">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="hidden md:block px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Booking Details */}
              <div className="md:w-full p-5 md:p-0 md:pl-15">
                <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-black font-inter mt-2">
                    {booking.rooms?.room_type}
                  </h2>
                  <p className="text-md text-gray-600">
                    Booking date:{" "}
                    {booking?.booking_date
                      ? formatDate(booking.booking_date)
                      : "N/A"}
                  </p>
                </div>

                {/* Original Dates */}
                <div className="mb-8">
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    Original Date
                  </p>
                  <p className="text-gray-700 text-md">
                    {formatDate(booking.check_in_date)} -{" "}
                    {formatDate(booking.check_out_date)}
                  </p>
                </div>

                {/* Change Date Form Component */}
                <ChangeDateForm
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onCheckInChange={setCheckIn}
                  onCheckOutChange={setCheckOut}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
