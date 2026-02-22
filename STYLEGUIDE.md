# Kiekuu App Style Guide 🎨

This document defines the visual identity and UI standards for **Kiekuu**, ensuring a consistent, tactical, and professional experience across the application.

---

## 1. Design Philosophy
The aesthetic is **"Tactical Dark Mode"**. It draws inspiration from modern emergency services equipment, flight deck interfaces, and tactical gear. It must feel reliable, high-tech, and urgent.

---

## 2. Color Palette
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

## 3. Typography
We use clean, geometric sans-serif fonts for readability in high-pressure or low-light environments.

- **Primary Font:** `Inter` (Sans-serif)
- **Technical/Data Font:** `JetBrains Mono` or `Geist Mono` (For Unit IDs, radio codes, and timestamps).

### Typography Styles (Tailwind Classes)
- **H1 (Page Titles):** `text-3xl font-bold tracking-tight text-slate-50`
- **H2 (Section Headers):** `text-xl font-semibold text-orange-500 uppercase tracking-wide`
- **Body Text:** `text-base leading-relaxed text-slate-300`
- **Caption/Small:** `text-xs font-medium uppercase tracking-widest text-slate-500`

---

## 4. UI Components & Layout
- **Corners:** Use `rounded-xl` (12px) for most containers. Avoid fully rounded "pill" shapes for primary components.
- **Borders:** Instead of heavy shadows, use subtle borders: `border border-slate-800`.
- **Interactions:** Hover states should slightly brighten the background (`hover:bg-slate-800`) or add a subtle glow to primary buttons.
- **Icons:** Use `lucide-react`. Default stroke width: `2px`.

---

## 5. Imagery & Iconography
- **Logo:** The "Tactical Rooster" emblem.
  - **Full Logo:** Used on Login and Profile screens.
  - **Icon Only:** Used for Favicons, App Icons, and Navbars.
- **Visual Style:** Focus on high-contrast photography of fire services or clean vector illustrations. Avoid cartoonish or farm-themed elements.

---

## 6. Rank Colors (Progression)
Specific accent colors assigned to each rank for visual feedback:

1. **Harjoittelija:** `text-slate-400` / `border-slate-400`
2. **Nuorempi sammutusmies:** `text-emerald-500` / `border-emerald-500`
3. **Sammutusmies:** `text-blue-500` / `border-blue-500`
4. **Vanhempi sammutusmies:** `text-purple-500` / `border-purple-500`
5. **Ryhmänjohtaja:** `text-orange-500` / `border-orange-500`
6. **Palokunnan päällikkö:** `text-amber-400` / `border-amber-400` (Gold)

---

## 7. Tone of Voice
- **Language:** UI is in **Finnish**. Documentation is in **English**.
- **Tone:** Professional, direct, and supportive. The AI Tutor provides objective explanations based on official sources.