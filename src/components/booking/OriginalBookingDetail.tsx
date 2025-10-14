import { formatDate } from "@/utils/formatDate";

interface OriginalBookingDetailProps {
  roomType?: string;
  bookingDate?: string;
  checkInDate: string;
  checkOutDate: string;
}

export default function OriginalBookingDetail({
  roomType,
  bookingDate,
  checkInDate,
  checkOutDate,
}: OriginalBookingDetailProps) {
  return (
    <div className="md:w-full p-5 md:p-0 md:pl-15">
      {/* Room Type and Booking Date Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-black font-inter mt-2">
          {roomType || "Room"}
        </h2>
        <p className="text-md text-gray-600">
          Booking date: {bookingDate ? formatDate(bookingDate) : "N/A"}
        </p>
      </div>

      {/* Original Dates */}
      <div className="mb-8">
        <p className="text-lg font-semibold text-gray-800 mb-2">
          Original Date
        </p>
        <p className="text-gray-700 text-md">
          {formatDate(checkInDate)} - {formatDate(checkOutDate)}
        </p>
      </div>
    </div>
  );
}
