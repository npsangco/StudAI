import React, { useEffect } from 'react';
import { QuizLandingView } from '../components/quizzes/views/QuizLandingView';
import { QuizEditor } from '../components/quizzes/views/QuizEditor';
import QuizGame from '../components/quizzes/views/QuizGame';
import QuizResults from '../components/quizzes/views/QuizResults';
import QuizLeaderboard from '../components/quizzes/views/QuizLeaderboard';
import { SoloLoadingScreen, BattleLobbyScreen } from '../components/quizzes/views/QuizLoadingScreens';
import { QuizModal, DeleteConfirmationModal, ValidationErrorModal } from '../components/quizzes/QuizModal';
import { useCountdown } from '../components/quizzes/hooks/useCountdown';
import { useLobby } from '../components/quizzes/hooks/useLobby';
import { useQuizData } from '../components/quizzes/hooks/useQuizData';
import { useQuizAPI } from '../components/quizzes/hooks/useQuizAPI';
import { useQuizHandlers } from '../components/quizzes/hooks/useQuizHandlers';
import { VIEWS, COUNTDOWN_SECONDS } from '../components/quizzes/utils/constants';
import { validateAllQuestions } from '../components/quizzes/utils/validation';

const styles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
    opacity: 0;
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  /* Clean minimalistic containers */
  .quiz-container {
    background: #ffffff;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    border: 1px solid #f3f4f6;
    transition: all 0.2s ease;
  }

  .quiz-container:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  /* Prevent page scroll */
  body.quiz-page-active {
    overflow: hidden;
  }

  /* Tablet/Mobile Navigation Pills */
  .nav-pill {
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .nav-pill:hover:not(.active) {
    border-color: #fbbf24;
    background: #fef3c7;
  }

  .nav-pill.active {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    box-shadow: 0 4px 12px rgba(251, 191, 36, 0.25);
    border-color: #f59e0b;
  }

  /* Smooth content transitions */
  .content-view {
    animation: fadeIn 0.3s ease-out;
  }

  /* Bottom Tab Bar (Mobile) */
  .bottom-tab-bar {
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.95);
  }

  .bottom-tab {
    transition: all 0.2s ease;
  }

  .bottom-tab.active {
    color: #f59e0b;
    font-weight: 600;
  }

  .bottom-tab:not(.active):hover {
    color: #fbbf24;
  }
`;

function QuizzesPage() {
  // ============================================
  // INITIALIZE HOOKS
  // ============================================

  const quizDataHook = useQuizData();
  const quizAPI = useQuizAPI(quizDataHook);
  const countdown = useCountdown(COUNTDOWN_SECONDS, () => {
    const targetView = quizDataHook.uiState.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    quizDataHook.updateUiState({ currentView: targetView });
  });
  const handlers = useQuizHandlers(quizDataHook, quizAPI, countdown);
  const lobby = useLobby(quizDataHook.uiState.currentView === VIEWS.LOBBY);

  // ============================================
  // EFFECTS
  // ============================================

  // Load quizzes on mount
  useEffect(() => {
    quizAPI.loadQuizzesFromAPI();
  }, []);

  // Real-time validation whenever questions change
  useEffect(() => {
    if (quizDataHook.uiState.currentView === VIEWS.EDITING && quizDataHook.questions.length > 0) {
      const validation = validateAllQuestions(quizDataHook.questions);
      quizDataHook.setValidationStatus({
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        errors: validation.errors
      });
      quizDataHook.setValidationErrors(validation.errors);
    } else {
      quizDataHook.setValidationStatus(null);
      quizDataHook.setValidationErrors([]);
    }
  }, [quizDataHook.questions, quizDataHook.uiState.currentView]);

  // Control page overflow for list view
  useEffect(() => {
    if (quizDataHook.uiState.currentView === VIEWS.LIST) {
      document.body.classList.add('quiz-page-active');
    } else {
      document.body.classList.remove('quiz-page-active');
    }

    return () => document.body.classList.remove('quiz-page-active');
  }, [quizDataHook.uiState.currentView]);

  // Hide navbar for game views
  useEffect(() => {
    const gameViews = [VIEWS.LOADING, VIEWS.LOADING_BATTLE, VIEWS.LOBBY, VIEWS.SOLO, VIEWS.BATTLE];
    const shouldHide = gameViews.includes(quizDataHook.uiState.currentView);

    if (shouldHide) {
      document.body.classList.add('hide-navbar');
    } else {
      document.body.classList.remove('hide-navbar');
    }

    return () => document.body.classList.remove('hide-navbar');
  }, [quizDataHook.uiState.currentView]);

  // Auto-start battle when all ready
  useEffect(() => {
    if (lobby.allReady && quizDataHook.uiState.currentView === VIEWS.LOBBY) {
      setTimeout(() => {
        quizDataHook.updateUiState({ currentView: VIEWS.LOADING_BATTLE });
        countdown.start();
      }, 1000);
    }
  }, [lobby.allReady, quizDataHook.uiState.currentView]);

  // ============================================
  // RENDER: Loading State
  // ============================================

  if (quizDataHook.loading && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Error State
  // ============================================

  if (quizDataHook.error && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-xl shadow-sm">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{quizDataHook.error}</p>
          <button
            onClick={quizAPI.loadQuizzesFromAPI}
            className="px-6 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Loading Screens
  // ============================================

  if (quizDataHook.uiState.currentView === VIEWS.LOADING || quizDataHook.uiState.currentView === VIEWS.LOADING_BATTLE) {
    return <SoloLoadingScreen countdown={countdown.countdown} quizTitle={quizDataHook.quizData.selected?.title} />;
  }

  if (quizDataHook.uiState.currentView === VIEWS.LOBBY) {
    return (
      <BattleLobbyScreen
        lobbyPlayers={lobby.players}
        playerPositions={lobby.playerPositions}
        quizTitle={quizDataHook.quizData.selected?.title}
        gamePin={quizDataHook.gameState.gamePin} 
        isHost={quizDataHook.gameState.isHost}             
        onUserReady={lobby.markUserReady}
        onLeave={handlers.handleBackToList}
        onStartBattle={handlers.handleStartBattle}     
        setPlayerPositions={lobby.setPlayerPositions}
      />
    );
  }

  // ============================================
  // RENDER: Solo Game
  // ============================================

  if (quizDataHook.uiState.currentView === VIEWS.SOLO && quizDataHook.quizData.selected) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame
          key={`solo-${quizDataHook.gameState.quizKey}`}
          quiz={{ ...quizDataHook.quizData.selected, questions: quizDataHook.questions }}
          mode="solo"
          onBack={handlers.handleBackToList}
          onComplete={handlers.handleShowSoloResults}
        />
        <QuizResults
          isOpen={quizDataHook.uiState.showResults}
          onClose={handlers.handleCloseSoloResults}
          onRetry={handlers.handleRetrySoloQuiz}
          results={quizDataHook.gameState.results}
          mode="solo"
        />
      </>
    );
  }

  // ============================================
  // RENDER: Battle Game
  // ============================================

  if (quizDataHook.uiState.currentView === VIEWS.BATTLE && quizDataHook.quizData.selected) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame
          key={`battle-${quizDataHook.gameState.quizKey}`}
          quiz={{ ...quizDataHook.quizData.selected, questions: quizDataHook.questions }}
          mode="battle"
          onBack={handlers.handleBackToList}
          onComplete={handlers.handleShowLeaderboard}
        />
        <QuizLeaderboard
          isOpen={quizDataHook.uiState.showLeaderboard}
          onClose={handlers.handleCloseLeaderboard}
          results={quizDataHook.gameState.results}
        />
      </>
    );
  }

  // ============================================
  // RENDER: Editor
  // ============================================

  if (quizDataHook.uiState.currentView === VIEWS.EDITING && quizDataHook.quizData.editing) {
    return (
      <>
        <style>{styles}</style>
        <QuizEditor
          quiz={quizDataHook.quizData.editing}
          questions={quizDataHook.questions}
          validationStatus={quizDataHook.validationStatus}
          onBack={handlers.handleBackFromEditor}
          onSave={handlers.handleSaveQuiz}
          onUpdateTitle={handlers.handleUpdateQuizTitle}
          onAddQuestion={handlers.handleAddQuestion}
          onDeleteQuestion={handlers.handleDeleteQuestion}
          onUpdateQuestion={handlers.handleUpdateQuestion}
          onUpdateChoice={handlers.handleUpdateChoice}
          onAddChoice={handlers.handleAddChoice}
          onAddMatchingPair={handlers.handleAddMatchingPair}
          onUpdateMatchingPair={handlers.handleUpdateMatchingPair}
          onRemoveMatchingPair={handlers.handleRemoveMatchingPair}
          onShowValidationErrors={() => quizDataHook.setShowValidationModal(true)}
        />
      </>
    );
  }

  // ============================================
  // RENDER: Landing View (Default)
  // ============================================

  return (
    <>
      <style>{styles}</style>
      
      <QuizLandingView
        quizData={quizDataHook.quizData}
        activeView={quizDataHook.activeView}
        setActiveView={quizDataHook.setActiveView}
        handlers={handlers}
        gamePin={quizDataHook.gameState.gamePin}
        setGamePin={(pin) => quizDataHook.updateGameState({ gamePin: pin })}
        onJoinSuccess={handlers.handleJoinSuccess}
      />

      {/* Modals */}
      <QuizModal
        quiz={quizDataHook.quizData.selected}
        isOpen={quizDataHook.uiState.showModal}
        onClose={handlers.handleCloseModal}
        onSoloQuiz={handlers.handleSoloQuiz}
        onQuizBattle={handlers.handleQuizBattle}
      />

      <DeleteConfirmationModal
        isOpen={quizDataHook.uiState.showDeleteModal}
        onClose={() => {
          quizDataHook.updateUiState({ showDeleteModal: false });
          quizDataHook.updateDeleteState({ quizToDelete: null });
        }}
        onConfirm={handlers.handleConfirmDelete}
        itemName={quizDataHook.deleteState.quizToDelete?.title || ''}
        itemType="quiz"
      />

      <ValidationErrorModal
        isOpen={quizDataHook.showValidationModal}
        onClose={() => quizDataHook.setShowValidationModal(false)}
        errors={quizDataHook.validationErrors}
      />

      {/* Error Modal */}
      {quizDataHook.error && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 animate-fade-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Oops!
              </h3>
              <p className="text-gray-600 mb-6">
                {quizDataHook.error}
              </p>
              <button
                onClick={() => quizDataHook.setError(null)}
                className="w-full bg-yellow-500 text-white py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default QuizzesPage;