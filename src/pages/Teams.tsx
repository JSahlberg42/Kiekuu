import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeamSnapshot, createTeam, joinTeam, leaveTeam, invalidateTeamCache } from '../services/teamService';
import { logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import type { TeamDoc, TeamMemberSummary } from '../types/models';
import { Users, Trophy, Plus, LogOut, RefreshCw, Crown } from 'lucide-react';
import logo from '../assets/images/Kiekuu_logo.jpg';

function Teams() {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<{
    currentTeam: TeamDoc | null;
    topTeams: TeamDoc[];
    totalTeams: number;
    members: TeamMemberSummary[];
    teamPosition: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [joinId, setJoinId] = useState('');

  const load = useCallback(async (forceRefresh = false) => {
    if (!user?.uid) return;
    try {
      const data = await getTeamSnapshot(user.uid, { forceRefresh });
      setSnapshot(data);
    } catch (err) {
      logFirestoreErrorContext('Teams.load', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    load();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    if (user?.uid) {
      setRefreshing(true);
      load(true);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const { teamId } = await createTeam({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      setActionSuccess(`Joukkue "${createName.trim()}" luotu!`);
      setCreateName('');
      setCreateDesc('');
      setShowCreate(false);
      invalidateTeamCache(user!.uid);
      await load(true);
      void teamId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg.includes('already') || msg.includes('team')
        ? 'Olet jo joukkueessa. Poistu nykyisestä joukkueesta ensin.'
        : 'Joukkueen luonti epäonnistui.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await joinTeam({ teamId: joinId.trim() });
      setActionSuccess('Liityit joukkueeseen!');
      setJoinId('');
      setShowJoin(false);
      invalidateTeamCache(user!.uid);
      await load(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(
        msg.includes('not found') ? 'Joukkuetta ei löytynyt.' :
        msg.includes('full') ? 'Joukkue on täynnä.' :
        msg.includes('already') ? 'Olet jo joukkueessa.' :
        'Liittyminen epäonnistui.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Haluatko varmasti poistua joukkueesta?')) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await leaveTeam();
      setActionSuccess('Poistuit joukkueesta.');
      invalidateTeamCache(user!.uid);
      await load(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg.includes('not found') ? 'Joukkue ei löytynyt.' : 'Poistuminen epäonnistui.');
    } finally {
      setActionLoading(false);
    }
  };

  const dismissFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const formatScore = (n: number) => n.toLocaleString('fi-FI');

  const totalTeams = snapshot?.totalTeams ?? 0;
  const currentTeam = snapshot?.currentTeam;
  const members = snapshot?.members ?? [];
  const topTeams = snapshot?.topTeams ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <img src={logo} alt="Kiekuu" className="h-12 opacity-60 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Joukkueet</h1>
            {totalTeams > 0 && (
              <span className="text-sm text-gray-500 font-medium">{totalTeams} joukkuetta</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Päivitä"
            >
              <RefreshCw className={`w-5 h-5${refreshing ? ' animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">

        {/* Feedback banners */}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-green-800 font-medium">{actionSuccess}</span>
            <button onClick={dismissFeedback} className="text-green-600 hover:text-green-800 text-sm">Sulje</button>
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
            <span className="text-red-700">{actionError}</span>
            <button onClick={dismissFeedback} className="text-red-500 hover:text-red-700 text-sm">Sulje</button>
          </div>
        )}

        {/* Your team card */}
        {currentTeam ? (
          <section>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-5 h-5 text-orange-600" />
                    <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Sinun joukkueesi</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentTeam.name}</h2>
                  {currentTeam.description && (
                    <p className="text-gray-600 mt-1 text-sm">{currentTeam.description}</p>
                  )}
                </div>
                {snapshot?.teamPosition != null && (
                  <div className="text-right">
                    <div className="text-3xl font-black text-orange-600">#{snapshot.teamPosition}</div>
                    <div className="text-xs text-gray-500">kokonaissijoitus</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white rounded-xl p-3 text-center border border-orange-200">
                  <div className="text-xl font-black text-gray-900">{formatScore(currentTeam.totalScore)}</div>
                  <div className="text-xs text-gray-500 font-medium">pistettä</div>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-orange-200">
                  <div className="text-xl font-black text-gray-900">{currentTeam.memberCount}</div>
                  <div className="text-xs text-gray-500 font-medium">jäsentä</div>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border border-orange-200">
                  <div className="text-xl font-black text-gray-900">{formatScore(totalTeams)}</div>
                  <div className="text-xs text-gray-500 font-medium">joukkuetta yht.</div>
                </div>
              </div>

              {/* Members */}
              {members.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
                  <div className="px-4 py-2 bg-orange-50 border-b border-orange-200">
                    <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Jäsenet</span>
                  </div>
                  <ul>
                    {members.map((m, i) => (
                      <li key={m.uid} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
                        <span className="w-5 text-center text-xs font-bold text-gray-400">{i + 1}</span>
                        <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                          {m.photoURL
                            ? <img src={m.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                            : <span className="text-sm font-bold text-orange-700">{(m.displayName || '?')[0].toUpperCase()}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {m.uid === user?.uid ? 'Sinä' : (m.displayName || 'Anonyymi käyttäjä')}
                            {m.uid === currentTeam.createdBy && <Crown className="w-3.5 h-3.5 text-yellow-500 inline ml-1.5 -mt-0.5" aria-label=" Joukkueen luoja" />}
                          </div>
                          <div className="text-xs text-gray-400">{m.rank}</div>
                        </div>
                        <div className="text-sm font-bold text-gray-900">{formatScore(m.totalScore)}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleLeave}
                disabled={actionLoading}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                {actionLoading ? 'Poistetaan...' : 'Poistu joukkueesta'}
              </button>
            </div>
          </section>
        ) : (
          /* No team: CTA cards */
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">Et ole vielä joukkueessa</h2>
            </div>
            <p className="text-gray-600 text-sm mb-5">
              Luo oma joukkue tai liity olemassa olevaan. VPK-harjoituksissa voit kilpailla joukkueena ystäväsi kanssa!
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowCreate(true); setActionError(null); setActionSuccess(null); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Luo joukkue
              </button>
              <button
                onClick={() => { setShowJoin(true); setActionError(null); setActionSuccess(null); }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                <Users className="w-5 h-5" />
                Liity joukkueeseen
              </button>
            </div>
          </section>
        )}

        {/* Create team form */}
        {showCreate && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Luo uusi joukkue</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">Joukkueen nimi *</label>
                <input
                  id="team-name"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="esim. Oulun VPK"
                  maxLength={40}
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">{createName.length}/40 merkkiä</p>
              </div>
              <div>
                <label htmlFor="team-desc" className="block text-sm font-medium text-gray-700 mb-1">Kuvaus (valinnainen)</label>
                <textarea
                  id="team-desc"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Lyhyt kuvaus joukkueesta..."
                  maxLength={200}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{createDesc.length}/200 merkkiä</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={actionLoading || !createName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {actionLoading ? 'Luodaan...' : 'Luo joukkue'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setActionError(null); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Join team form */}
        {showJoin && (
          <section className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Liity joukkueeseen</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label htmlFor="team-id" className="block text-sm font-medium text-gray-700 mb-1">Joukkueen tunnus *</label>
                <input
                  id="team-id"
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  placeholder="Joukkueen Firestore-tunnus (teamId)"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={actionLoading || !joinId.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Liitytään...' : 'Liity joukkueeseen'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowJoin(false); setActionError(null); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Peruuta
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Top teams leaderboard */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Top 20 joukkuetta</h2>
          </div>

          {topTeams.length === 0 && !loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Ei vielä joukkueita.</p>
              <p className="text-gray-400 text-sm mt-1">Ole ensimmäinen ja luo oma joukkue!</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <ul>
                {topTeams.map((team, i) => {
                  const isCurrent = currentTeam?.id === team.id;
                  return (
                    <li
                      key={team.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${isCurrent ? 'bg-orange-50' : ''}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                        i === 0 ? 'bg-yellow-400 text-white' :
                        i === 1 ? 'bg-gray-300 text-white' :
                        i === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${isCurrent ? 'text-orange-700' : 'text-gray-900'}`}>
                          {team.name}
                          {isCurrent && <span className="ml-2 text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded font-medium">Sinun joukkueesi</span>}
                        </div>
                        <div className="text-xs text-gray-400">{team.memberCount} jäsentä</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">{formatScore(team.totalScore)}</div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default Teams;
