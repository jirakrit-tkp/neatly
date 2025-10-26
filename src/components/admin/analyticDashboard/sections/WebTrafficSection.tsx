import { Button } from "../../ui/Button";
import { DropDownInput } from "../../ui/DropdownInput";
import { LineChartComponent, LineChartData } from "../LineChartComponent";

import { useForm } from "react-hook-form";
import { useState, useEffect, useMemo } from "react";

interface PageViewRecord {
  page: string;
  date: string;
  hour: string;
  timestamp: string;
  views: string;
}

type Timeframe = "Last 24 Hours" | "Yesterday" | "Last 7 Days" | "Last 30 days";

const WebTrafficSection = () => {
  const { setValue } = useForm();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<Timeframe>("Yesterday");
  const [selectedPage, setSelectedPage] = useState("All Pages");
  const [pageViewData, setPageViewData] = useState<PageViewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // DEBUG MODE - Remove in production
  const [debugMode, setDebugMode] = useState<
    "normal" | "error500" | "timeout" | "invalid"
  >("normal");

  // Fixed page options
  const pageMapping: Record<string, string | null> = {
    "All Pages": null,
    Home: "/",
    "Superior Garden View": "/customer/search-result/1",
    Deluxe: "/customer/search-result/2",
    Superior: "/customer/search-result/3",
    Supreme: "/customer/search-result/4",
  };

  // Fetch GA4 data with error handling and retry logic
  useEffect(() => {
    async function fetchPageViews() {
      try {
        setLoading(true);
        setError(null);

        // DEBUG MODE - Add query parameter to simulate errors
        const debugParam = debugMode === "normal" ? "" : `?debug=${debugMode}`;

        const response = await fetch(`/api/test-ga4${debugParam}`, {
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          setPageViewData(result.data);
          setError(null);
          setRetryCount(0); // Reset retry count on success
        } else {
          throw new Error("Invalid data format received from API");
        }
      } catch (err) {
        console.error("Failed to fetch GA4 data:", err);

        // Set user-friendly error message
        if (err instanceof Error) {
          if (err.name === "TimeoutError") {
            setError(
              "Request timed out. Google Analytics is taking too long to respond."
            );
          } else if (err.message.includes("500")) {
            setError(
              "Google Analytics service is temporarily unavailable. Please try again."
            );
          } else if (err.message.includes("Failed to fetch")) {
            setError("Network error. Please check your connection.");
          } else {
            setError(err.message);
          }
        } else {
          setError("An unexpected error occurred while loading traffic data.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPageViews();
  }, [retryCount, debugMode]); // Refetch when retryCount or debugMode changes

  // Manual retry function
  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  // Filter + Aggregate data
  const chartData: LineChartData[] = useMemo(() => {
    if (pageViewData.length === 0) return [];

    const now = new Date();
    const selectedPath = pageMapping[selectedPage];

    // Filter by selected page
    let filtered = selectedPath
      ? pageViewData.filter((d) => d.page === selectedPath)
      : pageViewData;

    // Helper: group by key (hour or date)
    const groupBy = (
      arr: PageViewRecord[],
      keyFn: (item: PageViewRecord) => string
    ) => {
      const map = new Map<string, number>();
      for (const item of arr) {
        const key = keyFn(item);
        const views = parseInt(item.views, 10);
        map.set(key, (map.get(key) ?? 0) + views);
      }
      return Array.from(map.entries()).map(([key, value]) => ({
        key,
        value,
      }));
    };

    // Filter timeframe
    if (
      selectedTimeframe === "Last 24 Hours" ||
      selectedTimeframe === "Yesterday"
    ) {
      const targetDate = new Date(now);
      if (selectedTimeframe === "Yesterday")
        targetDate.setDate(targetDate.getDate() - 1);
      const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, "");

      filtered = filtered.filter((item) => item.date === dateStr);

      const grouped = groupBy(filtered, (item) => item.hour.padStart(2, "0"));

      // Sort by hour (numerically)
      return grouped
        .sort((a, b) => parseInt(a.key, 10) - parseInt(b.key, 10))
        .map(({ key, value }) => ({
          time: `${key}:00`,
          value,
        }));
    }

    if (selectedTimeframe === "Last 7 Days") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      filtered = filtered.filter((item) => {
        const date = new Date(item.timestamp);
        return date >= sevenDaysAgo && date <= now;
      });

      const grouped = groupBy(filtered, (item) => item.date);

      // Sort by date
      return grouped
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(({ key, value }) => ({
          time: new Date(
            `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
          ).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value,
        }));
    }

    if (selectedTimeframe === "Last 30 days") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      filtered = filtered.filter((item) => {
        const date = new Date(item.timestamp);
        return date >= thirtyDaysAgo && date <= now;
      });

      const grouped = groupBy(filtered, (item) => item.date);

      // Sort by date first
      const daily = grouped
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(({ key, value }) => ({
          date: new Date(
            `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`
          ),
          value,
        }));

      // Group by week
      const weeklyMap = new Map<string, number>();
      for (const { date, value } of daily) {
        const weekKey = `${date.getFullYear()}-W${Math.ceil(
          date.getDate() / 7
        )}`;
        weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + value);
      }

      return Array.from(weeklyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => ({
          time: key,
          value,
        }));
    }

    return [];
  }, [pageViewData, selectedTimeframe, selectedPage]);

  // Calculate Y-axis ticks
  const yAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [0, 20, 40, 60, 80, 100];
    const max = Math.max(...chartData.map((d) => d.value));
    const step = Math.ceil(max / 6 / 10) * 10 || 1;
    return Array.from({ length: 7 }, (_, i) => i * step);
  }, [chartData]);

  const buttonClass = (timeframe: Timeframe) =>
    selectedTimeframe === timeframe
      ? "whitespace-nowrap border border-orange-500 text-orange-600 bg-orange-100"
      : "whitespace-nowrap border border-gray-400 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-100";

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col bg-white rounded-lg shadow-md sm:p-8 w-full h-90 mt-10">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-80 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col bg-white rounded-lg shadow-md sm:p-8 w-full h-90 mt-10">
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              Unable to Load Traffic Data
            </h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md">{error}</p>
          </div>
          <Button
            loading={false}
            text="Retry"
            onClick={handleRetry}
            className="border border-orange-500 text-orange-600 bg-orange-100 hover:bg-orange-200"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md sm:p-8 w-full h-110 sm:h-full mt-10 p-5">
      {/* DEBUG MODE CONTROLS - Remove in production */}
      {/*
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-xs font-semibold text-yellow-800 mb-2">
          DEBUG MODE (Remove before deploy)
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDebugMode("normal")}
            className={`px-3 py-1 text-xs rounded ${
              debugMode === "normal" ? "bg-green-500 text-white" : "bg-gray-200"
            }`}
          >
            Normal
          </button>
          <button
            onClick={() => setDebugMode("error500")}
            className={`px-3 py-1 text-xs rounded ${
              debugMode === "error500" ? "bg-red-500 text-white" : "bg-gray-200"
            }`}
          >
            500 Error
          </button>
          <button
            onClick={() => setDebugMode("timeout")}
            className={`px-3 py-1 text-xs rounded ${
              debugMode === "timeout"
                ? "bg-orange-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Timeout
          </button>
          <button
            onClick={() => setDebugMode("invalid")}
            className={`px-3 py-1 text-xs rounded ${
              debugMode === "invalid"
                ? "bg-purple-500 text-white"
                : "bg-gray-200"
            }`}
          >
            Invalid Data
          </button>
        </div>
      </div>
      */}

      <div className="flex flex-col w-full justify-between">
        <div className="flex flex-col md:flex-row justify-between">
          <div className="flex flex-row items-center pr-5 mb-5 gap-4">
            <h2 className="mt-6 sm:mt-0 ml-3 sm:ml-0 text-lg font-medium text-gray-700">
              Website Traffic
            </h2>
            {/* Filters */}
            <div className="flex md:flex-row flex-col md:justify-between gap-4 ">
              <DropDownInput
                options={Object.keys(pageMapping)}
                name="pageFilter"
                setValue={setValue}
                onChange={(value) => setSelectedPage(value)}
              />
            </div>
          </div>
          <div className="flex flex-row border border-white/20 rounded-lg overflow-x-auto whitespace-nowrap gap-2 py-2 px-4 ">
            {(
              [
                "Last 24 Hours",
                "Yesterday",
                "Last 7 Days",
                "Last 30 days",
              ] as const
            ).map((tf) => (
              <Button
                key={tf}
                loading={false}
                text={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={buttonClass(tf)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <LineChartComponent
          data={chartData}
          datakey="time"
          lineColor="#E87B5A"
          height="h-80"
          yAxisTicks={yAxisTicks}
        />
      ) : (
        <div className="flex items-center justify-center h-80 text-gray-400">
          No traffic data available for the selected filters
        </div>
      )}
    </div>
  );
};

export default WebTrafficSection;
