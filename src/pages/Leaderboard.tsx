import { useEffect, useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLeaderboardSnapshot } from '../services/leaderboardService';
import { logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import type { LeaderboardSnapshot } from '../types/models';
import { Trophy, Medal, Award, RefreshCw } from 'lucide-react';
import logo from '../assets/images/Kiekuu_logo.jpg';

const formatScore = (score: number): string => score.toLocaleString('fi-FI');

const formatPosition = (position: number | undefined): string => {
  if (position == null) return '—';
  return `${position}.`;
};

const percentileCopy = (percentile: number | null): string => {
  if (percentile == null) return 'Et ole vielä tulostaulukossa.';
  if (percentile >= 90) return 'Top 10% — erinomaista työtä!';
  if (percentile >= 75) return 'Top 25% — vahvaa suorittamista.';
  if (percentile >= 50) return 'Olet keskikastia parempi.';
  return 'Jatka harjoittelua — nousu on mahdollista.';
};

function Leaderboard() {
  const { user, userData } = useAuth();
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;
      if (forceRefresh) setRefreshing(true);
      try {
        const data = await getLeaderboardSnapshot(user.uid, { forceRefresh });
        setSnapshot(data);
        setError(null);
      } catch (err) {
        logFirestoreErrorContext('Leaderboard.load', err);
        setError('Tulostaulukon lataaminen epäonnistui');
        console.error(err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!user?.uid || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    load();
  }, [user?.uid, load]);

  const handleRefresh = () => {
    if (user?.uid) load(true);
  };

  const totalUsers = snapshot?.totalUsers ?? 0;
  const currentEntry = snapshot?.currentEntry ?? null;
  const currentPosition = currentEntry?.position ?? null;
  const isOnLeaderboard = currentEntry != null;
  const isCurrentUserTop =
    currentPosition != null && currentPosition <= (snapshot?.topEntries.length ?? 0);

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 h-16">
            <Link to="/" className="flex items-center gap-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain"
                style={{ backgroundImage: `url(${logo})` }}
                aria-hidden="true"
              />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">
                Kiekuu
              </h1>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-50 text-sm font-medium transition-colors"
              >
                Koti
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-50">
              Tulostaulukko
            </h2>
            <p className="text-slate-400 mt-2">
              Anonyymi vertailu — vain sinä näet sijoituksesi.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl text-slate-50 text-sm font-medium transition-colors min-h-[44px]"
            aria-label="Päivitä tulostaulukko"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Päivitä
          </button>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl" role="alert">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-16" role="status" aria-live="polite">
            <div className="text-center">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"
                aria-hidden="true"
              />
              <p className="text-slate-400">Ladataan tulostaulukkoa...</p>
            </div>
          </div>
        )}

        {!loading && snapshot && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Your stats */}
              <div className="bg-linear-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Trophy className="w-6 h-6 text-orange-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50">Sinun tilastosi</h3>
                </div>

                {isOnLeaderboard ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                          Pisteet
                        </p>
                        <p className="text-3xl font-bold text-orange-500">
                          {formatScore(currentEntry!.totalScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                          Sija
                        </p>
                        <p className="text-3xl font-bold text-slate-50">
                          {formatPosition(currentPosition!)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                          Taso
                        </p>
                        <p className="text-lg font-semibold text-slate-50 capitalize">
                          {currentEntry!.rank}
                        </p>
                      </div>
                    </div>
                    <p className="mt-6 text-sm text-slate-300">
                      {percentileCopy(snapshot.percentile)}
                    </p>
                  </>
                ) : (
                  <div className="py-6">
                    <p className="text-slate-300 mb-2">
                      Et ole vielä tulostaulukossa.
                    </p>
                    <p className="text-sm text-slate-400 mb-6">
                      Pisteet päivittyvät automaattisesti ensimmäisen vastauskerran
                      jälkeen.
                    </p>
                    <Link
                      to="/quiz"
                      className="inline-block px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-slate-50 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Aloita kysely
                    </Link>
                  </div>
                )}
              </div>

              {/* How you compare */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Award className="w-6 h-6 text-blue-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-50">Miten vertaudut</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                      Käyttäjää tulostaulukossa
                    </p>
                    <p className="text-3xl font-bold text-slate-50">
                      {formatScore(totalUsers)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">
                      Oma sijoittumisesi
                    </p>
                    <p className="text-3xl font-bold text-slate-50">
                      {isOnLeaderboard && snapshot.percentile != null
                        ? `${snapshot.percentile}%`
                        : '—'}
                    </p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Sijoituksesi päivittyy automaattisesti jokaisen vastauksen jälkeen.
                  Käyttäjien nimet eivät näy tulostaulukossa.
                </p>
              </div>
            </div>

            {/* Top entries */}
            <section
              aria-labelledby="top-entries-heading"
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8"
            >
              <h3
                id="top-entries-heading"
                className="text-xl font-bold text-slate-50 mb-6"
              >
                Top 10
              </h3>

              {snapshot.topEntries.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  Tulostaulukko on vielä tyhjä. Ole ensimmäinen!
                </p>
              ) : (
                <ol className="space-y-2">
                  {snapshot.topEntries.map((entry) => {
                    const isCurrent =
                      userData?.uid === entry.uid || user?.uid === entry.uid;
                    const position = entry.position ?? 0;
                    const Icon =
                      position === 1
                        ? Trophy
                        : position === 2
                          ? Medal
                          : position === 3
                            ? Award
                            : null;
                    const iconColor =
                      position === 1
                        ? 'text-amber-400'
                        : position === 2
                          ? 'text-slate-300'
                          : position === 3
                            ? 'text-orange-700'
                            : 'text-slate-500';

                    return (
                      <li
                        key={entry.uid}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                          isCurrent
                            ? 'bg-orange-500/10 border-orange-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <span
                            className={`w-8 text-center text-lg font-bold shrink-0 ${
                              isCurrent ? 'text-orange-500' : 'text-slate-300'
                            }`}
                          >
                            {formatPosition(position)}
                          </span>
                          {Icon ? (
                            <Icon
                              className={`w-5 h-5 shrink-0 ${iconColor}`}
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="w-5 shrink-0" aria-hidden="true" />
                          )}
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                isCurrent ? 'text-orange-500' : 'text-slate-50'
                              }`}
                            >
                              {isCurrent ? 'Sinä' : 'Anonyymi käyttäjä'}
                            </p>
                            <p className="text-xs text-slate-400 capitalize">
                              {entry.rank}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-base font-bold shrink-0 ml-4 ${
                            isCurrent ? 'text-orange-500' : 'text-slate-50'
                          }`}
                        >
                          {formatScore(entry.totalScore)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}

              {isOnLeaderboard && !isCurrentUserTop && (
                <p className="mt-6 text-sm text-slate-400 text-center">
                  Et ole top 10:ssä — vielä. Jatka harjoittelua!
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Leaderboard;
