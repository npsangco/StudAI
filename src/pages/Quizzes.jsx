import React, { useEffect, useState } from 'react';
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
import { canUseAdaptiveMode } from '../components/quizzes/utils/adaptiveDifficultyEngine';
import ToastContainer from "../components/ToastContainer";
import AppLoader from '../components/AppLoader';
import { useToast } from "../hooks/useToast";
import { API_URL } from '../config/api.config';
import { listenToQuizQuestions, storeQuizQuestions, listenToBattleStatus } from '../firebase/battleOperations';
import { ReconnectionBanner } from '../components/quizzes/views/ReconnectionModal';
import { checkForReconnectionOpportunity } from '../firebase/reconnectionTokens';
import { rejoinBattle } from '../firebase/connectionManager';
import TutorialOverlay from '../components/TutorialOverlay';
import { useTutorial } from '../hooks/useTutorial';
import { quizTutorialSteps } from '../config/tutorialSteps';
import TutorialButton from '../components/TutorialButton';

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

  /* Clean minimalistic containers - Responsive */
  .quiz-container {
    background: #ffffff;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    border-radius: 0.75rem;
    border: 1px solid #f3f4f6;
    transition: all 0.2s ease;
  }

  @media (min-width: 1024px) {
    .quiz-container:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  }

  /* Tablet/Mobile Navigation Pills */
  .nav-pill {
    transition: all 0.2s ease;
    border: 2px solid transparent;
  }

  .nav-pill:hover:not(.active) {
    border-color: #e5e7eb;
    background: #f9fafb;
  }

  .nav-pill.active {
    background: #4f46e5;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
    border-color: #4f46e5;
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
    color: #4f46e5;
    font-weight: 600;
  }

  .bottom-tab:not(.active):hover {
    color: #6366f1;
  }

  /* Safe area for iOS devices */
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Custom scrollbar for webkit browsers */
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: #fef3c7;
    border-radius: 10px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #fbbf24;
    border-radius: 10px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #f59e0b;
  }
`;

function QuizzesPage() {
  // INITIALIZE HOOKS
  const { toasts, toast, removeToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const quizDataHook = useQuizData();
  const quizAPI = useQuizAPI(quizDataHook, toast);
  const countdown = useCountdown(COUNTDOWN_SECONDS, () => {
    const targetView = quizDataHook.uiState.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    quizDataHook.updateUiState({ currentView: targetView });
  });

  const { showTutorial, completeTutorial, skipTutorial, startTutorial } = useTutorial('quizzes');

  // RECONNECTION STATE
  const [reconnectionOpportunity, setReconnectionOpportunity] = useState(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/profile`, {
          credentials: 'include'
        });
        const userData = await response.json();

        setCurrentUser({
          id: userData.user_id,
          username: userData.username,
          email: userData.email,
          initial: userData.username[0].toUpperCase(),
          profile_picture: userData.profile_picture || null
        });
      } catch (error) {
        // Silent fail - user will see generic error UI if needed
      }
    };

    fetchCurrentUser();

    const handleProfileUpdate = () => {
      fetchCurrentUser();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Pass currentUser and toast to handlers
  const handlers = useQuizHandlers(quizDataHook, quizAPI, countdown, currentUser, toast);

  // Reload quiz questions after adding from question bank
  const handleReloadQuiz = async (quizId) => {
    try {
      const result = await quizAPI.loadQuizWithQuestions(quizId);
      if (result) {
        quizDataHook.setQuestions(result.questions);
        // Update the editing quiz metadata if needed
        quizDataHook.updateQuizData({
          editing: {
            ...quizDataHook.quizData.editing,
            ...result.quiz
          }
        });
      }
    } catch (error) {
      console.error('Error reloading quiz:', error);
      toast.error('Failed to reload quiz questions');
    }
  };

  const lobby = useLobby(
    quizDataHook.uiState.currentView === VIEWS.LOBBY,
    quizDataHook.gameState.gamePin,
    currentUser?.id,
    quizDataHook.gameState.isHost
  );
  
  // CHECK FOR RECONNECTION ON PAGE LOAD
  useEffect(() => {
    const opportunity = checkForReconnectionOpportunity();
    
    if (opportunity) {
      setReconnectionOpportunity(opportunity);
    }
  }, []);
  
  // HANDLE RECONNECTION FROM BANNER
  const handleBannerReconnect = async () => {
    if (!reconnectionOpportunity) return;

    try {
      const result = await rejoinBattle(
        reconnectionOpportunity.gamePin,
        reconnectionOpportunity.userId
      );
      
      if (result.success) {
        const { quizId, battleId, quizTitle, gamePin } = result.playerData;
        
        if (!quizId) {
          toast.error('Failed to load quiz data - quiz ID missing');
          setReconnectionOpportunity(null);
          return;
        }
        
        const data = await quizAPI.loadQuizWithQuestions(quizId);
        
        if (data) {
          quizDataHook.setQuestions(data.questions);
          quizDataHook.updateQuizData({ 
            selected: {
              id: quizId,
              title: quizTitle || data.quiz.title || 'Quiz Battle',
              questionCount: data.questions.length
            }
          });
          
          quizDataHook.updateGameState({
            gamePin: gamePin,
            battleId: battleId,
            isHost: false,
            currentUserId: reconnectionOpportunity.userId
          });
          
          quizDataHook.updateUiState({ currentView: VIEWS.BATTLE });
          setReconnectionOpportunity(null);

        } else {
          toast.error('Failed to load quiz questions');
          setReconnectionOpportunity(null);
        }
      } else {
        toast.error('Failed to rejoin: ' + (result.error || 'Unknown error'));
        setReconnectionOpportunity(null);
      }
    } catch (error) {
      toast.error('Failed to rejoin battle: ' + error.message);
      setReconnectionOpportunity(null);
    }
  };
  
  const handleDismissBanner = () => {
    if (reconnectionOpportunity) {
      const { gamePin, userId } = reconnectionOpportunity;
      const key = `reconnect_${gamePin}_${userId}`;
      localStorage.removeItem(key);
    }
    
    setReconnectionOpportunity(null);
  };

  // EFFECTS

  // Load quizzes on mount
  useEffect(() => {
    quizAPI.loadQuizzesFromAPI();
  }, []);

  // Real-time validation
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

  // Control page overflow
  useEffect(() => {
    if (quizDataHook.uiState.currentView === VIEWS.LIST) {
      document.body.classList.add('quiz-page-active');
    } else {
      document.body.classList.remove('quiz-page-active');
    }

    return () => document.body.classList.remove('quiz-page-active');
  }, [quizDataHook.uiState.currentView]);

  // Fix sticky header for editor
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    if (quizDataHook.uiState.currentView === VIEWS.EDITING) {
      const originalHtmlOverflow = html.style.overflowX;
      const originalBodyOverflow = body.style.overflowX;
      const originalRootOverflow = root.style.overflowX;

      html.style.overflowX = 'visible';
      body.style.overflowX = 'visible';
      root.style.overflowX = 'visible';

      return () => {
        html.style.overflowX = originalHtmlOverflow || 'hidden';
        body.style.overflowX = originalBodyOverflow || 'hidden';
        root.style.overflowX = originalRootOverflow || 'hidden';
      };
    }
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

  // SYNC QUESTIONS: Listen for questions from Firebase (NON-HOST players)
  useEffect(() => {
    const battleViews = [VIEWS.LOBBY, VIEWS.LOADING_BATTLE, VIEWS.BATTLE];

    if (
      battleViews.includes(quizDataHook.uiState.currentView) &&
      !quizDataHook.gameState.isHost &&
      quizDataHook.gameState.gamePin
    ) {
      const unsubscribe = listenToQuizQuestions(
        quizDataHook.gameState.gamePin,
        (firebaseQuestions) => {
          quizDataHook.setQuestions(firebaseQuestions);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [
    quizDataHook.uiState.currentView,
    quizDataHook.gameState.isHost,
    quizDataHook.gameState.gamePin
  ]);

  // LISTEN TO BATTLE STATUS: When host starts, all players transition
  useEffect(() => {
    if (
      quizDataHook.uiState.currentView === VIEWS.LOBBY && 
      quizDataHook.gameState.gamePin
    ) {
      const unsubscribe = listenToBattleStatus(
        quizDataHook.gameState.gamePin,
        (newStatus) => {
          if (newStatus === 'in_progress') {
            quizDataHook.updateUiState({ currentView: VIEWS.LOADING_BATTLE });
            countdown.start();
          }
        }
      );
      
      return () => {
        unsubscribe();
      };
    }
  }, [
    quizDataHook.uiState.currentView, 
    quizDataHook.gameState.gamePin
  ]);

  // RENDER: Loading Screens
  if (quizDataHook.uiState.currentView === VIEWS.LOADING || quizDataHook.uiState.currentView === VIEWS.LOADING_BATTLE) {
    const rawQuestions = quizDataHook.questions || [];
    const isSoloMode = quizDataHook.uiState.currentView === VIEWS.LOADING;
    const adaptiveCheck = isSoloMode ? canUseAdaptiveMode(rawQuestions) : { enabled: false };

    return (
      <SoloLoadingScreen
        countdown={countdown.countdown}
        quizTitle={quizDataHook.quizData.selected?.title}
        isAdaptiveMode={adaptiveCheck.enabled}
      />
    );
  }

  if (quizDataHook.uiState.currentView === VIEWS.LOBBY) {
    return (
      <BattleLobbyScreen
        lobbyPlayers={lobby.players}
        playerPositions={lobby.playerPositions}
        quizTitle={quizDataHook.quizData.selected?.title}
        gamePin={quizDataHook.gameState.gamePin}
        isHost={quizDataHook.gameState.isHost}
        currentUserId={currentUser?.id}
        onUserReady={lobby.markUserReady}
        onUserUnready={lobby.markUserUnready}
        onLeave={handlers.handleBackToList}
        onStartBattle={handlers.handleStartBattle}
        setPlayerPositions={lobby.setPlayerPositions}
      />
    );
  }

  // RENDER: Solo Game
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

  // RENDER: Battle Game
  if (quizDataHook.uiState.currentView === VIEWS.BATTLE && quizDataHook.quizData.selected) {
    return (
      <>
        <style>{styles}</style>
        {/* RECONNECTION BANNER - Only show when not in active game */}
        <ReconnectionBanner
          opportunity={reconnectionOpportunity}
          onReconnect={handleBannerReconnect}
          onDismiss={handleDismissBanner}
        />
        <QuizGame
          key={`battle-${quizDataHook.gameState.quizKey}`}
          quiz={{ 
            ...quizDataHook.quizData.selected, 
            questions: quizDataHook.questions,
            gamePin: quizDataHook.gameState.gamePin,
            currentUserId: currentUser?.id,
            isHost: quizDataHook.gameState.isHost,
          }}
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

  // RENDER: Initial Loading State
  if (quizDataHook.loading && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return <AppLoader message="Loading Quizzes..." />;
  }

  // RENDER: Error State
  if (quizDataHook.error && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-sm">
          <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{quizDataHook.error}</p>
          <button
            onClick={quizAPI.loadQuizzesFromAPI}
            className="px-5 sm:px-6 py-2 sm:py-2.5 bg-black text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-md hover:shadow-lg text-sm sm:text-base cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // RENDER: Editor
  if (quizDataHook.uiState.currentView === VIEWS.EDITING && quizDataHook.quizData.editing) {
    return (
      <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <style>{styles}</style>
        <QuizEditor
          quiz={quizDataHook.quizData.editing}
          questions={quizDataHook.questions}
          validationStatus={quizDataHook.validationStatus}
          isDirty={quizDataHook.isDirty}
          isSaving={quizDataHook.isSaving}
          onBack={handlers.handleBackFromEditor}
          onSave={handlers.handleSaveQuiz}
          onUpdateTitle={handlers.handleUpdateQuizTitle}
          onUpdatePublicStatus={handlers.handleUpdatePublicStatus}
          onUpdateTimer={handlers.handleUpdateQuizTimer}
          onAddQuestion={handlers.handleAddQuestion}
          onDeleteQuestion={handlers.handleDeleteQuestion}
          onDuplicateQuestion={handlers.handleDuplicateQuestion}
          onReorderQuestions={handlers.handleReorderQuestions}
          onUpdateQuestion={handlers.handleUpdateQuestion}
          onUpdateChoice={handlers.handleUpdateChoice}
          onAddChoice={handlers.handleAddChoice}
          onAddMatchingPair={handlers.handleAddMatchingPair}
          onUpdateMatchingPair={handlers.handleUpdateMatchingPair}
          onRemoveMatchingPair={handlers.handleRemoveMatchingPair}
          onReloadQuiz={handleReloadQuiz}
          onShowValidationErrors={() => quizDataHook.setShowValidationModal(true)}
          toast={toast}
        />
      </>
    );
  }

  // RENDER: Landing View
  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <style>{styles}</style>

      {showTutorial && (
        <TutorialOverlay
          steps={quizTutorialSteps}
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      {/* RECONNECTION BANNER - Show on landing page too */}
      <ReconnectionBanner
        opportunity={reconnectionOpportunity}
        onReconnect={handleBannerReconnect}
        onDismiss={handleDismissBanner}
      />
      
      <QuizLandingView
        quizData={quizDataHook.quizData}
        activeView={quizDataHook.activeView}
        setActiveView={quizDataHook.setActiveView}
        handlers={handlers}
        gamePin={quizDataHook.gameState.gamePin}
        setGamePin={(pin) => quizDataHook.updateGameState({ gamePin: pin })}
        onJoinSuccess={handlers.handleJoinSuccess}
        onQuizImported={() => quizAPI.loadQuizzesFromAPI()}
        toast={toast}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-5 sm:p-6 animate-fade-in">
            <div className="text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl sm:text-4xl">⚠️</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                Oops!
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                {quizDataHook.error}
              </p>
              <button
                onClick={() => quizDataHook.setError(null)}
                className="w-full bg-black text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-md hover:shadow-lg text-sm sm:text-base cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Button */}
      <TutorialButton onClick={startTutorial} />
    </>
  );
}

export default QuizzesPage;
