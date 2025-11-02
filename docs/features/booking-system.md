# Feature: Booking & Payment System

## 1. Overview

The booking and payment system manages the complete hotel reservation and transaction lifecycle, from room selection and availability checking to payment processing and booking confirmation. It seamlessly integrates booking management with Stripe payment gateway to provide a secure, end-to-end reservation experience.

**Purpose:**
- Enable customers to search and book hotel rooms
- Manage room availability and prevent double-bookings
- Calculate pricing with special requests and promotions
- **Process secure payments via Stripe or accept cash payments**
- **Link payments to bookings and update statuses automatically**
- Handle booking modifications and cancellations
- Track booking status lifecycle (pending → confirmed → checked-in → completed/cancelled)
- **Manage payment lifecycle (pending → completed → refunded)**
- Support multiple rooms and guest counts
- **Process refunds for cancelled bookings**

**Key Features:**

**Booking:**
- **Real-time Availability Check**: Prevents conflicting bookings
- **Dynamic Pricing**: Base price, promotion price, special requests, promo codes
- **Flexible Special Requests**: Standard (free) and paid add-ons
- **24-hour Cancellation Policy**: Guests can cancel if >24 hours before check-in
- **Status Tracking**: Full booking lifecycle management
- **Multi-room Support**: Book multiple rooms of the same type in one transaction

**Payment:**
- **Stripe Integration**: Secure credit card processing (test mode)
- **Test Card Support**: Validates Stripe test cards for development
- **Payment Simulation**: Simulates success/failure scenarios
- **Cash Payment Option**: Payment on arrival at hotel
- **Automatic Status Updates**: Booking confirmed on successful payment
- **Refund Processing**: Handle refunds for cancellations
- **Payment Metadata**: Store card info (last 3 digits, owner, expiry)

---

## 2. Architecture / Flow

### Booking Creation Flow
```
User selects room + dates → Frontend validation
  → Step 1: Validate Booking Data
    ├─ Check guest info (name, email, phone)
    ├─ Validate date range (check-in < check-out, not in past)
    └─ Validate guest count
  → Step 2: Check Room Availability
    ├─ Query room status (must be Vacant/Clean/Active)
    └─ Check for conflicting confirmed bookings
  → Step 3: Calculate Total Amount
    ├─ Base price (use promotion_price if available)
    ├─ Multiply by nights and room count
    ├─ Add special requests (paid only)
    └─ Apply promo code discount (if provided)
  → Step 4: Create Booking Record
    ├─ Insert into bookings table (status: pending)
    └─ Return booking ID
  → Step 5: Payment Process
    ├─ User pays (Credit Card or Cash)
    └─ Update booking status to confirmed
```

### Room Availability Check Logic
```sql
-- Room is available IF:
1. Room.is_active = true
2. Room.status IN ('Vacant', 'Vacant Clean', 'Vacant Clean Inspected', 'Vacant Clean Pick Up')
3. No CONFIRMED bookings overlap with requested dates:
   NOT EXISTS (
     SELECT 1 FROM bookings 
     WHERE room_id = :roomId 
     AND status = 'Confirmed'
     AND check_in_date < :checkOut 
     AND check_out_date > :checkIn
   )
```

### Booking Cancellation Flow
```
User requests cancellation → Check booking status
  → Verify cancellation eligibility (>24h before check-in)
  → Update booking status to 'Cancelled'
  → Trigger refund (if payment completed)
  → Release room availability
```

### Payment Processing Flow

#### Credit Card Payment (Stripe)
```
Booking created (status: Pending) → User enters card details
  → Step 1: Create Payment Record
    ├─ Insert payment (status: pending, method: Credit Card)
    └─ Return payment ID
  → Step 2: Process Stripe Payment
    ├─ Validate test card (check if valid Stripe test card)
    ├─ Simulate payment processing (success/failure based on card)
    ├─ Update payment: stripe_payment_id, status (completed/failed)
    └─ Store card metadata (last 3 digits, card type, owner)
  → Step 3: Update Booking Status
    ├─ If payment success → Booking status = 'Confirmed'
    └─ If payment failed → Booking status remains 'Pending'
  → Return: payment result
```

#### Cash Payment
```
Booking created (status: Pending) → User selects Cash payment
  → Step 1: Create Payment Record
    ├─ Insert payment (status: pending, method: Cash)
    └─ Return payment ID
  → Step 2: Process Cash Payment
    ├─ Update payment status to 'Pending' (awaiting check-in)
    └─ Update booking status to 'Confirmed'
  → Guest pays cash at check-in
  → Staff updates payment status to 'Completed'
```

#### Refund Flow
```
User cancels booking → Check cancellation eligibility
  → Step 1: Get Payment Details
  → Step 2: Validate Refund Eligibility
    └─ Payment must be in 'Completed' status
  → Step 3: Process Refund
    ├─ Update payment status to 'Refunded'
    └─ Update booking status to 'Cancelled'
  → (In production: Call Stripe refund API)
```

---

## 3. Tech Stack & Libraries

### Booking Management

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Supabase Database** | Booking & payment persistence | - PostgreSQL (ACID compliance)<br>- Built-in auth integration<br>- Real-time subscriptions<br>- Auto-generated REST API | Stores bookings/payments in PostgreSQL → PostgREST generates API → JavaScript SDK queries with type-safety. Transactions ensure data consistency between bookings and payments |
| **date-fns** | Date calculations & validation | - Modular (tree-shakeable)<br>- Immutable API (safer)<br>- TypeScript support<br>- Smaller than Moment.js (69% smaller) | Pure functions for dates → `differenceInDays(checkOut, checkIn)` calculates nights → No timezone mutations → Import only needed functions (reduces bundle size) |
| **React Hook Form** | Form state management | - Performance (less re-renders)<br>- Built-in validation<br>- TypeScript support<br>- 8.6KB gzipped (vs Formik 15KB) | Registers inputs → Tracks changes with refs (not state) → Validates on submit/blur → Minimal re-renders (only error messages update) |
| **Zod** | Schema validation | - TypeScript-first (infers types)<br>- Composable schemas<br>- Runtime type safety<br>- Better error messages than Yup | Define schema → `bookingSchema.parse(data)` → Validates at runtime → Throws if invalid → TypeScript infers type from schema automatically |

### Payment Processing

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **Stripe.js** | Frontend card handling | - PCI-compliant (handles sensitive data)<br>- No card data touches your server<br>- Tokenization built-in<br>- Industry standard | User enters card → Stripe.js tokenizes → Creates PaymentMethod → Returns token → Token sent to backend (not raw card data) |
| **@stripe/stripe-js** | Stripe SDK loader | - Async loading (doesn't block render)<br>- Official Stripe package<br>- Type-safe<br>- Caches Stripe.js instance | Loads Stripe.js script → Creates `stripe` object → `loadStripe(publishableKey)` → Returns promise → Use for creating payment methods |
| **stripe (Node SDK)** | Backend payment operations | - Official Stripe SDK for Node.js<br>- Handles authentication<br>- Retry logic built-in<br>- Idempotency support | Authenticates with secret key → Calls Stripe API (create payment intent, refund, etc.) → Handles webhooks → Returns structured responses |

### Business Logic Services

| Library/API | Purpose | Why This Choice | How It Works |
|------------|---------|----------------|--------------|
| **BookingService** | Booking business logic | - Separation of concerns<br>- Reusable across API routes<br>- Centralized validation<br>- Easier testing | Class with static methods → `BookingService.createBooking(data)` → Validates → Checks availability → Calculates pricing → Inserts to DB |
| **PaymentService** | Payment business logic | - Encapsulates payment logic<br>- Integrates with Stripe<br>- Links to BookingService<br>- Handles refunds | Class with static methods → `PaymentService.processStripePayment(id, card)` → Validates card → Calls Stripe → Updates payment status → Updates booking status |
| **PromotionService** | Promo code logic | - Validates promo codes<br>- Calculates discounts<br>- Tracks usage<br>- Enforces limits | Queries promo_codes table → Checks expiry/active/usage → Calculates discount (fixed or %) → Increments used_count → Returns discount amount |

---

## 4. Core Logic

### 4.1 Booking Creation (BookingService.createBooking)

```typescript
async createBooking(bookingData: BookingFormData):
  // 1. Authenticate user
  Get current user from Supabase Auth
  If not authenticated → Return error
  
  // 2. Validate booking data
  validateBookingData(bookingData)
  ├─ Check required fields (guest info, dates)
  ├─ Validate date range (check-in < check-out, not past)
  └─ Validate guest count (>= 1)
  
  // 3. Check room availability
  isAvailable = checkRoomAvailability(roomId, checkIn, checkOut)
  If not available → Return error
  
  // 4. Calculate pricing
  nights = calculateNights(checkIn, checkOut)
  basePrice = roomInfo.promotion_price || roomInfo.price
  specialRequestsTotal = sum(selected special requests with prices)
  subtotal = (basePrice * nights * roomCount) + specialRequestsTotal
  
  // 5. Apply promo code (if provided)
  If promoCode exists:
    promoDiscount = getPromoDiscountFromDatabase(promoCode, subtotal)
    If invalid promo → Return error
  Else:
    promoDiscount = 0
  
  finalTotal = subtotal - promoDiscount
  
  // 6. Create booking record
  Insert into bookings:
    room_id, customer_id, check_in_date, check_out_date,
    total_amount, status='Pending', promo_code, room_count, guest_count,
    special_requests, standard_request, additional_request, payment_method
  
  Return: booking object
```

### 4.2 Room Availability Check

```typescript
async checkRoomAvailability(roomId, checkIn, checkOut):
  // Step 1: Check room status and active flag
  room = SELECT status, is_active FROM rooms WHERE id = roomId
  
  If room not found OR !room.is_active → Return false
  
  availableStatuses = ['Vacant', 'Vacant Clean', 'Vacant Clean Inspected', 'Vacant Clean Pick Up']
  If room.status NOT IN availableStatuses → Return false
  
  // Step 2: Check for conflicting bookings
  conflictingBookings = SELECT * FROM bookings
    WHERE room_id = roomId
    AND status = 'Confirmed'
    AND check_in_date < checkOut
    AND check_out_date > checkIn
  
  If conflictingBookings.length > 0 → Return false
  
  Return true (room is available)
```

### 4.3 Pricing Calculation

```typescript
function calculateBookingTotal(
  basePrice: number,
  nights: number,
  specialRequests: SpecialRequest[],
  roomCount: number,
  promoDiscount: number
):
  // Base room cost
  roomTotal = basePrice * nights * roomCount
  
  // Special requests (only paid ones)
  specialRequestsTotal = specialRequests
    .filter(req => req.selected && req.type === 'special' && req.price)
    .reduce((sum, req) => sum + (req.calculated_price || req.price), 0)
  
  // Subtotal before discount
  subtotal = roomTotal + specialRequestsTotal
  
  // Apply discount
  finalTotal = Math.max(0, subtotal - promoDiscount)
  
  Return {
    nights,
    basePrice,
    roomTotal,
    specialRequestsTotal,
    subtotal,
    promoDiscount,
    total: finalTotal
  }
```

### 4.4 Cancellation Policy

```typescript
function canCancelBooking(checkInDate, createdAt):
  now = new Date()
  checkIn = new Date(checkInDate)
  
  hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60)
  
  // Can cancel if more than 24 hours before check-in
  Return hoursUntilCheckIn > 24
```

### 4.5 Payment Creation (PaymentService)

```typescript
async createPayment(
  bookingId: string,
  amount: number,
  paymentMethod: 'Credit Card' | 'Cash',
  cardDetails?: { cardNumber, cardOwner, expiryDate, cvc }
):
  // 1. Validate payment data
  validatePaymentData(amount, paymentMethod, cardDetails)
  ├─ Amount must be > 0
  ├─ If Credit Card: validate card fields (number, owner, expiry, CVC)
  └─ Return errors if validation fails
  
  // 2. Prepare payment record
  paymentData = {
    booking_id: bookingId,
    amount: amount,
    payment_method: paymentMethod,
    status: 'Pending'
  }
  
  // 3. Add card metadata (if Credit Card)
  If paymentMethod === 'Credit Card':
    paymentData.card_last_three = cardNumber.slice(-3)
    paymentData.meta = { card_owner, expiry_date }
  
  // 4. Insert payment record
  Insert into payments table
  
  Return: payment object
```

### 4.6 Stripe Payment Processing

```typescript
async processStripePayment(
  paymentId, cardNumber, cardOwner, expiryDate, cvc
):
  // 1. Validate test card
  cardValidation = StripeService.validateTestCard(cardNumber)
  If not valid Stripe test card → Return error
  
  // 2. Get payment record
  payment = SELECT * FROM payments WHERE id = paymentId
  If not found → Return error
  
  // 3. Simulate Stripe payment
  simulationResult = StripeService.simulatePayment(cardNumber, amount)
  
  // 4a. Payment Failed
  If simulationResult.success === false:
    Update payments:
      status = 'Failed',
      stripe_payment_id = 'pi_failed_' + timestamp,
      meta = { error, card_info }
    Return: { success: false, error }
  
  // 4b. Payment Succeeded
  Update payments:
    status = 'Completed',
    stripe_payment_id = simulationResult.paymentIntentId,
    paid_at = NOW(),
    meta = { card_info, processed_at }
  
  // 5. Update booking status to Confirmed
  Update bookings SET status = 'Confirmed' WHERE id = payment.booking_id
  
  Return: { success: true, data: payment }
```

**Stripe Test Cards (StripeService):**
```typescript
const STRIPE_TEST_CARDS = {
  // ✅ Success Cards
  VISA_SUCCESS: '4242424242424242',
  MASTERCARD_SUCCESS: '5555555555554444',
  AMEX_SUCCESS: '378282246310005',
  
  // ❌ Failed Cards
  DECLINED: '4000000000000002',
  EXPIRED: '4000000000000069',
  PROCESSING_ERROR: '4000000000000119',
  INSUFFICIENT_FUNDS: '4000000000009995'
};

function validateTestCard(cardNumber: string):
  cleanNumber = cardNumber.replace(/\s/g, '')
  
  If cleanNumber in STRIPE_TEST_CARDS:
    Return { isValid: true, info: getTestCardInfo(cleanNumber) }
  Else:
    Return { isValid: false, error: 'Invalid test card' }

function simulatePayment(cardNumber: string, amount: number):
  cardInfo = getTestCardInfo(cardNumber)
  
  // Simulate different outcomes based on card
  If cardNumber === DECLINED:
    Return { success: false, error: 'Your card was declined' }
  
  If cardNumber === INSUFFICIENT_FUNDS:
    Return { success: false, error: 'Insufficient funds' }
  
  If cardNumber in SUCCESS_CARDS:
    Return { 
      success: true, 
      paymentIntentId: 'pi_test_' + randomId()
    }
```

### 4.7 Cash Payment Processing

```typescript
async processCashPayment(paymentId: string):
  // 1. Update payment status (awaiting cash on arrival)
  Update payments SET status = 'Pending' WHERE id = paymentId
  
  // 2. Confirm booking (cash payments are pre-confirmed)
  payment = SELECT * FROM payments WHERE id = paymentId
  Update bookings SET status = 'Confirmed' WHERE id = payment.booking_id
  
  Return: { success: true, message: 'Cash payment recorded' }
```

### 4.8 Refund Processing

```typescript
async refundPayment(paymentId: string):
  // 1. Get payment details
  payment = SELECT * FROM payments WHERE id = paymentId
  If not found → Return error
  
  // 2. Validate refund eligibility
  If payment.status !== 'Completed':
    Return error: 'Only completed payments can be refunded'
  
  // 3. Update payment status
  Update payments SET status = 'Refunded' WHERE id = paymentId
  
  // 4. Update booking status
  Update bookings SET status = 'Cancelled' WHERE id = payment.booking_id
  
  // TODO: In production, call Stripe refund API
  // stripe.refunds.create({ payment_intent: payment.stripe_payment_id })
  
  Return: { success: true, data: updatedPayment }
```

---

## 5. Data Model / Database Schema

### Table: `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  customer_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Booking details
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_count INTEGER DEFAULT 1,
  guest_count INTEGER NOT NULL,
  
  -- Pricing
  total_amount DECIMAL(10,2) NOT NULL,
  promo_code TEXT,
  
  -- Requests
  special_requests JSONB,           -- Paid add-ons: [{ name, price, selected, calculated_price }]
  standard_request TEXT[],          -- Free add-ons: ['Early check-in', 'Late check-out']
  additional_request TEXT,          -- Free-text custom request
  
  -- Payment
  payment_method TEXT,              -- 'Credit Card' | 'Cash'
  
  -- Status tracking
  status TEXT DEFAULT 'Pending',    -- 'Pending' | 'Confirmed' | 'Checked-In' | 'Completed' | 'Cancelled'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT valid_guest_count CHECK (guest_count >= 1),
  CONSTRAINT valid_room_count CHECK (room_count >= 1),
  
  -- Indexes
  INDEX idx_customer_bookings ON bookings(customer_id, created_at DESC),
  INDEX idx_room_bookings ON bookings(room_id, check_in_date, check_out_date),
  INDEX idx_booking_status ON bookings(status)
);
```

### Table: `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,          -- 'Credit Card' | 'Cash'
  
  -- Status tracking
  status TEXT DEFAULT 'Pending',         -- 'Pending' | 'Completed' | 'Failed' | 'Refunded'
  
  -- Stripe integration
  stripe_payment_id TEXT,                -- Stripe PaymentIntent ID
  
  -- Card metadata (for credit cards)
  card_last_three TEXT,                  -- Last 3 digits (for reference)
  meta JSONB,                            -- { card_owner, expiry_date, card_info }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,                   -- When payment completed
  
  -- Constraints
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('Credit Card', 'Cash')),
  
  -- Indexes
  INDEX idx_booking_payments ON payments(booking_id),
  INDEX idx_payment_status ON payments(status),
  INDEX idx_stripe_payments ON payments(stripe_payment_id)
);
```

### Table: `rooms` (relevant fields)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  room_type TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  promotion_price DECIMAL(10,2),    -- Discounted price (used if set)
  guests INTEGER NOT NULL,
  room_size INTEGER,
  bed_type TEXT,
  status TEXT DEFAULT 'Vacant',     -- Room housekeeping status
  is_active BOOLEAN DEFAULT true,   -- Available for booking?
  amenities TEXT[],
  main_image_url TEXT[],
  gallery_images TEXT[]
);
```

### Relationships
```
bookings (1) ←→ (*) payments
  - payment.booking_id → bookings.id
  - One booking can have multiple payment attempts
  - Only one 'Completed' payment per booking

bookings (*) ←→ (1) rooms
  - booking.room_id → rooms.id
  - Multiple bookings can reference same room (different dates)
```

### Payment Status Lifecycle
```
┌─────────┐     Success      ┌───────────┐     Refund     ┌──────────┐
│ Pending │ ───────────────> │ Completed │ ─────────────> │ Refunded │
└─────────┘                  └───────────┘                └──────────┘
     │                             ↑
     │ Failure                     │
     ↓                             │
┌────────┐                         │
│ Failed │                         │
└────────┘                         │
                                   │
Triggers:                          │
- Completed → Booking status = 'Confirmed'
- Refunded → Booking status = 'Cancelled'
```

### Booking Status Lifecycle
```
┌─────────┐     Payment     ┌───────────┐     Check-in    ┌────────────┐
│ Pending │ ──────────────> │ Confirmed │ ──────────────> │ Checked-In │
└─────────┘                 └───────────┘                 └────────────┘
     │                           │                               │
     │ Cancel                    │ Cancel (>24h)                 │ Check-out
     ↓                           ↓                               ↓
┌───────────┐             ┌───────────┐                 ┌───────────┐
│ Cancelled │             │ Cancelled │                 │ Completed │
└───────────┘             └───────────┘                 └───────────┘
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled

#### Booking
1. **Date Validation**: Prevents past check-in dates, check-out before check-in
2. **Double Booking Prevention**: Checks both room status and conflicting bookings
3. **Inactive Rooms**: Rooms with `is_active=false` cannot be booked
4. **Room Status Check**: Only "Vacant" statuses are bookable
5. **Promo Code Validation**: Checks expiry, usage limits, active status
6. **24-hour Cancellation**: Enforces policy to prevent last-minute cancellations
7. **Promotion Price Priority**: Uses `promotion_price` over `price` when available
8. **Multi-room Pricing**: Correctly calculates total for multiple rooms

#### Payment
9. **Test Card Validation**: Only accepts valid Stripe test cards
10. **Payment Status Tracking**: Links payment status to booking confirmation
11. **Failed Payment Handling**: Keeps booking as 'Pending' if payment fails
12. **Refund Eligibility**: Only allows refunds for completed payments
13. **Card Metadata Storage**: Stores last 3 digits + owner name (never full card)
14. **Cash Payment Confirmation**: Automatically confirms bookings with cash payments
15. **Multiple Payment Attempts**: Allows retry if first payment fails

### Current Limitations

#### Booking System
1. **No Partial Cancellation**: Cannot cancel some rooms in multi-room booking
2. **No Date Modification**: Cannot change dates after booking (must cancel + rebook)
3. **No Room Switching**: Cannot change room type after booking created
4. **Single Room Type**: Cannot book multiple different room types in one booking
5. **No Deposit System**: Full payment required (no partial deposit option)
6. **Fixed Cancellation Policy**: 24-hour rule applies to all bookings (no flexibility)

#### Payment System
7. **Test Mode Only**: Currently using Stripe test environment (not production-ready)
8. **Test Cards Only**: Only accepts predefined Stripe test cards
9. **Simulated Stripe Calls**: Payment processing is simulated (not real Stripe API calls)
10. **No Webhook Support**: Stripe webhooks not implemented for async payment updates
11. **No Partial Refunds**: Can only refund full amount (no partial refund support)
12. **Manual Cash Completion**: Staff must manually mark cash payments as 'Completed'
13. **No Payment Link Generation**: Cannot send payment links to customers
14. **Single Payment Per Booking**: Cannot split payments across multiple cards

#### Other
15. **No Group Booking**: No special handling for large groups or events
16. **No Loyalty Program**: No points, rewards, or member discounts

### TODO / Future Enhancements

#### Booking System
- [ ] Implement booking modification (change dates, room type, guest count)
- [ ] Add partial payment / deposit system
- [ ] Support multi-room-type bookings in single transaction
- [ ] Implement flexible cancellation policies per room type
- [ ] Add booking expiry (auto-cancel unpaid bookings after X hours)
- [ ] Implement waitlist for fully booked dates
- [ ] Add recurring booking support (weekly/monthly stays)
- [ ] Implement group booking discounts
- [ ] Add booking notifications (SMS/Email confirmations)
- [ ] Support for corporate accounts / credit terms
- [ ] Implement early check-in / late check-out fees (dynamic pricing)
- [ ] Add booking history export (PDF receipts)
- [ ] Implement booking calendar view for customers
- [ ] Add "Book Again" feature for repeat bookings

#### Payment System
- [ ] **Switch to Production Stripe**: Move from test mode to live environment
- [ ] **Implement Real Stripe API Calls**: Replace simulation with actual payment processing
- [ ] **Add Stripe Webhooks**: Handle async payment events (success, failure, dispute)
- [ ] **Support Real Credit Cards**: Remove test card validation, use real tokenization
- [ ] **Partial Refund Support**: Allow refunding partial amounts for service charges
- [ ] **Split Payments**: Support paying with multiple cards or payment methods
- [ ] **Payment Links**: Generate secure links for remote payments
- [ ] **Automated Cash Payment Tracking**: Integrate with POS system for real-time updates
- [ ] **Payment Receipt Generation**: Auto-generate and email PDF receipts
- [ ] **Currency Support**: Add multi-currency payment processing
- [ ] **Payment Plans**: Support installment payments for long-term bookings
- [ ] **3D Secure Authentication**: Add SCA (Strong Customer Authentication) for EU cards
- [ ] **Payment Retry Logic**: Auto-retry failed payments with exponential backoff
- [ ] **Chargeback Handling**: Implement dispute resolution workflow

### Known Issues

#### Booking System
- **Race Condition**: Concurrent bookings for the same room may succeed (no row-level locking)
- **Promo Code Timing**: Promo used_count incremented even if payment fails
- **No Refund Tracking**: Refund status not stored in bookings table
- **Special Request Validation**: No validation on custom additional_request text length
- **Guest Count vs Room Capacity**: No enforcement of room.guests limit in booking validation

#### Payment System
- **No Idempotency Keys**: Multiple clicks can create duplicate payment attempts
- **Simulated Failures**: Test card failures are simulated, not real Stripe responses
- **No Retry Mechanism**: Failed payments require manual retry by user
- **Card Metadata Incomplete**: Only stores last 3 digits (no card brand, country, etc.)
- **No Payment Timeout**: Pending payments remain indefinitely (no expiration)
- **Cash Payment Verification**: No proof-of-payment storage for cash transactions
- **Refund Simulation Only**: Refunds don't actually call Stripe API

