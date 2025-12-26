# Notion Sidebar - Chrome Extension 

**Version:** 1.0.0
**Date:** 2025-12-17
**Manifest:** V3

---

## 1. Extension Overview

### Data
- Type: Task, Bookmark, Note
- Title
- Content: Rich text - Block
- URL
- Favicon/Logo URL
- Priority: Select
- Deadline: Times mm:HH dd/MM/YYY
- Category: Select
- Project: Select
- Tag: Multi-select
- Creatat: Time
- timestamp: Timestamp

---

## 2. UI Layout Structure

### 2.1 Header (48px fixed)
```
┌─────────────────────────────────────────┐
│ [Logo] Notion Sidebar    [Sync] [Theme] │
└─────────────────────────────────────────┘
```
- **Logo:** 24x24 icon
- **Title:** "Notion Sidebar" (14px, bold)
- **Sync Button:** Manual sync trigger, spinning animation when syncing
- **Theme Toggle:** Sun/Moon icons for light/dark mode

### 2.2 Tab Bar (Main Navigation)
```
┌─────────────────────────────────────────┐
│  [✓] Công việc  [📑] Dấu trang  [📝] Ghi chú │
└─────────────────────────────────────────┘
```
- 3 primary tabs: Tasks, Bookmarks, Notes
- Active tab: Red brand color (#DA251D) with bottom border
- Icons: 14x14 SVG stroke icons
- Badge: Pending task count indicator

### 2.3 Search & Filter Bar
```
┌─────────────────────────────────────────┐
│ [🔍] Tìm kiếm...                   [⚙]  │
└─────────────────────────────────────────┘
│ [Status ▼] [Category ▼] [Project ▼] [Tag ▼]         │ ← Dropdown filters (toggleable)
└─────────────────────────────────────────┘
```
- Search: Real-time filtering with 300ms debounce
- Filter button: Toggle dropdown visibility
- Filters: Status, Category,Project, Tag

### 2.4 Add Button
```
┌─────────────────────────────────────────┐
│        [+] Thêm công việc               │ ← Dynamic text per tab
└─────────────────────────────────────────┘
```
- Full-width primary button
- Text changes: "Thêm công việc" / "Thêm dấu trang" / "Thêm ghi chú"

### 2.5 Content Area (Scrollable)
- Folder tree view for categories
- Card-based items within folders
- Drag & drop reordering support
- Empty state with icon + message

### 2.6 Footer Tab Bar (Utility)
```
┌─────────────────────────────────────────┐
│  [📊] Thống kê  [📋] Nhật ký  [⚙] Cài đặt │
└─────────────────────────────────────────┘
```
- Secondary tabs with smaller styling
- Analytics, Logs, Settings

### 2.7 Watermark
```
Công cụ tạo bởi Binh Vuong AI Marketing
```

---

## 3. Color System

### Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Charcoal | `#1E1E2A` | Dark background, text |
| Neutral | `#F2F2F7` | Light background |
| Red Brand | `#DA251D` | Primary actions, active states |
| Red Hover | `#C42018` | Button hover |

### Status Colors
| Color | Hex | Usage |
|-------|-----|-------|
| Green | `#10B981` | Success, completed |
| Blue | `#3B82F6` | Bookmarks, links |
| Orange | `#F59E0B` | Warning, pending |
| Purple | `#8B5CF6` | Notes |
| Red Error | `#EF4444` | Errors, delete |

### Gray Scale
- `#F9FAFB` → `#374151` (50-700)

### Theme Switching
```css
[data-theme="dark"] {
  --bg-primary: #1E1E2A;
  --text-primary: #F2F2F7;
}
```

---

## 4. Typography

- **Font Family:** Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- **Base Size:** 14px
- **Line Height:** 1.5

| Element | Size | Weight |
|---------|------|--------|
| Header Title | 14px | 700 |
| Tab Label | 13px | 600 |
| Card Title | 14px | 600 |
| Card Description | 13px | 400 |
| Meta Text | 12px | 400 |
| Footer Tab | 11px | 600 |
| Badge | 11px | 600 |

---

## 5. Spacing System

| Variable | Value | Usage |
|----------|-------|-------|
| `--spacing-xs` | 4px | Tight gaps |
| `--spacing-sm` | 8px | Small gaps |
| `--spacing-md` | 12px | Default padding |
| `--spacing-lg` | 16px | Section padding |
| `--spacing-xl` | 24px | Large sections |

---

## 6. Component Library

### 6.1 Cards

#### Task Card
```
┌─────────────────────────────────────────┐
│ [☐] Task Title               [✏] [🗑]  │
│     Description text here...            │
│     [Tag1] [Tag2]        Updated 2m ago │
└─────────────────────────────────────────┘
```
- Left border: 4px red (incomplete) / green (completed)
- Checkbox: Toggle completion status
- Actions: Edit, Delete (shown on hover)

#### Bookmark Card
```
┌─────────────────────────────────────────┐
│ [🌐] Bookmark Title          [✏] [🗑]  │
│     https://example.com                 │
│     [Tag1]                   2 days ago │
└─────────────────────────────────────────┘
```
- Left border: 4px blue
- Favicon: 24x24, fallback to generic icon
- URL: Clickable link

#### Note Card
```
┌─────────────────────────────────────────┐
│ Note Title                   [✏] [🗑]  │
│ Note content preview...                 │
│ [Tag1]                       1 week ago │
└─────────────────────────────────────────┘
```
- Left border: 4px purple
- Background: Secondary (gray-50)

### 6.2 Buttons

| Type | Style |
|------|-------|
| Primary | Red brand (#DA251D), white text |
| Secondary | Gray background, dark text |
| Icon Button | 32x32, transparent, hover: gray bg |
| Small Button | 28px height, 12px font |

### 6.3 Form Elements

- **Input Height:** 44px (forms), 40px (search)
- **Border Radius:** 8px
- **Focus State:** Red brand border + shadow
- **Select:** Custom chevron icon

### 6.4 Modal

```
┌─────────────────────────────────────────┐
│ Modal Title                        [×]  │
├─────────────────────────────────────────┤
│                                         │
│  Form content here...                   │
│                                         │
├─────────────────────────────────────────┤
│                    [Cancel] [Save]      │
└─────────────────────────────────────────┘
```
- Max width: 420px (520px on wide screens)
- Max height: 90vh
- Overlay: rgba(0,0,0,0.5)

### 6.5 Toast Notifications

- Position: Bottom center, fixed
- Animation: Slide up (0.3s)
- Types: Success (green), Error (red), Info (blue), Warning (orange)
- Auto-dismiss: 3 seconds

### 6.6 Tags

```
[●] Tag Name [×]
```
- Pill shape (border-radius: 999px)
- Color dot: 8px circle
- Remove button: On hover
- Preset colors: red, orange, green, blue, purple, pink, gray, brand

### 6.7 Folder Tree (Categories)

```
▶ 📁 Category Name (5)
   └ 📁 Subcategory (2)
      ├ Item 1
      └ Item 2
```
- Chevron: Rotate 90° when expanded
- Count badge: Items in category
- Indentation: 16px per level
- Reorder buttons: Up/Down arrows

---

## 7. Functionality Features

### 7.1 Data Management

| Tab | CRUD Operations |
|-----|-----------------|
| Tasks | Create, Read, Update, Delete, Toggle Status |
| Bookmarks | Create, Read, Update, Delete, URL Metadata Fetch |
| Notes | Create, Read, Update, Delete |
| Categories | Create, Read, Update, Delete, Hierarchy (parent/child) |
| Tags | Create, Read, Update, Delete, Color Selection |

### 7.5 Search & Filter
- Real-time search (300ms debounce)
- Filter by status 
- Filter by category
- Filter by Project
- Filter by tag
- Combined filters (AND logic)

### 7.6 Bulk Operations
- Bulk select mode toggle
- Select all checkbox
- Multi-delete confirmation
- Selected count display

### 7.7 Drag & Drop
- URL drop for quick bookmark creation
- Card reordering within categories
- Folder reordering
- Visual drag indicators

### 7.8 Theme Support
- Light/Dark mode toggle
- localStorage persistence
- CSS variables for theming

---

## 8. Tab-Specific Features

### 8.1 Tasks Tab
- Checkbox for status toggle
- Priority badges (High/Medium/Low)
- Due date display
- Completed task styling (strikethrough, opacity)

### 8.2 Bookmarks Tab
- Favicon extraction
- URL metadata auto-fetch
- One-click URL open
- Drag & drop URL import

### 8.3 Notes Tab
- Multi-line content
- Content preview (2 lines)
- Full content in modal

### 8.4 Analytics Tab
- Total counts per type
- Task completion progress bar
- Items per tag breakdown
- Items per category breakdown

### 8.5 Logs Tab
- Last sync timestamp
- Pending items list
- Debug actions:
  - Force sync
  - Reset sync flag
  - Clear local data

### 8.6 Settings Tab
- Dark mode toggle
- Tags management (list, add, edit, delete)
- Categories management (list, add, edit, delete)
- Project management (list, add, edit, delete)
- Notion token

---

## 9. Popup UI

### Layout (300px width)
```
┌─────────────────────────────────────────┐
│ [Logo] Notion Sidebar                   │
├─────────────────────────────────────────┤
│ ● Online              Synced 2m ago     │
├─────────────────────────────────────────┤
│        [Open Sidebar]                   │
│        [Sync Now]                       │
├─────────────────────────────────────────┤
│ v1.0.0 | Settings                       │
└─────────────────────────────────────────┘
```

### Features
- Connection status indicator (online/offline)
- Sync status display
- Quick actions: Open Sidebar, Sync Now
- Unauthenticated state: Login prompt

---

## 10. Responsive Design

### Breakpoints
| Width | Behavior |
|-------|----------|
| <300px | Compact layout, smaller fonts |
| 300-400px | Default sidebar width |
| 400-500px | More padding, larger modal |
| >500px | Full spacing, 520px modal |

### Compact Mode (<300px)
- Header title: 14px
- Tab labels: 12px, 4px gap
- Card padding: 8px
- Smaller reorder buttons

---

## 11. Animations & Transitions

| Element | Duration | Easing |
|---------|----------|--------|
| Hover states | 150ms | ease |
| Tab transitions | 200ms | ease |
| Modal overlay | instant | - |
| Toast slide-up | 300ms | ease |
| Spinner | 800ms | linear infinite |
| Sync icon spin | 1000ms | linear infinite |
| Folder chevron | 200ms | ease |

---

## 12. Icon Set

Using inline SVG with stroke-based icons (Lucide style):
- `viewBox="0 0 24 24"`
- `fill="none"`
- `stroke="currentColor"`
- `stroke-width="2"`

### Category Icons
folder, briefcase, user, star, heart, bookmark, file-text, code, globe, wrench, zap, tag

---

## 13. Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus visible states
- Color contrast compliance
- Vietnamese language support (lang="vi")

---

## 14. Performance Considerations

- Debounced search (300ms)
- Virtual scrolling potential for large lists
- Cursor-based pagination (100 items per request)
- IndexedDB indexing on server_id, updated_at
- CSS containment for scroll areas

---

## 15. Future Enhancement Opportunities

1. **Keyboard Shortcuts**
   - `Ctrl+N` - New item
   - `Ctrl+F` - Focus search
   - `Ctrl+1/2/3` - Switch tabs

2. **Bulk Edit Mode**
   - Multi-select for batch operations
   - Batch category/tag assignment

3. **Rich Text Notes**
   - Markdown support
   - Code highlighting

4. **Bookmark Enhancements**
   - Screenshot thumbnails
   - Reading list mode
   - Archive functionality

5. **Task Features**
   - Due date reminders
   - Recurring tasks
   - Subtasks

6. **Export/Import**
   - JSON export
   - CSV export
   - Browser bookmarks import

7. **Search Improvements**
   - Full-text search
   - Search history
   - Advanced filters

---

## 16. Known Limitations

1. Chrome Extension only (no Firefox/Safari support)
2. Requires minimum Chrome version 116 (sidePanel API)
3. Single-user authentication
4. No real-time collaboration
5. API rate limiting (single user)
6. API request limit with Max items for Notion
