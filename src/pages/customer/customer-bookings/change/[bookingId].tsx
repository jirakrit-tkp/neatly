import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import Image from "next/image";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  roomImage: string;
  bookingDate: string;
}

export default function ChangeBookingPage() {
  const router = useRouter();
  const { bookingId } = router.query;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setLoading(true);

      // Mock booking data - replace with actual API call
      const mockBooking: Booking = {
        id: bookingId as string,
        checkIn: "2022-10-19",
        checkOut: "2022-10-20",
        roomType: "Superior Garden View",
        roomImage: "/images/garden-view.jpg", // Replace with actual image
        bookingDate: "Tue, 18 Oct 2022",
      };

      setBooking(mockBooking);
      setCheckIn(mockBooking.checkIn);
      setCheckOut(mockBooking.checkOut);
      setLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    console.log("Updating booking:", {
      id: booking.id,
      checkIn,
      checkOut,
    });

    alert("Booking updated successfully!");
    router.push("/booking-history");
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </Layout>
    );
  }

  if (!booking) {
    return (
      <Layout>
        <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
          <p className="text-red-500">Booking not found.</p>
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
                    src="https://images.unsplash.com/photo-1566073771259-6a8506099945"
                    alt="room-image"
                    fill
                    className="block object-cover"
                  />
                </div>

                {/* Cancel Button */}
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
              <div className="md:w-full p-5 md:pl-15">
                <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                  <h2 className="text-3xl md:text-4xl font-bold text-black font-inter mt-2">
                    {booking.roomType}
                  </h2>
                  <p className="text-md text-gray-600">
                    Booking date: {booking.bookingDate}
                  </p>
                </div>

                {/* Original Dates */}
                <div className="mb-8">
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    Original Date
                  </p>
                  <p className="text-gray-700 text-md">
                    {new Date(booking.checkIn).toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(booking.checkOut).toLocaleDateString("en-US", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Change Date Form */}
                <form
                  onSubmit={handleSubmit}
                  className="bg-white px-5 pt-5 pb-2 rounded-lg"
                >
                  <p className="text-lg font-bold text-gray-800 mb-4">
                    Change Date
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Check In */}
                    <div>
                      <label className="block text-lg text-gray-800 mb-2">
                        Check In
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    {/* Check Out */}
                    <div>
                      <label className="block text-lg text-gray-800 mb-2">
                        Check Out
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </form>
                {/* Confirm change date button */}
                <div className="flex justify-end mt-10">
                  <button
                    type="submit"
                    className="flex-1 md:flex-none px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
                  >
                    Confirm Change Date
                  </button>
                </div>
                <div className="flex h-full justify-center items-center mt-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="md:hidden px-6 py-3 text-orange-600 hover:text-orange-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
