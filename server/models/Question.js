import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const Question = sequelize.define('Question', {
  question_id: {
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
  type: {
    type: DataTypes.ENUM('Multiple Choice', 'Fill in the blanks', 'True/False', 'Matching'),
    allowNull: false
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  question_order: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  choices: {
    type: DataTypes.JSON,
    allowNull: true
  },
  correct_answer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  matching_pairs: {
    type: DataTypes.JSON,
    allowNull: true
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'questions',
  timestamps: false
});

export default Question;