import React, { useState, useEffect } from 'react';
import { QuizList } from '../components/quizzes/views/QuizList';
import { QuizBattles } from '../components/quizzes/views/QuizBattles';
import { QuizEditor } from '../components/quizzes/views/QuizEditor';
import QuizGame from '../components/quizzes/views/QuizGame';
import QuizResults from '../components/quizzes/views/QuizResults';
import QuizLeaderboard from '../components/quizzes/views/QuizLeaderboard';
import { SoloLoadingScreen, BattleLobbyScreen } from '../components/quizzes/views/QuizLoadingScreens';
import { QuizModal, DeleteConfirmationModal } from '../components/quizzes/QuizModal';
import { useCountdown } from '../components/quizzes/hooks/useCountdown';
import { useLobby } from '../components/quizzes/hooks/useLobby';
import { createNewQuestion } from '../components/quizzes/utils/questionHelpers';
import { initialQuizzes, initialQuestions } from '../components/quizzes/utils/mockData';
import { VIEWS, COUNTDOWN_SECONDS } from '../components/quizzes/utils/constants';

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

  .animate-slide-in {
    animation: slideIn 0.3s ease-out forwards;
    opacity: 0;
  }
`;

function QuizzesPage() {
  // Grouped State
  const [quizData, setQuizData] = useState({
    list: initialQuizzes,
    selected: null,
    editing: null,
    draggedIndex: null
  });

  const [questions, setQuestions] = useState(initialQuestions);

  const [uiState, setUiState] = useState({
    currentView: VIEWS.LIST,
    showModal: false,
    showResults: false,
    showLeaderboard: false,
    showDeleteModal: false
  });

  const [gameState, setGameState] = useState({
    results: null,
    quizKey: 0,
    gamePin: ''
  });

  const [deleteState, setDeleteState] = useState({
    quizToDelete: null
  });

  // Custom Hooks
  const countdown = useCountdown(COUNTDOWN_SECONDS, handleCountdownComplete);
  const lobby = useLobby(uiState.currentView === VIEWS.LOBBY);

  // Update Helpers
  const updateQuizData = (updates) => {
    setQuizData(prev => ({ ...prev, ...updates }));
  };

  const updateUiState = (updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  };

  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  // Countdown Complete Handler
  function handleCountdownComplete() {
    const targetView = uiState.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    updateUiState({ currentView: targetView });
  }

  // Quiz Selection Handlers
  const handleQuizSelect = (quiz) => {
    updateQuizData({ selected: quiz });
    updateUiState({ showModal: true });
  };

  const handleCloseModal = () => {
    updateUiState({ showModal: false });
    updateQuizData({ selected: null });
  };

  const handleSoloQuiz = () => {
    updateUiState({ showModal: false, currentView: VIEWS.LOADING });
    countdown.start();
  };

  const handleQuizBattle = () => {
    updateUiState({ showModal: false, currentView: VIEWS.LOBBY });
  };

  const handleBackToList = () => {
    updateQuizData({ selected: null, editing: null, draggedIndex: null });
    updateUiState({
      currentView: VIEWS.LIST,
      showModal: false,
      showResults: false,
      showLeaderboard: false,
      showDeleteModal: false
    });
    updateGameState({ results: null, gamePin: '' });
    countdown.reset();
  };

  // Quiz CRUD Handlers
  const handleEditQuiz = (quiz) => {
    updateQuizData({ editing: quiz });
    updateUiState({ currentView: VIEWS.EDITING });
  };

  const handleCreateQuiz = () => {
    const newQuiz = {
      id: quizData.list.length > 0 ? Math.max(...quizData.list.map(q => q.id)) + 1 : 1,
      title: 'New Quiz',
      questionCount: 0,
      created: 'Created just now',
      isPublic: false
    };
    
    setQuizData(prev => ({
      ...prev,
      list: [newQuiz, ...prev.list],
      editing: newQuiz
    }));
    setQuestions([]);
    updateUiState({ currentView: VIEWS.EDITING });
  };

  const handleDeleteQuiz = (quiz) => {
    setDeleteState({ quizToDelete: quiz });
    updateUiState({ showDeleteModal: true });
  };

  const handleConfirmDelete = () => {
    updateQuizData({
      list: quizData.list.filter(q => q.id !== deleteState.quizToDelete.id)
    });
    setDeleteState({ quizToDelete: null });
    updateUiState({ showDeleteModal: false });
  };

  const handleUpdateQuizTitle = (newTitle) => {
    if (quizData.editing) {
      const updatedQuiz = { ...quizData.editing, title: newTitle };
      updateQuizData({ 
        editing: updatedQuiz,
        list: quizData.list.map(q => q.id === updatedQuiz.id ? updatedQuiz : q)
      });
    }
  };

  const handleSaveQuiz = () => {
    console.log('Saving quiz:', quizData.editing.title, questions);
    alert('Quiz saved successfully!');
  };

  // Question Handlers
  const handleAddQuestion = () => {
    const newQuestion = createNewQuestion('Multiple Choice', questions);
    setQuestions([...questions, newQuestion]);
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleUpdateQuestion = (questionId, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (field === 'type' && value !== q.type) {
          const newQuestion = createNewQuestion(value, questions);
          return {
            ...newQuestion,
            id: q.id,
            question: q.question
          };
        }
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleUpdateChoice = (questionId, choiceIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        const newChoices = [...q.choices];
        newChoices[choiceIndex] = value;
        return { ...q, choices: newChoices };
      }
      return q;
    }));
  };

  const handleAddChoice = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        return { ...q, choices: [...q.choices, ''] };
      }
      return q;
    }));
  };

  const handleAddMatchingPair = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          matchingPairs: [
            ...(q.matchingPairs || []),
            { left: '', right: '' }
          ]
        };
      }
      return q;
    }));
  };

  const handleUpdateMatchingPair = (questionId, pairIndex, side, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.matchingPairs) {
        const newPairs = [...q.matchingPairs];
        newPairs[pairIndex] = {
          ...newPairs[pairIndex],
          [side]: value
        };
        return { ...q, matchingPairs: newPairs };
      }
      return q;
    }));
  };

  const handleRemoveMatchingPair = (questionId, pairIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.matchingPairs) {
        return {
          ...q,
          matchingPairs: q.matchingPairs.filter((_, index) => index !== pairIndex)
        };
      }
      return q;
    }));
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    updateQuizData({ draggedIndex: index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (quizData.draggedIndex !== null && quizData.draggedIndex !== dropIndex) {
      const newQuizList = [...quizData.list];
      const draggedItem = newQuizList[quizData.draggedIndex];
      
      newQuizList.splice(quizData.draggedIndex, 1);
      newQuizList.splice(dropIndex, 0, draggedItem);
      
      updateQuizData({ list: newQuizList, draggedIndex: null });
    } else {
      updateQuizData({ draggedIndex: null });
    }
  };

  // Game Result Handlers
  const handleShowSoloResults = (results) => {
    updateGameState({ results });
    updateUiState({ showResults: true });
  };

  const handleCloseSoloResults = () => {
    updateUiState({ showResults: false });
    updateGameState({ results: null });
    handleBackToList();
  };

  const handleRetrySoloQuiz = () => {
    updateUiState({ showResults: false });
    updateGameState(prev => ({ ...prev, quizKey: prev.quizKey + 1 }));
  };

  const handleShowLeaderboard = (results) => {
    updateGameState({ results });
    updateUiState({ showLeaderboard: true });
  };

  const handleCloseLeaderboard = () => {
    updateUiState({ showLeaderboard: false });
    updateGameState({ results: null });
    handleBackToList();
  };

  // Hide navbar for game views
  useEffect(() => {
    const gameViews = [VIEWS.LOADING, VIEWS.LOADING_BATTLE, VIEWS.LOBBY, VIEWS.SOLO, VIEWS.BATTLE];
    const shouldHide = gameViews.includes(uiState.currentView);

    if (shouldHide) {
      document.body.classList.add('hide-navbar');
    } else {
      document.body.classList.remove('hide-navbar');
    }

    return () => document.body.classList.remove('hide-navbar');
  }, [uiState.currentView]);

  // Auto-start battle when all ready
  useEffect(() => {
    if (lobby.allReady && uiState.currentView === VIEWS.LOBBY) {
      setTimeout(() => {
        updateUiState({ currentView: VIEWS.LOADING_BATTLE });
        countdown.start();
      }, 1000);
    }
  }, [lobby.allReady, uiState.currentView]);

  // RENDER: Loading Screens
  if (uiState.currentView === VIEWS.LOADING || uiState.currentView === VIEWS.LOADING_BATTLE) {
    return <SoloLoadingScreen countdown={countdown.countdown} quizTitle={quizData.selected?.title} />;
  }

  if (uiState.currentView === VIEWS.LOBBY) {
    return (
      <BattleLobbyScreen
        lobbyPlayers={lobby.players}
        playerPositions={lobby.playerPositions}
        quizTitle={quizData.selected?.title}
        onUserReady={lobby.markUserReady}
        onLeave={handleBackToList}
        setPlayerPositions={lobby.setPlayerPositions}
      />
    );
  }

  // RENDER: Solo Game
  if (uiState.currentView === VIEWS.SOLO && quizData.selected) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame
          key={`solo-${gameState.quizKey}-${Date.now()}`}
          quiz={{ ...quizData.selected, questions }}
          mode="solo"
          onBack={handleBackToList}
          onComplete={handleShowSoloResults}
        />
        <QuizResults
          isOpen={uiState.showResults}
          onClose={handleCloseSoloResults}
          onRetry={handleRetrySoloQuiz}
          results={gameState.results}
          mode="solo"
        />
      </>
    );
  }

  // RENDER: Battle Game
  if (uiState.currentView === VIEWS.BATTLE && quizData.selected) {
    return (
      <>
        <style>{styles}</style>
        <QuizGame
          key={`battle-${gameState.quizKey}`}
          quiz={{ ...quizData.selected, questions }}
          mode="battle"
          onBack={handleBackToList}
          onComplete={handleShowLeaderboard}
        />
        <QuizLeaderboard
          isOpen={uiState.showLeaderboard}
          onClose={handleCloseLeaderboard}
          results={gameState.results}
        />
      </>
    );
  }

  // RENDER: Editor
  if (uiState.currentView === VIEWS.EDITING && quizData.editing) {
    return (
      <>
        <style>{styles}</style>
        <QuizEditor
          quiz={quizData.editing}
          questions={questions}
          onBack={handleBackToList}
          onSave={handleSaveQuiz}
          onUpdateTitle={handleUpdateQuizTitle}
          onAddQuestion={handleAddQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onUpdateQuestion={handleUpdateQuestion}
          onUpdateChoice={handleUpdateChoice}
          onAddChoice={handleAddChoice}
          onAddMatchingPair={handleAddMatchingPair}
          onUpdateMatchingPair={handleUpdateMatchingPair}
          onRemoveMatchingPair={handleRemoveMatchingPair}
        />
      </>
    );
  }

  // RENDER: List View (Default)
  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <QuizList
              quizzes={quizData.list}
              draggedIndex={quizData.draggedIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEditQuiz={handleEditQuiz}
              onQuizSelect={handleQuizSelect}
              onDeleteQuiz={handleDeleteQuiz}
              onCreateQuiz={handleCreateQuiz}
            />

            <QuizBattles
              gamePin={gameState.gamePin}
              setGamePin={(pin) => updateGameState({ gamePin: pin })}
            />
          </div>
        </div>

        <QuizModal
          quiz={quizData.selected}
          isOpen={uiState.showModal}
          onClose={handleCloseModal}
          onSoloQuiz={handleSoloQuiz}
          onQuizBattle={handleQuizBattle}
        />

        <DeleteConfirmationModal
          isOpen={uiState.showDeleteModal}
          onClose={() => {
            updateUiState({ showDeleteModal: false });
            setDeleteState({ quizToDelete: null });
          }}
          onConfirm={handleConfirmDelete}
          itemName={deleteState.quizToDelete?.title || ''}
          itemType="quiz"
        />
      </div>
    </>
  );
}

export default QuizzesPage;