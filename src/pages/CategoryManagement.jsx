import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function CategoryManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      fetchCategories();
    }
  }, [authLoading, userData]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedCategories = await getAllCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      setError('Virhe kategorioiden hakemisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      setActionLoading(true);
      setError('');
      await createCategory(categoryData);
      await fetchCategories();
      setAddingCategory(false);
    } catch (err) {
      setError('Virhe kategorian luomisessa');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCategory = async (categoryId, updates) => {
    try {
      setActionLoading(true);
      setError('');
      await updateCategory(categoryId, updates);
      await fetchCategories();
      setEditingCategory(null);
    } catch (err) {
      setError('Virhe kategorian päivittämisessä');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setActionLoading(true);
      setError('');
      await deleteCategory(categoryId);
      await fetchCategories();
      setDeletingCategory(null);
    } catch (err) {
      setError('Virhe kategorian poistamisessa');
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">Kategoriahallinta</h1>
              <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
                Hallitse kysymyskategorioita
              </p>
            </div>
            <button
              onClick={() => setAddingCategory(true)}
              className="px-6 py-3 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 rounded-xl font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2"
              aria-label="Lisää uusi kategoria"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Lisää kategoria
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.length === 0 ? (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">Ei kategorioita. Lisää ensimmäinen kategoria.</p>
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-slate-50 mb-2 break-words">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-slate-400 mb-3 break-words">
                        {category.description}
                      </p>
                    )}
                    {category.color && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 break-all">
                        <div
                          className="w-4 h-4 rounded flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{category.color}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                    aria-label={`Muokkaa kategoriaa ${category.name}`}
                  >
                    Muokkaa
                  </button>
                  <button
                    onClick={() => setDeletingCategory(category)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                    aria-label={`Poista kategoria ${category.name}`}
                  >
                    Poista
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {addingCategory && (
        <CategoryFormModal
          onClose={() => setAddingCategory(false)}
          onSave={handleCreateCategory}
          loading={actionLoading}
          title="Lisää uusi kategoria"
        />
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <CategoryFormModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSave={(data) => handleUpdateCategory(editingCategory.id, data)}
          loading={actionLoading}
          title="Muokkaa kategoriaa"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCategory && (
        <DeleteConfirmModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onConfirm={() => handleDeleteCategory(deletingCategory.id)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// Category Form Modal Component
function CategoryFormModal({ category, onClose, onSave, loading, title }) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '',
    color: category?.color || '#f97316',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="category-modal-title" className="text-xl sm:text-2xl font-bold text-slate-50 mb-6">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" role="form" aria-label={title}>
          <div>
            <label htmlFor="category-name" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Nimi *
            </label>
            <input
              type="text"
              id="category-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
              aria-required="true"
            />
          </div>

          <div>
            <label htmlFor="category-description" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Kuvaus
            </label>
            <textarea
              id="category-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              aria-label="Kategorian kuvaus"
            />
          </div>

          <div>
            <label htmlFor="category-icon" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Ikoni (emoji)
            </label>
            <input
              type="text"
              id="category-icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="🔥"
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              aria-label="Kategorian ikoni"
            />
          </div>

          <div>
            <label htmlFor="category-color" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Väri
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                id="category-color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-16 h-12 border border-slate-800 rounded-xl bg-slate-950 cursor-pointer"
                aria-label="Kategorian väri"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#f97316"
                className="flex-1 px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                aria-label="Kategorian värikoodi"
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
              className="flex-1 px-4 py-3 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Tallenna kategoria"
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
function DeleteConfirmModal({ category, onClose, onConfirm, loading }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="delete-modal-title" className="text-xl sm:text-2xl font-bold text-red-600 mb-4 break-words">
          Poista kategoria
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6 break-words">
          Haluatko varmasti poistaa kategorian <strong className="text-slate-50 break-words">{category.name}</strong>?
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
            aria-label="Vahvista kategorian poisto"
          >
            {loading ? 'Poistetaan...' : 'Poista pysyvästi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CategoryManagement;
