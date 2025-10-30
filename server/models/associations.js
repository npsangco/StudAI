import Note from './Note.js';
import NoteCategory from './NoteCategory.js';

// Define all model associations here
export function setupAssociations() {
  Note.belongsTo(NoteCategory, {
    foreignKey: 'category_id',
    as: 'category'
  });
}