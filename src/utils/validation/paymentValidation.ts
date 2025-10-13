import { z } from "zod";

// Credit Card Number validation
export const cardNumberValidation = z
  .string()
  .min(1, { message: "Card number is required" })
  .regex(/^[0-9\s]+$/, {
    message: "Card number must contain only digits and spaces",
  })
  .refine(
    (val) => {
      // Remove spaces and check length
      const digits = val.replace(/\s/g, "");
      return digits.length >= 13 && digits.length <= 19;
    },
    {
      message: "Card number must be between 13-19 digits",
    }
  )
  .refine(
    (val) => {
      // Basic Luhn algorithm check
      const digits = val.replace(/\s/g, "");
      let sum = 0;
      let isEven = false;

      for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    },
    {
      message: "Invalid card number",
    }
  );

// Cardholder Name validation
export const cardholderNameValidation = z
  .string()
  .min(1, { message: "Cardholder name is required" })
  .min(2, { message: "Cardholder name must be at least 2 characters" })
  .max(50, { message: "Cardholder name must not exceed 50 characters" })
  .regex(/^[a-zA-Zก-๙\s]+$/, {
    message: "Cardholder name can only contain letters and spaces",
  });

// Expiry Date validation
export const expiryDateValidation = z
  .string()
  .min(1, { message: "Expiry date is required" })
  .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, {
    message: "Expiry date must be in MM/YY format",
  })
  .refine(
    (val) => {
      const [month, year] = val.split("/");
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const today = new Date();

      return expiryDate > today;
    },
    {
      message: "Card has expired",
    }
  );

// CVV validation
export const cvvValidation = z
  .string()
  .min(1, { message: "CVV is required" })
  .regex(/^[0-9]+$/, {
    message: "CVV must contain only digits",
  })
  .refine((val) => val.length >= 3 && val.length <= 4, {
    message: "CVV must be 3-4 digits",
  });

// Promotion Code validation (optional)
export const promoCodeValidation = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === "") return true;
      return val.trim().length >= 3;
    },
    {
      message: "Promotion code must be at least 3 characters",
    }
  );

// Credit Card Details Schema
export const creditCardSchema = z.object({
  cardNumber: cardNumberValidation,
  cardOwner: cardholderNameValidation,
  expiryDate: expiryDateValidation,
  cvc: cvvValidation,
});

// Payment Method Form Schema
export const paymentMethodSchema = z.object({
  paymentMethod: z.enum(["credit_card", "cash"], {
    required_error: "Please select a payment method",
  }),
  creditCard: creditCardSchema.optional(),
  promoCode: promoCodeValidation,
});

// Types
export type CreditCardFormData = z.infer<typeof creditCardSchema>;
export type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;
