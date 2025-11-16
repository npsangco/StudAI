import React, { useState } from 'react';
import { Edit, Play, GripVertical, Trash2, MoreVertical, Share2, Plus, Sparkles, BookOpen, Users, Trophy } from 'lucide-react';
import { API_URL } from '../../../config/api.config';

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

// Share Code Input Component
const ShareCodeInput = ({ onImportQuiz, asTopCard = false }) => {
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
        alert(`Quiz "${data.quiz.title}" imported successfully!`);
      } else {
        setError(data.error || 'Failed to import quiz');
      }
    } catch (err) {
      console.error('Import error:', err);
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
            <span className="text-base sm:text-lg">🔗</span>
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
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-center text-base sm:text-lg font-mono tracking-widest border-2 border-yellow-300 rounded-lg sm:rounded-xl focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all bg-white"
            disabled={loading}
          />
          <button
            onClick={handleImport}
            disabled={shareCode.length !== 6 || loading}
            className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              shareCode.length === 6 && !loading
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-sm hover:shadow-md'
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
          className="flex-1 px-3 py-2 text-sm font-mono border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
          disabled={loading}
        />
        <button
          onClick={handleImport}
          disabled={shareCode.length !== 6 || loading}
          className={`px-4 py-2 text-sm rounded-lg font-semibold transition-all ${
            shareCode.length === 6 && !loading
              ? 'bg-blue-500 text-white hover:bg-blue-600'
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

// Difficulty Badge Component
const DifficultyBadge = ({ difficulty, count }) => {
  const configs = {
    easy: { color: 'bg-green-100 text-green-800', emoji: '🟢', label: 'Easy' },
    medium: { color: 'bg-yellow-100 text-yellow-800', emoji: '🟡', label: 'Med' },
    hard: { color: 'bg-red-100 text-red-800', emoji: '🔴', label: 'Hard' }
  };

  const config = configs[difficulty];
  if (!config || !count) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className="text-[10px]">{config.emoji}</span>
      {count}
    </span>
  );
};

// Quiz Item Component with Drag & Drop - REDESIGNED
const QuizItem = ({ quiz, index, draggedIndex, onDragStart, onDragOver, onDrop, onEdit, onSelect, onDelete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isBeingDragged = draggedIndex === index;
  const showDropIndicator = isDragOver && !isBeingDragged;
  const isEmpty = !quiz.questionCount || quiz.questionCount === 0;
  const isShared = quiz.shared_by_username;
  const accentColor = getQuizAccentColor(quiz.id);

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

      {/* Drag Handle - Outside card for better UX */}
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
        className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 ${
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

        <div className="p-6">
          {/* Title Section */}
          <div className="mb-3">
            <h3
              onClick={() => !isEmpty && onSelect(quiz)}
              className={`font-semibold text-lg text-gray-900 mb-1 ${
                isEmpty ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer hover:text-indigo-600 transition-colors'
              }`}
            >
              {quiz.title}
              {isEmpty && (
                <span className="ml-2 text-sm text-red-500 font-normal">(Empty)</span>
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
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span>📝 {quiz.questionCount || 0} questions</span>
            <span className="text-gray-400">•</span>
            <span>{quiz.created}</span>
          </div>

          {/* Difficulty Badges */}
          {quiz.difficulty_breakdown && (
            <div className="flex items-center gap-2 mb-4">
              <DifficultyBadge difficulty="easy" count={quiz.difficulty_breakdown.easy} />
              <DifficultyBadge difficulty="medium" count={quiz.difficulty_breakdown.medium} />
              <DifficultyBadge difficulty="hard" count={quiz.difficulty_breakdown.hard} />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Primary CTA - Play Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isEmpty) onSelect(quiz);
              }}
              disabled={isEmpty}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                isEmpty
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95'
              }`}
            >
              <Play className="w-4 h-4" />
              {isEmpty ? 'Add Questions' : 'Play Quiz'}
            </button>

            {/* Secondary Actions */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quiz);
              }}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
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
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)}></div>
                  <div className="absolute right-0 bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-20">
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
  onImportQuiz
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
        alert(`Quiz "${data.quiz.title}" imported successfully!`);
      } else {
        setError(data.error || 'Failed to import quiz');
      }
    } catch (err) {
      console.error('Import error:', err);
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col max-h-[calc(100vh-7rem)]">
      {quizzes.length === 0 ? (
        /* ============================================ */
        /* EMPTY STATE - No Header, Import at Top */
        /* ============================================ */
        <>
          {/* Import Quiz Section - Replaces Header - Responsive */}
          <div className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg sm:rounded-xl border-2 border-dashed border-yellow-300 p-3 sm:p-5 hover:border-yellow-400 transition-all">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-lg sm:text-xl">✨</span>
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

          {/* Empty State Content - Ultra Compact for Desktop */}
          <div className="flex-1 overflow-y-auto px-6 py-3">
            <div className="flex items-center justify-center min-h-full">
              <div className="w-full max-w-2xl">
                <div className="flex flex-col items-center justify-center text-center mb-3">
                  {/* Animated Icon - Ultra Compact */}
                  <div className="relative mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>

                  {/* Main Message - Ultra Compact */}
                  <h2 className="text-base font-bold text-gray-900 mb-1">
                    Your Quiz Library Awaits
                  </h2>
                  <p className="text-[11px] text-gray-600 max-w-md leading-tight">
                    Start creating interactive quizzes, challenge friends in real-time battles, and earn rewards as you study!
                  </p>
                </div>

                {/* Enhanced Feature Cards - 2x2 Grid - Ultra Compact */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Feature 1 - Question Types */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border border-indigo-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-[11px] mb-0.5">4 Question Types</h3>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      Multiple choice, fill-in-the-blanks, true/false, and matching pairs - mix and match for maximum engagement
                    </p>
                  </div>

                  {/* Feature 2 - Battle Mode */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-[11px] mb-0.5">Live Quiz Battles</h3>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      Challenge up to 5 players in real-time PvP battles with instant leaderboards and competitive scoring
                    </p>
                  </div>

                  {/* Feature 3 - Rewards */}
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-[11px] mb-0.5">Points & Rewards</h3>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      Earn points and EXP with every quiz - level up your pet buddy and track your study streaks
                    </p>
                  </div>

                  {/* Feature 4 - Import & Collaborate */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200 hover:shadow-md transition-all">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-1.5 shadow-sm">
                      <Share2 className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-[11px] mb-0.5">Import & Collaborate</h3>
                    <p className="text-[9px] text-gray-600 leading-tight">
                      Import quizzes from classmates using 6-digit codes - study together and share knowledge effortlessly
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
          {/* Header - Fixed */}
          <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">My Quizzes</h2>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Import Card - Top Position */}
              <ShareCodeInput onImportQuiz={onImportQuiz} asTopCard={true} />

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
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Bottom Section - Create Button (always visible) */}
      <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-100 bg-white">
        <button
          onClick={onCreateQuiz}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-md hover:shadow-lg active:scale-95"
        >
          + Create New Quiz
        </button>
      </div>
    </div>
  );
};
