import Stripe from "stripe";
import { STRIPE_TEST_CARDS, getTestCardInfo, isTestCard } from "@/lib/stripe";

// 🔧 Stripe Service สำหรับ Server-side
export class StripeService {
  private static stripe: Stripe;

  static getStripeInstance(): Stripe {
    if (!this.stripe) {
      const secretKey = process.env.STRIPE_SECRET_KEY;

      if (!secretKey) {
        throw new Error(
          "STRIPE_SECRET_KEY is not set in environment variables"
        );
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: "2025-09-30.clover",
      });
    }

    return this.stripe;
  }

  // 💳 Create Payment Intent
  static async createPaymentIntent(
    amount: number,
    currency: string = "thb",
    metadata?: Record<string, string>
  ): Promise<{ client_secret: string; id: string }> {
    try {
      const stripe = this.getStripeInstance();

      // Convert amount to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: metadata || {},
      });

      return {
        client_secret: paymentIntent.client_secret!,
        id: paymentIntent.id,
      };
    } catch (error) {
      console.error("Error creating payment intent:", error);
      throw new Error("Failed to create payment intent");
    }
  }

  // 🔍 Retrieve Payment Intent
  static async retrievePaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const stripe = this.getStripeInstance();
      return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error("Error retrieving payment intent:", error);
      throw new Error("Failed to retrieve payment intent");
    }
  }

  // ✅ Confirm Payment Intent
  static async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const stripe = this.getStripeInstance();

      return await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });
    } catch (error) {
      console.error("Error confirming payment intent:", error);
      throw error; // Re-throw to handle specific Stripe errors
    }
  }

  // 🧪 Test Card Validation (สำหรับ development)
  static validateTestCard(cardNumber: string): {
    isValid: boolean;
    info?: unknown;
  } {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    if (isTestCard(cleanNumber)) {
      return {
        isValid: true,
        info: getTestCardInfo(cleanNumber),
      };
    }

    return { isValid: false };
  }

  // 🔄 Simulate Payment Processing (สำหรับ testing)
  static async simulatePayment(
    cardNumber: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; paymentIntentId?: string }> {
    const cleanNumber = cardNumber.replace(/\s/g, "");

    // Check if it's a test card
    if (!isTestCard(cleanNumber)) {
      return {
        success: false,
        error: "Invalid test card number. Please use Stripe test cards.",
      };
    }

    const cardInfo = getTestCardInfo(cleanNumber);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check card status
    if (cardInfo.status === "Success") {
      return {
        success: true,
        paymentIntentId: `pi_test_${Date.now()}`,
      };
    } else {
      return {
        success: false,
        error: cardInfo.message,
      };
    }
  }

  // 📋 Get Test Cards List (สำหรับ debugging)
  static getTestCardsList(): Array<{ number: string; info: unknown }> {
    return Object.entries(STRIPE_TEST_CARDS).map(([key, number]) => ({
      number,
      info: getTestCardInfo(number),
    }));
  }
}
