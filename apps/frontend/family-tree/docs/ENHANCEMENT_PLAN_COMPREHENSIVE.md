# Phylo Enhancement Plan - User Demographics, Gender Inclusivity, Events & Gallery

**Date:** October 2, 2025  
**Status:** Planning & Implementation

## Current Issues

1. ❌ **Invalid token errors** - Authentication flow needs fixing
2. ❌ **Missing user role context** - User object doesn't include tree roles
3. ❌ **Limited demographics** - No DOB, phone, location for users
4. ❌ **Binary gender only** - Need inclusive gender spectrum options
5. ❌ **No events system** - Birthdays, anniversaries, milestones
6. ❌ **No gallery system** - Photo management and tagging

---

## Phase 1: Enhanced User Model & Demographics

### 1.1 User Model Updates

**Add to `User` table:**

```python
class User(Base):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String)
    avatar_url = Column(String, nullable=True)

    # New demographic fields
    dob = Column(String, nullable=True)  # ISO 8601 date
    gender = Column(String, nullable=True)  # Inclusive options
    pronouns = Column(String, nullable=True)  # Preferred pronouns
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)  # City, Country
    bio = Column(Text, nullable=True)  # Personal bio

    # Privacy settings
    privacy_settings = Column(JSON, nullable=True)  # {"show_dob": true, "show_email": false}

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### 1.2 Gender Inclusivity

**Supported Gender Options:**

- Male
- Female
- Non-binary
- Genderqueer
- Genderfluid
- Agender
- Bigender
- Two-Spirit
- Transgender Male
- Transgender Female
- Prefer not to say
- Custom (user-specified)

**Pronoun Options:**

- he/him
- she/her
- they/them
- ze/zir
- xe/xem
- Custom

**Color Coding System:**

```typescript
// Tailwind config extension
const genderColors = {
  male: 'blue',
  female: 'pink',
  nonbinary: 'purple',
  genderqueer: 'gradient-purple-green',
  genderfluid: 'gradient-multi',
  agender: 'gray',
  transgender: 'blue-pink-white', // Trans flag colors
  custom: 'teal',
  unspecified: 'slate',
}
```

### 1.3 Member Model Updates

**Align Member model with User enhancements:**

```python
class Member(Base):
    __tablename__ = 'members'
    # Existing fields...

    # Enhanced demographics
    dob = Column(String)  # Already exists
    dod = Column(String, nullable=True)  # Date of death
    gender = Column(String, nullable=True)  # Inclusive options
    pronouns = Column(String, nullable=True)

    # Additional info
    birthplace = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    maiden_name = Column(String, nullable=True)

    # Links to user account (if member has joined)
    linked_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=True)
```

---

## Phase 2: Events & Milestones System

### 2.1 Events Table

```python
class Event(Base):
    __tablename__ = 'events'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), nullable=False, index=True)

    # Event details
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String, nullable=False)  # birthday, anniversary, milestone, custom
    event_date = Column(String, nullable=False)  # ISO 8601 date
    end_date = Column(String, nullable=True)  # For multi-day events

    # Location
    location = Column(String, nullable=True)

    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String, nullable=True)  # yearly, monthly, etc.

    # Visibility
    is_private = Column(Boolean, default=False)

    # Metadata
    created_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### 2.2 Event Participants Table

```python
class EventParticipant(Base):
    __tablename__ = 'event_participants'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(UUID(as_uuid=True), ForeignKey('events.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False)
    role = Column(String, nullable=True)  # celebrant, attendee, organizer

    __table_args__ = (
        Index('ix_event_participants_event_member', 'event_id', 'member_id', unique=True),
    )
```

### 2.3 Event Types

**Predefined Types:**

- `birthday` - Auto-generated from DOB
- `anniversary` - Marriage, relationship milestones
- `death` - Memorial dates
- `birth` - Birth announcements
- `graduation` - Educational milestones
- `career` - Job milestones, retirement
- `reunion` - Family gatherings
- `custom` - User-defined events

### 2.4 UI Components

**Calendar View:**

- Monthly calendar with event markers
- Click date to see events
- Color-coded by event type
- Quick add event button

**Timeline View:**

- Chronological list of events
- Filter by member, event type, date range
- Infinite scroll for large event lists

**Member Profile Events:**

- "Life Events" section on member drawer
- Automatic birthday display
- Milestone badges (age milestones: 18, 21, 50, etc.)

---

## Phase 3: Gallery & Photo Management

### 3.1 Photos Table

```python
class Photo(Base):
    __tablename__ = 'photos'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tree_id = Column(UUID(as_uuid=True), ForeignKey('trees.id'), nullable=False, index=True)

    # File info
    filename = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    file_size = Column(Integer)  # bytes
    mime_type = Column(String)

    # Photo details
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    photo_date = Column(String, nullable=True)  # When photo was taken
    location = Column(String, nullable=True)

    # Categorization
    is_family_photo = Column(Boolean, default=False)
    is_profile_photo = Column(Boolean, default=False)

    # Event association
    event_id = Column(UUID(as_uuid=True), ForeignKey('events.id'), nullable=True)

    # Metadata
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

### 3.2 Photo Tags (People in Photo)

```python
class PhotoTag(Base):
    __tablename__ = 'photo_tags'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    photo_id = Column(UUID(as_uuid=True), ForeignKey('photos.id'), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey('members.id'), nullable=False)

    # Tag position (for face tagging feature)
    tag_x = Column(Integer, nullable=True)  # x coordinate
    tag_y = Column(Integer, nullable=True)  # y coordinate
    tag_width = Column(Integer, nullable=True)
    tag_height = Column(Integer, nullable=True)

    tagged_by = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('ix_photo_tags_photo_member', 'photo_id', 'member_id'),
    )
```

### 3.3 Gallery Features

**Main Gallery View:**

- Grid layout with thumbnails
- Filters:
  - All photos
  - Individual member photos
  - Family photos
  - By event
  - By date range
- Search by description, tags
- Bulk upload support

**Photo Detail View:**

- Full-size lightbox viewer
- Previous/Next navigation
- Tagged members (clickable to member profile)
- Associated event
- Download option
- Edit/delete (custodians only)

**Member Profile Gallery:**

- Photos featuring this member
- Chronological order
- Set as profile photo option

---

## Phase 4: Database Migrations

### Migration 1: User Enhancements

```sql
ALTER TABLE users ADD COLUMN dob VARCHAR;
ALTER TABLE users ADD COLUMN gender VARCHAR;
ALTER TABLE users ADD COLUMN pronouns VARCHAR;
ALTER TABLE users ADD COLUMN phone VARCHAR;
ALTER TABLE users ADD COLUMN location VARCHAR;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN privacy_settings JSON;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
```

### Migration 2: Member Enhancements

```sql
ALTER TABLE members ADD COLUMN dod VARCHAR;
ALTER TABLE members ADD COLUMN pronouns VARCHAR;
ALTER TABLE members ADD COLUMN birthplace VARCHAR;
ALTER TABLE members ADD COLUMN occupation VARCHAR;
ALTER TABLE members ADD COLUMN maiden_name VARCHAR;
ALTER TABLE members ADD COLUMN linked_user_id UUID REFERENCES users(id);
```

### Migration 3: Events System

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    tree_id UUID NOT NULL REFERENCES trees(id),
    title VARCHAR NOT NULL,
    description TEXT,
    event_type VARCHAR NOT NULL,
    event_date VARCHAR NOT NULL,
    end_date VARCHAR,
    location VARCHAR,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR,
    is_private BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_events_tree_id ON events(tree_id);
CREATE INDEX ix_events_event_date ON events(event_date);

CREATE TABLE event_participants (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    role VARCHAR,
    UNIQUE(event_id, member_id)
);
```

### Migration 4: Gallery System

```sql
CREATE TABLE photos (
    id UUID PRIMARY KEY,
    tree_id UUID NOT NULL REFERENCES trees(id),
    filename VARCHAR NOT NULL,
    file_url VARCHAR NOT NULL,
    thumbnail_url VARCHAR,
    file_size INTEGER,
    mime_type VARCHAR,
    title VARCHAR,
    description TEXT,
    photo_date VARCHAR,
    location VARCHAR,
    is_family_photo BOOLEAN DEFAULT FALSE,
    is_profile_photo BOOLEAN DEFAULT FALSE,
    event_id UUID REFERENCES events(id),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_photos_tree_id ON photos(tree_id);
CREATE INDEX ix_photos_event_id ON photos(event_id);

CREATE TABLE photo_tags (
    id UUID PRIMARY KEY,
    photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    tag_x INTEGER,
    tag_y INTEGER,
    tag_width INTEGER,
    tag_height INTEGER,
    tagged_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ix_photo_tags_photo_member ON photo_tags(photo_id, member_id);
```

---

## Phase 5: API Endpoints

### User Profile Endpoints

- `PATCH /api/users/me` - Update demographics, pronouns, gender
- `PATCH /api/users/me/privacy` - Update privacy settings
- `GET /api/users/me/events` - Get user's upcoming events

### Events Endpoints

- `GET /api/trees/{id}/events` - List tree events (paginated, filtered)
- `POST /api/trees/{id}/events` - Create event
- `GET /api/events/{id}` - Event details
- `PATCH /api/events/{id}` - Update event (creator only)
- `DELETE /api/events/{id}` - Delete event (creator/custodian only)
- `POST /api/events/{id}/participants` - Add participant
- `GET /api/members/{id}/events` - Member's life events

### Gallery Endpoints

- `GET /api/trees/{id}/photos` - List photos (paginated, filtered)
- `POST /api/trees/{id}/photos` - Upload photo
- `GET /api/photos/{id}` - Photo details
- `PATCH /api/photos/{id}` - Update photo metadata
- `DELETE /api/photos/{id}` - Delete photo (uploader/custodian only)
- `POST /api/photos/{id}/tags` - Tag member in photo
- `DELETE /api/photos/{id}/tags/{memberId}` - Remove tag
- `GET /api/members/{id}/photos` - Member's photos

---

## Phase 6: Frontend UI Components

### Gender-Inclusive UI Elements

**Gender Select Component:**

```tsx
<Select>
  <option value="male">Male</option>
  <option value="female">Female</option>
  <option value="nonbinary">Non-binary</option>
  <option value="genderqueer">Genderqueer</option>
  <option value="genderfluid">Genderfluid</option>
  <option value="agender">Agender</option>
  <option value="bigender">Bigender</option>
  <option value="twospirit">Two-Spirit</option>
  <option value="trans_male">Transgender Male</option>
  <option value="trans_female">Transgender Female</option>
  <option value="prefer_not_to_say">Prefer not to say</option>
  <option value="custom">Custom (specify)</option>
</Select>
```

**Pronoun Select:**

```tsx
<Select>
  <option value="he/him">he/him</option>
  <option value="she/her">she/her</option>
  <option value="they/them">they/them</option>
  <option value="ze/zir">ze/zir</option>
  <option value="xe/xem">xe/xem</option>
  <option value="custom">Custom</option>
</Select>
```

### Calendar Component

- Monthly/weekly/daily views
- Event markers with color coding
- Drag-and-drop to reschedule
- Quick event creation

### Photo Gallery Component

- Masonry grid layout
- Lightbox viewer
- Face tagging interface
- Batch upload with progress

---

## Phase 7: Tailwind Color System for Gender Inclusivity

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        gender: {
          male: '#3B82F6', // blue-500
          female: '#EC4899', // pink-500
          nonbinary: '#A855F7', // purple-500
          genderqueer: '#10B981', // emerald-500
          genderfluid: '#F59E0B', // amber-500
          agender: '#6B7280', // gray-500
          trans: {
            light: '#55CDFC', // Trans flag light blue
            pink: '#F7A8B8', // Trans flag pink
            white: '#FFFFFF', // Trans flag white
          },
          custom: '#14B8A6', // teal-500
          unspecified: '#64748B', // slate-500
        },
      },
      backgroundImage: {
        'gradient-genderfluid':
          'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #3B82F6 100%)',
        'gradient-genderqueer':
          'linear-gradient(135deg, #A855F7 0%, #10B981 100%)',
        'gradient-trans':
          'linear-gradient(180deg, #55CDFC 0%, #F7A8B8 33%, #FFFFFF 50%, #F7A8B8 66%, #55CDFC 100%)',
      },
    },
  },
}
```

---

## Implementation Priority

### Immediate (This Week):

1. ✅ Fix authentication token issues
2. ✅ Add user role context to auth
3. 🔄 Database migrations for user/member enhancements
4. 🔄 Update User/Member models
5. 🔄 Gender-inclusive UI components

### Short-term (Next 2 Weeks):

1. Events system backend (models, API)
2. Events UI (calendar, timeline)
3. Photo gallery backend (upload, storage)
4. Gallery UI (grid, lightbox)

### Medium-term (Next Month):

1. Face tagging in photos
2. Event reminders/notifications
3. Privacy controls
4. Photo albums
5. Advanced event search/filter

---

## Success Metrics

- [ ] All gender identities supported
- [ ] Pronouns displayed throughout UI
- [ ] Birthday events auto-generated
- [ ] Photo tagging functional
- [ ] Gallery filtering works
- [ ] Calendar views implemented
- [ ] Mobile responsive gallery
- [ ] Accessibility compliant (WCAG AA)

---

**Status:** Ready for implementation  
**Next Step:** Fix authentication, then proceed with migrations
