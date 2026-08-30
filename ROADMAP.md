# Kiekuu Roadmap

This document tracks the strategic direction of the Kiekuu project. It is a living document, updated as priorities evolve.

---

## 🎯 Mission

Make Kiekuu the **primary self-paced learning platform** for all 706 Finnish volunteer fire departments (VPK) and their 33,500 members, complementing Pelastusopisto's official Koulumaali LMS.

---

## 🏆 North Star Metric

- **Monthly Active VPK Members** using Kiekuu as part of their training routine

---

## 📅 Release Cadence

- **Major releases:** Quarterly (every 3 months)
- **Minor releases:** Monthly
- **Hotfixes:** As needed

---

## ✅ Released (2025–2026)

### Q1 2025 — Foundation
- Initial Firebase setup (Auth, Firestore, Hosting)
- React + Vite SPA scaffold
- Basic quiz functionality

### Q2 2025 — Core Features
- Rank progression system
- AI Tutor integration (Gemini 2.5 Flash → 3.7 Flash)
- Source citations for answers
- Anonymous play mode

### Q3 2025 — Gamification
- Difficulty levels (perustaso, keskitaso, edistynyt, mestari)
- Points economy
- Achievement system
- User profiles

### Q4 2025 — Polish
- Server-authoritative quiz scoring
- Rank rename backfill
- Rate limiting for feedback
- App Check integration

### Q1 2026 — Quality
- Full TypeScript migration
- Server-authoritative scoring
- Admin tools (user management, rank management)
- Bug fixes and performance improvements

### Q2 2026 — AI Enhancement
- Gemini 3.7 Flash upgrade
- Improved AI Tutor responses
- Source citation accuracy

### Q3 2026 (Current) — Polish & Foundation
- GitHub repo polish (bilingual README, issue templates, contributing guide)
- Landing page rewrite
- Stakeholder outreach preparation

---

## 🔄 In Progress (Q3 2026)

### GitHub Repository
- Bilingual README (Finnish + English) ✅
- Issue templates (bug report, feature request) ✅
- Contributing guide ✅
- Code of Conduct ✅
- Topics and discoverability
- GitHub Pages demo

### Landing Page
- Value proposition rewrite
- OPS alignment section
- Demo screenshot/GIF
- Swedish language support (sv-FI)

---

## 📋 Q4 2026 — Pilot Phase

### Goal
Onboard 5 friendly VPK units for structured pilot testing.

### Deliverables
- 5 VPK pilot agreements
- Pilot VPK dashboard
- Feedback collection system
- Weekly usage reports

### Success Metrics
- 5 VPKs actively using
- ≥ 50 firefighters per VPK
- 70% weekly retention

---

## 📋 Q1 2027 — Funding Application

### Goal
Secure first funding source (Palosuojelurahasto PSR).

### Deliverables
- PSR 2027 application submission
- Project concept document
- Budget and timeline
- Letters of support from 5+ VPKs

---

## 📋 Q2–Q3 2027 — Scale

### Goal
Expand to 50+ VPK units and pursue EU/Interreg funding.

### Deliverables
- SSPL partnership announcement
- Pelastusliitto rollout
- EU funding application
- Koulumaali integration proposal

### Success Metrics
- 50+ VPKs onboarded
- 1,000+ active users
- 1 EU/PSR funding secured

---

## 📋 Q4 2027 — Platform

### Goal
Establish Kiekuu as a recognized platform in Finnish rescue services.

### Deliverables
- Public launch
- Marketing materials
- Conference presentations (SPEK, SPPL)
- Sustainability plan

---

## 🔮 Future Ideas (Backlog)

- **Mobile apps** — iOS and Android via React Native
- **Offline mode** — for fire station use with poor connectivity
- **Multiplayer challenges** — between VPK units
- **Live incident training** — real-time scenarios
- **Voice input** — for hands-free training during equipment checks
- **Swedish language** — for ruotsinkieliset VPK:t
- **Integration with VIRVE** — actual radio traffic practice
- **AR/VR training** — for advanced incident response

---

## 🗒️ Backlog (Tactical)

- Anonymous users: evaluate cleanup of stale accounts and revisit session reuse behavior (Firebase Auth persistence vs storing UID locally)
- Re-evaluate Gemini 4 Flash when available
- Consider switching to persistent Firestore cache now that the startup race has been resolved
- Add more OPS-aligned questions
- Swedish language support (ruotsinkieliset VPK:t)

---

## 📖 GitHub Pages — User Manual (MVP)

GitHub Pages serves as the public-facing user manual at `https://JSahlberg42.github.io/Kiekuu`.

### Structure

```
docs/manual/
├── index.md                       # Manual home
├── getting-started/
│   ├── index.md                   # Getting started overview
│   ├── signup.md                  # Account creation
│   ├── first-steps.md             # First questions, rank progression
│   └── faq.md                     # Frequently asked questions
├── ranks/
│   ├── harjoittelija.md           # Harjoittelija level
│   ├── nuorempi-sammutusmies.md   # Nuorempi sammutusmies level
│   ├── sammutusmies.md            # Sammutusmies level
│   ├── vanhempi-sammutusmies.md   # Vanhempi sammutusmies level
│   ├── ryhmanjohtaja.md           # Ryhmänjohtaja level
│   └── palokunnan-paallikko.md    # Palokunnan päällikkö level
└── technical/                     # TBD in Sprint 2
```

### Publishing
- GitHub Pages hosts from `docs/manual/` on `main` branch
- Content in Finnish (native language of target users)
- PR-based previews via `test-kiekuu.web.app` (manual can be linked from there)

### MVP Scope (Sprint 1)
- [x] `docs/manual/index.md` — Manual home page
- [x] `docs/manual/getting-started/` — 4 starter pages
- [x] `docs/manual/ranks/` — 6 rank overviews
- [ ] `docs/manual/technical/` — Technical documentation (Sprint 2)
- [ ] GitHub Pages config and workflow setup (Sprint 2)
- [ ] Custom domain (e.g., `manual.kiekuu.fi`) if available (Sprint 2)

### Future Phases
- **Phase 2:** FAQ expansion, troubleshooting guides
- **Phase 3:** OPS curriculum deep-dives per course
- **Phase 4:** Video walkthroughs, downloadable resources

### Decision Notes
- GitHub Pages chosen over Firebase Hosting for documentation: static content, no auth needed, easy Git-based workflow, free hosting
- Firebase Hosting continues to serve the app itself at root domain
- Manual and app are separate concerns; manual lives on GitHub Pages without affecting app

---

## 🤝 Get Involved

Want to contribute? See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

*Last updated: 2026-08-30*