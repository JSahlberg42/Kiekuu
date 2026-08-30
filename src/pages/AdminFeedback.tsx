import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/images/Kiekuu_logo.jpg';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { manageFeedback } from '../services/feedbackService';
import type { FeedbackStatus } from '../types/models';

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
  status?: FeedbackStatus;
  isSpam?: boolean;
  spamReason?: string;
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
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Real-time listener so status changes from the admin reflect immediately.
  useEffect(() => {
    if (loading || userData?.role !== 'admin') return;
    const feedbackQuery = query(
      collection(db, 'feedback'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      feedbackQuery,
      (snapshot) => {
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
            status: data.status || 'unread',
            isSpam: data.isSpam || false,
            spamReason: data.spamReason || '',
          };
        });

        // Drop selections for feedback that no longer exists.
        setSelected(prev => {
          const existing = new Set(feedbackData.map(f => f.id));
          const next = new Set([...prev].filter(id => existing.has(id)));
          return prev.size === next.size ? prev : next;
        });
        setFeedbacks(feedbackData);
        setIsLoading(false);
        setError('');
      },
      (err) => {
        console.error('Failed to load feedbacks:', err);
        setError('Palautteiden lataaminen epäonnistui.');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [loading, userData?.role]);

  // Reset to the first page whenever filters, sort, search, or page size change.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    filterStatus,
    filterSentiment,
    filterPriority,
    filterAiStatus,
    search,
    sortField,
    sortDirection,
    pageSize,
  ]);

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

  const getStatusColor = (status?: FeedbackStatus) => {
    switch (status) {
      case 'unread': return 'bg-blue-900/20 text-blue-300 border-blue-600';
      case 'read': return 'bg-slate-900/20 text-slate-300 border-slate-600';
      case 'ok': return 'bg-green-900/20 text-green-400 border-green-600';
      case 'spam': return 'bg-red-900/20 text-red-400 border-red-600';
      default: return 'bg-slate-900/20 text-slate-300 border-slate-600';
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

  const updateSelected = (id: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => {
      const allIds = filteredAndSortedFeedbacks.map(f => f.id);
      const everySelected = allIds.length > 0 && allIds.every(id => prev.has(id));
      return everySelected ? new Set<string>() : new Set(allIds);
    });
  };

  const runAction = async (
    ids: string[],
    action: 'setStatus' | 'markSpam' | 'delete' | 'reclassify',
    status?: FeedbackStatus,
    spamReason?: string
  ) => {
    setBusy(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    setError('');
    try {
      await Promise.all(ids.map(id =>
        manageFeedback({ action, feedbackId: id, status, spamReason })
      ));
      if (action === 'delete') {
        setSelected(prev => {
          const next = new Set([...prev].filter(id => !ids.includes(id)));
          return next;
        });
      }
    } catch (err) {
      console.error('Feedback action failed:', err);
      setError((err as Error).message || 'Toiminto epäonnistui.');
    } finally {
      setBusy(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const confirmBatchDelete = () => {
    const count = selected.size;
    if (window.confirm(`Poistetaanko ${count} palaute(t)? Tätä ei voi kumota.`)) {
      void runAction([...selected], 'delete');
    }
  };

  const confirmDeleteOne = (id: string) => {
    if (window.confirm('Poistetaanko palaute? Tätä ei voi kumota.')) {
      void runAction([id], 'delete');
    }
  };

  const filteredAndSortedFeedbacks = feedbacks
    .filter(feedback => {
      if (filterStatus && (feedback.status || 'unread') !== filterStatus) return false;
      if (filterSentiment && feedback.sentiment !== filterSentiment) return false;
      if (filterPriority && feedback.priority !== filterPriority) return false;
      if (filterAiStatus && feedback.aiStatus !== filterAiStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          `${feedback.message || ''} ${feedback.user.displayName || ''} ${feedback.user.email || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
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

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedFeedbacks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedFeedbacks = filteredAndSortedFeedbacks.slice(pageStart, pageStart + pageSize);

  const clearFilters = () => {
    setFilterStatus('');
    setFilterSentiment('');
    setFilterPriority('');
    setFilterAiStatus('');
    setSearch('');
  };

  const hasActiveFilters = !!(filterStatus || filterSentiment || filterPriority || filterAiStatus || search);

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
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">Access denied</div>;
  }

  const unreadCount = feedbacks.filter(f => (f.status || 'unread') === 'unread').length;
  const spamCount = feedbacks.filter(f => (f.status || 'unread') === 'spam').length;
  const allSelected = filteredAndSortedFeedbacks.length > 0
    && filteredAndSortedFeedbacks.every(f => selected.has(f.id));

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
            Yhteensä {feedbacks.length} palautetta · {unreadCount} lukematonta · {spamCount} roskapostia
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 border border-red-600 text-red-300 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {selected.size > 0 && (
          <div className="mb-6 bg-blue-900/20 border border-blue-600 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-blue-100">
                {selected.size} valittu
              </span>
              <button
                onClick={() => void runAction([...selected], 'setStatus', 'read')}
                disabled={busy.size > 0}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-50 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Merkitse luetuksi
              </button>
              <button
                onClick={() => void runAction([...selected], 'setStatus', 'ok')}
                disabled={busy.size > 0}
                className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Merkitse OK
              </button>
              <button
                onClick={() => void runAction([...selected], 'markSpam')}
                disabled={busy.size > 0}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Merkitse roskapostiksi
              </button>
              <button
                onClick={() => void runAction([...selected], 'reclassify')}
                disabled={busy.size > 0}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Luokittele uudelleen
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={busy.size > 0}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                Poista
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-sm text-slate-300 hover:text-white underline"
              >
                Tyypä valinta
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-50 mb-4">Filters & Sorting</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kaikki tilat</option>
                <option value="unread">Lukemattomat</option>
                <option value="read">Luettu</option>
                <option value="ok">OK</option>
                <option value="spam">Roskaposti</option>
              </select>
            </div>

            {/* Sentiment Filter */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Sentiment
              </label>
              <select
                value={filterSentiment}
                onChange={(e) => setFilterSentiment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kaikki sentimentit</option>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kaikki prioriteetit</option>
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
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Kaikki AI-tilat</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="done">Done</option>
                <option value="skipped_invalid_input">Skipped (Invalid)</option>
                <option value="disabled">Disabled</option>
                <option value="skipped_rate_limit">Skipped (Rate Limit)</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Haku
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Etsi viestiä, nimeä, sähköpostia..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
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
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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

          {hasActiveFilters && (
            <div className="mt-4 flex gap-2 flex-wrap items-center">
              {filterStatus && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-900/20 text-blue-300 rounded-full text-sm">
                  Tila: {getStatusLabel(filterStatus as FeedbackStatus)}
                  <button onClick={() => setFilterStatus('')} className="hover:text-blue-100">×</button>
                </span>
              )}
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
              {search && (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/20 text-emerald-300 rounded-full text-sm">
                  Haku: {search}
                  <button onClick={() => setSearch('')} className="hover:text-emerald-100">×</button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                Tyypennä suodattimet
              </button>
            </div>
          )}
        </div>

        {/* Feedback Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4" aria-hidden="true"></div>
              <p className="text-slate-400">Ladataan palautteita...</p>
            </div>
          ) : filteredAndSortedFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Ei palautteita vastaamaan suodattimia.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        aria-label="Select all"
                        className="h-4 w-4 rounded accent-orange-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Tila
                    </th>
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
                  {pagedFeedbacks.map((feedback) => {
                    const rowBusy = busy.has(feedback.id);
                    return (
                      <tr
                        key={feedback.id}
                        className={`transition-colors ${feedback.isSpam ? 'bg-red-950/40 hover:bg-red-950/60' : 'hover:bg-slate-950'}`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(feedback.id)}
                            onChange={(e) => updateSelected(feedback.id, e.target.checked)}
                            aria-label={`Select ${feedback.id}`}
                            className="h-4 w-4 rounded accent-orange-500"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(feedback.status)}`}>
                            {getStatusLabel(feedback.status)}
                          </span>
                          {feedback.isSpam && feedback.spamReason && (
                            <div className="text-[11px] text-red-400 mt-1 max-w-[120px] truncate" title={feedback.spamReason}>
                              {feedback.spamReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {formatDate(feedback.createdAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-50 flex items-center gap-1">
                            {feedback.user.displayName || 'Nimetön'}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2">
                            <span>
                              {feedback.publishApproved
                                ? (feedback.publishNameApproved ? 'Julkinen' : 'Julkinen, anonyymi')
                                : 'Ei julkinen'}
                            </span>
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(feedback.sentiment)}`}>
                            {feedback.sentiment || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(feedback.priority)}`}>
                            {feedback.priority || 'Not classified'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAiStatusColor(feedback.aiStatus)}`}>
                            {feedback.aiStatus || 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <p className="text-sm text-slate-300 truncate" title={feedback.message}>
                            {feedback.message || '(no message)'}
                          </p>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-col gap-1.5 min-w-[150px]">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => void runAction([feedback.id], 'setStatus', 'read')}
                                disabled={rowBusy || feedback.status === 'read'}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-50 rounded-lg text-xs transition-colors"
                                title="Merkitse luetuksi"
                              >
                                Luettu
                              </button>
                              <button
                                onClick={() => void runAction([feedback.id], 'setStatus', 'ok')}
                                disabled={rowBusy || feedback.status === 'ok'}
                                className="px-2 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
                                title="Merkö OK"
                              >
                                OK
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              {feedback.isSpam ? (
                                <button
                                  onClick={() => void runAction([feedback.id], 'markSpam')}
                                  disabled={rowBusy}
                                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs transition-colors"
                                >
                                  Roskaposti
                                </button>
                              ) : (
                                <button
                                  onClick={() => void runAction([feedback.id], 'markSpam')}
                                  disabled={rowBusy}
                                  className="px-2 py-1 bg-slate-700 hover:bg-red-700 text-white rounded-lg text-xs transition-colors"
                                >
                                  Roskaposti
                                </button>
                              )}
                              <button
                                onClick={() => void runAction([feedback.id], 'reclassify')}
                                disabled={rowBusy || feedback.aiStatus === 'processing'}
                                className="px-2 py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
                              >
                                🔄 Luokittele
                              </button>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => window.alert(`User ID: ${feedback.id}\nEmail: ${feedback.user.email}\nStatus: ${feedback.status}\nSummary: ${feedback.summary || 'N/A'}\nMessage: ${feedback.message}`)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs transition-colors"
                              >
                                👁 Näytä
                              </button>
                              <button
                                onClick={() => confirmDeleteOne(feedback.id)}
                                disabled={rowBusy}
                                className="px-2 py-1 bg-red-900 hover:bg-red-800 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
                              >
                                Poista
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination controls */}
          {!isLoading && filteredAndSortedFeedbacks.length > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950">
              <div className="text-sm text-slate-400">
                Näytetään {pageStart + 1}–{Math.min(pageStart + pageSize, filteredAndSortedFeedbacks.length)} / {filteredAndSortedFeedbacks.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  ← Edellinen
                </button>
                <span className="text-sm text-slate-400 whitespace-nowrap">
                  Sivu {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-50 rounded-lg text-sm font-medium transition-colors"
                >
                  Seuraava →
                </button>
              </div>
            </div>
          )}

          {/* Page size selector */}
          {!isLoading && filteredAndSortedFeedbacks.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900">
              <label className="text-sm text-slate-400">
                Näytä:
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-50 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
              </select>
              <span className="text-xs text-slate-500">per sivu</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminFeedback;

const getStatusLabel = (status?: FeedbackStatus) => {
  switch (status) {
    case 'unread': return 'Lukematon';
    case 'read': return 'Luettu';
    case 'ok': return 'OK';
    case 'spam': return 'Roskaposti';
    default: return 'Lukematon';
  }
};