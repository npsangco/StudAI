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
import { VIEWS, COUNTDOWN_SECONDS } from '../components/quizzes/utils/constants';
import { quizApi } from '../api/api'; 

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
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Grouped State
  const [quizData, setQuizData] = useState({
    list: [],
    selected: null,
    editing: null,
    draggedIndex: null
  });

  const [questions, setQuestions] = useState([]);

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

  // ============================================
  // API CALLS
  // ============================================

  // Load quizzes from API on mount
  useEffect(() => {
    loadQuizzesFromAPI();
  }, []);

  const loadQuizzesFromAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await quizApi.getAll();
      const quizzes = response.data.quizzes;
      
      // Transform API data to match frontend format
      const formattedQuizzes = quizzes.map(quiz => ({
        id: quiz.quiz_id,
        title: quiz.title,
        description: quiz.description,
        questionCount: quiz.total_questions || 0,
        created: new Date(quiz.created_at).toLocaleDateString(),
        isPublic: quiz.is_public,
        creator: quiz.creator?.username || 'Unknown'
      }));

      updateQuizData({ list: formattedQuizzes });
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setError(err.response?.data?.error || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  // Load quiz with questions from API
  const loadQuizWithQuestions = async (quizId) => {
    try {
      setLoading(true);
      
      const response = await quizApi.getById(quizId);
      const quizData = response.data;
      
      const formattedQuestions = quizData.questions.map(q => ({
        id: q.question_id,
        type: q.type,
        question: q.question,
        choices: q.choices,
        correctAnswer: q.correct_answer,
        answer: q.answer,
        matchingPairs: q.matching_pairs
      }));

      return {
        quiz: quizData.quiz,
        questions: formattedQuestions
      };
    } catch (err) {
      console.error('Failed to load quiz:', err);
      setError(err.response?.data?.error || 'Failed to load quiz');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // COUNTDOWN & NAVIGATION
  // ============================================

  function handleCountdownComplete() {
    const targetView = uiState.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    updateUiState({ currentView: targetView });
  }

  const handleBackToList = () => {
    updateQuizData({ selected: null, editing: null, draggedIndex: null });
    setQuestions([]);
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

  // ============================================
  // QUIZ SELECTION HANDLERS
  // ============================================

  const handleQuizSelect = (quiz) => {
    updateQuizData({ selected: quiz });
    updateUiState({ showModal: true });
  };

  const handleCloseModal = () => {
    updateUiState({ showModal: false });
    updateQuizData({ selected: null });
  };

  const handleSoloQuiz = async () => {
    // Load questions before starting
    const data = await loadQuizWithQuestions(quizData.selected.id);
    if (data) {
      setQuestions(data.questions);
      updateUiState({ showModal: false, currentView: VIEWS.LOADING });
      countdown.start();
    }
  };

  const handleQuizBattle = async () => {
    // Load questions before starting
    const data = await loadQuizWithQuestions(quizData.selected.id);
    if (data) {
      setQuestions(data.questions);
      updateUiState({ showModal: false, currentView: VIEWS.LOBBY });
    }
  };

  // ============================================
  // QUIZ CRUD HANDLERS
  // ============================================

  const handleEditQuiz = async (quiz) => {
    const data = await loadQuizWithQuestions(quiz.id);
    if (data) {
      updateQuizData({ editing: quiz });
      setQuestions(data.questions);
      updateUiState({ currentView: VIEWS.EDITING });
    }
  };

  const handleCreateQuiz = async () => {
    try {
      setLoading(true);
      
      const response = await quizApi.create({
        title: 'New Quiz',
        description: '',
        is_public: false
      });
      
      const newQuiz = response.data.quiz;

      // Format for frontend
      const formattedQuiz = {
        id: newQuiz.quiz_id,
        title: newQuiz.title,
        description: newQuiz.description,
        questionCount: 0,
        created: 'Just now',
        isPublic: newQuiz.is_public
      };

      // Reload quizzes to get updated list
      await loadQuizzesFromAPI();
      
      // Set editing state
      updateQuizData({ editing: formattedQuiz });
      setQuestions([]);
      updateUiState({ currentView: VIEWS.EDITING });
      
    } catch (err) {
      console.error('Failed to create quiz:', err);
      setError(err.response?.data?.error || 'Failed to create quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = (quiz) => {
    setDeleteState({ quizToDelete: quiz });
    updateUiState({ showDeleteModal: true });
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      await quizApi.delete(deleteState.quizToDelete.id);
      
      // Reload quizzes
      await loadQuizzesFromAPI();
      
      setDeleteState({ quizToDelete: null });
      updateUiState({ showDeleteModal: false });
      
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setError(err.response?.data?.error || 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuizTitle = (newTitle) => {
    if (quizData.editing) {
      const updatedQuiz = { ...quizData.editing, title: newTitle };
      updateQuizData({ editing: updatedQuiz });
    }
  };

  const handleSaveQuiz = async () => {
    try {
      setLoading(true);

      // Update quiz metadata
      await quizApi.update(quizData.editing.id, {
        title: quizData.editing.title,
        description: quizData.editing.description || '',
        is_public: quizData.editing.isPublic
      });

      // Get existing questions from server
      const currentQuizResponse = await quizApi.getById(quizData.editing.id);
      const existingQuestionIds = currentQuizResponse.data.questions.map(q => q.question_id);

      // Process questions: add new, update existing, delete removed
      const updatedQuestionIds = [];

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const questionData = {
          type: question.type,
          question: question.question,
          question_order: i + 1,
          choices: question.choices || null,
          correct_answer: question.correctAnswer || null,
          answer: question.answer || null,
          matching_pairs: question.matchingPairs || null,
          points: 1
        };

        if (question.id && existingQuestionIds.includes(question.id)) {
          // Update existing question
          await quizApi.updateQuestion(quizData.editing.id, question.id, questionData);
          updatedQuestionIds.push(question.id);
        } else {
          // Add new question
          const response = await quizApi.addQuestion(quizData.editing.id, questionData);
          updatedQuestionIds.push(response.data.question.question_id);
        }
      }

      // Delete removed questions
      for (const existingId of existingQuestionIds) {
        if (!updatedQuestionIds.includes(existingId)) {
          await quizApi.deleteQuestion(quizData.editing.id, existingId);
        }
      }

      // Reload quizzes
      await loadQuizzesFromAPI();
      
      alert('Quiz saved successfully!');
      handleBackToList();

    } catch (err) {
      console.error('Failed to save quiz:', err);
      setError(err.response?.data?.error || 'Failed to save quiz');
      alert('Failed to save quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // QUESTION HANDLERS
  // ============================================

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

  // ============================================
  // DRAG & DROP HANDLERS
  // ============================================

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

  // ============================================
  // GAME RESULT HANDLERS
  // ============================================

  const handleShowSoloResults = async (results) => {
    try {
      // Submit attempt to backend
      const response = await quizApi.submitAttempt(quizData.selected.id, {
        score: results.score,
        total_questions: results.totalQuestions,
        time_spent: results.timeSpent,
        answers: []
      });

      const attemptData = response.data;

      // Update results with earned points/exp
      updateGameState({
        results: {
          ...results,
          points_earned: attemptData.points_earned,
          exp_earned: attemptData.exp_earned
        }
      });

      updateUiState({ showResults: true });
      
    } catch (err) {
      console.error('Failed to submit attempt:', err);
      // Still show results even if submission fails
      updateGameState({ results });
      updateUiState({ showResults: true });
    }
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

  // ============================================
  // EFFECTS
  // ============================================

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

  // ============================================
  // RENDER: Loading State
  // ============================================

  if (loading && uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Error State
  // ============================================

  if (error && uiState.currentView === VIEWS.LIST) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadQuizzesFromAPI}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

  // ============================================
  // RENDER: Solo Game
  // ============================================

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

  // ============================================
  // RENDER: Battle Game
  // ============================================

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

  // ============================================
  // RENDER: Editor
  // ============================================

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

  // ============================================
  // RENDER: List View (Default)
  // ============================================

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