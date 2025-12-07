import React from 'react';
import { X, AlertTriangle, Trash2, AlertCircle, User, Users, Zap, Trophy, FileText } from 'lucide-react';

export const QuizModal = ({ quiz, isOpen, onClose, onSoloQuiz, onQuizBattle }) => {
  const totalQuestions = quiz?.questionCount || 10;
  const minQuestionsInBank = 10;
  const minSelectableQuestions = 5;
  const reserveQuestions = 5;
  
  const maxSelectableQuestions = Math.max(minSelectableQuestions, totalQuestions - reserveQuestions);
  
  const [questionCount, setQuestionCount] = React.useState(maxSelectableQuestions);
  const [selectedMode, setSelectedMode] = React.useState(null);
  const [showModeSelection, setShowModeSelection] = React.useState(false);
  const [showBattleModeSelection, setShowBattleModeSelection] = React.useState(false);
  const [showModesInfoModal, setShowModesInfoModal] = React.useState(false);
  const [showAdaptiveTooltip, setShowAdaptiveTooltip] = React.useState(false);
  const [showBattleAdaptiveTooltip, setShowBattleAdaptiveTooltip] = React.useState(false);
  
  // Check if adaptive mode is available
  const canUseAdaptive = quiz?.canUseAdaptive || quiz?.can_use_adaptive || false;
  const difficultyDistribution = quiz?.difficultyDistribution || quiz?.difficulty_distribution || { easy: 0, medium: 0, hard: 0 };

  React.useEffect(() => {
    if (quiz) {
      setQuestionCount(maxSelectableQuestions);
      setSelectedMode(null);
      setShowModeSelection(false);
      setShowBattleModeSelection(false);
    }
  }, [quiz?.id, maxSelectableQuestions]);

  if (!isOpen || !quiz) return null;

  const handleQuestionCountChange = (e) => {
    const value = e.target.value;
    
    // Allow empty input for easier editing
    if (value === '') {
      setQuestionCount('');
      return;
    }
    
    const numValue = parseInt(value);
    
    // Allow typing any number, but clamp on blur
    if (!isNaN(numValue)) {
      setQuestionCount(numValue);
    }
  };
  
  const handleQuestionCountBlur = () => {
    // Validate and clamp the value when user leaves the field
    if (questionCount === '' || questionCount < minSelectableQuestions) {
      setQuestionCount(minSelectableQuestions);
    } else if (questionCount > maxSelectableQuestions) {
      setQuestionCount(maxSelectableQuestions);
    }
  };

  const handleSoloClick = () => {
    setShowModeSelection(true);
    setShowBattleModeSelection(false);
  };

  const handleModeSelect = (mode) => {
    // Prevent adaptive mode if not available
    if (mode === 'adaptive' && !canUseAdaptive) {
      return;
    }
    
    if (mode === 'normal' || mode === 'casual' || mode === 'adaptive') {
      // Ensure valid question count before starting
      const validCount = Math.max(minSelectableQuestions, Math.min(maxSelectableQuestions, questionCount || minSelectableQuestions));
      onSoloQuiz(validCount, mode);
    }
  };

  const handleBackToMain = () => {
    setShowModeSelection(false);
    setShowBattleModeSelection(false);
    setSelectedMode(null);
  };

  const handleQuizBattleClick = () => {
    setShowBattleModeSelection(true);
    setShowModeSelection(false);
  };

  const handleBattleModeSelect = (mode) => {
    // Prevent adaptive mode if not available
    if (mode === 'adaptive' && !canUseAdaptive) {
      return;
    }
    
    if (mode === 'normal' || mode === 'casual' || mode === 'adaptive') {
      // Ensure valid question count before starting
      const validCount = Math.max(minSelectableQuestions, Math.min(maxSelectableQuestions, questionCount || minSelectableQuestions));
      onQuizBattle(validCount, mode);
    }
  };

  // Generate tooltip message explaining why adaptive mode is disabled
  const getAdaptiveDisabledMessage = () => {
    const { easy = 0, medium = 0, hard = 0 } = difficultyDistribution;
    const uniqueDifficulties = [easy > 0, medium > 0, hard > 0].filter(Boolean).length;
    
    if (uniqueDifficulties < 2) {
      // All questions have the same difficulty
      const singleDifficulty = easy > 0 ? 'Easy' : medium > 0 ? 'Medium' : hard > 0 ? 'Hard' : 'Unknown';
      return `All ${totalQuestions} questions are ${singleDifficulty} difficulty. Adaptive mode needs at least 2 different difficulty levels.`;
    }
    
    // Generic fallback
    return 'This quiz needs at least 2 different difficulty levels to use Adaptive mode.';
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black/60 via-indigo-900/40 to-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-gray-900 via-indigo-950 to-black rounded-2xl sm:rounded-3xl max-w-lg w-full mx-auto relative shadow-2xl animate-scale-in overflow-hidden border-2 border-yellow-500/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated glow effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-indigo-500/10 pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 bg-black/40 hover:bg-yellow-500/20 backdrop-blur-sm rounded-full transition-all duration-200 group border border-yellow-500/20 hover:border-yellow-500/50"
        >
          <X className="w-5 h-5 text-yellow-400/80 group-hover:text-yellow-400" />
        </button>

        {/* Header Section */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600 pt-6 sm:pt-7 pb-7 sm:pb-9 px-4 sm:px-6 text-center overflow-hidden border-b-2 border-yellow-600/50">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-24 sm:w-32 h-24 sm:h-32 bg-yellow-300/20 rounded-full -translate-x-12 sm:-translate-x-16 -translate-y-12 sm:-translate-y-16 blur-2xl"></div>
          <div className="absolute bottom-0 right-0 w-32 sm:w-40 h-32 sm:h-40 bg-amber-500/20 rounded-full translate-x-16 sm:translate-x-20 translate-y-16 sm:translate-y-20 blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

          <div className="relative">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-black/20 backdrop-blur-sm rounded-xl sm:rounded-2xl mb-2 sm:mb-3 shadow-2xl border-2 border-yellow-300/30">
              <Zap className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-lg" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1 sm:mb-1.5 drop-shadow-md tracking-tight">Ready to Quiz?</h2>
            <p className="text-gray-800 text-xs sm:text-sm font-semibold drop-shadow-sm">Choose your challenge mode</p>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="px-4 sm:px-6 mt-4 mb-4 space-y-3 relative">
          <div className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 border-2 border-yellow-400/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-3 relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-black/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-yellow-300/30">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1 drop-shadow-sm" title={quiz.title}>{quiz.title}</h3>
                <p className="text-xs sm:text-sm text-gray-800 font-medium">{totalQuestions} questions available</p>
              </div>
            </div>
          </div>

          {/* Question Count Selector */}
          {totalQuestions >= minSelectableQuestions && (
            <div className="bg-gradient-to-br from-indigo-950/80 to-black/80 backdrop-blur-xl border-2 border-indigo-500/30 rounded-xl p-3.5 shadow-lg">
              <label className="block text-sm font-semibold text-yellow-400 mb-2.5">
                How many questions do you want?
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min={minSelectableQuestions}
                  max={maxSelectableQuestions}
                  value={questionCount}
                  onChange={handleQuestionCountChange}
                  onBlur={handleQuestionCountBlur}
                  className="w-24 px-3 py-2 text-sm font-semibold bg-black/50 border-2 border-yellow-500/40 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-yellow-400 placeholder-yellow-600/50"
                />
                <span className="text-xs text-indigo-300 font-medium">
                  (Min: {minSelectableQuestions}, Max: {maxSelectableQuestions})
                </span>
              </div>
              <p className="text-[10px] text-indigo-400">
                Select between {minSelectableQuestions} and {maxSelectableQuestions} questions
              </p>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 space-y-3 relative">
          {/* Solo Mode */}
          {!showModeSelection ? (
            <button
              onClick={handleSoloClick}
              className="group w-full bg-gradient-to-br from-yellow-400/90 to-amber-500/90 hover:from-yellow-400 hover:to-amber-500 border-2 border-yellow-500/50 hover:border-yellow-400 rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <div className="flex items-start gap-3 sm:gap-4 relative">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow border border-yellow-300/30">
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-gray-900 mb-1 sm:mb-1.5 flex items-center gap-2 flex-wrap text-base sm:text-lg drop-shadow-sm">
                    Solo Quiz
                    <span className="text-[10px] sm:text-xs bg-black/20 backdrop-blur-sm text-white px-2 sm:px-2.5 py-1 rounded-full font-bold border border-yellow-300/30">Focus</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-800 leading-snug sm:leading-relaxed font-medium">
                    Challenge yourself at your own pace - perfect for focused practice
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <>
              {/* Back Button */}
              <button
                onClick={handleBackToMain}
                className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 mb-3 font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modes
              </button>

              {/* Normal Mode */}
              <button
                onClick={() => handleModeSelect('normal')}
                className="group w-full bg-gradient-to-br from-indigo-900/60 to-indigo-950/60 hover:from-indigo-900/80 hover:to-indigo-950/80 border-2 border-indigo-500/30 hover:border-indigo-400/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-indigo-400/30">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-yellow-400 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Normal Mode
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-semibold border border-indigo-400/30">Original</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-indigo-300 leading-snug">
                      Questions in their original order - study as designed
                    </p>
                  </div>
                </div>
              </button>

              {/* Casual Mode */}
              <button
                onClick={() => handleModeSelect('casual')}
                className="group w-full bg-gradient-to-br from-indigo-900/60 to-indigo-950/60 hover:from-indigo-900/80 hover:to-indigo-950/80 border-2 border-yellow-500/30 hover:border-yellow-400/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-yellow-400/30">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-yellow-400 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Casual Mode
                      <span className="text-[10px] bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded-full font-semibold border border-yellow-400/30">Shuffled</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-indigo-300 leading-snug">
                      Questions shuffled randomly - straightforward practice
                    </p>
                  </div>
                </div>
              </button>

              {/* Adaptive Mode */}
              <div className="relative">
                <button
                  onClick={() => canUseAdaptive && handleModeSelect('adaptive')}
                  onMouseEnter={() => !canUseAdaptive && setShowAdaptiveTooltip(true)}
                  onMouseLeave={() => setShowAdaptiveTooltip(false)}
                  disabled={!canUseAdaptive}
                  className={`group w-full rounded-xl p-3.5 sm:p-4 transition-all duration-200 border-2 shadow-lg relative overflow-hidden ${
                    canUseAdaptive
                      ? 'bg-gradient-to-br from-yellow-500/80 to-amber-600/80 hover:from-yellow-500 hover:to-amber-600 border-yellow-400/50 hover:border-yellow-400 hover:shadow-xl active:scale-[0.98] cursor-pointer backdrop-blur-xl'
                      : 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-600/30 cursor-not-allowed opacity-50 backdrop-blur-xl'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  <div className="flex items-start gap-3 relative">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border ${
                      canUseAdaptive
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/30'
                        : 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500/30'
                    }`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`font-bold mb-0.5 flex items-center gap-2 text-sm sm:text-base ${
                        canUseAdaptive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Adaptive Mode
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          canUseAdaptive
                            ? 'bg-indigo-500/30 text-indigo-100 border-indigo-400/30'
                            : 'bg-gray-700/30 text-gray-400 border-gray-600/30'
                        }`}>
                          {canUseAdaptive ? 'Smart' : 'Locked'}
                        </span>
                      </h3>
                      <p className={`text-[11px] sm:text-xs leading-snug ${
                        canUseAdaptive ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {canUseAdaptive 
                          ? 'Difficulty adjusts based on performance - personalized'
                          : 'Requires questions with varied difficulty levels'
                        }
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Tooltip */}
                {!canUseAdaptive && showAdaptiveTooltip && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 pointer-events-none animate-fade-in">
                    <div className="bg-gradient-to-br from-gray-900 to-black text-white text-xs rounded-xl p-3.5 shadow-2xl border-2 border-yellow-500/30">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold mb-1.5 text-yellow-400">Adaptive Mode Unavailable</p>
                          <p className="text-gray-300 leading-relaxed">
                            {getAdaptiveDisabledMessage()}
                          </p>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute -top-2 left-8 w-4 h-4 bg-gray-900 border-l border-t border-yellow-500/30 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Battle Mode */}
          {!showModeSelection && !showBattleModeSelection && (
            <button
              onClick={handleQuizBattleClick}
              className="group w-full bg-gradient-to-br from-indigo-500/90 to-indigo-600/90 hover:from-indigo-500 hover:to-indigo-600 border-2 border-indigo-400/50 hover:border-indigo-400 rounded-xl sm:rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xl hover:shadow-2xl active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
              <div className="flex items-start gap-3 sm:gap-4 relative">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-black/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow border border-indigo-300/30">
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-white mb-1 sm:mb-1.5 flex items-center gap-2 flex-wrap text-base sm:text-lg drop-shadow-sm">
                    Quiz Battle
                    <span className="text-[10px] sm:text-xs bg-yellow-400/90 text-gray-900 px-2 sm:px-2.5 py-1 rounded-full font-black flex items-center gap-1 border border-yellow-300/30">
                      <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      Battle
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-100 leading-snug sm:leading-relaxed font-medium">
                    Compete with up to 5 friends in real-time - race to victory!
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Battle Mode Selection */}
          {showBattleModeSelection && (
            <>
              {/* Back Button */}
              <button
                onClick={handleBackToMain}
                className="text-sm text-yellow-400 hover:text-yellow-300 flex items-center gap-1.5 mb-3 font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modes
              </button>

              {/* Normal Mode for Battle */}
              <button
                onClick={() => handleBattleModeSelect('normal')}
                className="group w-full bg-gradient-to-br from-indigo-900/60 to-indigo-950/60 hover:from-indigo-900/80 hover:to-indigo-950/80 border-2 border-indigo-500/30 hover:border-indigo-400/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-indigo-400/30">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-yellow-400 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Normal Mode
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-semibold border border-indigo-400/30">Original</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-indigo-300 leading-snug">
                      All players get questions in the same original order
                    </p>
                  </div>
                </div>
              </button>

              {/* Casual Mode for Battle */}
              <button
                onClick={() => handleBattleModeSelect('casual')}
                className="group w-full bg-gradient-to-br from-indigo-900/60 to-indigo-950/60 hover:from-indigo-900/80 hover:to-indigo-950/80 border-2 border-yellow-500/30 hover:border-yellow-400/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
                <div className="flex items-start gap-3 relative">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-yellow-400/30">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-yellow-400 mb-0.5 flex items-center gap-2 text-sm sm:text-base">
                      Casual Mode
                      <span className="text-[10px] bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded-full font-semibold border border-yellow-400/30">Shuffled</span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-indigo-300 leading-snug">
                      All players get the same shuffled order
                    </p>
                  </div>
                </div>
              </button>

              {/* Adaptive Mode for Battle */}
              <div className="relative">
                <button
                  onClick={() => canUseAdaptive && handleBattleModeSelect('adaptive')}
                  onMouseEnter={() => !canUseAdaptive && setShowBattleAdaptiveTooltip(true)}
                  onMouseLeave={() => setShowBattleAdaptiveTooltip(false)}
                  disabled={!canUseAdaptive}
                  className={`group w-full rounded-xl p-3.5 sm:p-4 transition-all duration-200 border-2 shadow-lg relative overflow-hidden ${
                    canUseAdaptive
                      ? 'bg-gradient-to-br from-yellow-500/80 to-amber-600/80 hover:from-yellow-500 hover:to-amber-600 border-yellow-400/50 hover:border-yellow-400 hover:shadow-xl active:scale-[0.98] cursor-pointer backdrop-blur-xl'
                      : 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-600/30 cursor-not-allowed opacity-50 backdrop-blur-xl'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                  <div className="flex items-start gap-3 relative">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border ${
                      canUseAdaptive
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/30'
                        : 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500/30'
                    }`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`font-bold mb-0.5 flex items-center gap-2 text-sm sm:text-base ${
                        canUseAdaptive ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Adaptive Mode
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          canUseAdaptive
                            ? 'bg-indigo-500/30 text-indigo-100 border-indigo-400/30'
                            : 'bg-gray-700/30 text-gray-400 border-gray-600/30'
                        }`}>
                          {canUseAdaptive ? 'Smart' : 'Locked'}
                        </span>
                      </h3>
                      <p className={`text-[11px] sm:text-xs leading-snug ${
                        canUseAdaptive ? 'text-gray-800' : 'text-gray-500'
                      }`}>
                        {canUseAdaptive 
                          ? "Each player's difficulty adjusts independently"
                          : 'Requires questions with varied difficulty levels'
                        }
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Tooltip */}
                {!canUseAdaptive && showBattleAdaptiveTooltip && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 pointer-events-none animate-fade-in">
                    <div className="bg-gradient-to-br from-gray-900 to-black text-white text-xs rounded-xl p-3.5 shadow-2xl border-2 border-yellow-500/30">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold mb-1.5 text-yellow-400">Adaptive Mode Unavailable</p>
                          <p className="text-gray-300 leading-relaxed">
                            {getAdaptiveDisabledMessage()}
                          </p>
                        </div>
                      </div>
                      {/* Arrow */}
                      <div className="absolute -top-2 left-8 w-4 h-4 bg-gray-900 border-l border-t border-yellow-500/30 transform rotate-45"></div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quiz Modes Info Modal */}
      {showModesInfoModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3"
          onClick={() => setShowModesInfoModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 px-4 py-3 rounded-t-xl">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Quiz Modes: How It Works
              </h3>
            </div>

            <div className="p-4 space-y-2">
              {/* Normal Mode */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-gray-500 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm mb-1">Normal Mode</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Questions appear in their original order, exactly as designed by the quiz creator. No shuffling or difficulty adjustment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Casual Mode */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-blue-900 text-sm mb-1">Casual Mode</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Questions are shuffled randomly for straightforward practice. Perfect for quick review sessions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Adaptive Mode */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 bg-purple-500 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-purple-900 text-sm mb-1">Adaptive Mode</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Smart system adjusts difficulty based on your performance. Levels up when you excel, scales down when you struggle. Creates a personalized learning experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end rounded-b-xl">
              <button
                onClick={() => setShowModesInfoModal(false)}
                className="px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "quiz" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Delete {itemType}?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 leading-relaxed mb-4">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{itemName}"</span>?
          </p>
          
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                This action cannot be undone
              </p>
              <p className="text-xs text-red-700 mt-1">
                All questions and data associated with this {itemType} will be permanently deleted.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export const ValidationErrorModal = ({ isOpen, onClose, errors }) => {
  if (!isOpen) return null;

  // Group errors by question number
  const groupedErrors = errors.reduce((acc, error) => {
    const qNum = error.questionNumber || 0;
    if (!acc[qNum]) {
      acc[qNum] = [];
    }
    acc[qNum].push(error);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-[rgba(107,114,128,0.6)] flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-fade-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Cannot Save Quiz
              </h3>
              <p className="text-sm text-gray-600">
                {errors.length} {errors.length === 1 ? 'error' : 'errors'} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Error List - REDESIGNED */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <p className="text-gray-600 mb-4 font-medium text-sm sm:text-base">
            Please fix the following issues:
          </p>

          <div className="space-y-3">
            {Object.keys(groupedErrors).sort((a, b) => a - b).map((questionNum) => {
              const questionErrors = groupedErrors[questionNum];
              const isGlobalError = questionNum == 0;

              return (
                <div key={questionNum}>
                  {/* Global Error Header */}
                  {isGlobalError && (
                    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 sm:p-4 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-yellow-900 uppercase tracking-wider">
                          Quiz Requirement
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Question Header - Only if questionNum > 0 */}
                  {questionNum > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-200"></div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Question {questionNum}
                      </span>
                      <div className="h-px flex-1 bg-gray-200"></div>
                    </div>
                  )}
                  
                  {/* Error Cards - Clean Design */}
                  <div className="space-y-2">
                    {questionErrors.map((error, idx) => (
                      <div 
                        key={idx} 
                        className="bg-white border-l-4 border-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {error.message}
                            </p>
                            {error.details && (
                              <p className="text-xs text-gray-600">
                                {error.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Fix Errors
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};
