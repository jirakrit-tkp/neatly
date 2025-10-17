import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";

interface RoomMainImageProps {
  name: string;
  value?: string;
}

export const RoomMainImage = ({ name, value }: RoomMainImageProps) => {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setValue, watch } = useFormContext();

  // Watch for changes to the form value (useful for edit mode)
  const formValue = watch(name);

  useEffect(() => {
    // If the form value changes externally (e.g., reset), update preview
    if (typeof formValue === "string" && formValue !== preview) {
      setPreview(formValue);
    }
  }, [formValue]);

  const removeFile = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setValue(name, null, { shouldValidate: true, shouldDirty: true });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);

    // Create preview URL using FileReader (NO UPLOAD YET)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Store the File object in the form (will be uploaded on submit)
    setValue(name, file, { shouldValidate: true, shouldDirty: true });

    console.log("File selected (not uploaded yet):", file.name);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Main Image <span className="text-red-500">*</span>
      </label>

      <div className="relative w-60 h-60">
        {/* Preview image (on top if exists) */}
        {preview && (
          <div className="absolute inset-0 z-10 border border-gray-300 rounded-md flex items-center justify-center bg-white shadow overflow-hidden">
            <Image
              src={preview}
              alt="Main room preview"
              fill
              className="object-cover"
              unoptimized={selectedFile !== null} // Don't optimize blob URLs
            />

            {/* Remove button */}
            <div className="bg-[#B61515] rounded-full w-6 h-6 absolute top-2 right-2">
              <button
                type="button"
                onClick={removeFile}
                className="absolute cursor-pointer text-white left-2 top-1 text-xs font-bold"
                title="Remove image"
              >
                ✕
              </button>
            </div>

            {/* File info overlay (only show for newly selected files) */}
            {selectedFile && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2">
                <p className="text-xs font-medium truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-300">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Not
                  uploaded yet
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload box (always visible as background) */}
        <label className="w-60 h-60 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center bg-[#F1F2F6] hover:bg-gray-100 cursor-pointer transition-colors">
          <p className="text-2xl text-orange-500">+</p>
          <p className="text-sm text-orange-500">
            {preview ? "Change Image" : "Upload Image"}
          </p>
          <input
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
        </label>
      </div>

      {/* Helper text */}
      {/* <p className="text-xs text-gray-500 mt-2">
        PNG, JPG, WEBP up to 10MB. Image will be uploaded when you click Create.
      </p> */}
    </div>
  );
};
