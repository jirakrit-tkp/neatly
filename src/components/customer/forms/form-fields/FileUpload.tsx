import React, { useCallback, useState, useEffect } from "react";
import { PlusIcon } from "@/components/customer/icons/PlusIcon";
import { CloseIcon } from "@/components/customer/icons/CloseIcon";
import Image from "next/image";

// ตรวจสอบว่า FileUpload component รองรับ currentImage prop หรือไม่
interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  error?: boolean;
  currentImage?: string; // ตรวจสอบว่า prop นี้มีหรือไม่
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  error = false,
  currentImage,
}) => {
  // เพิ่ม currentImage
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // แสดงรูปปัจจุบันหรือรูปที่เลือกใหม่
  const displayImage = previewUrl || currentImage;

  // สร้าง preview URL เมื่อมีไฟล์ที่เลือก
  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl); // cleanup
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null; // รับแค่ไฟล์เดียว
    setSelectedFile(file);
    onFileSelect(file);

    // reset input (เลือกไฟล์เดิมได้ซ้ำ)
    event.target.value = "";
  };

  const handleRemoveImage = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setSelectedFile(null);
      setPreviewUrl(null);
      onFileSelect(null); // ส่ง null ไปลบรูปปัจจุบัน
    },
    [onFileSelect]
  );

  return (
    <div className="w-full">
      <div
        className={`bg-gray-200 relative w-[167px] h-[167px] rounded text-center transition-colors cursor-pointer group ${
          error
            ? "border-red-300 bg-red-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
        style={{ overflow: "visible" }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        {displayImage ? (
          <>
            <Image
              width={800}
              height={600}
              src={displayImage} // ใช้ displayImage แทน previewUrl
              alt="Profile Preview"
              className="absolute inset-0 w-full h-full object-cover rounded-[4px]"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute bg-red text-white rounded-full flex items-center justify-center z-30
                  transition-opacity duration-200"
              style={{
                width: "24px",
                height: "24px",
                top: "-8px",
                right: "-8px",
                borderRadius: "99px",
                boxShadow: "2px 2px 12px 0px rgba(64, 50, 133, 0.12)",
              }}
              aria-label="Remove image"
            >
              <CloseIcon className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-0">
            <PlusIcon size={24} className="text-orange-500" />
            <div className="w-[91px] h-[21px] text-orange-500 font-medium text-sm leading-[150%] tracking-[0%] font-inter text-center">
              Upload photo
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          Please select a valid image file
        </p>
      )}
    </div>
  );
};
