import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../services/authService';
import LinkAccountModal from '../components/LinkAccountModal';
import logo from '../assets/images/Kiekuu_logo.jpg';

function Home() {
  const { user, userData } = useAuth();
  const [linkModalDismissed, setLinkModalDismissed] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);

  console.log('Home component rendering:', {
    user: user ? `${user.uid} (anonymous: ${user.isAnonymous})` : 'null',
    userData: userData ? `role: ${userData.role}, rank: ${userData.rank}` : 'null'
  });

  // Prompt anonymous users to create an account once they complete the first level
  const shouldShowLinkModal =
    linkModalDismissed === false &&
    !!user?.isAnonymous &&
    (userData?.progress?.questionsAnswered ?? 0) > 0 &&
    userData?.progress?.currentLevel !== 'harjoittelija';

  useEffect(() => {
    if (!user || user.isAnonymous || !userData?.rank) return;

    const storageKey = `kiekuu:lastRank:${user.uid}`;
    const previousRank = localStorage.getItem(storageKey);
    if (previousRank && previousRank !== userData.rank) {
      // Deferred one tick so the prompt does not cascade synchronously
      // off this effect's render (react-hooks/set-state-in-effect)
      Promise.resolve().then(() => setShowFeedbackPrompt(true));
    }
    localStorage.setItem(storageKey, userData.rank);
  }, [user, userData?.rank]);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLinkSuccess = () => {
    setLinkModalDismissed(true);
    // Refresh the page or update user data
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain shrink-0 opacity-90"
                style={{ backgroundImage: `url(${logo})`, filter: 'brightness(1.1) contrast(1.05)' }}
                role="img"
                aria-label="Kiekuu logo"
              />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-50">Kiekuu</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              {user?.isAnonymous ? (
                <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
                  Vieras
                </span>
              ) : (
                <span className="text-base leading-relaxed text-slate-300">
                  {user?.displayName || user?.email}
                </span>
              )}
              {userData?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="w-full sm:w-auto text-center px-4 py-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 rounded-xl text-sm font-semibold transition-colors min-h-[44px] flex items-center justify-center"
                  aria-label="Siirry admin-hallintapaneeliin"
                >
                  Admin
                </Link>
              )}
              <a
                href="https://jsahlberg42.github.io/Kiekuu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-slate-50 rounded-xl text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center"
                aria-label="Avaa käyttöopas uuteen välilehteen"
              >
                📚 Documentation
              </a>
              {!user?.isAnonymous ? (
                <Link
                  to="/feedback"
                  className="w-full sm:w-auto text-center px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl text-sm font-medium text-slate-50 transition-colors min-h-[44px] flex items-center justify-center"
                  aria-label="Anna palautetta"
                >
                  Palaute
                </Link>
              ) : (
                <span className="w-full sm:w-auto text-center px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium text-slate-500 min-h-[44px] flex items-center justify-center">
                  Palaute
                </span>
              )}
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl text-sm font-medium text-slate-50 transition-colors min-h-[44px]"
                aria-label="Kirjaudu ulos"
              >
                Kirjaudu ulos
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50 mb-4">
            Tervetuloa{user?.isAnonymous ? '' : `, ${user?.displayName}`}!
          </h2>
          {user?.isAnonymous && (
            <p className="text-orange-500 mb-4">
              Olet vierastilassa. Luo tili ensimmäisen tason jälkeen säilyttääksesi edistymisesi.
            </p>
          )}
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
            Taso: <span className="font-semibold">{userData?.rank || 'harjoittelija'}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Pisteet: {userData?.progress?.totalScore || 0}
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Start Quiz Card */}
          <Link
            to="/quiz"
            className="group bg-linear-to-br from-slate-900 to-slate-800 border border-slate-800 hover:border-blue-600 rounded-xl p-8 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform">
                ✏️
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-50 mb-2 group-hover:text-blue-400 transition-colors">
              Aloita Kysely
            </h3>
            <p className="text-slate-400 mb-4">
              Testaa osaamistasi ratkaisemalla kysymyksiä eri kategorioista ja vaikeusasteista.
            </p>
            <div className="inline-block px-4 py-2 bg-blue-600 group-hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition-colors">
              Aloita harjoittelu →
            </div>
          </Link>

          {/* Progress Card */}
          <Link
            to="/progress"
            className="group bg-linear-to-br from-slate-900 to-slate-800 border border-slate-800 hover:border-green-600 rounded-xl p-8 transition-all cursor-pointer hover:shadow-lg hover:shadow-green-500/20"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center text-white text-xl font-bold group-hover:scale-110 transition-transform">
                📊
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-50 mb-2 group-hover:text-green-400 transition-colors">
              Edistyminen
            </h3>
            <p className="text-slate-400 mb-4">
              Seuraa edistymistäsi, tarkastele tilastojasi ja näe missä parannat eniten.
            </p>
            <div className="inline-block px-4 py-2 bg-green-600 group-hover:bg-green-700 rounded-lg text-white text-sm font-semibold transition-colors">
              Näytä tilastot →
            </div>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Vastaukset</p>
            <p className="text-2xl font-bold text-blue-400">{userData?.progress?.questionsAnswered || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Oikeat vastaukset</p>
            <p className="text-2xl font-bold text-green-400">{userData?.progress?.correctAnswers || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Kokonaispisteet</p>
            <p className="text-2xl font-bold text-purple-400">{userData?.progress?.totalScore || 0}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-1">Taso</p>
            <p className="text-2xl font-bold text-yellow-400 capitalize">{userData?.rank || 'harjoittelija'}</p>
          </div>
        </div>
      </main>

      <LinkAccountModal
        isOpen={shouldShowLinkModal}
        onClose={() => setLinkModalDismissed(true)}
        onSuccess={handleLinkSuccess}
      />

      {showFeedbackPrompt && (
        <div
          className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-prompt-title"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
            <h2 id="feedback-prompt-title" className="text-xl sm:text-2xl font-bold text-slate-50 mb-3">
              Onnittelut uudesta tasosta!
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Haluatko antaa palautetta Kiekkuusta?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowFeedbackPrompt(false)}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-50 rounded-xl font-semibold transition-colors"
              >
                Ehkä myöhemmin
              </button>
              <Link
                to="/feedback"
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors text-center"
                onClick={() => setShowFeedbackPrompt(false)}
              >
                Anna palaute
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
