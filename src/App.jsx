import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import CategoryManagement from './pages/CategoryManagement';
import RankManagement from './pages/RankManagement';
import QuestionManagement from './pages/QuestionManagement';
import Statistics from './pages/Statistics';
import PlatformConfiguration from './pages/PlatformConfiguration';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute adminOnly>
                <CategoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ranks"
            element={
              <ProtectedRoute adminOnly>
                <RankManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute adminOnly>
                <QuestionManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <ProtectedRoute adminOnly>
                <Statistics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute adminOnly>
                <PlatformConfiguration />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
