import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  paymentMethodSchema,
  PaymentMethodFormData,
} from "@/utils/validation/paymentValidation";
import { validatePromoCode } from "@/utils/validation/promoCodeValidation";

export const usePaymentValidation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      paymentMethod: "credit_card",
      creditCard: {
        cardNumber: "",
        cardOwner: "",
        expiryDate: "",
        cvc: "",
      },
      promoCode: "",
    },
    mode: "onChange", // Validate on change and submit
  });

  const {
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
    setError: setFormError,
  } = form;

  // Clear specific field error when user starts typing
  const clearFieldError = (fieldPath: string) => {
    clearErrors(fieldPath as keyof PaymentMethodFormData);
  };

  // Set manual error for a specific field
  const setFieldError = (fieldPath: string, message: string) => {
    setFormError(fieldPath as keyof PaymentMethodFormData, {
      type: "manual",
      message,
    });
  };

  // Watch form values
  const watchedValues = watch();

  // Watch promo code changes for real-time validation
  const watchedPromoCode = watch("promoCode");

  // Real-time promo code validation
  useEffect(() => {
    const validatePromoCodeRealTime = async () => {
      if (!watchedPromoCode || watchedPromoCode.trim() === "") {
        setPromoDiscount(0);
        setPromoCodeApplied(false);
        clearErrors("promoCode");
        return;
      }

      try {
        const validation = await validatePromoCode(watchedPromoCode);

        if (validation.isValid && validation.discountAmount) {
          setPromoDiscount(validation.discountAmount);
          setPromoCodeApplied(true);
          clearErrors("promoCode");
        } else {
          setPromoDiscount(0);
          setPromoCodeApplied(false);
          setFieldError(
            "promoCode",
            validation.error || "Invalid promotion code"
          );
        }
      } catch (error) {
        console.error("Error validating promo code:", error);
        setPromoDiscount(0);
        setPromoCodeApplied(false);
        setFieldError(
          "promoCode",
          "This promo code isn't valid for this room. Try another code or room"
        );
      }
    };

    // Debounce validation to avoid too many API calls
    const timeoutId = setTimeout(validatePromoCodeRealTime, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedPromoCode, clearErrors, setFieldError]);

  // Submit form with validation
  const onSubmit = async () => {
    setIsLoading(true);
    setError(null);

    console.log("🔍 Validating payment form data");
    console.log("🔍 Current form values:", watchedValues);

    let hasValidationErrors = false;

    // Manual validation for credit card fields
    if (watchedValues.paymentMethod === "credit_card") {
      console.log("🔍 Validating credit card fields...");

      if (!watchedValues.creditCard?.cardNumber?.trim()) {
        console.log(
          "❌ Card number validation failed - value:",
          watchedValues.creditCard?.cardNumber
        );
        setFieldError("creditCard.cardNumber", "Card number is required");
        hasValidationErrors = true;
      }
      if (!watchedValues.creditCard?.cardOwner?.trim()) {
        console.log(
          "❌ Card owner validation failed - value:",
          watchedValues.creditCard?.cardOwner
        );
        setFieldError("creditCard.cardOwner", "Cardholder name is required");
        hasValidationErrors = true;
      }
      if (!watchedValues.creditCard?.expiryDate?.trim()) {
        console.log(
          "❌ Expiry date validation failed - value:",
          watchedValues.creditCard?.expiryDate
        );
        setFieldError("creditCard.expiryDate", "Expiry date is required");
        hasValidationErrors = true;
      }
      if (!watchedValues.creditCard?.cvc?.trim()) {
        console.log(
          "❌ CVV validation failed - value:",
          watchedValues.creditCard?.cvc
        );
        setFieldError("creditCard.cvc", "CVV is required");
        hasValidationErrors = true;
      }

      if (hasValidationErrors) {
        console.log("❌ Credit card validation failed - setting field errors");
        console.log("🔍 Current errors after setting:", errors);
        setIsLoading(false);
        // Don't throw error - just return false to indicate validation failed
        return false;
      }

      console.log("✅ Credit card validation passed");
    }

    console.log("✅ Payment form validation passed:", watchedValues);
    setIsLoading(false);

    // Return the validated data
    return watchedValues;
  };

  return {
    form,
    errors,
    isLoading,
    error,
    onSubmit, // ✅ ใช้ onSubmit โดยตรง ไม่ผ่าน handleSubmit
    watchedValues,
    setValue,
    clearFieldError,
    setFieldError,
    promoDiscount,
    promoCodeApplied,
  };
};
