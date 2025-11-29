# Fleet Management System - Design Guidelines

## Design Approach

**Selected Approach: Design System - Material Design 3**

**Justification:**
- **Utility-Focused**: Fleet management prioritizes efficiency, quick data entry, and clear information hierarchy
- **Information-Dense**: Analytics dashboards, trip data, GPS routes, and event logs require structured, scannable layouts
- **Mobile-Critical**: Technicians in the field need touch-friendly interfaces optimized for tablets and phones
- **Data Visualization**: Material Design's strong visual feedback system enhances charts, maps, and real-time updates

Material Design 3 provides:
- Proven patterns for data tables, forms, and dashboards
- Excellent mobile responsiveness with touch-optimized components
- Strong elevation system for layered information (maps under overlays)
- Clear interaction states critical for field use (loading, success, error)

---

## Typography

**Font Family:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for timestamps, coordinates, numerical data)

**Type Scale:**
- Display (Job/Trip Headers): text-4xl (36px), font-bold
- Headings (Dashboard Sections): text-2xl (24px), font-semibold
- Subheadings (Card Titles): text-lg (18px), font-medium
- Body (Forms, Lists): text-base (16px), font-normal
- Caption (Metadata, Timestamps): text-sm (14px), font-normal
- Small (Helper Text): text-xs (12px), font-normal

**Line Heights:**
- Headings: leading-tight
- Body: leading-relaxed
- Data tables: leading-normal

---

## Layout System

**Spacing Primitives (Tailwind):**
Primary set: **2, 4, 6, 8, 12, 16**

- Micro spacing (between elements): `gap-2`, `space-x-2`
- Component padding: `p-4`, `p-6`
- Card spacing: `p-6`, `gap-4`
- Section spacing: `py-8`, `py-12`
- Page margins: `px-4 md:px-8`, `max-w-7xl mx-auto`
- Form fields: `space-y-4`
- Grid gaps: `gap-6`, `gap-8`

**Grid System:**
- Dashboard: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Analytics: `grid-cols-1 lg:grid-cols-2` (charts side-by-side)
- Job cards: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`
- Mobile: Always single column for forms

**Container Widths:**
- Full app: `max-w-7xl mx-auto`
- Forms: `max-w-2xl`
- Modals: `max-w-lg` to `max-w-3xl` depending on content

---

## Component Library

### Core Navigation
**Top Bar:**
- Fixed position with shadow-md elevation
- Left: Logo/Brand, Center: Context (current trip/job), Right: User menu with role badge
- Height: h-16
- Icons: Heroicons (outline for inactive, solid for active states)

**Sidebar (Desktop Manager View):**
- Width: w-64, collapsible to w-16 (icon-only)
- Navigation items with icons, active state with subtle indicator
- Sticky position for scrollable content areas

**Mobile Bottom Navigation (Driver/Technician):**
- Fixed bottom: Active Trip, Jobs, History, Profile
- Large touch targets (h-16)

### Data Display
**Trip/Job Cards:**
- Rounded corners: rounded-lg
- Elevation: shadow-sm hover:shadow-md transition
- Padding: p-6
- Status badges (top-right): rounded-full px-3 py-1 text-sm

**Data Tables:**
- Striped rows for readability
- Sticky headers: sticky top-0
- Row height: h-12 minimum (touch-friendly)
- Sortable columns with icon indicators
- Pagination with clear page numbers

**Analytics Charts:**
- Plotly.js or Chart.js integration
- Responsive aspect ratios
- Card containers with p-6, rounded-lg

**Map Components:**
- Full-width within container
- Height: h-96 for detail views, h-64 for thumbnails
- Leaflet.js with custom marker styles matching design system
- Overlay controls positioned top-right with backdrop-blur-sm

### Forms & Inputs
**Text Inputs:**
- Height: h-12 (desktop), h-14 (mobile for touch)
- Border: border-2 with focus ring
- Padding: px-4
- Labels: text-sm font-medium, mb-2

**Buttons:**
- Primary: h-12, px-6, rounded-lg, font-medium
- Secondary: outlined variant
- Icon buttons: h-10 w-10, rounded-full
- Destructive actions: visually distinct treatment

**File Upload (Photos):**
- Drag-and-drop zone: border-2 border-dashed, min-h-32
- Preview thumbnails: rounded-md, w-24 h-24
- Upload progress indicator

**Select/Dropdowns:**
- Native mobile selects for performance
- Custom desktop dropdowns with search for long lists (vehicles, drivers)

### Overlays
**Modals:**
- Backdrop: backdrop-blur-sm with opacity
- Content: max-w-lg to max-w-3xl, rounded-xl, p-6
- Close button: top-right, h-10 w-10

**Toast Notifications:**
- Position: bottom-right (desktop), top-center (mobile)
- Auto-dismiss: 4 seconds
- Actions: Success (checkmark), Error (alert), Info (i)

**Photo Gallery:**
- Grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- Lightbox: full-screen overlay with navigation arrows
- Image metadata overlay: absolute bottom with backdrop-blur

### Status Indicators
**Trip Status:**
- Dot indicators: w-3 h-3 rounded-full
- Text badges: px-3 py-1 rounded-full text-sm
- States: Not Started, In Progress, Delayed, Completed, Cancelled

**Real-time Indicators:**
- GPS active: pulsing dot animation
- Loading states: skeleton screens for tables, spinner for actions
- Offline mode: persistent banner at top

---

## Component States

**Interactive States:**
- Hover: subtle shadow elevation increase
- Active/Pressed: slight scale reduction (scale-95)
- Focus: 2px ring with offset
- Disabled: reduced opacity (opacity-50), cursor-not-allowed

**Loading States:**
- Skeleton screens for initial load
- Inline spinners for button actions
- Progress bars for file uploads

---

## Animations

**Minimal & Purposeful:**
- Page transitions: Simple fade (200ms)
- Modal entry: Fade + slight scale (300ms)
- Toast notifications: Slide in from edge (250ms)
- GPS position updates: Smooth marker movement (no jarring jumps)
- Chart updates: Smooth data transitions (400ms)

**Avoid:**
- Unnecessary hover effects
- Decorative animations
- Complex page transitions

---

## Mobile Optimization

**Touch Targets:**
- Minimum: 44x44px for all interactive elements
- Buttons: h-12 minimum, h-14 for primary actions
- Table rows: h-14 for easy tap

**Responsive Patterns:**
- Stack all multi-column layouts on mobile
- Bottom sheet modals instead of centered on mobile
- Simplified tables: cards with key info, tap for details
- GPS map: full-width, pinch-to-zoom enabled

---

## Images

**No hero image needed** - This is a utility application, not marketing.

**Functional Images:**
- **Photo uploads**: Display in 4:3 aspect ratio cards within trip events
- **Vehicle photos**: Circular avatars (w-12 h-12) in lists, larger rectangles in detail views
- **Driver avatars**: Circular, w-10 h-10 in lists, w-24 h-24 in profiles
- **Empty states**: Simple illustrations (not photos) for "No trips," "No jobs assigned"

All images use rounded corners (rounded-md for rectangles, rounded-full for avatars).