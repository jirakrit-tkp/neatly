import { NextApiRequest, NextApiResponse } from "next";
import { PaymentService } from "@/services/paymentService";
import { PAYMENT_METHODS } from "@/constants/booking";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      error: "Only POST method is allowed",
    });
  }

  try {
    const { id } = req.query;
    const { paymentMethod, stripePaymentIntentId } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid payment ID",
        error: "Payment ID is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Missing payment method",
        error: "Payment method is required",
      });
    }

    let result;

    if (
      paymentMethod === PAYMENT_METHODS.CREDIT_CARD &&
      stripePaymentIntentId
    ) {
      result = await PaymentService.processStripePayment(
        id,
        "", // cardNumber - will be retrieved from database
        "", // cardOwner - will be retrieved from database
        "", // expiryDate - will be retrieved from database
        "" // cvc - will be retrieved from database
      );
    } else if (paymentMethod === PAYMENT_METHODS.CASH) {
      result = await PaymentService.processCashPayment(id);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method or missing required data",
        error:
          "For credit card, stripePaymentIntentId is required. For cash, no additional data needed.",
      });
    }

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("Process payment API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
