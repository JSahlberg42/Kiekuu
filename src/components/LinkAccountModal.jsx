import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { linkAnonymousAccount } from '../services/authService';
import PropTypes from 'prop-types';

function LinkAccountModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await linkAnonymousAccount(email, password, displayName);
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Sähköposti on jo käytössä. Kirjaudu sisään sen sijaan.');
      } else {
        setError(err.message || 'Tilin linkitys epäonnistui');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-50 mb-4">🎉 Hienoa työtä!</h2>
        <p className="mb-6 text-base leading-relaxed text-slate-300">
          Olet suorittanut ensimmäisen tason. Luo tili jatkaaksesi oppimista ja säilyttääksesi edistymisesi.
        </p>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Nimi
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Sähköposti
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Salasana
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-slate-50 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Luodaan tiliä...' : 'Luo tili ja jatka'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleGoToLogin}
            className="text-orange-500 hover:text-orange-400 text-sm font-medium"
          >
            Minulla on jo tili - Kirjaudu sisään
          </button>
        </div>
      </div>
    </div>
  );
}

LinkAccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default LinkAccountModal;
