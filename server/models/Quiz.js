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
  share_code: {
    type: DataTypes.STRING(6),
    allowNull: true,
    unique: true
  },
  original_quiz_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'quizzes',
      key: 'quiz_id'
    }
  },
  shared_by_username: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  timer_per_question: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    allowNull: true
  },
  total_questions: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true
  },
  total_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: true
  },
  average_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    allowNull: true
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
