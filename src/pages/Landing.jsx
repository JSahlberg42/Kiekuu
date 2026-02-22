import { useNavigate } from 'react-router-dom';
import { signInAnonymouslyUser, signInWithGoogle } from '../services/authService';
import logo from '../assets/images/Kiekuu_logo.jpg';
import { useState } from 'react';

function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartUsing = async () => {
    setLoading(true);
    setError('');
    try {
      await signInAnonymouslyUser();
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to start. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Kirjautuminen peruutettiin');
      } else {
        setError(err.message || 'Google-kirjautuminen epäonnistui');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div 
            className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 bg-center bg-no-repeat bg-contain"
            style={{ backgroundImage: `url(${logo})` }}
            role="img"
            aria-label="Kiekuu logo"
          />
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50 mb-2">Kiekuu</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300">
            Pelillistetty oppimisalusta sopimuspalokuntien koulutukseen
          </p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 space-y-4">
          <button
            onClick={handleStartUsing}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 font-semibold py-4 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            aria-label="Aloita oppiminen ilman rekisteröitymistä"
          >
            {loading ? 'Aloitetaan...' : '🚀 Aloita oppiminen'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs font-medium uppercase tracking-widest">
              <span className="px-2 bg-slate-900 text-slate-500">tai</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 font-semibold py-4 px-6 rounded-xl border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-h-[44px]"
            aria-label="Kirjaudu sisään Google-tilillä"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Jatka Google-tilillä
          </button>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 font-semibold py-4 px-6 rounded-xl border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            aria-label="Kirjaudu sisään sähköpostilla"
          >
            Kirjaudu sähköpostilla
          </button>

          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 text-center mt-4">
            Voit aloittaa oppimisen heti ilman rekisteröitymistä. <br />
            Ensimmäisen tason jälkeen kirjaudu sisään jatkaaksesi.
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Noudattelee Pelastusopiston sopimushenkilöstön OPS:in sisältöä sekä muita alan suosituksia.</p>
        </div>
        <div className="mt-4 text-center text-xs text-slate-500">
          <p>© 2026 Jussi Sahlberg</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;
