import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, updateUser, deleteUserData } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

function UserManagement() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && userData?.role === 'admin') {
      fetchUsers();
    }
  }, [authLoading, userData]);

  useEffect(() => {
    if (searchEmail.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchEmail, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
      setFilteredUsers(fetchedUsers);
    } catch (err) {
      setError('Virhe käyttäjien hakemisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (userId, updates) => {
    try {
      setActionLoading(true);
      setError('');
      await updateUser(userId, updates);
      await fetchUsers();
      setEditingUser(null);
    } catch (err) {
      setError('Virhe käyttäjän päivittämisessä');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      setActionLoading(true);
      setError('');
      await deleteUserData(userId);
      await fetchUsers();
      setDeletingUser(null);
    } catch (err) {
      setError('Virhe käyttäjän poistamisessa');
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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">Käyttäjähallinta</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
            Hae, muokkaa ja hallitse käyttäjiä
          </p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-slate-50 px-4 py-3 rounded-xl mb-6" role="alert">
            {error}
          </div>
        )}

        {/* Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          <label htmlFor="search-email" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
            Hae sähköpostilla
          </label>
          <input
            type="email"
            id="search-email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="esim. kayttaja@example.com"
            className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
            aria-label="Hae käyttäjiä sähköpostiosoitteella"
          />
          <p className="mt-2 text-xs text-slate-500">
            Löydetty {filteredUsers.length} käyttäjää
          </p>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">Ei käyttäjiä</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-slate-50">
                        {user.displayName || 'Ei nimeä'}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wide ${
                          user.role === 'admin'
                            ? 'bg-amber-400/20 text-amber-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {user.role || 'user'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-1">{user.email}</p>
                    <p className="text-xs text-slate-500">
                      Taso: {user.rank || 'harjoittelija'} | Pisteet: {user.progress?.totalScore || 0}
                    </p>
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-3">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Muokkaa käyttäjää ${user.displayName || user.email}`}
                    >
                      Muokkaa
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                      aria-label={`Poista käyttäjä ${user.displayName || user.email}`}
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

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleEditUser}
          loading={actionLoading}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <DeleteConfirmModal
          user={deletingUser}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => handleDeleteUser(deletingUser.id)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSave, loading }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    email: user.email || '',
    role: user.role || 'user',
    rank: user.rank || 'harjoittelija',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.id, formData);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="edit-modal-title" className="text-xl sm:text-2xl font-bold text-slate-50 mb-4">
          Muokkaa käyttäjää
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" role="form" aria-label="Muokkaa käyttäjätietoja">
          <div>
            <label htmlFor="edit-displayName" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Nimi
            </label>
            <input
              type="text"
              id="edit-displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Sähköposti
            </label>
            <input
              type="email"
              id="edit-email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-role" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Rooli
            </label>
            <select
              id="edit-role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-rank" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Taso
            </label>
            <input
              type="text"
              id="edit-rank"
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Peruuta muokkaus"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Tallenna muutokset"
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
function DeleteConfirmModal({ user, onClose, onConfirm, loading }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="delete-modal-title" className="text-xl sm:text-2xl font-bold text-red-600 mb-4">
          Poista käyttäjä
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6">
          Haluatko varmasti poistaa käyttäjän <strong className="text-slate-50">{user.displayName || user.email}</strong>?
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
            aria-label="Vahvista käyttäjän poisto"
          >
            {loading ? 'Poistetaan...' : 'Poista pysyvästi'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
