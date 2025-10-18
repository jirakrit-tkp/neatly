import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import Navbar from "@/components/Navbar";
import ExclamationIcon from "@/components/customer/icons/ExclamationIcon";

interface PaymentFailedData {
  error: {
    field: string;
    code: string;
    message: string;
  };
  bookingData?: unknown;
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
    // Clear payment failed data and go back to payment step
    localStorage.removeItem("paymentFailedData");
    router.push("/customer/booking?step=payment_method");
  };

  const handleBackToPayment = () => {
    // Clear payment failed data and go back to booking page
    localStorage.removeItem("paymentFailedData");
    router.back();
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

        <div className="bg-bg flex flex-col items-center justify-start">
          <div className="w-[738px] flex justify-center gap-8 pt-16 px-6">
            {/* Main Payment Failed Modal */}
            <div className="">
              <div className="bg-orange-100  pt-16 pr-6 pb-22 pl-6 gap-6">
                {/* Error Icon */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center text-orange-600">
                    <ExclamationIcon size={64} />
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h1 className="text-5xl font-noto font-medium leading-tight text-orange-600 mb-6">
                    Payment failed
                  </h1>
                  <p className="text-orange-500 text-sm">
                    There seems to be an issue with your card. Please check your
                    card details and try again later, or use a different payment
                    method
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-10 justify-center mt-12 mb-12">
            <button
              onClick={handleRetryPayment}
              className="py-2 px-1 text-orange-500 text-base font-semibold"
            >
              Retry payment
            </button>

            <button
              onClick={handleBackToPayment}
              className="px-8 py-4 bg-orange-600 text-white text-base font-semibold rounded"
            >
              Back to Payment details
            </button>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default PaymentFailedPage;
