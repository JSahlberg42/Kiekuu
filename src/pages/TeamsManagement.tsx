import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  adminListAllTeams,
  adminGetTeamMembers,
  adminKickMember,
  adminUpdateTeam,
  adminDeleteTeam,
} from '../services/adminTeamService';
import type {
  TeamDoc,
  TeamMemberSummary,
} from '../types/models';
import logo from '../assets/images/Kiekuu_logo.jpg';

interface TeamWithId extends TeamDoc {
  id: string;
}

interface TeamMember extends TeamMemberSummary {
  uid: string;
  email?: string | null;
}

interface TeamDetail {
  team: TeamDoc & { id: string };
  members: TeamMember[];
}

function TeamsManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [teams, setTeams] = useState<TeamWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // View members
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [viewingMembers, setViewingMembers] = useState(false);

  // Edit team
  const [editingTeam, setEditingTeam] = useState<TeamWithId | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete team
  const [deletingTeam, setDeletingTeam] = useState<TeamWithId | null>(null);

  // Kick member
  const [kickingMember, setKickingMember] = useState<{ teamId: string; uid: string; name: string } | null>(null);

  useEffect(() => {
    if (authLoading || userData?.role !== 'admin') return;
    let cancelled = false;

    adminListAllTeams()
      .then(({ teams: fetchedTeams }) => {
        if (cancelled) return;
        setTeams(fetchedTeams as TeamWithId[]);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError('Joukkeiden hakeminen epäonnistui.');
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userData?.role]);

  const refreshTeams = async () => {
    try {
      setError('');
      const { teams: fetchedTeams } = await adminListAllTeams();
      setTeams(fetchedTeams as TeamWithId[]);
    } catch (err) {
      setError('Joukkeiden hakeminen epäonnistui.');
      console.error(err);
    }
  };

  const handleViewMembers = async (team: TeamWithId) => {
    try {
      const detail = await adminGetTeamMembers(team.id);
      setSelectedTeam(detail as TeamDetail);
      setViewingMembers(true);
    } catch (err) {
      setError('Jäsenten hakeminen epäonnistui.');
      console.error(err);
    }
  };

  const handleKickMember = async () => {
    if (!kickingMember) return;
    setActionLoading(true);
    setError('');
    try {
      await adminKickMember(kickingMember.teamId, kickingMember.uid);
      // Refresh members list
      const detail = await adminGetTeamMembers(kickingMember.teamId);
      setSelectedTeam(detail as TeamDetail);
      // Also refresh teams list (member count changed)
      await refreshTeams();
      setKickingMember(null);
    } catch (err) {
      setError('Jäsenen poistaminen epäonnistui.');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTeam = async () => {
    if (!editingTeam || !editName.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await adminUpdateTeam(editingTeam.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      await refreshTeams();
      setEditingTeam(null);
    } catch (err) {
      setError('Joukkueen päivitys epäonnistui.');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setActionLoading(true);
    setError('');
    try {
      await adminDeleteTeam(deletingTeam.id);
      await refreshTeams();
      setDeletingTeam(null);
    } catch (err) {
      setError('Joukkueen poistaminen epäonnistui.');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (team: TeamWithId) => {
    setEditName(team.name);
    setEditDescription(team.description || '');
    setEditingTeam(team);
  };

  const formatScore = (n: number) => n.toLocaleString('fi-FI');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fi-FI', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Ei pääsyä</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 h-16">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Kiekuu" className="w-10 h-10 object-contain" />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Kiekuu</h1>
              <span className="text-sm font-medium text-amber-400 uppercase tracking-widest">Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 text-sm font-medium transition-colors min-h-[44px]"
              >
                ← Takaisin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">
            Joukkueiden hallinta
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
            Hallitse joukkueita ja niiden jäseniä
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl" role="alert">
            <p className="text-sm sm:text-base text-red-500">{error}</p>
          </div>
        )}

        {/* Teams List */}
        <div className="space-y-4">
          {teams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">Ei joukkueita.</p>
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-3 py-1 bg-orange-500/20 text-orange-400 rounded-lg text-xs font-medium">
                        #{teams.indexOf(team) + 1}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium">
                        {team.memberCount} jäsentä
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-slate-50 mb-1">{team.name}</h3>
                    {team.description && (
                      <p className="text-sm text-slate-400 mb-3">{team.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Luotu: {formatDate(team.createdAt)}</span>
                      <span>Joukkueen tunnus: <code className="text-slate-400 font-mono">{team.id}</code></span>
                    </div>

                    <div className="mt-3 flex items-center gap-4">
                      <div className="text-2xl font-black text-orange-500">{formatScore(team.totalScore)}</div>
                      <div className="text-sm text-slate-400">pistettä</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:gap-3 lg:shrink-0">
                    <button
                      onClick={() => handleViewMembers(team)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Näytä jäsenet: ${team.name}`}
                    >
                      Jäsenet
                    </button>
                    <button
                      onClick={() => openEditModal(team)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Muokkaa joukkuetta: ${team.name}`}
                    >
                      Muokkaa
                    </button>
                    <button
                      onClick={() => setDeletingTeam(team)}
                      className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Poista joukkue: ${team.name}`}
                    >
                      Poista
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View Members Modal */}
      {viewingMembers && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-50">{selectedTeam.team.name}</h2>
                <p className="text-sm text-slate-400 mt-1">{selectedTeam.members.length} jäsentä</p>
              </div>
              <button
                onClick={() => { setViewingMembers(false); setSelectedTeam(null); }}
                className="text-slate-400 hover:text-slate-50 text-2xl leading-none"
                aria-label="Sulje"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {selectedTeam.members.length === 0 ? (
                <div className="p-8 text-center text-slate-400">Ei jäseniä.</div>
              ) : (
                <ul className="divide-y divide-slate-700">
                  {selectedTeam.members.map((member, index) => (
                    <li key={member.uid} className="flex items-center gap-4 px-6 py-4">
                      <span className="w-6 text-center text-xs font-bold text-slate-500">{index + 1}</span>
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        {member.photoURL ? (
                          <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-orange-400">
                            {(member.displayName || '?')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-50 truncate">
                          {member.displayName || 'Anonyymi käyttäjä'}
                        </div>
                        <div className="text-xs text-slate-400">{member.rank}</div>
                        {member.email && (
                          <div className="text-xs text-slate-500">{member.email}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-slate-50">{formatScore(member.totalScore)}</div>
                        <div className="text-xs text-slate-400">pistettä</div>
                      </div>
                      <button
                        onClick={() => setKickingMember({
                          teamId: selectedTeam.team.id,
                          uid: member.uid,
                          name: member.displayName || member.email || member.uid,
                        })}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-slate-50 rounded-lg text-xs font-semibold transition-colors"
                        aria-label={`Poista jäsen: ${member.displayName || member.uid}`}
                      >
                        Poista
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-slate-50">Muokkaa joukkuetta</h2>
              <p className="text-sm text-slate-400 mt-1">{editingTeam.name}</p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleEditTeam(); }} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-team-name" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Joukkueen nimi *
                </label>
                <input
                  id="edit-team-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={40}
                  required
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                />
              </div>

              <div>
                <label htmlFor="edit-team-desc" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kuvaus
                </label>
                <textarea
                  id="edit-team-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-700 rounded-xl bg-slate-800 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading || !editName.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {actionLoading ? 'Tallennetaan...' : 'Tallenna'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px]"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-2">Poista joukkue</h2>
            <p className="text-slate-300 mb-1">
              Haluatko varmasti poistaa joukkueen <strong>{deletingTeam.name}</strong>?
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Tämä poistaa joukkueen ja kaikki sen jäsenet vapautuvat. Toimintoa ei voi perua.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteTeam}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] disabled:opacity-50"
              >
                {actionLoading ? 'Poistetaan...' : 'Poista joukkue'}
              </button>
              <button
                onClick={() => setDeletingTeam(null)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px]"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kick Member Confirmation Modal */}
      {kickingMember && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-2">Poista jäsen</h2>
            <p className="text-slate-300 mb-6">
              Haluatko varmasti poistaa käyttäjän <strong>{kickingMember.name}</strong> joukkueesta?
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleKickMember}
                disabled={actionLoading}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] disabled:opacity-50"
              >
                {actionLoading ? 'Poistetaan...' : 'Poista jäsen'}
              </button>
              <button
                onClick={() => setKickingMember(null)}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px]"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamsManagement;