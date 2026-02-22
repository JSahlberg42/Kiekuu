# Copilot Instructions for Kiekuu

You are an expert developer building **Kiekuu**, the educational companion app for the Vaste ecosystem.

## Brand & Voice
- **Name:** Kiekuu.
- **Tone:** Professional, engaging, and tactical.
- **Synergy:** Kiekuu promotes the **Vaste** application. Include UI slots for Vaste-related call-to-actions (CTAs), especially after a user completes a level or a rank-up exam.
- **Visuals:** Use a tactical fire service aesthetic (dark mode, high-visibility orange/red accents). Avoid generic farmyard imagery; focus on the concept of "awakening skills" and professional rescue service symbols.

## Technical Rules
- **UI Framework:** React with Vite. Use **shadcn/ui** components and **Tailwind CSS**.
- **Icons:** Use `lucide-react`.
- **Database:** Firebase Firestore (v10+).
- **AI Integration:** Use `@firebase/vertex-ai` for "Smart Tutor" feedback.

## Domain Logic: Education & Ranks
- Ranks (levels) must strictly follow this order:
  1. `harjoittelija`
  2. `nuorempi sammutusmies`
  3. `sammutusmies`
  4. `vanhempi sammutusmies`
  5. `ryhmänjohtaja`
  6. `palokunnan päällikkö`
- Every question object MUST strictly adhere to this TypeScript interface:
  ```typescript
  interface Question {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string; // Base explanation
    source: {
      title: string;
      page?: string;
      url?: string;
    };
    level: 'harjoittelija' | 'nuorempi sammutusmies' | 'sammutusmies' | 'vanhempi sammutusmies' | 'ryhmänjohtaja' | 'palokunnan päällikkö';
    category: 'codes' | 'tactics' | 'first_aid' | 'law' | 'units';
  }