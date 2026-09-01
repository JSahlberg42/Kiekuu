/**
 * Leaderboard Service — anonymous personal scoreboard (Layer 1).
 *
 * Cost-bounded reads:
 *   - Bounded cache (60s, sessionStorage) — 1 read per ~minute per session
 *   - One getCountFromServer for totalUsers
 *   - One getDoc for the current user's own entry
 *   - One getDocs(limit(10)) for top entries
 *
 * No client writes — the syncLeaderboard Cloud Function owns all writes
 * to the `leaderboard` collection.
 */

import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebase';
import { isFirestoreOfflineError, logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import type { LeaderboardEntry, LeaderboardSnapshot } from '../types/models';

const COLLECTION = 'leaderboard';
const CACHE_KEY_PREFIX = 'kiekuu:leaderboard:';
const CACHE_TTL_MS = 60_000; // 60 seconds
const TOP_N = 10;

interface CachedSnapshot {
  fetchedAt: number;
  snapshot: LeaderboardSnapshot;
}

const readCache = (uid: string): CachedSnapshot | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSnapshot;
    if (!parsed?.fetchedAt || Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (uid: string, snapshot: LeaderboardSnapshot): void => {
  try {
    sessionStorage.setItem(
      CACHE_KEY_PREFIX + uid,
      JSON.stringify({ fetchedAt: Date.now(), snapshot } satisfies CachedSnapshot),
    );
  } catch {
    // sessionStorage unavailable (private mode etc.) — non-fatal
  }
};

const computePercentile = (position: number, total: number): number => {
  if (total === 0) return 0;
  // With a single user, position = 1 and total = 1 → 100% (top of the pool).
  if (total === 1) return 100;
  // Higher percentile = better rank. position 1 → top.
  return Math.round(((total - position) / (total - 1)) * 100);
};

/**
 * Fetch the leaderboard snapshot for the current user.
 *
 * Cost: 1 count + 1 getDoc + 1 getDocs(limit(10)) = at most 3 reads.
 * Cached for 60s in sessionStorage to avoid repeat reads within a session.
 */
export const getLeaderboardSnapshot = async (
  currentUid: string,
  options: { forceRefresh?: boolean } = {},
): Promise<LeaderboardSnapshot> => {
  if (!options.forceRefresh) {
    const cached = readCache(currentUid);
    if (cached) return cached.snapshot;
  }

  const emptySnapshot: LeaderboardSnapshot = {
    currentEntry: null,
    topEntries: [],
    totalUsers: 0,
    percentile: null,
  };

  try {
    const [totalSnap, ownSnap, topSnap] = await Promise.all([
      getCountFromServer(collection(db, COLLECTION)),
      getDoc(doc(db, COLLECTION, currentUid)),
      getDocs(
        query(collection(db, COLLECTION), orderBy('totalScore', 'desc'), limit(TOP_N)),
      ),
    ]);

    const totalUsers = totalSnap.data().count;
    const ownData = ownSnap.exists() ? (ownSnap.data() as LeaderboardEntry) : null;
    const ownEntry: LeaderboardEntry | null = ownData
      ? { ...ownData, uid: currentUid }
      : null;

    const topEntries: LeaderboardEntry[] = topSnap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as Omit<LeaderboardEntry, 'uid'>),
    }));

    const position = ownEntry?.position ?? null;
    const percentile =
      ownEntry && position != null ? computePercentile(position, totalUsers) : null;

    const snapshot: LeaderboardSnapshot = {
      currentEntry: ownEntry,
      topEntries,
      totalUsers,
      percentile,
    };

    writeCache(currentUid, snapshot);
    return snapshot;
  } catch (error) {
    logFirestoreErrorContext('getLeaderboardSnapshot', error);
    console.error('Error fetching leaderboard snapshot:', error);
    if (isFirestoreOfflineError(error)) {
      throw error;
    }
    return emptySnapshot;
  }
};

/**
 * Invalidate the cached snapshot for the given uid. Used after a quiz
 * submission so the next page load picks up the new score.
 */
export const invalidateLeaderboardCache = (uid: string): void => {
  try {
    sessionStorage.removeItem(CACHE_KEY_PREFIX + uid);
  } catch {
    // Non-fatal.
  }
};
