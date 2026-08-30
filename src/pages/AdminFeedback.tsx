import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/Kiekuu_logo.jpg';
import { collection, query, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

interface Feedback {
  id: string;
  rating: number;
  message: string;
  publishApproved: boolean;
  publishNameApproved: boolean;
  createdAt: Timestamp | string | null;
  user: {
    uid: string;
    displayName?: string;
    email?: string;
  };
  aiStatus?: string;
  sentiment?: string;
  topics?: string[];
  priority?: string;
  summary?: string;
  action?: string;
}

type SortField = 'createdAt' | 'rating' | 'sentiment' | 'priority';
type SortDirection = 'asc' | 'desc';

function AdminFeedback() {
  const { userData, loading } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterSentiment, setFilterSentiment] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterAiStatus, setFilterAiStatus] = useState<string>('');

  const loadFeedbacks = async () => {
    try {
      setError('');

      const feedbackQuery = query(
        collection(db, 'feedback'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(feedbackQuery);
      const feedbackData: Feedback[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          rating: data.rating || 0,
          message: data.message || '',
          publishApproved: data.publishApproved || false,
          publishNameApproved: data.publishNameApproved || false,
          createdAt: data.createdAt,
          user: data.user || { uid: '', displayName: '', email: '' },
          aiStatus: data.aiStatus || 'pending',
          sentiment: data.sentiment,
          topics: data.topics || [],
          priority: data.priority,
          summary: data.summary,
          action: data.action,
        };
      });

      setFeedbacks(feedbackData);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
      setError('Palautteiden lataaminen epäonnistui.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && userData?.role === 'admin') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFeedbacks();
    }
  }, [loading, userData?.role]);

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-900/20 text-red-400 border-red-600';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400 border-yellow-600';
      case 'low': return 'bg-green-900/20 text-green-400 border-green-600';
      default: return 'bg-slate-900/20 text-slate-400 border-slate-600';
    }
  };

  const getAiStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'done': return 'bg-green-900/20 text-green-400 border-green-600';
      case 'processing': return 'bg-blue-900/20 text-blue-400 border-blue-600';
      case 'pending': return 'bg-slate-900/20 text-slate-400 border-slate-600';
      case 'skipped_invalid_input': return 'bg-orange-900/20 text-orange-400 border-orange-600';
      case 'disabled': return 'bg-gray-900/20 text-gray-400 border-gray-600';
      case 'skipped_rate_limit': return 'bg-purple-900/20 text-purple-400 border-purple-600';
      default: return 'bg-slate-900/20 text-slate-400 border-slate-600';
    }
  };

  const getTimeMs = (timestamp: unknown): number => {
    if (!timestamp) return 0;
    try {
      if (typeof timestamp === 'object' && timestamp !== null) {
        const ts = timestamp as { toDate?: unknown; toMillis?: unknown; seconds?: unknown };
        if (typeof ts.toDate === 'function') {
          const result = (ts.toDate as () => Date).call(ts);
          return (result as Date).getTime();
        }
        if (typeof ts.toMillis === 'function') {
          return (ts.toMillis as () => number).call(ts);
        }
        if (typeof ts.seconds === 'number') {
          return ts.seconds * 1000;
        }
      }
      if (typeof timestamp === 'string') {
        const d = new Date(timestamp);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }
    } catch {
      return 0;
    }
    return 0;
  };

  const formatDate = (timestamp: unknown) => {
    if (!timestamp) return 'N/A';
    try {
      if (typeof timestamp === 'object' && timestamp !== null) {
        const ts = timestamp as { toDate?: unknown; seconds?: unknown };
        if (typeof ts.toDate === 'function') {
          const result = (ts.toDate as () => Date).call(ts);
          return new Date(result as Date).toLocaleDateString('fi-FI', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        }
        if (typeof ts.seconds === 'number') {
          return new Date(ts.seconds * 1000).toLocaleDateString('fi-FI', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        }
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('fi-FI', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const filteredAndSortedFeedbacks = feedbacks
    .filter(feedback => {
      if (filterSentiment && feedback.sentiment !== filterSentiment) return false;
      if (filterPriority && feedback.priority !== filterPriority) return false;
      if (filterAiStatus && feedback.aiStatus !== filterAiStatus) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      if (sortField === 'createdAt') {
        aValue = getTimeMs(a.createdAt);
        bValue = getTimeMs(b.createdAt);
      } else if (sortField === 'rating') {
        aValue = a.rating || 0;
        bValue = b.rating || 0;
      } else {
        aValue = a[sortField] ?? '';
        bValue = b[sortField] ?? '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-slate-400">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 h-16">
            <Link to="/admin" className="flex items-center gap-3">
              <div 
                className="w-10 h-10 sm:w-12 sm:h-12 bg-center bg-no-repeat bg-contain"
                style={{ backgroundImage: `url(${logo})` }}
              />
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Kiekuu Admin</h1>
            </Link>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">Feedback Management</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
            View and manage user feedback (total: {feedbacks.length})
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-600 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Filters & Sorting</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sentiment Filter */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Sentiment
              </label>
              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* AI Status Filter */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                AI Status
              </label>
              <select
                value={filterAiStatus}
                onChange={(e) => setFilterAiStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="done">Done</option>
                <option value="skipped_invalid_input">Skipped (Invalid)</option>
                <option value="disabled">Disabled</option>
                <option value="skipped_rate_limit">Skipped (Rate Limit)</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="createdAt">Date</option>
                  <option value="rating">Rating</option>
                  <option value="sentiment">Sentiment</option>
                  <option value="priority">Priority</option>
                </select>
                <button
                  onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-50 transition-colors"
                  aria-label="Toggle sort direction"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {(filterSentiment || filterPriority || filterAiStatus) && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {filterSentiment && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/20 text-blue-300 rounded-full text-sm">
                  Sentiment: {filterSentiment}
                  <button onClick={() => setFilterSentiment('')} className="hover:text-blue-100">×</button>
                </span>
              )}
              {filterPriority && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-orange-900/20 text-orange-300 rounded-full text-sm">
                  Priority: {filterPriority}
                  <button onClick={() => setFilterPriority('')} className="hover:text-orange-100">×</button>
                </span>
              )}
              {filterAiStatus && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/20 text-purple-300 rounded-full text-sm">
                  Status: {filterAiStatus}
                  <button onClick={() => setFilterAiStatus('')} className="hover:text-purple-100">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilterSentiment('');
                  setFilterPriority('');
                  setFilterAiStatus('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Feedback Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4" aria-hidden="true"></div>
              <p className="text-slate-400">Loading feedback...</p>
            </div>
          ) : filteredAndSortedFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No feedback found matching the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Sentiment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      AI Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Message Preview
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredAndSortedFeedbacks.map((feedback) => (
                    <tr key={feedback.id} className="hover:bg-slate-950 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatDate(feedback.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-50">
                          {feedback.user.displayName || 'Anonymous'}
                        </div>
                        <div className="text-sm text-slate-400">
                          {feedback.user.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400">★</span>
                          <span className="text-sm font-medium text-slate-50 ml-1">
                            {feedback.rating}/5
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(feedback.sentiment)}`}>                          {feedback.sentiment || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(feedback.priority)}`}>                          {feedback.priority || 'Not classified'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAiStatusColor(feedback.aiStatus)}`}>                          {feedback.aiStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 max-w-xs">
                        <p className="text-sm text-slate-300 truncate" title={feedback.message}>
                          {feedback.message || '(no message)'}
                        </p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => alert(`User ID: ${feedback.user.uid}\nEmail: ${feedback.user.email}\nMessage: ${feedback.message}`)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => alert('Feature coming soon: Reply to feedback')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminFeedback;