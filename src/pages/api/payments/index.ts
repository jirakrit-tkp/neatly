import { NextApiRequest, NextApiResponse } from "next";
import { PaymentService } from "@/services/paymentService";
import { validatePaymentData } from "@/utils/validation/paymentValidation";

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
    const paymentData = req.body;

    const validation = validatePaymentData(paymentData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: validation.error,
      });
    }

    const result = await PaymentService.createPayment(
      paymentData.bookingId,
      paymentData.amount,
      paymentData.paymentMethod,
      paymentData.cardDetails
    );

    if (result.success) {
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("Payment API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
