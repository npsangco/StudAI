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
import { listenToQuizQuestions, storeQuizQuestions, listenToBattleStatus } from '../firebase/battleOperations';
import { ReconnectionBanner } from '../components/quizzes/views/ReconnectionModal';
import { checkForReconnectionOpportunity } from '../firebase/reconnectionTokens';
import { rejoinBattle } from '../firebase/connectionManager';

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
  // ============================================
  // INITIALIZE HOOKS
  // ============================================
  const [currentUser, setCurrentUser] = useState(null);
  const quizDataHook = useQuizData();
  const quizAPI = useQuizAPI(quizDataHook);
  const countdown = useCountdown(COUNTDOWN_SECONDS, () => {
    const targetView = quizDataHook.uiState.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    quizDataHook.updateUiState({ currentView: targetView });
  });

  // 🔄 RECONNECTION STATE
  const [reconnectionOpportunity, setReconnectionOpportunity] = useState(null);

  // Fetch current user on mount
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/user/profile', {
          credentials: 'include'
        });
        const userData = await response.json();
        
        setCurrentUser({
          id: userData.user_id,
          username: userData.username,
          email: userData.email,
          initial: userData.username[0].toUpperCase()
        });
        
        console.log('✅ Current user loaded:', userData.username);
      } catch (error) {
        console.error('❌ Failed to fetch user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Pass currentUser to handlers
  const handlers = useQuizHandlers(quizDataHook, quizAPI, countdown, currentUser);

  const lobby = useLobby(
    quizDataHook.uiState.currentView === VIEWS.LOBBY,
    quizDataHook.gameState.gamePin,
    currentUser?.id,
    quizDataHook.gameState.isHost
  );
  
  // ============================================
  // CHECK FOR RECONNECTION ON PAGE LOAD
  // ============================================
  
  useEffect(() => {
    const opportunity = checkForReconnectionOpportunity();
    
    if (opportunity) {
      console.log('🔄 Found reconnection opportunity:', opportunity);
      setReconnectionOpportunity(opportunity);
    }
  }, []);
  
  // ============================================
  // HANDLE RECONNECTION FROM BANNER
  // ============================================
  
  const handleBannerReconnect = async () => {
    if (!reconnectionOpportunity) return;
    
    console.log('🔄 Banner reconnect clicked');
    
    try {
      const result = await rejoinBattle(
        reconnectionOpportunity.gamePin,
        reconnectionOpportunity.userId
      );
      
      if (result.success) {
        console.log('✅ Rejoined battle via banner:', result.playerData);
        
        // ✅ SIMPLIFIED: All data is now in result.playerData
        const { quizId, battleId, quizTitle, gamePin } = result.playerData;
        
        if (!quizId) {
          alert('Failed to load quiz data - quiz ID missing');
          setReconnectionOpportunity(null);
          return;
        }
        
        // Load quiz questions from API
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
          
          // Set game state
          quizDataHook.updateGameState({
            gamePin: gamePin,
            battleId: battleId,
            isHost: false,
            currentUserId: reconnectionOpportunity.userId
          });
          
          // Go to battle view
          quizDataHook.updateUiState({ currentView: VIEWS.BATTLE });
          
          // Clear opportunity
          setReconnectionOpportunity(null);
          
          console.log('✅ Reconnection complete!');
        } else {
          alert('Failed to load quiz questions');
          setReconnectionOpportunity(null);
        }
      } else {
        alert('Failed to rejoin: ' + (result.error || 'Unknown error'));
        setReconnectionOpportunity(null);
      }
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      alert('Failed to rejoin battle: ' + error.message);
      setReconnectionOpportunity(null);
    }
  };
  
  const handleDismissBanner = () => {
    console.log('🚫 Reconnection banner dismissed');
    
    // Permanently invalidate the reconnection token
    if (reconnectionOpportunity) {
      const { gamePin, userId } = reconnectionOpportunity;
      
      // Remove from localStorage
      const key = `reconnect_${gamePin}_${userId}`;
      localStorage.removeItem(key);
      console.log('✅ Reconnection token removed from localStorage');
      
      // Note: Firebase cleanup will happen via token expiration
      // or can be done here if needed
    }
    
    setReconnectionOpportunity(null);
  };

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

  // 📚 SYNC QUESTIONS: Listen for questions from Firebase (NON-HOST players)
  useEffect(() => {
    if (
      quizDataHook.uiState.currentView === VIEWS.LOBBY && 
      !quizDataHook.gameState.isHost &&
      quizDataHook.gameState.gamePin
    ) {
      console.log('👂 Listening for quiz questions from Firebase...');
      
      const unsubscribe = listenToQuizQuestions(
        quizDataHook.gameState.gamePin,
        (firebaseQuestions) => {
          console.log('📚 Questions received from Firebase!', firebaseQuestions.length);
          quizDataHook.setQuestions(firebaseQuestions);
        }
      );
      
      return () => {
        console.log('🔇 Stopped listening for questions');
        unsubscribe();
      };
    }
  }, [
    quizDataHook.uiState.currentView, 
    quizDataHook.gameState.isHost, 
    quizDataHook.gameState.gamePin
  ]);

  // 🚀 LISTEN TO BATTLE STATUS: When host starts, all players transition
  useEffect(() => {
    if (
      quizDataHook.uiState.currentView === VIEWS.LOBBY && 
      quizDataHook.gameState.gamePin
    ) {
      console.log('👂 Listening for battle status changes...');
      
      const unsubscribe = listenToBattleStatus(
        quizDataHook.gameState.gamePin,
        (newStatus) => {
          console.log('📡 Battle status changed to:', newStatus);
          
          if (newStatus === 'in_progress') {
            console.log('🚀 Battle started! Moving to loading screen...');
            
            // Transition to loading screen, then countdown will start the game
            quizDataHook.updateUiState({ currentView: VIEWS.LOADING_BATTLE });
            countdown.start();
          }
        }
      );
      
      return () => {
        console.log('🔇 Stopped listening for battle status');
        unsubscribe();
      };
    }
  }, [
    quizDataHook.uiState.currentView, 
    quizDataHook.gameState.gamePin
  ]);

  // ============================================
  // RENDER: Loading State
  // ============================================

  if (quizDataHook.loading && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 font-medium">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Error State
  // ============================================

  if (quizDataHook.error && quizDataHook.uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md mx-auto p-6 sm:p-8 bg-white rounded-xl shadow-sm">
          <div className="text-red-500 text-4xl sm:text-5xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{quizDataHook.error}</p>
          <button
            onClick={quizAPI.loadQuizzesFromAPI}
            className="px-5 sm:px-6 py-2 sm:py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium shadow-sm text-sm sm:text-base"
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
        currentUserId={currentUser?.id}           
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
        {/* 🔄 RECONNECTION BANNER - Only show when not in active game */}
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
          onUpdatePublicStatus={handlers.handleUpdatePublicStatus}
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
      
      {/* 🔄 RECONNECTION BANNER - Show on landing page too */}
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
                className="w-full bg-yellow-500 text-white py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-yellow-600 transition-colors shadow-sm text-sm sm:text-base"
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
