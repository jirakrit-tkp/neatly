// /src/schemas/roomSchema.ts
import { z } from "zod";

export const roomSchema = z
  .object({
    roomType: z.string().min(1, "Room type is required"),

    roomSize: z.coerce
      .number()
      .min(10, "Room size must be at least 10 sqm")
      .max(200, "Room size cannot exceed 200 sqm"),

    bedType: z.string().min(1, "Bed type is required"),

    guests: z.coerce
      .number()
      .min(1, "Number of guests must be at least 1")
      .max(5, "Number of guests cannot exceed 5"),

    pricePerNight: z.coerce.number().positive("Price must be greater than 0"),

    promotionPrice: z
      .union([
        z.coerce.number().positive("Promotion price must be greater than 0"),
        z.null(),
      ])
      .nullable(),

    hasPromotion: z.boolean(),

    description: z
      .string()
      .min(10, "Description must be at least 10 characters long"),

    mainImgUrl: z
      .union([
        z.instanceof(File),
        z.string().min(1, "Main image is required"),
        z.null(),
      ])
      .refine((val) => val !== null && val !== "", {
        message: "Main image is required",
      }),

    galleryImageUrls: z
      .array(z.union([z.instanceof(File), z.string().url()]))
      .min(4, "Please upload at least 4 images")
      .max(10, "You can upload at most 10 images"),

    amenities: z.array(z.string()).min(1, "Please add at least one amenity"),
  })
  .refine(
    (data) => {
      if (data.hasPromotion) {
        return (
          data.promotionPrice !== null && data.promotionPrice !== undefined
        );
      }
      return true;
    },
    {
      message: "Promotion price is required.",
      path: ["promotionPrice"],
    }
  );

// ✅ TypeScript type now matches exactly
export type RoomFormData = z.infer<typeof roomSchema>;
