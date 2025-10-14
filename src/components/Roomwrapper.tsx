"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import EnvironmentCheck from "./EnvironmentCheck";

// คุณต้องตั้งค่า env variables เหล่านี้ใน .env.local ของโปรเจกต์คุณ
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type RoomType = {
  id: number;
  name: string;
  main_image: string;
  link?: string;
  // เพิ่ม field อื่นๆ ตาม schema ของคุณ
};

const Roomwrapper = () => {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        // Debug environment variables
        console.log("Supabase URL:", supabaseUrl ? "Set" : "Missing");
        console.log("Supabase Key:", supabaseAnonKey ? "Set" : "Missing");

        const { data, error } = await supabase
          .from("room_types")
          .select("*")
          .order("id", { ascending: true });

        if (error) {
          console.error("Error fetching rooms:", error);
          return;
        }

        if (data) {
          console.log("Fetched rooms data:", data);
          console.log("First room image URL:", data[0]?.main_image);
          setRooms(data);
        } else {
          console.log("No rooms data found");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // กำหนด layout เดิมตาม index เดิม ถ้าไม่มีข้อมูลพอจะไม่แสดง
  return (
    <section
      id="rooms"
      className="
        bg-[#F7F7FA]
        w-full
        flex flex-col items-center
        py-10 md:py-20
      "
      style={{
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <EnvironmentCheck />
      <h2
        className="
            text-[#2D5A27]
            text-[30px] md:text-[48px]
            font-serif
            text-center
            mb-8 md:mb-14
          "
      >
        Rooms &amp; Suites
      </h2>
      <div
        className="
          w-full md:max-w-[1120px]
          flex flex-col gap-4 md:gap-6
          px-0 md:px-0
        "
        style={{
          width: "100vw",
          maxWidth: "100vw",
        }}
      >
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27] mx-auto mb-4"></div>
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No rooms available at the moment.</p>
            <p className="text-sm mt-2">Please check your database connection or add some room types.</p>
          </div>
        ) : (
          <>
            {/* Row 1: Superior Garden View */}
            {rooms[0] && (
              <div
                className="relative overflow-hidden shadow mx-auto superior-garden-image"
                style={{
                  width: "100%",
                  minWidth: "0",
                  maxWidth: "100%",
                  height: "250px",
                  minHeight: "250px",
                  maxHeight: "250px",
                  borderRadius: "0px",
                }}
              >
                <Image
                  src={rooms[0].main_image || "/image/superiorgarden.jpg"}
                  alt={rooms[0].name}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 767px) 100vw, (min-width: 768px) 1120px"
                  style={{
                    objectFit: "cover",
                    borderRadius: "0px",
                  }}
                  onError={(e) => {
                    console.error("Image failed to load:", rooms[0].main_image);
                    e.currentTarget.src = "/image/superiorgarden.jpg";
                  }}
                />
                <style>
                  {`
                    @media (min-width: 768px) {
                      .superior-garden-image {
                        width: 1120px !important;
                        min-width: 1120px !important;
                        max-width: 1120px !important;
                        height: 540px !important;
                        min-height: 540px !important;
                        max-height: 540px !important;
                        border-radius: 0px !important;
                      }
                    }
                    @media (max-width: 767px) {
                      .superior-garden-image {
                        width: 100% !important;
                        min-width: 0 !important;
                        max-width: 100% !important;
                        height: 250px !important;
                        min-height: 250px !important;
                        max-height: 250px !important;
                        border-radius: 0px !important;
                      }
                    }
                  `}
                </style>
                <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                  <span className="text-white text-lg md:text-2xl font-serif mb-2 drop-shadow">
                    {rooms[0].name}
                  </span>
                  <Link
                    href="/customer/search-result/1"
                    className="text-white text-sm"
                    style={{ textDecoration: "none" }}
                  >
                    Explore Room &rarr;
                  </Link>
                </div>
              </div>
            )}
            {/* Row 2: Deluxe and Superior */}
            {(rooms[1] || rooms[2]) && (
              <div className="flex flex-col md:flex-row md:justify-center gap-4 md:gap-6 w-full">
                {/* Deluxe */}
                {rooms[1] && (
                  <div
                    className="relative overflow-hidden shadow room-deluxe-image"
                    style={{
                      width: "100%",
                      minWidth: "0",
                      maxWidth: "100%",
                      height: "250px",
                      minHeight: "250px",
                      maxHeight: "250px",
                      borderRadius: "0px",
                    }}
                  >
                    <Image
                      src={rooms[1].main_image || "/image/deluxe.jpg"}
                      alt={rooms[1].name}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 767px) 100vw, (min-width: 768px) 643px"
                      style={{
                        objectFit: "cover",
                        borderRadius: "0px",
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", rooms[1].main_image);
                        e.currentTarget.src = "/image/deluxe.jpg";
                      }}
                    />
                    <style>
                      {`
                        @media (min-width: 768px) {
                          .room-deluxe-image {
                            width: 643px !important;
                            min-width: 643px !important;
                            max-width: 643px !important;
                            height: 400px !important;
                            min-height: 400px !important;
                            max-height: 400px !important;
                            border-radius: 0px !important;
                          }
                        }
                        @media (max-width: 767px) {
                          .room-deluxe-image {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            height: 250px !important;
                            min-height: 250px !important;
                            max-height: 250px !important;
                            border-radius: 0px !important;
                          }
                        }
                      `}
                    </style>
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                      <span className="text-white text-base md:text-xl font-serif mb-2 drop-shadow">
                        {rooms[1].name}
                      </span>
                      <Link
                        href="/customer/search-result/2"
                        className="text-white text-sm"
                        style={{ textDecoration: "none" }}
                      >
                        Explore Room &rarr;
                      </Link>
                    </div>
                  </div>
                )}
                {/* Superior */}
                {rooms[2] && (
                  <div
                    className="relative overflow-hidden shadow room-superior-image"
                    style={{
                      width: "100%",
                      minWidth: "0",
                      maxWidth: "100%",
                      height: "250px",
                      minHeight: "250px",
                      maxHeight: "250px",
                      borderRadius: "0px",
                    }}
                  >
                    <Image
                      src={rooms[2].main_image || "/image/superior.jpg"}
                      alt={rooms[2].name}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 767px) 100vw, (min-width: 768px) 453px"
                      style={{
                        objectFit: "cover",
                        borderRadius: "0px",
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", rooms[2].main_image);
                        e.currentTarget.src = "/image/superior.jpg";
                      }}
                    />
                    <style>
                      {`
                        @media (min-width: 768px) {
                          .room-superior-image {
                            width: 453px !important;
                            min-width: 453px !important;
                            max-width: 453px !important;
                            height: 400px !important;
                            min-height: 400px !important;
                            max-height: 400px !important;
                            border-radius: 0px !important;
                          }
                        }
                        @media (max-width: 767px) {
                          .room-superior-image {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            height: 250px !important;
                            min-height: 250px !important;
                            max-height: 250px !important;
                            border-radius: 0px !important;
                          }
                        }
                      `}
                    </style>
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                      <span className="text-white text-base md:text-xl font-serif mb-2 drop-shadow">
                        {rooms[2].name}
                      </span>
                      <Link
                        href="/customer/search-result/3"
                        className="text-white text-sm"
                        style={{ textDecoration: "none" }}
                      >
                        Explore Room &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Row 3: Premier Sea View (left tall) and right column with Supreme + Suite */}
            {(rooms[3] || rooms[4] || rooms[5]) && (
              <div className="flex flex-col md:flex-row md:justify-center gap-4 md:gap-6 w-full">
                {/* Left: Premier Sea View (tall) */}
                {rooms[3] && (
                  <div
                    className="relative overflow-hidden shadow room-premiersea-image"
                    style={{
                      width: "100%",
                      minWidth: "0",
                      maxWidth: "100%",
                      height: "250px",
                      minHeight: "250px",
                      maxHeight: "250px",
                      borderRadius: "0px",
                    }}
                  >
                    <Image
                      src={rooms[3].main_image || "/image/premiersea.jpg"}
                      alt={rooms[3].name}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 767px) 100vw, (min-width: 768px) 453px"
                      style={{
                        objectFit: "cover",
                        borderRadius: "0px",
                      }}
                      onError={(e) => {
                        console.error("Image failed to load:", rooms[3].main_image);
                        e.currentTarget.src = "/image/premiersea.jpg";
                      }}
                    />
                    <style>
                      {`
                        @media (min-width: 768px) {
                          .room-premiersea-image {
                            width: 453px !important;
                            min-width: 453px !important;
                            max-width: 453px !important;
                            height: 700px !important;
                            min-height: 700px !important;
                            max-height: 700px !important;
                            border-radius: 0px !important;
                          }
                        }
                        @media (max-width: 767px) {
                          .room-premiersea-image {
                            width: 100% !important;
                            min-width: 0 !important;
                            max-width: 100% !important;
                            height: 250px !important;
                            min-height: 250px !important;
                            max-height: 250px !important;
                            border-radius: 0px !important;
                          }
                        }
                      `}
                    </style>
                    <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                      <span className="text-white text-base md:text-xl font-serif mb-2 drop-shadow">
                        {rooms[3].name}
                      </span>
                      <Link
                        href="/customer/search-result/4"
                        className="text-white text-sm"
                        style={{ textDecoration: "none" }}
                      >
                        Explore Room &rarr;
                      </Link>
                    </div>
                  </div>
                )}
                {/* Right column: Supreme + Suite stacked */}
                {(rooms[4] || rooms[5]) && (
                  <div
                    className="flex flex-col gap-4 md:gap-6 room-right-column"
                    style={{
                      width: "100%",
                      minWidth: "0",
                      maxWidth: "100%",
                    }}
                  >
                    <style>
                      {`
                        @media (min-width: 768px) {
                          .room-right-column {
                            width: 643px !important;
                            min-width: 643px !important;
                            max-width: 643px !important;
                          }
                        }
                      `}
                    </style>
                    {/* Supreme */}
                    {rooms[4] && (
                      <div
                        className="relative overflow-hidden shadow room-supreme-image"
                        style={{
                          width: "100%",
                          minWidth: "0",
                          maxWidth: "100%",
                          height: "250px",
                          minHeight: "250px",
                          maxHeight: "250px",
                          borderRadius: "0px",
                        }}
                      >
                        <Image
                          src={rooms[4].main_image || "/image/supreme.jpg"}
                          alt={rooms[4].name}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 767px) 100vw, (min-width: 768px) 643px"
                          style={{
                            objectFit: "cover",
                            borderRadius: "0px",
                          }}
                          onError={(e) => {
                            console.error("Image failed to load:", rooms[4].main_image);
                            e.currentTarget.src = "/image/supreme.jpg";
                          }}
                        />
                        <style>
                          {`
                            @media (min-width: 768px) {
                              .room-supreme-image {
                                width: 643px !important;
                                min-width: 643px !important;
                                max-width: 643px !important;
                                height: 338px !important;
                                min-height: 338px !important;
                                max-height: 338px !important;
                                border-radius: 0px !important;
                              }
                            }
                            @media (max-width: 767px) {
                              .room-supreme-image {
                                width: 100% !important;
                                min-width: 0 !important;
                                max-width: 100% !important;
                                height: 250px !important;
                                min-height: 250px !important;
                                max-height: 250px !important;
                                border-radius: 0px !important;
                              }
                            }
                          `}
                        </style>
                        <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                          <span className="text-white text-base md:text-xl font-serif mb-2 drop-shadow">
                            {rooms[4].name}
                          </span>
                          <Link
                            href="/customer/search-result/5"
                            className="text-white text-sm"
                            style={{ textDecoration: "none" }}
                          >
                            Explore Room &rarr;
                          </Link>
                        </div>
                      </div>
                    )}
                    {/* Suite */}
                    {rooms[5] && (
                      <div
                        className="relative overflow-hidden shadow room-suite-image"
                        style={{
                          width: "100%",
                          minWidth: "0",
                          maxWidth: "100%",
                          height: "250px",
                          minHeight: "250px",
                          maxHeight: "250px",
                          borderRadius: "0px",
                        }}
                      >
                        <Image
                          src={rooms[5].main_image || "/image/suite.jpg"}
                          alt={rooms[5].name}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 767px) 100vw, (min-width: 768px) 643px"
                          style={{
                            objectFit: "cover",
                            borderRadius: "0px",
                          }}
                          onError={(e) => {
                            console.error("Image failed to load:", rooms[5].main_image);
                            e.currentTarget.src = "/image/suite.jpg";
                          }}
                        />
                        <style>
                          {`
                            @media (min-width: 768px) {
                              .room-suite-image {
                                width: 643px !important;
                                min-width: 643px !important;
                                max-width: 643px !important;
                                height: 338px !important;
                                min-height: 338px !important;
                                max-height: 338px !important;
                                border-radius: 0px !important;
                              }
                            }
                            @media (max-width: 767px) {
                              .room-suite-image {
                                width: 100% !important;
                                min-width: 0 !important;
                                max-width: 100% !important;
                                height: 250px !important;
                                min-height: 250px !important;
                                max-height: 250px !important;
                                border-radius: 0px !important;
                              }
                            }
                          `}
                        </style>
                        <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 md:p-6">
                          <span className="text-white text-base md:text-xl font-serif mb-2 drop-shadow">
                            {rooms[5].name}
                          </span>
                          <Link
                            href="/customer/search-result/6"
                            className="text-white text-sm"
                            style={{ textDecoration: "none" }}
                          >
                            Explore Room &rarr;
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default Roomwrapper;
