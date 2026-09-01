import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import type {
  TeamDoc,
  TeamMemberSummary,
} from '../types/models';

export interface AdminTeamListResponse {
  teams: TeamDoc[];
}

export interface AdminTeamMembersResponse {
  team: TeamDoc;
  members: (TeamMemberSummary & { uid: string })[];
}

export interface AdminKickMemberResponse {
  ok: true;
}

export interface AdminUpdateTeamResponse {
  ok: true;
}

export interface AdminDeleteTeamResponse {
  ok: true;
}

/**
 * Admin API: list all teams
 */
export const adminListAllTeams = async (
  limitCount?: number,
): Promise<AdminTeamListResponse> => {
  const functions = getFunctions(app);
  const fn = httpsCallable<{ limit?: number }, AdminTeamListResponse>(
    functions,
    'adminListAllTeams',
  );

  const data: { limit?: number } = {};
  if (typeof limitCount === 'number') data.limit = limitCount;

  const result = await fn(data);
  return result.data;
};

/**
 * Admin API: get team members for a given teamId
 */
export const adminGetTeamMembers = async (
  teamId: string,
): Promise<AdminTeamMembersResponse> => {
  const functions = getFunctions(app);
  const fn = httpsCallable<{ teamId: string }, AdminTeamMembersResponse>(
    functions,
    'adminGetTeamMembers',
  );

  const result = await fn({ teamId });
  return result.data;
};

/**
 * Admin API: kick a member from a team
 */
export const adminKickMember = async (
  teamId: string,
  uid: string,
): Promise<AdminKickMemberResponse> => {
  const functions = getFunctions(app);
  const fn = httpsCallable<{ teamId: string; uid: string }, AdminKickMemberResponse>(
    functions,
    'adminKickMember',
  );

  const result = await fn({ teamId, uid });
  return result.data;
};

/**
 * Admin API: update team name/description
 */
export const adminUpdateTeam = async (
  teamId: string,
  updates: Partial<Pick<TeamDoc, 'name' | 'description'>>,
): Promise<AdminUpdateTeamResponse> => {
  const functions = getFunctions(app);
  const fn = httpsCallable<
    { teamId: string } & Partial<Pick<TeamDoc, 'name' | 'description'>>,
    AdminUpdateTeamResponse
  >(functions, 'adminUpdateTeam');

  const data = { teamId, ...updates };
  const result = await fn(data);
  return result.data;
};

/**
 * Admin API: delete a team
 */
export const adminDeleteTeam = async (
  teamId: string,
): Promise<AdminDeleteTeamResponse> => {
  const functions = getFunctions(app);
  const fn = httpsCallable<{ teamId: string }, AdminDeleteTeamResponse>(
    functions,
    'adminDeleteTeam',
  );

  const result = await fn({ teamId });
  return result.data;
};