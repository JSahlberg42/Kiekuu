# Kiekuu Development Guide 🛠️

Welcome to the development guide for **Kiekuu**! This document provides instructions for setting up your development environment and outlines the architectural principles and coding standards we follow.

---

## 1. Development Environment Setup

### Prerequisites
- **Node.js:** Version 24 or later is recommended (required for Firebase Functions).
- **npm:** Typically installed with Node.js.
- **Firebase CLI:** Install globally via `npm install -g firebase-tools`.

### Setup Steps
1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-repo/kiekuu.git
    cd kiekuu
    ```
2.  **Install Dependencies:**
    - Root (Frontend):
      ```bash
      npm install
      ```
    - Firebase Functions (Backend):
      ```bash
      cd firebase/functions
      npm install
      cd ../..
      ```
3.  **Environment Configuration:**
    - Copy `.env.example` to `.env.local`:
      ```bash
      cp .env.example .env.local
      ```
    - Fill in the required Firebase configuration values from your Firebase project settings.
4.  **Firebase Login:**
    ```bash
    firebase login
    ```

### Running Locally
- **Frontend Development:**
  ```bash
  npm run dev
  ```
- **Firebase Emulators (Optional):**
  If you want to run Firestore or Functions locally:
  ```bash
  firebase emulators:start
  ```

---

## 2. Project Guidelines

### ✅ Do This (Best Practices)
- **Firebase Cost Optimization:** Always prioritize strategies that minimize Firestore reads/writes. Use `getDoc` only when necessary, and use `where` clauses to limit query results. Implement local caching where appropriate.
- **Mobile-First Design:** Build layouts for small screens first and progressively enhance them for larger screens. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`).
- **Atomic Commits:** Make small, focused, and well-described commits. Each commit should address a single task or fix.
- **Validation:** Run `npm run lint` and ensure all tests pass before committing.
- **Documentation:** Update relevant `.md` files (like this one or `STYLEGUIDE.md`) when introducing new architectural patterns or UI components.
- **Type Safety:** Use `PropTypes` for React components to ensure data integrity and catch bugs early.
- **Semantic HTML:** Use proper HTML tags (e.g., `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`) for better accessibility and SEO.

### ❌ Do Not Do This (Anti-Patterns)
- **Avoid Massive Re-renders:** Do not put heavy logic or large objects directly in the `render` path of React components without `useMemo` or `useCallback`.
- **No Direct State Mutation:** Never mutate React state directly; always use the setter functions provided by `useState` or `useReducer`.
- **Avoid Global Styles:** Avoid adding custom CSS to `globals.css` unless absolutely necessary. Rely on Tailwind utility classes instead.
- **No Hardcoded Secrets:** Never commit API keys or sensitive credentials to version control. Use `.env.local` and ensure it is in `.gitignore`.
- **Don't Bypass Linting:** Do not use `eslint-disable` unless there is a very specific and documented reason to do so.
- **No Large Component Files:** If a component exceeds 200-300 lines, consider breaking it down into smaller, reusable sub-components.

---

## 3. Workflow & Commits

As stated in `GEMINI.md`:
- **Main Branch Protection:** Never commit directly to `main`. Always create a feature branch and submit a Pull Request.
- **Testing:** Every change must be verified and tested before being committed.
- **Commit Messages:** Use clear, descriptive commit messages. Focus on the *why* as much as the *what*.

---

## 4. Technology Stack Overview
- **Frontend:** React + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase (Auth, Firestore, Cloud Functions, AI/Vertex AI)
- **Icons:** Lucide React
