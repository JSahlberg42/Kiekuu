#!/usr/bin/env node

/**
 * Rank Backfill Script
 *
 * Recomputes every user's rank from their progress and rewrites the
 * denormalized {rank, rankId} pair when it disagrees with the rank ladder.
 * Repairs stale names left behind by rank renames and users promoted past
 * a missing entry rank.
 *
 * Usage:
 *   node scripts/backfill-ranks.js           # dry run, prints planned changes
 *   node scripts/backfill-ranks.js --apply   # writes changes
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APPLY = process.argv.includes('--apply');
const DEFAULT_MIN_ACCURACY_FOR_RANK_UP = 60;

let app;
try {
  const serviceAccount = JSON.parse(
    await readFile(join(__dirname, '../firebase-service-account.json'), 'utf8')
  );
  app = initializeApp({ credential: cert(serviceAccount) });
} catch {
  console.error('❌ Error: Could not load firebase-service-account.json');
  process.exit(1);
}

const db = getFirestore(app);

async function main() {
  const [ranksSnap, configSnap, usersSnap] = await Promise.all([
    db.collection('ranks').get(),
    db.collection('config').doc('platform').get(),
    db.collection('users').get(),
  ]);

  if (ranksSnap.empty) {
    console.error('❌ No ranks found in ranks collection');
    process.exit(1);
  }

  const config = configSnap.exists ? configSnap.data() || {} : {};
  const globalMinAccuracy =
    config.minAccuracyForRankUp ?? DEFAULT_MIN_ACCURACY_FOR_RANK_UP;

  const ranks = ranksSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.requiredScore || 0) - (b.requiredScore || 0));

  console.log(`Ranks (${ranks.length}):`);
  for (const r of ranks) {
    console.log(
      `  ${r.name} - requiredScore=${r.requiredScore ?? 0} minAccuracy=${r.minAccuracy ?? globalMinAccuracy}`
    );
  }
  console.log('');

  const now = new Date().toISOString();
  const changes = [];
  let skipped = 0;

  for (const doc of usersSnap.docs) {
    const user = doc.data();
    const progress = user.progress || {};
    const score = progress.totalScore || 0;
    const answered = progress.questionsAnswered || 0;
    const correct = progress.correctAnswers || 0;
    const accuracy = answered > 0 ? (correct / answered) * 100 : 0;

    let earned = ranks[0];
    for (const rank of ranks) {
      const minAccuracy = rank.minAccuracy ?? globalMinAccuracy;
      if (score >= (rank.requiredScore || 0) && accuracy >= minAccuracy) {
        earned = rank;
      }
    }

    if (!earned) continue;
    if (user.rankId === earned.id && user.rank === earned.name) {
      skipped++;
      continue;
    }

    changes.push({
      uid: doc.id,
      displayName: user.displayName || user.email || '(anonymous)',
      score,
      answered,
      accuracy: Math.round(accuracy),
      oldRankId: user.rankId || null,
      oldRank: user.rank || null,
      newRankId: earned.id,
      newRank: earned.name,
    });
  }

  console.log(`${usersSnap.size} users scanned, ${skipped} already correct, ${changes.length} to update\n`);

  for (const c of changes) {
    const oldLabel = `${c.oldRank || '-'} (${c.oldRankId || '-'})`;
    console.log(
      `${APPLY ? '✏️ ' : '📝'} ${c.uid.slice(0, 8)} ${c.displayName} | ${c.score} pts / ${c.answered} ans / ${c.accuracy}% | ${oldLabel} -> ${c.newRank}`
    );
  }

  if (!changes.length) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to write these changes.');
    process.exit(0);
  }

  let batch = db.batch();
  let ops = 0;
  for (const c of changes) {
    batch.update(db.collection('users').doc(c.uid), {
      rank: c.newRank,
      rankId: c.newRankId,
      rankUpdatedAt: now,
    });
    if (++ops === 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`\n🎉 Backfilled ${changes.length} user docs.`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error.message);
  process.exit(1);
});
