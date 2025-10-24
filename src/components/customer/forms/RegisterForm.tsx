import React from "react";
import { useFormValidation } from "@/hooks/useFormValidation";
import { FormField } from "./form-fields/FormField";
import { Input } from "./form-fields/Input";
import { Select } from "./form-fields/Select";
import { DatePicker } from "./form-fields/DatePicker";
import { FileUpload } from "./form-fields/FileUpload";
import { Button } from "@/components/ui/Button";
import { Controller } from "react-hook-form";

const COUNTRY_OPTIONS = [
  { value: "thailand", label: "Thailand" },
  { value: "singapore", label: "Singapore" },
  { value: "malaysia", label: "Malaysia" },
  { value: "indonesia", label: "Indonesia" },
  { value: "philippines", label: "Philippines" },
  { value: "vietnam", label: "Vietnam" },
  { value: "other", label: "Other" },
];

export const RegisterForm = () => {
  const { form, errors, isLoading, error, success, onSubmit } =
    useFormValidation();

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-lg font-semibold mb-2 text-green-600">
          Registration successful!
        </div>
        <p className="text-gray-600">
          Please check your email to confirm your account
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 md:space-y-10 customer-forms bg-bg rounded-lg"
    >
      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="text-[20px] font-inter font-semibold leading-[150%] tracking-[-2%] text-gray-600 pt-3">
          Basic Information
        </h3>

        {/* First Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <FormField label="First name" error={errors.firstName} required>
            <Input
              {...form.register("firstName")}
              error={!!errors.firstName}
              placeholder="Enter your first name"
            />
          </FormField>

          <FormField label="Last name" error={errors.lastName} required>
            <Input
              {...form.register("lastName")}
              error={!!errors.lastName}
              placeholder="Enter your last name"
            />
          </FormField>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <FormField label="Username" error={errors.username} required>
            <Input
              {...form.register("username")}
              error={!!errors.username}
              placeholder="Enter your username"
            />
          </FormField>

          <FormField label="Email" error={errors.email} required>
            <Input
              {...form.register("email")}
              type="email"
              error={!!errors.email}
              placeholder="Enter your email"
            />
          </FormField>
        </div>

        {/* Third Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <FormField label="Password" error={errors.password} required>
            <Input
              {...form.register("password")}
              type="password"
              error={!!errors.password}
              placeholder="Enter your password"
            />
          </FormField>

          <FormField
            label="Confirm password"
            error={errors.confirmPassword}
            required
          >
            <Input
              {...form.register("confirmPassword")}
              type="password"
              error={!!errors.confirmPassword}
              placeholder="Confirm your password"
            />
          </FormField>
        </div>

        {/* Fourth Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <FormField label="Phone number" error={errors.phoneNumber} required>
            <Input
              {...form.register("phoneNumber")}
              type="tel"
              error={!!errors.phoneNumber}
              placeholder="Enter your phone number"
            />
          </FormField>

          <FormField label="Date of Birth" error={errors.dateOfBirth} required>
            <Controller
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <DatePicker
                  {...field}
                  error={!!errors.dateOfBirth}
                  placeholder="Select your date of birth"
                />
              )}
            />
          </FormField>
        </div>

        {/* Fifth Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <div className="md:col-span-1">
            <FormField label="Country" error={errors.country} required>
              <Controller
                control={form.control}
                name="country"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    error={!!errors.country}
                    options={COUNTRY_OPTIONS}
                    placeholder="Select your country"
                  />
                )}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Profile Picture */}
      <div className="space-y-6 border-t border-gray-300 pt-[20px]">
        <h3 className="text-[20px] font-inter font-semibold leading-[150%] tracking-[-2%] text-gray-600">
          Profile Picture
        </h3>

        <FormField label="" error={errors.profilePicture}>
          <FileUpload
            onFileSelect={(file) => {
              if (file) {
                form.setValue("profilePicture", file);
              } else {
                form.setValue("profilePicture", undefined);
              }
            }}
            error={!!errors.profilePicture}
          />
        </FormField>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-md bg-red border border-red">
          <p className="text-sm text-red">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-1">
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isLoading}
            className="w-full"
          >
            {isLoading ? "Registering..." : "Register"}
          </Button>
        </div>
        <div></div>
      </div>
    </form>
  );
};
