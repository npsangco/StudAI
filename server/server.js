// 🌐 Environment variables
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

// DEBUG: Check if Zoom environment variables are loaded
console.log('🔍 Environment Variables Check:');
console.log('📁 Current directory:', __dirname);
console.log('📁 Looking for .env in:', path.join(__dirname, '.env'));
console.log('ZOOM_CLIENT_ID:', process.env.ZOOM_CLIENT_ID ? '✓ Loaded' : '✗ Missing');
console.log('ZOOM_CLIENT_SECRET:', process.env.ZOOM_CLIENT_SECRET ? '✓ Loaded' : '✗ Missing');
console.log('ZOOM_REDIRECT_URL:', process.env.ZOOM_REDIRECT_URL ? '✓ Loaded' : '✗ Missing');

if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    console.error('❌ CRITICAL: Zoom OAuth environment variables are missing!');
    console.error('   Using direct credentials as fallback...');
}

// 🌐 Environment variable constants
const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const PORT = process.env.PORT || 4000;

// Log important URLs for debugging
console.log('🌐 URLs Configuration:');
console.log('   CLIENT_URL:', CLIENT_URL);
console.log('   SERVER_URL:', SERVER_URL);
console.log('   PORT:', PORT);

// 📦 Core modules
import fs from "fs";
import path from "path";

// 🚀 Framework
import express from "express";
import session from "express-session";
import multer from "multer";
import cors from "cors";

// 🗄️ Database + Models
import sequelize from "./db.js";
import User from "./models/User.js";
import PendingUser from "./models/PendingUser.js";
import File from "./models/File.js";
import sessionStore from "./sessionStore.js";
import Plan from "./models/Plan.js";
import Quiz from "./models/Quiz.js";
import Question from "./models/Question.js";
import QuizAttempt from "./models/QuizAttempt.js";
import QuizBattle from "./models/QuizBattle.js";
import BattleParticipant from "./models/BattleParticipant.js";
import Session from "./models/Session.js";
import ZoomToken from "./models/ZoomToken.js";
import Achievement from "./models/Achievement.js"; // ← ADD THIS
import UserAchievement from "./models/UserAchievement.js"; // ← ADD THIS
import UserDailyStat from "./models/UserDailyStat.js";
import AuditLog from "./models/AuditLog.js";
import { Op } from "sequelize";
import ChatMessage from "./models/ChatMessage.js";

// Middleware
import { auditMiddleware } from "./middleware/auditMiddleware.js";
import { sessionLockCheck } from "./middleware/sessionLockCheck.js";
import { requireAdmin } from "./middleware/adminAuthMiddleware.js";

// Emails
import { startEmailReminders } from "./services/emailScheduler.js";
import { VerificationEmail, PasswordUpdateEmail, PasswordResetEmail} from "./services/emailService.js";

// Import Note model after creating it
let Note;
try {
    const noteModule = await import("./models/Note.js");
    Note = noteModule.default;
} catch (error) {
    console.warn("⚠️ Note model not found - notes features will be disabled");
}

// 🖼️ PPTX Parser (for text extraction)
import pptxParser from "node-pptx-parser";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Import routes
import petRoutes from "./routes/petRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import SharedNote from "./models/SharedNote.js";
import planRoutes from "./routes/planRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js"
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

// Import validation middleware
import {
    validateSignupRequest,
    validateLoginRequest,
    validateProfileUpdate
} from "./middleware/validationMiddleware.js";

const app = express();

// Trust proxy - required for Digital Ocean App Platform
app.set('trust proxy', 1);

async function migrateChatHistoryTable() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        const tables = await queryInterface.showAllTables();
        const normalize = (table) => {
            if (typeof table === 'string') return table.toLowerCase();
            if (table && typeof table.tableName === 'string') return table.tableName.toLowerCase();
            return '';
        };

        const hasChatHistory = tables.some((table) => normalize(table) === 'chat_history');
        const hasChatbot = tables.some((table) => normalize(table) === 'chatbot');

        if (!hasChatHistory) {
            if (!hasChatbot) {
                await ChatMessage.sync();
            }
            return;
        }

        if (!hasChatbot) {
            await ChatMessage.sync();
        }

        const [historyRows] = await sequelize.query(
            'SELECT chat_id, user_id, note_id, message, response, timestamp FROM chat_history'
        );
        const [existingRows] = await sequelize.query('SELECT chat_id FROM chatbot');

        const existingIds = new Set(existingRows.map((row) => row.chat_id));
        const rowsToInsert = historyRows.filter((row) => !existingIds.has(row.chat_id));

        if (rowsToInsert.length > 0) {
            await queryInterface.bulkInsert('chatbot', rowsToInsert);
            console.log(`✅ Migrated ${rowsToInsert.length} legacy chat records into chatbot table`);
        } else {
            console.log('ℹ️ No legacy chat_history rows needed migration');
        }

        await queryInterface.dropTable('chat_history');
        console.log('🧹 Dropped legacy chat_history table');
    } catch (err) {
        console.error('❌ Failed to migrate chat_history to chatbot:', err);
    }
}

// ============================================
// ACHIEVEMENT INITIALIZATION
// ============================================

async function initializeDefaultAchievements() {
  try {
    const existingCount = await Achievement.count();
    
    if (existingCount === 0) {
      console.log("🏆 Initializing default achievements...");
      
      const defaultAchievements = [
        {
          title: 'Note Taker',
          description: 'Create 5 notes',
          requirement_type: 'notes_created',
          requirement_value: 5,
          points_reward: 50,
          color: '#3B82F6'
        },
        {
          title: 'Quiz Master',
          description: 'Complete 10 quizzes',
          requirement_type: 'quizzes_completed',
          requirement_value: 10,
          points_reward: 100,
          color: '#8B5CF6'
        },
        {
          title: 'Battle Champion',
          description: 'Win 5 battles',
          requirement_type: 'battles_won',
          requirement_value: 5,
          points_reward: 150,
          color: '#EC4899'
        },
        {
          title: 'Pet Parent',
          description: 'Adopt a pet companion',
          requirement_type: 'pet_adopted',
          requirement_value: 1,
          points_reward: 75,
          color: '#F59E0B'
        },
        {
          title: 'Pet Caretaker',
          description: 'Feed your pet 20 times',
          requirement_type: 'times_fed',
          requirement_value: 20,
          points_reward: 100,
          color: '#F59E0B'
        },
        {
          title: 'Study Streak',
          description: 'Maintain a 7-day study streak',
          requirement_type: 'streak',
          requirement_value: 7,
          points_reward: 200,
          color: '#10B981'
        }
      ];
      
      await Achievement.bulkCreate(defaultAchievements);
      console.log(`✅ Created ${defaultAchievements.length} default achievements`);
    } else {
      console.log(`📊 Found ${existingCount} existing achievements`);
    }
  } catch (error) {
    console.error('Error initializing achievements:', error);
  }
}

// ============================================
// CORS
// ============================================

// ----------- CORS -----------------
app.use(cors({
    origin: ['https://studai.dev'],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ----------------- EXPRESS MIDDLEWARE -----------------
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api", auditMiddleware);

// ============================================
// STREAK TRACKING SYSTEM
// ============================================

async function updateUserStreak(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to midnight for date comparison

        const lastActivity = user.last_activity_date
            ? new Date(user.last_activity_date)
            : null;

        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);

            const diffTime = today - lastActivity;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 0) {
                // Same day - no update needed
                console.log(`User ${userId}: Same day activity, streak unchanged`);
                return user.study_streak;
            } else if (diffDays === 1) {
                // Consecutive day - increment streak
                user.study_streak += 1;
                user.last_activity_date = today;

                // Update longest streak if current is higher
                if (user.study_streak > user.longest_streak) {
                    user.longest_streak = user.study_streak;
                }

                console.log(`✅ User ${userId}: Streak continued! Now at ${user.study_streak} days`);

                // Check for milestone rewards
                await checkStreakMilestones(userId, user.study_streak);
            } else {
                // Streak broken - reset to 0 (not 1)
                console.log(`⚠️ User ${userId}: Streak broken after ${user.study_streak} days. Reset to 0 days`);
                user.study_streak = 0; // CHANGED FROM 1 TO 0
                user.last_activity_date = today;
            }
        } else {
            // First time activity - start at 0 (not 1)
            user.study_streak = 0; // CHANGED FROM 1 TO 0
            user.last_activity_date = today;
            user.longest_streak = 0; // CHANGED FROM 1 TO 0
            console.log(`🎉 User ${userId}: First activity! Streak started at 0`);
        }

        await user.save();
        return user.study_streak;
    } catch (err) {
        console.error('❌ Error updating user streak:', err);
        return null;
    }
}

async function checkStreakMilestones(userId, streak) {
    const milestones = {
        7: { points: 50, message: "7-day streak!" },
        30: { points: 200, message: "30-day streak!" },
        100: { points: 1000, message: "100-day streak!" },
        365: { points: 5000, message: "1-year streak!" }
    };

    if (milestones[streak]) {
        await User.increment('points', {
            by: milestones[streak].points,
            where: { user_id: userId }
        });

        console.log(`🎉 User ${userId} reached ${streak} day streak! Awarded ${milestones[streak].points} points`);
    }
}

// ============================================
// MODEL ASSOCIATIONS
// ============================================

// Add Session associations
Session.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Session, { foreignKey: 'user_id', as: 'sessions' });

Session.belongsTo(User, { foreignKey: 'user_id', as: 'host' });
User.hasMany(Session, { foreignKey: 'user_id', as: 'hostedSessions' });

// Your existing associations
Quiz.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Quiz, { foreignKey: 'created_by', as: 'quizzes' });

Quiz.hasMany(Question, { foreignKey: 'quiz_id', as: 'questions' });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });

QuizAttempt.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(QuizAttempt, { foreignKey: 'user_id', as: 'attempts' });

QuizAttempt.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
Quiz.hasMany(QuizAttempt, { foreignKey: 'quiz_id', as: 'attempts' });

QuizBattle.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });
Quiz.hasMany(QuizBattle, { foreignKey: 'quiz_id', as: 'battles' });

QuizBattle.belongsTo(User, { foreignKey: 'host_id', as: 'host' });
User.hasMany(QuizBattle, { foreignKey: 'host_id', as: 'hosted_battles' });

QuizBattle.belongsTo(User, { foreignKey: 'winner_id', as: 'winner' });
User.hasMany(QuizBattle, { foreignKey: 'winner_id', as: 'won_battles' });

BattleParticipant.belongsTo(QuizBattle, { foreignKey: 'battle_id', as: 'battle' });
QuizBattle.hasMany(BattleParticipant, { foreignKey: 'battle_id', as: 'participants' });

BattleParticipant.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(BattleParticipant, { foreignKey: 'user_id', as: 'battle_participations' });

// Add ZoomToken association
ZoomToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(ZoomToken, { foreignKey: 'user_id', as: 'zoomToken' });

if (Note) {
    const NoteCategory = (await import('./models/NoteCategory.js')).default;

    Note.belongsTo(NoteCategory, {
        foreignKey: 'category_id',
        as: 'category'
    });

    NoteCategory.hasMany(Note, {
        foreignKey: 'category_id',
        as: 'notes'
    });
}

// Achievement associations
Achievement.hasMany(UserAchievement, { 
    foreignKey: 'achievement_id', 
    as: 'userAchievements' 
});

UserAchievement.belongsTo(Achievement, { 
    foreignKey: 'achievement_id', 
    as: 'achievement' 
});

UserAchievement.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
});

User.hasMany(UserAchievement, { 
    foreignKey: 'user_id', 
    as: 'userAchievements' 
});

// ----------------- DB Connection -----------------
sequelize.authenticate()
    .then(async () => {
        console.log("✅ Database connected");
        console.log("✅ Using existing database schema");
        
        // Initialize default achievements if they don't exist
        await initializeDefaultAchievements();
        await ChatMessage.sync();
        console.log("✅ Chatbot table ensured");
        await migrateChatHistoryTable();
        
        startEmailReminders();
        // console.log("📅 Email reminder scheduler started!"); for email testing
    })
    .catch((err) => {
        console.error("❌ Database error:", err);
        process.exit(1);
    });

// ----------------- Session Configuration -----------------
if (sessionStore) {
    app.use(
        session({
            secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "fallback-secret",
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            name: "studai_session",
            cookie: {
                httpOnly: true,
                secure: true,
                maxAge: 1000 * 60 * 60 * 24,
                sameSite: 'none',
                domain: '.walrus-app-umg67.ondigitalocean.app',
            },
            rolling: true,
        })
    );
}

// ----------------- PASSPORT (Google OAuth) -----------------
app.use(passport.initialize());
app.use(passport.session());

console.log('🔍 Google OAuth Configuration Check:');
console.log('   GOOGLE_ID:', process.env.GOOGLE_ID ? '✓ Set' : '✗ Missing');
console.log('   GOOGLE_SECRET:', process.env.GOOGLE_SECRET ? '✓ Set' : '✗ Missing');
console.log('   GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL || 'Not set');

if (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET) {
    console.warn('⚠️  Google OAuth not configured - OAuth login will not be available');
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
    passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails[0].value;
        if (!email) return done(new Error("No email from Google"), null);

        let user = await User.findOne({ where: { email } });

        if (!user) {
            // Generate secure random password for OAuth users
            const crypto = await import('crypto');
            const securePassword = crypto.randomBytes(32).toString('hex');

            user = await User.create({
                email,
                username: profile.displayName || email.split('@')[0],
                password: await bcrypt.hash(securePassword, 12),
                role: "Student",
                status: "active", // OAuth users are pre-verified by Google
                profile_picture: "/uploads/profile_pictures/default-avatar.png" // Use local default
            });
            
            console.log(`✅ New user created via Google OAuth: ${email}`);
        } else {
            // User exists, just update last login
            console.log(`✅ Existing user logged in via Google OAuth: ${email}`);
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
    }));
}

passport.serializeUser((user, done) => {
    done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ----------------- ROUTE REGISTRATION -----------------
app.use("/api/pet", sessionLockCheck, petRoutes);
app.use("/api/notes", sessionLockCheck, noteRoutes);
app.use("/api/plans", sessionLockCheck, planRoutes);
app.use("/api/quizzes", sessionLockCheck, quizRoutes);
app.use("/api/sessions", sessionLockCheck, sessionRoutes);
app.use("/api/achievements", sessionLockCheck, achievementRoutes);
app.use("/api/admin", requireAdmin, auditRoutes);
app.use("/api/admin", requireAdmin, adminRoutes);
app.use("/api/chat", sessionLockCheck, chatRoutes);

// ----------------- OPENAI API ROUTES -----------------
// AI Summarization endpoint
app.post("/api/openai/summarize", sessionLockCheck, async (req, res) => {
    try {
        console.log('🤖 [Server] AI Summarization request received');
        const { text, systemPrompt } = req.body;

        if (!text) {
            console.error('❌ [Server] No text provided in request');
            return res.status(400).json({ error: "Text content is required" });
        }

        const openAiApiKey = process.env.OPENAI_API_KEY;
        console.log('🔑 [Server] OpenAI API Key status:', openAiApiKey ? 'Present ✓' : 'Missing ✗');
        if (!openAiApiKey) {
            console.error('❌ [Server] OpenAI API key not configured in environment variables');
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        const defaultSystemPrompt = "You are a helpful assistant that creates concise, well-structured summaries of educational content. Focus on key concepts, main ideas, and important details.";

        const APIBody = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: systemPrompt || defaultSystemPrompt
                },
                {
                    role: "user",
                    content: text
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1.0,
            frequency_penalty: 0.3,
            presence_penalty: 0.3
        };

        console.log('📡 [Server] Calling OpenAI API...');
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify(APIBody)
        });

        console.log('📡 [Server] OpenAI API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ [Server] OpenAI API error:", response.status, errorData);
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.status}`,
                details: errorData
            });
        }

        const data = await response.json();
        const summary = data.choices[0]?.message?.content?.trim();

        if (!summary) {
            console.error('❌ [Server] No summary generated from OpenAI response');
            return res.status(500).json({ error: "Failed to generate summary" });
        }

        console.log('✅ [Server] Summary generated successfully, length:', summary.length);
        res.json({ summary });
    } catch (err) {
        console.error("Error in AI summarization:", err);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

// AI Chatbot endpoint
app.post("/api/openai/chat", sessionLockCheck, async (req, res) => {
    try {
        console.log('🤖 [Server] AI Chat request received');
        const { messages, noteId, fileId, userMessage } = req.body;

        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!messages || !Array.isArray(messages)) {
            console.error('❌ [Server] Invalid messages format in request');
            return res.status(400).json({ error: "Messages array is required" });
        }

        let normalizedNoteId = null;

        if (noteId !== undefined && noteId !== null) {
            normalizedNoteId = parseInt(noteId, 10);
            if (Number.isNaN(normalizedNoteId)) {
                return res.status(400).json({ error: "noteId must be numeric" });
            }
        }

        if (normalizedNoteId === null && fileId !== undefined && fileId !== null) {
            const parsedFileId = parseInt(fileId, 10);
            if (Number.isNaN(parsedFileId)) {
                return res.status(400).json({ error: "fileId must be numeric" });
            }

            if (!Note) {
                console.error('❌ [Server] Note model unavailable while resolving fileId');
                return res.status(500).json({ error: "Note model unavailable" });
            }

            const relatedNote = await Note.findOne({
                where: {
                    file_id: parsedFileId,
                    user_id: req.session.userId
                }
            });

            if (!relatedNote) {
                return res.status(404).json({ error: "No note found for provided fileId" });
            }

            normalizedNoteId = relatedNote.note_id;
        }

        if (normalizedNoteId === null) {
            console.error('❌ [Server] noteId missing in chat request');
            return res.status(400).json({ error: "noteId is required" });
        }

        const latestUserMessage = typeof userMessage === 'string' && userMessage.trim().length > 0
            ? userMessage.trim()
            : (() => {
                const reversed = [...messages].reverse();
                const found = reversed.find((msg) => msg.role === 'user');
                return found?.content?.trim() || '';
            })();

        if (!latestUserMessage) {
            return res.status(400).json({ error: "userMessage is required" });
        }

        const openAiApiKey = process.env.OPENAI_API_KEY;
        console.log('🔑 [Server] OpenAI API Key status:', openAiApiKey ? 'Present ✓' : 'Missing ✗');
        if (!openAiApiKey) {
            console.error('❌ [Server] OpenAI API key not configured in environment variables');
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        const APIBody = {
            model: "gpt-3.5-turbo",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1.0,
            frequency_penalty: 0.3,
            presence_penalty: 0.3
        };

        console.log('📡 [Server] Calling OpenAI API for chat...');
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify(APIBody)
        });

        console.log('📡 [Server] OpenAI API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("❌ [Server] OpenAI API error:", response.status, errorData);
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.status}`,
                details: errorData
            });
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content?.trim();

        if (!reply) {
            console.error('❌ [Server] No reply generated from OpenAI response');
            return res.status(500).json({ error: "Failed to generate response" });
        }

        let chatRecord = null;
        try {
            chatRecord = await ChatMessage.create({
                user_id: req.session.userId,
                note_id: normalizedNoteId,
                message: latestUserMessage,
                response: reply
            });
            console.log('📝 [Server] Chat interaction stored with ID:', chatRecord.chat_id);
        } catch (storeErr) {
            const missingTable = storeErr?.original?.code === 'ER_NO_SUCH_TABLE';
            if (missingTable) {
                console.warn('⚠️ [Server] chatbot table missing. Attempting to recreate via sync...');
                try {
                    await ChatMessage.sync();
                    chatRecord = await ChatMessage.create({
                        user_id: req.session.userId,
                        note_id: normalizedNoteId,
                        message: latestUserMessage,
                        response: reply
                    });
                    console.log('📝 [Server] Chat interaction stored after table sync. ID:', chatRecord.chat_id);
                } catch (retryErr) {
                    console.error('❌ [Server] Retry storing chat history failed:', retryErr);
                }
            } else {
                console.error('❌ [Server] Failed to store chat history:', storeErr);
            }
        }

        console.log('✅ [Server] Chat response generated successfully, length:', reply.length);
        res.json({ reply, chat: chatRecord });
    } catch (err) {
        console.error("❌ [Server] Error in AI chat:", err);
        res.status(500).json({ error: "Failed to generate response" });
    }
});

// ----------------- AUTH ROUTES -----------------
app.get("/auth/google", (req, res, next) => {
    if (!process.env.GOOGLE_ID || !process.env.GOOGLE_SECRET) {
        return res.status(503).json({ error: "Google OAuth is not configured" });
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: `${CLIENT_URL}/?error=google_auth_failed` }),
    async (req, res) => {
        try {
            const user = req.user;
            
            // Check if account is locked
            if (user.status === "locked" || user.status === "Locked") {
                console.log(`🚫 Locked user attempted Google login: ${user.email}`);
                return res.redirect(`${CLIENT_URL}/?error=account_locked`);
            }

            // Check if account is not active
            if (user.status !== "active" && user.status !== "Active") {
                console.log(`🚫 Inactive user attempted Google login: ${user.email}`);
                return res.redirect(`${CLIENT_URL}/?error=account_inactive`);
            }
            
            if (!req.user) {
                console.error("❌ No user object from passport");
                return res.redirect(`${CLIENT_URL}/?error=auth_failed`);
            }

            req.session.userId = req.user.user_id;
            req.session.email = req.user.email;
            req.session.username = req.user.username;
            req.session.role = req.user.role;

            // Force session save before redirect
            req.session.save((err) => {
                if (err) {
                    console.error("❌ Session save error:", err);
                    return res.redirect(`${CLIENT_URL}/?error=session_failed`);
                }
                
                console.log("✅ Google login session saved:", {
                    userId: req.session.userId,
                    email: req.session.email,
                    username: req.session.username
                });
                
                res.redirect(`${CLIENT_URL}/dashboard`);
            });
        } catch (err) {
            console.error("❌ Google login error:", err);
            res.redirect(`${CLIENT_URL}/?error=server_error`);
        }
    }
);

app.get("/api/ping", (req, res) => {
    res.json({ message: "Server running fine ✅" });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        environment: process.env.NODE_ENV,
        clientUrl: process.env.CLIENT_URL,
        serverUrl: process.env.SERVER_URL,
        googleConfigured: !!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET && process.env.GOOGLE_CALLBACK_URL),
        databaseConnected: sequelize.connectionManager.pool._factory ? true : false,
        timestamp: new Date().toISOString()
    });
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Signup
app.post("/api/auth/signup", validateSignupRequest, async (req, res) => {
    const { email, username, password, birthday } = req.validatedData;

    try {
        // Check if email exists in actual users
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Check if username exists in actual users
        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Check if email is already pending verification
        const existingPending = await PendingUser.findOne({ where: { email } });
        if (existingPending) {
            // Delete old pending entry and create new one
            await existingPending.destroy();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create token for verification
        const token = jwt.sign({ email, username }, process.env.JWT_SECRET, {
            expiresIn: "5m", // 5 minutes to verify
        });

        // Store in pending_users table
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
        
        await PendingUser.create({
            email,
            username,
            password: hashedPassword,
            birthday,
            verification_token: token,
            expires_at: expiresAt,
        });

        const verifyLink = `${SERVER_URL}/api/auth/verify-email?token=${token}`;

        await transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email",
            html: VerificationEmail(username, verifyLink),
        });

        res.status(201).json({
            message: "Verification email sent. Please verify your email within 5 minutes.",
        });
    } catch (err) {
        console.error("Signup error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------- AUTO-DELETE EXPIRED PENDING USERS -----------------
setInterval(async () => {
    try {
        const now = new Date();
        const expiredPendingUsers = await PendingUser.findAll({
            where: {
                expires_at: { [Op.lt]: now }
            }
        });

        if (expiredPendingUsers.length > 0) {
            const ids = expiredPendingUsers.map(u => u.pending_id);
            await PendingUser.destroy({ where: { pending_id: ids } });
            console.log(`🧹 Removed ${ids.length} expired pending user(s)`);
        }
    } catch (err) {
        console.error("❌ Auto-delete expired pending users failed:", err);
    }
}, 1 * 60 * 1000); // Check every minute


app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.redirect(`${CLIENT_URL}/verify-status?type=error`);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find pending user
        const pendingUser = await PendingUser.findOne({ 
            where: { 
                email: decoded.email,
                verification_token: token 
            } 
        });

        if (!pendingUser) {
            return res.redirect(`${CLIENT_URL}/verify-status?type=error`);
        }

        // Check if token expired
        if (new Date() > pendingUser.expires_at) {
            await pendingUser.destroy();
            return res.redirect(`${CLIENT_URL}/verify-status?type=expired`);
        }

        // Check if user already exists (shouldn't happen, but safety check)
        const existingUser = await User.findOne({ where: { email: decoded.email } });
        if (existingUser) {
            await pendingUser.destroy();
            return res.redirect(`${CLIENT_URL}/verify-status?type=already`);
        }

        // Create actual user account
        await User.create({
            email: pendingUser.email,
            username: pendingUser.username,
            password: pendingUser.password,
            birthday: pendingUser.birthday,
            status: "active",
        });

        // Delete pending user
        await pendingUser.destroy();

        res.redirect(`${CLIENT_URL}/verify-status?type=verified`);
    } catch (err) {
        console.error("Verification error:", err.message);
        res.redirect(`${CLIENT_URL}/verify-status?type=error`);
    }
});

// Check verification status (for polling)
app.get("/api/auth/check-verification", async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        // Check if user has been created (verified)
        const user = await User.findOne({ where: { email, status: "active" } });
        
        if (user) {
            return res.json({ verified: true });
        }

        // Check if still pending
        const pending = await PendingUser.findOne({ where: { email } });
        
        if (!pending) {
            // Neither pending nor verified - expired or doesn't exist
            return res.json({ verified: false, expired: true });
        }

        // Still pending
        return res.json({ verified: false, expired: false });
    } catch (err) {
        console.error("Check verification error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Login
app.post("/api/auth/login", validateLoginRequest, async (req, res) => {
    const { email, password } = req.validatedData;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check if account is locked 
        if (user.status === "locked" || user.status === "Locked") {
            return res.status(403).json({ 
                error: "Your account has been locked by an administrator. Please contact support.",
                locked: true 
            });
        }

        // Check if account is verified
        if (user.status === "pending") {
            return res.status(403).json({ 
                error: "Please verify your email before logging in.",
                pending: true 
            });
        }

        // Check if account is active
        if (user.status !== "active" && user.status !== "Active") {
            return res.status(403).json({ 
                error: "Your account is not active. Please contact support.",
                inactive: true 
            });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Set session
        req.session.userId = user.user_id;
        req.session.email = user.email;
        req.session.username = user.username;
        req.session.role = user.role;

        // await updateUserStreak(user.user_id);

        const updatedUser = await User.findByPk(user.user_id);

        res.status(200).json({
            message: "Login successful",
            user: {
                id: updatedUser.user_id,
                email: updatedUser.email,
                username: updatedUser.username,
                role: updatedUser.role,
                points: updatedUser.points,
                profile_picture: updatedUser.profile_picture,
                study_streak: updatedUser.study_streak,
                longest_streak: updatedUser.longest_streak,
            },
        });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// Logout
app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session?.user?.user_id;

    // ⬅️ Inserted: create audit log BEFORE destroying session
    if (userId) {
        await AuditLog.create({
            user_id: userId,
            action: "LOGOUT",
            table_name: "User",
            record_id: userId
        });
    }

    if (req.session) {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ error: "Logout failed" });
            res.clearCookie("studai_session");
            res.json({ message: "Logged out successfully" });
        });
    } else {
        res.json({ message: "No active session" });
    }
});

// ----------------- PROFILE ROUTES -----------------
app.get("/api/user/profile", sessionLockCheck, async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture", "study_streak", "longest_streak", "last_activity_date"],
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.profile_picture) {
            user.profile_picture = "/uploads/profile_pictures/default-avatar.png";
        }

        res.json(user);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.put("/api/user/profile", sessionLockCheck, validateProfileUpdate, async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const { username, password, birthday, profile_picture } = req.validatedData || req.body;
        const updates = {};

        if (username) updates.username = username;
        if (birthday) updates.birthday = birthday;
        if (profile_picture) {
            updates.profile_picture = profile_picture;
            console.log(`📸 Updating profile picture for user ${req.session.userId}: ${profile_picture}`);
        }

        if (password) {
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
                });
            }

            const user = await User.findByPk(req.session.userId);
            const isSame = await bcrypt.compare(password, user.password);
            if (isSame) {
                return res.status(400).json({ error: "PasswordCannotBeOld" });
            }

            updates.password = await bcrypt.hash(password, 10);
        }

        console.log(`🔄 Profile update for user ${req.session.userId}:`, Object.keys(updates));
        await User.update(updates, { where: { user_id: req.session.userId } });

        // Fetch and return updated profile data
        const updatedUser = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture", "study_streak", "longest_streak"]
        });

        console.log(`✅ Profile updated successfully. New profile_picture: ${updatedUser.profile_picture}`);

        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get user streak info
app.get("/api/user/streak", sessionLockCheck, async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ["study_streak", "longest_streak", "last_activity_date"]
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            current_streak: user.study_streak,
            longest_streak: user.longest_streak,
            last_activity: user.last_activity_date
        });
    } catch (err) {
        console.error("Streak fetch error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get user daily stats for quests
app.get("/api/user/daily-stats", async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        
        let dailyStats = await UserDailyStat.findOne({
            where: { 
                user_id: req.session.userId,
                last_reset_date: today
            }
        });

        // Create daily stats if they don't exist for today
        if (!dailyStats) {
            dailyStats = await UserDailyStat.create({
                user_id: req.session.userId,
                notes_created_today: 0,
                quizzes_completed_today: 0,
                planner_updates_today: 0,
                points_earned_today: 0,
                exp_earned_today: 0,
                last_reset_date: today
            });
        }

        res.json({
            notes_created_today: dailyStats.notes_created_today || 0,
            quizzes_completed_today: dailyStats.quizzes_completed_today || 0,
            planner_updates_today: dailyStats.planner_updates_today || 0,
            points_earned_today: dailyStats.points_earned_today || 0,
            exp_earned_today: dailyStats.exp_earned_today || 0
        });
    } catch (err) {
        console.error("Daily stats fetch error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const profileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/profile_pictures');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + file.fieldname + ext);
    }
});

const profileUpload = multer({ storage: profileStorage });

app.post('/api/upload/profile', profileUpload.single('profilePic'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        const photoUrl = `/uploads/profile_pictures/${file.filename}`;
        res.json({ message: "Profile picture uploaded", photoUrl });
    } catch (err) {
        console.error("❌ Profile upload error:", err);
        res.status(500).json({ error: "Failed to upload profile picture" });
    }
});

app.use('/uploads/profile_pictures', express.static('uploads/profile_pictures'));

// ----------------- PASSWORD UPDATE WITH EMAIL VERIFICATION -----------------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

app.post("/api/user/request-password-update", async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "Password required" });

    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        });
    }

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) return res.status(400).json({ error: "Password cannot be the same as the old one" });

        const token = jwt.sign(
            { userId: user.user_id, newPassword: await bcrypt.hash(newPassword, 10) },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );

        const confirmLink = `${SERVER_URL}/api/user/confirm-password-update?token=${token}`;

        await transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Confirm Your Password Update",
            html:PasswordUpdateEmail(confirmLink),
        });

        res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (err) {
        console.error("Password update request error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/user/confirm-password-update", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.redirect(`${CLIENT_URL}/password-link-expired`);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        await User.update(
            { password: decoded.newPassword },
            { where: { user_id: decoded.userId } }
        );

        res.redirect(`${CLIENT_URL}/password-updated`);
    } catch (err) {
        console.error("Password confirm error:", err);
        res.redirect(`${CLIENT_URL}/password-link-expired`);
    }
});





// ----------------- RESET PASSWORD ROUTES -----------------
app.post("/api/auth/reset-request", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: "No user with that email" });

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "10m" });

                await user.save();

        const resetLink = `${CLIENT_URL}/passwordrecovery?token=${token}`;

        await transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset Request",
            html:PasswordResetEmail(resetLink),
        });

        res.json({ message: "Password reset link sent" });
    } catch (err) {
        console.error("Reset request error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password cannot be the same as the old password." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await User.update({ password: hashed }, { where: { user_id: decoded.userId } });

        res.json({ message: "Password reset successful" });
    } catch (err) {
        console.error("Password reset error:", err);
        res.status(400).json({ error: "Invalid or expired token" });
    }
});

//----------------- FILE UPLOAD -----------------
// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const profilePicturesDir = path.join(__dirname, 'uploads', 'profile_pictures');
console.log('📁 [Server] Uploads directory path:', uploadsDir);
console.log('📁 [Server] Profile pictures directory path:', profilePicturesDir);

try {
    // Create main uploads directory
    if (!fs.existsSync(uploadsDir)) {
        console.log('📁 [Server] Creating uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ [Server] Uploads directory created successfully');
    } else {
        console.log('✅ [Server] Uploads directory already exists');
    }
    
    // Create profile_pictures subdirectory
    if (!fs.existsSync(profilePicturesDir)) {
        console.log('📁 [Server] Creating profile_pictures directory...');
        fs.mkdirSync(profilePicturesDir, { recursive: true });
        console.log('✅ [Server] Profile pictures directory created successfully');
    } else {
        console.log('✅ [Server] Profile pictures directory already exists');
    }
    
    // Test write permissions
    const testFile = path.join(uploadsDir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('✅ [Server] Uploads directory is writable');
} catch (err) {
    console.error('❌ [Server] Failed to create/write to uploads directory:', err);
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log('📁 [Server] Multer destination check for:', uploadsDir);
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const safeFilename = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        console.log('📁 [Server] Multer filename:', file.originalname, '→', safeFilename);
        cb(null, safeFilename)
    }
});

var upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        console.log('📁 [Server] Multer file filter, mimetype:', file.mimetype);
        cb(null, true);
    }
});

// Multer error handler
app.use((err, req, res, next) => {
    const isUploadRoute = req.originalUrl?.startsWith('/api/upload');

    if (err instanceof multer.MulterError && isUploadRoute) {
        console.error('❌ [Server] Multer error:', err);
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    if (err && isUploadRoute) {
        console.error('❌ [Server] Unknown upload error:', err);
        return res.status(500).json({ error: 'File upload failed' });
    }

    return next(err);
});

app.post('/api/upload', upload.single('myFile'), async (req, res, next) => {
    try {
        console.log("📤 [Server] Incoming file upload...");

        const file = req.file;
        if (!file) {
            console.log("❌ [Server] No file uploaded");
            return res.status(400).json({ error: "Please upload a file" });
        }

        const userId = req.session.userId;
        console.log("📤 [Server] User ID:", userId);
        
        if (!userId) {
            console.log("❌ [Server] No session / not logged in");
            return res.status(401).json({ error: "Not logged in" });
        }

        console.log("✅ [Server] File received:", file.filename, "Size:", file.size);

        const existingFile = await File.findOne({
            where: {
                user_id: userId,
                filename: file.filename
            }
        });

        if (existingFile) {
            console.log("Duplicate file:", file.filename);
            return res.status(409).json({ error: "File with this name already exists for this user" });
        }

        const newFile = await File.create({
            user_id: userId,
            filename: file.filename,
            file_path: file.path,
            upload_date: new Date(),
        });

        console.log("✅ [Server] File saved to DB with ID:", newFile.file_id);

        // Check for file upload achievements
        try {
            const { checkAndUnlockAchievements } = await import('./services/achievementServices.js');
            const unlockedAchievements = await checkAndUnlockAchievements(userId);
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                console.log(`🏆 [Server] User ${userId} unlocked ${unlockedAchievements.length} achievement(s):`, 
                    unlockedAchievements.map(a => a.title).join(', '));
            }
        } catch (err) {
            console.error('❌ [Server] Achievement check error:', err);
        }

        console.log("✅ [Server] File upload completed successfully");
        res.json({
            file_id: newFile.file_id,
            filename: file.filename,
            url: `/uploads/${file.filename}`
        });
    } catch (err) {
        console.error("❌ [Server] Upload DB error:", err);
        console.error("❌ [Server] Error stack:", err.stack);
        res.status(500).json({ error: err.message || "Failed to save file to database" });
    }
});

// ----------------- PPTX EXTRACTION ENDPOINT -----------------
app.post("/api/extract-pptx", upload.single("file"), async (req, res) => {
    try {
        const filePath = req.file.path;
        console.log("📊 Processing PPTX:", filePath);

        const parser = new pptxParser(filePath);
        const parsedContent = await parser.parse();

        let extractedText = "";
        let slideCount = 0;

        if (parsedContent.slides && Array.isArray(parsedContent.slides)) {
            slideCount = parsedContent.slides.length;

            extractedText = parsedContent.slides
                .map((slide, index) => {
                    const slideNum = slide.id || index + 1;
                    let slideText = "";

                    if (typeof slide.parsed === 'string') {
                        slideText = slide.parsed;
                    } else if (typeof slide.parsed === 'object' && slide.parsed !== null) {
                        slideText = extractTextFromObject(slide.parsed);
                    } else if (slide.text) {
                        slideText = typeof slide.text === 'string' ? slide.text : extractTextFromObject(slide.text);
                    }

                    slideText = cleanPPTXText(slideText);

                    return slideText ? `Slide ${slideNum}:\n${slideText}\n` : '';
                })
                .filter(text => text.length > 0)
                .join("\n");
        }

        function cleanPPTXText(text) {
            if (!text) return '';

            // Remove XML namespaces and schemas
            text = text.replace(/http:\/\/schemas\.[^\s]+/g, '');
            text = text.replace(/urn:schemas-[^\s]+/g, '');

            // Remove common PPTX metadata patterns
            text = text.replace(/\brId\d+\b/g, '');
            text = text.replace(/\bShape\s+\d+\b/g, '');
            text = text.replace(/\bGoogle\s+Shape;[^\s]+/g, '');
            text = text.replace(/\b(rect|flowChartTerminator|flowChartConnector|straightConnector\d+)\b/g, '');
            text = text.replace(/\b(title|body|ctr|ctrTitle)\b/g, '');
            text = text.replace(/\b(solid|flat|sng|none|noStrike|square|arabicPeriod)\b/g, '');
            text = text.replace(/\b(dk1|lt1|sm)\b/g, '');

            // Remove font names
            text = text.replace(/\b(Arial|Proxima Nova|Twentieth Century|Corsiva|Times New Roman|Architects Daughter)\b/g, '');

            // Remove language codes
            text = text.replace(/\ben-US\b/g, '');

            // Remove hex color codes (6 digit)
            text = text.replace(/\b[0-9A-Fa-f]{6}\b/g, '');

            // Remove large numbers (coordinates, dimensions)
            text = text.replace(/\b\d{4,}\b/g, '');

            // Remove small isolated numbers and formatting codes
            text = text.replace(/\bl\s+\d+\b/g, '');
            text = text.replace(/\bt\s+\d+\b/g, '');
            text = text.replace(/\b\d+\s+l\b/g, '');
            text = text.replace(/\b\d+\s+t\b/g, '');

            // Remove image references
            text = text.replace(/\b(Related image|Image result for[^\n]*)\b/gi, '');
            text = text.replace(/\b[\w-]+\.(jpg|jpeg|png|gif|JPG|PNG)\b/g, '');

            // Remove standalone single letters and numbers
            text = text.replace(/\b[a-z]\s+\d+\b/gi, '');
            text = text.replace(/\b\d+\s+[a-z]\b/gi, '');

            // Remove excessive whitespace
            text = text.replace(/\s+/g, ' ');

            // Split by common delimiters
            const sentences = text.split(/[•\-–—\n]/);

            const cleanedSentences = sentences
                .map(s => s.trim())
                .filter(s => {
                    if (s.length < 10) return false;

                    // Must not be mostly numbers
                    const letterCount = (s.match(/[a-zA-Z]/g) || []).length;
                    const digitCount = (s.match(/\d/g) || []).length;
                    if (digitCount > letterCount) return false;

                    // Must have at least 3 words
                    const words = s.split(/\s+/).filter(w => w.length > 0);
                    if (words.length < 3) return false;

                    // Check if it's mostly real words (alphabetic content)
                    const alphaRatio = letterCount / s.replace(/\s/g, '').length;
                    if (alphaRatio < 0.6) return false;

                    return true;
                });

            return cleanedSentences.join('\n• ');
        }

        function extractTextFromObject(obj) {
            if (typeof obj === 'string') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(item => extractTextFromObject(item)).join(' ');
            }

            if (typeof obj === 'object' && obj !== null) {
                if (obj.text) return extractTextFromObject(obj.text);
                if (obj.content) return extractTextFromObject(obj.content);
                if (obj.value) return extractTextFromObject(obj.value);

                return Object.values(obj)
                    .map(value => extractTextFromObject(value))
                    .filter(text => text && text.trim().length > 0)
                    .join(' ');
            }

            return '';
        }

        fs.unlinkSync(filePath);

        console.log(`✅ Extracted ${extractedText.length} characters from ${slideCount} slides`);

        res.json({
            text: extractedText,
            slideCount,
            wordCount: extractedText.trim().split(/\s+/).filter(w => w.length > 0).length
        });
    } catch (err) {
        console.error("❌ PPTX extraction error:", err);

        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error("Failed to clean up file:", e);
            }
        }

        res.status(500).json({ error: "Failed to extract text from PPTX" });
    }
});

// ----------------- SUMMARY GENERATION -----------------
app.post("/api/generate-summary", async (req, res) => {
    try {
        console.log('📝 [Server] Generate summary request received');
        
        const userId = req.session.userId;
        console.log('📝 [Server] User ID:', userId);
        
        if (!userId) {
            console.error('❌ [Server] User not logged in');
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!Note) {
            console.error('❌ [Server] Note model not available');
            return res.status(503).json({ error: "Notes feature not available" });
        }

        const { content, title, restrictions, metadata } = req.body;
        console.log('📝 [Server] Request data:', { title, contentLength: content?.length, restrictions, metadata });

        if (!content || !title) {
            console.error('❌ [Server] Missing required fields');
            return res.status(400).json({ error: "Missing required fields" });
        }

        console.log('📝 [Server] Creating note in database...');
        const newNote = await Note.create({
            user_id: userId,
            file_id: null,
            title: title,
            content: content
        });
        console.log('✅ [Server] Note created successfully, ID:', newNote.note_id);

        // Award 25 EXP for AI-generated summaries (no points, this doesn't count toward daily cap)
        const AI_SUMMARY_EXP = 25;
        let petLevelUp = null;

        try {
            // Load PetCompanion model dynamically (default export)
            const PetCompanionModule = await import('./models/PetCompanion.js');
            const PetCompanion = PetCompanionModule.default;
            
            const pet = await PetCompanion.findOne({ where: { user_id: userId } });
            
            if (pet) {
                const currentExp = pet.experience || 0;
                const currentLevel = pet.level || 1;
                
                // Calculate EXP needed for next level using formula: 100 * 1.08^(level-1)
                function expForLevel(level) {
                    return Math.floor(100 * Math.pow(1.08, level - 1));
                }
                
                let newExp = currentExp + AI_SUMMARY_EXP;
                let newLevel = currentLevel;
                let levelsGained = 0;
                
                // Handle multiple level-ups
                while (newLevel < 50) {
                    const expNeeded = expForLevel(newLevel);
                    if (newExp >= expNeeded) {
                        newExp -= expNeeded;
                        newLevel++;
                        levelsGained++;
                    } else {
                        break;
                    }
                }
                
                // Cap at level 50
                if (newLevel > 50) {
                    newLevel = 50;
                    newExp = 0;
                }
                
                await pet.update({
                    experience: newExp,
                    level: newLevel
                });
                
                if (levelsGained > 0) {
                    petLevelUp = {
                        leveledUp: true,
                        levelsGained,
                        currentLevel: newLevel,
                        expGained: AI_SUMMARY_EXP
                    };
                }
            }
        } catch (petError) {
            console.error('Error awarding pet EXP:', petError);
            // Don't fail the request if pet EXP fails
        }

        console.log('✅ [Server] Summary generation completed successfully');
        res.json({
            message: "Summary generated successfully",
            note: newNote,
            expEarned: AI_SUMMARY_EXP,
            petLevelUp
        });

    } catch (err) {
        console.error("❌ [Server] Summary generation error:", err);
        console.error("❌ [Server] Error stack:", err.stack);
        res.status(500).json({ error: "Failed to generate summary", details: err.message });
    }
});

// Get quiz attempts count
app.get('/api/quiz-attempts/count', async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Count total quiz attempts for this user
        const attemptCount = await QuizAttempt.count({
            where: { user_id: userId }
        });

        console.log(`User ${userId} has ${attemptCount} quiz attempts`);

        res.json({ count: attemptCount });
    } catch (err) {
        console.error('Error fetching quiz attempts count:', err);
        res.status(500).json({ error: 'Failed to fetch quiz attempts count' });
    }
});

// ----------------- ADMIN CHECK ENDPOINT -----------------
app.get("/api/auth/check-admin", sessionLockCheck, async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ 
            isAdmin: false, 
            authenticated: false 
        });
    }

    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "role", "status"]
        });

        if (!user) {
            return res.status(404).json({ 
                isAdmin: false, 
                authenticated: false 
            });
        }

        const isAdmin = user.role === "Admin" || user.role === "admin";
        
        res.json({
            isAdmin,
            authenticated: true,
            role: user.role,
            status: user.status
        });
    } catch (err) {
        console.error("Admin check error:", err);
        res.status(500).json({ 
            error: "Internal server error",
            isAdmin: false 
        });
    }
});

// ----------------- HEALTH CHECK ENDPOINT -----------------
// Health check endpoint for App Platform
app.get('/api/health', async (req, res) => {
    const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: 'OK',
        environment: process.env.NODE_ENV || 'development'
    };

    try {
        // Test database connection
        await sequelize.authenticate();
        health.database = 'connected';
    } catch (error) {
        health.database = 'disconnected';
        health.status = 'ERROR';
        console.error('Health check - Database connection failed:', error);
    }

    const statusCode = health.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(health);
});

// ----------------- SERVE FRONTEND -----------------
// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing - return all non-API requests to React app
app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/auth') && !req.path.startsWith('/uploads')) {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    } else {
        next();
    }
});

// ----------------- GLOBAL ERROR HANDLER -----------------
// This catches any errors that weren't handled by route-specific error handlers
app.use((err, req, res, next) => {
    console.error('❌ [Server] Unhandled error:', err);
    console.error('❌ [Server] Error stack:', err.stack);
    
    // Don't send error details in production
    const errorDetails = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
    
    res.status(err.status || 500).json({
        error: errorDetails,
        path: req.path,
        method: req.method
    });
});

// ----------------- START SERVER -----------------
app.listen(PORT, () => console.log(`🚀 Server running on ${SERVER_URL}`));