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
};

// Shared Notes API
export const sharedNotesApi = {
  // Retrieve a shared note by code
  retrieve: (shareCode) => api.post('/notes/shared/retrieve', { shareCode }),
  
  // Get user's shared notes
  getMyShares: () => api.get('/notes/shared/my-shares'),
};

export default api;