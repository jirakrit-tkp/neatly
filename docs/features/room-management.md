# Feature: Room & Room Type Management

## 1. Overview

The room management system enables administrators to create, update, and manage hotel rooms and room types. It handles room inventory, pricing (regular + promotional), images (main + gallery), amenities, and room status tracking. The system supports hierarchical room organization with `room_types` as templates and `rooms` as individual bookable units.

**Purpose:**
- Define room types (Deluxe, Suite, Superior, etc.) with base attributes
- Create individual bookable room instances
- Manage room pricing (base price + promotional pricing)
- Upload and manage room images (main image + gallery)
- Track room availability status and housekeeping status
- Control room visibility (active/inactive)
- Define room amenities and features

**Key Features:**
- **Two-tier Structure**: Room Types (templates) → Rooms (instances)
- **Image Management**: Main image + multiple gallery images
- **Promotional Pricing**: Optional discounted pricing
- **Room Status Tracking**: Housekeeping statuses (Vacant, Occupied, Dirty, etc.)
- **Amenities Management**: Flexible array of features (wifi, pool, gym, etc.)
- **Drag-and-Drop Ordering**: Admin can reorder rooms for display
- **Image Optimization**: Server-side image resizing with jimp

---

## 2. Architecture / Flow

### Room Type Creation Flow (Admin)
```
Admin fills room type form → Validation (Zod schema)
  → Upload main image → Supabase Storage
  → Upload gallery images → Supabase Storage
  → Create room_type record
    ├─ name, description, base_price, promo_price
    ├─ main_image (URL), gallery_images (URLs)
    └─ amenities, room_size, bed_type, guests
  → Success → Redirect to room types list
```

### Room Creation Flow (from Room Type)
```
Admin creates room from room type → Auto-populate fields from room_type
  → Set unique properties:
    ├─ room_id (unique identifier)
    ├─ price (copy from base_price or customize)
    ├─ promotion_price (optional)
    └─ status (default: 'Vacant')
  → Create room record
  → Link room to room_type via room_type_id
```

### Room Update Flow
```
Admin edits room → Load current data
  → Modify fields (price, status, images, amenities)
  → If images changed:
    ├─ Upload new images to Supabase Storage
    └─ Delete old images (optional cleanup)
  → Update room record via /api/rooms/[id] PUT
  → Success → Refresh list
```

### Room Deletion Flow
```
Admin deletes room → Confirm deletion
  → Check for active bookings (prevent deletion if booked)
  → Soft delete: Set is_active = false (preserve history)
    OR Hard delete: Remove room record
  → Optional: Delete associated images from storage
  → Success → Refresh list
```

---

## 3. Tech Stack & Libraries

| Library/API | Purpose | Example Usage |
|------------|---------|---------------|
| **Supabase Database** | Room data storage | CRUD operations on rooms, room_types tables |
| **Supabase Storage** | Image storage | Upload/retrieve room images |
| **jimp** | Image optimization | Resize images before storage |
| **multer** | File upload handling | Parse multipart form data |
| **React Hook Form** | Form state management | Room creation/edit forms |
| **Zod** | Schema validation | Validate room data (roomSchema) |
| **roomPayload util** | Data transformation | Convert form data to API payload |
| **roomService** | Business logic layer | Create, update, delete rooms |

---

## 4. Core Logic

### 4.1 Room Type vs Room

**Room Types (`room_types` table):**
- Templates/categories (e.g., "Deluxe Sea View", "Executive Suite")
- Define base attributes: description, base_price, amenities
- Used by chatbot for room recommendations
- One room type → Many rooms

**Rooms (`rooms` table):**
- Individual bookable units (e.g., "Deluxe-101", "Deluxe-102")
- Inherit attributes from room_type but can be customized
- Have unique pricing, status, and availability
- Linked via `room_type_id` foreign key

### 4.2 Room Creation (roomService.createRoom)

```typescript
async createRoom(formData: RoomFormData, hasPromotion: boolean):
  // 1. Build payload
  payload = {
    room_type: formData.roomType,
    room_size: formData.roomSize,
    bed_type: formData.bedType,
    guests: formData.guests,
    price: formData.pricePerNight,
    promotion_price: hasPromotion ? formData.promotionPrice : null,
    description: formData.description,
    main_image_url: [formData.mainImgUrl],
    gallery_images: formData.galleryImageUrls,
    amenities: formData.amenities
  }
  
  // 2. Send to API
  POST /api/rooms
  Body: JSON.stringify(payload)
  
  // 3. Backend creates room
  Insert into rooms table
  
  Return: created room object
```

### 4.3 Room Update (roomService.updateRoom)

```typescript
async updateRoom(roomId: string, formData: RoomFormData, hasPromotion: boolean):
  // 1. Build update payload
  payload = buildRoomPayload(formData, hasPromotion)
  
  // 2. Send to API
  PUT /api/rooms/[roomId]
  Body: JSON.stringify(payload)
  
  // 3. Backend updates room
  Update rooms SET 
    room_type = payload.room_type,
    price = payload.price,
    promotion_price = payload.promotion_price,
    main_image_url = payload.main_image_url,
    gallery_images = payload.gallery_images,
    amenities = payload.amenities,
    ...other fields
  WHERE id = roomId
  
  Return: updated room object
```

### 4.4 Image Upload Flow

**Multi-Image Upload API (`/api/upload-multiple-images`):**
```typescript
POST /api/upload-multiple-images
Content-Type: multipart/form-data

1. Parse uploaded files with multer
2. For each file:
   a) Optimize with jimp:
      - Resize to max 1920x1080 (maintain aspect ratio)
      - Compress to 80% quality
      - Convert to JPEG
   b) Generate unique filename: roomType_timestamp_index.jpg
   c) Upload to Supabase Storage bucket 'room-images'
   d) Get public URL
3. Return: { success: true, urls: [...] }
```

**Image Optimization (jimp):**
```typescript
const image = await Jimp.read(buffer)
await image
  .scaleToFit(1920, 1080)  // Resize maintaining aspect ratio
  .quality(80)              // Compress to 80%
  .getBufferAsync(Jimp.MIME_JPEG)
```

### 4.5 Room Status Management

**Room Statuses (Housekeeping):**
- `Vacant`: Room is empty and clean, ready for booking
- `Vacant Clean`: Room cleaned but not inspected
- `Vacant Clean Inspected`: Room cleaned, inspected, ready
- `Vacant Clean Pick Up`: Room cleaned, awaiting guest arrival
- `Occupied`: Guest currently checked in
- `Dirty`: Room needs cleaning after checkout
- `Out of Order`: Room temporarily unavailable

**Status Update Logic:**
```typescript
// Only Vacant statuses are bookable
const BOOKABLE_STATUSES = [
  'Vacant', 
  'Vacant Clean', 
  'Vacant Clean Inspected', 
  'Vacant Clean Pick Up'
];

function isRoomBookable(room):
  Return room.is_active && BOOKABLE_STATUSES.includes(room.status)
```

---

## 5. Data Model / Database Schema

### Table: `room_types`
```sql
CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,              -- "Deluxe Sea View", "Executive Suite"
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  promo_price DECIMAL(10,2),
  main_image TEXT,                        -- Single image URL
  room_size INTEGER,                      -- Square meters
  bed_type TEXT,                          -- "King bed", "Double bed"
  guests INTEGER DEFAULT 2,
  amenities TEXT[],                       -- ['wifi', 'sea view', 'balcony']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `rooms`
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_type_id INTEGER REFERENCES room_types(id),
  room_type TEXT NOT NULL,                -- Denormalized for performance
  
  -- Pricing (can override room_type base_price)
  price DECIMAL(10,2) NOT NULL,
  promotion_price DECIMAL(10,2),
  currency TEXT DEFAULT 'THB',
  
  -- Room attributes
  room_size INTEGER,
  bed_type TEXT,
  guests INTEGER DEFAULT 2,
  amenities TEXT[],
  
  -- Images
  main_image_url TEXT[],                  -- Single image stored as array
  gallery_images TEXT[],                  -- Multiple gallery images
  
  -- Availability
  status TEXT DEFAULT 'Vacant',           -- Housekeeping status
  is_active BOOLEAN DEFAULT true,         -- Visible for booking?
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_guests CHECK (guests > 0),
  CONSTRAINT valid_price CHECK (price > 0),
  
  -- Indexes
  INDEX idx_room_type ON rooms(room_type_id),
  INDEX idx_active_rooms ON rooms(is_active, status),
  INDEX idx_room_price ON rooms(price)
);
```

### Storage Bucket: `room-images`
```
Public bucket for room images
Naming convention: {roomType}_{timestamp}_{index}.jpg
Example: Deluxe_1703456789_0.jpg
```

---

## 6. Edge Cases / Limitations / TODO

### Edge Cases Handled
1. **Image Optimization**: Large images resized to prevent storage bloat
2. **Gallery Images**: Supports multiple images per room
3. **Promotional Pricing**: Optional promotion_price field
4. **Room Status**: Only bookable statuses allow reservations
5. **Active/Inactive Toggle**: Soft delete via is_active flag
6. **Price Override**: Rooms can have custom prices different from room_type

### Current Limitations
1. **No Image Cropping**: Auto-resize only (no aspect ratio control)
2. **No Image Deletion**: Old images not cleaned up when updated
3. **No Room Number**: No physical room number field (201, 305, etc.)
4. **No Floor/Building**: No hierarchical organization
5. **Single Room Type**: Rooms belong to one room_type only
6. **No Bulk Operations**: Cannot update multiple rooms at once
7. **No Image Versioning**: Cannot revert to previous images
8. **No Room Inventory Limit**: No max rooms per room_type

### TODO / Future Enhancements
- [ ] Add physical room number field (building-floor-number)
- [ ] Implement image cropping/editing before upload
- [ ] Add bulk room creation (create 10 Deluxe rooms at once)
- [ ] Implement image cleanup (delete old images on update/delete)
- [ ] Add room floor plans/layout images
- [ ] Support 360° virtual tour images
- [ ] Implement room cloning (duplicate room with modifications)
- [ ] Add room maintenance schedule tracking
- [ ] Support seasonal pricing (price varies by date range)
- [ ] Implement dynamic pricing (weekday vs weekend)
- [ ] Add room inventory warnings (low availability alerts)
- [ ] Support room packages (room + spa + breakfast)
- [ ] Add room comparison tool (side-by-side features)
- [ ] Implement room upgrade matrix (upgrade paths)
- [ ] Add accessibility features tracking (wheelchair, hearing, etc.)

### Known Issues
- **Image Storage Leak**: Deleted/updated images not removed from storage
- **No Image Validation**: No check for valid image formats or size limits in API
- **Room Type Deletion**: Deleting room_type doesn't cascade to rooms (orphaned rooms)
- **Amenities Inconsistency**: No validation on amenities array format
- **Gallery Image Order**: No explicit ordering for gallery images (uses array order)

