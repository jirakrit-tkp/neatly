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
      {/* <Head>
        <title>Booking Confirmation - Neatly</title>
        <meta name="description" content="Your booking has been confirmed" />
      </Head> */}

      <Layout>
        <Navbar />

        <div className="min-h-screen bg-bg flex items-start justify-center ">
          <div className="w-full max-w-4xl px-4">
            {/* Booking Confirmation Box */}
            <div className="bg-green-800 rounded shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-8 text-center bg-green-800">
                <h1 className="text-5xl font-medium font-noto leading-tight text-white mb-4">
                  Thank you for booking
                </h1>
                <p className="text-green-400 text-sm font-medium">
                  We are looking forward to hosting you at our place.
                  <br />
                  We will send you more information about check-in and staying
                  at our Neatly
                  <br />
                  closer to your date of reservation.
                </p>
              </div>

              {/* Booking Details */}
              <div className="pt-6 pr-10 pb-10 pl-10 bg-green-700 gap-10">
                {/* Main Row: Dates/Guests on left, Check-in/out on right */}
                <div className="flex justify-between items-start bg-green-600 p-6 rounded">
                  {/* Left: Dates and Guests */}
                  <div>
                    <div className="text-white text-base font-inter font-semibold mb-2">
                      {formatDate(confirmation.checkIn)} -{" "}
                      {formatDate(confirmation.checkOut)}
                    </div>
                    <div className="text-white text-base font-inter">
                      {roomCount} Room{roomCount > 1 ? "s" : ""}, {guests} Guest
                      {guests > 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Right: Check-in/Check-out Times */}
                  <div className="flex gap-8">
                    <div className="text-center">
                      <div className="text-white text-base font-inter mb-1">
                        Check-in
                      </div>
                      <div className="text-white text-base font-inter">
                        After {getCheckInTime()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white text-base font-inter mb-1">
                        Check-out
                      </div>
                      <div className="text-white text-base font-inter">
                        Before {getCheckOutTime()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment and Summary */}
                <div className="bg-green-700">
                  {/* Payment Status */}
                  <div className="mt-10 flex justify-end">
                    <div className="text-green-300 text-base font-inter">
                      Payment success via{" "}
                      {paymentMethod === "credit card"
                        ? `Credit Card - *${
                            bookingData?.creditCardLastDigits || "888"
                          }`
                        : "Cash"}
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="space-y-4">
                    {/* Room */}
                    <div className="flex justify-between items-center py-2">
                      <div className="flex flex-col">
                        <span className="text-green-300 font-inter text-base">
                          {roomInfo.name}
                        </span>
                        <span className="text-green-200 text-xs font-inter">
                          ({roomCount} room{roomCount > 1 ? "s" : ""}
                          {calculation.nights > 1
                            ? `, ${calculation.nights} nights`
                            : `, ${calculation.nights} night`}
                          )
                        </span>
                      </div>
                      <span className="text-white text-base font-semibold">
                        {calculation.subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Special Requests */}
                    {specialRequests.map((request, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2"
                      >
                        <div className="flex flex-col">
                          <span className="text-green-300 font-inter text-base">
                            {request.name}
                          </span>
                          <span className="text-green-200 text-xs font-inter">
                            ({roomCount} room{roomCount > 1 ? "s" : ""}
                            {request.name.toLowerCase().includes("breakfast")
                              ? calculation.nights > 1
                                ? `, ${calculation.nights} nights`
                                : `, ${calculation.nights} night`
                              : ""}
                            )
                          </span>
                        </div>
                        <span className="text-white text-base font-semibold">
                          {request.calculated_price.toFixed(2)}
                        </span>
                      </div>
                    ))}

                    {/* Promotion Code */}
                    {promotionCode && promotionCode.discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-300 font-inter text-base">
                          Promotion ({promotionCode.code})
                        </span>
                        <span className="text-white text-base font-semibold">
                          -{promotionCode.discount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="border-t border-green-600 pt-6 mt-6">
                      <div className="flex justify-between items-center">
                        <span className="text-green-300 font-inter text-base">
                          Total
                        </span>
                        <span className="text-white text-xl font-inter font-semibold">
                          {formatCurrency(calculation.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-12 mb-12 flex gap-10 justify-center">
              <button
                onClick={handleViewBooking}
                className="py-4 text-orange-500 text-base font-inter font-semibold border-orange-500 "
              >
                Check Booking Detail
              </button>

              <button
                onClick={handleBackToHome}
                className="py-4 px-8 bg-orange-600 text-white text-base font-semibold rounded hover:bg-orange-600 transition-colors"
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
