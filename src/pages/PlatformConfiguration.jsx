import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { DEFAULT_DIFFICULTY_POINTS, DEFAULT_DIFFICULTY_PENALTIES } from '../services/gamificationService';

function PlatformConfiguration() {
  const { userData, loading: authLoading } = useAuth();
  const [config, setConfig] = useState({
    platformName: 'Kiekuu',
    welcomeMessage: 'Tervetuloa Kiekuuhun!',
    pointsPerQuestion: 10,
    questionTimeLimit: 30,
    passingScore: 70,
    enableEmailNotifications: false,
    maintenanceMode: false,
    allowAnonymousUsers: true,
    maxQuestionsPerQuiz: 10,
    // Gamification settings
    minAccuracyForRankUp: 60,
    pointsPerDifficulty: {
      perustaso: 10,
      keskitaso: 20,
      edistynyt: 30,
      mestari: 50,
    },
    penaltyPerDifficulty: {
      perustaso: 2,
      keskitaso: 5,
      edistynyt: 10,
      mestari: 15,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      fetchConfiguration();
    }
  }, [authLoading, userData]);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      setError('');
      
      const configRef = doc(db, 'config', 'platform');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        setConfig({ ...config, ...configDoc.data() });
      }
    } catch (err) {
      setError('Virhe asetusten hakemisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const configRef = doc(db, 'config', 'platform');
      await setDoc(configRef, {
        ...config,
        updatedAt: new Date().toISOString(),
      });

      setSuccess('Asetukset tallennettu onnistuneesti!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Virhe asetusten tallentamisessa');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setConfig({ ...config, [field]: value });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-sm sm:text-base text-slate-400">Ladataan asetuksia...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">
              Alustan asetukset
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
              Hallitse Kiekuu-alustan kokoonpanoa
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
            aria-label="Takaisin hallintapaneeliin"
          >
            ← Takaisin
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl" role="alert">
            <p className="text-sm sm:text-base text-red-500">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-600 rounded-xl" role="alert">
            <p className="text-sm sm:text-base text-green-500">{success}</p>
          </div>
        )}

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* General Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-6">
              Yleiset asetukset
            </h2>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="platform-name" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Alustan nimi
                </label>
                <input
                  type="text"
                  id="platform-name"
                  value={config.platformName}
                  onChange={(e) => handleInputChange('platformName', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="welcome-message" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Tervetuloviesti
                </label>
                <textarea
                  id="welcome-message"
                  value={config.welcomeMessage}
                  onChange={(e) => handleInputChange('welcomeMessage', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Quiz Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-6">
              Tietokilpailuasetukset
            </h2>
            
            <div className="space-y-5">
              <div>
                <label htmlFor="points-per-question" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Pisteet per kysymys
                </label>
                <input
                  type="number"
                  id="points-per-question"
                  value={config.pointsPerQuestion}
                  onChange={(e) => handleInputChange('pointsPerQuestion', parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="question-time-limit" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kysymyksen aikaraja (sekuntia)
                </label>
                <input
                  type="number"
                  id="question-time-limit"
                  value={config.questionTimeLimit}
                  onChange={(e) => handleInputChange('questionTimeLimit', parseInt(e.target.value))}
                  min="10"
                  max="300"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="passing-score" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Hyväksytty pistemäärä (%)
                </label>
                <input
                  type="number"
                  id="passing-score"
                  value={config.passingScore}
                  onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label htmlFor="max-questions" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kysymyksiä per tietokilpailu
                </label>
                <input
                  type="number"
                  id="max-questions"
                  value={config.maxQuestionsPerQuiz}
                  onChange={(e) => handleInputChange('maxQuestionsPerQuiz', parseInt(e.target.value))}
                  min="1"
                  max="50"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Gamification Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-2">
              Pelillistämisasetukset
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Pisteytys, rangaistukset ja arvonnousuvaatimukset
            </p>

            <div className="space-y-5">
              {/* Min accuracy for rank up */}
              <div>
                <label htmlFor="min-accuracy" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Vähimmäistarkkuus arvonnousuun (%)
                </label>
                <input
                  type="number"
                  id="min-accuracy"
                  value={config.minAccuracyForRankUp}
                  onChange={(e) => handleInputChange('minAccuracyForRankUp', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                />
                <p className="mt-1 text-xs text-slate-500">Käyttäjän kokonaistarkkuuden täytyy olla vähintään tämä arvo arvonnousua varten.</p>
              </div>

              {/* Points per difficulty */}
              <div>
                <p className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                  Pisteet oikeasta vastauksesta (vaikeustason mukaan)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'perustaso', label: 'Perustaso' },
                    { key: 'keskitaso', label: 'Keskitaso' },
                    { key: 'edistynyt', label: 'Edistynyt' },
                    { key: 'mestari', label: 'Mestari' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-1">{label}</label>
                      <input
                        type="number"
                        value={config.pointsPerDifficulty?.[key] ?? DEFAULT_DIFFICULTY_POINTS[key]}
                        onChange={(e) => handleInputChange('pointsPerDifficulty', {
                          ...config.pointsPerDifficulty,
                          [key]: parseInt(e.target.value),
                        })}
                        min="1"
                        className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Penalty per difficulty */}
              <div>
                <p className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                  Rangaistuspisteet väärästä vastauksesta (vaikeustason mukaan)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'perustaso', label: 'Perustaso' },
                    { key: 'keskitaso', label: 'Keskitaso' },
                    { key: 'edistynyt', label: 'Edistynyt' },
                    { key: 'mestari', label: 'Mestari' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-1">{label}</label>
                      <input
                        type="number"
                        value={config.penaltyPerDifficulty?.[key] ?? DEFAULT_DIFFICULTY_PENALTIES[key]}
                        onChange={(e) => handleInputChange('penaltyPerDifficulty', {
                          ...config.penaltyPerDifficulty,
                          [key]: parseInt(e.target.value),
                        })}
                        min="0"
                        className="w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-slate-50 mb-6">
              Järjestelmäasetukset
            </h2>
            
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-50">Sähköposti-ilmoitukset</p>
                  <p className="text-xs text-slate-400 mt-1">Lähetä ilmoituksia käyttäjille sähköpostitse</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enableEmailNotifications}
                    onChange={(e) => handleInputChange('enableEmailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-50">Ylläpitotila</p>
                  <p className="text-xs text-slate-400 mt-1">Estä normaalit käyttäjät käyttämästä alustaa</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-slate-50">Salli anonyymit käyttäjät</p>
                  <p className="text-xs text-slate-400 mt-1">Vieraat voivat käyttää alustaa ilman kirjautumista</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allowAnonymousUsers}
                    onChange={(e) => handleInputChange('allowAnonymousUsers', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              to="/admin"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] inline-flex items-center"
            >
              Peruuta
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? 'Tallennetaan...' : 'Tallenna asetukset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PlatformConfiguration;
