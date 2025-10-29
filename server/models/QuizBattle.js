import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const QuizBattle = sequelize.define('QuizBattle', {
  battle_id: {
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
  game_pin: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true
  },
  host_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  status: {
    type: DataTypes.ENUM('waiting', 'in_progress', 'completed'),
    defaultValue: 'waiting'
  },
  max_players: {
    type: DataTypes.INTEGER,
    defaultValue: 8
  },
  current_players: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  winner_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'user_id'
    }
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'quiz_battles',
  timestamps: false
});

export default QuizBattle;