import React, { useState, useEffect } from "react";
import { PaymentMethod, CreditCardDetails } from "@/types/booking";
import { PAYMENT_METHODS } from "@/constants/booking";
import { BookingButtons } from "../BookingButtons";
import { CreditCardIcon } from "@/components/customer/icons/CreditCardIcon";
import { CashIcon } from "@/components/customer/icons/CashIcon";
import { WalletIcon } from "@/components/customer/icons/WalletIcon";
import { Input } from "@/components/customer/forms/form-fields/Input";
import { FormField } from "@/components/customer/forms/form-fields/FormField";
import { usePaymentValidation } from "@/hooks/usePaymentValidation";
import { Controller } from "react-hook-form";
import { PaymentMethodFormData } from "@/utils/validation/paymentValidation";

interface PaymentMethodFormProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  creditCardDetails: CreditCardDetails;
  onCreditCardDetailsChange: (details: CreditCardDetails) => void;
  promoCode: string;
  onPromoCodeChange: (code: string) => void;
  onPromoCodeApply: () => void;
  promoCodeApplied: boolean;
  promoDiscount: number;
  onPromoDiscountUpdate?: (discount: number) => void;
  onBack?: () => void;
  onConfirm?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PaymentMethodForm: React.FC<PaymentMethodFormProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  creditCardDetails,
  onCreditCardDetailsChange,
  promoCode,
  onPromoCodeChange,
  onPromoCodeApply,
  promoCodeApplied,
  promoDiscount,
  onPromoDiscountUpdate,
  onBack,
  onConfirm,
  disabled = false,
  loading = false,
}) => {
  const [showCreditCardForm, setShowCreditCardForm] = useState(false);

  // Initialize payment validation hook
  const {
    form,
    errors: validationErrors,
    onSubmit,
    watchedValues,
    setValue,
    clearFieldError,
    promoDiscount: validationPromoDiscount,
    promoCodeApplied: validationPromoCodeApplied,
  } = usePaymentValidation();

  // Sync form values with props
  useEffect(() => {
    const formMethod =
      paymentMethod === PAYMENT_METHODS.CREDIT_CARD ? "credit_card" : "cash";

    console.log("PaymentMethodForm: Syncing form values with props");
    console.log("paymentMethod:", paymentMethod);
    console.log("creditCardDetails:", creditCardDetails);
    console.log("promoCode:", promoCode);

    setValue("paymentMethod", formMethod);
    setValue("creditCard.cardNumber", creditCardDetails.cardNumber);
    setValue("creditCard.cardOwner", creditCardDetails.cardOwner);
    setValue("creditCard.expiryDate", creditCardDetails.expiryDate);
    setValue("creditCard.cvc", creditCardDetails.cvc);
    setValue("promoCode", promoCode || "");

    console.log("PaymentMethodForm: Form values synced");
  }, [paymentMethod, creditCardDetails, promoCode, setValue]);

  // Debug validation errors
  useEffect(() => {
    console.log(
      "PaymentMethodForm: validationErrors changed:",
      validationErrors
    );
  }, [validationErrors]);

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    onPaymentMethodChange(method);
    setShowCreditCardForm(method === PAYMENT_METHODS.CREDIT_CARD);
    // Update form value (convert to schema format)
    const formMethod =
      method === PAYMENT_METHODS.CREDIT_CARD ? "credit_card" : "cash";
    setValue("paymentMethod", formMethod);
    // Clear any existing errors
    clearFieldError("paymentMethod");
  };

  const handleCreditCardChange = (
    field: keyof CreditCardDetails,
    value: string
  ) => {
    onCreditCardDetailsChange({
      ...creditCardDetails,
      [field]: value,
    });
    // Update form value
    setValue(`creditCard.${field}` as keyof PaymentMethodFormData, value);
    // Clear field error when user starts typing
    clearFieldError(`creditCard.${field}`);
  };

  const handlePromoCodeChange = (value: string) => {
    onPromoCodeChange(value);
    // Update form value
    setValue("promoCode", value);
    // Clear field error when user starts typing
    clearFieldError("promoCode");
  };

  // Effect to update parent component when promo discount changes
  useEffect(() => {
    // Update promo discount in parent component when validation changes
    if (onPromoDiscountUpdate) {
      onPromoDiscountUpdate(validationPromoDiscount);
    }
  }, [validationPromoDiscount, onPromoDiscountUpdate]);

  // Handle form submission with validation
  const handleFormSubmit = async () => {
    console.log("🔍 PaymentMethodForm: handleFormSubmit called");

    try {
      console.log("🔍 PaymentMethodForm: Calling onSubmit...");
      const validatedData = await onSubmit();

      // Check if validation passed (returned data) or failed (returned false)
      if (validatedData === false) {
        console.log(
          "PaymentMethodForm: Validation failed - not calling onConfirm"
        );
        return;
      }

      console.log("PaymentMethodForm: Validation passed, calling onConfirm");

      // If validation passes, call the original onConfirm
      if (onConfirm) {
        onConfirm();
      }
    } catch (error) {
      // This should not happen anymore since we don't throw errors
      console.error("PaymentMethodForm: Unexpected error:", error);
      return;
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add spaces every 4 digits
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const paymentMethodOptions = [
    {
      value: PAYMENT_METHODS.CREDIT_CARD,
      label: "Credit Card",
      icon: CreditCardIcon,
    },
    {
      value: PAYMENT_METHODS.CASH,
      label: "Cash",
      icon: CashIcon,
    },
  ];

  return (
    <div className="p-4 space-y-6 border border-gray-300 rounded bg-white md:p-8 md:space-y-8 md:rounded-lg">
      {/* Payment Method Selection */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          {paymentMethodOptions.map((option) => (
            <div
              key={option.value}
              className={`flex items-center justify-center h-16 p-3 border rounded cursor-pointer transition-all duration-200 md:h-20 md:p-4 ${
                paymentMethod === option.value
                  ? "border-orange-500 shadow-[4px_4px_16px_rgba(0,0,0,0.08)]"
                  : "border-gray-300 hover:border-orange-500"
              }`}
              onClick={() => handlePaymentMethodChange(option.value)}
            >
              <div className="flex items-center">
                <div className="mr-2 md:mr-3">
                  <option.icon
                    width={20}
                    height={16}
                    className={`md:w-[26px] md:h-[20px] ${
                      paymentMethod === option.value
                        ? "text-orange-500"
                        : "text-gray-600"
                    }`}
                  />
                </div>
                <div>
                  <h3
                    className={`text-base font-semibold font-inter md:text-xl ${
                      paymentMethod === option.value
                        ? "text-orange-500"
                        : "text-gray-600"
                    }`}
                  >
                    {option.label}
                  </h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {validationErrors.paymentMethod && (
          <p className="text-sm text-red-500 font-inter">
            {validationErrors.paymentMethod.message}
          </p>
        )}
      </div>

      {/* Cash Payment Info */}
      {paymentMethod === PAYMENT_METHODS.CASH && (
        <div className="pt-4 mb-4 border-gray-200 md:pt-6 md:mb-6">
          <h3 className="mb-4 text-lg text-gray-900 font-semibold font-inter">
            Cash
          </h3>

          <div className="flex items-center p-4 bg-gray-100 rounded border border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 mr-4">
              <WalletIcon size={50} className="text-orange-500" />
            </div>
            <div>
              {/* Desktop - 2 lines */}
              <div className="hidden md:block">
                <p className="text-base text-gray-900 font-normal font-inter">
                  Pay at the hotel with cash or cheque No payment is required
                  until you
                </p>
                <p className="text-base text-gray-900 font-normal font-inter">
                  check in
                </p>
              </div>

              {/* Mobile - 3 lines */}
              <div className="block md:hidden">
                <p className="text-base text-gray-900 font-normal font-inter">
                  Pay at the hotel with cash or
                </p>
                <p className="text-base text-gray-900 font-normal font-inter">
                  cheque. No payment is
                </p>
                <p className="text-base text-gray-900 font-normal font-inter">
                  required until you check in
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Card Form */}
      {paymentMethod === PAYMENT_METHODS.CREDIT_CARD && (
        <div className="pt-4 mb-4 border-gray-200 md:pt-6 md:mb-6">
          <h3 className="mb-4 text-lg text-gray-900 font-semibold font-inter">
            Credit Card
          </h3>

          <div className="space-y-4">
            {/* Card Number */}
            <FormField
              label="Card Number"
              error={
                validationErrors.creditCard?.cardNumber
                  ? {
                      message: validationErrors.creditCard.cardNumber.message,
                      type: "validation",
                    }
                  : undefined
              }
            >
              <Controller
                control={form.control}
                name="creditCard.cardNumber"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    value={creditCardDetails.cardNumber}
                    onChange={(e) => {
                      const formatted = formatCardNumber(e.target.value);
                      handleCreditCardChange("cardNumber", formatted);
                    }}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    error={!!validationErrors.creditCard?.cardNumber}
                  />
                )}
              />
            </FormField>

            {/* Card Holder Name */}
            <FormField
              label="Cardholder Name"
              error={
                validationErrors.creditCard?.cardOwner
                  ? {
                      message: validationErrors.creditCard.cardOwner.message,
                      type: "validation",
                    }
                  : undefined
              }
            >
              <Controller
                control={form.control}
                name="creditCard.cardOwner"
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    value={creditCardDetails.cardOwner}
                    onChange={(e) =>
                      handleCreditCardChange("cardOwner", e.target.value)
                    }
                    placeholder="John Doe"
                    error={!!validationErrors.creditCard?.cardOwner}
                  />
                )}
              />
            </FormField>

            {/* Expiry Date and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Expiry Date"
                error={
                  validationErrors.creditCard?.expiryDate
                    ? {
                        message: validationErrors.creditCard.expiryDate.message,
                        type: "validation",
                      }
                    : undefined
                }
              >
                <Controller
                  control={form.control}
                  name="creditCard.expiryDate"
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      value={creditCardDetails.expiryDate}
                      onChange={(e) => {
                        const formatted = formatExpiryDate(e.target.value);
                        handleCreditCardChange("expiryDate", formatted);
                      }}
                      placeholder="MM/YY"
                      maxLength={5}
                      error={!!validationErrors.creditCard?.expiryDate}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="CVV"
                error={
                  validationErrors.creditCard?.cvc
                    ? {
                        message: validationErrors.creditCard.cvc.message,
                        type: "validation",
                      }
                    : undefined
                }
              >
                <Controller
                  control={form.control}
                  name="creditCard.cvc"
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      value={creditCardDetails.cvc}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        handleCreditCardChange("cvc", digits);
                      }}
                      placeholder="123"
                      maxLength={4}
                      error={!!validationErrors.creditCard?.cvc}
                    />
                  )}
                />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Code */}
      <div className="pt-4 border-t border-gray-200 md:pt-6">
        <h3 className="mb-4 text-lg text-gray-900 font-medium font-inter">
          Promotion Code
        </h3>

        <FormField
          label=""
          error={
            validationErrors.promoCode
              ? {
                  message: validationErrors.promoCode.message,
                  type: "validation",
                }
              : undefined
          }
        >
          <Controller
            control={form.control}
            name="promoCode"
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                value={promoCode}
                onChange={(e) => handlePromoCodeChange(e.target.value)}
                placeholder="Enter promotion code"
                error={!!validationErrors.promoCode}
              />
            )}
          />
        </FormField>
      </div>

      {/* BookingButtons - Desktop Only */}
      <div className="hidden md:block">
        <BookingButtons
          onBack={onBack}
          onConfirm={handleFormSubmit}
          nextLabel="Confirm Booking"
          showBack={true}
          disabled={disabled}
          loading={loading}
        />
      </div>
    </div>
  );
};
