# Design Guidelines: Asesoría La Llave Management Platform

## Design Approach
**System:** Custom Design System inspired by SeRanking and Notion
- Professional business application aesthetic
- Information-dense layouts with clear hierarchy
- Function-first with strategic visual polish
- Stable, trustworthy interface for financial/tax management

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- **Navy Blue:** 228 79% 33% (Brand primary - #1E3A8A)
- **Vibrant Orange:** 24 95% 53% (Accent/CTA - #F97316)
- **Charcoal:** 218 11% 28% (Text/borders - #374151)
- **Pure White:** 0 0% 100% (#FFFFFF)

**Extended Palette:**
- **Light Mode Backgrounds:** 220 14% 96% (surfaces), 0 0% 100% (cards)
- **Dark Mode Backgrounds:** 222 47% 11% (base), 217 33% 17% (surfaces), 215 28% 23% (cards)
- **Success:** 142 76% 36% (completed tasks)
- **Warning:** 38 92% 50% (medium priority)
- **Error:** 0 72% 51% (high priority/overdue)
- **Info:** 199 89% 48% (notifications)

### B. Typography

**Font Families:**
- **Primary:** 'Inter' (body text, UI elements)
- **Display:** 'Plus Jakarta Sans' (headings, emphasis)

**Type Scale:**
- **Display:** text-4xl to text-6xl, font-bold (dashboard headers)
- **H1:** text-3xl, font-semibold (page titles)
- **H2:** text-2xl, font-semibold (section headers)
- **H3:** text-xl, font-medium (card titles)
- **Body:** text-base, font-normal (content)
- **Small:** text-sm, font-normal (metadata, labels)
- **Tiny:** text-xs, font-medium (badges, tags)

### C. Layout System

**Spacing Units:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- **Component padding:** p-4 to p-6
- **Section spacing:** py-8 to py-12
- **Card gaps:** gap-4 to gap-6
- **Sidebar width:** w-64 (desktop), full (mobile)

**Container Strategy:**
- **Main content area:** max-w-7xl with px-6
- **Dashboard cards:** Responsive grid with gap-6
- **Forms:** max-w-2xl centered

### D. Component Library

**Navigation:**
- **Sidebar:** Fixed left, navy blue background, white icons/text, orange active state indicator (left border), collapsible on mobile
- **Header:** Sticky top bar with user profile dropdown, logout, breadcrumbs

**Data Display:**
- **Tables:** Striped rows, hover states, sortable columns, sticky headers, pagination
- **Cards:** White/dark surface, subtle shadow, rounded-lg borders, hover lift effect
- **Kanban boards:** Column-based with drag-drop, color-coded by status
- **Dashboard widgets:** Metric cards with icons, trend indicators, and Chart.js graphs

**Forms:**
- **Inputs:** Outlined style, focus ring in orange, error states in red, helper text
- **Dropdowns:** Custom styled with icons, search functionality
- **File upload:** Drag-drop zone with progress indicators
- **Buttons:** Primary (orange), secondary (outline), text variants

**Status Indicators:**
- **Badges:** Rounded-full, small text, color-coded (green=completed, yellow=in progress, gray=pending, red=overdue)
- **Priority icons:** High (red exclamation), Medium (yellow circle), Low (gray dash)
- **Visibility locks:** 🔒 icon for personal tasks

**Feedback:**
- **Toasts:** Top-right corner, auto-dismiss, icon + message, color-coded by type
- **Loading states:** Skeleton screens for tables, spinner for buttons, progress bars for uploads
- **Modals:** Centered overlay, backdrop blur, smooth slide-in animation

**WYSIWYG Editor:**
- **Toolbar:** Sticky top, grouped tools (formatting, media, structure)
- **Content area:** Max-width prose, clean formatting
- **Media insertion:** Inline image upload with drag-drop

### E. Animations

**Micro-interactions (subtle only):**
- Button hover: slight scale (1.02) and shadow increase
- Card hover: transform translateY(-2px) with shadow
- Sidebar item hover: background lightening
- Page transitions: fade-in 200ms
- Modal entry: scale from 0.95 to 1.0 in 150ms
- Toast slide-in from right: 300ms ease-out

**No:** Excessive parallax, continuous animations, distracting effects

## Module-Specific Design

### Dashboard
- **Grid layout:** 4 metric cards top row, 2 large chart cards middle, activity feed + upcoming tasks bottom
- **Charts:** Line graphs (trends), bar charts (comparisons), donut charts (distributions)
- **Color coding:** Consistent with status system throughout

### Clientes (Clients)
- **List view:** Table with avatar/logo, name, type badge, contact info, assigned gestor, actions
- **Detail view:** Sidebar with client info, tabs for taxes/tasks/documents
- **Filters:** Type (autónomo/empresa), assigned gestor, date range

### Impuestos (Taxes)
- **Period selector:** Year + quarter/month dropdown
- **Model grid:** Cards showing 303, 390, 130, 131 with status counts
- **File manager:** List view with upload/download, file type icons, date stamps
- **Status workflow:** Visual stepper showing PENDIENTE → CALCULADO → REALIZADO

### Tareas (Tasks)
- **Dual view toggle:** Table (list) ↔ Kanban (board)
- **Kanban columns:** Pendiente, En Progreso, Completada with card counts
- **Task cards:** Title, description preview, due date badge, priority indicator, lock icon if personal
- **Quick actions:** Status change, assign user, set due date

### Manuales (Manuals)
- **Grid view:** Cards with thumbnail, title, author, tags, publish status
- **Editor:** Full-screen mode option, live preview, auto-save indicator
- **PDF export button:** Prominent in toolbar

### Administración (Admin)
- **User management table:** Avatar, name, email, role dropdown, status toggle, actions
- **Settings form:** Tabbed sections (SMTP, branding, system)
- **Activity logs:** Timeline view with user avatar, action type icon, timestamp
- **System stats:** Cards showing totals (users, clients, active tasks, storage used)

## Dark Mode Implementation

**Toggle:** Header icon, persists to localStorage
**Backgrounds:** Dark navy base (222 47% 11%), elevated surfaces (217 33% 17%)
**Text:** White primary (0 0% 100%), gray secondary (0 0% 71%)
**Borders:** Subtle gray (217 33% 23%)
**Inputs:** Dark surface with light borders, white text, orange focus ring maintained
**All form elements must maintain consistent dark mode styling**

## Images

**Logo:** "Asesoría La Llave" wordmark in header (navy on light, white on dark)
**Avatars:** User profile pictures (circular, 40px default size)
**File icons:** Document type indicators (PDF, Excel, Word) in file manager
**Empty states:** Simple illustrations for "no tasks," "no clients," "no manuals"
**No hero images** - this is a business application focused on functionality

## Accessibility
- WCAG AA contrast ratios minimum
- Keyboard navigation for all interactive elements
- Focus indicators visible on all controls
- Screen reader labels on icons
- Error messages programmatically associated with form fields