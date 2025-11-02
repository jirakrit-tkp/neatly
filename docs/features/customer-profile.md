# Feature: Customer Profile Management

## 1. Overview

The customer profile management system enables users to view and update their personal information, including profile picture, contact details, and account preferences. It integrates tightly with Supabase Auth and provides a user-friendly interface for profile customization.

**Purpose:**
- Allow customers to manage their account information
- Update profile picture with image upload
- Modify personal details (name, phone, address, etc.)
- View account information (email, registration date)
- Maintain consistency between auth.users and profiles tables

**Key Features:**
- **Profile Picture Upload**: Upload and update avatar images
- **Personal Info Editing**: Update name, phone, date of birth, country
- **Email Display**: View registered email (read-only, managed by auth)
- **Account Security**: Password change through Supabase Auth
- **Data Validation**: Client-side and server-side validation

---

## 2. Architecture / Flow

### Profile Loading Flow
```
User navigates to Profile page (/customer/profile)
  → Check authentication (AuthContext)
    If not logged in → Redirect to /login
  → Load user data:
    ├─ auth.users data (email, id)
    └─ profiles table data (username, name, phone, etc.)
  → Display profile form with current values
```

### Profile Update Flow
```
User edits profile fields → Client-side validation
  → User clicks "Save Changes"
    → If profile picture changed:
      ├─ Upload image to Supabase Storage 'profile-pictures'
      └─ Get public URL
    → PUT /api/profile
      ├─ Validate input data
      ├─ Update profiles table
      └─ Update auth.users metadata (optional)
    → Success → Refresh profile data
    → Show success notification
```

### Profile Picture Upload Flow
```
User selects image file → Validate:
  ├─ File type (PNG, JPG, JPEG)
  ├─ File size (< 5MB)
  └─ Image dimensions (optional)
→ Upload to Supabase Storage
  ├─ Filename: {userId}.{extension}
  ├─ Replace existing file (auto-overwrite)
  └─ Get public URL
→ Update profiles.profile_image with URL
→ Display new profile picture
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| **Supabase Auth** | User authentication | Get current user ID |
| **Supabase Database** | Profile data storage | CRUD on profiles table |
| **Supabase Storage** | Profile picture storage | Upload/retrieve avatars |
| **React Hook Form** | Form state management | Profile edit form |
| **Zod** | Schema validation | Validate profile data |
| **profileService** | Business logic layer | Update profile, upload image |

---

## 4. Core Logic

### 4.1 Profile Service (src/services/profileService.ts)

**Get User Profile:**
```typescript
async getUserProfile(userId: string):
  // 1. Get auth user data
  const { data: { user } } = await supabase.auth.getUser();
  
  // 2. Get profile data
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  
  // 3. Merge data
  Return {
    id: user.id,
    email: user.email,
    username: profile.username,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    dateOfBirth: profile.date_of_birth,
    country: profile.country,
    profileImage: profile.profile_image,
    role: profile.role
  }
```

**Update Profile:**
```typescript
async updateProfile(userId: string, data: ProfileUpdateData):
  // 1. Validate data
  validateProfileData(data)
  
  // 2. Update profiles table
  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      date_of_birth: data.dateOfBirth,
      country: data.country,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  
  // 3. Update auth.users metadata (optional)
  await supabase.auth.updateUser({
    data: {
      first_name: data.firstName,
      last_name: data.lastName
    }
  });
  
  Return updatedProfile
```

**Upload Profile Picture:**
```typescript
async uploadProfilePicture(userId: string, file: File):
  // 1. Validate file
  If file.size > 5 * 1024 * 1024:
    throw Error('File size must be less than 5MB')
  
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
  If !allowedTypes.includes(file.type):
    throw Error('Only PNG and JPG images are allowed')
  
  // 2. Generate filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}.${fileExt}`
  
  // 3. Delete old image (if exists)
  await supabase.storage
    .from('profile-pictures')
    .remove([fileName])
  
  // 4. Upload new image
  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file)
  
  if (error) throw error
  
  // 5. Get public URL
  const { data: urlData } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(fileName)
  
  // 6. Update profile_image in profiles table
  await supabase
    .from('profiles')
    .update({ profile_image: urlData.publicUrl })
    .eq('id', userId)
  
  Return urlData.publicUrl
```

### 4.2 Profile Validation

```typescript
import { z } from 'zod';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string()
    .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number format')
    .optional(),
  dateOfBirth: z.string().refine(
    (date) => {
      const birthDate = new Date(date);
      const age = (new Date() - birthDate) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 18 && age <= 120;
    },
    { message: 'You must be at least 18 years old' }
  ).optional(),
  country: z.string().optional()
});

function validateProfileData(data: ProfileUpdateData) {
  const result = profileSchema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues.map(i => i.message).join(', '));
  }
  return result.data;
}
```

### 4.3 Custom Hook: useProfile

```typescript
// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);
  
  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getUserProfile(user.id);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const updateProfile = async (data) => {
    try {
      const updated = await profileService.updateProfile(user.id, data);
      setProfile(updated);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  const uploadProfilePicture = async (file) => {
    try {
      const url = await profileService.uploadProfilePicture(user.id, file);
      setProfile(prev => ({ ...prev, profileImage: url }));
      return { success: true, url };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  return { profile, loading, error, updateProfile, uploadProfilePicture, refreshProfile: loadProfile };
}
```

---

## 5. Data Model / Database Schema

### Table: `profiles` (Extended)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  
  -- Personal information
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  country TEXT,
  
  -- Profile picture
  profile_image TEXT,                     -- Supabase Storage URL
  
  -- Account settings
  role TEXT DEFAULT 'customer',           -- 'customer' | 'admin'
  
  -- Preferences (future)
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'THB',
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_phone CHECK (phone ~ '^[0-9+\-\s()]+$'),
  CONSTRAINT valid_role CHECK (role IN ('customer', 'admin')),
  
  -- Indexes
  INDEX idx_username ON profiles(username)
);
```

### Storage Bucket: `profile-pictures`
```
Public bucket for user profile pictures
Naming: {userId}.{extension}
Examples:
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
  - a1b2c3d4-e5f6-7890-abcd-ef1234567890.png
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **File Size Validation**: Prevents uploads > 5MB
2. **File Type Validation**: Only PNG, JPG, JPEG allowed
3. **Profile Picture Overwrite**: New upload replaces old image
4. **Age Validation**: Requires users to be 18+ years old
5. **Phone Format Validation**: Accepts international formats

### Current Limitations
1. **No Image Cropping**: Cannot crop/resize before upload
2. **No Email Change**: Email managed by Supabase Auth (requires verification)
3. **No Password Change**: Must use separate Supabase Auth flow
4. **No Account Deletion**: Users cannot delete their own accounts
5. **No Privacy Settings**: All profile fields visible (no public/private toggle)
6. **No Avatar Selection**: No option to choose from preset avatars
7. **Single Profile Picture**: Cannot have multiple/backup pictures

### TODO / Future Enhancements
- [ ] **Image Cropping**: Add crop tool before upload
- [ ] **Avatar Gallery**: Provide preset avatars to choose from
- [ ] **Email Change**: Implement email update with verification
- [ ] **Password Change**: Add in-app password change form
- [ ] **Account Deletion**: Self-service account deletion with confirmation
- [ ] **Privacy Settings**: Control visibility of profile fields
- [ ] **Two-Factor Authentication**: Add 2FA setup in profile
- [ ] **Login History**: Show recent login activity
- [ ] **Connected Accounts**: Link social media accounts
- [ ] **Notifications Preferences**: Granular control over notifications
- [ ] **Download Profile Data**: GDPR-compliant data export
- [ ] **Profile Completeness**: Show progress bar for complete profile
- [ ] **Address Management**: Add/manage multiple addresses
- [ ] **Emergency Contact**: Add emergency contact information
- [ ] **Preferred Language**: Multi-language preference

### Known Issues
- **Profile Picture Cache**: Browser may cache old image after update
- **Concurrent Updates**: No optimistic locking (last write wins)
- **Username Cannot Change**: No UI to update username after registration
- **Profile Image Not Deleted**: Old images not removed from storage on update
- **Date of Birth Timezone**: May have timezone-related edge cases

