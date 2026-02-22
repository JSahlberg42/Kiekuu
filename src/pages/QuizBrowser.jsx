import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableQuizzes } from '../services/quizService';
import logo from '../assets/images/Kiekuu_logo.jpg';

function QuizBrowser() {
  const { user, userData } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('kaikki');

  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        setLoading(true);
        const data = await getAvailableQuizzes();
        setQuizzes(data);
      } catch (err) {
        setError('Kyselyiden lataaminen epäonnistui');
        console.error('Error loading quizzes:', err);
      } finally {
        setLoading(false);
      }
    };

    loadQuizzes();
  }, []);

  const handleStartQuiz = (categoryId) => {
    const params = new URLSearchParams();
    params.append('category', categoryId);
    if (selectedDifficulty !== 'kaikki') {
      params.append('difficulty', selectedDifficulty);
    }
    window.location.href = `/quiz/take?${params.toString()}`;
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
          <p className="text-slate-400">Taso: <span className="font-semibold text-slate-300">{userData?.rank || 'harjoittelija'}</span></p>
        </div>

        {/* Difficulty Filter */}
        <div className="mb-8 flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDifficulty('kaikki')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDifficulty === 'kaikki'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Kaikki tasot
          </button>
          <button
            onClick={() => setSelectedDifficulty('perustaso')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDifficulty === 'perustaso'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Perustaso
          </button>
          <button
            onClick={() => setSelectedDifficulty('keskitaso')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDifficulty === 'keskitaso'
                ? 'bg-yellow-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Keskitaso
          </button>
          <button
            onClick={() => setSelectedDifficulty('edistynyt')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDifficulty === 'edistynyt'
                ? 'bg-red-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Edistynyt
          </button>
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

              return (
                <div
                  key={quiz.id}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-all cursor-pointer"
                  onClick={() => handleStartQuiz(quiz.name)}
                >
                  {/* Category Icon */}
                  <div className="mb-4 p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg w-12 h-12 flex items-center justify-center text-white text-xl font-bold">
                    {quiz.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Category Title */}
                  <h3 className="text-xl font-bold text-slate-50 mb-2">{quiz.name}</h3>

                  {/* Stats */}
                  <div className="mb-4 space-y-1 text-sm text-slate-400">
                    <p>Kysymykset: <span className="text-slate-300 font-semibold">{filteredQuestions.length}</span></p>
                    <p>Tasot: <span className="text-slate-300 font-semibold">{quiz.difficulties.join(', ')}</span></p>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => handleStartQuiz(quiz.name)}
                    className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all"
                  >
                    Aloita
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
