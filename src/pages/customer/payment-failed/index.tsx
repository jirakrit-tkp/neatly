import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "@/components/Layout";
import Navbar from "@/components/Navbar";

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

        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-8">
            {/* Main Payment Failed Modal */}
            <div className="w-full lg:w-2/3">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 shadow-lg">
                {/* Error Icon */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-orange-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h1 className="text-3xl font-serif text-orange-600 mb-4">
                    Payment failed
                  </h1>
                  <p className="text-gray-700 text-lg leading-relaxed">
                    There seems to be an issue with your card. Please check your
                    card details and try again later, or use a different payment
                    method.
                  </p>
                </div>

                {/* Error Details */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-red-800 mb-2">
                      Error Details:
                    </h3>
                    <p className="text-sm text-red-700">
                      <strong>Code:</strong> {error.code}
                      <br />
                      <strong>Message:</strong> {error.message}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handleRetryPayment}
                    className="px-6 py-3 text-orange-600 text-lg font-semibold border-2 border-orange-600 rounded-lg hover:bg-orange-50 transition-colors"
                  >
                    Retry payment
                  </button>

                  <button
                    onClick={handleBackToPayment}
                    className="px-6 py-3 bg-orange-500 text-white text-lg font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Back to Payment details
                  </button>
                </div>
              </div>
            </div>

            {/* Instructions Sidebar */}
            <div className="w-full lg:w-1/3">
              <div className="bg-blue-500 text-white rounded-lg p-6 h-fit">
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="text-blue-200 mr-3">•</span>
                    <div>
                      <p className="text-white font-medium">
                        Tap Retry payment
                      </p>
                      <p className="text-blue-100 text-sm mt-1">
                        ลองจ่ายอีกครั้งด้วยบัตรเดิม
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="text-blue-200 mr-3">•</span>
                    <div>
                      <p className="text-white font-medium">
                        Tap Back to Payment details
                      </p>
                      <p className="text-blue-100 text-sm mt-1">
                        กลับไปที่หน้า Payment method
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-600 rounded-lg">
                  <h4 className="font-semibold mb-2">Common Issues:</h4>
                  <ul className="text-sm text-blue-100 space-y-1">
                    <li>• Incorrect card number</li>
                    <li>• Expired card</li>
                    <li>• Insufficient funds</li>
                    <li>• Card blocked by bank</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default PaymentFailedPage;
