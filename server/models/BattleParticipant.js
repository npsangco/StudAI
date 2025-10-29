import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const BattleParticipant = sequelize.define('BattleParticipant', {
  participant_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  battle_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'quiz_battles',
      key: 'battle_id'
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
  player_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  player_initial: {
    type: DataTypes.STRING(5),
    defaultValue: 'U'
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  is_ready: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_winner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  exp_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'battle_participants',
  timestamps: false
});

export default BattleParticipant;