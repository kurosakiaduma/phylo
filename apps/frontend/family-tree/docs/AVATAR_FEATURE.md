# Avatar Upload Feature Documentation

## Overview

The avatar upload feature allows users to upload, crop, and manage their profile pictures. Images are automatically resized, cropped to square format, and optimized for display across the application.

## Backend Implementation

### Database Changes

**Migration**: `20251002_084218_add_user_avatar_url.py`

Added `avatar_url` column to the `users` table:

```python
avatar_url = Column(String, nullable=True)
```

### API Endpoints

**Base URL**: `/api/users`

#### 1. Get Current User Profile

```http
GET /api/users/me
Authorization: Session cookie required
```

**Response**:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "John Doe",
  "avatar_url": "/uploads/avatars/filename.jpg",
  "created_at": "2025-10-02T08:42:18Z"
}
```

#### 2. Update User Profile

```http
PATCH /api/users/me
Authorization: Session cookie required
Content-Type: application/json
```

**Request Body**:

```json
{
  "display_name": "New Name",
  "avatar_url": "/uploads/avatars/new-file.jpg"
}
```

#### 3. Upload Avatar

```http
POST /api/users/me/avatar
Authorization: Session cookie required
Content-Type: multipart/form-data
```

**Request**: FormData with `file` field containing image

- **Allowed formats**: JPG, JPEG, PNG, GIF, WEBP
- **Max size**: 5MB
- **Processing**: Automatically cropped to square and resized to 400x400px

**Response**:

```json
{
  "status": "ok",
  "message": "Avatar uploaded successfully",
  "avatar_url": "/uploads/avatars/uuid_filename.jpg"
}
```

**Error Responses**:

- `400`: Invalid file type or size
- `500`: Server error during upload

#### 4. Delete Avatar

```http
DELETE /api/users/me/avatar
Authorization: Session cookie required
```

**Response**:

```json
{
  "status": "ok",
  "message": "Avatar deleted successfully"
}
```

### Image Processing

The backend uses **Pillow (PIL)** for image processing:

1. **Validation**: Checks file type and size
2. **Format Conversion**: Converts all images to RGB/RGBA
3. **Center Crop**: Crops to center square based on minimum dimension
4. **Resize**: Resizes to 400x400px using high-quality LANCZOS resampling
5. **Optimization**: Saves with 85% quality and optimization enabled
6. **Cleanup**: Automatically deletes old avatar when uploading new one

**Storage Location**: `./uploads/avatars/` (configurable via `UPLOAD_DIR` env var)

**Filename Format**: `{user_id}_{uuid}{extension}`

### Static File Serving

Avatars are served via FastAPI's StaticFiles:

```python
app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")
```

**Access URL**: `http://api-domain/uploads/avatars/filename.jpg`

## Frontend Implementation

### Components

#### 1. AvatarUpload Component

**Location**: `src/components/avatar-upload.tsx`

**Features**:

- Image selection via file input
- Real-time cropping with zoom controls
- Circular crop preview
- Upload progress indication
- Delete avatar functionality
- Client-side validation

**Usage**:

```tsx
<AvatarUpload
  currentAvatarUrl={user.avatar_url}
  userInitials="JD"
  onAvatarChange={(url) => console.log('New avatar:', url)}
/>
```

**Dependencies**:

- `react-easy-crop`: Advanced image cropping
- `@radix-ui` components: Dialog, Avatar, Button
- `lucide-react`: Icons

#### 2. Settings Page

**Location**: `src/app/(dashboard)/settings/page.tsx`

Integrates the avatar upload component with profile management:

- Display current avatar
- Update display name
- View account information
- Manage avatar (upload/delete)

### Image Cropping Flow

1. User selects image file
2. Client validates file type and size (< 5MB)
3. Image loaded into cropper component
4. User adjusts position and zoom
5. On submit, crop area extracted from original image
6. Cropped image converted to JPEG blob
7. Blob uploaded to backend via FormData
8. Backend processes and saves image
9. Frontend updates user state with new avatar URL

### Type Updates

**User Interface** (`src/lib/auth-api.ts`):

```typescript
export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null // Added
  created_at: string
}
```

### Avatar Display

Avatars are displayed throughout the app using the Avatar component:

```tsx
<Avatar className="h-10 w-10">
  <AvatarImage
    src={
      user?.avatar_url
        ? `${process.env.NEXT_PUBLIC_API_URL}${user.avatar_url}`
        : undefined
    }
    alt={user?.display_name || user?.email}
  />
  <AvatarFallback className="bg-primary/10">
    {getInitials(user?.display_name, user?.email)}
  </AvatarFallback>
</Avatar>
```

**Fallback**: If no avatar is set, displays user initials based on display name or email

## Configuration

### Environment Variables

**Backend** (`.env`):

```bash
UPLOAD_DIR=./uploads  # Avatar storage directory (default: ./uploads)
```

**Frontend** (`.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000  # Backend API URL
```

### Security Considerations

1. **File Validation**: Type and size checked both client and server side
2. **Authentication Required**: All endpoints require authenticated session
3. **User Isolation**: Users can only manage their own avatars
4. **Unique Filenames**: UUID-based naming prevents conflicts
5. **Old File Cleanup**: Previous avatars automatically deleted

### Storage Considerations

1. **File Size**: Max 5MB per upload
2. **Processed Size**: ~50-200KB after optimization (400x400 JPEG)
3. **Storage Location**: Local filesystem (consider S3/CDN for production)
4. **Cleanup Strategy**: Old avatars deleted on new upload or manual delete

## Database Migration

To apply the avatar_url migration:

```bash
cd apps/backend

# Review migration
alembic history

# Update down_revision in migration file to your latest revision

# Run migration
alembic upgrade head

# Verify
alembic current
```

## Testing

### Manual Testing

1. **Upload Flow**:

   - Navigate to Settings page
   - Click "Change Avatar"
   - Select image file
   - Adjust crop/zoom
   - Click "Upload"
   - Verify avatar appears in header

2. **Delete Flow**:

   - Click "Remove Avatar"
   - Verify fallback initials appear
   - Check file deleted from uploads directory

3. **Error Cases**:
   - Try uploading file > 5MB
   - Try uploading non-image file
   - Try without authentication

### API Testing with curl

```bash
# Upload avatar
curl -X POST http://localhost:8000/api/users/me/avatar \
  -H "Cookie: session=your-session-cookie" \
  -F "file=@/path/to/image.jpg"

# Get user profile
curl http://localhost:8000/api/users/me \
  -H "Cookie: session=your-session-cookie"

# Delete avatar
curl -X DELETE http://localhost:8000/api/users/me/avatar \
  -H "Cookie: session=your-session-cookie"
```

## Future Enhancements

1. **Cloud Storage**: Migrate to S3/CloudFlare R2 for better scalability
2. **CDN Integration**: Serve images through CDN for faster loading
3. **Image Formats**: Support WebP for better compression
4. **Multiple Sizes**: Generate thumbnails for different use cases
5. **Moderation**: Add content moderation for inappropriate images
6. **Cropping Presets**: Add preset aspect ratios (square, circle, etc.)
7. **Upload Progress**: Show detailed upload progress
8. **Drag & Drop**: Allow drag-and-drop file upload
9. **Camera Integration**: Allow direct photo capture on mobile devices
10. **AI Enhancements**: Auto background removal, smart crop suggestions

## Troubleshooting

### Avatar not appearing

- Check `NEXT_PUBLIC_API_URL` is set correctly
- Verify backend static files mount is working
- Check browser console for 404 errors
- Ensure uploads directory has proper permissions

### Upload failing

- Check Pillow is installed: `pip install Pillow`
- Verify UPLOAD_DIR exists and is writable
- Check file size limits in nginx/reverse proxy
- Review backend logs for errors

### Type errors

- Ensure `avatar_url` is added to User interface
- Run `npm run build` to check for type errors
- Update getInitials to accept `string | null`

## Related Files

**Backend**:

- `apps/backend/models/__init__.py` - User model
- `apps/backend/schemas/__init__.py` - User schemas
- `apps/backend/api/users.py` - User endpoints
- `apps/backend/api/main.py` - Router registration
- `apps/backend/requirements.txt` - Pillow dependency
- `apps/backend/migrations/versions/20251002_084218_add_user_avatar_url.py` - Migration

**Frontend**:

- `apps/frontend/family-tree/src/components/avatar-upload.tsx` - Upload component
- `apps/frontend/family-tree/src/app/(dashboard)/settings/page.tsx` - Settings page
- `apps/frontend/family-tree/src/components/dashboard-layout.tsx` - Avatar display
- `apps/frontend/family-tree/src/lib/auth-api.ts` - User type
- `apps/frontend/family-tree/package.json` - react-easy-crop dependency
