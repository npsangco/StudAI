import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const QuizAttempt = sequelize.define('QuizAttempt', {
  attempt_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  quiz_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quizzes',
      key: 'quiz_id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_questions: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  time_spent: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  answers: {
    type: DataTypes.JSON,
    allowNull: true
  },
  points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  exp_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  completed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quiz_attempts',
  timestamps: false
});

export default QuizAttempt;