import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import logo from '../assets/images/Kiekuu_logo.jpg';

function AdminDashboard() {
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 h-16">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain"
                style={{ backgroundImage: `url(${logo})` }}
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Kiekuu</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-amber-400 uppercase tracking-widest">Admin</span>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">Admin Dashboard</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">Manage Kiekuu platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Questions Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Questions</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">Manage quiz questions and answers</p>
            <Link
              to="/admin/questions"
              className="block w-full bg-orange-500 text-slate-50 px-4 py-3 rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Hallitse kysymyksiä"
            >
              Manage Questions
            </Link>
          </div>

          {/* Users Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-600/20 rounded-xl">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Users</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">View and manage user accounts</p>
            <Link
              to="/admin/users"
              className="block w-full bg-red-600 text-slate-50 px-4 py-3 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Hallitse käyttäjiä"
            >
              Manage Users
            </Link>
          </div>

          {/* Categories Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-amber-400/20 rounded-xl">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Categories</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">Organize question categories</p>
            <Link
              to="/admin/categories"
              className="block w-full bg-amber-400 text-slate-950 px-4 py-3 rounded-xl hover:bg-amber-500 active:bg-amber-600 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Hallitse kategorioita"
            >
              Manage Categories
            </Link>
          </div>

          {/* Statistics */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Statistics</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">View platform analytics</p>
            <Link
              to="/admin/statistics"
              className="block w-full bg-orange-500 text-slate-50 px-4 py-3 rounded-xl hover:bg-orange-600 active:bg-orange-700 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Näytä tilastot"
            >
              View Statistics
            </Link>
          </div>

          {/* Ranks Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-red-600/20 rounded-xl">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Ranks</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">Configure rank progression system</p>
            <Link
              to="/admin/ranks"
              className="block w-full bg-red-600 text-slate-50 px-4 py-3 rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Hallitse arvoja"
            >
              Manage Ranks
            </Link>
          </div>

          {/* Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-slate-700/50 rounded-xl">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="ml-4 text-lg sm:text-xl font-semibold text-orange-500 uppercase tracking-wide">Settings</h2>
            </div>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mb-4">Platform configuration</p>
            <Link
              to="/admin/settings"
              className="block w-full bg-slate-700 text-slate-50 px-4 py-3 rounded-xl hover:bg-slate-600 active:bg-slate-500 transition-colors font-semibold min-h-[44px] text-center"
              aria-label="Asetukset"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
