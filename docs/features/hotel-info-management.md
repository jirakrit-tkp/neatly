# Feature: Hotel Information Management

## 1. Overview

The hotel information management system allows administrators to update and manage the hotel's core details displayed throughout the website, including the hotel name, description, and logo. This information is globally accessible via React Context and is used across customer-facing pages (homepage, about section, footer) and admin panels.

**Purpose:**
- Centralized management of hotel branding and information
- Dynamic updates without code deployment
- Consistent hotel information across all pages
- Support for logo updates with image upload
- SEO-friendly descriptions

**Key Features:**
- **Global State Management**: React Context provides hotel info to all components
- **Dynamic Updates**: Changes reflect immediately without page reload
- **Logo Upload**: Admin can upload custom hotel logo
- **Description Editor**: Multi-line text area for hotel description
- **Default Fallback**: Hardcoded defaults if database fetch fails

---

## 2. Architecture / Flow

### Hotel Info Loading Flow
```
Application Initialization → HotelInfoProvider mounts
  → useEffect triggers fetchHotelInfo()
    → GET /api/hotel-info
      ├─ Fetch from hotel_info table (or Supabase config)
      └─ Return: { name, description, logoUrl }
    → Update React Context state
    → Components consuming useHotelInfo() re-render
```

### Hotel Info Update Flow (Admin)
```
Admin navigates to Hotel Info page (/admin/hotel-info)
  → Load current hotel info from Context
  → Admin edits form (name, description, upload logo)
  → Admin clicks "Save"
    → If logo changed: Upload to Supabase Storage
    → PUT /api/hotel-info
      ├─ Validate input (name required, description length)
      └─ Update hotel_info table
    → Call refreshHotelInfo() in Context
    → Success notification → UI updates globally
```

### Logo Upload Flow
```
Admin selects logo file → Validate file:
  ├─ Check file type (PNG, JPG, SVG)
  ├─ Check file size (< 2MB)
  └─ Validate dimensions (recommend 500x200)
→ Upload to Supabase Storage bucket 'hotel-assets'
  ├─ Generate filename: logo_{timestamp}.{ext}
  └─ Get public URL
→ Update hotel_info.logoUrl with new URL
→ Delete old logo (optional cleanup)
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| **React Context API** | Global state management | `HotelInfoContext`, `useHotelInfo()` |
| **Supabase Database** | Persistent storage | Store hotel name, description |
| **Supabase Storage** | Logo image storage | Upload/retrieve logo images |
| **Next.js API Routes** | Backend endpoints | /api/hotel-info (GET, PUT) |
| **React Hook Form** | Form management | Hotel info edit form |

---

## 4. Core Logic

### 4.1 HotelInfoContext (src/context/HotelInfoContext.tsx)

**State Management:**
```typescript
interface HotelInfo {
  name: string;
  description: string;
  logoUrl: string;
}

const [hotelInfo, setHotelInfo] = useState<HotelInfo>({
  name: "Neatly Hotel",
  description: "Set in Bangkok, Thailand, Neatly Hotel offers 5-star accommodation...",
  logoUrl: "/logo.png"
});

const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Fetch Hotel Info:**
```typescript
const fetchHotelInfo = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/hotel-info');
    const result = await response.json();
    
    if (result.success) {
      setHotelInfo(result.data);
    } else {
      setError(result.message || 'Failed to fetch hotel information');
    }
  } catch (err) {
    setError('Network error occurred');
    console.error('Error fetching hotel info:', err);
  } finally {
    setLoading(false);
  }
};

// Load on mount
useEffect(() => {
  fetchHotelInfo();
}, []);
```

**Update Hotel Info:**
```typescript
const updateHotelInfo = async (data: Partial<HotelInfo>): Promise<boolean> => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await fetch('/api/hotel-info', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (result.success) {
      setHotelInfo(result.data);
      return true;
    } else {
      setError(result.message || 'Failed to update hotel information');
      return false;
    }
  } catch (err) {
    setError('Network error occurred');
    return false;
  } finally {
    setLoading(false);
  }
};
```

### 4.2 API Route: /api/hotel-info

**GET Request (Fetch):**
```typescript
// GET /api/hotel-info
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Option 1: Fetch from database table
      const { data, error } = await supabase
        .from('hotel_info')
        .select('*')
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: {
          name: data.name,
          description: data.description,
          logoUrl: data.logo_url
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch hotel information'
      });
    }
  }
}
```

**PUT Request (Update):**
```typescript
// PUT /api/hotel-info
export default async function handler(req, res) {
  if (req.method === 'PUT') {
    try {
      const { name, description, logoUrl } = req.body;
      
      // Validate input
      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Hotel name is required'
        });
      }
      
      // Update database
      const { data, error } = await supabase
        .from('hotel_info')
        .update({
          name,
          description,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1) // Assuming single hotel record
        .select()
        .single();
      
      if (error) throw error;
      
      res.status(200).json({
        success: true,
        data: {
          name: data.name,
          description: data.description,
          logoUrl: data.logo_url
        },
        message: 'Hotel information updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update hotel information'
      });
    }
  }
}
```

### 4.3 Logo Upload

```typescript
async function uploadLogo(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `logo_${Date.now()}.${fileExt}`;
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('hotel-assets')
    .upload(fileName, file);
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('hotel-assets')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

### 4.4 Usage in Components

```typescript
// Example: Display hotel name in Navbar
import { useHotelInfo } from '@/context/HotelInfoContext';

const Navbar = () => {
  const { hotelInfo, loading } = useHotelInfo();
  
  return (
    <nav>
      <img src={hotelInfo.logoUrl} alt={hotelInfo.name} />
      <h1>{hotelInfo.name}</h1>
    </nav>
  );
};

// Example: Update hotel info in admin panel
const HotelInfoPage = () => {
  const { hotelInfo, updateHotelInfo, loading } = useHotelInfo();
  
  const handleSubmit = async (formData) => {
    const success = await updateHotelInfo(formData);
    if (success) {
      alert('Hotel information updated!');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input defaultValue={hotelInfo.name} name="name" />
      <textarea defaultValue={hotelInfo.description} name="description" />
      <button type="submit" disabled={loading}>Save</button>
    </form>
  );
};
```

---

## 5. Data Model / Database Schema

### Table: `hotel_info`
```sql
CREATE TABLE hotel_info (
  id INTEGER PRIMARY KEY DEFAULT 1,          -- Single record (singleton pattern)
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  
  -- Additional fields (future extensions)
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Social media
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint to ensure single record
  CONSTRAINT single_hotel_info CHECK (id = 1)
);

-- Insert default record
INSERT INTO hotel_info (id, name, description, logo_url) VALUES (
  1,
  'Neatly Hotel',
  'Set in Bangkok, Thailand, Neatly Hotel offers 5-star accommodation with an outdoor pool, kids'' club, sports facilities and a fitness centre. There is also a spa, an indoor pool and saunas.

All units at the hotel are equipped with a seating area, a flat-screen TV with satellite channels, a dining area and a private bathroom with free toiletries, a bathtub and a hairdryer. Every room in Neatly Hotel features a furnished balcony. Some rooms are equipped with a coffee machine.

Free WiFi and entertainment facilities are available at property and also rentals are provided to explore the area.',
  '/logo.png'
);
```

### Storage Bucket: `hotel-assets`
```
Public bucket for hotel branding assets
Files:
  - logo_{timestamp}.png
  - banner_{timestamp}.jpg
  - favicon_{timestamp}.ico
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **Default Fallback**: Hardcoded defaults if database fetch fails
2. **Loading State**: Displays loading indicator during fetch
3. **Error Handling**: Shows error message if update fails
4. **Single Record Pattern**: Ensures only one hotel info record exists

### Current Limitations
1. **Single Hotel Only**: Cannot manage multiple properties
2. **No Version History**: Cannot revert to previous hotel info
3. **Logo Size Not Enforced**: No validation on logo dimensions/size
4. **No Rich Text Editor**: Description is plain text only
5. **No SEO Metadata**: No separate meta description, keywords
6. **No Localization**: Single language only (no i18n)
7. **No Preview Mode**: Cannot preview changes before saving

### TODO / Future Enhancements
- [ ] **Multi-Property Support**: Manage multiple hotel locations
- [ ] **Version History**: Track changes and allow rollback
- [ ] **Rich Text Editor**: WYSIWYG editor for description
- [ ] **Image Cropping**: Crop/resize logo before upload
- [ ] **SEO Fields**: Add meta description, keywords, structured data
- [ ] **Localization**: Multi-language support for hotel info
- [ ] **Preview Mode**: Preview changes before publishing
- [ ] **Contact Information**: Add phone, email, address fields
- [ ] **Social Media Links**: Facebook, Instagram, Twitter, etc.
- [ ] **Business Hours**: Opening/closing times
- [ ] **Amenities List**: Check-in time, facilities, services
- [ ] **Location Map**: Embed Google Maps location
- [ ] **Image Gallery**: Multiple hotel images
- [ ] **Awards/Certifications**: Display badges, ratings
- [ ] **Change Approval Workflow**: Require approval before publishing

### Known Issues
- **No Logo Cleanup**: Old logos not deleted when new logo uploaded
- **Context Race Condition**: Multiple updates in quick succession may conflict
- **No Caching**: Hotel info fetched on every app initialization (no cache)
- **Single Record Assumption**: Code assumes id=1 exists (breaks if deleted)

