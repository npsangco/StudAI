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
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium',
    allowNull: false
  },
  is_copy: {
    type: DataTypes.TINYINT,
    defaultValue: 0,
    allowNull: false,
    comment: 'Indicates if question is a copy from question bank (1) or original (0)'
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