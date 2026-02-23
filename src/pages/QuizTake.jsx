import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getQuestionsByCategory, submitAnswer } from '../services/quizService';
import { isFirestoreOfflineError, logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import { getRandomizedQuestions, calculatePoints, DEFAULT_DIFFICULTY_POINTS, DEFAULT_DIFFICULTY_PENALTIES } from '../services/gamificationService';
import logo from '../assets/images/Kiekuu_logo.jpg';

function QuizTake() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const categoryId = searchParams.get('category') || '';
  const difficulty = searchParams.get('difficulty') || null;

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [lastPointDelta, setLastPointDelta] = useState(null);
  const [startTime] = useState(Date.now());
  const [flashAnswerIndex, setFlashAnswerIndex] = useState(null);

  useEffect(() => {
    const loadQuestions = async () => {
      if (!categoryId) {
        setError('Kategoria ei määritelty');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getQuestionsByCategory(categoryId, difficulty);
        if (data.length === 0) {
          setError('Kysymyksiä ei löytynyt');
        } else {
          // Randomize question order and shuffle each question's answer options
          setQuestions(getRandomizedQuestions(data, 10, difficulty));
        }
      } catch (err) {
        logFirestoreErrorContext('getQuestionsByCategory', err);
        setError(
          isFirestoreOfflineError(err)
            ? 'Yhteysongelma. Tarkista verkkoyhteys ja yritä uudelleen.'
            : 'Kysymysten lataaminen epäonnistui'
        );
        console.error('Error loading questions:', err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [categoryId, difficulty]);

  useEffect(() => {
    setFlashAnswerIndex(null);
  }, [currentQuestionIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Ladataan kysely...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        <nav className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link to="/quiz" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: `url(${logo})` }} />
              <h1 className="text-2xl font-bold text-slate-50">Kiekuu</h1>
            </Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-red-100 mb-4">
            {error || 'Kysymyksiä ei löytynyt'}
          </div>
          <Link to="/quiz" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">
            Takaisin
          </Link>
        </main>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = selectedAnswers[currentQuestionIndex] !== undefined;
  const correctAnswers = Object.entries(selectedAnswers).reduce((count, [index, answerIndex]) => {
    const q = questions[parseInt(index)];
    return count + (answerIndex === q.correctAnswerIndex ? 1 : 0);
  }, 0);

  const handleSelectAnswer = async (answerIndex) => {
    if (submitting || quizComplete || isAnswered) {
      return;
    }

    try {
      setSubmitting(true);
      setSelectedAnswers(prev => ({
        ...prev,
        [currentQuestionIndex]: answerIndex,
      }));

      const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
      const qDifficulty = currentQuestion.difficulty || 'perustaso';

      if (isCorrect) {
        setFlashAnswerIndex(answerIndex);
      }

      // Submit answer to database (difficulty-based points, negative for wrong)
      await submitAnswer(user.uid, currentQuestion.id, answerIndex, isCorrect, qDifficulty);

      // Calculate the point delta for feedback display
      const delta = calculatePoints(qDifficulty, isCorrect);
      setLastPointDelta(delta);
      setTotalPoints(prev => prev + delta);

      if (isCorrect) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFlashAnswerIndex(null);
      }

      // Move to next question or complete quiz
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setQuizComplete(true);
      }
    } catch (err) {
      logFirestoreErrorContext('submitAnswer', err);
      console.error('Error submitting answer:', err);
      alert(
        isFirestoreOfflineError(err)
          ? 'Yhteysongelma. Tarkista verkkoyhteys ja yritä uudelleen.'
          : 'Vastauksen lähettäminen epäonnistui'
      );
      setFlashAnswerIndex(null);
      setSelectedAnswers(prev => {
        const updated = { ...prev };
        delete updated[currentQuestionIndex];
        return updated;
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAnswerOptions = () => {
    if (!currentQuestion.options || currentQuestion.options.length === 0) {
      return [];
    }
    return currentQuestion.options;
  };

  // Quiz Complete Screen
  if (quizComplete) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const accuracy = Math.round((correctAnswers / questions.length) * 100);

    return (
      <div className="min-h-screen bg-slate-950">
        <nav className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: `url(${logo})` }} />
              <h1 className="text-2xl font-bold text-slate-50">Kiekuu</h1>
            </Link>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-8 text-center">
            <h2 className="text-4xl font-bold text-slate-50 mb-2">Hienoa!</h2>
            <p className="text-slate-400 mb-8">Olet suorittanut kyselyn</p>

            {/* Score Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Pisteet</p>
                <p className={`text-3xl font-bold ${totalPoints >= 0 ? 'text-blue-400' : 'text-red-400'}`}>{totalPoints > 0 ? `+${totalPoints}` : totalPoints}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Tarkkuus</p>
                <p className="text-3xl font-bold text-green-400">{accuracy}%</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-2">Aika</p>
                <p className="text-3xl font-bold text-purple-400">{totalTime}s</p>
              </div>
            </div>

            {/* Results */}
            <div className="bg-slate-900 rounded-lg p-4 mb-8 text-left">
              <div className="space-y-2">
                <p className="text-slate-300">
                  <span className="font-semibold">Oikeat vastaukset:</span> {correctAnswers}/{questions.length}
                </p>
                <p className="text-slate-300">
                  <span className="font-semibold">Kategoria:</span> {categoryId}
                </p>
                {difficulty && (
                  <p className="text-slate-300">
                    <span className="font-semibold">Taso:</span> {difficulty}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                to="/quiz"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Uusi kysely
              </Link>
              <Link
                to="/progress"
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
              >
                Edistyminen
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const options = getAnswerOptions();
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const qDifficulty = currentQuestion.difficulty || 'perustaso';
  const potentialPoints = DEFAULT_DIFFICULTY_POINTS[qDifficulty] ?? 10;
  const potentialPenalty = DEFAULT_DIFFICULTY_PENALTIES[qDifficulty] ?? 2;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/quiz" className="text-slate-400 hover:text-slate-300 text-sm font-medium">
            ← Takaisin
          </Link>
          <div className="text-center">
            <p className="text-slate-300 font-medium">{categoryId}</p>
            <p className="text-slate-500 text-sm">{currentQuestionIndex + 1} / {questions.length}</p>
          </div>
          <div className="w-20 text-right">
            <p className={`font-semibold ${totalPoints >= 0 ? 'text-slate-300' : 'text-red-400'}`}>{totalPoints > 0 ? `+${totalPoints}` : totalPoints} pist.</p>
            {lastPointDelta !== null && (
              <p className={`text-xs font-bold ${lastPointDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {lastPointDelta > 0 ? `+${lastPointDelta}` : lastPointDelta}
              </p>
            )}
          </div>
        </div>
      </nav>

      {/* Progress Bar */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Question */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 mb-8">
          {/* Difficulty badge and point info */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wide ${
              qDifficulty === 'perustaso' ? 'bg-green-900 text-green-300' :
              qDifficulty === 'keskitaso' ? 'bg-yellow-900 text-yellow-300' :
              qDifficulty === 'edistynyt' ? 'bg-orange-900 text-orange-300' :
              'bg-red-900 text-red-300'
            }`}>
              {qDifficulty}
            </span>
            <span className="text-xs text-slate-500">
              +{potentialPoints} oikein / -{potentialPenalty} väärin
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-50 mb-6">
            {currentQuestion.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === index;
              const isCorrect = index === currentQuestion.correctAnswerIndex;
              const showResult = quizComplete || submitting;

              let bgColor = 'bg-slate-800 border-slate-700 hover:border-slate-600';
              if (isSelected && !showResult) {
                bgColor = 'bg-blue-600 border-blue-500';
              } else if (showResult && isSelected && !isCorrect) {
                bgColor = 'bg-red-900 border-red-700';
              } else if (showResult && isCorrect) {
                bgColor = 'bg-green-900 border-green-700';
              }

              let textColor = 'text-slate-300 hover:text-slate-200';
              if (showResult && isSelected && !isCorrect) {
                textColor = 'text-red-100';
              } else if (isSelected || (showResult && isCorrect)) {
                textColor = 'text-white';
              }

              const shouldFlash = flashAnswerIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={submitting || quizComplete}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${bgColor} ${textColor} disabled:cursor-not-allowed ${shouldFlash ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''}`}
                >
                  <span className="font-semibold mr-3">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

        </div>

      </main>
    </div>
  );
}

export default QuizTake;
