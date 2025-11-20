import Note from './Note.js';
import NoteCategory from './NoteCategory.js';
import UserDailyStat from './UserDailyStat.js';
import Achievement from './Achievement.js';
import UserAchievement from './UserAchievement.js';
import User from './User.js';
import Session from './Session.js';
import SessionParticipant from './SessionParticipant.js';
import Quiz from './Quiz.js';
import Question from './Question.js';
import QuizAttempt from './QuizAttempt.js';
import QuizBattle from './QuizBattle.js';
import BattleParticipant from './BattleParticipant.js';
import Plan from './Plan.js';
import File from './File.js';
import SharedNote from './SharedNote.js';
import PetCompanion from './PetCompanion.js';
import PetItem from './PetItem.js';
import UserPetItem from './UserPetItem.js';
import ChatMessage from './ChatMessage.js';
import AIUsageStat from './AIUsageStat.js';

export function setupAssociations() {
  // ────────────────────────────────
  // 👤 USER CORE RELATIONSHIPS
  // ────────────────────────────────
  
  // User ↔ Daily Stats (1:1)
  User.hasOne(UserDailyStat, {
    foreignKey: 'user_id',
    as: 'dailyStats',
    onDelete: 'CASCADE'
  });

  UserDailyStat.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // User ↔ Achievements (N:M through UserAchievement)
  User.hasMany(UserAchievement, {
    foreignKey: 'user_id',
    as: 'userAchievements',
    onDelete: 'CASCADE'
  });

  UserAchievement.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  Achievement.hasMany(UserAchievement, {
    foreignKey: 'achievement_id',
    as: 'userAchievements',
    onDelete: 'CASCADE'
  });

  UserAchievement.belongsTo(Achievement, {
    foreignKey: 'achievement_id',
    as: 'achievement'
  });

  // User ↔ Pet Companion (1:1)
  User.hasOne(PetCompanion, {
    foreignKey: 'user_id',
    as: 'petCompanion',
    onDelete: 'CASCADE'
  });

  PetCompanion.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
  });

  // User ↔ Chat Messages (1:N)
  User.hasMany(ChatMessage, {
    foreignKey: 'user_id',
    as: 'chatMessages',
    onDelete: 'CASCADE'
  });

  ChatMessage.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author'
  });

  User.hasMany(AIUsageStat, {
    foreignKey: 'user_id',
    as: 'aiUsageStats',
    onDelete: 'CASCADE'
  });

  AIUsageStat.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
  });

  // ────────────────────────────────
  // 📝 NOTES MODULE
  // ────────────────────────────────
  
  // User ↔ Notes (1:N)
  User.hasMany(Note, {
    foreignKey: 'user_id',
    as: 'notes',
    onDelete: 'CASCADE'
  });

  Note.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author'
  });

  Note.hasMany(ChatMessage, {
    foreignKey: 'note_id',
    as: 'chatHistory',
    onDelete: 'CASCADE'
  });

  ChatMessage.belongsTo(Note, {
    foreignKey: 'note_id',
    as: 'note'
  });

  // Note ↔ Category (N:1)
  Note.belongsTo(NoteCategory, {
    foreignKey: 'category_id',
    as: 'category'
  });

  NoteCategory.hasMany(Note, {
    foreignKey: 'category_id',
    as: 'notes'
  });

  // Note ↔ File (N:1 optional)
  Note.belongsTo(File, {
    foreignKey: 'file_id',
    as: 'attachedFile'
  });

  File.hasMany(Note, {
    foreignKey: 'file_id',
    as: 'notes'
  });

  // User ↔ Files (1:N)
  User.hasMany(File, {
    foreignKey: 'user_id',
    as: 'files',
    onDelete: 'CASCADE'
  });

  File.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'uploader'
  });

  // SharedNote relationships
  User.hasMany(SharedNote, {
    foreignKey: 'user_id',
    as: 'sharedNotes',
    onDelete: 'CASCADE'
  });

  SharedNote.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'sharer'
  });

  SharedNote.belongsTo(Note, {
    foreignKey: 'note_id',
    as: 'note',
    onDelete: 'CASCADE'
  });

  Note.hasMany(SharedNote, {
    foreignKey: 'note_id',
    as: 'shares'
  });

  // ────────────────────────────────
  // 📚 QUIZ MODULE
  // ────────────────────────────────
  
  // User ↔ Quizzes (1:N)
  User.hasMany(Quiz, {
    foreignKey: 'created_by',
    as: 'createdQuizzes',
    onDelete: 'CASCADE'
  });

  Quiz.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  // Quiz ↔ Questions (1:N)
  Quiz.hasMany(Question, {
    foreignKey: 'quiz_id',
    as: 'questions',
    onDelete: 'CASCADE'
  });

  Question.belongsTo(Quiz, {
    foreignKey: 'quiz_id',
    as: 'quiz'
  });

  // Quiz ↔ Quiz Attempts (1:N)
  Quiz.hasMany(QuizAttempt, {
    foreignKey: 'quiz_id',
    as: 'attempts',
    onDelete: 'CASCADE'
  });

  QuizAttempt.belongsTo(Quiz, {
    foreignKey: 'quiz_id',
    as: 'quiz'
  });

  // User ↔ Quiz Attempts (1:N)
  User.hasMany(QuizAttempt, {
    foreignKey: 'user_id',
    as: 'quizAttempts',
    onDelete: 'CASCADE'
  });

  QuizAttempt.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'student'
  });

  // Quiz Self-Reference (Original Quiz tracking)
  Quiz.hasMany(Quiz, {
    foreignKey: 'original_quiz_id',
    as: 'copies',
    onDelete: 'SET NULL'
  });

  Quiz.belongsTo(Quiz, {
    foreignKey: 'original_quiz_id',
    as: 'originalQuiz'
  });

  // ────────────────────────────────
  // ⚔️ QUIZ BATTLE MODULE
  // ────────────────────────────────
  
  // Quiz ↔ Quiz Battles (1:N)
  Quiz.hasMany(QuizBattle, {
    foreignKey: 'quiz_id',
    as: 'battles',
    onDelete: 'CASCADE'
  });

  QuizBattle.belongsTo(Quiz, {
    foreignKey: 'quiz_id',
    as: 'quiz'
  });

  // User ↔ Hosted Battles (1:N)
  User.hasMany(QuizBattle, {
    foreignKey: 'host_id',
    as: 'hostedBattles',
    onDelete: 'CASCADE'
  });

  QuizBattle.belongsTo(User, {
    foreignKey: 'host_id',
    as: 'host'
  });

  // User ↔ Won Battles (1:N)
  User.hasMany(QuizBattle, {
    foreignKey: 'winner_id',
    as: 'wonBattles',
    onDelete: 'SET NULL'
  });

  QuizBattle.belongsTo(User, {
    foreignKey: 'winner_id',
    as: 'winner'
  });

  // QuizBattle ↔ BattleParticipants (1:N)
  QuizBattle.hasMany(BattleParticipant, {
    foreignKey: 'battle_id',
    as: 'participants',
    onDelete: 'CASCADE'
  });

  BattleParticipant.belongsTo(QuizBattle, {
    foreignKey: 'battle_id',
    as: 'battle'
  });

  // User ↔ Battle Participations (1:N)
  User.hasMany(BattleParticipant, {
    foreignKey: 'user_id',
    as: 'battleParticipations',
    onDelete: 'CASCADE'
  });

  BattleParticipant.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'player'
  });

  // ────────────────────────────────
  // 📅 PLANNER MODULE
  // ────────────────────────────────
  
  // User ↔ Plans (1:N)
  User.hasMany(Plan, {
    foreignKey: 'user_id',
    as: 'plans',
    onDelete: 'CASCADE'
  });

  Plan.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
  });

  // ────────────────────────────────
  // 📅 STUDY SESSIONS MODULE
  // ────────────────────────────────
  
  // User ↔ Sessions (1:N)
  User.hasMany(Session, {
    foreignKey: 'user_id',
    as: 'hostedSessions',
    onDelete: 'CASCADE'
  });

  Session.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'host'
  });

  // Session ↔ Participants (1:N)
  Session.hasMany(SessionParticipant, {
    foreignKey: 'session_id',
    as: 'participants',
    onDelete: 'CASCADE'
  });

  SessionParticipant.belongsTo(Session, {
    foreignKey: 'session_id',
    as: 'session'
  });

  // User ↔ Session Participations (1:N)
  User.hasMany(SessionParticipant, {
    foreignKey: 'user_id',
    as: 'sessionParticipations',
    onDelete: 'SET NULL'
  });

  SessionParticipant.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // ────────────────────────────────
  // 🐾 PET INVENTORY MODULE
  // ────────────────────────────────
  
  // User ↔ Pet Items (N:M through UserPetItem)
  User.hasMany(UserPetItem, {
    foreignKey: 'user_id',
    as: 'petInventory',
    onDelete: 'CASCADE'
  });

  UserPetItem.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner'
  });

  PetItem.hasMany(UserPetItem, {
    foreignKey: 'item_id',
    as: 'userInventories',
    onDelete: 'CASCADE'
  });

  UserPetItem.belongsTo(PetItem, {
    foreignKey: 'item_id',
    as: 'item'
  });
}
