# Feature: Authentication & Authorization

## 1. Overview

The authentication system provides secure user registration, login, session management, and role-based access control for the Neatly Hotel platform. It supports both authenticated users (customers and admins) and anonymous guests (for chatbot functionality). The system is built on Supabase Auth with custom profile management and automatic session linking when guests log in.

**Purpose:**
- Secure user authentication and session management
- Role-based access control (customer, admin)
- Guest/anonymous user support for chatbot
- Profile creation and management
- Email verification
- Password reset functionality
- Automatic guest-to-user session linking

**Integration Points:**
- All protected routes (admin panel, bookings, profile)
- Chatbot system (anonymous + authenticated)
- Booking system (requires authentication)
- Profile management

---

## 2. Architecture / Flow

### User Registration Flow
```
User fills registration form → Frontend validation
  → AuthService.registerUser() → Supabase Auth (create user)
  → Create profile in `profiles` table → Upload profile picture (optional)
  → Email verification sent → Redirect to login
```

### Login Flow
```
User enters credentials → Supabase Auth.signInWithPassword()
  → Session created → AuthContext updates → Check anonymous_id in localStorage
  → Link guest chatbot sessions (if exists) → Redirect based on role
```

### Guest Flow (Anonymous)
```
User opens site without login → AuthContext generates anonymous_id
  → Store in localStorage → Use for chatbot sessions
  → On login: Link guest sessions to user account → Clear anonymous_id
```

### Session Linking Flow
```
SIGNED_IN event detected → Get anonymous_id from localStorage
  → Call /api/chat/link-session → Update chatbot_sessions table
  → Set customer_id for all anonymous sessions → Clear anonymous_id
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| `@supabase/supabase-js` | Authentication backend | User signup, login, session management |
| Supabase Auth | Identity management | OAuth, JWT tokens, session persistence |
| Supabase Storage | Profile pictures | Upload/retrieve user avatars |
| React Context API | Global auth state | `AuthContext`, `AuthProvider` |
| localStorage | Anonymous ID storage | Guest session tracking |
| Next.js middleware | Route protection | Admin/customer route guards |

---

## 4. Core Logic

### AuthService (src/services/authService.ts)

**User Registration:**
```typescript
1. Create user in Supabase Auth (auth.users)
2. Insert profile in `profiles` table with user metadata
3. Upload profile picture to Supabase Storage (optional)
4. Update profile with image URL
5. Send email verification
```

**Username Availability Check:**
```typescript
Query profiles table for existing username
Return: true if available, false if taken
```

### AuthContext (src/context/AuthContext.tsx)

**State Management:**
- `user`: Current authenticated user (User | null)
- `loading`: Auth state loading flag
- `anonymousId`: Generated UUID for guest users
- `isGuest`: Computed flag (no user + has anonymousId)

**Session Linking Logic:**
```typescript
When SIGNED_IN event occurs:
1. Get anonymous_id from localStorage
2. Call /api/chat/link-session with anonymousId
3. Backend updates chatbot_sessions: set customer_id
4. Clear localStorage anonymous_id
5. User sees their guest chat history
```

**Anonymous ID Generation:**
```typescript
function getOrCreateAnonymousId():
  Check localStorage for 'neatly_anonymous_id'
  If not exists:
    Generate UUID v4
    Store in localStorage
  Return anonymous_id
```

---

## 5. Data Model / Database Schema

### Table: `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  country TEXT,
  profile_image TEXT,
  role TEXT DEFAULT 'customer', -- 'customer' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `auth.users` (Supabase managed)
```sql
-- Managed by Supabase Auth
-- Stores: id, email, encrypted_password, email_confirmed_at, etc.
```

### Storage Bucket: `profile-pictures`
```
Public bucket for user profile images
File naming: {userId}.{extension}
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **Duplicate Username**: Checked before registration via `checkUsernameAvailability()`
2. **Email Verification**: User can resend verification email via `resendVerificationEmail()`
3. **Guest Session Linking**: Prevents duplicate sessions when user logs in multiple times
4. **Profile Picture Override**: Old picture deleted before new upload
5. **Session Persistence**: Auto-refresh token enabled in Supabase client

### Current Limitations
1. **No Social OAuth**: Only email/password authentication (no Google, Facebook, etc.)
2. **No Two-Factor Authentication (2FA)**: Standard password-only login
3. **No Account Deletion**: Users cannot self-delete accounts
4. **No Role Migration**: Cannot change user role (customer ↔ admin) through UI
5. **Guest Chatbot Limit**: Anonymous users lose chat history if localStorage is cleared

### TODO / Future Enhancements
- [ ] Implement OAuth providers (Google, Facebook)
- [ ] Add two-factor authentication (2FA)
- [ ] Add account deactivation/deletion feature
- [ ] Implement role management UI (admin only)
- [ ] Add session timeout configuration
- [ ] Implement password strength indicator
- [ ] Add "Remember Me" functionality
- [ ] Support for profile picture cropping/editing
- [ ] Add account recovery questions
- [ ] Implement activity log (login history, IP tracking)

### Known Issues
- **Anonymous ID Persistence**: If user clears browser data, guest chatbot sessions are lost
- **Email Verification Not Enforced**: Users can access system without verifying email (currently optional)
- **No Rate Limiting**: Login attempts not rate-limited (vulnerable to brute force)

