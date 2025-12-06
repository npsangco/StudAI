import React, { useState } from 'react';
import { Edit, Play, GripVertical, Trash2, MoreVertical, Share2, Plus, Sparkles, BookOpen, Users, Trophy, Circle, FileText, Clock, Target, Lock, Link2, Zap, Swords } from 'lucide-react';
import { API_URL } from '../../../config/api.config';
import { validateAllQuestions } from '../utils/validation';

// Utility: Get quiz accent color based on quiz ID
const getQuizAccentColor = (quizId) => {
  const colors = [
    'border-yellow-500',
    'border-indigo-500',
    'border-blue-500',
    'border-green-500',
    'border-purple-500',
    'border-pink-500',
    'border-orange-500',
    'border-teal-500'
  ];
  const index = parseInt(String(quizId).slice(-2), 10) % colors.length;
  return colors[index];
};

// Utility: Format relative time or date
const formatQuizDate = (dateString) => {
  if (!dateString) return '';

  // Parse the date - MySQL datetime is stored in local time, not UTC
  // We should NOT add 'Z' suffix as that would incorrectly treat it as UTC
  const date = new Date(dateString);

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  // Less than 1 minute
  if (diffMins < 1) return 'just now';

  // Less than 1 hour
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;

  // Less than 24 hours
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  // 1 day or more - show date in MM/DD/YY format
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${month}/${day}/${year}`;
};

// Share Code Input Component
const ShareCodeInput = ({ onImportQuiz, asTopCard = false, toast }) => {
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (shareCode.length !== 6) {
      setError('Enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/quizzes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ share_code: shareCode })
      });

      const data = await response.json();

      if (response.ok) {
        setShareCode('');
        if (onImportQuiz) onImportQuiz();
        toast.success('Quiz imported successfully!');
      } else {
        setError(data.error || 'Failed to import quiz');
      }
    } catch (err) {

      setError('Failed to import quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setShareCode(cleaned);
    setError('');
  };

  if (asTopCard) {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border-2 border-dashed border-yellow-300 p-3 sm:p-5 hover:border-yellow-400 transition-all">
        <div className="flex items-center gap-2 sm:gap-2 mb-2 sm:mb-3">
          <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Import Quiz</h3>
        </div>
        <p className="text-[10px] sm:text-xs text-gray-600 mb-2 sm:mb-3">Have a share code? Import a quiz from a friend</p>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={shareCode}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-center text-base sm:text-lg font-mono tracking-widest border-2 border-slate-300 rounded-lg sm:rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white cursor-text"
            disabled={loading}
          />
          <button
            onClick={handleImport}
            disabled={shareCode.length !== 6 || loading}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              shareCode.length === 6 && !loading
                ? 'bg-black text-white hover:bg-slate-800 shadow-md hover:shadow-lg cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-[10px] sm:text-xs text-red-600 font-medium">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-gray-600 uppercase">
        Import Quiz
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          maxLength={6}
          value={shareCode}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all cursor-text"
          disabled={loading}
        />
        <button
          onClick={handleImport}
          disabled={shareCode.length !== 6 || loading}
          className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
            shareCode.length === 6 && !loading
              ? 'bg-black text-white hover:bg-slate-800 cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? '...' : 'Import'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
};

// Mode Badge Component
const ModeBadge = ({ quiz }) => {
  if (!quiz.questionCount || quiz.questionCount === 0) return null;

  // Check if adaptive mode can be used (from backend calculation)
  const canUseAdaptive = quiz.canUseAdaptive;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        canUseAdaptive
          ? 'bg-purple-100 text-purple-700'
          : 'bg-amber-100 text-amber-700'
      }`}
    >
      {canUseAdaptive ? (
        <>
          <Target className="w-3 h-3" />
          <span>Adaptive</span>
        </>
      ) : (
        <>
          <Circle className="w-3 h-3" />
          <span>Classic</span>
        </>
      )}
    </span>
  );
};

// Quiz Item Component with Drag & Drop
const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect, onDelete, toast, validateAllQuestions }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showShareCode, setShowShareCode] = useState(false);
  const isBeingDragged = draggedIndex === index;
  const showDropIndicator = isDragOver && !isBeingDragged;
  const isEmpty = !quiz.questionCount || quiz.questionCount === 0;
  const isShared = quiz.shared_by_username;
  const isPublic = quiz.isPublic || quiz.is_public;
  const shareCode = quiz.share_code;
  const accentColor = getQuizAccentColor(quiz.id);
  const minQuestions = 10;
  const isPlayable = quiz.questionCount >= minQuestions;
  const questionsNeeded = isPlayable ? 0 : minQuestions - (quiz.questionCount || 0);

  // 🛡️ VALIDATION CHECK: Detect if quiz has errors
  const hasErrors = React.useMemo(() => {
    if (!quiz.questions || !Array.isArray(quiz.questions) || isEmpty) return false;
    if (!validateAllQuestions) return false;
    const validation = validateAllQuestions(quiz.questions);
    return !validation.isValid && validation.errors.length > 0;
  }, [quiz.questions, quiz.id, isEmpty, validateAllQuestions]);

  const handleDragStart = (e) => {
    e.currentTarget.style.cursor = 'grabbing';
    onDragStart(e, index);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.cursor = 'grab';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isBeingDragged) {
      setIsDragOver(true);
      onDragOver(e);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    setIsDragOver(false);
    onDrop(e, index);
  };

  const showTopIndicator = showDropIndicator && draggedIndex > index;
  const showBottomIndicator = showDropIndicator && draggedIndex < index;

  return (
    <div className="relative group">
      {showTopIndicator && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -mr-1"></div>
        </div>
      )}

      {showBottomIndicator && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50 z-10">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full -mr-1"></div>
        </div>
      )}

      {/* Drag Handle - Outside card */}
      <div className="hidden lg:block absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className={`w-5 h-5 ${isBeingDragged ? 'text-blue-500' : 'text-gray-400'}`} />
      </div>

      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible transition-all duration-200 ${
          isEmpty ? 'opacity-60' : ''
        } ${
          isBeingDragged
            ? 'opacity-40 scale-95 shadow-2xl border-2 border-dashed border-blue-400'
            : showDropIndicator
            ? 'border-2 border-blue-400 shadow-lg'
            : 'hover:shadow-lg'
        } ${isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          touchAction: 'none',
          borderLeftWidth: '4px'
        }}
      >
        {/* Accent Stripe */}
        <div className={`h-full w-1 absolute left-0 top-0 bottom-0 ${accentColor}`}></div>

        {/* ERROR BADGE - Shows if quiz has validation errors */}
        {hasErrors && !isEmpty && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-red-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg animate-pulse">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Errors</span>
            </div>
          </div>
        )}

        {/* INCOMPLETE BADGE - Shows if quiz doesn't have enough questions */}
        {!isEmpty && !isPlayable && !hasErrors && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-lg">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>+{questionsNeeded} to play</span>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Title Section */}
          <div className="mb-3">
            <h3
              onClick={() => isPlayable && onSelect(quiz)}
              className={`font-semibold text-lg text-gray-900 mb-1 truncate ${
                !isPlayable ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-indigo-600 transition-colors'
              }`}
              title={quiz.title}
            >
              {quiz.title}
              {isEmpty && (
                <span className="ml-2 text-sm text-red-500 font-normal">(Empty)</span>
              )}
              {!isEmpty && !isPlayable && (
                <span className="ml-2 text-sm text-amber-600 font-normal">(Needs {questionsNeeded} more)</span>
              )}
            </h3>
            {isShared && (
              <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                Shared by {quiz.shared_by_username}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {quiz.questionCount || 0} {quiz.questionCount === 1 ? 'question' : 'questions'}
            </span>
            <span className="text-gray-400">•</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {quiz.timer_per_question === 0 ? '∞' : `${quiz.timer_per_question || 30}s`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-xs" title={quiz.created_at || quiz.created}>
              {formatQuizDate(quiz.created_at || quiz.created)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Primary CTA - Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isPlayable) onSelect(quiz);
              }}
              disabled={!isPlayable}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                !isPlayable
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-slate-800 shadow-md hover:shadow-lg cursor-pointer'
              }`}
              title={!isPlayable ? `Add ${questionsNeeded} more question(s) to play` : 'Play Quiz'}
            >
              <Play className="w-4 h-4" />
              {isEmpty ? 'Add Questions' : isPlayable ? 'Play Quiz' : `Need ${questionsNeeded} more`}
            </button>

            {/* Secondary Actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quiz);
              }}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
              title="Edit Quiz"
            >
              <Edit className="w-4 h-4" />
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10 cursor-pointer" onClick={() => setShowMoreMenu(false)}></div>
                  <div className="absolute right-0 top-auto bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[180px] z-[100]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPublic && shareCode) {
                          setShowShareCode(true);
                          setShowMoreMenu(false);
                        }
                      }}
                      disabled={!isPublic || !shareCode}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                        isPublic && shareCode
                          ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                          : 'text-gray-400 cursor-not-allowed bg-gray-50'
                      }`}
                      title={!isPublic ? 'Enable public sharing in quiz editor to get a share code' : !shareCode ? 'No share code available' : 'View and copy share code'}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="flex-1">View Share Code</span>
                      {!isPublic && (
                        <Lock className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoreMenu(false);
                        onDelete(quiz);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Quiz
                    </button>
                  </div>
                </>
              )}

              {/* Share Code Modal */}
              {showShareCode && (
                <>
                  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setShowShareCode(false)}>
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="text-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <Share2 className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Share This Quiz</h3>
                        <p className="text-sm text-gray-600">Share this code with friends to import</p>
                      </div>

                      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 mb-4 border-2 border-yellow-300">
                        <div className="text-center">
                          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Import Code</div>
                          <div className="text-4xl font-mono font-bold text-gray-900 tracking-wider mb-3">{shareCode}</div>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(shareCode);
                                toast.success('Share code copied to clipboard!');
                              } catch (error) {
                                toast.error('Failed to copy share code');
                              }
                            }}
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all text-sm"
                          >
                            Copy Code
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowShareCode(false)}
                        className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all text-sm"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quiz List Component
export const QuizList = ({
  quizzes,
  draggedIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onEditQuiz,
  onQuizSelect,
  onDeleteQuiz,
  onCreateQuiz,
  onImportQuiz,
  toast
}) => {
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (shareCode.length !== 6) {
      setError('Enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_URL}/api/quizzes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ share_code: shareCode })
      });

      const data = await response.json();

      if (response.ok) {
        setShareCode('');
        if (onImportQuiz) onImportQuiz();
        toast.success('Quiz imported successfully!');
      } else {
        setError(data.error || 'Failed to import quiz');
      }
    } catch (err) {

      setError('Failed to import quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setShareCode(cleaned);
    setError('');
  };

  // Single container for both empty and list states
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]" data-tutorial="quiz-list">
      {quizzes.length === 0 ? (
        /* ============================================ */
        /* EMPTY STATE - No Header, Import at Top */
        /* ============================================ */
        <>
          {/* Import Quiz Section - Replaces Header */}
          <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border-2 border-dashed border-yellow-300 p-3 sm:p-5 hover:border-yellow-400 transition-all">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">Import Quiz</h3>
                  <p className="text-[10px] sm:text-xs text-gray-600 truncate">Got a 6-digit code? Import a quiz from a friend</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={shareCode}
                  onChange={(e) => handleChange(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-center text-base sm:text-lg font-mono tracking-widest border-2 border-yellow-300 rounded-lg sm:rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all bg-white"
                  disabled={loading}
                />
                <button
                  onClick={handleImport}
                  disabled={shareCode.length !== 6 || loading}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
                    shareCode.length === 6 && !loading
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Importing...' : 'Import'}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-[10px] sm:text-xs text-red-600 font-medium">{error}</p>
              )}
            </div>
          </div>

          {/* Empty State Content */}
          <div className="flex-1 overflow-y-auto px-6 py-2">
            <div className="flex items-center justify-center min-h-full">
              <div className="w-full max-w-2xl">
                {/* Header & Subtext*/}
                <div className="text-center mb-3">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">
                    Master Any Subject with Smart Quizzes
                  </h2>
                  <p className="text-xs text-gray-600">
                    Create your first quiz and start learning smarter today.
                  </p>
                </div>

                {/* Feature Cards - 2x2 Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Card 1 - 4 Question Types (Yellow) */}
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-2.5 border border-yellow-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-0.5">4 Question Types</h3>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      Multiple choice, fill-in-the-blanks, true/false, and matching pairs - mix and match for full experience
                    </p>
                  </div>

                  {/* Card 2 - Smart Difficulty System (Purple) */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2.5 border border-purple-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-0.5">Smart Difficulty System</h3>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      Adaptive mode auto-adjusts based on your accuracy, or choose Classic for traditional fixed-difficulty
                    </p>
                  </div>

                  {/* Card 3 - Live Quiz Battles (Blue) */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Swords className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-0.5">Live Quiz Battles</h3>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      Challenge friends in real-time competitions with instant leaderboards and synchronized questions
                    </p>
                  </div>

                  {/* Card 4 - Import & Collaborate (Green) */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2.5 border border-green-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-xs mb-0.5">Import & Collaborate</h3>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      Share quizzes using 6-digit codes - import from friends and study together effortlessly
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ============================================ */
        /* QUIZ LIST STATE - With Header */
        /* ============================================ */
        <>
          {/* Header */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-100" data-tutorial="quiz-list-header">
            <h2 className="text-2xl font-bold text-gray-900">My Quizzes</h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Import Card */}
              <ShareCodeInput onImportQuiz={onImportQuiz} asTopCard={true} toast={toast} />

              {/* Quiz Cards */}
              <div className="space-y-4">
                {quizzes.map((quiz, index) => (
                  <QuizItem
                    key={quiz.id}
                    quiz={quiz}
                    index={index}
                    draggedIndex={draggedIndex}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onEdit={onEditQuiz}
                    onSelect={onQuizSelect}
                    onDelete={onDeleteQuiz}
                    toast={toast}
                    validateAllQuestions={validateAllQuestions}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Section - Create Button (always visible) */}
      <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-100 bg-white rounded-b-xl">
        <button
          onClick={onCreateQuiz}
          data-tutorial="create-quiz"
          className="w-full bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg cursor-pointer"
        >
          + Create New Quiz
        </button>
      </div>
    </div>
  );
};
