import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Achievement = sequelize.define('Achievement', {
  achievement_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  color: {
    type: DataTypes.STRING(7),
    defaultValue: '#3B82F6'
  },
  requirement_type: {
    type: DataTypes.ENUM(
      'points',
      'streak', 
      'notes_created',
      'quizzes_completed',
      'battles_won',
      'files_uploaded',
      'sessions_hosted'
    ),
    allowNull: false
  },
  requirement_value: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  points_reward: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'achievements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default Achievement;