# Kiekuu App Style Guide 🎨

This document defines the visual identity and UI standards for **Kiekuu**, ensuring a consistent, tactical, and professional experience across the application.

---

## 1. Technology Stack
- **Framework:** React 18+ with Vite
- **Styling:** Tailwind CSS 3.3+ with **shadcn/ui** component patterns
- **Approach:** **Mobile-First Responsive Design**
- **Icons:** Lucide React
- **Backend:** Firebase (Authentication, Firestore, Hosting)

### Mobile-First Philosophy
All components and layouts are designed mobile-first, then progressively enhanced for larger screens using Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).

---

## 2. Design Philosophy
The aesthetic is **"Tactical Dark Mode"**. It draws inspiration from modern emergency services equipment, flight deck interfaces, and tactical gear. It must feel reliable, high-tech, and urgent.

---

## 3. Color Palette
Colors are mapped to Tailwind CSS default scales for ease of implementation.

| Category | Color Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | Slate 950 | `#020617` | Main app background |
| **Surface** | Slate 900 | `#0F172A` | Cards, modals, and sections |
| **Primary** | Orange 500 | `#F97316` | Main brand color, primary actions |
| **Secondary** | Red 600 | `#DC2626` | Alerts, critical errors, fire-related highlights |
| **Accent** | Amber 400 | `#FACC15` | Achievements, AI Tutor highlights |
| **Text (High)** | Slate 50 | `#F8FAFC` | Headings and primary labels |
| **Text (Mid)** | Slate 400 | `#94A3B8` | Secondary text and descriptions |
| **Border** | Slate 800 | `#1E293B` | Subtle UI dividers and component borders |

---

## 3. Color Palette
Colors are mapped to Tailwind CSS default scales for ease of implementation.

| Category | Color Name | Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Background** | Slate 950 | `#020617` | Main app background |
| **Surface** | Slate 900 | `#0F172A` | Cards, modals, and sections |
| **Primary** | Orange 500 | `#F97316` | Main brand color, primary actions |
| **Secondary** | Red 600 | `#DC2626` | Alerts, critical errors, fire-related highlights |
| **Accent** | Amber 400 | `#FACC15` | Achievements, AI Tutor highlights |
| **Text (High)** | Slate 50 | `#F8FAFC` | Headings and primary labels |
| **Text (Mid)** | Slate 400 | `#94A3B8` | Secondary text and descriptions |
| **Border** | Slate 800 | `#1E293B` | Subtle UI dividers and component borders |

---

## 4. Typography
We use clean, geometric sans-serif fonts for readability in high-pressure or low-light environments.

- **Primary Font:** `Inter` (Sans-serif)
- **Technical/Data Font:** `JetBrains Mono` or `Geist Mono` (For Unit IDs, radio codes, and timestamps).

### Typography Styles (Tailwind Classes)
- **H1 (Page Titles):** `text-3xl font-bold tracking-tight text-slate-50`
- **H2 (Section Headers):** `text-xl font-semibold text-orange-500 uppercase tracking-wide`
- **Body Text:** `text-base leading-relaxed text-slate-300`
- **Caption/Small:** `text-xs font-medium uppercase tracking-widest text-slate-500`

### Responsive Typography
```tsx
// Mobile-first example
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">
  Title
</h1>
```

---

## 5. UI Components & Layout

### Component Architecture
We follow **shadcn/ui** patterns for component design:
- Components are built with Tailwind CSS utility classes
- Accessible by default (ARIA attributes, keyboard navigation)
- Composable and reusable
- Mobile-first responsive

### Design Tokens
- **Corners:** Use `rounded-xl` (12px) for most containers. Avoid fully rounded "pill" shapes for primary components.
- **Borders:** Instead of heavy shadows, use subtle borders: `border border-slate-800`.
- **Spacing:** Follow Tailwind's spacing scale (4px increments: `p-4`, `p-6`, `p-8`)
- **Interactions:** Hover states should slightly brighten the background (`hover:bg-slate-800`) or add a subtle glow to primary buttons.
- **Icons:** Use `lucide-react`. Default stroke width: `2px`.

### Responsive Breakpoints
```
sm: 640px   // Small devices (landscape phones)
md: 768px   // Medium devices (tablets)
lg: 1024px  // Large devices (desktops)
xl: 1280px  // Extra large devices
2xl: 1536px // Extra extra large devices
```

### Button Patterns
```tsx
// Primary Action (Orange)
<button className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-slate-50 font-semibold rounded-xl transition-colors">
  Primary Action
</button>

// Secondary Action (Slate)
<button className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-50 font-semibold rounded-xl transition-colors">
  Secondary Action
</button>

// Critical/Danger (Red)
<button className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-slate-50 font-semibold rounded-xl transition-colors">
  Delete
</button>
```

### Card Patterns
```tsx
// Standard Card
<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
  <h3 className="text-xl font-semibold text-orange-500 uppercase tracking-wide mb-4">
    Card Title
  </h3>
  <p className="text-base leading-relaxed text-slate-300">
    Card content
  </p>
</div>
```

### Form Input Patterns
```tsx
// Input with Label
<div>
  <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
    Label
  </label>
  <input 
    className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
    placeholder="Placeholder"
  />
</div>
```

---

## 6. Imagery & Iconography
- **Logo:** The "Tactical Rooster" emblem.
  - **Full Logo:** Used on Login and Profile screens.
  - **Icon Only:** Used for Favicons, App Icons, and Navbars.
- **Visual Style:** Focus on high-contrast photography of fire services or clean vector illustrations. Avoid cartoonish or farm-themed elements.

---

## 7. Rank Colors (Progression)
Specific accent colors assigned to each rank for visual feedback:

1. **Harjoittelija:** `text-slate-400` / `border-slate-400`
2. **Nuorempi sammutusmies:** `text-emerald-500` / `border-emerald-500`
3. **Sammutusmies:** `text-blue-500` / `border-blue-500`
4. **Vanhempi sammutusmies:** `text-purple-500` / `border-purple-500`
5. **Ryhmänjohtaja:** `text-orange-500` / `border-orange-500`
6. **Palokunnan päällikkö:** `text-amber-400` / `border-amber-400` (Gold)

---

## 8. Mobile-First Layout Patterns

### Container Widths
```tsx
// Full-width on mobile, constrained on desktop
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  Content
</div>
```

### Grid Layouts
```tsx
// Stack on mobile, grid on larger screens
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
  <Card />
  <Card />
  <Card />
</div>
```

### Navigation Patterns
```tsx
// Mobile: Stack vertically, Desktop: Horizontal
<nav className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <Link />
  <Link />
  <Link />
</nav>
```

---

## 9. Accessibility Standards
- **Keyboard Navigation:** All interactive elements must be keyboard accessible
- **ARIA Labels:** Use proper ARIA attributes for screen readers
- **Focus States:** Visible focus indicators with `focus:ring-2 focus:ring-orange-500`
- **Color Contrast:** Minimum WCAG AA compliance (4.5:1 for normal text)
- **Touch Targets:** Minimum 44x44px for mobile touch targets

---

## 10. Tone of Voice
- **Language:** UI is in **Finnish**. Documentation is in **English**.
- **Tone:** Professional, direct, and supportive. The AI Tutor provides objective explanations based on official sources.