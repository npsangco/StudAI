import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const NoteCategory = sequelize.define('NoteCategory', {
  category_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6'
  }
}, {
  tableName: 'note_category',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

export default NoteCategory;