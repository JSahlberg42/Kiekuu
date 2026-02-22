# Copilot Instructions for Kiekuu

You are an expert developer building **Kiekuu** using **JavaScript (ES6+)**.

## Technical Rules
- **No TypeScript:** Use plain JavaScript. Avoid any .ts or .tsx files.
- **UI Framework:** React with Vite (using .js and .jsx files).
- **Component Library:** Use **shadcn/ui** and **Tailwind CSS**.
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