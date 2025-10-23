import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import Navbar from "@/components/Navbar";
import ExclamationIcon from "@/components/customer/icons/ExclamationIcon";

interface BookingData {
  roomInfo?: {
    id?: string;
    name?: string;
    price?: number;
  };
  checkInDate?: string;
  checkOutDate?: string;
  guests?: number;
  roomCount?: number;
  guestInfo?: unknown;
  standardRequests?: unknown[];
  specialRequests?: unknown[];
  paymentMethod?: string;
  creditCardDetails?: unknown;
  calculation?: unknown;
}

interface PaymentFailedData {
  error: {
    field: string;
    code: string;
    message: string;
  };
  bookingData?: BookingData;
  paymentMethod?: string;
}

const PaymentFailedPage: React.FC = () => {
  const router = useRouter();
  const [paymentFailedData, setPaymentFailedData] =
    useState<PaymentFailedData | null>(null);

  useEffect(() => {
    // Get payment failed data from localStorage or router state
    const storedData = localStorage.getItem("paymentFailedData");
    console.log("🔍 Stored payment failed data:", storedData);

    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("🔍 Parsed payment failed data:", parsedData);
        setPaymentFailedData(parsedData);
      } catch (error) {
        console.error("🔍 Error parsing payment failed data:", error);
        router.push("/customer/search-result");
      }
    } else {
      // Redirect to search if no payment failed data
      router.push("/customer/search-result");
    }
  }, [router]);

  const handleRetryPayment = () => {
    // Get complete booking data from paymentFailedData
    const bookingData = paymentFailedData?.bookingData;

    console.log("🔍 Retry payment - booking data:", bookingData);

    if (!bookingData) {
      console.error("🔍 No booking data available for retry");
      return;
    }

    // Clear payment failed data
    localStorage.removeItem("paymentFailedData");

    // Store complete booking data for retry
    localStorage.setItem("bookingData", JSON.stringify(bookingData));

    // Build URL with required parameters for retry
    const params = new URLSearchParams();
    params.set("step", "payment_method");
    params.set("retry", "true"); // Flag for auto-retry
    params.set("restore_data", "true"); // Flag to restore all data

    // Add required parameters - use room_type_id from original search, not room.id
    // For now, let's use a default room_type_id since we don't have the original search parameters
    params.set("room_type_id", "4"); // Default room type ID

    if (bookingData?.checkInDate) {
      params.set("checkIn", bookingData.checkInDate);
    }
    if (bookingData?.checkOutDate) {
      params.set("checkOut", bookingData.checkOutDate);
    }
    if (bookingData?.guests) {
      params.set("guests", bookingData.guests.toString());
    }
    if (bookingData?.roomCount) {
      params.set("rooms", bookingData.roomCount.toString());
    }

    console.log(
      "🔍 Retry payment - redirecting to:",
      `/customer/booking?${params.toString()}`
    );
    router.push(`/customer/booking?${params.toString()}`);
  };

  const handleBackToPayment = () => {
    // Get complete booking data from paymentFailedData
    const bookingData = paymentFailedData?.bookingData;

    // Clear payment failed data
    localStorage.removeItem("paymentFailedData");

    // Store complete booking data for restoration
    if (bookingData) {
      localStorage.setItem("bookingData", JSON.stringify(bookingData));
    }

    // Build URL with required parameters to go back to payment method step
    const params = new URLSearchParams();
    params.set("step", "payment_method");
    params.set("restore_data", "true"); // Flag to restore all data

    // Add required parameters if available
    if (bookingData?.roomInfo?.id) {
      params.set("room_type_id", bookingData.roomInfo.id.toString());
    }
    if (bookingData?.checkInDate) {
      params.set("checkIn", bookingData.checkInDate);
    }
    if (bookingData?.checkOutDate) {
      params.set("checkOut", bookingData.checkOutDate);
    }
    if (bookingData?.guests) {
      params.set("guests", bookingData.guests.toString());
    }
    if (bookingData?.roomCount) {
      params.set("rooms", bookingData.roomCount.toString());
    }

    router.push(`/customer/booking?${params.toString()}`);
  };

  if (!paymentFailedData) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const { error } = paymentFailedData;

  return (
    <>
      <Head>
        <title>Payment Failed - Neatly</title>
        <meta name="description" content="Payment processing failed" />
      </Head>

      <Layout>
        <Navbar />

        <div className="bg-bg flex items-start justify-center">
          <div className="w-full max-w-[738px] px-0 md:px-4">
            {/* Main Payment Failed Modal */}
            <div className="flex flex-col items-center">
              <div className="bg-orange-100 pt-[88px] pr-6 pb-[88px] pl-6 gap-6 rounded-none md:rounded h-[594px] md:h-auto">
                {/* Content Container */}
                <div className="flex flex-col items-center justify-center h-full">
                  {/* Error Icon */}
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto flex items-center justify-center text-orange-600">
                      <ExclamationIcon size={64} />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-6">
                    <h1 className="text-[44px] font-noto font-medium leading-[125%] tracking-[-2%] text-orange-600 mb-6">
                      Payment failed
                    </h1>
                    <p className="text-sm font-inter font-medium leading-[150%] tracking-[-2%] text-orange-500">
                      There seems to be an issue with your card. Please check
                      your card details and try again later, or use a different
                      payment method
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 md:mt-10 mb-6 md:mb-12 flex flex-col sm:flex-row gap-4 sm:gap-10 justify-center items-center">
                <button
                  onClick={handleRetryPayment}
                  className="order-2 sm:order-1 w-full max-w-[327px] sm:w-auto px-8 py-4 text-base font-inter font-semibold text-orange-500 rounded"
                >
                  Retry payment
                </button>

                <button
                  onClick={handleBackToPayment}
                  className="order-1 sm:order-2 w-full max-w-[327px] sm:w-auto px-8 py-4 text-base font-semibold text-white bg-orange-600 rounded transition-colors hover:bg-orange-700"
                >
                  Back to Payment details
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default PaymentFailedPage;
