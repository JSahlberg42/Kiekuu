import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { getAllQuestions, createQuestion, updateQuestion, deleteQuestion } from '../services/questionService';
import { getAllCategories } from '../services/categoryService';
import { generateQuestions, readFileContent, type AiFileData } from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import type { Category, Question, QuestionSource, GeneratedQuestion } from '../types/models';

function QuestionManagement() {
  const { user, userData, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading || userData?.role !== 'admin') return;
    let cancelled = false;
    Promise.all([getAllQuestions(), getAllCategories()])
      .then(([fetchedQuestions, fetchedCategories]) => {
        if (cancelled) return;
        setQuestions(fetchedQuestions);
        setCategories(fetchedCategories);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        setError('Virhe tietojen hakemisessa');
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, userData]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const categoryMap = categories.reduce<Record<string, string>>((acc, category) => {
    acc[category.id] = category.name || '';
    return acc;
  }, {});

  const matchesSearch = (question: Question) => {
    if (!normalizedQuery) return true;

    const categoryName = categoryMap[question.categoryId || ''] || '';
    const createdByName = question.createdBy?.displayName || '';
    const createdByEmail = question.createdBy?.email || '';
    const optionsText = (question.options || []).join(' ');

    const haystack = [
      question.question,
      optionsText,
      question.explanation,
      categoryName,
      createdByName,
      createdByEmail,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  };

  const sortQuestions = (list: Question[]): Question[] => {
      switch (sortOption) {
        case 'oldest':
          return [...list].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        case 'question-asc':
          return [...list].sort((a, b) => (a.question || '').localeCompare(b.question || '', 'fi'));
        case 'question-desc':
          return [...list].sort((a, b) => (b.question || '').localeCompare(a.question || '', 'fi'));
        case 'category-asc':
          return [...list].sort((a, b) => {
            const aName = categoryMap[a.categoryId || ''] || '';
            const bName = categoryMap[b.categoryId || ''] || '';
            return aName.localeCompare(bName, 'fi');
          });
        case 'category-desc':
          return [...list].sort((a, b) => {
            const aName = categoryMap[a.categoryId || ''] || '';
            const bName = categoryMap[b.categoryId || ''] || '';
            return bName.localeCompare(aName, 'fi');
          });
        case 'newest':
        default:
          return [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      }
};

const filteredQuestions = sortQuestions(
  questions
    .filter(q => selectedCategory === 'all' || q.categoryId === selectedCategory)
    .filter(matchesSearch)
);

const fetchQuestions = async () => {
    try {
      setError('');
      const fetchedQuestions = await getAllQuestions();
      setQuestions(fetchedQuestions);
    } catch (err) {
      setError('Virhe kysymysten hakemisessa');
      console.error(err);
    }
  };

  interface CreatedByInfo {
    uid: string | null;
    displayName: string | null;
    email: string | null;
  }

  const buildCreatedBy = (): CreatedByInfo => ({
    uid: userData?.uid || user?.uid || null,
    displayName: userData?.displayName || user?.displayName || null,
    email: userData?.email || user?.email || null,
  });

  const handleCreateQuestion = async (questionData: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setActionLoading(true);
      setError('');
      await createQuestion({
        ...questionData,
        createdBy: buildCreatedBy(),
      });
      await fetchQuestions();
      setAddingQuestion(false);
    } catch (err) {
      setError('Virhe kysymyksen luomisessa');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQuestion = async (questionId: string, updates: Partial<Omit<Question, 'id'>>) => {
    try {
      setActionLoading(true);
      setError('');
      await updateQuestion(questionId, updates);
      await fetchQuestions();
      setEditingQuestion(null);
    } catch (err) {
      setError('Virhe kysymyksen päivittämisessä');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      setActionLoading(true);
      setError('');
      await deleteQuestion(questionId);
      await fetchQuestions();
      setDeletingQuestion(null);
    } catch (err) {
      setError('Virhe kysymyksen poistamisessa');
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkCreateQuestions = async (questionsArray: GeneratedQuestionWithCategory[]) => {
    try {
      setError('');
      const createdBy = buildCreatedBy();
      const promises = questionsArray.map(q => createQuestion({
        ...q,
        createdBy,
      }));
      await Promise.all(promises);
      await fetchQuestions();
    } catch (err) {
      setError('Virhe kysymysten luomisessa');
      console.error(err);
      throw err;
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-50">
              Kysymysten hallinta
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-300 mt-2">
              Hallitse tietokilpailun kysymyksiä ja vastauksia
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

        {/* Filters and Actions */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="question-search" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Haku
              </label>
              <input
                id="question-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hae kysymyksistä, vaihtoehdoista tai tekijästä"
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              />
            </div>
            <div>
              <label htmlFor="question-category-filter" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Kategoria
              </label>
              <select
                id="question-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                aria-label="Suodata kategorian mukaan"
              >
                <option value="all">Kaikki kategoriat ({questions.length})</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({questions.filter(q => q.categoryId === category.id).length})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="question-sort" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Järjestys
              </label>
              <select
                id="question-sort"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              >
                <option value="newest">Uusimmat ensin</option>
                <option value="oldest">Vanhimmat ensin</option>
                <option value="question-asc">Kysymys A–Z</option>
                <option value="question-desc">Kysymys Z–A</option>
                <option value="category-asc">Kategoria A–Z</option>
                <option value="category-desc">Kategoria Z–A</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setGeneratingWithAI(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px] flex items-center justify-center gap-2"
              aria-label="Generoi kysymyksiä tekoälyllä"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI-generaattori
            </button>
            <button
              onClick={() => setAddingQuestion(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors min-h-[44px]"
              aria-label="Lisää uusi kysymys"
            >
              + Lisää kysymys
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-400">
                {selectedCategory === 'all' 
                  ? 'Ei kysymyksiä. Lisää ensimmäinen kysymys.' 
                  : 'Ei kysymyksiä tässä kategoriassa.'}
              </p>
            </div>
          ) : (
            filteredQuestions.map((question) => {
              const category = categories.find(c => c.id === question.categoryId);
              const createdAtLabel = question.createdAt
                ? new Date(question.createdAt).toLocaleDateString('fi-FI')
                : '-';
              const createdByName = question.createdBy?.displayName || question.createdBy?.email || '-';
              return (
                <div
                  key={question.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Category Badge */}
                      {category && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-400 rounded-lg text-xs font-medium">
                            {category.icon && <span>{category.icon}</span>}
                            {category.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Question Text */}
                      <h3 className="text-base sm:text-lg font-semibold text-slate-50 mb-3 wrap-break-word">
                        {question.question}
                      </h3>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mb-3">
                        <span>Luonut: {createdByName}</span>
                        <span>Luotu: {createdAtLabel}</span>
                      </div>
                      
                      {/* Options */}
                      <div className="space-y-2 mb-3">
                        {question.options?.map((option, index) => (
                          <div
                            key={index}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                              index === question.correctIndex
                                ? 'bg-green-500/20 text-green-400 font-medium'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="font-semibold shrink-0">
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="wrap-break-word">{option}</span>
                            {index === question.correctIndex && (
                              <svg className="w-4 h-4 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Explanation */}
                      {question.explanation && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-3">
                          <p className="text-xs font-medium uppercase tracking-widest text-blue-400 mb-1">Selitys</p>
                          <p className="text-sm text-slate-300 wrap-break-word">{question.explanation}</p>
                        </div>
                      )}
                      
                      {/* Source */}
                      {question.source && (
                        <div className="text-xs text-slate-500">
                          Lähde: {question.source.title}
                          {question.source.page && `, s. ${question.source.page}`}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:gap-3 lg:shrink-0">
                      <button
                        onClick={() => setEditingQuestion(question)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                        aria-label={`Muokkaa kysymystä: ${question.question}`}
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => setDeletingQuestion(question)}
                        className="flex-1 lg:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-slate-50 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                        aria-label={`Poista kysymys: ${question.question}`}
                      >
                        Poista
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Question Modal */}
      {addingQuestion && (
        <QuestionFormModal
          categories={categories}
          onClose={() => setAddingQuestion(false)}
          onSave={handleCreateQuestion}
          loading={actionLoading}
          title="Lisää uusi kysymys"
          initialCategoryId={selectedCategory !== 'all' ? selectedCategory : ''}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <QuestionFormModal
          question={editingQuestion}
          categories={categories}
          onClose={() => setEditingQuestion(null)}
          onSave={(data) => handleUpdateQuestion(editingQuestion.id, data)}
          loading={actionLoading}
          title="Muokkaa kysymystä"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingQuestion && (
        <DeleteConfirmModal
          question={deletingQuestion}
          onClose={() => setDeletingQuestion(null)}
          onConfirm={() => handleDeleteQuestion(deletingQuestion.id)}
          loading={actionLoading}
        />
      )}

      {/* AI Generation Modal */}
      {generatingWithAI && (
        <AIGenerationModal
          categories={categories}
          onClose={() => setGeneratingWithAI(false)}
          onGenerate={handleBulkCreateQuestions}
          initialCategoryId={selectedCategory !== 'all' ? selectedCategory : ''}
        />
      )}
    </div>
  );
}

interface QuestionFormData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  categoryId: string;
  source: Required<Pick<QuestionSource, 'title' | 'page' | 'url'>>;
}

type QuestionFormOutput = Omit<QuestionFormData, 'source'> & { source?: QuestionSource };

interface QuestionFormModalProps {
  question?: Question | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: QuestionFormOutput) => void | Promise<void>;
  loading: boolean;
  title: string;
  initialCategoryId?: string;
}

// Question Form Modal Component
function QuestionFormModal({ question, categories, onClose, onSave, loading, title, initialCategoryId = '' }: QuestionFormModalProps) {
  const [formData, setFormData] = useState<QuestionFormData>(() => ({
    question: question?.question || '',
    options: question?.options || ['', '', '', ''],
    correctIndex:
      typeof question?.correctIndex === 'number'
        ? question.correctIndex
        : parseInt(String(question?.correctIndex ?? ''), 10) || 0,
    explanation: question?.explanation || '',
    categoryId: question?.categoryId || initialCategoryId,
    source: {
      title: question?.source?.title || '',
      page: question?.source?.page || '',
      url: question?.source?.url || '',
    },
  }));

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData({ ...formData, options: [...formData.options, ''] });
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        options: newOptions,
        correctIndex: formData.correctIndex >= index && formData.correctIndex > 0 
          ? formData.correctIndex - 1 
          : formData.correctIndex,
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Filter out empty options
    const filteredOptions = formData.options.filter(opt => opt.trim() !== '');
    
    if (filteredOptions.length < 2) {
      alert('Kysymyksessä tulee olla vähintään kaksi vastausvaihtoehtoa');
      return;
    }
    
    const questionData: QuestionFormOutput = {
      question: formData.question,
      options: filteredOptions,
      correctIndex: Math.min(formData.correctIndex, filteredOptions.length - 1),
      explanation: formData.explanation,
      categoryId: formData.categoryId,
    };
    
    // Remove empty source fields
    if (formData.source.title || formData.source.page || formData.source.url) {
      questionData.source = formData.source;
    }
    
    onSave(questionData);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 sm:p-8 my-8">
        <h2 id="question-modal-title" className="text-xl sm:text-2xl font-bold text-slate-50 mb-6">
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5" role="form" aria-label={title}>
          {/* Category Selection */}
          <div>
            <label htmlFor="question-category" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Kategoria *
            </label>
            <select
              id="question-category"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              required
            >
              <option value="">Valitse kategoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label htmlFor="question-text" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Kysymys *
            </label>
            <textarea
              id="question-text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
              required
              aria-required="true"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Vastausvaihtoehdot *
            </label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={formData.correctIndex === index}
                      onChange={() => setFormData({ ...formData, correctIndex: index })}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500 focus:ring-2"
                      aria-label={`Merkitse vastaus ${String.fromCharCode(65 + index)} oikeaksi`}
                    />
                    <span className="text-slate-300 font-semibold shrink-0">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Vastausvaihtoehto ${String.fromCharCode(65 + index)}`}
                      className="flex-1 px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                    />
                  </div>
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-xl transition-colors min-h-[44px]"
                      aria-label={`Poista vastausvaihtoehto ${String.fromCharCode(65 + index)}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {formData.options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors min-h-[44px]"
              >
                + Lisää vaihtoehto
              </button>
            )}
          </div>

          {/* Explanation */}
          <div>
            <label htmlFor="question-explanation" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
              Selitys
            </label>
            <textarea
              id="question-explanation"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              rows={3}
              placeholder="Selitä miksi oikea vastaus on oikein..."
              className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
          </div>

          {/* Source Information */}
          <div className="border-t border-slate-800 pt-5">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Lähdetiedot (valinnainen)</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={formData.source.title}
                onChange={(e) => setFormData({ ...formData, source: { ...formData.source, title: e.target.value } })}
                placeholder="Lähteen nimi"
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={formData.source.page}
                  onChange={(e) => setFormData({ ...formData, source: { ...formData.source, page: e.target.value } })}
                  placeholder="Sivunumero"
                  className="px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                />
                <input
                  type="url"
                  value={formData.source.url}
                  onChange={(e) => setFormData({ ...formData, source: { ...formData.source, url: e.target.value } })}
                  placeholder="URL"
                  className="px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              aria-label="Tallenna kysymys"
            >
              {loading ? 'Tallennetaan...' : 'Tallenna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  question: Question;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ question, onClose, onConfirm, loading }: DeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 sm:p-8">
        <h2 id="delete-modal-title" className="text-xl sm:text-2xl font-bold text-red-600 mb-4 wrap-break-word">
          Poista kysymys
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6 wrap-break-word">
          Haluatko varmasti poistaa kysymyksen: <strong className="text-slate-50 wrap-break-word">{question.question}</strong>?
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
            aria-label="Vahvista kysymyksen poisto"
          >
            {loading ? 'Poistetaan...' : 'Poista pysyvästi'}
          </button>
        </div>
      </div>
    </div>
  );
}

type GeneratedQuestionWithCategory = GeneratedQuestion & { categoryId: string };

interface AIGenerationModalProps {
  categories: Category[];
  onClose: () => void;
  onGenerate: (questions: GeneratedQuestionWithCategory[]) => Promise<void>;
  initialCategoryId?: string;
}

interface AIGenerationFormData {
  categoryId: string;
  questionCount: number;
  difficulty: string;
  contextType: 'text' | 'url' | 'file';
  contextText: string;
  contextUrl: string;
  contextFile: File | null;
}

// AI Generation Modal Component
function AIGenerationModal({ categories, onClose, onGenerate, initialCategoryId = '' }: AIGenerationModalProps) {
  const [formData, setFormData] = useState<AIGenerationFormData>({
    categoryId: initialCategoryId,
    questionCount: 5,
    difficulty: 'medium',
    contextType: 'text',
    contextText: '',
    contextUrl: '',
    contextFile: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionWithCategory[]>([]);
  const [step, setStep] = useState(1); // 1: input, 2: review

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, contextFile: file });
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');

      // Get context based on type
      let context = '';
      let fileData: AiFileData | undefined;
      let url = '';
      
      if (formData.contextType === 'text') {
        context = formData.contextText;
        if (!context.trim()) {
          throw new Error('Anna kontekstiteksti');
        }
      } else if (formData.contextType === 'url') {
        if (!formData.contextUrl.trim()) {
          throw new Error('Anna URL-osoite');
        }
        // Pass URL directly to AI (Gemini 3 Flash URL Context tool)
        url = formData.contextUrl;
      } else if (formData.contextType === 'file') {
        if (!formData.contextFile) {
          throw new Error('Valitse tiedosto');
        }
        const fileContent = await readFileContent(formData.contextFile);
        
        // Check if it's a PDF (returns object) or text file (returns string)
        if (typeof fileContent !== 'string' && 'mimeType' in fileContent) {
          fileData = fileContent;
        } else if (typeof fileContent === 'string') {
          context = fileContent;
        }
      }

      if (!formData.categoryId) {
        throw new Error('Valitse kategoria');
      }

      const category = categories.find(c => c.id === formData.categoryId);
      
      // Generate questions with AI
      const questions = await generateQuestions({
        context,
        url,
        fileData,
        questionCount: formData.questionCount,
        difficulty: formData.difficulty,
        categoryName: category?.name || 'Yleinen',
      });

      // Add categoryId to each question
      const questionsWithCategory = questions.map(q => ({
        ...q,
        categoryId: formData.categoryId,
      }));

      setGeneratedQuestions(questionsWithCategory);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Virhe kysymysten generoinnissa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setLoading(true);
      setError('');
      await onGenerate(generatedQuestions);
      onClose();
    } catch (err) {
      setError('Virhe kysymysten tallentamisessa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const removeQuestion = (index: number) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-modal-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 sm:p-8 my-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-xl">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 id="ai-modal-title" className="text-xl sm:text-2xl font-bold text-slate-50">
              AI-kysymysgeneraattori
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Sulje"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-xl" role="alert">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {step === 1 ? (
          // Step 1: Input Parameters
          <div className="space-y-6">
            {/* Category Selection */}
            <div>
              <label htmlFor="ai-category" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                Kategoria *
              </label>
              <select
                id="ai-category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                required
              >
                <option value="">Valitse kategoria</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Count and Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="ai-count" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kysymysten määrä
                </label>
                <input
                  type="number"
                  id="ai-count"
                  value={formData.questionCount}
                  onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) })}
                  min="1"
                  max="20"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="ai-difficulty" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Vaikeustaso
                </label>
                <select
                  id="ai-difficulty"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                >
                  <option value="easy">Helppo (Easy)</option>
                  <option value="medium">Keskitaso (Medium)</option>
                  <option value="hard">Vaikea (Hard)</option>
                  <option value="pro">Ammattilainen (Pro)</option>
                </select>
              </div>
            </div>

            {/* Context Type Selection */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-3">
                Kontekstin lähde *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contextType: 'text' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors min-h-[44px] ${
                    formData.contextType === 'text'
                      ? 'bg-purple-600 text-slate-50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Teksti
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contextType: 'url' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors min-h-[44px] ${
                    formData.contextType === 'url'
                      ? 'bg-purple-600 text-slate-50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contextType: 'file' })}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors min-h-[44px] ${
                    formData.contextType === 'file'
                      ? 'bg-purple-600 text-slate-50'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Tiedosto
                </button>
              </div>
            </div>

            {/* Context Input */}
            {formData.contextType === 'text' && (
              <div>
                <label htmlFor="ai-context-text" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Kontekstiteksti * <span className="text-green-500 text-[10px] font-normal">(Suositeltu)</span>
                </label>
                <textarea
                  id="ai-context-text"
                  value={formData.contextText}
                  onChange={(e) => setFormData({ ...formData, contextText: e.target.value })}
                  rows={8}
                  placeholder="Liitä tähän oppimateriaaliteksti, josta kysymykset generoidaan..."
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  ✓ Luotettavin tapa: Kopioi ja liitä teksti oppimateriaalista, artikkelista tai ohjekirjasta.
                </p>
              </div>
            )}

            {formData.contextType === 'url' && (
              <div>
                <label htmlFor="ai-context-url" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  URL-osoite *
                </label>
                <input
                  type="url"
                  id="ai-context-url"
                  value={formData.contextUrl}
                  onChange={(e) => setFormData({ ...formData, contextUrl: e.target.value })}
                  placeholder="https://esimerkki.fi/oppimateriaali"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                  required
                />
                <div className="mt-2 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <p className="text-xs text-green-500">
                    ✓ Gemini 3 Flash hae sisällön suoraan URL-osoitteesta (ei CORS-rajoituksia). Tukee HTML, PDF, JSON, XML, CSV (max 34MB).
                  </p>
                </div>
              </div>
            )}

            {formData.contextType === 'file' && (
              <div>
                <label htmlFor="ai-context-file" className="block text-xs font-medium uppercase tracking-widest text-slate-400 mb-2">
                  Tiedosto *
                </label>
                <input
                  type="file"
                  id="ai-context-file"
                  onChange={handleFileChange}
                  accept=".txt,.md,.pdf,application/pdf"
                  className="w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-50 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-slate-50 file:font-medium hover:file:bg-purple-700"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">
                  Tuetut tiedostomuodot: .txt, .md, .pdf (PDF-tuki Gemini 3 Flash -mallilla)
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                Peruuta
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loading ? 'Generoidaan...' : 'Generoi kysymykset'}
              </button>
            </div>
          </div>
        ) : (
          // Step 2: Review Generated Questions
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Generoitu {generatedQuestions.length} kysymystä
              </p>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-purple-500 hover:text-purple-400"
              >
                ← Takaisin
              </button>
            </div>

            {/* Generated Questions List */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {generatedQuestions.map((question, index) => (
                <div
                  key={index}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="font-semibold text-slate-50 flex-1">{question.question}</h4>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="p-1 hover:bg-red-600/20 rounded-sm text-red-500"
                      aria-label="Poista kysymys"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2 mb-3">
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          optIndex === question.correctIndex
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-semibold">{String.fromCharCode(65 + optIndex)}.</span>
                        <span className="flex-1">{option}</span>
                        {optIndex === question.correctIndex && (
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>

                  {question.explanation && (
                    <p className="text-xs text-slate-400 mb-2">
                      <strong>Selitys:</strong> {question.explanation}
                    </p>
                  )}

                  {question.source && (
                    <p className="text-xs text-slate-500">
                      <strong>Lähde:</strong> {question.source.title}
                      {question.source.page && `, ${question.source.page}`}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Save Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                Peruuta
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={loading || generatedQuestions.length === 0}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-slate-50 rounded-xl font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {loading ? 'Tallennetaan...' : `Tallenna kaikki (${generatedQuestions.length})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuestionManagement;
