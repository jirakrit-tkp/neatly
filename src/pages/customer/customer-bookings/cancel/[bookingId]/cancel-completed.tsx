import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
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
  const [error, setError] = useState("");

  const cancelledDate: string = formatDate(new Date().toString());
  // Fetch booking data using useQuery
  const { data: bookingResponse, loading } = useQuery<BookingApiResponse>(
    `/api/bookings/${bookingId}`
  );

  const booking = bookingResponse?.data;

  // Update form fields when booking data is loaded
  useEffect(() => {}, [booking]);

  if (!booking || loading) {
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
      <div className="bg-[#F7F7FB] flex flex-col justify-center items-center">
        <div className="bg-green-700 h-[580px] md:h-[500px] w-full md:w-[750px] mt-10 md:mt-20 md:rounded-md">
          <div className="bg-green-800 md:w-[750px] justify-center items-center text-center p-10 md:p-8 md:rounded-md">
            <h1 className="text-5xl md:text-4xl text-white font-noto mb-4">
              The Cancellation is Complete
            </h1>
            <p className="text-green-400 text-md md:text-sm">
              The cancellation is complete.
            </p>
            <p className="text-green-400 text-md md:text-sm">
              You will recieve an email with a detail of cancellation within 24
              hours.
            </p>
          </div>

          <div className="flex flex-col bg-green-600 m-5 md:m-10 p-5 rounded-md">
            <p className="text-white font-bold text-3xl md:text-xl">
              {booking?.rooms?.room_type}
            </p>

            <div className="mt-8 flex flex-col gap-y-2">
              <p className="text-white text-lg md:text-md font-semibold">
                {formatDate(booking.check_in_date)} -{" "}
                {formatDate(booking.check_out_date)}
              </p>
              <p className="text-lg md:text-md text-white">
                {booking?.rooms?.guests} Guests
              </p>
            </div>

            <div className="flex flex-col mt-10 gap-y-2">
              <p className="text-green-400">
                Booking date: {formatDate(booking.booking_date)}
              </p>
              <p className="text-green-400">
                Cancellation date: {cancelledDate}
              </p>
            </div>
          </div>
        </div>
        <Button
          loading={false}
          text="Back to Home"
          onClick={() => router.push("/")}
          className="bg-orange-600 text-white w-50 h-15 font-semibold font-inter my-10"
        />
      </div>
    </Layout>
  );
}
