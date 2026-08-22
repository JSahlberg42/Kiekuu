import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../services/firebase';

function Statistics() {
  const { userData, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuestions: 0,
    totalCategories: 0,
    totalRanks: 0,
    usersByRank: {},
    recentUsers: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      fetchStatistics();
    }
  }, [authLoading, userData]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch counts
      const [usersCount, questionsCount, categoriesCount, ranksCount] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'questions')),
        getCountFromServer(collection(db, 'categories')),
        getCountFromServer(collection(db, 'ranks')),
      ]);

      // Fetch detailed user data for distribution
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = [];
      const rankDistribution = {};

      usersSnapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        users.push(userData);

        // Count users by rank
        const userRank = userData.rank || 'harjoittelija';
        rankDistribution[userRank] = (rankDistribution[userRank] || 0) + 1;
      });

      // Sort users by creation date (most recent first)
      const recentUsers = users
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        })
        .slice(0, 5);

      setStats({
        totalUsers: usersCount.data().count,
        totalQuestions: questionsCount.data().count,
        totalCategories: categoriesCount.data().count,
        totalRanks: ranksCount.data().count,
        usersByRank: rankDistribution,
        recentUsers,
      });
    } catch (err) {
      setError('Virhe tilastojen hakemisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-sm sm:text-base text-slate-400">Ladataan tilastoja...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">
              Tilastot
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
              Alustan analytiikka ja käyttötilastot
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
            aria-label="Takaisin hallintapaneeliin"
          >
            ← Takaisin
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl" role="alert">
            <p className="text-sm sm:text-base text-red-500">{error}</p>
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* Total Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Käyttäjät
                </p>
                <p className="text-3xl font-bold text-slate-50">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Questions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kysymykset
                </p>
                <p className="text-3xl font-bold text-slate-50">{stats.totalQuestions}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Categories */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kategoriat
                </p>
                <p className="text-3xl font-bold text-slate-50">{stats.totalCategories}</p>
              </div>
              <div className="p-3 bg-amber-400/20 rounded-xl">
                <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Ranks */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Arvot
                </p>
                <p className="text-3xl font-bold text-slate-50">{stats.totalRanks}</p>
              </div>
              <div className="p-3 bg-red-600/20 rounded-xl">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* User Distribution by Rank */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-6">
              Käyttäjäjakauma arvoittain
            </h2>
            {Object.keys(stats.usersByRank).length === 0 ? (
              <p className="text-sm text-slate-400">Ei dataa.</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.usersByRank)
                  .sort((a, b) => b[1] - a[1])
                  .map(([rank, count]) => {
                    const percentage = ((count / stats.totalUsers) * 100).toFixed(1);
                    return (
                      <div key={rank} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300 font-medium capitalize">{rank}</span>
                          <span className="text-slate-400">
                            {count} käyttäjää ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-orange-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Recent Users */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-6">
              Viimeisimmät käyttäjät
            </h2>
            {stats.recentUsers.length === 0 ? (
              <p className="text-sm text-slate-400">Ei käyttäjiä.</p>
            ) : (
              <div className="space-y-4">
                {stats.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-50 truncate">
                        {user.email || user.displayName || 'Anonyymi käyttäjä'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Arvo: <span className="capitalize">{user.rank || 'harjoittelija'}</span>
                      </p>
                    </div>
                    <div className="ml-4 text-xs text-slate-500 shrink-0">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('fi-FI') : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchStatistics}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px]"
            aria-label="Päivitä tilastot"
          >
            Päivitä tilastot
          </button>
        </div>
      </div>
    </div>
  );
}

export default Statistics;
