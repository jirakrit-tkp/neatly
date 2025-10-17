"use client";
import Layout from "@/components/admin/Layout";
import { ArrowLeft } from "lucide-react";

import { useRouter } from "next/router";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { updateRoom, deleteRoom } from "@/services/roomService";
import { zodResolver } from "@hookform/resolvers/zod";
import { roomSchema, RoomFormData } from "@/schemas/roomSchema";
import { Room } from "@/types/rooms";

import { RoomMainImage } from "@/components/admin/roomForm/RoomMainImage";
import { RoomGalleryImages } from "@/components/admin/roomForm/RoomGalleryImages";
import { AmenityItems } from "@/components/admin/roomForm/AmenityItems";
import { Button } from "@/components/admin/ui/Button";
import { TextInput } from "@/components/admin/ui/TextInput";
import { TextArea } from "@/components/admin/ui/TextArea";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import { DropDownInput } from "../ui/DropdownInput";
import { toast } from "sonner";

interface EditRoomFormProps {
  room: Room;
}

export function EditRoomForm({ room }: EditRoomFormProps) {
  const router = useRouter();
  const roomId = router.query.id as string;
  const [isLoading, setIsLoading] = useState(false);

  // const [hasPromotion, setHasPromotion] = useState(!!room.promotion_price);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const methods = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      roomType: room.room_type,
      roomSize: room.room_size,
      bedType: room.bed_type,
      guests: room.guests,
      pricePerNight: room.price,
      promotionPrice: room.promotion_price || null,
      hasPromotion: !!room.promotion_price,
      description: room.description || "",
      mainImgUrl: room.main_image_url[0] || null,
      galleryImageUrls: room.gallery_images || [],
      amenities:
        room?.amenities && room.amenities.length > 0 ? room.amenities : [],
    },
  });

  const {
    watch,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = methods;

  const hasPromotion = watch("hasPromotion");

  console.log("Main Image", room.main_image_url);
  console.log("Gallery Images", room.gallery_images);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("mainImage", file);

    const response = await fetch("/api/upload-room-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || "Failed to upload image");
    }

    return data.url;
  };

  const onSubmit = async (formData: RoomFormData) => {
    setIsLoading(true);
    try {
      // Upload main image if it's a File object
      let mainImageUrl = formData.mainImgUrl;
      if (formData.mainImgUrl instanceof File) {
        toast.info("Uploading main image...");
        mainImageUrl = await uploadImage(formData.mainImgUrl);
        console.log("Main image uploaded:", mainImageUrl);
      }

      // Upload gallery images if they are File objects
      const galleryUrls: string[] = [];
      if (formData.galleryImageUrls && formData.galleryImageUrls.length > 0) {
        toast.info("Uploading gallery images...");

        for (const item of formData.galleryImageUrls) {
          if (item instanceof File) {
            const url = await uploadImage(item);
            galleryUrls.push(url);
          } else if (typeof item === "string") {
            // If it's already a URL (editing existing room)
            galleryUrls.push(item);
          }
        }
      }

      // Prepare the final data with uploaded URLs
      const roomData = {
        ...formData,
        mainImgUrl: mainImageUrl,
        galleryImageUrls: galleryUrls,
      };

      console.log("Updating room with data:", roomData);

      // Update the room with the uploaded image URLs
      await updateRoom(roomId, roomData, hasPromotion);

      toast.success(`Room "${formData.roomType}" created successfully!`);

      setTimeout(() => {
        router.push("/admin/room-types");
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Failed to create room: ${err.message}`);
      } else {
        toast.error("An unknown error occurred.");
        console.error("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Room
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteRoom(roomId);
      toast.success(`Room "Room deleted successfully!`);
      setTimeout(() => {
        router.push("/admin/room-types");
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        alert(`Error Message: ${err.message}`);
      } else {
        console.error("An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <Layout>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1">
          {/* Header */}
          <div className="flex flex-row justify-between border-b border-gray-400 pb-5 mt-10 mx-10">
            <div className="text-xl gap-3 font-semibold flex flex-row">
              <ArrowLeft
                className="w-5 mt-1 cursor-pointer"
                onClick={() => router.push("/admin/room-types")}
              />
              <p>{room.room_type}</p>
            </div>
            <div className="flex justify-end gap-2 h-[46px] rounded-md overflow-hidden max-w-md w-full">
              <Button
                loading={isLoading}
                text={isLoading ? "Updating..." : "Update"}
                type="submit"
                className=" text-white bg-orange-600 hover:bg-orange-700"
              />
              <Button
                loading={isLoading}
                text="Delete"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className=" text-orange-600 border border-orange-600 hover:bg-orange-700 hover:text-white"
              />
              {/* Confirm Delete Alert */}
              <ConfirmDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                roomType={room?.room_type}
              />
            </div>
          </div>

          {/* Edit Form */}
          <div className="w-full min-h-screen bg-gray-100 py-10">
            <div className="max-w-4xl mx-auto bg-white shadow-md rounded-md p-8">
              <div className="space-y-8 flex justify-center items-center flex-col">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
                    Basic Information
                  </h2>

                  {/* Room Type */}
                  <div>
                    <TextInput
                      label="Room Type"
                      required
                      placeholder="Enter room type"
                      register={register("roomType")}
                    />
                    {errors.roomType && (
                      <p className="text-red-500">{errors.roomType.message}</p>
                    )}
                  </div>

                  {/* Room Size and Bed Type - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <TextInput
                        label="Room size(sqm)"
                        required
                        type="number"
                        placeholder="Enter room size"
                        register={register("roomSize")}
                      />
                      {errors.roomSize && (
                        <p className="text-red-500">
                          {errors.roomSize.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <DropDownInput
                        options={[
                          "Single bed",
                          "Double bed",
                          "King bed",
                          "Twin beds",
                        ]}
                        name="bedType"
                        register={register("bedType")}
                        setValue={setValue}
                        defaultValue={room?.bed_type}
                        label="Bed Type"
                      />
                      {errors.bedType && (
                        <p className="text-red-500">{errors.bedType.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Guest Count */}
                  <div>
                    <TextInput
                      label="Guest(s)"
                      type="number"
                      register={register("guests")}
                      className="w-60"
                    />
                    {errors.guests && (
                      <p className="text-red-500">{errors.guests.message}</p>
                    )}
                  </div>

                  {/* Price and Promotion Price - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <TextInput
                        label="Price per Night (THB)"
                        type="number"
                        placeholder="Enter price"
                        register={register("pricePerNight")}
                        className="w-full"
                      />
                      {errors.pricePerNight && (
                        <p className="text-red-500">
                          {errors.pricePerNight.message}
                        </p>
                      )}
                    </div>

                    <div>
                      {/* Promotion Price */}
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Promotion Price
                      </label>
                      <div className="flex flex-row">
                        <div className="flex items-center space-x-3">
                          {/* ✅ Checkbox to enable/disable promotion price */}
                          <input
                            type="checkbox"
                            className="accent-orange-500"
                            checked={watch("hasPromotion")}
                            onChange={(e) =>
                              setValue("hasPromotion", e.target.checked, {
                                shouldValidate: true,
                              })
                            }
                          />
                          <span className="text-sm text-gray-600 w-30">
                            Promotion price
                          </span>
                        </div>

                        <div>
                          <TextInput
                            type="number"
                            register={register("promotionPrice")}
                            disabled={!watch("hasPromotion")}
                            className={`w-60 ${
                              hasPromotion
                                ? "focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                : "bg-gray-100 cursor-not-allowed"
                            }`}
                          />
                        </div>
                      </div>
                      {errors.promotionPrice && (
                        <p className="text-red-500">
                          {errors.promotionPrice.message}
                        </p>
                      )}
                    </div>

                    {/* Room Description */}
                    <div>
                      <TextArea
                        label="Room Description"
                        required
                        placeholder="Enter room description"
                        register={register("description")}
                        className="w-180"
                      />
                      {errors.description && (
                        <p className="text-red-500">
                          {errors.description.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Room Image Section */}
                  <div className="space-y-6">
                    <h2 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
                      Room Image
                    </h2>

                    {/* Main Image */}
                    <div>
                      <RoomMainImage
                        name="mainImgUrl"
                        value={room?.main_image_url && room.main_image_url[0]}
                      />
                      {errors.mainImgUrl && (
                        <p className="text-red-500">
                          {errors.mainImgUrl.message}
                        </p>
                      )}
                    </div>

                    {/* Image Gallery */}
                    <div>
                      <RoomGalleryImages
                        name="galleryImageUrls"
                        value={room?.gallery_images}
                      />
                      {errors.galleryImageUrls && (
                        <p className="text-red-500">
                          {errors.galleryImageUrls.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6 mt-5">
                    <h2 className="text-lg font-medium text-gray-700 border-t pt-5 border-gray-200 pb-2">
                      Room Amenities
                    </h2>
                    {/* Amenity */}
                    <AmenityItems name="amenities" value={room?.amenities} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </Layout>
  );
}
