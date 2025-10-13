import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Image from "next/image";
import { useQuery } from "@/hooks/useQuery";
import LoadingScreen from "@/components/admin/LoadingScreen";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/admin/ui/Button";

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

  const handleCancel = () => {
    router.back();
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

  return (
    <Layout>
      <div className="min-h-screen bg-[#F7F7FB]">
        <div className="min-w-screen md:px-20 pt-25">
          {/* Header */}
          <h1 className="text-5xl md:text-7xl text-green-700 mb-10 md:mb-12 font-noto font-medium px-5 ">
            Request a Refund
          </h1>

          {/* Booking Card */}
          <div className="bg-[#F7F7FB] md:mt-30">
            <div className="flex flex-col md:flex-row border-b border-gray-500/50 pb-10 mb-10">
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
              </div>

              {/* Booking Details Section */}
              <div className="flex flex-col w-full">
                <div className="md:w-full p-5 md:p-0 md:pl-15">
                  {/* Room Type and Booking Date Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                    <h2 className="text-5xl md:text-4xl font-semibold text-black font-inter mt-2">
                      {booking?.rooms?.room_type}
                    </h2>
                    <p className="text-md text-gray-600 mt-3 md:mt-0">
                      Booking date:{" "}
                      {booking.booking_date
                        ? formatDate(booking.booking_date)
                        : "N/A"}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between">
                    {/* Original Dates */}
                    <div className="mt-10">
                      <p className="text-gray-700 text-md">
                        {formatDate(booking.check_in_date)} -{" "}
                        {formatDate(booking.check_out_date)}
                      </p>
                      <p className="text-md text-gray-800">
                        {booking?.rooms?.guests} guests
                      </p>
                    </div>

                    {/* Total Refund */}
                    <div className="mt-10">
                      <p>Total Refund</p>
                      <p className="font-semibold md:font-normal text-2xl md:text-sm">
                        THB {booking?.total_amount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:hidden flex flex-col mx-5">
                {/* Mobile Refund Booking Button */}
                <Button
                  loading={false}
                  text="Cancel and Refund this Booking"
                  onClick={() =>
                    router.push(
                      `/customer/customer-bookings/cancel/${bookingId}/refund-submitted`
                    )
                  }
                  className="bg-orange-600 py-3 text-white w-full md:w-50 font-semibold font-inter md:hidden"
                />

                {/* Mobile Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="md:hidden px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Desktop Cancel Button */}
            <div className="flex w-full justify-between">
              <button
                type="button"
                onClick={handleCancel}
                className="hidden md:block px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Desktop Cancel Booking Button */}
              <Button
                loading={false}
                text="Cancel and Refund this Booking"
                onClick={() =>
                  router.push(
                    `/customer/customer-bookings/cancel/${bookingId}/refund-submitted`
                  )
                }
                className="bg-orange-600 text-white w-80 font-semibold font-inter md:block hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
