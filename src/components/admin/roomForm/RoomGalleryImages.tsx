import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Reorder } from "framer-motion";
import Image from "next/image";

interface RoomGalleryImagesProps {
  name: string;
  value: string[] | undefined;
}

type GalleryItem = {
  id: string;
  url?: string; // URL for existing images
  file?: File; // File for new uploads
  preview: string; // Preview URL (blob or actual URL)
};

export const RoomGalleryImages = ({ name, value }: RoomGalleryImagesProps) => {
  const { setValue, watch } = useFormContext();

  // Initialize gallery items from form value
  const formValue = watch(name) || [];
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() =>
    formValue.map((item: string | File, idx: number) => {
      if (typeof item === "string") {
        // Existing URL
        return {
          id: `${idx}-${Date.now()}`,
          url: item,
          preview: item,
        };
      } else {
        // File object (shouldn't happen on init, but handle it)
        return {
          id: `${idx}-${Date.now()}`,
          file: item,
          preview: URL.createObjectURL(item),
        };
      }
    })
  );

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      galleryItems.forEach((item) => {
        if (item.file && item.preview.startsWith("blob:")) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, []);

  // Sync form value when gallery items change
  const updateFormValue = (items: GalleryItem[]) => {
    setGalleryItems(items);
    // Store either File objects or URL strings
    const formData = items.map((item) => item.file || item.url);
    setValue(name, formData, { shouldValidate: true });
  };

  // Sync with external form changes
  useEffect(() => {
    const currentFormValue = watch(name) || [];
    const currentData = galleryItems.map((item) => item.file || item.url);

    // Only update if form value differs from current state
    if (JSON.stringify(currentFormValue) !== JSON.stringify(currentData)) {
      const newItems = currentFormValue.map(
        (item: string | File, idx: number) => {
          if (typeof item === "string") {
            return {
              id: `${idx}-${Date.now()}`,
              url: item,
              preview: item,
            };
          } else {
            return {
              id: `${idx}-${Date.now()}`,
              file: item,
              preview: URL.createObjectURL(item),
            };
          }
        }
      );
      setGalleryItems(newItems);
    }
  }, [watch(name)]);

  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const newItems: GalleryItem[] = [];

    for (const file of newFiles) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert(
          `Invalid file type for ${file.name}. Only JPEG, PNG, and WebP are allowed.`
        );
        continue;
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        continue;
      }

      // Create preview using blob URL (no upload yet)
      const preview = URL.createObjectURL(file);

      newItems.push({
        id: crypto.randomUUID(),
        file: file,
        preview: preview,
      });

      console.log(`File selected (not uploaded yet): ${file.name}`);
    }

    // Update with new items
    updateFormValue([...galleryItems, ...newItems]);

    // Clear input
    e.target.value = "";
  };

  const handleRemoveItem = (indexToRemove: number) => {
    const itemToRemove = galleryItems[indexToRemove];

    // Revoke blob URL if it exists
    if (itemToRemove.file && itemToRemove.preview.startsWith("blob:")) {
      URL.revokeObjectURL(itemToRemove.preview);
    }

    const newItems = galleryItems.filter((_, i) => i !== indexToRemove);
    updateFormValue(newItems);
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image Gallery (At least 4 pictures){" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {/* Grid of uploaded images */}
          <Reorder.Group
            as="div"
            axis="x"
            values={galleryItems}
            onReorder={updateFormValue}
            className="flex gap-4 overflow-x-auto py-2"
          >
            {galleryItems.map((item, index) => (
              <Reorder.Item
                key={item.id}
                value={item}
                as="div"
                className="w-42 h-42 rounded-md flex items-center justify-center relative bg-[#F1F2F6] cursor-grab active:cursor-grabbing flex-shrink-0"
                whileDrag={{
                  scale: 1.02,
                  zIndex: 999,
                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                }}
                transition={{ type: "keyframes", stiffness: 600, damping: 30 }}
              >
                {/* Remove button */}
                <div className="bg-[#B61515] absolute -top-2 -right-2 rounded-full w-6 h-6 flex items-center justify-center z-10">
                  <button
                    type="button"
                    className="text-white text-xs font-bold hover:bg-red-700 w-full h-full rounded-full flex items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveItem(index);
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Image preview */}
                <Image
                  src={item.preview}
                  width={800}
                  height={600}
                  alt={`Gallery image ${index + 1}`}
                  className="object-contain w-full h-full rounded-md select-none"
                  unoptimized={!!item.file} // Don't optimize blob URLs
                  onError={(e) => {
                    console.error("Image failed to load:", item.preview);
                    e.currentTarget.src = "/placeholder-image.png";
                  }}
                  draggable={false}
                />

                {/* "Not uploaded" indicator for new files */}
                {item.file && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-1">
                    <p className="text-xs truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-300">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB • Not
                      uploaded yet
                    </p>
                  </div>
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {/* File input */}
          <label className="w-42 h-42 rounded-md flex flex-col items-center justify-center bg-[#F1F2F6] hover:bg-gray-100 cursor-pointer transition-colors">
            <p className="text-2xl text-orange-500">+</p>
            <p className="text-xs text-orange-500">Upload Photos</p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleGalleryFilesChange}
            />
          </label>
        </div>

        {/* Helper text */}
        {/* <p className="text-xs text-gray-500 mt-2">
          PNG, JPG, WEBP up to 10MB each. Images will be uploaded when you click
          Create.
        </p> */}
      </div>
    </>
  );
};
