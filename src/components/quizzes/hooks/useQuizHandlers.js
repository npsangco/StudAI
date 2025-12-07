import { VIEWS } from '../utils/constants';
import { createNewQuestion } from '../utils/questionHelpers';
import { validateAllQuestions } from '../utils/validation';
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
    setIsDirty,
    setIsSaving,
    quizData,
    questions,
    gameState 
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

  const handleSoloQuiz = async (requestedQuestionCount, quizMode = 'casual') => {
    // Load questions before starting
    const data = await quizAPI.loadQuizWithQuestions(quizData.selected.id);

    if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      setError('This quiz has no questions yet. Please add at least 10 questions before starting.');
      updateUiState({ showModal: false });
      toast?.error('Cannot start quiz: No questions available');
      return;
    }

    // Check minimum question count requirement
    if (data.questions.length < 10) {
      setError(`This quiz needs at least 10 questions to be playable. Current count: ${data.questions.length}`);
      updateUiState({ showModal: false });
      toast?.error(`Add ${10 - data.questions.length} more question(s) to start this quiz`);
      return;
    }

    // Shuffle and limit questions based on user selection
    let questionsToUse = [...data.questions];

    // SAFETY: Filter out any invalid questions
    questionsToUse = questionsToUse.filter(q =>
      q &&
      q.question &&
      q.type &&
      q.question.trim() !== ''
    );

    if (questionsToUse.length === 0) {
      setError('This quiz has no valid questions. Please check your questions.');
      updateUiState({ showModal: false });
      toast?.error('Cannot start quiz: No valid questions found');
      return;
    }

    // 🛡️ PRE-FLIGHT VALIDATION: Check for errors before starting
    const validation = validateAllQuestions(questionsToUse);
    if (!validation.isValid) {
      console.error('🚨 QUIZ VALIDATION FAILED (Solo):', {
        quizId: quizData.selected.id,
        quizTitle: quizData.selected.title,
        errorCount: validation.errors.length,
        errors: validation.errors,
        userId: currentUser?.id
      });
      setError(`This quiz has ${validation.errors.length} validation error(s). Please edit the quiz to fix them before starting.`);
      updateUiState({ showModal: false, showValidationError: true });
      quizDataHook.setValidationErrors(validation.errors);
      toast?.error('Cannot start quiz: Validation errors found');
      return;
    }

    // MODE-SPECIFIC QUESTION SELECTION
    if (quizMode === 'normal') {
      // NORMAL MODE: Keep original order, limit to requested count
      if (requestedQuestionCount && requestedQuestionCount < questionsToUse.length) {
        questionsToUse = questionsToUse.slice(0, requestedQuestionCount);
      }
    } else if (quizMode === 'casual') {
      // CASUAL MODE: Always shuffle randomly
      questionsToUse = questionsToUse.sort(() => Math.random() - 0.5);
      
      // Limit to requested count if specified
      if (requestedQuestionCount && requestedQuestionCount < questionsToUse.length) {
        questionsToUse = questionsToUse.slice(0, requestedQuestionCount);
      }
    } else if (quizMode === 'adaptive') {
      // ADAPTIVE MODE: Select based on difficulty distribution
      // Group questions by difficulty
      const difficultyPools = {
        easy: questionsToUse.filter(q => (q.difficulty || 'medium').toLowerCase() === 'easy'),
        medium: questionsToUse.filter(q => (q.difficulty || 'medium').toLowerCase() === 'medium'),
        hard: questionsToUse.filter(q => (q.difficulty || 'medium').toLowerCase() === 'hard')
      };

      // Build question queue: fill from available pools to reach target count
      let selectedQuestions = [];
      const targetCount = requestedQuestionCount || questionsToUse.length;
      
      // Try to get questions in balanced order: medium, easy, hard
      const pullOrder = ['medium', 'easy', 'hard'];
      
      for (const difficulty of pullOrder) {
        const available = difficultyPools[difficulty];
        const needed = targetCount - selectedQuestions.length;
        
        if (available.length > 0 && needed > 0) {
          const take = Math.min(available.length, needed);
          selectedQuestions.push(...available.slice(0, take));
        }
        
        if (selectedQuestions.length >= targetCount) break;
      }
      
      questionsToUse = selectedQuestions;
    }

    // Update selected quiz with fresh data including timer_per_question and mode
    updateQuizData({
      selected: {
        ...quizData.selected,
        ...data.quiz,
        quizMode: quizMode // Pass mode to QuizGame
      }
    });
    setQuestions(questionsToUse);
    updateUiState({ showModal: false, currentView: VIEWS.LOADING });
    countdown.start();
  };

  const handleQuizBattle = async (requestedQuestionCount, quizMode = 'casual') => {
    console.log('🎮 handleQuizBattle called:', { 
      quizId: quizData.selected.id,
      quizTitle: quizData.selected.title,
      requestedQuestionCount,
      quizMode 
    });

    // Load questions
    const data = await quizAPI.loadQuizWithQuestions(quizData.selected.id);
    console.log('📊 Loaded quiz data:', {
      hasData: !!data,
      hasQuestions: !!data?.questions,
      questionCount: data?.questions?.length,
      isArray: Array.isArray(data?.questions)
    });

    if (!data || !data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      console.error('❌ No questions found');
      const errorMsg = '❌ Cannot Start Battle\n\nThis quiz has no questions yet.\n\n✅ Solution: Add at least 10 questions before starting a battle.';
      setError(errorMsg);
      updateUiState({ showModal: false });
      toast?.error('Cannot start battle: No questions available');
      return;
    }

    // Check minimum question count requirement
    if (data.questions.length < 10) {
      console.error('❌ Not enough questions:', data.questions.length);
      const errorMsg = `❌ Not Enough Questions\n\nCurrent: ${data.questions.length} question${data.questions.length !== 1 ? 's' : ''}\nRequired: 10 questions minimum\n\n✅ Solution: Add ${10 - data.questions.length} more question${10 - data.questions.length !== 1 ? 's' : ''} to start a battle.`;
      setError(errorMsg);
      updateUiState({ showModal: false });
      toast?.error(`Add ${10 - data.questions.length} more question(s) to start a battle`);
      return;
    }

    console.log('✅ Passed question count check');

    // Shuffle and limit questions based on user selection
    let questionsToUse = [...data.questions];

    // 🔒 SAFETY: Filter out any invalid questions
    console.log('🔍 Filtering invalid questions from', questionsToUse.length, 'questions');
    questionsToUse = questionsToUse.filter(q =>
      q &&
      q.question &&
      q.type &&
      q.question.trim() !== ''
    );
    console.log('✅ After filtering:', questionsToUse.length, 'valid questions');

    if (questionsToUse.length === 0) {
      console.error('❌ No valid questions after filtering');
      const errorMsg = '❌ Invalid Questions\n\nAll questions are missing required fields:\n• Question text\n• Question type\n• Answer options\n\n✅ Solution: Edit the quiz and complete all questions with proper content.';
      setError(errorMsg);
      updateUiState({ showModal: false });
      toast?.error('Cannot start battle: No valid questions found');
      return;
    }

    // PRE-FLIGHT VALIDATION: Check for errors before starting battle
    console.log('🔍 Running validation on', questionsToUse.length, 'questions');
    const validation = validateAllQuestions(questionsToUse);
    console.log('📋 Validation result:', validation);

    if (!validation.isValid) {
      console.error('🚨 QUIZ VALIDATION FAILED (Battle):', {
        quizId: quizData.selected.id,
        quizTitle: quizData.selected.title,
        errorCount: validation.errors.length,
        errors: validation.errors,
        userId: currentUser?.id
      });
      const errorDetails = validation.errors.slice(0, 3).map(e => `• ${e.message || e}`).join('\n');
      const moreErrors = validation.errors.length > 3 ? `\n...and ${validation.errors.length - 3} more error(s)` : '';
      const errorMsg = `❌ Validation Errors (${validation.errors.length})\n\nTop issues:\n${errorDetails}${moreErrors}\n\n✅ Solution: Edit the quiz to fix these errors before creating a battle.`;
      setError(errorMsg);
      updateUiState({ showModal: false, showValidationError: true });
      quizDataHook.setValidationErrors(validation.errors);
      toast?.error('Cannot start battle: Validation errors found');
      return;
    }

    console.log('✅ Passed validation check');

    // MODE-SPECIFIC QUESTION SELECTION FOR BATTLE
    if (quizMode === 'normal') {
      // NORMAL MODE: Keep original order
      // Just limit to requested count
      if (requestedQuestionCount && requestedQuestionCount < questionsToUse.length) {
        questionsToUse = questionsToUse.slice(0, requestedQuestionCount);
      }
    } else if (quizMode === 'casual') {
      // CASUAL MODE: Shuffle questions
      questionsToUse = questionsToUse.sort(() => Math.random() - 0.5);
      
      // Limit to requested question count if specified
      if (requestedQuestionCount && requestedQuestionCount < questionsToUse.length) {
        questionsToUse = questionsToUse.slice(0, requestedQuestionCount);
      }
    }

    // Update selected quiz with fresh data including timer_per_question
    updateQuizData({
      selected: {
        ...quizData.selected,
        ...data.quiz
      }
    });
    setQuestions(questionsToUse);

    // 1️⃣ Create battle in MySQL (existing API call)
    const battleData = await quizAPI.createBattle(quizData.selected.id);

    if (!battleData) {
      const errorMsg = '❌ Database Error\n\nFailed to create battle in database.\n\nPossible causes:\n• Server connection issue\n• Database error\n• Quiz access permissions\n\n✅ Solution: Please refresh and try again. Contact support if issue persists.';
      setError(errorMsg);
      updateUiState({ showModal: false });
      toast?.error('Failed to create battle');
      return;
    }

    const { battle, gamePin } = battleData;

    // 2️⃣ Create battle room in Firebase
    try {
      await createBattleRoom(gamePin, {
          battleId: battle.battle_id,
          quizId: quizData.selected.id,
          quizTitle: quizData.selected.title,
          hostId: currentUser.id,
          totalQuestions: questionsToUse.length
        });
      console.log('✅ Battle room created in Firebase');

      // 3️⃣ Add host as first player
      console.log('👤 Adding host as first player:', currentUser.id);
      // Convert relative profile picture path to full URL
        let profilePictureUrl = null;
        if (currentUser.profile_picture) {
          profilePictureUrl = currentUser.profile_picture.startsWith('http') || currentUser.profile_picture.startsWith('/')
            ? currentUser.profile_picture
            : `${API_URL}${currentUser.profile_picture}`;
        }

        await addPlayerToBattle(gamePin, {
          userId: currentUser.id,
          name: currentUser.username,
          initial: currentUser.initial,
          profilePicture: profilePictureUrl
        });
      console.log('✅ Host added to battle');
        
      // Set game state for host
      updateGameState({
        gamePin: gamePin,
        battleId: battle.battle_id,
        isHost: true,
        currentUserId: currentUser.id
      });
      console.log('✅ Game state updated');

      // 4️⃣ Store questions in Firebase
      console.log('📝 Storing', questionsToUse.length, 'questions in Firebase');
      // Store the FILTERED questions (questionsToUse), not all questions (data.questions)
      await storeQuizQuestions(gamePin, questionsToUse);
      console.log('✅ Questions stored in Firebase');
        
      // Host should manually click "Ready Up" button like other players

      // Continue...
      updateUiState({ showModal: false, currentView: VIEWS.LOBBY });

      } catch (firebaseError) {
        
        // Detailed error message based on Firebase error code
        let errorMsg = '❌ Firebase Battle Room Error\n\n';
        if (firebaseError.code === 'PERMISSION_DENIED' || firebaseError.message?.includes('permission')) {
          errorMsg += 'Error: Permission Denied\n\n⚠️ Firebase security rules are blocking this action.\n\n✅ Solution: Contact support immediately.\n\nTechnical Details:\n• Error Code: PERMISSION_DENIED\n• This is a server configuration issue';
        } else if (firebaseError.message?.includes('network') || firebaseError.message?.includes('offline')) {
          errorMsg += 'Error: Network Connection Lost\n\n⚠️ Cannot connect to Firebase servers.\n\n✅ Solution:\n• Check your internet connection\n• Try again in a moment\n• Refresh the page if problem persists';
        } else {
          errorMsg += `Error: ${firebaseError.message || 'Unknown Firebase error'}\n\n⚠️ Game PIN: ${gamePin}\n⚠️ Error Code: ${firebaseError.code || 'N/A'}\n\n✅ Solution:\n• Try refreshing the page\n• Contact support with the Game PIN above`;
        }
        
        setError(errorMsg);
        toast?.error('Failed to create battle room');
        // Optionally clean up the MySQL battle if Firebase fails
        // You might want to add a rollback API call here
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

    // Go directly to lobby WITHOUT loading questions
    updateUiState({ currentView: VIEWS.LOBBY });

  };

  const handleStartBattle = async () => {
    // Get gamePin from gameState instead of quizData
    const currentGamePin = gameState.gamePin;

    console.log('🎮 START BATTLE - Debug Info:', {
      gamePin: currentGamePin,
      questionsCount: questions?.length,
      questionsData: questions,
      hasQuestions: questions && questions.length > 0
    });

    if (!currentGamePin) {
      console.error('❌ No game PIN found');
      setError('Game PIN not found. Please try creating the battle again.');
      toast.error('Game PIN not found');
      return;
    }

    if (!questions || questions.length === 0) {
      console.error('❌ No questions loaded');
      setError('No questions available. Please try creating the battle again.');
      toast.error('No questions available');
      return;
    }
    
    try {
      // 1️⃣ Store questions in Firebase (so players can access them)
      console.log('📤 Storing questions in Firebase...', {
        gamePin: currentGamePin,
        questionCount: questions.length
      });

      
      await storeQuizQuestions(currentGamePin, questions);
      console.log('✅ Questions stored in Firebase');

      // 2️⃣ Update battle status in Firebase to "in_progress"
      console.log('📤 Updating battle status in Firebase...');
      await updateBattleStatus(currentGamePin, 'in_progress');
      console.log('✅ Battle status updated in Firebase');

      // 3️⃣ Update battle status in MySQL with comprehensive validation
      console.log('📤 Starting battle in MySQL...');
      const result = await quizAPI.startBattle(currentGamePin);
      
      console.log('📥 MySQL response:', result);
      
      if (!result.success) {
        // Handle specific error cases
        console.error('❌ MySQL start battle failed:', result);

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
      console.log('✅ Battle started successfully, transitioning to loading screen');
      updateUiState({ currentView: VIEWS.LOADING_BATTLE });
      countdown.start();
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR in handleStartBattle:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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
      setIsDirty(true); // Mark as dirty when title changes
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
      setIsDirty(true); // Mark as dirty when public status changes
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
      setIsDirty(true); // Mark as dirty when timer changes
    }
  };

  const handleSaveQuiz = async () => {
    // Set saving state to disable UI
    setIsSaving(true);

    // Show immediate feedback with question count
    const questionCount = questions.length;
    toast.info(`Saving ${questionCount} question${questionCount !== 1 ? 's' : ''}... Please wait`);

    try {
      const success = await quizAPI.saveQuiz();

      if (success) {
        setIsDirty(false); // Reset dirty state after successful save
        toast.success('Quiz saved successfully!');
        // Small delay to let user see the toast before navigating away
        setTimeout(() => {
          setIsSaving(false);
          handleBackToList();
        }, 500);
      } else {
        setIsSaving(false);
        toast.error('Failed to save quiz. Please try again.');
      }
    } catch (error) {
      setIsSaving(false);
      toast.error('An error occurred while saving. Please try again.');
    }
  };

  // ============================================
  // QUESTION HANDLERS
  // ============================================

  const handleAddQuestion = () => {
    const newQuestion = createNewQuestion('Multiple Choice', questions);
    setQuestions([...questions, newQuestion]);
    setIsDirty(true); // Mark as dirty when question added
  };

  const handleBatchAddQuestions = (questionsToAdd) => {
    // Validate input
    if (!questionsToAdd || !Array.isArray(questionsToAdd) || questionsToAdd.length === 0) {
      console.error('handleBatchAddQuestions: Invalid input', questionsToAdd);
      return;
    }

    // Convert question bank questions to quiz questions format
    const currentQuestions = Array.isArray(questions) ? questions : [];
    const maxOrder = currentQuestions.length > 0 
      ? Math.max(...currentQuestions.map(q => q.question_order || 0))
      : 0;

    const newQuestions = questionsToAdd.map((sourceQ, index) => {
      // Ensure choices is always an array
      let choices = [];
      if (sourceQ.choices) {
        if (Array.isArray(sourceQ.choices)) {
          choices = sourceQ.choices;
        } else if (typeof sourceQ.choices === 'string') {
          try {
            choices = JSON.parse(sourceQ.choices);
          } catch (e) {
            choices = [];
          }
        }
      }

      // Ensure matchingPairs is always an array
      let matchingPairs = [];
      if (sourceQ.matchingPairs || sourceQ.matching_pairs) {
        const pairs = sourceQ.matchingPairs || sourceQ.matching_pairs;
        if (Array.isArray(pairs)) {
          matchingPairs = pairs;
        } else if (typeof pairs === 'string') {
          try {
            matchingPairs = JSON.parse(pairs);
          } catch (e) {
            matchingPairs = [];
          }
        }
      }

      return {
        id: `question-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        type: sourceQ.type,
        question: sourceQ.question,
        question_order: maxOrder + index + 1,
        choices: choices,
        correctAnswer: sourceQ.correct_answer || sourceQ.correctAnswer || '',
        answer: sourceQ.answer || '',
        matchingPairs: matchingPairs,
        points: sourceQ.points || 1,
        difficulty: sourceQ.difficulty || 'medium'
      };
    });

    setQuestions([...currentQuestions, ...newQuestions]);
    setIsDirty(true); // Mark as dirty when questions added
  };

  const handleDeleteQuestion = (questionId) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    setIsDirty(true); // Mark as dirty when question deleted
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
    setIsDirty(true); // Mark as dirty when question duplicated
  };

  const handleReorderQuestions = (reorderedQuestions) => {
    setQuestions(reorderedQuestions);
    setIsDirty(true); // Mark as dirty when questions reordered
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
    setIsDirty(true); // Mark as dirty when question updated
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
    setIsDirty(true); // Mark as dirty when choice updated
  };

  const handleAddChoice = (questionId) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.choices) {
        return { ...q, choices: [...q.choices, ''] };
      }
      return q;
    }));
    setIsDirty(true); // Mark as dirty when choice added
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
    setIsDirty(true); // Mark as dirty when matching pair added
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
    setIsDirty(true); // Mark as dirty when matching pair updated
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
    setIsDirty(true); // Mark as dirty when matching pair removed
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
    console.log('🎯 handleShowLeaderboard CALLED with results:', {
      gamePin: results?.gamePin,
      isHost: results?.isHost,
      playersCount: results?.players?.length,
      hasPlayers: !!results?.players,
      results: results
    });
    updateGameState({ results });
    updateUiState({ showLeaderboard: true });
    console.log('✅ showLeaderboard set to TRUE');
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
    handleBatchAddQuestions,
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