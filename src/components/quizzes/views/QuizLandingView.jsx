import React from 'react';
import { BookOpen, Swords } from 'lucide-react';
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
  onQuizImported,
  toast
}) => {
  return (
    <div className="bg-gray-50 pb-16">

      {/* DESKTOP VIEW (lg and up) - 2 Column Grid (70/30 Split) */}
      <div className="hidden lg:flex items-start justify-center p-4 lg:p-6 pt-4 lg:pt-6 min-h-screen overflow-x-hidden">
        <div className="w-full max-w-[1400px] mx-auto grid grid-cols-[minmax(0,2.3fr)_minmax(0,1fr)] gap-4 lg:gap-6">
          {/* Left Container - Quiz List (70%) */}
          <div className="min-w-0 overflow-hidden">
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
              toast={toast}
            />
          </div>

          {/* Right Container - Quiz Battles (30%) */}
          <div className="min-w-0 overflow-hidden">
            <QuizBattles
              gamePin={gamePin}
              setGamePin={setGamePin}
              onJoinSuccess={onJoinSuccess}
            />
          </div>
        </div>
      </div>

      {/* TABLET VIEW (md to lg) - Single View with Top Pill Navigation */}
      <div className="hidden md:flex lg:hidden flex-col min-h-screen max-h-screen bg-gray-50 overflow-hidden">
        {/* Sticky Top Navigation Pills - Fixed Height */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex gap-2 overflow-x-hidden">
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
        <div className="flex-1 overflow-hidden p-4 min-h-0">
          <div className="max-w-4xl mx-auto h-full overflow-x-hidden">
            {activeView === 'quizzes' ? (
              <div className="h-full w-full overflow-hidden">
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
                  toast={toast}
                />
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden">
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
      <div className="flex md:hidden flex-col min-h-screen max-h-screen bg-gray-50 overflow-hidden">
        {/* Content Area */}
        <div className="flex-1 overflow-hidden min-h-0 pb-14">
          <div className="h-full p-3 overflow-x-hidden">
            {activeView === 'quizzes' ? (
              <div className="h-full w-full overflow-hidden">
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
                  toast={toast}
                />
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden">
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
        <div className="bottom-tab-bar fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-10 safe-area-inset-bottom h-14">
          <div className="grid grid-cols-2 h-full max-w-full">
            <button
              onClick={() => setActiveView('quizzes')}
              className={`bottom-tab flex flex-col items-center justify-center gap-0.5 ${
                activeView === 'quizzes' ? 'active' : 'text-gray-500'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">My Quizzes</span>
            </button>
            <button
              onClick={() => setActiveView('battles')}
              className={`bottom-tab flex flex-col items-center justify-center gap-0.5 ${
                activeView === 'battles' ? 'active' : 'text-gray-500'
              }`}
            >
              <Swords className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">Battles</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
