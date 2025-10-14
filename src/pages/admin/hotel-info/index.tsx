import Layout from "@/components/admin/Layout";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface HotelInformation {
  name: string;
  description: string;
  logo_url: string;
}

export default function HotelInfoPage() {
  const [hotelInfo, setHotelInfo] = useState<HotelInformation>({
    name: "",
    description: "",
    logo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoRemoved, setLogoRemoved] = useState(false);

  useEffect(() => {
    const fetchHotelInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/hotel-info");
        const data = await res.json();
        if (res.ok && data.success) {
          setHotelInfo({
            name: data.data.name,
            description: data.data.description,
            logo_url: data.data.logo_url,
          });
          setLogoRemoved(!data.data.logo_url);
        } else {
          setError(data.message || "Failed to fetch hotel information");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchHotelInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage("");
    setError(null);

    try {
      const res = await fetch("/api/hotel-info", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: hotelInfo.name,
          description: hotelInfo.description,
          logo_url: logoRemoved ? "" : hotelInfo.logo_url,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUpdateMessage("Hotel information updated successfully!");
        setHotelInfo({
          name: data.data.name,
          description: data.data.description,
          logo_url: data.data.logo_url,
        });
        setLogoRemoved(!data.data.logo_url);
        setTimeout(() => setUpdateMessage(""), 3000);
      } else {
        setUpdateMessage(
          "Failed to update hotel information. Please try again."
        );
      }
    } catch (err) {
      setUpdateMessage("Failed to update hotel information. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveLogo = () => {
    setHotelInfo((prev) => ({ ...prev, logo_url: "" }));
    setLogoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setHotelInfo((prev) => ({
          ...prev,
          logo_url: ev.target?.result as string,
        }));
        setLogoRemoved(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Layout>
      <main className="flex flex-1 flex-col bg-[#F6F7FC] items-start justify-start min-h-screen">
        {/* Header */}
        <div className="border border-gray-200 bg-white px-10 py-6 mb-8 flex items-center justify-between w-full" style={{ minHeight: 56 }}>
          <span className="text-xl font-semibold">Hotel Information</span>
          <button
            type="submit"
            form="hotel-info-form"
            disabled={isUpdating || loading}
            className={`${
              isUpdating || loading
                ? "bg-orange-600 cursor-not-allowed"
                : "bg-orange-600 hover:bg-[#a03f18]"
            } text-white rounded px-8 py-3 text-base font-medium transition-colors`}
            style={{ width: 121, height: 48 }}
          >
            {isUpdating ? "Updating..." : "Update"}
          </button>
        </div>

        {/* Form Card - styled to match example image */}
        <div
          className="bg-white rounded-lg shadow-sm border border-[#E7E9ED] flex justify-center items-center"
          style={{
            width: 180,
            height: 747,
            minWidth: 1080,
            minHeight: 747,
            maxWidth: 180,
            maxHeight: 747,
            marginLeft: 30,
            marginRight: 30,
          }}
        >
          <form
            id="hotel-info-form"
            className="flex flex-col gap-7 px-7 py-10 w-full max-w-4xl"
            onSubmit={handleSubmit}
            style={{ minWidth: 700 }}
          >
            {/* Status Messages */}
            {updateMessage && (
              <div
                className={`p-3 rounded-md mb-2 ${
                  updateMessage.includes("successfully")
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-red-100 text-red-700 border border-red-200"
                }`}
              >
                {updateMessage}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-md bg-red-100 text-red-700 border border-red-200 mb-2">
                Error: {error}
              </div>
            )}

            {/* Hotel Name */}
            <div className="mb-3 flex flex-col">
              <label
                className="block text-base font-medium text-[#4C5767] mb-2"
                htmlFor="hotel-name"
              >
                Hotel name <span className="text-red-500">*</span>
              </label>
              <input
                id="hotel-name"
                name="hotel-name"
                type="text"
                value={hotelInfo.name}
                onChange={(e) =>
                  setHotelInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                className="border border-[#CED1D8] rounded px-4 py-2 text-base focus:outline-[#B35023] bg-white"
                style={{
                  width: "100%",
                  height: 45,
                  minWidth: 350,
                  maxWidth: 900,
                  minHeight: 45,
                  fontSize: 16,
                }}
                disabled={loading}
              />
            </div>

            {/* Hotel Description */}
            <div className="mb-3 flex flex-col">
              <label
                className="block text-base font-medium text-[#4C5767] mb-2"
                htmlFor="hotel-description"
              >
                Hotel description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="hotel-description"
                name="hotel-description"
                value={hotelInfo.description}
                onChange={(e) =>
                  setHotelInfo((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="border border-[#CED1D8] rounded px-4 py-3 text-base focus:outline-[#B35023] bg-white"
                style={{
                  width: "100%",
                  height: 168,
                  minWidth: 350,
                  maxWidth: 900,
                  minHeight: 120,
                  fontSize: 15,
                  resize: "none",
                }}
                disabled={loading}
              />
            </div>

            {/* Hotel Logo */}
            <div className="mb-2 flex flex-col">
              <label className="block text-base font-medium text-[#4C5767] mb-2">
                Hotel logo <span className="text-red-500">*</span>
              </label>
              <div
                className="relative"
                style={{
                  width: 120,
                  height: 100,
                  minWidth: 120,
                  minHeight: 100,
                  borderRadius: 8,
                  background: "#F1F2F7",
                  border: "1px solid #CED1D8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {logoRemoved || !hotelInfo.logo_url ? (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded cursor-pointer transition hover:bg-gray-200"
                    style={{
                      width: 120,
                      height: 100,
                      minWidth: 120,
                      minHeight: 100,
                      borderRadius: 8,
                    }}
                    onClick={() => !loading && fileInputRef.current?.click()}
                    tabIndex={0}
                    role="button"
                    aria-label="Upload logo"
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !loading) {
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <span
                      className="text-4xl text-[#B35023] mb-1 leading-none"
                      style={{ lineHeight: "1", border: 0, fontWeight: "bold" }}
                    >
                      +
                    </span>
                    <span className="text-[#B35023] text-xs font-medium">
                      Upload photo
                    </span>
                  </div>
                ) : (
                  <>
                    <Image
                      width={120}
                      height={100}
                      src={hotelInfo.logo_url}
                      alt="Hotel Logo"
                      className="object-contain rounded bg-white border"
                      style={{
                        width: 120,
                        height: 100,
                        minWidth: 120,
                        minHeight: 100,
                        borderRadius: 8,
                        border: "none",
                      }}
                    />
                    <button
                      type="button"
                      className="absolute -top-2 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600"
                      aria-label="Remove logo"
                      onClick={handleRemoveLogo}
                      disabled={loading}
                      style={{ zIndex: 20 }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M3 3L9 9M9 3L3 9"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    <div
                      className="absolute inset-0 cursor-pointer"
                      style={{ zIndex: 10, borderRadius: 8 }}
                      onClick={() => !loading && fileInputRef.current?.click()}
                      aria-label="Upload logo"
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if ((e.key === "Enter" || e.key === " ") && !loading) {
                          fileInputRef.current?.click();
                        }
                      }}
                    />
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                  disabled={loading}
                />
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                Allowed: PNG, JPG, JPEG, GIF
              </div>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}
