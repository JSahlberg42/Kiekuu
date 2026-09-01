import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
const Home = lazy(() => import('./pages/Home'));
const QuizBrowser = lazy(() => import('./pages/QuizBrowser'));
const QuizTake = lazy(() => import('./pages/QuizTake'));
const Progress = lazy(() => import('./pages/Progress'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Feedback = lazy(() => import('./pages/Feedback'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const CategoryManagement = lazy(() => import('./pages/CategoryManagement'));
const RankManagement = lazy(() => import('./pages/RankManagement'));
const QuestionManagement = lazy(() => import('./pages/QuestionManagement'));
const Statistics = lazy(() => import('./pages/Statistics'));
const PlatformConfiguration = lazy(() => import('./pages/PlatformConfiguration'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));

const routeFallback = (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center" role="status" aria-live="polite">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto" aria-hidden="true"></div>
      <p className="mt-4 text-sm sm:text-base text-slate-400">Ladataan...</p>
    </div>
  </div>
);

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
                <Suspense fallback={routeFallback}>
                  <Home />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <QuizBrowser />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/take"
            element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <QuizTake />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress"
            element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <Progress />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <Leaderboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <Feedback />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <AdminDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <UserManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <CategoryManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ranks"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <RankManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <QuestionManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/statistics"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <Statistics />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <PlatformConfiguration />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={routeFallback}>
                  <AdminFeedback />
                </Suspense>
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
