import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "./form-fields/FormField";
import { Input } from "./form-fields/Input";
import { Select } from "./form-fields/Select";
import { DatePicker } from "./form-fields/DatePicker";
import { FileUpload } from "./form-fields/FileUpload";
import { Button } from "@/components/ui/Button";
import { useProfile } from "@/hooks/useProfile";
import {
  profileSchema,
  ProfileFormData,
} from "@/utils/validation/profileValidation";
import { supabase } from "@/lib/supabaseClient";
import { UserProfile } from "@/types/user.type";

const COUNTRY_OPTIONS = [
  { value: "thailand", label: "Thailand" },
  { value: "singapore", label: "Singapore" },
  { value: "malaysia", label: "Malaysia" },
  { value: "indonesia", label: "Indonesia" },
  { value: "philippines", label: "Philippines" },
  { value: "vietnam", label: "Vietnam" },
  { value: "other", label: "Other" },
];

interface ProfileFormProps {
  onSuccess?: (profile: UserProfile | null) => void;
  onCancel?: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const {
    profile,
    isLoading,
    error,
    isUpdating,
    updateProfile,
    deleteProfilePicture,
    clearError,
  } = useProfile();

  const [profileImage, setProfileImage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      dateOfBirth: "",
      country: "",
      profilePicture: undefined,
    },
  });

  const { errors } = form.formState;

  useEffect(() => {
    if (profile) {
      setProfileImage(profile.profile_image || "");

      const getCurrentUserEmail = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          form.setValue("email", user.email);
        }
      };

      getCurrentUserEmail();

      form.reset({
        firstName: profile.first_name,
        lastName: profile.last_name,
        email: "",
        phoneNumber: profile.phone,
        dateOfBirth: profile.date_of_birth,
        country: profile.country,
      });
    }
  }, [profile, form]);

  const onSubmit = async (data: ProfileFormData) => {
    clearError();
    setSuccessMessage("");

    const success = await updateProfile(data);
    if (success) {
      setSuccessMessage("Profile updated successfully!");
      onSuccess?.(profile);

      setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
  };

  const handleDeleteProfilePicture = async () => {
    if (window.confirm("Do you want to delete the profile picture?")) {
      const success = await deleteProfilePicture();
      if (success) {
        setProfileImage("");
        form.setValue("profilePicture", undefined);
        setSuccessMessage("Profile picture deleted successfully!");

        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    }
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      form.setValue("profilePicture", file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      form.setValue("profilePicture", undefined);
      setProfileImage("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 text-lg font-semibold mb-2">
          An error occurred
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="primary">
          Reload
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-bg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center pt-10 md:pt-0">
        <h1 className="text-[44px] md:text-[68px] font-noto font-medium leading-[125%] tracking-[-2%] text-green-800">
          Profile
        </h1>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isUpdating}
          className="hidden md:block"
          onClick={(e) => {
            e.preventDefault();
            console.log("Button clicked - about to validate and submit");
            form.handleSubmit(onSubmit, (errors) => {
              console.log("Validation failed with errors:", errors);
            })();
          }}
        >
          {isUpdating ? "Updating..." : "Update Profile"}
        </Button>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 customer-forms bg-bg"
      >
        {/* Basic Information */}
        <div className="space-y-6">
          <h3 className="text-[20px] font-inter font-semibold leading-[150%] tracking-[-2%] text-gray-600 pt-3">
            Basic Information
          </h3>

          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Email" error={errors.email} required>
              <Input
                {...form.register("email")}
                type="email"
                error={!!errors.email}
                placeholder="Enter your email"
                readOnly
                className="bg-gray-200 text-gray-600 cursor-not-allowed border-gray-400"
              />
            </FormField>

            <FormField label="Phone number" error={errors.phoneNumber} required>
              <Input
                {...form.register("phoneNumber")}
                type="tel"
                error={!!errors.phoneNumber}
                placeholder="Enter your phone number"
              />
            </FormField>
          </div>

          {/* Third Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Date of Birth"
              error={errors.dateOfBirth}
              required
            >
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

        {/* Profile Picture */}
        <div className="space-y-6 border-t border-gray-300 pt-[20px]">
          <h3 className="text-[20px] font-inter font-semibold leading-[150%] tracking-[-2%] text-gray-600">
            Profile Picture
          </h3>

          <div className="flex-1">
            <FormField label="" error={errors.profilePicture}>
              <FileUpload
                onFileSelect={handleFileSelect}
                error={!!errors.profilePicture}
                currentImage={profileImage}
              />
            </FormField>
          </div>

          {/* Mobile Update Button */}
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isUpdating}
            className="w-full md:hidden"
            onClick={(e) => {
              e.preventDefault();
              console.log(
                "Mobile button clicked - about to validate and submit"
              );
              form.handleSubmit(onSubmit, (errors) => {
                console.log("Validation failed with errors:", errors);
              })();
            }}
          >
            {isUpdating ? "Updating..." : "Update Profile"}
          </Button>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </form>
    </div>
  );
};
