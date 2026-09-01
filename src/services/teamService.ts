/**
 * Team Service — VPK-friendly team competition.
 *
 * Cost profile per page load:
 *   - 1 count() for totalTeams
 *   - 1 getDoc for current user's team (by teamId, if any)
 *   - 1 getDocs(limit(20)) for top teams
 *   - 1 getAll([memberUids]) for member summaries (max 20 keys, batched)
 * = at most 4 reads per load; cached for 60s in sessionStorage.
 *
 * All writes (create/join/leave) go through Cloud Functions, never the client.
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
  where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import { isFirestoreOfflineError, logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import app from './firebase';
import type { TeamDoc, TeamMemberSummary, TeamSnapshot } from '../types/models';

const TEAMS_COLLECTION = 'teams';
const USERS_COLLECTION = 'users';
const CACHE_KEY_PREFIX = 'kiekuu:teamSnapshot:';
const CACHE_TTL_MS = 60_000;
const TOP_N = 20;
const MAX_MEMBERS = 50;

const functions = getFunctions(app);

interface CachedSnapshot {
  fetchedAt: number;
  snapshot: TeamSnapshot;
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

const writeCache = (uid: string, snapshot: TeamSnapshot): void => {
  try {
    sessionStorage.setItem(
      CACHE_KEY_PREFIX + uid,
      JSON.stringify({ fetchedAt: Date.now(), snapshot } satisfies CachedSnapshot),
    );
  } catch {
    // Non-fatal.
  }
};

const emptySnapshot = (): TeamSnapshot => ({
  currentTeam: null,
  topTeams: [],
  totalTeams: 0,
  members: [],
  teamPosition: null,
});

const loadMembers = async (uids: string[]): Promise<TeamMemberSummary[]> => {
  if (uids.length === 0) return [];
  const docs = await Promise.all(
    uids.slice(0, MAX_MEMBERS).map(async (uid) => {
      const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        displayName: data.displayName ?? null,
        totalScore: data.progress?.totalScore ?? 0,
        rank: data.rank ?? 'harjoittelija',
        photoURL: data.photoURL ?? null,
      } satisfies TeamMemberSummary;
    }),
  );
  return docs.filter((item) => item !== null);
};

/**
 * Fetch the team snapshot for the current user.
 * Cost: 4 reads max; cached 60s.
 */
export const getTeamSnapshot = async (
  currentUid: string,
  options: { forceRefresh?: boolean; knownTeamId?: string | null } = {},
): Promise<TeamSnapshot> => {
  if (!options.forceRefresh) {
    const cached = readCache(currentUid);
    if (cached) return cached.snapshot;
  }

  try {
    const [totalSnap, topSnap] = await Promise.all([
      getCountFromServer(collection(db, TEAMS_COLLECTION)),
      getDocs(
        query(
          collection(db, TEAMS_COLLECTION),
          orderBy('totalScore', 'desc'),
          limit(TOP_N),
        ),
      ),
    ]);

    const totalTeams = totalSnap.data().count;
    const topTeams: TeamDoc[] = topSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TeamDoc, 'id'>),
    }));

    // Determine the user's current team: from the explicit option, or query by uid.
    let currentTeam: TeamDoc | null = null;
    let teamPosition: number | null = null;
    if (options.knownTeamId) {
      const teamRef = doc(db, TEAMS_COLLECTION, options.knownTeamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        currentTeam = { id: teamSnap.id, ...(teamSnap.data() as Omit<TeamDoc, 'id'>) };
        // Position: count teams with strictly higher totalScore, plus 1.
        // Use the user's team totalScore (already loaded).
        const higherSnap = await getCountFromServer(
          query(
            collection(db, TEAMS_COLLECTION),
            where('totalScore', '>', currentTeam.totalScore),
          ),
        );
        teamPosition = (higherSnap.data().count || 0) + 1;
      }
    } else {
      // Discover the user's team via memberUids array-contains (single read).
      const membershipSnap = await getDocs(
        query(
          collection(db, TEAMS_COLLECTION),
          where('memberUids', 'array-contains', currentUid),
          limit(1),
        ),
      );
      if (!membershipSnap.empty) {
        const tDoc = membershipSnap.docs[0];
        currentTeam = { id: tDoc.id, ...(tDoc.data() as Omit<TeamDoc, 'id'>) };
        const higherSnap = await getCountFromServer(
          query(
            collection(db, TEAMS_COLLECTION),
            where('totalScore', '>', currentTeam.totalScore),
          ),
        );
        teamPosition = (higherSnap.data().count || 0) + 1;
      }
    }

    const members = currentTeam
      ? await loadMembers(currentTeam.memberUids || [])
      : [];

    const snapshot: TeamSnapshot = {
      currentTeam,
      topTeams,
      totalTeams,
      members,
      teamPosition,
    };

    writeCache(currentUid, snapshot);
    return snapshot;
  } catch (error) {
    logFirestoreErrorContext('getTeamSnapshot', error);
    console.error('Error fetching team snapshot:', error);
    if (isFirestoreOfflineError(error)) {
      throw error;
    }
    return emptySnapshot();
  }
};

export const invalidateTeamCache = (uid: string): void => {
  try {
    sessionStorage.removeItem(CACHE_KEY_PREFIX + uid);
  } catch {
    // Non-fatal.
  }
};

/**
 * Create a new team. Server-side enforced (CF createTeam).
 */
export const createTeam = async (input: {
  name: string;
  description?: string;
}): Promise<{ teamId: string }> => {
  const fn = httpsCallable<
    { name: string; description?: string },
    { teamId: string }
  >(functions, 'createTeam');
  const result = await fn({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
  });
  return result.data;
};

/**
 * Join an existing team. Server-side enforced (CF joinTeam).
 */
export const joinTeam = async (input: { teamId: string }): Promise<{ ok: true }> => {
  const fn = httpsCallable<{ teamId: string }, { ok: true }>(functions, 'joinTeam');
  const result = await fn({ teamId: input.teamId });
  return result.data;
};

/**
 * Leave the current team. Server-side enforced (CF leaveTeam).
 */
export const leaveTeam = async (): Promise<{ ok: true }> => {
  const fn = httpsCallable<Record<string, never>, { ok: true }>(functions, 'leaveTeam');
  const result = await fn({});
  return result.data;
};
