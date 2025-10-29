import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
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

export default api;