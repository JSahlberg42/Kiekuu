# Kiekuu – Gamification Design Document

> This document describes the gamification system built into the Kiekuu quiz platform.
> It serves as a reference for ongoing development and as a specification when adding new features.

---

## 1. Overview

Kiekuu uses a points-and-rank system to motivate learners to progress through increasingly difficult quiz categories. Users start at the lowest rank, earn points by answering questions correctly, and unlock higher ranks and restricted categories as they improve.

Key principles:
- Easier questions are always accessible; harder questions are unlocked gradually.
- Correct answers earn positive points; wrong answers deduct points (negative scoring).
- Harder questions offer higher rewards **and** higher penalties.
- Rank advancement requires both a point threshold **and** a minimum accuracy rate.
- Answer order and question selection are randomized to prevent pattern memorization.

---

## 2. Difficulty Levels

There are **four difficulty levels**, ordered from easiest to hardest:

| Level | Finnish name | Description |
|-------|-------------|-------------|
| 1 | **perustaso** | Basic – introductory questions |
| 2 | **keskitaso** | Intermediate – moderate difficulty |
| 3 | **edistynyt** | Advanced – challenging questions |
| 4 | **mestari** | Master – expert-level questions |

All questions in the database carry a `difficulty` field set to one of these four values.

---

## 3. Scoring System

### 3.1 Points per correct answer (default values)

| Difficulty | Points earned |
|------------|--------------|
| perustaso  | +10          |
| keskitaso  | +20          |
| edistynyt  | +30          |
| mestari    | +50          |

### 3.2 Penalty per wrong answer (default values)

| Difficulty | Points deducted |
|------------|----------------|
| perustaso  | −2             |
| keskitaso  | −5             |
| edistynyt  | −10            |
| mestari    | −15            |

### 3.3 Configurability

All point values and penalties are configurable by admins through the **Platform Configuration** page (stored in `config/platform` in Firestore):

```js
{
  pointsPerDifficulty: {
    perustaso: 10,
    keskitaso: 20,
    edistynyt: 30,
    mestari: 50,
  },
  penaltyPerDifficulty: {
    perustaso: 2,
    keskitaso: 5,
    edistynyt: 10,
    mestari: 15,
  },
  minAccuracyForRankUp: 60,  // global default (%)
}
```

### 3.4 Score floor

User total scores can go negative. There is intentionally no floor at 0 – this reflects genuine difficulty and encourages careful answering.

---

## 4. Rank System

### 4.1 Rank data model

Each rank is stored in the Firestore `ranks` collection:

```js
{
  name: "Ekspertti",        // Display name
  description: "...",       // Optional description
  icon: "🏆",               // Emoji icon
  color: "#f59e0b",         // Hex color for UI theming
  requiredScore: 500,       // Minimum total score to qualify
  minAccuracy: 70,          // Optional: rank-specific min accuracy (%)
                            // If omitted, the platform-wide minAccuracyForRankUp is used
  createdAt: "ISO string",
  updatedAt: "ISO string",
}
```

### 4.2 Rank advancement rules

A user advances to a rank when **both** of the following are true:
1. `user.progress.totalScore >= rank.requiredScore`
2. `(correctAnswers / questionsAnswered) * 100 >= effectiveMinAccuracy`
   - `effectiveMinAccuracy = rank.minAccuracy ?? config.minAccuracyForRankUp ?? 60`

The system always assigns the **highest rank the user fully qualifies for** (i.e., the user does not skip ranks – they simply hold whichever rank has the highest threshold they meet).

### 4.3 Rank check timing

After every answered question:
1. `submitAnswer()` calls `updateUserProgress()` to persist the new score.
2. `checkAndUpdateUserRank()` is called with the updated progress.
3. If the earned rank differs from the stored rank, the user document is updated (`rank`, `rankId`, `rankUpdatedAt`).

### 4.4 User document schema (progress fields)

```js
{
  rank: "Harjoittelija",   // Display name of current rank
  rankId: "abc123",        // Firestore ID of current rank document
  progress: {
    totalScore: 150,       // Cumulative points (can be negative)
    questionsAnswered: 30, // Total questions answered
    correctAnswers: 22,    // Total correct answers
  }
}
```

---

## 5. Category Locking

### 5.1 How categories are locked

Each category document in Firestore may have an optional `requiredRankId` field:

```js
{
  name: "Historia",
  description: "...",
  requiredRankId: "rankDocumentId",  // null or absent = no restriction
}
```

A category is **locked** for a user when:
- `category.requiredRankId` is set, AND
- The user's `totalScore < requiredRank.requiredScore`

> Note: locking is score-based, not rank-name-based, to handle cases where ranks are reordered or renamed by admins.

### 5.2 UI behaviour

- Locked categories are displayed with a 🔒 icon and the required rank name.
- Locked category cards are greyed out and the "Aloita" button is disabled.
- All categories are visible; users can see what they need to unlock next.

---

## 6. Quiz Question Randomization

### 6.1 Question pool selection

When a quiz session starts for a category:
1. All published questions for that category are fetched.
2. If the user selected a specific difficulty filter, questions at **that difficulty or easier** are included (not harder).
3. Questions are shuffled randomly using the Fisher-Yates algorithm.
4. Up to `maxQuestionsPerQuiz` (default 10, configurable) questions are taken from the shuffled pool.

This means:
- A user playing the same category twice will likely see different questions.
- Users with access to all difficulty levels get a mixed-difficulty session (unless they filter).

### 6.2 Answer option randomization

For every question in a session, the four answer options (A, B, C, D) are shuffled independently. The `correctAnswerIndex` field is updated to reflect the new position of the correct answer after shuffling.

This prevents players from memorizing answer positions.

---

## 7. Difficulty Progression for New Users

New users are assigned the lowest rank by default. Since they start with 0 points:
- Only categories with no `requiredRankId` are accessible.
- The default quiz filter is "all difficulties", but randomization naturally includes more `perustaso` questions in categories that have them.
- Admins are encouraged to create categories with many `perustaso` questions for beginners.

There is no explicit "beginner mode" – the combination of locked categories and lower-difficulty questions in early categories provides a natural progression path.

---

## 8. Admin Controls

Admins can configure gamification through the admin panel:

| Location | Configurable settings |
|----------|-----------------------|
| Platform Configuration | Points/penalties per difficulty, global min accuracy for rank advancement, max questions per quiz |
| Rank Management | Create/edit/delete ranks; set required score and optional rank-specific min accuracy |
| Category Management | Set which rank is required to access each category |

---

## 9. Implementation Reference

| Component / File | Responsibility |
|-----------------|----------------|
| `src/services/gamificationService.js` | Point calculation, rank evaluation, question/option shuffling |
| `src/services/quizService.js` | `submitAnswer` (stores answer + points), `updateUserProgress`, `getAvailableQuizzes` |
| `src/pages/QuizBrowser.jsx` | Displays locked/unlocked categories based on user score |
| `src/pages/QuizTake.jsx` | Runs quiz with randomized questions and options, shows per-question point delta |
| `src/pages/PlatformConfiguration.jsx` | Admin UI for gamification settings |
| `src/pages/RankManagement.jsx` | Admin UI for rank CRUD with accuracy threshold |
| `src/pages/CategoryManagement.jsx` | Admin UI for category CRUD with required rank assignment |
| `src/pages/Progress.jsx` | User-facing statistics (score, accuracy, category breakdown) |

---

## 10. Future Considerations

- **Streak bonuses**: Award extra points for answering multiple questions correctly in a row.
- **Daily challenges**: Featured question packs that give bonus points when completed within 24 hours.
- **Leaderboard**: Public ranking of top users by total score.
- **Category-level progress tracking**: Track which questions a user has already answered per category and deprioritize repeated questions.
- **Timed questions**: Bonus points for fast correct answers (the `timeSpent` field is already stored).
- **Rank demotion**: Optionally demote users if their accuracy drops below a threshold over a rolling window.
