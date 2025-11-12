import { quizApi } from '../../../api/api';
import { validateAllQuestions } from '../utils/validation';

/**
 * Custom hook for all quiz-related API calls
 * Handles all backend communication and data transformation
 */
export function useQuizAPI(quizDataHook) {
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
        created: new Date(quiz.created_at).toLocaleDateString(),
        isPublic: quiz.is_public,
        share_code: quiz.share_code, // ✅ Include share_code
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

  /**
   * Load a single quiz with its questions
   */
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
          is_public: quizData.editing.isPublic
        });
        quizId = response.data.quiz.quiz_id;
        console.log('✅ Quiz created with ID:', quizId);
      } else {
        // Update existing quiz metadata
        // ✅ Ensure is_public is explicitly sent (default to false if undefined)
        await quizApi.update(quizId, {
          title: quizData.editing.title,
          description: quizData.editing.description || '',
          is_public: quizData.editing.isPublic !== undefined ? quizData.editing.isPublic : false
        });
        console.log('✅ Quiz updated:', quizId);
      }

      // Get existing questions from server (skip if temp quiz)
      let existingQuestionIds = [];
      if (!quizData.editing.isTemp) {
        const currentQuizResponse = await quizApi.getById(quizId);
        existingQuestionIds = currentQuizResponse.data.questions.map(q => q.question_id);
      }

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
          await quizApi.updateQuestion(quizId, question.id, questionData);
          updatedQuestionIds.push(question.id);
          console.log('✅ Question updated:', question.id);
        } else {
          // Add new question
          const response = await quizApi.addQuestion(quizId, questionData);
          updatedQuestionIds.push(response.data.question.question_id);
          console.log('✅ Question added:', response.data.question.question_id);
        }
      }

      // Delete removed questions (only if not temp quiz)
      if (!quizData.editing.isTemp) {
        for (const existingId of existingQuestionIds) {
          if (!updatedQuestionIds.includes(existingId)) {
            await quizApi.deleteQuestion(quizId, existingId);
            console.log('✅ Question deleted:', existingId);
          }
        }
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
      
      await quizApi.delete(deleteState.quizToDelete.id);
      
      // Reload quizzes
      await loadQuizzesFromAPI();
      
      updateDeleteState({ quizToDelete: null });
      updateUiState({ showDeleteModal: false });
      
      return true;
    } catch (err) {
      console.error('Failed to delete quiz:', err);
      setError(err.response?.data?.error || 'Failed to delete quiz');
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
        console.log('🗑️ Auto-deleting empty quiz:', quizData.editing.id);
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
      
      console.log('✅ Battle created:', gamePin);
      
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
   * Start battle
   */
  const startBattle = async (gamePin) => {
    try {
      setLoading(true);
      
      await quizApi.startBattle(gamePin);
      
      console.log('✅ Battle started by host!');
      return true;
    } catch (err) {
      console.error('Start battle error:', err);
      setError(err.response?.data?.error || 'Failed to start battle');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit quiz attempt
   */
  const submitAttempt = async (quizId, results) => {
    try {
      const response = await quizApi.submitAttempt(quizId, {
        score: results.score,
        total_questions: results.totalQuestions,
        time_spent: results.timeSpent,
        answers: []
      });

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