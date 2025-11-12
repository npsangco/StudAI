import Note from './Note.js';
import NoteCategory from './NoteCategory.js';
import UserDailyStat from './UserDailyStat.js';
import Achievement from './Achievement.js';
import UserAchievement from './UserAchievement.js';
import Users from './Users.js'; // make sure this exists in your models folder

export function setupAssociations() {
  // ────────────────────────────────
  // 📝 NOTES & CATEGORIES
  // ────────────────────────────────
  Note.belongsTo(NoteCategory, {
    foreignKey: 'category_id',
    as: 'category'
  });

  // ────────────────────────────────
  // 👤 USER ↔ DAILY STATS
  // ────────────────────────────────
  Users.hasOne(UserDailyStat, {
    foreignKey: 'user_id',
    as: 'dailyStats',
    onDelete: 'CASCADE'
  });

  UserDailyStat.belongsTo(Users, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // ────────────────────────────────
  // 🏆 ACHIEVEMENTS ↔ USER_ACHIEVEMENTS
  // ────────────────────────────────
  Users.hasMany(UserAchievement, {
    foreignKey: 'user_id',
    as: 'userAchievements',
    onDelete: 'CASCADE'
  });

  UserAchievement.belongsTo(Users, {
    foreignKey: 'user_id',
    as: 'user'
  });

  Achievement.hasMany(UserAchievement, {
    foreignKey: 'achievement_id',
    as: 'userAchievements'
  });

  UserAchievement.belongsTo(Achievement, {
    foreignKey: 'achievement_id',
    as: 'achievement'
  });
}
