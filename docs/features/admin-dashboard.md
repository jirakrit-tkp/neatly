# Feature: Admin Dashboard & Analytics (with Google Analytics 4)

## 1. Overview

The admin dashboard provides comprehensive analytics and management tools for hotel administrators. It displays key performance metrics, booking statistics, revenue tracking, and integrates with Google Analytics 4 for advanced web analytics and user behavior tracking. The dashboard enables data-driven decision-making through visualizations and real-time data.

**Purpose:**
- Monitor hotel performance metrics (bookings, revenue, occupancy)
- Visualize data through charts and graphs
- Track customer behavior and conversion rates via GA4
- Manage all hotel operations from a central interface
- Integrate Google Analytics 4 for web analytics
- Provide role-based access control (admin only)
- Track user interactions, page views, and custom events

**Key Sections:**
1. **Overview Dashboard**: KPIs (total bookings, revenue, occupancy rate)
2. **Booking Management**: View/manage all bookings
3. **Room Management**: CRUD operations for rooms
4. **Chatbot Management**: FAQ, contexts, live chat tickets
5. **Analytics**: GA4 integration, traffic analysis, conversion tracking
6. **Hotel Info Management**: Update hotel details

---

## 2. Architecture / Flow

### Dashboard Loading Flow
```
Admin logs in → Check role === 'admin'
  → Load Dashboard Page (/admin)
    ├─ Fetch Statistics (/api/statistics)
    │   ├─ Total bookings
    │   ├─ Total revenue
    │   ├─ Occupancy rate
    │   └─ Pending bookings
    ├─ Fetch Recent Bookings
    ├─ Fetch GA4 Metrics (/api/sync-ga4-stats)
    │   ├─ Page views
    │   ├─ Active users
    │   └─ Top pages
    └─ Render Dashboard Components
```

### Statistics Calculation Flow
```
/api/statistics:
  // 1. Total Bookings
  totalBookings = COUNT(*) FROM bookings
  
  // 2. Total Revenue
  totalRevenue = SUM(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')
  
  // 3. Occupancy Rate
  totalRooms = COUNT(*) FROM rooms WHERE is_active = true
  occupiedRooms = COUNT(DISTINCT room_id) FROM bookings 
    WHERE status IN ('Confirmed', 'Checked-In') 
    AND check_in_date <= TODAY 
    AND check_out_date > TODAY
  occupancyRate = (occupiedRooms / totalRooms) * 100
  
  // 4. Pending Bookings
  pendingBookings = COUNT(*) FROM bookings WHERE status = 'Pending'
  
  Return: { totalBookings, totalRevenue, occupancyRate, pendingBookings }
```

### Google Analytics 4 Integration Flow

#### Client-Side Tracking (gtag.js)
```
User loads page → Next.js _app.tsx initializes
  → Load gtag script from Google Tag Manager
  → Initialize GA4 with measurement ID (G-XXXXXXXXXX)
  → Track page view automatically
  
User navigates to new page (Next.js router)
  → useEffect in _app.tsx detects route change
  → Send page view event to GA4
  → gtag('event', 'page_view', { page_path: newPath })
```

#### Server-Side Analytics API
```
Admin opens Analytics Dashboard → Fetch GA4 data
  → GET /api/sync-ga4-stats
    ├─ Initialize BetaAnalyticsDataClient with service account credentials
    ├─ Call runReport() with:
    │   ├─ property: 'properties/{PROPERTY_ID}'
    │   ├─ dateRanges: [{ startDate, endDate }]
    │   ├─ dimensions: ['pagePath', 'date', 'source', etc.]
    │   └─ metrics: ['screenPageViews', 'activeUsers', etc.]
    └─ Return aggregated data
  → Display in charts/tables (Recharts)
```

---

## 3. Tech Stack & Libraries

### Data Visualization & Charts

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Recharts** | React charting library | - Built for React (native hooks support)<br>- Declarative API (easy to use)<br>- Responsive by default<br>- Lightweight (vs D3.js)<br>- Good documentation | Components like `<LineChart>`, `<BarChart>` wrap D3.js → Accepts data arrays → Auto-calculates scales, axes → SVG rendering. Composable: combine charts, axes, tooltips as React components |

### Google Analytics Integration

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **@google-analytics/data** | Server-side GA4 Data API | - Official Google library<br>- Fetch historical analytics data<br>- Run custom reports<br>- Secure (uses service account)<br>- No client-side data exposure | Service account authenticates → `BetaAnalyticsDataClient.runReport()` sends query to GA4 → GA4 aggregates data → Returns JSON response. Queries can filter by date, dimensions, metrics |
| **gtag.js** | Client-side event tracking | - Official Google Analytics tag<br>- Industry standard<br>- Automatic page view tracking<br>- E-commerce event support<br>- Real-time data collection | Script loads → Creates `dataLayer` array → `gtag()` function pushes events → Events batched and sent to GA servers → Appears in GA4 console within seconds |
| **Next.js Script Component** | Optimized script loading | - Built into Next.js<br>- Strategy control (afterInteractive, lazyOnload)<br>- Prevents blocking render<br>- Auto-optimizes loading | `<Script strategy="afterInteractive">` → Loads after page interactive → Non-blocking → Executes when browser idle. Better Core Web Vitals scores |

### Database & State Management

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Supabase Database** | Query aggregated statistics | - PostgreSQL (powerful aggregation)<br>- PostgREST auto-API<br>- Built-in auth integration<br>- Row-level security | SQL aggregation queries (SUM, COUNT, AVG) → PostgREST converts to REST API → JavaScript SDK makes type-safe queries. Complex joins and calculations run efficiently in database |
| **React Context API** | Share auth state | - Built into React<br>- No extra dependency<br>- Simple for global user state<br>- Sufficient for admin role check | `AuthProvider` wraps app → Holds `user` object → `useAuth()` hook accesses from any component → Re-renders only consumers when user changes |
| **date-fns** | Date manipulation | - Modular (tree-shakeable)<br>- Immutable API (safer)<br>- TypeScript support<br>- Smaller than Moment.js | Functions like `format()`, `subDays()`, `isAfter()` → Pure functions → No prototype pollution → Import only needed functions. Example: `format(new Date(), 'yyyy-MM-dd')` |

---

## 4. Core Logic

### 4.1 Key Performance Indicators (KPIs)

**Total Bookings:**
```sql
SELECT COUNT(*) as total_bookings
FROM bookings;
```

**Total Revenue:**
```sql
SELECT SUM(total_amount) as total_revenue
FROM bookings
WHERE status IN ('Confirmed', 'Completed');
```

**Occupancy Rate:**
```sql
-- Calculate for today
WITH total_rooms AS (
  SELECT COUNT(*) as count FROM rooms WHERE is_active = true
),
occupied_rooms AS (
  SELECT COUNT(DISTINCT room_id) as count
  FROM bookings
  WHERE status IN ('Confirmed', 'Checked-In')
  AND check_in_date <= CURRENT_DATE
  AND check_out_date > CURRENT_DATE
)
SELECT 
  (occupied_rooms.count::FLOAT / total_rooms.count) * 100 as occupancy_rate
FROM total_rooms, occupied_rooms;
```

**Average Booking Value:**
```sql
SELECT AVG(total_amount) as avg_booking_value
FROM bookings
WHERE status IN ('Confirmed', 'Completed');
```

### 4.2 Analytics Dashboard Components

**Booking Trends Chart (Line Chart):**
```typescript
// Data structure for Recharts
const bookingTrendsData = [
  { date: '2025-01-01', bookings: 15, revenue: 45000 },
  { date: '2025-01-02', bookings: 20, revenue: 60000 },
  // ... more data points
];

<LineChart data={bookingTrendsData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Line type="monotone" dataKey="bookings" stroke="#8884d8" />
  <Line type="monotone" dataKey="revenue" stroke="#82ca9d" />
</LineChart>
```

**Room Type Distribution (Pie Chart):**
```typescript
const roomTypeData = [
  { name: 'Deluxe', value: 45, bookings: 120 },
  { name: 'Suite', value: 30, bookings: 80 },
  { name: 'Superior', value: 25, bookings: 65 }
];

<PieChart>
  <Pie data={roomTypeData} dataKey="value" nameKey="name" />
</PieChart>
```

**Revenue by Month (Bar Chart):**
```typescript
const revenueByMonth = [
  { month: 'Jan', revenue: 450000 },
  { month: 'Feb', revenue: 520000 },
  // ... more months
];

<BarChart data={revenueByMonth}>
  <XAxis dataKey="month" />
  <YAxis />
  <Bar dataKey="revenue" fill="#8884d8" />
</BarChart>
```

### 4.3 Google Analytics 4 Implementation

#### Client-Side Setup (src/lib/gtag.ts)

```typescript
// src/lib/gtag.ts
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Track page view
export const pageview = (url: string) => {
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url
  });
};

// Track custom event
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value
  });
};
```

#### Next.js App Integration (pages/_app.tsx)

```typescript
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Script from 'next/script';
import * as gtag from '@/lib/gtag';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Track page views on route change
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);
  
  return (
    <>
      {/* Global Site Tag (gtag.js) - Google Analytics */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_MEASUREMENT_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `
        }}
      />
      
      <Component {...pageProps} />
    </>
  );
}
```

#### Custom Event Tracking Examples

**Track Booking Completion:**
```typescript
import * as gtag from '@/lib/gtag';

// After successful booking payment
gtag.event({
  action: 'purchase',
  category: 'Booking',
  label: roomType,
  value: totalAmount
});

// Alternative: Use standard e-commerce event
window.gtag('event', 'purchase', {
  transaction_id: bookingId,
  value: totalAmount,
  currency: 'THB',
  items: [{
    item_id: roomId,
    item_name: roomType,
    price: pricePerNight,
    quantity: nightCount
  }]
});
```

**Track Chatbot Interaction:**
```typescript
// When user opens chatbot
gtag.event({
  action: 'chatbot_open',
  category: 'Chatbot',
  label: 'User opened chatbot widget'
});

// When user asks a question
gtag.event({
  action: 'chatbot_message',
  category: 'Chatbot',
  label: 'User sent message'
});
```

#### Server-Side Data API (src/lib/ga4.ts)

```typescript
// src/lib/ga4.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { readFileSync } from 'fs';
import path from 'path';

const keyPath = path.join(process.cwd(), 'ga4-access-key.json');
const credentials = JSON.parse(readFileSync(keyPath, 'utf8'));

const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials
});

export async function getPageViews() {
  const [response] = await analyticsDataClient.runReport({
    property: 'properties/507618812',
    dateRanges: [{ startDate: '2025-01-01', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }]
  });

  return response.rows?.map(row => ({
    page: row.dimensionValues?.[0].value,
    views: row.metricValues?.[0].value
  }));
}

export async function getActiveUsers() {
  const [response] = await analyticsDataClient.runReport({
    property: 'properties/507618812',
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }]
  });

  return parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0');
}

export async function getConversionRate() {
  const [response] = await analyticsDataClient.runReport({
    property: 'properties/507618812',
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    metrics: [
      { name: 'sessions' },
      { name: 'conversions' }
    ]
  });

  const sessions = parseInt(response.rows?.[0]?.metricValues?.[0]?.value || '0');
  const conversions = parseInt(response.rows?.[0]?.metricValues?.[1]?.value || '0');
  
  return sessions > 0 ? (conversions / sessions) * 100 : 0;
}
```

#### API Route: /api/sync-ga4-stats

```typescript
// pages/api/sync-ga4-stats.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getPageViews, getActiveUsers, getConversionRate } from '@/lib/ga4';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [pageViews, activeUsers, conversionRate] = await Promise.all([
      getPageViews(),
      getActiveUsers(),
      getConversionRate()
    ]);

    const totalPageViews = pageViews.reduce(
      (sum, page) => sum + parseInt(page.views), 
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalPageViews,
        activeUsers,
        conversionRate,
        topPages: pageViews.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('GA4 API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch analytics data' 
    });
  }
}
```

### 4.4 Dashboard Filters

**Date Range Filter:**
```typescript
function filterByDateRange(bookings, startDate, endDate) {
  return bookings.filter(booking => {
    const bookingDate = new Date(booking.created_at);
    return bookingDate >= startDate && bookingDate <= endDate;
  });
}
```

**Status Filter:**
```typescript
function filterByStatus(bookings, status) {
  if (status === 'All') return bookings;
  return bookings.filter(booking => booking.status === status);
}
```

---

## 5. Data Model / Database Schema

### View/Query: `dashboard_statistics`
```sql
-- Can be materialized view for performance
CREATE VIEW dashboard_statistics AS
SELECT
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT SUM(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')) as total_revenue,
  (SELECT COUNT(*) FROM bookings WHERE status = 'Pending') as pending_bookings,
  (SELECT COUNT(DISTINCT customer_id) FROM bookings) as unique_customers,
  (SELECT AVG(total_amount) FROM bookings WHERE status IN ('Confirmed', 'Completed')) as avg_booking_value;
```

### Table: `ga4_stats` (optional caching)
```sql
CREATE TABLE ga4_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  page_path TEXT,
  page_views INTEGER,
  unique_users INTEGER,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ga4_date ON ga4_stats(date),
  INDEX idx_ga4_page ON ga4_stats(page_path)
);
```

### GA4 Service Account Setup

**ga4-access-key.json:**
```json
{
  "type": "service_account",
  "project_id": "neatly-hotel",
  "private_key_id": "xxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ga4-api@neatly-hotel.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=properties/507618812
```

### Standard GA4 Events Tracked

```typescript
// Standard e-commerce events
- 'view_item' → User views room details
- 'add_to_cart' → User selects room for booking
- 'begin_checkout' → User starts booking process
- 'purchase' → Booking payment completed

// Custom chatbot events
- 'chatbot_open' → Chatbot widget opened
- 'chatbot_message' → User sent message
- 'chatbot_response' → Bot responded
- 'chatbot_escalation' → Escalated to live chat

// Navigation events
- 'page_view' → Page navigation (automatic)
- 'scroll' → User scrolled to bottom (optional)
- 'click' → Button/link clicks (optional)
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **No Bookings**: Dashboard shows 0 values gracefully
2. **GA4 API Errors**: Falls back to cached data or shows error message
3. **Large Datasets**: Pagination for booking lists
4. **Date Range Validation**: Prevents invalid date ranges
5. **Role-Based Access**: Non-admin users redirected
6. **Real-time Updates**: Periodic refresh for stats
7. **Ad Blockers**: GA4 scripts may be blocked (graceful degradation)
8. **API Rate Limits**: Error handling for GA4 quota limits

### Current Limitations
1. **No Real-time Data**: Statistics refresh on page load (not live WebSocket)
2. **Single Property GA4**: Only one GA4 property supported
3. **No Export**: Cannot export dashboard data as PDF/Excel
4. **Fixed Date Ranges**: Limited preset ranges (no custom date picker)
5. **No Comparison**: Cannot compare periods (this month vs last month)
6. **No Forecasting**: No predictive analytics
7. **No Alerts**: No automated alerts for anomalies
8. **Basic Visualizations**: Limited chart types
9. **GA4 Data Delay**: 24-48 hour delay in GA4 reporting
10. **No Custom Dimensions**: Not utilizing GA4 custom dimensions

### TODO / Future Enhancements

**Dashboard Improvements:**
- [ ] **Real-time Dashboard**: WebSocket updates for live data
- [ ] **Custom Date Range Picker**: Flexible date selection
- [ ] **Period Comparison**: Compare current vs previous period
- [ ] **Export Functionality**: PDF, Excel, CSV export
- [ ] **Advanced Charts**: Heatmaps, funnel charts, cohort analysis
- [ ] **Forecasting**: Predictive occupancy and revenue
- [ ] **Alert System**: Email/SMS alerts for low occupancy, high cancellations
- [ ] **Multi-Property Support**: Manage multiple hotel properties
- [ ] **Custom Metrics**: User-defined KPIs
- [ ] **Drill-down Reports**: Click charts to view detailed breakdowns
- [ ] **Scheduled Reports**: Automated daily/weekly email reports
- [ ] **Role-Based Dashboards**: Different views for different admin roles
- [ ] **Mobile Dashboard**: Optimized mobile admin app

**GA4 Enhancements:**
- [ ] **Enhanced E-commerce Tracking**: Full funnel tracking
- [ ] **User ID Tracking**: Link GA4 data to authenticated users
- [ ] **Custom Dimensions**: Track room type, promo codes, etc.
- [ ] **Funnel Visualization**: Track booking funnel drop-off
- [ ] **Cohort Analysis**: Track user retention over time
- [ ] **A/B Testing Integration**: Track experiment variants
- [ ] **Cross-Domain Tracking**: Track users across subdomains
- [ ] **Event Debugging**: Add GA4 DebugView integration
- [ ] **Privacy Controls**: GDPR/CCPA compliance features
- [ ] **Consent Management**: Cookie consent integration
- [ ] **Custom Alerts**: Email alerts for traffic anomalies
- [ ] **Heatmap Integration**: Visual user interaction tracking

### Known Issues
- **GA4 API Rate Limits**: May hit quota limits with frequent requests (25,000/day)
- **Timezone Issues**: Statistics may not align with hotel's local timezone
- **Cached Stats Staleness**: No automatic cache invalidation
- **Large Dataset Performance**: Slow queries for hotels with years of data
- **No Data Retention Policy**: Historical data grows indefinitely
- **Ad Blockers**: ~30% of users may block GA4 scripts
- **Privacy Mode**: Safari ITP may limit tracking accuracy
- **Delayed Data**: GA4 data has 24-48 hour processing delay
- **Sampling**: Large datasets in GA4 may be sampled (not exact)
