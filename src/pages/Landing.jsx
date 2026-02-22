import { useNavigate } from 'react-router-dom';
import { signInAnonymouslyUser, signInWithGoogle } from '../services/authService';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50">
      <div className="max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-6xl mb-4">🐓</h1>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Kiekuu</h1>
          <p className="text-lg text-slate-600">
            Pelillistetty oppimisalusta sopimuspalokuntien koulutukseen
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl p-8 space-y-4">
          <button
            onClick={handleStartUsing}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Aloitetaan...' : '🚀 Aloita oppiminen'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">tai</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-lg border-2 border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
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
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold py-4 px-6 rounded-lg border-2 border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Kirjaudu sähköpostilla
          </button>

          <p className="text-sm text-slate-500 text-center mt-4">
            Voit aloittaa oppimisen heti ilman rekisteröitymistä. <br />
            Ensimmäisen tason jälkeen kirjaudu sisään jatkaaksesi.
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-slate-600">
          <p>Noudattelee Pelastusopiston sopimushenkilöstön OPS:in sisältöä sekä muita alan suosituksia.</p>
        </div>
      </div>
    </div>
  );
}

export default Landing;
