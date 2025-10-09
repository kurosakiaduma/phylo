# Comprehensive Model Enhancements - Implementation Summary

**Date:** October 2, 2025  
**Status:** Database Models & Schemas Complete - API Implementation Pending

---

## Overview

This document summarizes the comprehensive enhancements made to the Phylo data models to support:

1. **Inclusive Demographics** - Expanded gender identity options and comprehensive personal information
2. **Events & Milestones** - Birthday tracking, anniversaries, custom life events
3. **Photo Gallery** - Individual and family photos with event tagging

---

## 1. Enhanced User Model

### New Fields Added

| Field        | Type     | Description                            |
| ------------ | -------- | -------------------------------------- |
| `dob`        | String   | Date of birth (ISO 8601: YYYY-MM-DD)   |
| `gender`     | String   | Open-ended gender identity             |
| `pronouns`   | String   | Preferred pronouns (e.g., "they/them") |
| `bio`        | Text     | Short biography                        |
| `phone`      | String   | Phone number                           |
| `location`   | String   | City, Country or free text             |
| `updated_at` | DateTime | Last update timestamp                  |

### Gender Options Supported

20+ inclusive gender identity options:

- Woman, Man, Non-binary
- Genderqueer, Genderfluid, Agender
- Bigender, Transgender Woman/Man
- Two-Spirit, Intersex
- Gender Non-conforming, Gender Questioning
- Androgyne, Demigirl, Demiboy
- Pangender, Neutrois
- Prefer not to say, Other

Each with associated Tailwind color for visual representation.

### Pronoun Options

18 pronoun options including:

- she/her, he/him, they/them
- she/they, he/they
- ze/hir, ze/zir, xe/xem
- ey/em, fae/faer, per/pers
- ve/ver, ne/nem, co/cos
- it/its, any pronouns, ask me, other

---

## 2. Enhanced Member Model

### New Fields Added

| Field         | Type   | Description                  |
| ------------- | ------ | ---------------------------- |
| `avatar_url`  | String | URL to member's avatar image |
| `dod`         | String | Date of death (ISO 8601)     |
| `pronouns`    | String | Preferred pronouns           |
| `birth_place` | String | Place of birth               |
| `death_place` | String | Place of death               |
| `occupation`  | String | Occupation/profession        |
| `bio`         | Text   | Member biography             |

### Existing Fields (Now Optional/Enhanced)

- `dob` - Now fully optional
- `gender` - Now open-ended (was limited)
- `notes` - Clarified as "private custodian notes"

---

## 3. New Event Model

Track life milestones and family celebrations.

### Schema

```python
class Event(Base):
    id: UUID
    tree_id: UUID (FK)

    # Event Details
    title: String
    description: Text
    event_type: String  # See Event Types below
    event_date: String (ISO 8601)
    end_date: String (optional, for multi-day events)
    location: String

    # Associations
    member_ids: JSON (array of UUIDs)
    is_recurring: Boolean
    recurrence_rule: String  # 'yearly', 'monthly', etc.

    # Privacy
    is_public: Boolean
    created_by: UUID (FK users)

    # Timestamps
    created_at: DateTime
    updated_at: DateTime
```

### Event Types Supported

18 pre-defined event types:

- **Life Events:** birthday, birth, death
- **Relationships:** wedding, engagement, anniversary
- **Religious:** baptism, bar-mitzvah, bat-mitzvah, confirmation
- **Milestones:** graduation, retirement, achievement
- **Location:** immigration, relocation
- **Other:** military-service, reunion, custom

Each event type has an associated emoji icon for visual appeal.

### Automatic Birthday Events

When a member has a `dob`, the system can automatically generate recurring birthday events.

---

## 4. New Photo/Gallery Model

Support for individual and family photo galleries.

### Schema

```python
class Photo(Base):
    id: UUID
    tree_id: UUID (FK)

    # Photo Details
    title: String
    description: Text
    photo_url: String
    thumbnail_url: String
    taken_date: String (ISO 8601)
    location: String

    # Associations
    member_ids: JSON (array of UUIDs) # Tagged members
    event_id: UUID (FK events, optional)
    is_family_photo: Boolean

    # Privacy
    is_public: Boolean
    uploaded_by: UUID (FK users)

    # Timestamps
    created_at: DateTime
    updated_at: DateTime
```

### Gallery Features

1. **Individual Photos:**
   - Tag specific members
   - Filter gallery by member
   - View all photos of a person

2. **Family Photos:**
   - Mark photos as family group photos
   - Tag multiple members
   - Associate with events (e.g., "Family Reunion 2025")

3. **Event Photos:**
   - Link photos to specific events
   - Auto-suggest members from event attendees
   - Gallery view by event type

4. **Privacy Controls:**
   - Public/private toggle per photo
   - Only tree members can view private photos
   - Uploader attribution

---

## 5. Database Migration

### Migration File

**File:** `20251002_095000_enhance_models_demographics_events_gallery.py`

**Actions:**

1. Add 7 new columns to `users` table
2. Add 7 new columns to `members` table
3. Create `events` table with 2 indexes
4. Create `photos` table with 2 indexes

**To Apply:**

```bash
cd apps/backend
alembic upgrade head
```

**To Rollback:**

```bash
alembic downgrade -1
```

---

## 6. Pydantic Schemas

### Updated Schemas

- `UserBase`, `UserCreate`, `UserUpdate`, `UserRead` - Added 7 demographic fields
- `MemberBase`, `MemberCreate`, `MemberUpdate`, `MemberRead` - Added 8 profile fields

### New Schemas

- `EventBase`, `EventCreate`, `EventUpdate`, `EventRead`
- `PhotoBase`, `PhotoCreate`, `PhotoUpdate`, `PhotoRead`

All schemas support Pydantic v2 with `model_config` and v1 with `Config.orm_mode`.

---

## 7. Configuration Files

### Backend: `utils/gender_config.py`

Python configuration with:

- `GENDER_OPTIONS` - List of 20 gender identity options
- `PRONOUN_OPTIONS` - List of 18 pronoun options
- `EVENT_TYPES` - List of 18 event types
- Helper functions: `get_gender_color()`, `get_gender_label()`

### Frontend: `src/lib/gender-config.ts`

TypeScript configuration with:

- `GENDER_OPTIONS` - Typed gender identity options
- `PRONOUN_OPTIONS` - Pronoun strings
- `EVENT_TYPES` - Event types with emoji icons
- Helper functions with Tailwind class generation

### Tailwind Safelist

Added comprehensive safelist for gender colors:

- Background: `bg-{color}-100`, `bg-{color}-900`
- Text: `text-{color}-300`, `text-{color}-700`
- Border: `border-{color}-300`, `border-{color}-700`

Covers 20 colors with light/dark mode variants.

---

## 8. Next Steps - API Implementation

### Phase 1: Events API (Priority: High)

Create `apps/backend/api/events.py`:

- [ ] `GET /api/trees/{id}/events` - List events with filters
  - Query params: `event_type`, `member_id`, `start_date`, `end_date`
  - Pagination support
- [ ] `POST /api/trees/{id}/events` - Create event
  - Auto-create recurring birthday events from member DOB
  - Validate member_ids belong to tree
- [ ] `GET /api/events/{id}` - Get event details
- [ ] `PATCH /api/events/{id}` - Update event (custodian/contributor)
- [ ] `DELETE /api/events/{id}` - Delete event (custodian only)
- [ ] `GET /api/events/{id}/photos` - Get photos for event
- [ ] `GET /api/members/{id}/events` - Get member's events

**Special Features:**

- Auto-generate birthday events when member DOB is set
- Calendar view data endpoint (monthly/yearly aggregation)
- Recurring event handling

### Phase 2: Gallery API (Priority: High)

Create `apps/backend/api/gallery.py`:

- [ ] `GET /api/trees/{id}/photos` - List photos with filters
  - Query params: `member_id`, `event_id`, `is_family_photo`, `start_date`, `end_date`
  - Pagination support
- [ ] `POST /api/trees/{id}/photos` - Upload photo
  - Image processing (resize, thumbnail generation)
  - Store in `/uploads/photos/`
  - Support multiple file upload
- [ ] `GET /api/photos/{id}` - Get photo details
- [ ] `PATCH /api/photos/{id}` - Update photo metadata
- [ ] `DELETE /api/photos/{id}` - Delete photo
- [ ] `GET /api/members/{id}/photos` - Get member's photos
- [ ] `POST /api/photos/{id}/tags` - Tag members in photo
- [ ] `DELETE /api/photos/{id}/tags/{member_id}` - Untag member

**Image Processing:**

- Original: Store full quality
- Thumbnail: 300x300px for galleries
- Preview: 800x800px for lightbox
- Format: WebP for modern browsers, fallback to JPEG

### Phase 3: Enhanced Profile API (Priority: Medium)

Update existing APIs:

- [ ] Update `PATCH /api/users/me` to support new fields
- [ ] Update `PATCH /api/members/{id}` to support new fields
- [ ] Add validation for date formats (ISO 8601)
- [ ] Add validation for gender/pronoun values (soft validation, allow custom)

### Phase 4: Frontend Components (Priority: High)

#### Events Components

- [ ] `EventCalendar.tsx` - Monthly calendar view
- [ ] `EventList.tsx` - List view with filters
- [ ] `EventCard.tsx` - Event summary card
- [ ] `EventForm.tsx` - Create/edit event form
- [ ] `EventDetails.tsx` - Event details modal

#### Gallery Components

- [ ] `PhotoGallery.tsx` - Grid view with lightbox
- [ ] `PhotoUpload.tsx` - Multi-file upload with preview
- [ ] `PhotoCard.tsx` - Photo thumbnail with metadata
- [ ] `PhotoDetails.tsx` - Full photo view with tagging
- [ ] `MemberPhotoGallery.tsx` - Photos for specific member

#### Profile Components

- [ ] `GenderSelect.tsx` - Dropdown with color indicators
- [ ] `PronounSelect.tsx` - Dropdown or custom input
- [ ] `ProfileForm.tsx` - Enhanced profile editor
- [ ] `MemberProfile.tsx` - Comprehensive member view

### Phase 5: UI/UX Enhancements (Priority: Medium)

- [ ] Timeline view for events (chronological)
- [ ] Photo tagging interface (click to tag faces)
- [ ] Event reminders/notifications
- [ ] Birthday countdown badges
- [ ] Anniversary celebration indicators
- [ ] Photo slideshow mode
- [ ] Export gallery to PDF/album

---

## 9. Data Model Diagram

```
┌─────────────┐
│    User     │
├─────────────┤
│ id (PK)     │
│ email       │
│ display_name│
│ avatar_url  │
│ dob         │◄─────────┐
│ gender      │          │
│ pronouns    │          │
│ bio         │          │
│ phone       │          │
│ location    │          │
└──────┬──────┘          │
       │                 │
       │ created_by      │
       │                 │
┌──────▼──────┐          │
│    Event    │          │
├─────────────┤          │
│ id (PK)     │          │
│ tree_id (FK)│          │
│ title       │          │
│ event_type  │          │
│ event_date  │          │
│ member_ids  │◄─────────┼────┐
│ is_recurring│          │    │
│ created_by  │──────────┘    │
└─────────────┘               │
                              │
┌─────────────┐               │
│   Member    │───────────────┘
├─────────────┤
│ id (PK)     │
│ tree_id (FK)│
│ name        │
│ avatar_url  │
│ dob         │
│ dod         │
│ gender      │
│ pronouns    │
│ bio         │
│ occupation  │
└──────┬──────┘
       │
       │ tagged_in
       │
┌──────▼──────┐
│    Photo    │
├─────────────┤
│ id (PK)     │
│ tree_id (FK)│
│ photo_url   │
│ member_ids  │
│ event_id    │
│ is_family   │
│ uploaded_by │
└─────────────┘
```

---

## 10. Testing Checklist

### Unit Tests

- [ ] Test gender configuration helpers
- [ ] Test event model with recurring rules
- [ ] Test photo model with member tagging
- [ ] Test user/member schema validation

### Integration Tests

- [ ] Test event CRUD operations
- [ ] Test photo upload and processing
- [ ] Test event filtering and pagination
- [ ] Test photo gallery filtering
- [ ] Test member profile with new fields

### E2E Tests

- [ ] Create event and verify in calendar
- [ ] Upload photo and tag members
- [ ] View member profile with timeline
- [ ] Filter gallery by event/member
- [ ] Test privacy controls on photos/events

---

## 11. Performance Considerations

### Database Indexes

Already created in migration:

- `events`: `(tree_id, event_date)`, `(tree_id, event_type)`
- `photos`: `(tree_id, taken_date)`, `(tree_id, is_family_photo)`

### Additional Optimization

- [ ] Add index on `events.is_recurring` for birthday queries
- [ ] Add index on `photos.event_id` for event gallery
- [ ] Consider caching for frequently accessed galleries
- [ ] Implement pagination for large photo galleries

### Image Storage

- Store originals in cloud storage (S3, Cloudflare R2)
- Generate thumbnails on upload
- Use CDN for fast delivery
- Lazy load images in galleries

---

## 12. Security Considerations

### Photo Privacy

- Respect tree membership for photo visibility
- `is_public` flag for family-controlled access
- Only tree members can upload photos
- Custodians can delete any photo
- Contributors/uploaders can delete their own

### Event Privacy

- Similar privacy model to photos
- Private events only visible to tree members
- Birthday events auto-created as public

### Profile Privacy

- Users control their own demographic data
- Members can have public bios
- Notes field is custodian-only

---

## 13. Accessibility

### Gender Inclusivity

- Open-ended gender field (not limited dropdown)
- Custom pronoun input supported
- "Prefer not to say" option respected
- No assumptions based on gender
- Color coding is supplementary, not primary indicator

### Event Accessibility

- Icon + text for event types
- Clear date formatting
- ARIA labels for calendar navigation
- Keyboard navigation for gallery

### Photo Accessibility

- Alt text support (description field)
- High contrast mode compatible
- Screen reader friendly tagging interface

---

## 14. Migration Guide

### For Existing Users

1. **No data loss** - All existing fields preserved
2. **Optional fields** - New fields are nullable
3. **Gradual adoption** - Users can update profiles over time

### For Existing Members

1. **Gender field** - Existing values preserved
2. **New fields** - Available for custodians to fill
3. **Avatars** - Can be added gradually

### Birthday Migration

Optional script to generate birthday events for existing members with DOB:

```python
# In migrations or admin script
for member in Member.query.filter(Member.dob.isnot(None)):
    Event.create(
        tree_id=member.tree_id,
        title=f"{member.name}'s Birthday",
        event_type="birthday",
        event_date=member.dob,
        member_ids=[str(member.id)],
        is_recurring=True,
        recurrence_rule="yearly",
        created_by=member.updated_by,
    )
```

---

## 15. Success Metrics

### Adoption Metrics

- % of users who add demographic info
- % of members with avatars
- Number of events created per tree
- Number of photos uploaded per tree

### Engagement Metrics

- Calendar page views
- Gallery page views
- Event creation frequency
- Photo upload frequency
- Member profile completion rate

### Quality Metrics

- Photo tagging accuracy
- Event data completeness
- Gender option diversity usage
- Pronoun option diversity usage

---

## 16. Future Enhancements

### Phase 6+

- [ ] Face recognition for auto-tagging photos
- [ ] AI-generated event suggestions from photos
- [ ] Collaborative photo albums
- [ ] Event RSVP system
- [ ] Birthday/anniversary reminders via email
- [ ] Photo stories/timelines
- [ ] Video support in gallery
- [ ] Audio recordings (oral histories)
- [ ] Document attachments per member
- [ ] Timeline visualization of life events
- [ ] Family tree print layouts with photos

---

## Summary

This comprehensive enhancement brings Phylo from a basic genealogy tool to a rich family history platform that:

✅ **Respects Identity** - Inclusive gender options, custom pronouns  
✅ **Celebrates Life** - Events, milestones, birthdays, anniversaries  
✅ **Preserves Memories** - Photos, stories, timelines  
✅ **Connects Family** - Tagged photos, shared events, collaborative history  
✅ **Honors Privacy** - Granular privacy controls, respectful data handling

**Status:** Models & schemas complete. Ready for API and frontend implementation.

**Estimated Timeline:**

- Phase 1 (Events API): 3-5 days
- Phase 2 (Gallery API): 5-7 days
- Phase 3 (Enhanced Profiles): 2-3 days
- Phase 4 (Frontend Components): 7-10 days
- Phase 5 (UI Polish): 3-5 days

**Total: 3-4 weeks for full implementation**
