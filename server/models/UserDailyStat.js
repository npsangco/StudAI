// models/UserDailyStat.js
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const UserDailyStat = sequelize.define('UserDailyStat', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'user_id'
    }
  },
  notes_created_today: { type: DataTypes.INTEGER, defaultValue: 0 },
  quizzes_completed_today: { type: DataTypes.INTEGER, defaultValue: 0 },
  planner_updates_today: { type: DataTypes.INTEGER, defaultValue: 0 },
  points_earned_today: { type: DataTypes.INTEGER, defaultValue: 0 },
  exp_earned_today: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_reset_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW }
}, {
  tableName: 'user_daily_stats',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default UserDailyStat;
