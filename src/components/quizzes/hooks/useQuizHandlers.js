import { VIEWS } from '../utils/constants';
import { createNewQuestion } from '../utils/questionHelpers';
import { createBattleRoom, addPlayerToBattle, markPlayerReady, storeQuizQuestions, updateBattleStatus } from '../../../firebase/battleOperations';
import { API_URL } from '../../../config/api.config';

/**
 * Custom hook for all quiz-related event handlers
 * Centralizes all user interaction logic
 * 
 * FIX: Corrected handleStartBattle to properly use gamePin from gameState
 */
export function useQuizHandlers(quizDataHook, quizAPI, countdown, currentUser, toast) {
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

    // Update selected quiz with fresh data including timer_per_question
    updateQuizData({
      selected: {
        ...quizData.selected,
        ...data.quiz
      }
    });
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

    // Update selected quiz with fresh data including timer_per_question
    updateQuizData({
      selected: {
        ...quizData.selected,
        ...data.quiz
      }
    });
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
        // Convert relative profile picture path to full URL
        let profilePictureUrl = null;
        if (currentUser.profile_picture) {
          profilePictureUrl = currentUser.profile_picture.startsWith('http')
            ? currentUser.profile_picture
            : `${API_URL}${currentUser.profile_picture}`;
        }

        await addPlayerToBattle(gamePin, {
          userId: currentUser.id,
          name: currentUser.username,
          initial: currentUser.initial,
          profilePicture: profilePictureUrl
        });
        // 🔥 Auto-mark host as ready!
        await markPlayerReady(gamePin, currentUser.id);

        // Continue...
        updateUiState({ showModal: false, currentView: VIEWS.LOBBY });

      } catch (firebaseError) {
        console.error('Firebase error:', firebaseError);
        setError('Failed to create battle room. Please try again.');
      }
    }
  };

  const handleJoinSuccess = async (battle, participant) => {

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
        questionCount: battle.total_questions,
        timer_per_question: battle.timer_per_question ?? 30
      }
    });

    // ✅ Go directly to lobby WITHOUT loading questions
    updateUiState({ currentView: VIEWS.LOBBY });

  };

  const handleStartBattle = async () => {
    // FIX: Get gamePin from gameState instead of quizData
    const currentGamePin = gameState.gamePin;

    if (!currentGamePin) {
      console.error('❌ No game PIN found!');
      setError('Game PIN not found. Please try creating the battle again.');
      return;
    }
    
    try {
      // 1️⃣ Store questions in Firebase (so players can access them)
      await storeQuizQuestions(currentGamePin, questions);

      // 2️⃣ Update battle status in Firebase to "in_progress"
      await updateBattleStatus(currentGamePin, 'in_progress');

      // 3️⃣ Update battle status in MySQL with comprehensive validation
      const result = await quizAPI.startBattle(currentGamePin);
      
      if (!result.success) {
        // Handle specific error cases
        console.error('❌ Battle start validation failed:', result.errorCode);
        
        // Show user-friendly error message
        switch (result.errorCode) {
          case 'QUIZ_DELETED':
            toast.error('Quiz was deleted. Battle cancelled.');
            if (result.shouldCleanup) {
              handleBackToList();
            }
            return;
            
          case 'NO_QUESTIONS':
            toast.error(`Cannot start battle: Quiz has no questions`);
            handleBackToList();
            return;
            
          case 'NOT_ENOUGH_PLAYERS':
            toast.error(`Need at least ${result.details?.minimumRequired || 2} players to start`);
            return;
            
          case 'TOO_MANY_PLAYERS':
            toast.error(`Too many players (${result.details?.currentPlayers}/${result.details?.maxPlayers})`);
            return;
            
          case 'INVALID_STATUS':
            toast.error(`Battle already ${result.details?.currentStatus}`);
            handleBackToList();
            return;
            
          case 'NOT_HOST':
            toast.error('Only the host can start this battle');
            return;
            
          default:
            toast.error(result.errorMessage || 'Failed to start battle');
            return;
        }
      }
      
      // 4️⃣ Transition to loading screen
      console.log('✅ Battle started successfully');
      updateUiState({ currentView: VIEWS.LOADING_BATTLE });
      countdown.start();
      
    } catch (error) {
      console.error('❌ Error starting battle:', error);
      toast.error('Failed to start battle. Please try again.');
    }
  };

  // ============================================
  // QUIZ CRUD HANDLERS
  // ============================================

  const handleEditQuiz = async (quiz) => {
    const data = await quizAPI.loadQuizWithQuestions(quiz.id);
    if (data) {
      // Use the fresh quiz data from API which includes timer_per_question
      const editingQuiz = {
        ...quiz,
        ...data.quiz, // Merge fresh data from API
        id: quiz.id // Keep the ID consistent
      };
      updateQuizData({ editing: editingQuiz });
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
      timer_per_question: 30, 
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
      
    }
  };

  // Timer handler
  const handleUpdateQuizTimer = (timerValue) => {
    if (quizData.editing) {
      const updatedQuiz = { 
        ...quizData.editing, 
        timer_per_question: timerValue
      };
      updateQuizData({ editing: updatedQuiz });
      
    }
  };

  const handleSaveQuiz = async () => {
    // Show immediate feedback
    toast.info('Saving quiz...');

    const success = await quizAPI.saveQuiz();

    if (success) {
      toast.success('Quiz saved successfully!');
      // Small delay to let user see the toast before navigating away
      setTimeout(() => {
        handleBackToList();
      }, 500);
    } else {
      toast.error('Failed to save quiz. Please try again.');
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

  const handleDuplicateQuestion = (questionId) => {
    const questionToDuplicate = questions.find(q => q.id === questionId);
    if (!questionToDuplicate) return;

    // Create a deep copy of the question with a new ID
    const duplicatedQuestion = {
      ...questionToDuplicate,
      id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      // Deep copy choices if they exist
      choices: questionToDuplicate.choices ? [...questionToDuplicate.choices] : undefined,
      // Deep copy matching pairs if they exist
      matchingPairs: questionToDuplicate.matchingPairs
        ? questionToDuplicate.matchingPairs.map(pair => ({ ...pair }))
        : undefined
    };

    // Find the index of the original question
    const originalIndex = questions.findIndex(q => q.id === questionId);
    
    // Insert the duplicated question right after the original
    const newQuestions = [
      ...questions.slice(0, originalIndex + 1),
      duplicatedQuestion,
      ...questions.slice(originalIndex + 1)
    ];

    setQuestions(newQuestions);
  };

  const handleReorderQuestions = (reorderedQuestions) => {
    setQuestions(reorderedQuestions);
  };

  const handleUpdateQuestion = (questionId, field, value) => {

    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        if (field === 'type' && value !== q.type) {
          const newQuestion = createNewQuestion(value, questions);
          return {
            ...newQuestion,
            id: q.id,
            question: q.question,
            difficulty: q.difficulty || 'medium'
          };
        }
        
        const updated = { ...q, [field]: value };
        
        return updated;
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
      const pointsEarned = attemptData.points_earned || 0;
      const expEarned = attemptData.exp_earned || 0;
      
      console.log('📊 Quiz Results - Backend Response:', {
        points_earned: attemptData.points_earned,
        exp_earned: attemptData.exp_earned,
        petLevelUp: attemptData.petLevelUp,
        fullResponse: attemptData
      });
      
      updateGameState({
        results: {
          ...results,
          points_earned: pointsEarned,
          exp_earned: expEarned,
          petLevelUp: attemptData.petLevelUp
        }
      });

      // Show toast notification for rewards
      if (toast && (pointsEarned > 0 || expEarned > 0)) {
        toast.reward('Quiz completed!', pointsEarned, expEarned);
      }

      // Trigger quest refresh AND immediate pet refresh
      window.dispatchEvent(new Event('questActivity'));
      
      // Force immediate pet refresh with a slight delay to ensure backend update is complete
      setTimeout(() => {
        window.dispatchEvent(new Event('questActivity'));
      }, 500);
    } else {
      console.error('⚠️ Quiz submit failed - no attemptData received');
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
    handleUpdateQuizTimer, 
    handleSaveQuiz,

    // Questions
    handleAddQuestion,
    handleDeleteQuestion,
    handleDuplicateQuestion,
    handleReorderQuestions,
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