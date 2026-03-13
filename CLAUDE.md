# Mobile-First Web App Guidelines

This project is a **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase** app. Always write code mobile-first.

## Mobile-First Philosophy

Start with the smallest screen (320–375px) and layer complexity upward. Never design for desktop and override down. Every component, layout, and interaction must work on a phone before it works on a tablet or desktop.

## Tailwind CSS Breakpoints

Always write base styles for mobile. Add responsive prefixes for larger screens only.

```
base (no prefix) → mobile (< 640px)
sm:              → ≥ 640px
md:              → ≥ 768px
lg:              → ≥ 1024px
xl:              → ≥ 1280px
2xl:             → ≥ 1536px
```

**Do this:**
```tsx
<div className="text-sm md:text-base lg:text-lg">
<div className="p-4 md:p-6 lg:p-8">
<div className="w-full md:w-1/2 lg:w-1/3">
```

**Never do this:**
```tsx
// Desktop-first with mobile overrides — wrong
<div className="text-lg sm:text-sm">
```

## Layout Patterns

Stack vertically on mobile, go side-by-side on larger screens.

```tsx
// Single column → multi-column
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Stack → row
<div className="flex flex-col md:flex-row gap-4">

// Full width → constrained
<div className="w-full max-w-screen-lg mx-auto px-4 md:px-6 lg:px-8">
```

Sidebar layouts: sidebar goes below content on mobile, beside it on desktop.

```tsx
<div className="flex flex-col lg:flex-row gap-6">
  <main className="flex-1 min-w-0">...</main>
  <aside className="w-full lg:w-64 shrink-0">...</aside>
</div>
```

## Touch-Friendly UI

- Minimum tap target: **44×44px** (`min-h-11 min-w-11` in Tailwind)
- Adequate spacing between interactive elements: at least 8px apart
- Never rely on hover-only interactions — hover is not available on touch devices
- Use `active:` states alongside `hover:` states
- Avoid small text links; prefer buttons with padding for actions

```tsx
// Good touch target
<button className="min-h-11 px-4 py-3 text-sm font-medium">
  Action
</button>

// Pair hover with active for touch feedback
<button className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800">
```

## Typography

- Use fluid/responsive text sizing, not fixed sizes everywhere
- Ensure readable line lengths with `max-w-prose` (65ch)
- Minimum body text: `text-base` (16px) — never use `text-xs` for body content on mobile
- Headings should scale down on mobile

```tsx
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
<h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">
<p className="text-base leading-relaxed max-w-prose">
```

## Images & Media

Always use `next/image` for images — never `<img>` tags for content images.

```tsx
import Image from 'next/image'

// Responsive image that fills its container
<div className="relative w-full aspect-video">
  <Image
    src="/photo.jpg"
    alt="Description"
    fill
    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    className="object-cover"
  />
</div>
```

- Never use fixed pixel widths for images (`width: 800px`)
- Use `sizes` prop to let the browser pick the right resolution
- Use `aspect-ratio` utilities (`aspect-video`, `aspect-square`) to reserve space

## Navigation

Mobile: hamburger menu or bottom navigation bar.
Desktop: full horizontal nav.

```tsx
// Top nav pattern
<nav>
  {/* Mobile: hamburger triggers sheet/drawer */}
  <button className="md:hidden" aria-label="Open menu">
    <MenuIcon />
  </button>

  {/* Desktop: inline links */}
  <ul className="hidden md:flex gap-6">
    <li><Link href="/">Home</Link></li>
  </ul>
</nav>

// Bottom nav bar (mobile-only, common for app-like experiences)
<nav className="fixed bottom-0 inset-x-0 md:hidden bg-white border-t">
  <div className="flex justify-around py-2">
    {/* Nav items with icons + labels */}
  </div>
</nav>
```

## Performance

Mobile networks are slower. Always think about bundle size and load time.

- Use Next.js **Server Components** by default; only add `'use client'` when needed
- Use **static generation** (`generateStaticParams`) for pages that can be pre-built
- **Lazy load** heavy components with `dynamic()`:
  ```tsx
  const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
    loading: () => <Skeleton />,
  })
  ```
- Avoid importing large libraries client-side; prefer server-side processing
- Use Supabase **row-level security** and selective `select()` to avoid over-fetching data
- Keep client-side state minimal — fetch on the server where possible

## Viewport & Meta

Next.js 16 handles the viewport meta tag via the Metadata API. Set it in your root layout:

```tsx
// app/layout.tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'App Name',
  description: '...',
}
```

Never manually add `<meta name="viewport">` — use the `viewport` export instead.

## Testing Checklist

Before considering any UI work done, check these breakpoints in browser DevTools:

| Device | Width | Notes |
|--------|-------|-------|
| iPhone SE | 375px | Smallest common modern phone |
| iPhone 14 | 390px | Most common iPhone size |
| iPad | 768px | Tablet breakpoint |
| Desktop | 1280px | Standard laptop/desktop |

Check:
- [ ] No horizontal scroll at any breakpoint
- [ ] Text is readable without zooming (≥16px body)
- [ ] Tap targets are large enough (≥44px)
- [ ] Images don't overflow their containers
- [ ] Navigation is accessible and functional
- [ ] No content is hidden or inaccessible on mobile
