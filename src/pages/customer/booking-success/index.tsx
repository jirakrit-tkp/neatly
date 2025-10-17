import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { BookingConfirmation } from "@/types/booking";
import { formatCurrency, formatDate } from "@/utils/bookingUtils";
import Layout from "@/components/Layout";
import Navbar from "@/components/Navbar";

interface BookingSuccessData {
  confirmation: BookingConfirmation;
  roomInfo: {
    name: string;
    price: number;
    image?: string;
  };
  guests: number;
  paymentMethod: string;
  roomCount: number;
  calculation: {
    subtotal: number;
    specialRequestsTotal: number;
    promotionDiscount: number;
    total: number;
    nights: number;
  };
  standardRequests: Array<{
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }>;
  specialRequests: Array<{
    name: string;
    price: number;
    calculated_price: number;
  }>;
  promotionCode?: {
    code: string;
    discount: number;
  };
  creditCardLastDigits?: string;
}

const BookingSuccessPage: React.FC = () => {
  const router = useRouter();
  const [bookingData, setBookingData] = useState<BookingSuccessData | null>(
    null
  );

  useEffect(() => {
    // Get booking data from localStorage or router state
    const storedData = localStorage.getItem("bookingSuccessData");
    console.log("🔍 Stored data from localStorage:", storedData);

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("🔍 Parsed booking data:", parsedData);
        setBookingData(parsedData);
      } catch (error) {
        console.error("🔍 Error parsing booking data:", error);
        router.push("/");
      }
    } else {
      // Redirect to home if no booking data
      router.push("/");
    }
  }, [router]);

  const handleViewBooking = () => {
    router.push("/customer/booking-history");
  };

  const handleBackToHome = () => {
    router.push("/");
  };

  if (!bookingData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking confirmation...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const {
    confirmation,
    roomInfo = { name: "Unknown Room", price: 0 },
    guests = 1,
    paymentMethod = "credit card",
    roomCount = 1,
    calculation = {
      subtotal: 0,
      specialRequestsTotal: 0,
      promotionDiscount: 0,
      total: 0,
      nights: 1,
    },
    standardRequests = [],
    specialRequests = [],
    promotionCode,
  } = bookingData;

  // Dynamic check-in/check-out times based on standard requests
  const getCheckInTime = () => {
    const earlyCheckIn = standardRequests.find(
      (req) => req.id === "early_checkin" && req.selected
    );
    return earlyCheckIn ? "12:00 PM" : "2:00 PM";
  };

  const getCheckOutTime = () => {
    const lateCheckOut = standardRequests.find(
      (req) => req.id === "late_checkout" && req.selected
    );
    return lateCheckOut ? "4:00 PM" : "12:00 PM";
  };

  return (
    <>
      <Head>
        <title>Booking Confirmation - Neatly</title>
        <meta name="description" content="Your booking has been confirmed" />
      </Head>

      <Layout>
        <Navbar />

        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {/* Booking Confirmation Box */}
            <div className="bg-green-700 rounded-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-8 text-center bg-green-700">
                <h1 className="text-3xl font-serif text-white mb-4">
                  Thank you for booking!
                </h1>
                <p className="text-green-100 text-lg leading-relaxed">
                  We are looking forward to hosting you at our place. We will
                  send you more information about check-in and staying at our
                  Neatly closer to your date of reservation.
                </p>
              </div>

              {/* Booking Details */}
              <div className="p-8 bg-green-600">
                {/* Dates, Rooms and Guests */}
                <div className="mb-6">
                  <div className="text-white text-xl font-semibold mb-2">
                    {formatDate(confirmation.checkIn)} -{" "}
                    {formatDate(confirmation.checkOut)}
                  </div>
                  <div className="text-green-100 text-lg">
                    {roomCount} Room{roomCount > 1 ? "s" : ""}, {guests} Guest
                    {guests > 1 ? "s" : ""}
                  </div>
                </div>

                {/* Check-in/Check-out Times */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                  <div className="text-center">
                    <div className="text-green-100 text-sm mb-1">Check-in</div>
                    <div className="text-white text-lg font-semibold">
                      After {getCheckInTime()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-100 text-sm mb-1">Check-out</div>
                    <div className="text-white text-lg font-semibold">
                      Before {getCheckOutTime()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment and Summary */}
              <div className="p-8 bg-green-700">
                {/* Payment Status */}
                <div className="mb-6">
                  <div className="text-white text-lg">
                    Payment success via{" "}
                    {paymentMethod === "credit card"
                      ? `Credit Card - *${
                          bookingData?.creditCardLastDigits || "888"
                        }`
                      : "Cash"}
                  </div>
                </div>

                {/* Booking Summary */}
                <div className="space-y-3">
                  {/* Room */}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-white text-lg">
                        {roomInfo.name}
                      </span>
                      <span className="text-green-200 text-sm">
                        ({roomCount} room{roomCount > 1 ? "s" : ""}
                        {calculation.nights > 1
                          ? `, ${calculation.nights} nights`
                          : `, ${calculation.nights} night`}
                        )
                      </span>
                    </div>
                    <span className="text-white text-lg font-semibold">
                      {formatCurrency(calculation.subtotal)}
                    </span>
                  </div>

                  {/* Special Requests */}
                  {specialRequests.map((request, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <div className="flex flex-col">
                        <span className="text-white text-lg">
                          {request.name}
                        </span>
                        <span className="text-green-200 text-sm">
                          ({roomCount} room{roomCount > 1 ? "s" : ""}
                          {request.name.toLowerCase().includes("breakfast")
                            ? calculation.nights > 1
                              ? `, ${calculation.nights} nights`
                              : `, ${calculation.nights} night`
                            : ""}
                          )
                        </span>
                      </div>
                      <span className="text-white text-lg font-semibold">
                        {formatCurrency(request.calculated_price)}
                      </span>
                    </div>
                  ))}

                  {/* Promotion Code */}
                  {promotionCode && promotionCode.discount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white text-lg">
                        Promotion ({promotionCode.code})
                      </span>
                      <span className="text-white text-lg font-semibold">
                        -{formatCurrency(promotionCode.discount)}
                      </span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="border-t border-green-600 pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white text-xl font-semibold">
                        Total
                      </span>
                      <span className="text-white text-2xl font-bold">
                        THB {formatCurrency(calculation.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 text-center space-y-4">
              <button
                onClick={handleViewBooking}
                className="block w-full py-3 px-6 text-orange-500 text-lg font-semibold border-2 border-orange-500 rounded-lg hover:bg-orange-50 transition-colors"
              >
                Check Booking Detail
              </button>

              <button
                onClick={handleBackToHome}
                className="block w-full py-3 px-6 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default BookingSuccessPage;
