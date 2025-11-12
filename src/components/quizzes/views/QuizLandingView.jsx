import React from 'react';
import { QuizList } from './QuizList';
import { QuizBattles } from './QuizBattles';

/**
 * Responsive landing page layout component
 * - Desktop: 2-column side-by-side
 * - Tablet: Single view with top pill navigation
 * - Mobile: Single view with bottom tab bar
 */
export const QuizLandingView = ({
  quizData,
  activeView,
  setActiveView,
  handlers,
  gamePin,
  setGamePin,
  onJoinSuccess,
  onQuizImported
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* DESKTOP VIEW (lg and up) - 2 Column Grid */}
      <div className="hidden lg:flex items-start justify-center p-4 lg:p-6 pt-4 lg:pt-6">
        <div className="w-full max-w-7xl h-[calc(100vh-7rem)] grid grid-cols-2 gap-4 lg:gap-6">
          {/* Left Container - Quiz List */}
          <div className="h-full overflow-hidden quiz-container">
            <QuizList
              quizzes={quizData.list}
              draggedIndex={quizData.draggedIndex}
              onDragStart={handlers.handleDragStart}
              onDragOver={handlers.handleDragOver}
              onDrop={handlers.handleDrop}
              onEditQuiz={handlers.handleEditQuiz}
              onQuizSelect={handlers.handleQuizSelect}
              onDeleteQuiz={handlers.handleDeleteQuiz}
              onCreateQuiz={handlers.handleCreateQuiz}
              onImportQuiz={onQuizImported}
            />
          </div>

          {/* Right Container - Quiz Battles */}
          <div className="h-full overflow-hidden quiz-container">
            <QuizBattles
              gamePin={gamePin}
              setGamePin={setGamePin}
              onJoinSuccess={onJoinSuccess}
            />
          </div>
        </div>
      </div>

      {/* TABLET VIEW (md to lg) - Single View with Top Pill Navigation */}
      <div className="hidden md:flex lg:hidden flex-col h-screen bg-gray-50">
        {/* Sticky Top Navigation Pills - Fixed Height */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex gap-2">
            <button
              onClick={() => setActiveView('quizzes')}
              className={`nav-pill flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'quizzes'
                  ? 'active text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              📚 My Quizzes
            </button>
            <button
              onClick={() => setActiveView('battles')}
              className={`nav-pill flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                activeView === 'battles'
                  ? 'active text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              ⚔️ Quiz Battles
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-4" style={{ height: 'calc(100vh - 65px)' }}>
          <div className="max-w-4xl mx-auto h-full">
            {activeView === 'quizzes' ? (
              <div className="h-full quiz-container content-view">
                <QuizList
                  quizzes={quizData.list}
                  draggedIndex={quizData.draggedIndex}
                  onDragStart={handlers.handleDragStart}
                  onDragOver={handlers.handleDragOver}
                  onDrop={handlers.handleDrop}
                  onEditQuiz={handlers.handleEditQuiz}
                  onQuizSelect={handlers.handleQuizSelect}
                  onDeleteQuiz={handlers.handleDeleteQuiz}
                  onCreateQuiz={handlers.handleCreateQuiz}
                  onImportQuiz={onQuizImported}
                />
              </div>
            ) : (
              <div className="h-full quiz-container content-view">
                <QuizBattles
                  gamePin={gamePin}
                  setGamePin={setGamePin}
                  onJoinSuccess={onJoinSuccess}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE VIEW (below md) - Single View with Bottom Tab Bar */}
      <div className="flex md:hidden flex-col h-screen bg-gray-50">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
          <div className="h-full p-3">
            {activeView === 'quizzes' ? (
              <div className="h-full quiz-container content-view">
                <QuizList
                  quizzes={quizData.list}
                  draggedIndex={quizData.draggedIndex}
                  onDragStart={handlers.handleDragStart}
                  onDragOver={handlers.handleDragOver}
                  onDrop={handlers.handleDrop}
                  onEditQuiz={handlers.handleEditQuiz}
                  onQuizSelect={handlers.handleQuizSelect}
                  onDeleteQuiz={handlers.handleDeleteQuiz}
                  onCreateQuiz={handlers.handleCreateQuiz}
                  onImportQuiz={onQuizImported}
                />
              </div>
            ) : (
              <div className="h-full quiz-container content-view">
                <QuizBattles
                  gamePin={gamePin}
                  setGamePin={setGamePin}
                  onJoinSuccess={onJoinSuccess}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tab Bar (iOS Style) */}
        <div className="bottom-tab-bar fixed bottom-0 left-0 right-0 border-t border-gray-200 z-10 safe-area-inset-bottom" style={{ height: '56px' }}>
          <div className="grid grid-cols-2 h-full">
            <button
              onClick={() => setActiveView('quizzes')}
              className={`bottom-tab flex flex-col items-center justify-center gap-0.5 ${
                activeView === 'quizzes' ? 'active' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">📚</span>
              <span className="text-[10px] font-medium leading-none">My Quizzes</span>
            </button>
            <button
              onClick={() => setActiveView('battles')}
              className={`bottom-tab flex flex-col items-center justify-center gap-0.5 ${
                activeView === 'battles' ? 'active' : 'text-gray-500'
              }`}
            >
              <span className="text-lg">⚔️</span>
              <span className="text-[10px] font-medium leading-none">Battles</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
