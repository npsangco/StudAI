import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Quiz = sequelize.define('Quiz', {
  quiz_id: {
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
    allowNull: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  total_questions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  total_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  average_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quizzes',
  timestamps: false
});

export default Quiz;