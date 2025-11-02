# Neatly Hotel - Feature Documentation

This directory contains comprehensive technical documentation for all major features and modules in the Neatly Hotel management system.

---

## 📚 Documentation Index

### Core System Features

1. **[Authentication & Authorization](./authentication.md)**
   - User registration and login
   - Role-based access control (customer/admin)
   - Guest user support
   - Session management and linking
   - Email verification and password reset

2. **[AI-Powered Chatbot (with Live Chat & Tickets)](./chatbot.md)**
   - Hybrid response system (strict matching + vector search + intent classification)
   - Multi-format responses (text, options, room cards)
   - OpenAI embeddings + Supabase pgvector
   - Conversation context tracking
   - Live chat escalation and support ticket system
   - Real-time admin-customer messaging
   - Ticket lifecycle management (open → in_progress → resolved)

3. **[Booking & Payment System](./booking-system.md)**
   - Room availability checking and booking creation
   - Dynamic pricing (base, promotion, special requests, promo codes)
   - 24-hour cancellation policy and multi-room support
   - Credit card payments via Stripe (test mode with test cards)
   - Cash payment support (payment on arrival)
   - Payment validation, processing, and refund handling
   - Automated booking confirmation on successful payment
   - Payment status tracking (pending → completed → refunded)

4. **[Room & Room Type Management](./room-management.md)**
   - Two-tier structure (room types + room instances)
   - Image management (main + gallery)
   - Promotional pricing
   - Room status tracking
   - Amenities management
   - Image optimization with jimp

5. **[Promotion & Discount System](./promotion-system.md)**
   - Promo code creation and management
   - Fixed amount and percentage discounts
   - Usage tracking and limits
   - Expiration date enforcement
   - Eligibility validation

---

### Admin & Management Features

6. **[Admin Dashboard & Analytics (with GA4)](./admin-dashboard.md)**
   - Key performance indicators (KPIs)
   - Booking statistics and revenue tracking
   - Google Analytics 4 integration (client + server-side)
   - Data visualization (Recharts)
   - Custom event tracking (bookings, chatbot)
   - Real-time metrics and conversion tracking
   - Traffic analysis and user behavior

7. **[Database Architecture & Supabase](./database-supabase.md)**
   - PostgreSQL database schema
   - Supabase Auth integration
   - Storage buckets for images
   - Vector search with pgvector
   - Real-time subscriptions
   - Row-level security (RLS)

8. **[Hotel Information Management](./hotel-info-management.md)**
   - Centralized hotel details
   - Logo upload and management
   - Description editor
   - Global state via React Context

9. **[Customer Profile Management](./customer-profile.md)**
   - Profile picture upload
   - Personal information editing
   - Account security
   - Data validation

---

## 🏗️ System Architecture Overview

### Technology Stack

**Frontend:**
- **Framework:** Next.js 15 (React 19)
- **Styling:** Tailwind CSS 4
- **State Management:** React Context API
- **Form Handling:** React Hook Form + Zod validation
- **UI Components:** Radix UI, shadcn/ui
- **Charts:** Recharts
- **Animations:** Motion (Framer Motion)

**Backend:**
- **BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **API:** Next.js API Routes (serverless)
- **Authentication:** Supabase Auth (JWT tokens)
- **File Storage:** Supabase Storage

**AI & Analytics:**
- **LLM:** Google Vertex AI (Gemini 2.5 Flash)
- **Embeddings:** OpenAI (text-embedding-3-small)
- **Vector Search:** Supabase pgvector
- **Analytics:** Google Analytics 4 + GA Data API

**Payment:**
- **Payment Gateway:** Stripe (test mode)
- **Supported Methods:** Credit Card, Cash

**DevOps:**
- **Hosting:** Vercel (Next.js deployment)
- **Database:** Supabase (managed PostgreSQL)
- **Version Control:** Git

---

## 📊 Database Schema Overview

### Core Tables

**Users & Profiles:**
- `auth.users` (Supabase managed)
- `profiles` (custom user data)

**Hotel Operations:**
- `rooms` (bookable room instances)
- `room_types` (room templates)
- `bookings` (reservations)
- `payments` (payment records)
- `promo_codes` (discount codes)

**Chatbot System:**
- `chatbot_sessions` (chat sessions)
- `chatbot_messages` (chat messages)
- `chatbot_faqs` (FAQ knowledge base)
- `chatbot_faq_aliases` (alternative phrasings)
- `chatbot_contexts` (additional context)
- `chatbot_tickets` (support tickets)

**Admin:**
- `hotel_info` (hotel details)
- `ga4_stats` (cached analytics)

---

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js 18.17.0+
- npm 9.0.0+
- Supabase account
- Google Cloud account (for Vertex AI)
- OpenAI API key
- Stripe account (test mode)

### Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI
OPENAI_API_KEY=

# Google Vertex AI
GCLOUD_PROJECT_ID=
GCLOUD_LOCATION=
GOOGLE_APPLICATION_CREDENTIALS_VERTEX_JSON=

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=
GA4_PROPERTY_ID=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📖 Documentation Structure

Each feature documentation follows this consistent format:

1. **Overview** - Purpose and key features
2. **Architecture / Flow** - System flow diagrams and sequences
3. **Tech Stack & Libraries** - Technologies used with examples
4. **Core Logic** - Detailed implementation with code examples
5. **Data Model / Database Schema** - Table schemas and relationships
6. **Edge Cases / Limitations / TODO** - Known issues and future enhancements

---

## 🔗 Key Integration Points

### Authentication → All Protected Features
- Admin dashboard requires `role = 'admin'`
- Bookings require authenticated customer
- Profile management requires login

### Chatbot → Live Chat → Tickets
- Chatbot can escalate to live chat
- Tickets link chat sessions to admin agents
- Bot pauses during live chat

### Booking → Payment → Room Availability
- Booking checks room availability
- Payment confirms booking
- Room status updated on check-in/check-out

### Admin Dashboard → Google Analytics
- Fetches GA4 data via Data API
- Displays metrics in charts
- Caches data for performance

---

## 🧪 Testing Resources

### Test Accounts
- **Admin:** (Create via Supabase, set role='admin' in profiles table)
- **Customer:** Register via `/register` page

### Stripe Test Cards
- **Success:** `4242 4242 4242 4242`
- **Declined:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`

### Test Promo Codes
Create via admin panel or insert directly into `promo_codes` table

---

## 📝 Contributing

When adding new features:
1. Create corresponding documentation file in this directory
2. Follow the standard documentation format
3. Update this README with new feature link
4. Document database schema changes
5. Add environment variables to .env.example

---

## 📞 Support

For questions or clarifications about any feature:
- Review the specific feature documentation
- Check the code comments in relevant files
- Consult the API route documentation in `/pages/api/`

---

**Last Updated:** January 2025  
**Documentation Version:** 1.0.0  
**System Version:** 0.1.0

