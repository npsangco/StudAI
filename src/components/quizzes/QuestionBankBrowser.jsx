import React, { useState, useEffect } from 'react';
import { Search, Filter, Database, X, Plus, CheckCircle, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '../../config/api.config';

// ============================================
// QUESTION BANK BROWSER COMPONENT
// ============================================

export const QuestionBankBrowser = ({ onSelectQuestions, onClose, toast }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sourceQuizFilter, setSourceQuizFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, [page, typeFilter, difficultyFilter, sourceQuizFilter, searchTerm]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (typeFilter) params.append('type', typeFilter);
      if (difficultyFilter) params.append('difficulty', difficultyFilter);
      if (sourceQuizFilter) params.append('sourceQuizId', sourceQuizFilter);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_URL}/api/question-bank?${params}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 50, pages: 0 });
      } else {
        toast.error(data.error || 'Failed to load question bank');
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load question bank');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/question-bank/stats`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const toggleSelection = (questionId) => {
    setSelectedIds(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map(q => q.question_id));
    }
  };

  const handleInsert = () => {
    if (selectedIds.length === 0) {
      toast.warning('Please select at least one question');
      return;
    }

    const selectedQuestions = questions.filter(q => selectedIds.includes(q.question_id));
    onSelectQuestions(selectedQuestions);
    onClose();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Multiple Choice': return '📝';
      case 'Fill in the blanks': return '✍️';
      case 'True/False': return '✓✗';
      case 'Matching': return '🔗';
      default: return '❓';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Question Bank</h2>
                <p className="text-sm text-gray-500">
                  {stats && `${stats.total} questions available`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search and Actions */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="Multiple Choice">Multiple Choice</option>
                  <option value="Fill in the blanks">Fill in the blanks</option>
                  <option value="True/False">True/False</option>
                  <option value="Matching">Matching</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Quiz</label>
                <select
                  value={sourceQuizFilter}
                  onChange={(e) => setSourceQuizFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Sources</option>
                  {stats?.topSources.map(source => (
                    <option key={source.quizId} value={source.quizId}>
                      {source.quizTitle} ({source.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">
                {selectedIds.length} question{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {selectedIds.length === questions.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleInsert}
                  className="px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Insert Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Database className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No questions found</p>
              <p className="text-sm">Create quizzes with questions to build your question bank</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((question) => (
                <QuestionBankItem
                  key={question.question_id}
                  question={question}
                  isSelected={selectedIds.includes(question.question_id)}
                  onToggle={toggleSelection}
                  getDifficultyColor={getDifficultyColor}
                  getTypeIcon={getTypeIcon}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// QUESTION BANK ITEM COMPONENT
// ============================================

const QuestionBankItem = ({ question, isSelected, onToggle, getDifficultyColor, getTypeIcon }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-purple-300 bg-purple-50 shadow-sm'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={() => onToggle(question.question_id)}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-purple-600 border-purple-600'
                : 'border-gray-300 bg-white'
            }`}
          >
            {isSelected && <CheckCircle className="w-4 h-4 text-white" fill="currentColor" />}
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-medium text-gray-800 flex-1">
              {question.question}
            </h3>
            <span className="text-xl flex-shrink-0">{getTypeIcon(question.type)}</span>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${getDifficultyColor(question.difficulty)}`}>
              {question.difficulty}
            </span>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
              {question.type}
            </span>
            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1">
              <Database className="w-3 h-3" />
              {question.quiz?.title || 'Unknown Quiz'}
            </span>
            <span className="text-gray-500">
              {question.points} {question.points === 1 ? 'point' : 'points'}
            </span>
          </div>

          {/* Preview Answer (expandable) */}
          {expanded && (
            <div className="mt-3 p-3 bg-white rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 mb-1">Correct Answer:</p>
              {question.type === 'Multiple Choice' && (
                <p className="text-sm text-gray-700">{question.correct_answer}</p>
              )}
              {question.type === 'Fill in the blanks' && (
                <p className="text-sm text-gray-700">{question.answer}</p>
              )}
              {question.type === 'True/False' && (
                <p className="text-sm text-gray-700">{question.correct_answer}</p>
              )}
              {question.type === 'Matching' && question.matching_pairs && (
                <div className="space-y-1">
                  {Object.entries(question.matching_pairs).map(([left, right]) => (
                    <p key={left} className="text-sm text-gray-700">
                      {left} → {right}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            {expanded ? 'Hide answer' : 'Show answer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionBankBrowser;
