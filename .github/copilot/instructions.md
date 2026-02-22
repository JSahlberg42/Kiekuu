# Copilot Instructions for Kiekuu

You are an expert developer building **Kiekuu** using **JavaScript (ES6+)**.

## Technical Rules
- **No TypeScript:** Use plain JavaScript. Avoid any .ts or .tsx files.
- **UI Framework:** React with Vite (using .js and .jsx files).
- **Component Library:** Use **shadcn/ui** and **Tailwind CSS**.
- **Design Approach:** **Mobile-first responsive design** — develop for mobile screens first, then scale up.
- **Icons:** Use `lucide-react`.
- **Database:** Firebase Firestore (v10+).
- **AI Integration:** Use `@firebase/vertex-ai` for "Smart Tutor" feedback.

## Domain Logic: Ranks
- Ranks (levels) order:
  1. `harjoittelija`
  2. `nuorempi sammutusmies`
  3. `sammutusmies`
  4. `vanhempi sammutusmies`
  5. `ryhmänjohtaja`
  6. `palokunnan päällikkö`

## Styleguide
Follow the visual guidelines in `STYLEGUIDE.md` for all UI components.

## Data Structure
- Keep question objects consistent:
  ```javascript
  {
    id: "uuid",
    question: "Kysymysteksti",
    options: ["A", "B", "C"],
    correctIndex: 0,
    explanation: "Perusselitys",
    source: {
      title: "Lähteen nimi",
      page: "sivunumero",
      url: "linkki"
    },
    level: "taso-id",
    category: "kategoria-id"
  }
  ```

## Code Organization
- **Components:** One component per file in `src/components/`
- **Pages:** Route components in `src/pages/`
- **Hooks:** Custom hooks in `src/hooks/` (e.g., `useAuth.js`, `useFirestore.js`)
- **Services:** Firebase operations in `src/services/` (e.g., `authService.js`, `questionsService.js`)
- **Utils:** Pure utility functions in `src/utils/` (e.g., `validators.js`, `formatters.js`)
- **Context:** State management in `src/context/` (e.g., `AuthContext.jsx`, `GameContext.jsx`)

## Component Patterns
- Use functional components with hooks
- Export default at bottom: `export default ComponentName;`
- Props destructuring at function signature
- Use `propTypes` for prop validation
- Keep components focused and single-responsibility

## Firebase Operations
- Use Firebase v10+ services from `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/vertex-ai`
- Always wrap Firebase calls in error handling (try-catch or `.catch()`)
- Use Firestore transactions for multi-document operations
- Implement loading states and error states in components
- Cache auth state in Context to prevent repeated checks

## Naming Conventions
- **Components:** PascalCase (e.g., `QuestionCard.jsx`)
- **Functions/Variables:** camelCase (e.g., `fetchQuestions`, `userScore`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`, `API_TIMEOUT`)
- **Files:** kebab-case for utilities (e.g., `format-utils.js`, `auth-service.js`) or PascalCase for components

## Common Patterns
- **Auth check:** Use `useAuth` hook; redirect to `/login` if not authenticated
- **Loading states:** Show spinner with `<Spinner />` from shadcn/ui while fetching
- **Error messages:** Use toast notifications for user feedback
- **Form handling:** Use controlled components with `useState` for form values
- **List rendering:** Always use unique `key` prop (use `id`, never array index)

## Performance
- Lazy load pages with React.lazy and Suspense
- Memoize expensive components with `React.memo`
- Use `useCallback` for event handlers in lists
- Avoid inline object/array literals in JSX (define outside)

## Accessibility (a11y)
- Use semantic HTML: `<button>`, `<input>`, `<label>` with `htmlFor`
- Add `aria-label` to icon buttons
- Ensure color contrast ratios meet WCAG AA standards
- Test keyboard navigation (Tab, Enter, Escape)

## Testing
- Place tests next to components: `ComponentName.test.js`
- Use Jest and React Testing Library
- Test user interactions, not implementation details
- Mock Firebase services in tests

## Environment
- Use `.env.local` for secrets (never commit)
- `.env` for public variables
- Reference variables with `import.meta.env.VITE_*` in Vite

## Common Mistakes to Avoid
- ❌ Don't use `var`, always use `const` or `let`
- ❌ Don't forget error boundaries for robustness
- ❌ Don't mutate state directly; use setState hooks
- ❌ Don't remove ESLint or format code without running linter
- ❌ Don't hardcode Firebase config; use environment variables
- ❌ Don't forget `async`/`await` error handling for Firebase calls
