import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const UserAchievement = sequelize.define('UserAchievement', {
  user_achievement_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  achievement_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unlocked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_equipped: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user_achievements',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default UserAchievement;