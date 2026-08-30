# Kiekuu

**Kiekuu** is a gamified learning platform designed for Finnish volunteer fire departments (VPK). It serves as a knowledge catalyst and theoretical foundation for the broader **Vaste** ecosystem.

The application follows the **Pelastusopisto Sopimushenkilöstön Opetussuunnitelma (OPS 2026)** — the official curriculum for volunteer and contract-based firefighting personnel — and draws additional material from other rescue services publications.

---

## 🚨 Why Kiekuu Exists

Firefighting training in Finland is fragmented. VPK members rely on a mix of:
- ✅ In-person harjoituksets (live drills — time-bound, no self-paced review)
- ❌ Paper handouts (outdated, no progression tracking)
- ❌ Koulumaali (Pelastusopisto's official LMS — authoritative but boring, requires org agreement)
- ❌ Random YouTube videos (unverified, no curriculum alignment)
- ❌ Quizlet/Kahoot (gamified but not OPS-specific)

**Kiekuu is the first gamified, OPS-aligned, self-paced platform in Finnish for VPK members.**

You can start learning immediately without registering — just pick a question and start answering. After your first level, sign in to save your progress.

---

## 🌟 Key Features

- **OPS-aligned progression:** Content is organized into levels that mirror a firefighter's career path and official course structure.
- **AI Tutor (Gemini 3.7 Flash):** When you get an answer wrong, Firebase AI explains why — grounded in official course materials.
- **Source citations:** Every answer includes a reference to official training materials or legislation.
- **Vaste integration:** Kiekuu builds the theoretical foundation so that operational work in the Vaste app flows smoothly.
- **Rank ladder:** Harjoittelija → Nuorempi sammutusmies → Sammutusmies → Vanhempi sammutusmies → Ryhmänjohtaja → Palokunnan päällikkö.
- **Difficulty levels:** Perustaso → Keskitaso → Edistynyt → Mestari. Higher difficulty = more points earned AND more points lost.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite (TypeScript) |
| **Styling** | Tailwind CSS + shadcn/ui (Mobile-first) |
| **Backend** | Firebase (Auth, Firestore, Cloud Functions, App Check) |
| **AI** | Vertex AI for Firebase (Gemini 3.7 Flash) |
| **Design** | Tactical Dark Mode — slate-950 bg, orange-500 primary, lucide-react icons |

---

## 📈 Rank Progression

| # | Rank | Scope |
|---|------|-------|
| 1 | **Harjoittelija** | Basics of firefighting, workplace safety, unit familiarization |
| 2 | **Nuorempi sammutusmies** | Start of Pelastustoiminnan peruskurssi, basic skills |
| 3 | **Sammutusmies** | Peruskurssi complete, fire fighting techniques, traffic rescue |
| 4 | **Vanhempi sammutusmies** | Advanced training, specialist skills, experience |
| 5 | **Ryhmänjohtaja** | Squad leader course (YS) — tactics, VIRVE comms, situational assessment |
| 6 | **Palokunnan päällikkö** | Administrative leadership, responsibilities, legislation |

---

## 🗂️ How to Contribute

### Reporting Bugs & Feature Requests

Use GitHub Issues for all bug reports and feature requests:

- **Bug report:** [Issue template](.github/ISSUE_TEMPLATE/bug_report.md) — include steps to reproduce, expected vs. actual behavior, and environment details.
- **Feature request:** [Issue template](.github/ISSUE_TEMPLATE/feature_request.md) — describe the feature, motivation, and proposed solution.

### Development Setup

```bash
# Clone and install dependencies
git clone https://github.com/JSahlberg42/Kiekuu.git
cd Kiekuu
npm ci

# Firebase Functions (separate install)
cd firebase/functions && npm ci && cd ../..

# Copy environment template
cp .env.example .env.local

# Run type checking and linting
npm run typecheck
npm run lint

# Build
npm run build
```

### Hard Constraints

- **TypeScript only in `src/`.** All `src/` code is TypeScript (`.ts`/`.tsx`), `strict: true`. Do not add `.js`/`.jsx` files under `src/`.
- **UI text is Finnish.** Code identifiers, comments, and documentation are English.
- **Mobile-first.** All UI follows the Tailwind mobile-first responsive design system.
- **Firebase gotchas:** `initializeAppCheck()` must run before `getAuth()`, `initializeFirestore()`, and `getAI()`. See `docs/APP_CHECK_SETUP.md`.

### Deployment

**Never deploy manually.** All deploys go through GitHub Actions:
- Push to `main` → production at `https://kiekuu-cb601.web.app`
- PRs → auto-deploy preview to `https://test-kiekuu.web.app` with a PR comment
- Firestore rules changes are deployed separately (`firebase deploy --only firestore:rules`)

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE.txt](LICENSE.txt) for details.

---

## 🙏 Thanks

- **Pelastusopisto** — for the OPS curriculum that makes this possible
- **SSPL** (Suomen Sopimuspalokuntien Liitto) — the voice of VPK firefighters
- **SPEK** (Suomen Pelastusalan Keskusjärjestö) — national training coordination
- **SPPL** (Suomen Palopäällystöliitto) — officer-level training materials
- **Gemini 3.7 Flash** — the AI that makes the Tutor possible

---

## 🗒️ Backlog

- Anonymous users: evaluate cleanup of stale accounts and revisit session reuse behavior (Firebase Auth persistence vs storing UID locally).
- Swedish language support (ruotsinkieliset VPK:t e.g. Borgå, Jakobstad).
- Integration proposal with Koulumaali (Pelastusopisto LMS).
- Mobile offline mode for fire station use.

---

## 🔗 Links

- **Live app:** https://kiekuu.apinalauma.fi
- **Preview app:** https://test-kiekuu.web.app (auto-deployed on PRs)
- **OPS 2026:** https://www.pelastusopisto.fi/wp-content/uploads/OPS_Sopimushenkilosto_2026.pdf
- **SSPL:** https://sspl.fi
- **SPEK:** https://spek.fi

---

## 📸 Logo

![Kiekuu logo](docs/logo/Kiekuu_logo.png)

---

*Built with ❤️ for Finnish volunteer firefighters by Jussi Sahlberg.*