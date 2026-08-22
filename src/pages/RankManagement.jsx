import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllRanks, createRank, updateRank, deleteRank } from '../services/rankService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function RankManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingRank, setAddingRank] = useState(false);
  const [editingRank, setEditingRank] = useState(null);
  const [deletingRank, setDeletingRank] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      fetchRanks();
    }
  }, [authLoading, userData]);

  const fetchRanks = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedRanks = await getAllRanks();
      setRanks(fetchedRanks);
    } catch (err) {
      setError('Virhe arvojen hakemisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRank = async (rankData) => {
    try {
      setActionLoading(true);
      setError('');
      await createRank(rankData);
      await fetchRanks();
      setAddingRank(false);
    } catch (err) {
      setError('Virhe arvon luomisessa');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRank = async (rankId, updates) => {
    try {
      setActionLoading(true);
      setError('');
      await updateRank(rankId, updates);
      await fetchRanks();
      setEditingRank(null);
    } catch (err) {
      setError('Virhe arvon päivittämisessä');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRank = async (rankId) => {
    try {
      setActionLoading(true);
      setError('');
      await deleteRank(rankId);
      await fetchRanks();
      setDeletingRank(null);
    } catch (err) {
      setError('Virhe arvon poistamisessa');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-sm sm:text-base text-slate-400">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            to="/admin"
            className="inline-flex items-center text-orange-500 hover:text-orange-400 active:text-orange-300 mb-4 min-h-[44px]"
            aria-label="Takaisin admin-hallintapaneeliin"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Takaisin
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">Arvohallinta</h1>
              <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
                Hallitse käyttäjien arvojärjestelmää
              </p>
            </div>
            <button
              onClick={() => setAddingRank(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2"
              aria-label="Lisää uusi arvo"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Lisää arvo
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Ranks List */}
        <div className="space-y-4">
          {ranks.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">Ei arvoja. Lisää ensimmäinen arvo.</p>
            </div>
          ) : (
            ranks.map((rank) => (
              <div
                key={rank.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {rank.icon && (
                        <span className="text-2xl shrink-0" aria-hidden="true">{rank.icon}</span>
                      )}
                      <h3 className="text-lg sm:text-xl font-semibold text-slate-50 wrap-break-word">
                        {rank.name}
                      </h3>
                      <span className="px-3 py-1 bg-orange-500/20 text-orange-500 rounded-lg text-sm font-medium shrink-0">
                        {rank.requiredScore} pistettä
                      </span>
                      {rank.minAccuracy != null && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium shrink-0">
                          ≥{rank.minAccuracy}% tarkkuus
                        </span>
                      )}
                    </div>
                    {rank.description && (
                      <p className="text-sm text-slate-400 mb-2 wrap-break-word">
                        {rank.description}
                      </p>
                    )}
                    {rank.color && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div
                          className="w-4 h-4 rounded-sm shrink-0"
                          style={{ backgroundColor: rank.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{rank.color}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-3 sm:shrink-0">
                    <button
                      onClick={() => setEditingRank(rank)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Muokkaa arvoa ${rank.name}`}
                    >
                      Muokkaa
                    </button>
                    <button
                      onClick={() => setDeletingRank(rank)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Poista arvo ${rank.name}`}
                    >
                      Poista
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Rank Modal */}
      {addingRank && (
        <RankFormModal
          onClose={() => setAddingRank(false)}
          onSave={handleCreateRank}
          loading={actionLoading}
          title="Lisää uusi arvo"
        />
      )}

      {/* Edit Rank Modal */}
      {editingRank && (
        <RankFormModal
          rank={editingRank}
          onClose={() => setEditingRank(null)}
          onSave={(data) => handleUpdateRank(editingRank.id, data)}
          loading={actionLoading}
          title="Muokkaa arvoa"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingRank && (
        <DeleteConfirmModal
          rank={deletingRank}
          onClose={() => setDeletingRank(null)}
          onConfirm={() => handleDeleteRank(deletingRank.id)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// Rank Form Modal Component
function RankFormModal({ rank, onClose, onSave, loading, title }) {
  const [formData, setFormData] = useState({
    name: rank?.name || '',
    description: rank?.description || '',
    requiredScore: rank?.requiredScore || 0,
    minAccuracy: rank?.minAccuracy ?? '',
    icon: rank?.icon || '',
    color: rank?.color || '#ef4444',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      requiredScore: parseInt(formData.requiredScore, 10),
    };
    // Only include minAccuracy if provided, otherwise omit so platform-wide default applies
    if (formData.minAccuracy !== '' && formData.minAccuracy !== null) {
      data.minAccuracy = parseInt(formData.minAccuracy, 10);
    } else {
      delete data.minAccuracy;
    }
    onSave(data);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <h2 id="rank-modal-title" className="text-xl sm:text-2xl font-bold text-slate-50 mb-6">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" role="form" aria-label={title}>
          <div>
            <label htmlFor="rank-name" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Nimi *
            </label>
            <input
              type="text"
              id="rank-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="rank-required-score" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Vaaditut pisteet *
            </label>
            <input
              type="number"
              id="rank-required-score"
              value={formData.requiredScore}
              onChange={(e) => setFormData({ ...formData, requiredScore: e.target.value })}
              min="0"
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="rank-min-accuracy" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Vähimmäistarkkuus arvonnousuun (%) — tyhjä = käytä alustan oletusta
            </label>
            <input
              type="number"
              id="rank-min-accuracy"
              value={formData.minAccuracy}
              onChange={(e) => setFormData({ ...formData, minAccuracy: e.target.value })}
              min="0"
              max="100"
              placeholder="esim. 70"
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              aria-label="Vähimmäistarkkuus arvonnousuun"
            />
          </div>

          <div>
            <label htmlFor="rank-description" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Kuvaus
            </label>
            <textarea
              id="rank-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              aria-label="Arvon kuvaus"
            />
          </div>

          <div>
            <label htmlFor="rank-icon" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Ikoni (emoji)
            </label>
            <input
              type="text"
              id="rank-icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="⚡"
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              aria-label="Arvon ikoni"
            />
          </div>

          <div>
            <label htmlFor="rank-color" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Väri
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="rank-color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-12 border border-slate-800 rounded-xl bg-slate-950 cursor-pointer"
                aria-label="Arvon väri"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#ef4444"
                className="flex-1 px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                aria-label="Arvon värikoodi"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Peruuta"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Tallenna arvo"
            >
              {loading ? 'Tallennetaan...' : 'Tallenna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ rank, onClose, onConfirm, loading }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="delete-modal-title" className="text-xl sm:text-2xl font-bold text-red-600 mb-4 wrap-break-word">
          Poista arvo
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6 wrap-break-word">
          Haluatko varmasti poistaa arvon <strong className="text-slate-50 wrap-break-word">{rank.name}</strong>?
          <br />
          <br />
          <span className="text-red-500">Tämä toiminto on peruuttamaton.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
            aria-label="Peruuta poisto"
          >
            Peruuta
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
            aria-label="Vahvista arvon poisto"
          >
            {loading ? 'Poistetaan...' : 'Poista pysyvästi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RankManagement;
