import { quizApi } from '../../../api/api';
import { validateAllQuestions } from '../utils/validation';

/**
 * Custom hook for all quiz-related API calls
 * Handles all backend communication and data transformation
 */
export function useQuizAPI(quizDataHook, toast) {
  const {
    setLoading,
    setError,
    updateQuizData,
    updateUiState,
    updateGameState,
    updateDeleteState,
    quizData,
    questions,
    validationErrors,
    setValidationErrors,
    setShowValidationModal,
    deleteState
  } = quizDataHook;

  /**
   * Load all quizzes from API
   */
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
        created: quiz.created_at, // Keep raw timestamp for relative time formatting
        created_at: quiz.created_at, // Also keep as created_at for consistency
        isPublic: quiz.is_public,
        share_code: quiz.share_code,
        shared_by_username: quiz.shared_by_username, // For imported quizzes
        timer_per_question: quiz.timer_per_question ?? 30,
        creator: quiz.creator?.username || 'Unknown',
        // Adaptive mode data
        difficultyDistribution: quiz.difficulty_distribution,
        hasVariedDifficulty: quiz.has_varied_difficulty,
        canUseAdaptive: quiz.can_use_adaptive
      }));

      updateQuizData({ list: formattedQuizzes });
    } catch (err) {
      console.error('Failed to load quizzes:', err);
      setError(err.response?.data?.error || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load a single quiz with its questions
   */
  const loadQuizWithQuestions = async (quizId) => {
    try {
      setLoading(true);
      
      const response = await quizApi.getById(quizId);
      const quizData = response.data;
      
      const formattedQuestions = quizData.questions.map(q => {
        // Parse choices if it's a JSON string
        let choices = q.choices;
        if (typeof choices === 'string') {
          try {
            choices = JSON.parse(choices);
          } catch (e) {
            choices = null;
          }
        }
        
        // Parse matchingPairs if it's a JSON string
        let matchingPairs = q.matchingPairs || q.matching_pairs;
        if (typeof matchingPairs === 'string') {
          try {
            matchingPairs = JSON.parse(matchingPairs);
          } catch (e) {
            matchingPairs = null;
          }
        }
        
        return {
          id: q.question_id || q.questionId,
          type: q.type,
          question: q.question,
          choices: choices,
          correctAnswer: q.correctAnswer || q.correct_answer,
          answer: q.answer,
          matchingPairs: matchingPairs,
          difficulty: q.difficulty || 'medium'
        };
      });

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

  /**
   * Save quiz (create new or update existing)
   */
  const saveQuiz = async () => {
    try {
      // VALIDATE QUESTIONS FIRST
      const validation = validateAllQuestions(questions);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setShowValidationModal(true);
        return false;
      }

      setLoading(true);

      let quizId = quizData.editing.id;
      
      // If it's a temp quiz, create it in DB first
      if (quizData.editing.isTemp) {
        const response = await quizApi.create({
          title: quizData.editing.title,
          description: quizData.editing.description || '',
          is_public: quizData.editing.isPublic,
          timer_per_question: quizData.editing.timer_per_question ?? 30
        });
        quizId = response.data.quiz.quiz_id;
        
      } else {
        // Update existing quiz metadata
        await quizApi.update(quizId, {
          title: quizData.editing.title,
          description: quizData.editing.description || '',
          is_public: quizData.editing.isPublic !== undefined ? quizData.editing.isPublic : false,
          timer_per_question: quizData.editing.timer_per_question ?? 30
        });
        
      }

      // Get existing questions from server (skip if temp quiz)
      let existingQuestionIds = [];
      if (!quizData.editing.isTemp) {
        const currentQuizResponse = await quizApi.getById(quizId);
        existingQuestionIds = currentQuizResponse.data.questions.map(q => q.question_id);
        
        // Delete ALL existing questions first to avoid order conflicts
        for (const existingId of existingQuestionIds) {
          await quizApi.deleteQuestion(quizId, existingId);
        }
      }

      // Now insert all questions in the correct order
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        // Ensure choices and matchingPairs are properly formatted
        let choicesData = question.choices;
        if (typeof choicesData === 'string') {
          try {
            choicesData = JSON.parse(choicesData);
          } catch (e) {
            choicesData = null;
          }
        }
        
        let matchingPairsData = question.matchingPairs;
        if (typeof matchingPairsData === 'string') {
          try {
            matchingPairsData = JSON.parse(matchingPairsData);
          } catch (e) {
            matchingPairsData = null;
          }
        }
        
        const questionData = {
          type: question.type,
          question: question.question,
          question_order: i + 1,
          choices: choicesData || null,
          correct_answer: question.correctAnswer || null,
          answer: question.answer || null,
          matching_pairs: matchingPairsData || null,
          points: 1,
          difficulty: question.difficulty || 'medium'
        };

        // Always add as new question (since we deleted all existing ones)
        await quizApi.addQuestion(quizId, questionData);
      }

      // Reload quizzes
      await loadQuizzesFromAPI();
      
      return true;
    } catch (err) {
      console.error('Failed to save quiz:', err);
      setError(err.response?.data?.error || 'Failed to save quiz');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a quiz
   */
  const deleteQuiz = async () => {
    try {
      setLoading(true);

      const quizTitle = deleteState.quizToDelete.title;
      await quizApi.delete(deleteState.quizToDelete.id);

      // Reload quizzes
      await loadQuizzesFromAPI();

      updateDeleteState({ quizToDelete: null });
      updateUiState({ showDeleteModal: false });

      toast.success(`Quiz "${quizTitle}" deleted successfully`);
      return true;
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setError(err.response?.data?.error || 'Failed to delete quiz');
      toast.error('Failed to delete quiz');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-delete empty quiz when leaving editor
   */
  const autoDeleteEmptyQuiz = async () => {
    if (quizData.editing && questions.length === 0 && !quizData.editing.isTemp) {
      try {
        
        await quizApi.delete(quizData.editing.id);
      } catch (err) {
        console.error('Failed to auto-delete empty quiz:', err);
      }
    }
  };

  /**
   * Create battle room
   */
  const createBattle = async (quizId) => {
    try {
      setLoading(true);
      
      const response = await quizApi.createBattle(quizId);
      const { battle, gamePin } = response.data;

      updateGameState({ 
        gamePin,
        battleId: battle.battle_id,
        isHost: true
      });
      
      return { battle, gamePin };
    } catch (err) {
      console.error('Battle creation error:', err);
      setError(err.response?.data?.error || 'Error creating battle');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start battle - with comprehensive error handling
   */
  const startBattle = async (gamePin) => {
    try {
      setLoading(true);
      
      const response = await quizApi.startBattle(gamePin);
      
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Start battle error:', err);
      
      const errorData = err.response?.data || {};
      const errorCode = errorData.errorCode || 'UNKNOWN_ERROR';
      const errorMessage = errorData.error || 'Failed to start battle';
      
      // Log specific error details for debugging
      console.error('❌ Battle start failed:', {
        errorCode,
        message: errorMessage,
        details: errorData
      });
      
      setError(errorMessage);
      
      return { 
        success: false, 
        errorCode,
        errorMessage,
        shouldCleanup: errorData.shouldCleanup || false,
        details: errorData
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit quiz attempt
   */
  const submitAttempt = async (quizId, results) => {
    try {
      const requestData = {
        score: results.score,
        total_questions: results.totalQuestions,
        time_spent: results.timeSpent,
        answers: results.answers || []
      };

      // Include adaptive journey if available
      if (results.adaptiveJourney) {
        requestData.adaptiveJourney = results.adaptiveJourney;
      }

      const response = await quizApi.submitAttempt(quizId, requestData);

      return response.data;
    } catch (err) {
      console.error('Failed to submit attempt:', err);
      return null;
    }
  };

  return {
    loadQuizzesFromAPI,
    loadQuizWithQuestions,
    saveQuiz,
    deleteQuiz,
    autoDeleteEmptyQuiz,
    createBattle,
    startBattle,
    submitAttempt
  };
}