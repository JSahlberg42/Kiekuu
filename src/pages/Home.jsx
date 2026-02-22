import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { logOut } from '../services/authService';
import LinkAccountModal from '../components/LinkAccountModal';

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
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-50">🐓 Kiekuu</h1>
            </div>
            <div className="flex items-center gap-4">
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
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-sm font-semibold"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-slate-50"
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
