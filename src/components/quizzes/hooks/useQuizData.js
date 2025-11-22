import { useState } from 'react';
import { VIEWS } from '../utils/constants';

/**
 * Custom hook for managing all quiz-related state
 * Centralizes state management and provides clean update functions
 */
export function useQuizData() {
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mobile/Tablet view state
  const [activeView, setActiveView] = useState('quizzes'); // 'quizzes' | 'battles'

  // Quiz data state
  const [quizData, setQuizData] = useState({
    list: [],
    selected: null,
    editing: null,
    draggedIndex: null
  });

  // Questions state
  const [questions, setQuestions] = useState([]);

  // UI state
  const [uiState, setUiState] = useState({
    currentView: VIEWS.LIST,
    showModal: false,
    showResults: false,
    showLeaderboard: false,
    showDeleteModal: false
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationStatus, setValidationStatus] = useState(null);

  // Dirty state tracking (for unsaved changes)
  const [isDirty, setIsDirty] = useState(false);

  // Game state
  const [gameState, setGameState] = useState({
    results: null,
    quizKey: 0,
    gamePin: '',
    battleId: null,
    isHost: false
  });

  // Delete state
  const [deleteState, setDeleteState] = useState({
    quizToDelete: null
  });

  // Update helpers
  const updateQuizData = (updates) => {
    setQuizData(prev => ({ ...prev, ...updates }));
  };

  const updateUiState = (updates) => {
    setUiState(prev => ({ ...prev, ...updates }));
  };

  const updateGameState = (updates) => {
    setGameState(prev => ({ ...prev, ...updates }));
  };

  const updateDeleteState = (updates) => {
    setDeleteState(prev => ({ ...prev, ...updates }));
  };

  // Reset all state
  const resetAllState = () => {
    updateQuizData({ selected: null, editing: null, draggedIndex: null });
    setQuestions([]);
    updateUiState({
      currentView: VIEWS.LIST,
      showModal: false,
      showResults: false,
      showLeaderboard: false,
      showDeleteModal: false
    });
    updateGameState({ results: null, gamePin: '', battleId: null, isHost: false });
    setValidationErrors([]);
    setShowValidationModal(false);
    setValidationStatus(null);
    setIsDirty(false);
  };

  return {
    // State
    loading,
    error,
    activeView,
    quizData,
    questions,
    uiState,
    validationErrors,
    showValidationModal,
    validationStatus,
    gameState,
    deleteState,
    isDirty,

    // Setters
    setLoading,
    setError,
    setActiveView,
    setQuizData,
    setQuestions,
    setUiState,
    setValidationErrors,
    setShowValidationModal,
    setValidationStatus,
    setGameState,
    setDeleteState,
    setIsDirty,

    // Update helpers
    updateQuizData,
    updateUiState,
    updateGameState,
    updateDeleteState,
    resetAllState
  };
}