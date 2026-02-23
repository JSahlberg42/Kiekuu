import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading, userDataLoading } = useAuth();

  console.log('ProtectedRoute:', { isAuthenticated, isAdmin, loading, userDataLoading, adminOnly });

  if (loading || (adminOnly && userDataLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-sm sm:text-base text-slate-400">Ladataan...</p>
          <span className="sr-only">Sisältö latautuu, odota hetki</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to /landing');
    return <Navigate to="/landing" replace />;
  }

  if (adminOnly && !isAdmin) {
    console.log('Not admin, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('ProtectedRoute: Rendering children');
  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  adminOnly: PropTypes.bool,
};

export default ProtectedRoute;
