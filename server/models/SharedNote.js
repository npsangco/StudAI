import { DataTypes } from 'sequelize';
import sequelize from '../db.js';
import Note from './Note.js';

const SharedNote = sequelize.define('SharedNote', {
  shared_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  note_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'note',
      key: 'note_id'
    }
  },
  share_code: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'shared_note',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

// Define association
SharedNote.belongsTo(Note, {
  foreignKey: 'note_id',
  as: 'note'
});

export default SharedNote;