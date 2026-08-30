# AGENTS.md

Kiekuu: gamified quiz platform for Finnish volunteer fire departments (VPK). React 18 + Vite SPA backed entirely by Firebase (Auth, Firestore, App Check, AI Logic, Hosting).

## Commands

```bash
npm run dev        # do NOT start this yourself - the user runs the dev server
npm run lint       # eslint src (only check configured; no test suite)
npm run lint:fix
npm run typecheck  # tsc --noEmit, strict mode
npm run build      # vite build -> dist/
```

- There is no test framework installed (`tests/` is empty, no `test` script) despite what `.github/copilot/instructions.md` says about Jest. Verification = `npm run lint` + `npm run build`.
- Functions deps install separately: `cd firebase/functions && npm ci`.
- Admin CLI: `node scripts/promote-admin.js <email>` (requires local `firebase-service-account.json`, which is gitignored but present).

## Deployment - never deploy manually

- NEVER run `firebase deploy --only hosting`. All deploys go through GitHub Actions:
  - Push to `main` -> production site `kiekuu-cb601` (https://kiekuu-cb601.web.app).
  - PRs -> preview deploy to `test-kiekuu` (https://test-kiekuu.web.app) with a PR comment.
- Cloud Functions and Firestore rules/indexes deploy automatically via GitHub Actions too, **only when the relevant files change** (`dorny/paths-filter`): `firebase/functions/**`, `firestore.rules`, `firestore.indexes.json`. Functions/rules deploy to the single production project (`kiekuu-cb601`) even on PRs, so staging can test the backend.
- CI builds on Node 20 with secrets as `VITE_*` env vars. Env vars are baked in at build time - a missing var silently produces a broken bundle, not an error.

## Hard constraints

- **TypeScript for `src/`.** All `src/` code is TypeScript (`.ts`/`.tsx`), `strict: true`, gated by `npm run typecheck` in CI - do not add `.js/.jsx` files under `src/`. `firebase/functions/` and `scripts/` stay plain JavaScript.
- **UI text is Finnish; code identifiers and docs are English.**
- Follow `STYLEGUIDE.md` ("Tactical Dark Mode": slate-950 bg, orange-500 primary, `rounded-xl`, subtle `border-slate-800`, lucide-react icons) for all UI work.
- Mobile-first Tailwind responsive design.

## Firebase gotchas

- Init order in `src/services/firebase.ts` matters: `initializeAppCheck()` MUST run before `getAuth()`, `initializeFirestore()`, and `getAI()`. Otherwise requests go out without App Check tokens (shows 0% verified in console). See `docs/APP_CHECK_SETUP.md`.
- Dev runs App Check in debug-token mode (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`); set `VITE_APPCHECK_DEBUG_TOKEN` in `.env.local` to reuse a registered token.
- Firestore intentionally uses `memoryLocalCache()` to avoid IndexedDB lock/"client is offline" startup races - don't switch to persistent cache without understanding this.
- Required env vars in `.env.local`: `VITE_FIREBASE_*` (6 config vars), `VITE_RECAPTCHA_ENTERPRISE_KEY`, optionally `VITE_APPCHECK_DEBUG_TOKEN`, `VITE_DIAGNOSTICS`.

## Architecture

- `src/services/*.ts` - ALL Firestore/Auth/AI operations live here (authService, questionService, userService, gamificationService, aiService...). Pages/components call services, never raw Firestore.
- `src/context/AuthContext.tsx` - auth state provider; `ProtectedRoute` guards routes (`adminOnly` prop gates `/admin/*`).
- Routes in `src/App.tsx` are lazy-loaded; Landing/Login/SignUp are eager.
- `firebase/functions/index.js` - callable Cloud Functions incl. `submitFeedback` (which classifies feedback inline via Vertex AI / Gemini Flash at write time), `manageFeedback` (admin actions), and quiz scoring. Client-side AI (`src/services/aiService.ts`) uses `firebase/ai` (AI Logic) with URL-context for admin question generation.

## Domain model

- Rank order (career progression, used everywhere): `harjoittelija` -> `nuorempi sammutusmies` -> `sammutusmies` -> `vanhempi sammutusmies` -> `ryhmänjohtaja` -> `palokunnan päällikkö`.
- Question difficulty: `perustaso` -> `keskitaso` -> `edistynyt` -> `mestari`; higher difficulty = more points earned AND more points lost. Spec in `docs/GAMIFICATION.md`.
- New user docs must be created with `role: 'user'`, `rank: 'harjoittelija'` or Firestore rules reject the write.

## Code Organization

- **Components:** One component per file in `src/components/`
- **Pages:** Route components in `src/pages/`
- **Hooks:** Custom hooks in `src/hooks/` (e.g., `useAuth.ts`, `useFirestore.ts`)
- **Services:** Firebase operations in `src/services/` (e.g., `authService.ts`, `questionsService.ts`, `aiService.ts`)
- **Utils:** Pure utility functions in `src/utils/`
- **Context:** State management in `src/context/` (e.g., `AuthContext.tsx`)

## Component Patterns

- Use functional components with hooks
- Export default at bottom: `export default ComponentName;`
- Props destructuring at function signature
- Keep components focused and single-responsibility

## Firebase Patterns

- Always wrap Firebase calls in error handling (try-catch or `.catch()`)
- Use Firestore transactions for multi-document operations
- Implement loading states and error states in components
- Cache auth state in Context to prevent repeated checks

## Naming Conventions

- **Components:** PascalCase (e.g., `QuestionCard.tsx`)
- **Functions/Variables:** camelCase (e.g., `fetchQuestions`, `userScore`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_ATTEMPTS`, `API_TIMEOUT`)
- **Files:** kebab-case for utilities (e.g., `format-utils.ts`) or PascalCase for components

## Common Patterns

- **Auth check:** Use `useAuth` hook; redirect to `/login` if not authenticated
- **Error messages:** Use toast notifications for user feedback
- **Form handling:** Use controlled components with `useState` for form values
- **List rendering:** Always use unique `key` prop (use `id`, never array index)

## Common Mistakes to Avoid

- ❌ Don't use `var`, always use `const` or `let`
- ❌ Don't mutate state directly; use setState hooks
- ❌ Don't hardcode Firebase config; use environment variables (`VITE_FIREBASE_*`)
- ❌ Don't forget `async`/`await` error handling for Firebase calls
