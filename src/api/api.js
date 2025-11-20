import axios from 'axios';
import { API_URL } from '../config/api.config';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Pet API
export const petApi = {
  // Get a user's pet
  getPet: () => api.get(`/pet`),

  // Get user profile
  getUserProfile: () => api.get(`/user/profile`),

  // Adopt new pet
  adopt: (data) => api.post('/pet', data),

  // Update pet name
  updateName: (petName) => api.put('/pet/name', { petName }),

  // Perform action (feed/play/clean)
  doAction: (data) => api.post('/pet/action', data),

  // Get inventory
  getInventory: () => api.get('/pet/inventory'),

  // Equip/unequip an item
  toggleEquip: (data) => api.post('/pet/inventory/equip', data),

  // Auto-equip first items
  autoEquip: () => api.post('/pet/inventory/auto-equip'),

  // Use an item manually
  useItem: (data) => api.post('/pet/inventory/use', data),

  // Get shop items (unchanged - public route)
  getShopItems: () => api.get('/pet/shop/items'),

  // Purchase an item
  purchaseItem: (data) => api.post('/pet/shop/purchase', data),
};

// Notes API
export const notesApi = {
  // Get all notes
  getAll: () => api.get('/notes'),
  
  // Create a new note
  create: (noteData) => api.post('/notes/create', noteData),
  
  // Update a note
  update: (id, noteData) => api.put(`/notes/${id}`, noteData),
  
  // Delete a note
  delete: (id) => api.delete(`/notes/${id}`),
  
  // Share a note
  share: (id) => api.post(`/notes/${id}/share`),
  
  // Stop sharing a note
  stopSharing: (id) => api.delete(`/notes/${id}/share`),

  pinNote: (id) => api.post(`/notes/${id}/pin`),

  unpinNote: (id) => api.post(`/notes/${id}/unpin`),

  // Category functions
  getCategories: () => api.get('/notes/categories'),
  createCategory: (categoryData) => api.post('/notes/categories', categoryData),
};

// Shared Notes API
export const sharedNotesApi = {
  // Retrieve a shared note by code
  retrieve: (shareCode) => api.post('/notes/shared/retrieve', { shareCode }),
  
  // Get user's shared notes
  getMyShares: () => api.get('/notes/shared/my-shares'),
};

// Plans API
export const plansApi = {
  // Get all plans
  getAll: () => api.get('/plans'),
  
  // Create a new plan
  create: (planData) => api.post('/plans', planData),
  
  // Update a plan
  update: (id, planData) => api.put(`/plans/${id}`, planData),
  
  // Delete a plan
  delete: (id) => api.delete(`/plans/${id}`),
  
  // Get plans by date range
  getByRange: (startDate, endDate) => 
    api.get(`/plans/range?start_date=${startDate}&end_date=${endDate}`),
  
  // Get plans by specific date
  getByDate: (date) => api.get(`/plans/date/${date}`),
};

// Quiz API
export const quizApi = {
  // Get all quizzes
  getAll: () => api.get('/quizzes'),
  
  // Get single quiz with questions
  getById: (id) => api.get(`/quizzes/${id}`),
  
  // Create new quiz
  create: (quizData) => api.post('/quizzes', quizData),
  
  // Update quiz
  update: (id, quizData) => api.put(`/quizzes/${id}`, quizData),
  
  // Delete quiz
  delete: (id) => api.delete(`/quizzes/${id}`),
  
  // Generate quiz from notes using AI
  generateFromNote: (data) => api.post('/quizzes/generate-from-notes', data),
  
  // Add question to quiz
  addQuestion: (quizId, questionData) => api.post(`/quizzes/${quizId}/questions`, questionData),
  
  // Update question
  updateQuestion: (quizId, questionId, questionData) => 
    api.put(`/quizzes/${quizId}/questions/${questionId}`, questionData),
  
  // Delete question
  deleteQuestion: (quizId, questionId) => 
    api.delete(`/quizzes/${quizId}/questions/${questionId}`),
  
  // Submit quiz attempt
  submitAttempt: (quizId, attemptData) => 
    api.post(`/quizzes/${quizId}/attempt`, attemptData),
  
  // Get user's attempts for a quiz
  getAttempts: (quizId) => api.get(`/quizzes/${quizId}/attempts`),
  
  // Get ALL user's quiz attempts (for dashboard stats)
  getAllAttempts: () => api.get('/quiz-attempts'),
  
  // Get quiz leaderboard
  getLeaderboard: (quizId) => api.get(`/quizzes/${quizId}/leaderboard`),

  // Battle endpoints
  createBattle: (quizId) => api.post(`/quizzes/${quizId}/battle/create`),
  joinBattle: (data) => api.post('/quizzes/battle/join', data),
  getBattle: (gamePin) => api.get(`/quizzes/battle/${gamePin}`),
  markReady: (gamePin) => api.post(`/quizzes/battle/${gamePin}/ready`),
  startBattle: (gamePin) => api.post(`/quizzes/battle/${gamePin}/start`),
  submitBattleScore: (gamePin, data) => api.post(`/quizzes/battle/${gamePin}/submit`, data),
  getBattleResults: (gamePin) => api.get(`/quizzes/battle/${gamePin}/results`),
  endBattle: (gamePin) => api.post(`/quizzes/battle/${gamePin}/end`),
};

// Achievements API
export const achievementsApi = {
  // Get all achievements with user progress
  getAll: () => api.get('/achievements'),
  
  // Get unlocked achievements only
  getUnlocked: () => api.get('/achievements/unlocked'),
  
  // Get locked achievements only
  getLocked: () => api.get('/achievements/locked'),
  
  // Get achievement statistics
  getStats: () => api.get('/achievements/stats'),
  
  // Manually check for new achievements
  check: () => api.post('/achievements/check'),
  
  // Equip an achievement
  equip: (achievementId) => api.post('/achievements/equip', { achievementId }),
  
  // Get user achievements (legacy endpoint - you might want to use getAll instead)
  getUserAchievements: () => api.get('/achievements/user-achievements'),
};

// Chat History API
export const chatApi = {
  getHistory: (noteId) => {
    if (!noteId) {
      throw new Error('noteId is required to fetch chat history');
    }

    return api.get('/chat/history', { params: { noteId } });
  }
};

export const aiUsageApi = {
  getToday: () => api.get('/ai-usage/today')
};

export default api;