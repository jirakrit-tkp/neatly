import type { NextApiRequest, NextApiResponse } from "next";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
  });
  try {
    if (!process.env.GOOGLE_ANALYTICS_PROPERTY_ID) {
      throw new Error("Missing GA4 property ID");
    }

    const { startDate = "7daysAgo", endDate = "today" } = req.query;

    // Fetch hourly page views
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${process.env.GOOGLE_ANALYTICS_PROPERTY_ID}`,
      dateRanges: [
        { startDate: startDate as string, endDate: endDate as string },
      ],
      dimensions: [
        { name: "pagePath" }, // page URL
        { name: "date" }, // day in YYYYMMDD
        { name: "hour" }, // hour of day 0-23
      ],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [
        { dimension: { dimensionName: "date" }, desc: false },
        { dimension: { dimensionName: "hour" }, desc: false },
      ],
    });

    const rows = Array.isArray(response.rows) ? response.rows : [];

    // Map GA4 response to frontend-friendly format
    const data = rows.map((row) => {
      const dims = row.dimensionValues || [];
      const mets = row.metricValues || [];

      const page = dims[0]?.value || "";
      const date = dims[1]?.value || "";
      const hour = dims[2]?.value?.padStart(2, "0") || "00";

      // Construct ISO timestamp for hourly aggregation
      const timestamp = date
        ? `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(
            6,
            8
          )}T${hour}:00:00Z`
        : "";

      return {
        page,
        date,
        hour,
        timestamp,
        views: mets[0]?.value || "0",
      };
    });

    // Extract unique pages
    const pages = Array.from(new Set(data.map((d) => d.page)));
    const totalViews = data.reduce((sum, d) => sum + parseInt(d.views, 10), 0);

    res.status(200).json({
      success: true,
      pages: pages.length > 0 ? pages : ["All Pages"],
      data,
      totalViews,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof Error) {
      console.error("GA4 API error:", err.message);
      res.status(500).json({ success: false, error: err.message });
    } else {
      console.error("Unknown GA4 API error:", err);
      res.status(500).json({ success: false, error: "Unknown error" });
    }
  }
}