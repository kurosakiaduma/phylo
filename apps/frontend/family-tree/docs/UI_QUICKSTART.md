# UI Quick Start Guide

## Running the Application

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000`
- Database set up and migrated

### Start the Frontend

```bash
cd apps/frontend/family-tree
npm run dev
```

The application will be available at `http://localhost:3000`

### Default Flow

1. **Landing Page** (`/`)

   - Shows marketing content
   - Login/Register buttons
   - Auto-redirects to `/trees` if authenticated

2. **Onboarding** (`/onboarding`)

   - Welcome message for new users
   - Quick feature overview
   - Continue to dashboard

3. **Trees Dashboard** (`/trees`)

   - Main hub after login
   - Shows "Get Started" modal for new users
   - Lists all trees with roles
   - Click card to view tree details
   - "Create New Tree" button

4. **Create Tree Wizard** (`/trees/new`)

   - Step 1: Name and description
   - Step 2: Inclusive settings
   - Creates tree and redirects to detail view

5. **Tree Detail** (`/trees/{id}`)
   - Tree visualization canvas (placeholder)
   - Members tab
   - Information tab
   - Action buttons based on role

## Features by Role

### Custodian (👑)

- Create trees
- Add/edit/delete members
- Manage tree settings
- Invite users
- Change member roles
- Full access to all features

### Contributor (✓)

- Add members
- Edit member information
- Add relationships
- View all tree data
- Cannot change settings or roles

### Viewer (👁️)

- View tree visualization
- View member information
- View relationships
- Read-only access

## Navigation Structure

```
Dashboard Layout (sidebar + canvas)
├── Trees
│   ├── List all trees
│   ├── Create new tree
│   └── View tree detail
│       ├── Visualization tab
│       ├── Members tab
│       └── Information tab
├── Members (coming soon)
├── Gallery (coming soon)
├── Events (coming soon)
└── Settings (coming soon)
```

## UI Components Used

### From shadcn/ui

- Button
- Card
- Badge
- Dialog
- Dropdown Menu
- Avatar
- Input
- Label
- Textarea
- Switch
- Tabs
- Separator
- Toast

### Custom Components

- DashboardLayout
- ThemeToggle
- AuthProvider
- Protected routes

## Styling

### Theme Support

- Light mode (default)
- Dark mode
- System preference detection
- Persistent selection

### Color Palette

- Primary: Green to Blue gradient
- Success: Green
- Destructive: Red
- Muted: Gray tones
- Background: Dynamic based on theme

### Typography

- Font: Inter (Google Fonts)
- Headings: Bold, tracking-tight
- Body: Regular, line-height optimized
- Code: Monospace

## API Integration

All API calls use:

```typescript
const token = localStorage.getItem('token')
const response = await fetch('http://localhost:8000/api/...', {
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})
```

### Endpoints Currently Used

- `GET /api/trees` - List trees
- `POST /api/trees` - Create tree
- `GET /api/trees/{id}` - Get tree details

## Keyboard Shortcuts

- `Esc` - Close dialogs/modals
- `Tab` - Navigate form fields
- `Enter` - Submit forms (when focused)
- `Space` - Toggle switches

## Responsive Breakpoints

```css
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Sidebar Behavior

- `< lg`: Sidebar hidden by default, overlay when opened
- `>= lg`: Sidebar visible by default, content adjusts

## Error Handling

### Form Validation

- Required fields marked with `*`
- Inline error messages below fields
- Red border on invalid inputs
- Character counters for text fields

### API Errors

- Toast notifications
- Descriptive error messages
- Automatic retry suggestions
- Redirect on 404s

### Loading States

- Skeleton screens
- Spinner with message
- Disabled buttons during submission
- Progress indicators

## Development Tips

### Hot Module Replacement

- Changes auto-reload
- State preserved when possible
- Fast refresh for React components

### Dev Tools

- React DevTools extension recommended
- Network tab for API debugging
- Console for error tracking

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Common Issues

### "Failed to fetch trees"

- Check backend is running on port 8000
- Verify token is valid in localStorage
- Check CORS configuration

### Layout not responsive

- Clear browser cache
- Check Tailwind CSS is compiling
- Verify viewport meta tag

### Dark mode not working

- Check system preferences
- Verify ThemeProvider in layout
- Clear localStorage if stuck

### Sidebar not showing

- Check screen size (may be collapsed)
- Click menu button to toggle
- Verify z-index in CSS

## Next Steps

1. Test the UI with a registered user
2. Create a few trees to see the grid layout
3. Try different roles to see permission differences
4. Test responsive design on mobile devices
5. Provide feedback on UX issues

## Feedback

Please report issues with:

- Screenshots of the problem
- Browser and device info
- Steps to reproduce
- Console errors (if any)

---

_Ready to build your family tree! 🌳_
