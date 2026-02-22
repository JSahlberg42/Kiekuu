import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStatistics, getCategoryStatistics } from '../services/quizService';
import logo from '../assets/images/Kiekuu_logo.jpg';

function ProgressDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userStats = await getUserStatistics(user.uid);
        const catStats = await getCategoryStatistics(user.uid);
        setStats(userStats);
        setCategoryStats(catStats);
      } catch (err) {
        setError('Tilastojen lataaminen epäonnistui');
        console.error('Error loading statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 80) return 'text-green-400';
    if (accuracy >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 h-16">
            <Link to="/" className="flex items-center gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain"
                style={{ backgroundImage: `url(${logo})` }}
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Kiekuu</h1>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/quiz"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 text-sm font-medium transition-colors"
              >
                Kyselyt
              </Link>
              <Link
                to="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 text-sm font-medium transition-colors"
              >
                Koti
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-slate-50 mb-2">Edistyminen</h2>
          <p className="text-slate-400">Tarkastu suorituksesi ja tilastosi</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-400">Ladataan tilastoja...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100 mb-8">
            {error}
          </div>
        )}

        {/* Overall Stats */}
        {!loading && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Rank Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Taso</p>
                <p className="text-3xl font-bold text-blue-400 capitalize">{stats.rank}</p>
              </div>

              {/* Total Score Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Kokonaispisteet</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalPoints}</p>
              </div>

              {/* Questions Answered Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Vastaukset</p>
                <p className="text-3xl font-bold text-purple-400">{stats.questionsAnswered}</p>
              </div>

              {/* Correct Answers Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Oikeat vastaukset</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.correctAnswers}</p>
              </div>

              {/* Accuracy Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-6">
                <p className="text-slate-400 text-sm mb-2">Tarkkuus</p>
                <p className={`text-3xl font-bold ${getAccuracyColor(stats.accuracy)}`}>{stats.accuracy}%</p>
              </div>
            </div>

            {/* Category Statistics */}
            {categoryStats.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-50 mb-4">Kategoriat</h3>
                <div className="space-y-4">
                  {categoryStats.map((cat) => (
                    <div
                      key={cat.category}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-slate-50 capitalize">{cat.category}</h4>
                          <p className="text-slate-400 text-sm mt-1">
                            {cat.answered} kysymystä · {cat.correct} oikein
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getAccuracyColor(cat.accuracy)}`}>
                            {cat.accuracy}%
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all"
                          style={{ width: `${cat.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Category State */}
            {categoryStats.length === 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
                <p className="text-slate-400 mb-4">Et ole vielä vastannut kategorioista</p>
                <Link
                  to="/quiz"
                  className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Aloita harjoittelua
                </Link>
              </div>
            )}

            {/* Call to Action */}
            <div className="text-center py-8">
              <Link
                to="/quiz"
                className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all"
              >
                Ratkaise lisää kyselyitä
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ProgressDashboard;
