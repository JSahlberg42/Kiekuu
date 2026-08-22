import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { submitFeedback } from '../services/feedbackService';
import logo from '../assets/images/Kiekuu_logo.jpg';

function Feedback() {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [publishApproved, setPublishApproved] = useState(true);
  const [publishNameApproved, setPublishNameApproved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isAnonymous = Boolean(user?.isAnonymous);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isAnonymous) {
      setError('Palaute on saatavilla vain kirjautuneille käyttäjille.');
      return;
    }
    if (!rating) {
      setError('Valitse arvio (1-5).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await submitFeedback({
        rating,
        message: message.trim(),
        publishApproved,
        publishNameApproved,
      });
      setSuccess(true);
      setMessage('');
      setRating(0);
      setPublishApproved(true);
      setPublishNameApproved(false);
    } catch (submitError) {
      console.error('Feedback submit failed:', submitError);
      const code = submitError?.code || '';
      if (code === 'functions/resource-exhausted') {
        setError('Olet lähettänyt paljon palautetta viime aikoina. Kokeile myöhemmin uudelleen.');
      } else if (code === 'functions/invalid-argument') {
        setError('Tarkista lomakkeen tiedot ja yritä uudelleen.');
      } else {
        setError('Palautteen lähetys epäonnistui.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
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
                to="/"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 text-sm font-medium transition-colors"
              >
                Koti
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-50 mb-2">Anna palautetta</h2>
          <p className="text-slate-400">
            Palautteesi auttaa meitä parantamaan sovellusta.
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-900/20 border border-green-600 text-green-300 px-4 py-3 rounded-xl">
            Kiitos palautteesta!
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-600 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {isAnonymous ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-300 mb-4">
              Palaute on saatavilla vain kirjautuneille käyttäjille.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-semibold transition-colors"
            >
              Luo tili
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6"
          >
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Arvio (1-5, jossa 1=erittäin huono ja 5=erinomainen)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`w-12 h-12 rounded-lg border text-2xl transition-colors ${
                      rating >= value
                        ? 'bg-amber-400/20 border-amber-400 text-amber-400'
                        : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-500'
                    }`}
                    aria-label={`Valitse ${value} tahti`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="feedback-message" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Vapaa palaute
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Mitä voisimme parantaa?"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={publishApproved}
                  onChange={(event) => setPublishApproved(event.target.checked)}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500 rounded-sm"
                />
                Palautteen saa julkaista sovelluksessa muiden nähtäväksi
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={publishNameApproved}
                  onChange={(event) => setPublishNameApproved(event.target.checked)}
                  className="w-4 h-4 text-blue-500 focus:ring-blue-500 rounded-sm"
                />
                Nimeni saa julkaista palautteen yhteydessä
              </label>
              <p className="text-xs text-slate-500">
                Oletuksena palautteen julkaisu on sallittu ilman nimeä.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? 'Lähetetään...' : 'Lähetä palaute'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default Feedback;
