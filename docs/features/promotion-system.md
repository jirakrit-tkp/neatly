# Feature: Promotion & Discount Code System

## 1. Overview

The promotion system manages discount codes (promo codes) that customers can apply to bookings to receive discounts. It supports both fixed-amount discounts and percentage-based discounts, with features like expiration dates, usage limits, and active/inactive status control.

**Purpose:**
- Create and manage promotional discount codes
- Apply discounts to bookings during checkout
- Track promo code usage and enforce limits
- Support both fixed amount and percentage discounts
- Control code validity through expiration dates
- Monitor promo code performance

**Key Features:**
- **Two Discount Types**: Fixed amount (฿500 off) or percentage (20% off)
- **Usage Tracking**: Counts how many times code has been used
- **Usage Limits**: Optional max_uses cap (0 = unlimited)
- **Expiration Dates**: Automatic invalidation after expires_at
- **Active/Inactive Status**: Admins can enable/disable codes
- **Case-Insensitive**: Codes stored uppercase, queries case-insensitive
- **Eligibility Checking**: Validates code before application

---

## 2. Architecture / Flow

### Promo Code Application Flow (Customer)
```
Customer enters promo code at checkout → Validate promo code
  → Step 1: Check if code exists (case-insensitive)
  → Step 2: Validate active status (is_active = true)
  → Step 3: Check expiration (expires_at > now)
  → Step 4: Check usage limit (used_count < max_uses OR max_uses = 0)
  → Step 5: Calculate discount
    ├─ If discount_amount → Discount = min(discount_amount, total)
    └─ If discount_percent → Discount = (total * discount_percent) / 100
  → Step 6: Apply to booking total
    └─ new_total = original_total - discount
  → Step 7: Increment used_count
  → Success → Display discounted price
```

### Promo Code Creation Flow (Admin)
```
Admin creates promo code → Fill form:
  ├─ code (unique, uppercase)
  ├─ description (optional)
  ├─ discount_amount OR discount_percent (one required)
  ├─ expires_at (date)
  ├─ max_uses (0 = unlimited)
  └─ is_active (default true)
→ Validate uniqueness
→ Insert into promo_codes table
→ Success → Redirect to promo list
```

### Promo Code Validation Flow
```
validatePromotionCode(code, roomId, checkIn, checkOut):
  // 1. Check existence
  promo = SELECT * FROM promo_codes WHERE code = UPPER(code)
  If not found → Return { isValid: false, error: 'Invalid code' }
  
  // 2. Check active status
  If !promo.is_active → Return { isValid: false, error: 'Code not active' }
  
  // 3. Check expiration
  If NOW() > promo.expires_at → Return { isValid: false, error: 'Code expired' }
  
  // 4. Check usage limit
  If promo.max_uses > 0 AND promo.used_count >= promo.max_uses:
    Return { isValid: false, error: 'Usage limit reached' }
  
  // 5. Return valid promo
  Return { isValid: true, promotionCode: promo }
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| **Supabase Database** | Promo code storage | CRUD operations on promo_codes table |
| **PromotionService** | Business logic layer | Validation, calculation, application |
| **BookingService** | Integration point | Apply promo to booking total |
| **date-fns** | Date validation | Check expiration dates |

---

## 4. Core Logic

### 4.1 Discount Calculation

```typescript
function calculateDiscount(baseAmount: number, promotionCode: PromotionCode):
  If !promotionCode.isValid → Return 0
  
  // Priority 1: Fixed discount amount (preferred)
  If promotionCode.discount_amount AND promotionCode.discount_amount > 0:
    // Cannot discount more than total
    Return Math.min(promotionCode.discount_amount, baseAmount)
  
  // Priority 2: Percentage discount (fallback)
  If promotionCode.discount_percent AND promotionCode.discount_percent > 0:
    Return (baseAmount * promotionCode.discount_percent) / 100
  
  // Priority 3: Legacy discountType (backward compatibility)
  If promotionCode.discountType === 'fixed':
    Return Math.min(promotionCode.discount, baseAmount)
  Else If promotionCode.discountType === 'percentage':
    Return (baseAmount * promotionCode.discount) / 100
  
  Return 0
```

**Example Calculations:**
```
Scenario 1: Fixed Amount Discount
  Original Total: ฿10,000
  Promo: discount_amount = 1500
  Discount: ฿1,500
  Final Total: ฿8,500

Scenario 2: Percentage Discount
  Original Total: ฿10,000
  Promo: discount_percent = 20
  Discount: ฿2,000 (20% of 10,000)
  Final Total: ฿8,000

Scenario 3: Fixed Discount Exceeds Total
  Original Total: ฿500
  Promo: discount_amount = 1000
  Discount: ฿500 (capped at total)
  Final Total: ฿0
```

### 4.2 Usage Tracking

```typescript
async incrementPromoUsedCount(promoCode: string):
  // 1. Get current used_count
  promo = SELECT used_count FROM promo_codes WHERE code = UPPER(promoCode)
  
  // 2. Increment used_count
  Update promo_codes SET 
    used_count = promo.used_count + 1,
    updated_at = NOW()
  WHERE code = UPPER(promoCode)
  
  Log: "Incremented used_count for: {promoCode}"
```

**Called After:**
- Successful booking with promo code
- Payment completed (not on failed payments)

### 4.3 Promo Code Removal

```typescript
async removePromotionCode(bookingId: string):
  // 1. Get booking with promo code
  booking = SELECT * FROM bookings WHERE id = bookingId
  
  // 2. Recalculate original total (without discount)
  originalTotal = calculateOriginalTotal(booking)
  
  // 3. Update booking
  Update bookings SET 
    promo_code = NULL,
    total = originalTotal,
    updated_at = NOW()
  WHERE id = bookingId
  
  Return: updated booking
```

### 4.4 Eligibility Check (User-Specific)

```typescript
async checkPromotionEligibility(userId: string, promotionCode: string):
  // Check if user already used this promo code
  usage = SELECT id FROM bookings 
    WHERE customer_id = userId 
    AND promo_code = UPPER(promotionCode)
  
  // Return true if no previous usage found (eligible)
  Return usage === null
```

**Use Case:** Enforce one-time-per-user promo codes

---

## 5. Data Model / Database Schema

### Table: `promo_codes`
```sql
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Code details
  code TEXT UNIQUE NOT NULL,              -- Uppercase code (e.g., "SUMMER20")
  description TEXT,                       -- Human-readable description
  
  -- Discount configuration (ONE must be set)
  discount_amount DECIMAL(10,2),          -- Fixed amount (e.g., 500 = ฿500 off)
  discount_percent DECIMAL(5,2),          -- Percentage (e.g., 20 = 20% off)
  
  -- Validity control
  is_active BOOLEAN DEFAULT true,         -- Admin can enable/disable
  expires_at TIMESTAMPTZ NOT NULL,        -- Auto-invalidation date
  
  -- Usage tracking
  max_uses INTEGER DEFAULT 0,             -- 0 = unlimited, >0 = usage cap
  used_count INTEGER DEFAULT 0,           -- How many times used
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_discount CHECK (
    (discount_amount IS NOT NULL AND discount_amount > 0) OR
    (discount_percent IS NOT NULL AND discount_percent > 0 AND discount_percent <= 100)
  ),
  CONSTRAINT valid_max_uses CHECK (max_uses >= 0),
  CONSTRAINT valid_used_count CHECK (used_count >= 0),
  
  -- Indexes
  INDEX idx_promo_code ON promo_codes(UPPER(code)),
  INDEX idx_active_promos ON promo_codes(is_active, expires_at)
);
```

### Promo Code Lifecycle States
```
┌─────────┐    Admin      ┌────────┐    Expiry    ┌─────────┐
│ Created │ ────────────> │ Active │ ───────────> │ Expired │
└─────────┘    Enable     └────────┘  (automatic) └─────────┘
                               │
                               │ Admin Disable
                               ↓
                          ┌──────────┐
                          │ Inactive │
                          └──────────┘
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **Discount Cap**: Fixed amount discount cannot exceed booking total
2. **Case Insensitivity**: Codes matched with UPPER() transformation
3. **Usage Limit**: Enforces max_uses cap (unlimited if 0)
4. **Expiration Enforcement**: Auto-rejects expired codes
5. **Active Status Check**: Only active codes are valid
6. **Percentage Validation**: Ensures percentage ≤ 100%
7. **One Promo Per Booking**: Cannot stack multiple promo codes

### Current Limitations
1. **No Code Stacking**: Cannot apply multiple promo codes to one booking
2. **No User-Specific Codes**: All codes public (no personalized codes)
3. **No Minimum Order**: No minimum booking amount requirement
4. **No Room Type Restrictions**: Codes apply to all room types
5. **No Date Restrictions**: Cannot limit to specific booking dates
6. **No First-Time User Only**: No validation for new vs returning customers
7. **No Promo Categories**: No grouping/categorization of promos
8. **No Auto-Apply**: Best promo not automatically applied

### TODO / Future Enhancements
- [ ] **Support Code Stacking**: Allow multiple compatible promo codes
- [ ] **Add Minimum Order Value**: e.g., "Valid for bookings over ฿5,000"
- [ ] **Room Type Restrictions**: Limit promo to specific room types
- [ ] **Date Range Restrictions**: Valid only for bookings in specific periods
- [ ] **User Segment Targeting**: First-time users, VIP members, etc.
- [ ] **Auto-Apply Best Promo**: System finds and applies best discount
- [ ] **Promo Code Generator**: Auto-generate unique random codes
- [ ] **Referral Codes**: Give users personal referral codes
- [ ] **Promo Campaigns**: Group codes by marketing campaign
- [ ] **A/B Testing**: Test different promo strategies
- [ ] **Promo Analytics Dashboard**: Usage stats, revenue impact, conversion rates
- [ ] **Email-Linked Codes**: Codes valid only for specific email addresses
- [ ] **Combo Deals**: Room + Spa package promos
- [ ] **Loyalty Points Integration**: Convert points to promo codes
- [ ] **Flash Sales**: Time-limited hourly deals
- [ ] **Geolocation-Based**: Codes valid only in specific regions

### Known Issues
- **Used Count Increment Timing**: Incremented even if payment fails (should increment only on successful payment)
- **No Promo History**: Cannot see who used which code
- **No Fraud Detection**: No prevention for code abuse
- **Concurrent Usage**: Race condition when multiple users use code near limit
- **No Promo Removal Impact**: Removing promo from booking doesn't decrement used_count
- **Expired Codes Not Archived**: Expired codes remain in active table (no archival)

