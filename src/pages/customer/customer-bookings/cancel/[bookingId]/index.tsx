import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Image from "next/image";
import { useQuery } from "@/hooks/useQuery";
import LoadingScreen from "@/components/admin/LoadingScreen";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { formatDate } from "@/utils/formatDate";
import { Button } from "@/components/admin/ui/Button";
import { toast } from "sonner";

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
  const [isCancelling, setIsCancelling] = useState(false);

  // Only fetch when bookingId is available
  const shouldFetch =
    router.isReady && bookingId && typeof bookingId === "string";

  // Fetch booking data using useQuery
  const {
    data: bookingResponse,
    loading,
    error: queryError,
  } = useQuery<BookingApiResponse>(
    shouldFetch ? `/api/bookings/${bookingId}` : ""
  );

  const booking = bookingResponse?.data;

  // Handle query errors
  useEffect(() => {
    if (queryError) {
      setError("Failed to load booking data");
    }
  }, [queryError]);

  // Handle case where booking wasn't found
  useEffect(() => {
    if (!loading && shouldFetch && bookingResponse && !booking) {
      setError("Booking not found");
    }
  }, [loading, shouldFetch, bookingResponse, booking]);

  // Update form fields when booking data is loaded
  useEffect(() => {
    if (booking) {
      setCheckIn(booking.check_in_date);
      setCheckOut(booking.check_out_date);
    }
  }, [booking]);

  const handleCancelBooking = async () => {
    if (!booking) return;

    setIsCancelling(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
          cancellation_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel booking");
      }

      toast.success("Booking cancelled successfully!");
      setIsModalOpen(false);

      // Delay redirect to show success message
      setTimeout(() => {
        router.push(
          `/customer/customer-bookings/cancel/${bookingId}/cancel-completed`
        );
      }, 1000);
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel booking. Please try again."
      );
      setIsModalOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
  };

  const handleCancel = () => {
    router.push("/customer/booking-history");
  };

  // Show loading while router is initializing OR data is loading
  if (!router.isReady || loading || !shouldFetch) {
    return (
      <Layout>
        <LoadingScreen />
      </Layout>
    );
  }

  // Show error state properly
  if (error || queryError) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 text-xl mb-4">
              {error || "Error loading booking."}
            </p>
            <button
              onClick={() => router.push("/customer/booking-history")}
              className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Back to Booking History
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show not found state
  if (!booking) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-xl mb-4">Booking not found.</p>
            <button
              onClick={() => router.push("/customer/booking-history")}
              className="px-6 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Back to Booking History
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#F7F7FB]">
        <div className="min-w-screen md:px-20 pt-25">
          {/* Header */}
          <h1 className="text-6xl md:text-7xl text-green-700 mb-10 md:mb-12 font-noto font-medium px-5 ">
            Cancel Booking
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
                      {booking.created_at
                        ? formatDate(booking.created_at)
                        : "N/A"}
                    </p>
                  </div>

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

                  <p className="text-[#B61615] mt-10">
                    Cancellation of the booking now will not be able to request
                    a refund
                  </p>
                </div>
              </div>

              <div className="md:hidden flex flex-col mx-5">
                {/* Mobile Cancel Booking Button */}
                <Button
                  loading={isCancelling}
                  text="Cancel this Booking"
                  onClick={() => setIsModalOpen(true)}
                  className="bg-orange-600 py-3 text-white w-full md:w-50 font-semibold font-inter md:hidden"
                />

                {/* Mobile Cancel Button */}
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="md:hidden px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
              {/* Confirm Modal */}
              {isModalOpen && (
                <ConfirmModal
                  open={isModalOpen}
                  title="Cancel Booking"
                  message="Are you sure you want to cancel this booking?"
                  confirmText="Yes, I want to cancel"
                  cancelText="No, I don't"
                  onConfirm={handleCancelBooking}
                  onClose={() => setIsModalOpen(false)}
                />
              )}
            </div>

            {/* Desktop Cancel Button */}
            <div className="flex w-full justify-between">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="hidden md:block px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              {/* Desktop Cancel Booking Button */}
              <Button
                loading={isCancelling}
                text="Cancel this Booking"
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-600 text-white w-50 font-semibold font-inter md:block hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
