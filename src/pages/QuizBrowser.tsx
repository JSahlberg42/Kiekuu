import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableQuizzes } from '../services/quizService';
import { getAllRanks } from '../services/rankService';
import { logQuizStarted } from '../services/analyticsService';
import type { QuizCard, Rank } from '../types/models';
import logo from '../assets/images/Kiekuu_logo.jpg';

function QuizBrowser() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizCard[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('kaikki');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [data, fetchedRanks] = await Promise.all([
          getAvailableQuizzes(),
          getAllRanks(),
        ]);
        setQuizzes(data);
        setRanks(fetchedRanks);
      } catch (err) {
        setError('Kyselyiden lataaminen epäonnistui');
        console.error('Error loading quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const userScore = userData?.progress?.totalScore ?? 0;

  /**
   * Determine whether the user has access to a category.
   * Access is granted when:
   *   - The category has no requiredRankId, OR
   *   - The user's totalScore >= the required rank's requiredScore
   */
  const isCategoryLocked = (quiz: QuizCard) => {
    if (!quiz.requiredRankId) return false;
    const requiredRank = ranks.find(r => r.id === quiz.requiredRankId);
    if (!requiredRank) return false;
    return userScore < requiredRank.requiredScore;
  };

  const getRequiredRankName = (quiz: QuizCard) => {
    if (!quiz.requiredRankId) return null;
    return ranks.find(r => r.id === quiz.requiredRankId)?.name || null;
  };

  const handleStartQuiz = (quiz: QuizCard) => {
    if (isCategoryLocked(quiz)) return;
    logQuizStarted(quiz.id, quiz.name, selectedDifficulty !== 'kaikki' ? selectedDifficulty : null);
    const params = new URLSearchParams();
    params.append('categoryId', quiz.id);
    params.append('category', quiz.name);
    if (selectedDifficulty !== 'kaikki') {
      params.append('difficulty', selectedDifficulty);
    }
    navigate(`/quiz/take?${params.toString()}`);
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
                to="/progress"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 text-sm font-medium transition-colors"
              >
                Edistyminen
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
          <h2 className="text-4xl font-bold text-slate-50 mb-2">Valitse kategoria</h2>
          <p className="text-slate-400">
            Taso: <span className="font-semibold text-slate-300">{userData?.rank || 'harjoittelija'}</span>
            {' · '}Pisteet: <span className="font-semibold text-blue-400">{userScore}</span>
          </p>
        </div>

        {/* Difficulty Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          {[
            { key: 'kaikki', label: 'Kaikki tasot', active: 'bg-blue-600', inactive: 'bg-slate-800 text-slate-300 hover:bg-slate-700' },
            { key: 'perustaso', label: 'Perustaso', active: 'bg-green-600', inactive: 'bg-slate-800 text-slate-300 hover:bg-slate-700' },
            { key: 'keskitaso', label: 'Keskitaso', active: 'bg-yellow-600', inactive: 'bg-slate-800 text-slate-300 hover:bg-slate-700' },
            { key: 'edistynyt', label: 'Edistynyt', active: 'bg-orange-600', inactive: 'bg-slate-800 text-slate-300 hover:bg-slate-700' },
            { key: 'mestari', label: 'Mestari', active: 'bg-red-600', inactive: 'bg-slate-800 text-slate-300 hover:bg-slate-700' },
          ].map(({ key, label, active, inactive }) => (
            <button
              key={key}
              onClick={() => setSelectedDifficulty(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors text-white ${
                selectedDifficulty === key ? active : inactive
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-400">Ladataan kyselyitä...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100">
            {error}
          </div>
        )}

        {/* Quiz Cards Grid */}
        {!loading && !error && quizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const filteredQuestions = selectedDifficulty === 'kaikki'
                ? quiz.questions
                : quiz.questions.filter(q => q.difficulty === selectedDifficulty);

              if (filteredQuestions.length === 0) return null;

              const locked = isCategoryLocked(quiz);
              const requiredRankName = getRequiredRankName(quiz);

              return (
                <div
                  key={quiz.id}
                  className={`bg-slate-900 border rounded-lg p-6 transition-all ${
                    locked
                      ? 'border-slate-700 opacity-70 cursor-not-allowed'
                      : 'border-slate-800 hover:border-slate-700 cursor-pointer'
                  }`}
                  onClick={() => !locked && handleStartQuiz(quiz)}
                >
                  {/* Category Icon / Lock Icon */}
                  <div className={`mb-4 p-4 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl font-bold ${
                    locked
                      ? 'bg-slate-700'
                      : 'bg-linear-to-br from-blue-600 to-purple-600'
                  }`}>
                    {locked ? '🔒' : quiz.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Category Title */}
                  <h3 className="text-xl font-bold text-slate-50 mb-2">{quiz.name}</h3>

                  {/* Lock notice */}
                  {locked && requiredRankName && (
                    <p className="text-sm text-amber-400 mb-2 flex items-center gap-1">
                      <span>🔒</span> Vaatii tason: <span className="font-semibold">{requiredRankName}</span>
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mb-4 space-y-1 text-sm text-slate-400">
                    <p>Kysymykset: <span className="text-slate-300 font-semibold">{filteredQuestions.length}</span></p>
                    <p>Tasot: <span className="text-slate-300 font-semibold">{quiz.difficulties.join(', ')}</span></p>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartQuiz(quiz); }}
                    disabled={locked}
                    className={`w-full mt-4 px-4 py-2 text-white rounded-lg font-semibold transition-all ${
                      locked
                        ? 'bg-slate-700 cursor-not-allowed text-slate-500'
                        : 'bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                    }`}
                  >
                    {locked ? 'Lukittu' : 'Aloita'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && quizzes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">Kyselyitä ei saatavilla</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default QuizBrowser;
