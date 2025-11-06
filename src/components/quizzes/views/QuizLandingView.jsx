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
  onJoinSuccess
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* DESKTOP VIEW (lg and up) - 2 Column Grid */}
      <div className="hidden lg:flex items-start justify-center p-6 pt-6">
        <div className="w-full max-w-7xl h-[calc(100vh-7rem)] grid grid-cols-2 gap-6">
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
        {/* Sticky Top Navigation Pills */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button
              onClick={() => setActiveView('quizzes')}
              className={`nav-pill flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all ${
                activeView === 'quizzes'
                  ? 'active text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              📚 My Quizzes
            </button>
            <button
              onClick={() => setActiveView('battles')}
              className={`nav-pill flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all ${
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
        <div className="flex-1 overflow-hidden p-6">
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
        <div className="flex-1 overflow-hidden pb-20">
          <div className="h-full p-4">
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
        <div className="bottom-tab-bar fixed bottom-0 left-0 right-0 border-t border-gray-200 z-10">
          <div className="grid grid-cols-2 h-16">
            <button
              onClick={() => setActiveView('quizzes')}
              className={`bottom-tab flex flex-col items-center justify-center gap-1 ${
                activeView === 'quizzes' ? 'active' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">📚</span>
              <span className="text-xs font-medium">My Quizzes</span>
            </button>
            <button
              onClick={() => setActiveView('battles')}
              className={`bottom-tab flex flex-col items-center justify-center gap-1 ${
                activeView === 'battles' ? 'active' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">⚔️</span>
              <span className="text-xs font-medium">Battles</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};