import { VIEWS } from '../utils/constants';
import { createNewQuestion } from '../utils/questionHelpers';

/**
 * Custom hook for all quiz-related event handlers
 * Centralizes all user interaction logic
 * 
 * FIX: Corrected handleStartBattle to properly use gamePin from gameState
 */
export function useQuizHandlers(quizDataHook, quizAPI, countdown) {
  const {
    updateQuizData,
    updateUiState,
    updateGameState,
    updateDeleteState,
    resetAllState,
    setError,
    setQuestions,
    quizData,
    questions,
    gameState  // ← Make sure we have access to gameState
  } = quizDataHook;

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================

  const handleBackToList = () => {
    resetAllState();
    countdown.reset();
  };

  const handleBackFromEditor = async () => {
    // If it's a temp quiz (never saved), just discard it
    if (quizData.editing?.isTemp) {
      console.log('🗑️ Discarding temp quiz');
      handleBackToList();
      return;
    }
    
    // Auto-delete empty quiz
    await quizAPI.autoDeleteEmptyQuiz();
    
    // Reload quizzes to ensure consistency
    await quizAPI.loadQuizzesFromAPI();
    handleBackToList();
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
    const data = await quizAPI.loadQuizWithQuestions(quizData.selected.id);
    
    if (!data || !data.questions || data.questions.length === 0) {
      setError('This quiz has no questions yet. Please add questions before starting.');
      updateUiState({ showModal: false });
      return;
    }
    
    setQuestions(data.questions);
    updateUiState({ showModal: false, currentView: VIEWS.LOADING });
    countdown.start();
  };

  const handleQuizBattle = async () => {
    // Load questions
    const data = await quizAPI.loadQuizWithQuestions(quizData.selected.id);
    
    if (!data || !data.questions || data.questions.length === 0) {
      setError('This quiz has no questions yet. Please add questions before starting a battle.');
      updateUiState({ showModal: false });
      return;
    }
    
    setQuestions(data.questions);
    
    // Create battle room
    const battleData = await quizAPI.createBattle(quizData.selected.id);
    
    if (battleData) {
      updateUiState({ showModal: false, currentView: VIEWS.LOBBY });
    }
  };

  const handleJoinSuccess = async (battle, participant) => {
    console.log('✅ Successfully joined battle:', battle);
    console.log('✅ Participant info:', participant);
    
    // Set the battle data
    updateGameState({ 
      gamePin: battle.game_pin,
      battleId: battle.battle_id,
      isHost: false
    });
    
    // Load the quiz questions
    const data = await quizAPI.loadQuizWithQuestions(battle.quiz_id);
    if (data && data.questions) {
      setQuestions(data.questions);
      
      // Update selected quiz info
      updateQuizData({ 
        selected: {
          id: battle.quiz_id,
          title: battle.quiz_title,
          questionCount: battle.total_questions
        }
      });
      
      // Go to lobby
      updateUiState({ currentView: VIEWS.LOBBY });
    } else {
      setError('Failed to load quiz questions');
    }
  };

  const handleStartBattle = async () => {
    // FIX: Get gamePin from gameState instead of quizData
    const currentGamePin = gameState.gamePin;
    
    console.log('🎮 Starting battle with PIN:', currentGamePin); // Debug log
    
    if (!currentGamePin) {
      console.error('❌ No game PIN found!');
      setError('Game PIN not found. Please try creating the battle again.');
      return;
    }
    
    const success = await quizAPI.startBattle(currentGamePin);
    
    if (success) {
      updateUiState({ currentView: VIEWS.LOADING_BATTLE });
      countdown.start();
    }
  };

  // ============================================
  // QUIZ CRUD HANDLERS
  // ============================================

  const handleEditQuiz = async (quiz) => {
    const data = await quizAPI.loadQuizWithQuestions(quiz.id);
    if (data) {
      updateQuizData({ editing: quiz });
      setQuestions(data.questions);
      updateUiState({ currentView: VIEWS.EDITING });
    }
  };

  const handleCreateQuiz = () => {
    const tempQuiz = {
      id: `temp-${Date.now()}`,
      title: 'New Quiz',
      description: '',
      questionCount: 0,
      created: 'Just now',
      isPublic: false,
      isTemp: true
    };

    updateQuizData({ editing: tempQuiz });
    setQuestions([]);
    updateUiState({ currentView: VIEWS.EDITING });
  };

  const handleDeleteQuiz = (quiz) => {
    updateDeleteState({ quizToDelete: quiz });
    updateUiState({ showDeleteModal: true });
  };

  const handleConfirmDelete = async () => {
    const success = await quizAPI.deleteQuiz();
    
    if (success) {
      // Already handled in API hook
    }
  };

  const handleUpdateQuizTitle = (newTitle) => {
    if (quizData.editing) {
      const updatedQuiz = { ...quizData.editing, title: newTitle };
      updateQuizData({ editing: updatedQuiz });
    }
  };

  const handleSaveQuiz = async () => {
    const success = await quizAPI.saveQuiz();
    
    if (success) {
      alert('Quiz saved successfully!');
      handleBackToList();
    } else {
      alert('Failed to save quiz. Please try again.');
    }
  };

  // ============================================
  // QUESTION HANDLERS
  // ============================================

  const handleAddQuestion = () => {
    if (questions.length >= 30) {
      alert('Maximum 30 questions per quiz!');
      return;
    }

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
    const attemptData = await quizAPI.submitAttempt(quizData.selected.id, results);

    if (attemptData) {
      updateGameState({
        results: {
          ...results,
          points_earned: attemptData.points_earned,
          exp_earned: attemptData.exp_earned
        }
      });
    } else {
      updateGameState({ results });
    }

    updateUiState({ showResults: true });
  };

  const handleCloseSoloResults = () => {
    updateUiState({ showResults: false });
    updateGameState({ results: null });
    handleBackToList();
  };

  const handleRetrySoloQuiz = () => {
    updateUiState({ showResults: false, currentView: VIEWS.LOADING });
    updateGameState(prev => ({ ...prev, quizKey: prev.quizKey + 1 }));
    countdown.start();
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

  const handleCountdownComplete = () => {
    const targetView = quizDataHook.uiState?.currentView === VIEWS.LOADING 
      ? VIEWS.SOLO 
      : VIEWS.BATTLE;
    updateUiState({ currentView: targetView });
  };

  return {
    // Navigation
    handleBackToList,
    handleBackFromEditor,
    handleCountdownComplete,

    // Quiz selection
    handleQuizSelect,
    handleCloseModal,
    handleSoloQuiz,
    handleQuizBattle,
    handleJoinSuccess,
    handleStartBattle,

    // Quiz CRUD
    handleEditQuiz,
    handleCreateQuiz,
    handleDeleteQuiz,
    handleConfirmDelete,
    handleUpdateQuizTitle,
    handleSaveQuiz,

    // Questions
    handleAddQuestion,
    handleDeleteQuestion,
    handleUpdateQuestion,
    handleUpdateChoice,
    handleAddChoice,
    handleAddMatchingPair,
    handleUpdateMatchingPair,
    handleRemoveMatchingPair,

    // Drag & Drop
    handleDragStart,
    handleDragOver,
    handleDrop,

    // Game results
    handleShowSoloResults,
    handleCloseSoloResults,
    handleRetrySoloQuiz,
    handleShowLeaderboard,
    handleCloseLeaderboard
  };
}