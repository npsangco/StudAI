import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Note = sequelize.define('Note', {
  note_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  file_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'File',
      key: 'file_id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'note_category',
      key: 'category_id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  archived_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'note',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

// Don't define associations here!
export default Note;