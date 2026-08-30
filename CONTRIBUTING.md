# Contributing to Kiekuu

Thank you for your interest in contributing to Kiekuu! This document provides guidelines and instructions for contributing to this project.

---

## 🎯 Project Overview

Kiekuu is a gamified learning platform for Finnish volunteer fire departments (VPK). It follows the Pelastusopiston OPS 2026 curriculum and uses Firebase + Vertex AI (Gemini 3.7 Flash) to deliver a unique self-paced learning experience.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm
- A Firebase project (for local development)
- A Gemini API key (for AI Tutor feature)

### Setup

```bash
# Clone the repository
git clone https://github.com/JSahlberg42/Kiekuu.git
cd Kiekuu

# Install dependencies
npm ci

# Install Firebase Functions dependencies
cd firebase/functions && npm ci && cd ../..

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your Firebase config
# Required: VITE_FIREBASE_*, VITE_RECAPTCHA_ENTERPRISE_KEY
```

### Development Commands

```bash
npm run dev        # Start dev server (run locally)
npm run typecheck  # Run TypeScript type checking
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues
npm run build      # Build for production
```

---

## 📋 Reporting Bugs

**Use GitHub Issues for all bug reports.**

1. Check if the issue already exists (open or closed)
2. If not, create a new issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Include:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Device, browser, and app version
   - Error messages (if any)

---

## 💡 Suggesting Features

**Use GitHub Issues for all feature requests.**

1. Check if the feature already exists (open or closed)
2. If not, create a new issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Include:
   - Feature description and motivation
   - Proposed solution
   - Alternatives considered

---

## ✍️ Submitting Changes

### Branch Naming

- `fix/your-fix-description` — bug fixes
- `feat/your-feature-description` — new features
- `docs/your-doc-description` — documentation only
- `chore/your-task-description` — maintenance tasks

### Commit Messages

Follow conventional commits format:

```
feat: add new gamification level
fix: resolve App Check initialization order
docs: update README with OPS alignment
```

### Pull Request Process

1. Push your branch to GitHub
2. Open a PR against `main`
3. Ensure all CI checks pass (lint + typecheck)
4. A preview deploy to `test-kiekuu` will be created automatically
5. Request review from the maintainer

---

## 📝 Code Style

### Hard Constraints

- **TypeScript only in `src/`** — All `src/` code must be `.ts`/`.tsx`, `strict: true`
- **Firebase Functions and scripts** — remain plain JavaScript
- **UI text in Finnish** — All user-facing text in Finnish
- **Code identifiers and docs in English**

### Design Guidelines

- Follow the [Style Guide](STYLEGUIDE.md) — Tactical Dark Mode
- Mobile-first responsive design
- Use shadcn/ui components
- Use Tailwind CSS utility classes
- Use `lucide-react` icons
- Design tokens: `rounded-xl` (12px), `border border-slate-800`, orange-500 primary

### Firebase Specifics

- `initializeAppCheck()` must run before `getAuth()`, `initializeFirestore()`, and `getAI()`
- Firestore uses `memoryLocalCache()` (not persistent)
- Required env vars: `VITE_FIREBASE_*`, `VITE_RECAPTCHA_ENTERPRISE_KEY`

---

## 🏷️ Labels

Issues use the following labels:

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `enhancement` | New feature request |
| `needs-triage` | Needs review and prioritization |
| `documentation` | Documentation only |

---

## 📄 Documentation

- **README.md** — Project overview and quick start
- **AGENTS.md** — Development guidelines and constraints
- **STYLEGUIDE.md** — Design system and UI standards
- **docs/** — Technical documentation

---

## 📜 License

This project is licensed under the MIT License — see [LICENSE.txt](LICENSE.txt) for details.

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Recognition

Contributors will be credited in the project README and release notes.

---

*Made with ❤️ for Finnish volunteer firefighters.*