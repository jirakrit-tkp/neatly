import DatePicker from "../../ui/DatePicker";
import { LineChartComponent } from "../LineChartComponent";
import { DropDownInput } from "../../ui/DropdownInput";
import { Button } from "../../ui/Button";
import { CreditCard } from "lucide-react";
import { Banknote } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState, useMemo } from "react";
import ProgressBarSection from "./ProgressBarSection";
import OccupancyBarChart from "../OccupancyRateBarChart";

import { Bookings } from "@/pages/admin/analytics";
import { Room } from "@/types/rooms";

interface OccupancyAndGuestSectionProps {
  bookingsData: Bookings[] | null | undefined;
  roomsData: Room[] | null | undefined;
}

const OccupancyAndGuestSection: React.FC<OccupancyAndGuestSectionProps> = ({
  bookingsData,
  roomsData,
}) => {
  const options = ["Overall", "Room Types"];
  const { setValue } = useForm();
  const [selectedView, setSelectedView] = useState("Overall");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Calculate occupancy rate data
  const occupancyData = useMemo(() => {
    if (
      !bookingsData ||
      bookingsData.length === 0 ||
      !roomsData ||
      roomsData.length === 0
    )
      return [];

    // Calculate total available rooms
    const totalRooms = roomsData.length;

    // Parse date range
    const rangeStart = startDate ? new Date(startDate) : null;
    const rangeEnd = endDate ? new Date(endDate) : null;

    // If no date range selected, return empty
    if (!rangeStart || !rangeEnd) return [];

    // Group bookings by month and calculate occupancy rate
    const monthlyOccupancy: Record<
      string,
      { bookedDays: number; totalDays: number }
    > = {};

    // Initialize all months in the range with 0
    for (
      let d = new Date(rangeStart);
      d <= rangeEnd;
      d.setMonth(d.getMonth() + 1)
    ) {
      const monthYear = `${d.toLocaleString("default", {
        month: "long",
      })} ${d.getFullYear()}`;

      const daysInMonth = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      ).getDate();

      if (!monthlyOccupancy[monthYear]) {
        monthlyOccupancy[monthYear] = {
          bookedDays: 0,
          totalDays: daysInMonth * totalRooms,
        };
      }
    }

    // Now count booked days
    bookingsData.forEach((booking) => {
      if (booking.status === "confirmed" || booking.status === "pending") {
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);

        // Skip if booking doesn't overlap with range
        if (checkOut < rangeStart || checkIn > rangeEnd) return;

        // Iterate through each day of the booking within the range
        const loopStart = new Date(
          Math.max(checkIn.getTime(), rangeStart.getTime())
        );
        const loopEnd = new Date(
          Math.min(checkOut.getTime(), rangeEnd.getTime())
        );

        for (
          let d = new Date(loopStart);
          d < loopEnd;
          d.setDate(d.getDate() + 1)
        ) {
          const monthYear = `${d.toLocaleString("default", {
            month: "long",
          })} ${d.getFullYear()}`;

          if (monthlyOccupancy[monthYear]) {
            monthlyOccupancy[monthYear].bookedDays += 1;
          }
        }
      }
    });

    // Convert to array format with occupancy percentage
    return Object.entries(monthlyOccupancy)
      .map(([month, data]) => ({
        month,
        value: Math.round((data.bookedDays / data.totalDays) * 100),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month + " 1");
        const dateB = new Date(b.month + " 1");
        return dateA.getTime() - dateB.getTime();
      });
  }, [bookingsData, roomsData, startDate, endDate]);

  // Calculate guest statistics
  const guestStats = useMemo(() => {
    if (!bookingsData || bookingsData.length === 0) {
      return {
        newGuests: 0,
        returningGuests: 0,
        newGuestPercentage: 0,
        returningGuestPercentage: 0,
      };
    }

    let filteredBookings = bookingsData;

    if (startDate && endDate) {
      filteredBookings = bookingsData.filter((booking) => {
        const checkIn = new Date(booking.check_in_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return checkIn >= start && checkIn <= end;
      });
    }

    // Count unique customers and their booking frequency
    const customerBookings: Record<string, number> = {};

    filteredBookings.forEach((booking) => {
      if (booking.status === "confirmed" || booking.status === "pending") {
        const customerId = booking.customer_id;
        customerBookings[customerId] = (customerBookings[customerId] || 0) + 1;
      }
    });

    const newGuests = Object.values(customerBookings).filter(
      (count) => count === 1
    ).length;
    const returningGuests = Object.values(customerBookings).filter(
      (count) => count > 1
    ).length;
    const totalGuests = newGuests + returningGuests;

    return {
      newGuests,
      returningGuests,
      newGuestPercentage:
        totalGuests > 0 ? Math.round((newGuests / totalGuests) * 100) : 0,
      returningGuestPercentage:
        totalGuests > 0 ? Math.round((returningGuests / totalGuests) * 100) : 0,
    };
  }, [bookingsData, startDate, endDate]);

  // Calculate payment method statistics
  const paymentStats = useMemo(() => {
    if (!bookingsData || bookingsData.length === 0) {
      return {
        creditCard: 0,
        cash: 0,
        creditCardPercentage: 0,
        cashPercentage: 0,
      };
    }

    let filteredBookings = bookingsData;

    if (startDate && endDate) {
      filteredBookings = bookingsData.filter((booking) => {
        const checkIn = new Date(booking.check_in_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return checkIn >= start && checkIn <= end;
      });
    }

    const creditCard = filteredBookings.filter(
      (b) =>
        (b.status === "confirmed" || b.status === "pending") &&
        b.payment_method === "credit card"
    ).length;

    const cash = filteredBookings.filter(
      (b) =>
        (b.status === "confirmed" || b.status === "pending") &&
        b.payment_method === "cash"
    ).length;

    const total = creditCard + cash;

    return {
      creditCard,
      cash,
      creditCardPercentage:
        total > 0 ? Math.round((creditCard / total) * 100) : 0,
      cashPercentage: total > 0 ? Math.round((cash / total) * 100) : 0,
    };
  }, [bookingsData, startDate, endDate]);

  const handleExport = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    console.log("Exporting occupancy data from", startDate, "to", endDate);

    // Create CSV content
    const csvContent = [
      "Month,Occupancy Rate (%)",
      ...occupancyData.map((item) => `${item.month},${item.value}`),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `occupancy_${startDate}_to_${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleViewChange = (value: string) => {
    setSelectedView(value);
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md sm:p-8 w-full mt-10">
      <div className="flex md:flex-row flex-col w-full justify-between">
        <div className="flex flex-row">
          <h2 className="mt-6 sm:mt-0 ml-3 sm:ml-0 text-lg font-medium text-gray-700">
            Occupancy & Guest
          </h2>
          <Button
            text="Export"
            loading={false}
            onClick={handleExport}
            className="bg-orange-600 text-white hover:bg-orange-700 h-10 w-30 md:hidden mt-5 ml-15"
          />
        </div>
        {/* Right Side */}
        <div className="flex md:flex-row flex-col gap-4 md:items-center items-start p-4">
          <div className="flex gap-2 items-center">
            <p className="text-gray-700 w-full text-right">View by</p>
            <DropDownInput
              options={options}
              name="options"
              setValue={setValue}
              onChange={(value) => setSelectedView(value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex md:flex-row flex-col gap-2 md:items-center">
              <p>From</p>
              <DatePicker
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min="2020-01-01"
                max="2030-12-31"
              />
            </div>

            <div className="flex md:flex-row flex-col gap-2 md:items-center">
              <p>to</p>
              <DatePicker
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || "2020-01-01"}
                max="2030-12-31"
              />
            </div>
          </div>
          <Button
            text="Export"
            loading={false}
            onClick={handleExport}
            className="bg-orange-600 text-white hover:bg-orange-700 h-10 w-40 md:block hidden"
          />
        </div>
      </div>
      <h2 className="md:my-10 m-5">Occupancy Rate</h2>
      <div className="flex flex-col w-full">
        {/* Conditional Chart Rendering */}
        {selectedView === "Overall" ? (
          occupancyData.length > 0 ? (
            <LineChartComponent
              data={occupancyData}
              datakey="month"
              lineColor="#E87B5A"
              height="h-80"
              yAxisTicks={[0, 20, 40, 60, 80, 100]}
              yAxisFormatter={(value) => `${value}%`}
            />
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-400">
              {startDate && endDate
                ? "No occupancy data for selected period"
                : "Select a date range to view occupancy trends"}
            </div>
          )
        ) : (
          <OccupancyBarChart
            bookings={bookingsData}
            rooms={roomsData}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {/* Progress Bar Section */}
        <div className="grid md:grid-cols-2 grid-rows-3 gap-8 md:p-0 p-5 h-110 md:h-50">
          <div className="flex flex-col gap-y-4">
            <h3 className="my-3 font-semibold text-gray-800">Guest Visit</h3>
            <ProgressBarSection
              label="New guest"
              count={`${guestStats.newGuests} people`}
              value={guestStats.newGuestPercentage}
            />
            <ProgressBarSection
              label="Returning guest"
              count={`${guestStats.returningGuests} people`}
              value={guestStats.returningGuestPercentage}
            />
          </div>
          <div className="flex flex-col gap-y-4 md:mt-0 mt-15">
            <h3 className="my-3 font-semibold text-gray-800">Payment Method</h3>
            <div className="flex flex-row gap-4 items-center">
              <div className="flex bg-gray-400 w-10 h-10 items-center justify-center rounded-full">
                <CreditCard className="text-gray-700" />
              </div>
              <ProgressBarSection
                label="Credit card"
                count={`${paymentStats.creditCard} people`}
                value={paymentStats.creditCardPercentage}
              />
            </div>
            <div className="flex flex-row gap-4 items-center">
              <div className="flex bg-gray-400 w-10 h-10 items-center justify-center rounded-full">
                <Banknote className="text-gray-700" />
              </div>
              <ProgressBarSection
                label="Cash"
                count={`${paymentStats.cash} people`}
                value={paymentStats.cashPercentage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OccupancyAndGuestSection;
