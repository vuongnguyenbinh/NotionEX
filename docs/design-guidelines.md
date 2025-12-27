# Focus to Notion - Design Guidelines

## Brand Identity

### Brand Colors
| Role | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| Primary | `#DA251D` | `#E5443D` | CTAs, links, brand accents |
| Primary Dark | `#C42018` | `#DA251D` | Hover states |
| Secondary | `#1E1E2A` | `#F8FAFC` | Text, backgrounds |
| Accent Blue | `#3B82F6` | `#60A5FA` | Interactive elements |
| Success | `#10B981` | `#34D399` | Positive states |
| Warning | `#F59E0B` | `#FBBF24` | Caution states |
| Error | `#EF4444` | `#F87171` | Error states |
| Purple | `#8B5CF6` | `#A78BFA` | AI/Prompts feature |

### Neutral Palette
| Shade | Light Mode | Dark Mode |
|-------|------------|-----------|
| White | `#FFFFFF` | `#0F172A` |
| Gray 50 | `#F8FAFC` | `#1E293B` |
| Gray 100 | `#F1F5F9` | `#334155` |
| Gray 200 | `#E2E8F0` | `#475569` |
| Gray 300 | `#CBD5E1` | `#64748B` |
| Gray 400 | `#94A3B8` | `#94A3B8` |
| Gray 500 | `#64748B` | `#CBD5E1` |
| Gray 600 | `#475569` | `#E2E8F0` |
| Gray 700 | `#334155` | `#F1F5F9` |
| Gray 800 | `#1E293B` | `#F8FAFC` |
| Gray 900 | `#0F172A` | `#FFFFFF` |

### Gradients
```css
/* Primary gradient for badges/CTAs */
--gradient-primary: linear-gradient(135deg, #DA251D 0%, #8B5CF6 100%);

/* Hero background gradient */
--gradient-hero: linear-gradient(180deg, var(--gray-50) 0%, var(--white) 100%);

/* CTA section gradient */
--gradient-cta: linear-gradient(135deg, #1E1E2A 0%, #334155 100%);

/* Feature card hover glow */
--glow-primary: 0 0 40px rgba(218, 37, 29, 0.15);
```

---

## Typography

### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Element | Size (Desktop) | Size (Mobile) | Weight | Line Height |
|---------|---------------|---------------|--------|-------------|
| H1 | 3.5rem (56px) | 2.5rem (40px) | 800 | 1.1 |
| H2 | 2.5rem (40px) | 1.875rem (30px) | 700 | 1.2 |
| H3 | 1.5rem (24px) | 1.25rem (20px) | 600 | 1.3 |
| H4 | 1.25rem (20px) | 1.125rem (18px) | 600 | 1.4 |
| Body Large | 1.25rem (20px) | 1.125rem (18px) | 400 | 1.6 |
| Body | 1rem (16px) | 1rem (16px) | 400 | 1.6 |
| Body Small | 0.875rem (14px) | 0.875rem (14px) | 400 | 1.5 |
| Caption | 0.75rem (12px) | 0.75rem (12px) | 500 | 1.4 |

### Vietnamese Support
Inter font fully supports Vietnamese diacritical marks (ă, â, đ, ê, ô, ơ, ư).

---

## Spacing System

### Base Unit: 4px
| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight spacing |
| `--space-2` | 8px | Icon margins |
| `--space-3` | 12px | Small gaps |
| `--space-4` | 16px | Standard padding |
| `--space-6` | 24px | Section gaps |
| `--space-8` | 32px | Component spacing |
| `--space-12` | 48px | Large spacing |
| `--space-16` | 64px | Section padding |
| `--space-24` | 96px | Hero spacing |

### Container
```css
--container-max: 1200px;
--container-padding: 1.5rem; /* 24px */
```

---

## Components

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.875rem 1.75rem;
  border-radius: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(218, 37, 29, 0.2);
}

/* Large Button */
.btn-lg {
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
}
```

### Cards
```css
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 1rem;
  padding: 2rem;
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: var(--primary);
}
```

### Feature Icons
```css
.feature-icon {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## Shadows

### Elevation System
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

---

## Animations

### Micro-interactions
```css
/* Fade in up for scroll reveals */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Subtle pulse for CTAs */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* Float animation for hero image */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

### Transition Defaults
```css
--transition-fast: all 0.15s ease;
--transition: all 0.2s ease;
--transition-slow: all 0.3s ease;
```

---

## Layout Patterns

### Hero Section
- Full-width, center-aligned
- Badge at top with gradient background
- Large headline with gradient text effect
- Description with muted color
- Dual CTAs with visual hierarchy
- Trust indicators below CTAs
- Browser mockup or product screenshot

### Feature Grid
- 2x2 grid on desktop
- 1 column on mobile
- Cards with icon, title, description, bullet list

### Split Content
- 50/50 text/visual split
- Alternating layout (text left, then right)
- Visual on one side, content on other

### Social Proof
- Stats row with large numbers
- Testimonial cards in 3-column grid
- Avatar + quote + name/role format

---

## Responsive Breakpoints

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Mobile Considerations
- Touch targets minimum 44x44px
- Hamburger menu for navigation
- Single column layouts
- Reduced font sizes
- Full-width buttons
- Sticky header with blur effect

---

## Accessibility

### Color Contrast
- Normal text: minimum 4.5:1 ratio
- Large text (18px+): minimum 3:1 ratio
- All interactive elements meet WCAG 2.1 AA

### Focus States
```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Dark Mode

### Implementation
```css
[data-theme="dark"] {
  --white: #0F172A;
  --gray-50: #1E293B;
  /* ... invert neutral scale */
  --primary: #E5443D; /* Slightly brighter for visibility */
}
```

### Dark Mode Considerations
- Reduce shadow intensity
- Use dark backgrounds with subtle borders
- Avoid pure white text (use gray-200)
- Increase contrast for small text

---

## Assets

### Logo
- Primary: `images/logo.png`
- Favicon: `images/favicon.png`
- Keep minimum clear space of 1x logo height

### Screenshots
- Use device mockups for context
- Consistent shadow and border radius
- Show actual extension UI when possible

---

## Design Principles

1. **Clarity First** - Every element serves a purpose
2. **Progressive Disclosure** - Show what's needed, hide complexity
3. **Visual Hierarchy** - Guide the eye with size, color, spacing
4. **Consistency** - Same patterns, same meanings
5. **Performance** - Lightweight animations, optimized assets
6. **Accessibility** - Usable by everyone
7. **Mobile-First** - Design for constraints first

---

*Last updated: December 2024*
