import { loadStripe } from "@stripe/stripe-js";

// 🔧 Stripe Configuration
// Test Mode Keys - ไม่ตัดเงินจริง
const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51ABC123def456GHI789";

// Initialize Stripe
export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// 🔍 Stripe Test Cards สำหรับทดสอบ
export const STRIPE_TEST_CARDS = {
  // ✅ Success Cards
  VISA_SUCCESS: "4242424242424242",
  MASTERCARD_SUCCESS: "5555555555554444",
  AMEX_SUCCESS: "378282246310005",

  // ❌ Failed Cards
  DECLINED: "4000000000000002",
  EXPIRED: "4000000000000069",
  PROCESSING_ERROR: "4000000000000119",
  INSUFFICIENT_FUNDS: "4000000000009995",

  // 🔐 3D Secure Cards
  REQUIRES_AUTHENTICATION: "4000002500003155",
  REQUIRES_ACTION: "4000000000003220",
};

// 📋 Stripe Error Codes
export const STRIPE_ERROR_CODES = {
  CARD_DECLINED: "card_declined",
  EXPIRED_CARD: "expired_card",
  INCORRECT_CVC: "incorrect_cvc",
  PROCESSING_ERROR: "processing_error",
  INSUFFICIENT_FUNDS: "insufficient_funds",
  LOST_CARD: "lost_card",
  STOLEN_CARD: "stolen_card",
  RESTRICTED_CARD: "restricted_card",
  SECURITY_VIOLATION: "security_violation",
  SERVICE_NOT_ALLOWED: "service_not_allowed",
  STOLEN_LOST_CARD: "stolen_lost_card",
  TRANSACTION_NOT_ALLOWED: "transaction_not_allowed",
  TRY_AGAIN_LATER: "try_again_later",
  WITHDRAWAL_COUNT_LIMIT_EXCEEDED: "withdrawal_count_limit_exceeded",
};

// 🎯 Helper function to get test card info
export const getTestCardInfo = (cardNumber: string) => {
  const cleanNumber = cardNumber.replace(/\s/g, "");

  switch (cleanNumber) {
    case STRIPE_TEST_CARDS.VISA_SUCCESS:
      return {
        type: "Visa",
        status: "Success",
        message: "Payment will succeed",
      };
    case STRIPE_TEST_CARDS.MASTERCARD_SUCCESS:
      return {
        type: "Mastercard",
        status: "Success",
        message: "Payment will succeed",
      };
    case STRIPE_TEST_CARDS.AMEX_SUCCESS:
      return {
        type: "American Express",
        status: "Success",
        message: "Payment will succeed",
      };
    case STRIPE_TEST_CARDS.DECLINED:
      return {
        type: "Visa",
        status: "Declined",
        message: "Your card was declined",
      };
    case STRIPE_TEST_CARDS.EXPIRED:
      return {
        type: "Visa",
        status: "Expired",
        message: "Your card has expired",
      };
    case STRIPE_TEST_CARDS.PROCESSING_ERROR:
      return {
        type: "Visa",
        status: "Processing Error",
        message: "An error occurred while processing your card",
      };
    case STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS:
      return {
        type: "Visa",
        status: "Insufficient Funds",
        message: "Your card has insufficient funds",
      };
    default:
      return {
        type: "Unknown",
        status: "Unknown",
        message: "Unknown test card",
      };
  }
};

// 🛡️ Validate if card number is a test card
export const isTestCard = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  return Object.values(STRIPE_TEST_CARDS).includes(cleanNumber);
};
