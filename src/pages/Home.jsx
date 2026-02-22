import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../services/authService';
import LinkAccountModal from '../components/LinkAccountModal';import logo from '../assets/images/Kiekuu_logo.jpg';
function Home() {
  const { user, userData } = useAuth();
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Check if user is anonymous and should be prompted to create account
  useEffect(() => {
    if (user?.isAnonymous && userData?.progress?.questionsAnswered > 0) {
      // Show modal after first level completion (you can adjust this condition)
      const firstLevelComplete = userData?.progress?.currentLevel !== 'harjoittelija';
      if (firstLevelComplete) {
        setShowLinkModal(true);
      }
    }
  }, [user, userData]);

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLinkSuccess = () => {
    setShowLinkModal(false);
    // Refresh the page or update user data
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 sm:h-16 gap-4 sm:gap-0">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain flex-shrink-0 opacity-90"
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
        <div className="text-center py-12">
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

          <div className="mt-8">
            <p className="text-slate-600 dark:text-slate-400">
              Oppimistehtävät tulossa pian...
            </p>
          </div>
        </div>
      </main>

      <LinkAccountModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={handleLinkSuccess}
      />
    </div>
  );
}

export default Home;
