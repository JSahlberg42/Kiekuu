import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn, signInWithGoogle } from '../services/authService';
import { logLogin } from '../services/analyticsService';
import logo from '../assets/images/Kiekuu_logo.jpg';
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      logLogin('email');
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      logLogin('google');
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Kirjautuminen peruutettiin');
      } else {
        setError(getErrorMessage(err.code) || 'Google-kirjautuminen epäonnistui');
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Virheellinen sähköpostiosoite';
      case 'auth/user-disabled':
        return 'Käyttäjätili on poistettu käytöstä';
      case 'auth/user-not-found':
        return 'Käyttäjää ei löytynyt';
      case 'auth/wrong-password':
        return 'Virheellinen salasana';
      case 'auth/invalid-credential':
        return 'Virheelliset kirjautumistiedot';
      default:
        return 'Kirjautuminen epäonnistui. Yritä uudelleen.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div 
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 bg-center bg-no-repeat bg-contain opacity-90"
            style={{ backgroundImage: `url(${logo})`, filter: 'brightness(1.1) contrast(1.05)' }}
            role="img"
            aria-label="Kiekuu logo"
          />
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-slate-50">Kiekuu</h1>
          <h2 className="text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Kirjaudu sisään</h2>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
            Jatka oppimista
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-6 bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8" role="form" aria-label="Kirjautumislomake">
          {error && (
            <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Sähköposti
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="nimi@esimerkki.fi"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Salasana
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-slate-50 font-semibold rounded-xl transition-colors min-h-[44px]"
            aria-label="Kirjaudu sisään"
          >
            {loading ? 'Kirjaudutaan...' : 'Kirjaudu sisään'}
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
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 font-semibold rounded-xl border border-slate-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 min-h-[44px]"
            aria-label="Kirjaudu Google-tilillä"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Jatka Google-tilillä
          </button>

          <div className="text-center text-sm">
            <p className="text-slate-400">
              Eikö sinulla ole tiliä?{' '}
              <Link to="/signup" className="text-orange-500 hover:text-orange-400 font-medium">
                Rekisteröidy
              </Link>
            </p>
            <p className="text-slate-400 mt-2">
              <Link to="/landing" className="text-orange-500 hover:text-orange-400 font-medium">
                ← Takaisin alkuun
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
