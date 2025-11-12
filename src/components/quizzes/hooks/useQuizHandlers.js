import { VIEWS } from '../utils/constants';
import { createNewQuestion } from '../utils/questionHelpers';
import { createBattleRoom, addPlayerToBattle, markPlayerReady, storeQuizQuestions, updateBattleStatus } from '../../../firebase/battleOperations';

/**
 * Custom hook for all quiz-related event handlers
 * Centralizes all user interaction logic
 * 
 * FIX: Corrected handleStartBattle to properly use gamePin from gameState
 */
export function useQuizHandlers(quizDataHook, quizAPI, countdown, currentUser) {
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
    
    // 1️⃣ Create battle in MySQL (existing API call)
    const battleData = await quizAPI.createBattle(quizData.selected.id);
    
    if (battleData) {
      const { battle, gamePin } = battleData;
      
      // 2️⃣ Create battle room in Firebase
      try {
        await createBattleRoom(gamePin, {
          battleId: battle.battle_id,
          quizId: quizData.selected.id,
          quizTitle: quizData.selected.title,
          hostId: currentUser.id, 
          totalQuestions: data.questions.length
        });
        
        // 3️⃣ Add host as first player
        await addPlayerToBattle(gamePin, {
          userId: currentUser.id, 
          name: currentUser.username,
          initial: currentUser.initial
        });
        // 🔥 Auto-mark host as ready!
        await markPlayerReady(gamePin, currentUser.id);
        console.log('✅ Host auto-marked as ready');

        // Continue...
        updateUiState({ showModal: false, currentView: VIEWS.LOBBY });
        
      } catch (firebaseError) {
        console.error('Firebase error:', firebaseError);
        setError('Failed to create battle room. Please try again.');
      }
    }
  };

  const handleJoinSuccess = async (battle, participant) => {
    console.log('✅ Successfully joined battle:', battle);
    console.log('✅ Participant info:', participant);
    
    // Set the battle data
    updateGameState({ 
      gamePin: battle.game_pin,
      battleId: battle.battle_id,
      isHost: false,
      currentUserId: participant.user_id // Store current user ID
    });
    
    // Don't try to load questions from MySQL!
    // Just set basic quiz info - questions will come from Firebase
    updateQuizData({ 
      selected: {
        id: battle.quiz_id,
        title: battle.quiz_title,
        questionCount: battle.total_questions
      }
    });
    
    // ✅ Go directly to lobby WITHOUT loading questions
    updateUiState({ currentView: VIEWS.LOBBY });
    
    console.log('🎮 Joined lobby successfully!');
  };

  const handleStartBattle = async () => {
    // FIX: Get gamePin from gameState instead of quizData
    const currentGamePin = gameState.gamePin;
    
    console.log('🎮 Starting battle with PIN:', currentGamePin);
    
    if (!currentGamePin) {
      console.error('❌ No game PIN found!');
      setError('Game PIN not found. Please try creating the battle again.');
      return;
    }
    
    try {
      // 1️⃣ Store questions in Firebase (so players can access them)
      await storeQuizQuestions(currentGamePin, questions);
      console.log('✅ Questions stored in Firebase');
      
      // 2️⃣ Update battle status in Firebase to "in_progress"
      await updateBattleStatus(currentGamePin, 'in_progress');
      console.log('✅ Battle status set to in_progress');
      
      // 3️⃣ Update battle status in MySQL
      await quizAPI.startBattle(currentGamePin);
      
      // 4️⃣ Transition to loading screen
      updateUiState({ currentView: VIEWS.LOADING_BATTLE });
      countdown.start();
      
    } catch (error) {
      console.error('❌ Error starting battle:', error);
      setError('Failed to start battle. Please try again.');
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

  const handleUpdatePublicStatus = (isPublic, shareCode) => {
    if (quizData.editing) {
      const updatedQuiz = { 
        ...quizData.editing, 
        isPublic,
        share_code: shareCode || quizData.editing.share_code // Preserve share_code
      };
      updateQuizData({ editing: updatedQuiz });
      console.log('✅ Quiz public status updated in state:', { isPublic, shareCode });
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
    handleUpdatePublicStatus,
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