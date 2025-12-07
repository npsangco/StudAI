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
  const [showAdaptiveTooltip, setShowAdaptiveTooltip] = React.useState(false);
  
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
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full mx-auto relative shadow-2xl animate-scale-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors group"
        >
          <X className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
        </button>

        {/* Header Section - Enhanced with shapes and animations */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 pt-8 pb-6 px-6 text-center overflow-hidden">
          {/* Decorative animated circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 animate-bounce" style={{ animationDuration: '3s' }}></div>
          <div className="absolute bottom-0 right-1/4 w-16 h-16 bg-indigo-500/20 rounded-full translate-y-1/3"></div>
          
          {/* Floating stars/sparkles */}
          <div className="absolute top-4 left-8 text-white/30 text-2xl animate-pulse">✨</div>
          <div className="absolute top-6 right-12 text-white/40 text-xl animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>⭐</div>
          <div className="absolute bottom-4 left-16 text-indigo-600/30 text-lg animate-pulse" style={{ animationDelay: '1s' }}>💡</div>
          
          {/* Content */}
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/30 backdrop-blur-sm rounded-3xl mb-3 shadow-2xl border-2 border-white/40 transform hover:scale-110 transition-transform duration-300">
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-lg animate-pulse" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 drop-shadow-lg tracking-tight">Ready to Quiz?</h2>
            <p className="text-white/90 text-sm sm:text-base font-semibold drop-shadow">Choose your challenge mode</p>
          </div>
          
          {/* Bottom wave decoration */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-8 fill-gray-50">
              <path d="M0,0 Q300,60 600,30 T1200,0 L1200,120 L0,120 Z"></path>
            </svg>
          </div>
        </div>

        {/* Quiz Info */}
        <div className="px-6 py-5 space-y-4 bg-gradient-to-b from-gray-50 to-white relative">
          {/* Subtle dot pattern */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}></div>
          
          <div className="bg-white rounded-xl shadow-md p-4 border-2 border-yellow-200 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-50/0 via-yellow-50/50 to-yellow-50/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1" title={quiz.title}>{quiz.title}</h3>
                <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  {totalQuestions} questions available
                </p>
              </div>
            </div>
          </div>

          {/* Question Count Selector */}
          {totalQuestions >= minSelectableQuestions && (
            <div className="bg-white rounded-xl shadow-md p-4 border-2 border-indigo-200 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 opacity-50"></div>
              
              <div className="relative z-10">
                <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="inline-block w-1 h-4 bg-indigo-500 rounded-full"></span>
                  How many questions?
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={minSelectableQuestions}
                    max={maxSelectableQuestions}
                    value={questionCount}
                    onChange={handleQuestionCountChange}
                    onBlur={handleQuestionCountBlur}
                    className="w-20 px-3 py-2 text-sm font-bold bg-white border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 shadow-sm hover:border-indigo-400 transition-colors"
                  />
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                    Min: {minSelectableQuestions}, Max: {maxSelectableQuestions}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="px-6 pb-6 space-y-3 bg-white">
          {/* Solo Mode */}
          {!showModeSelection && !showBattleModeSelection ? (
            <button
              onClick={handleSoloClick}
              className="group w-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-amber-600 rounded-xl p-4 transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-[0.98] relative overflow-hidden border-2 border-yellow-300"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Decorative corner elements */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/40 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/50">
                  <User className="w-6 h-6 text-gray-900" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-white mb-1 flex items-center gap-2 text-base drop-shadow-md">
                    Solo Quiz
                    <span className="text-[10px] bg-white/30 text-gray-900 px-2 py-0.5 rounded-full font-bold border border-white/40">Focus</span>
                  </h3>
                  <p className="text-sm text-white/90 leading-relaxed drop-shadow">
                    Challenge yourself at your own pace
                  </p>
                </div>
              </div>
            </button>
          ) : null}

          {/* Solo Mode Selection */}
          {showModeSelection && !showBattleModeSelection && (
            <>
              {/* Back Button */}
              <button
                onClick={handleBackToMain}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 mb-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modes
              </button>

              {/* Normal Mode */}
              <button
                onClick={() => handleModeSelect('normal')}
                className="group w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                      Normal Mode
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Original</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Questions appear in original order
                    </p>
                  </div>
                </div>
              </button>

              {/* Casual Mode */}
              <button
                onClick={() => handleModeSelect('casual')}
                className="group w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                      Casual Mode
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Shuffled</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Questions appear in random order
                    </p>
                  </div>
                </div>
              </button>

              {/* Adaptive Mode */}
              <div 
                className="relative"
                onMouseEnter={() => !canUseAdaptive && setShowAdaptiveTooltip(true)}
                onMouseLeave={() => !canUseAdaptive && setShowAdaptiveTooltip(false)}
              >
                <button
                  onClick={() => canUseAdaptive && handleModeSelect('adaptive')}
                  disabled={!canUseAdaptive}
                  className={`group w-full rounded-xl p-4 transition-all duration-200 border-2 shadow-sm ${
                    canUseAdaptive
                      ? 'bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 hover:border-indigo-300 hover:shadow-md active:scale-[0.98] cursor-pointer'
                      : 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      canUseAdaptive
                        ? 'bg-indigo-500'
                        : 'bg-gray-400'
                    }`}>
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`font-semibold mb-1 flex items-center gap-2 text-sm ${
                        canUseAdaptive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        Adaptive Mode
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          canUseAdaptive
                            ? 'bg-indigo-200 text-indigo-700'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {canUseAdaptive ? 'Smart' : 'Locked'}
                        </span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${
                        canUseAdaptive ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {canUseAdaptive 
                          ? 'Gets harder or easier based on your performance'
                          : 'Requires questions with different difficulty levels'
                        }
                      </p>
                    </div>
                  </div>
                </button>
                
                {/* Tooltip - Positioned ABOVE button */}
                {!canUseAdaptive && showAdaptiveTooltip && (
                  <div className="absolute left-0 right-0 bottom-full mb-2 z-50 pointer-events-none animate-fade-in">
                    <div className="bg-white text-gray-900 text-xs rounded-lg p-3 shadow-2xl border-2 border-yellow-400">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold mb-1 text-gray-900">Adaptive Mode Unavailable</p>
                          <p className="text-gray-600 leading-relaxed">
                            {getAdaptiveDisabledMessage()}
                          </p>
                        </div>
                      </div>
                      {/* Arrow pointing DOWN */}
                      <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-white border-r-2 border-b-2 border-yellow-400 transform rotate-45"></div>
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
              className="group w-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:via-indigo-700 hover:to-purple-700 rounded-xl p-4 transition-all duration-300 shadow-lg hover:shadow-2xl active:scale-[0.98] relative overflow-hidden border-2 border-indigo-400"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              
              {/* Decorative corner elements */}
              <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full -translate-y-1/2 -translate-x-1/2"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-yellow-400/20 rounded-full translate-y-1/2 translate-x-1/2"></div>
              
              {/* Trophy icon floating in background */}
              <div className="absolute top-2 right-4 text-white/10 text-5xl transform group-hover:rotate-12 transition-transform duration-300">🏆</div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/40">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-white mb-1 flex items-center gap-2 text-base drop-shadow-md">
                    Quiz Battle
                    <span className="text-[10px] bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold shadow-md border border-yellow-300">
                      Battle
                    </span>
                  </h3>
                  <p className="text-sm text-indigo-100 leading-relaxed drop-shadow">
                    Challenge friends, race to the top!
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
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 mb-2 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to modes
              </button>

              {/* Normal Mode for Battle */}
              <button
                onClick={() => handleBattleModeSelect('normal')}
                className="group w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                      Normal Mode
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">Original Order</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Everyone sees questions in original order
                    </p>
                  </div>
                </div>
              </button>

              {/* Casual Mode for Battle */}
              <button
                onClick={() => handleBattleModeSelect('casual')}
                className="group w-full bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2 text-sm">
                      Casual Mode
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Shuffled</span>
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Everyone sees the same shuffled questions
                    </p>
                  </div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

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
