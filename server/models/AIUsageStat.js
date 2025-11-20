import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const AIUsageStat = sequelize.define('AIUsageStat', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  summaries_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  quizzes_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  chatbot_tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  chatbot_requests: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'ai_usage_stats',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'date']
    }
  ]
});

export default AIUsageStat;
