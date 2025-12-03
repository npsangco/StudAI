// Imports
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import fs from "fs";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const CLIENT_URL = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';
const PORT = process.env.PORT || 4000;

import express from "express";
import session from "express-session";
import multer from "multer";
import cors from "cors";

import sequelize from "./db.js";
import { setupAssociations } from "./models/associations.js";
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
import Achievement from "./models/Achievement.js";
import UserAchievement from "./models/UserAchievement.js";
import UserDailyStat from "./models/UserDailyStat.js";
import AuditLog from "./models/AuditLog.js";
import AIUsageStat from "./models/AIUsageStat.js";
import JitsiSession from "./models/JitsiSession.js";
import { Op, DataTypes } from "sequelize";
import ChatMessage from "./models/ChatMessage.js";

import { auditMiddleware } from "./middleware/auditMiddleware.js";
import { sessionLockCheck } from "./middleware/sessionLockCheck.js";
import { requireAdmin } from "./middleware/adminAuthMiddleware.js";
import { startEmailReminders } from "./services/emailScheduler.js";
import { VerificationEmail, PasswordUpdateEmail, PasswordResetEmail} from "./services/emailService.js";
import { startBattleCleanup } from "./services/battleCleanupSimple.js";
import { startArchivedNoteCleanup } from "./services/archivedNoteCleanup.js";

let Note;
try {
    const noteModule = await import("./models/Note.js");
    Note = noteModule.default;
} catch (error) {
    console.warn("Note model unavailable");
}

import pptxParser from "node-pptx-parser";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import petRoutes from "./routes/petRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import questionBankRoutes from "./routes/questionBankRoutes.js";
import SharedNote from "./models/SharedNote.js";
import planRoutes from "./routes/planRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import jitsiRoutes from "./routes/jitsiRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js"
import adminRoutes from "./routes/adminRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import {
    DAILY_AI_LIMITS,
    ensureSummaryAvailable,
    recordSummaryUsage,
    ensureChatbotTokensAvailable,
    estimateTokensFromMessages,
    recordChatbotUsage,
    getUsageSnapshot
} from "./services/aiUsageService.js";
import { ensureContentIsSafe, ModerationError } from "./services/moderationService.js";
import { uploadFile, getDownloadUrl } from "./services/r2Service.js";

// Import validation middleware
import {
    validateSignupRequest,
    validateLoginRequest,
    validateProfileUpdate
} from "./middleware/validationMiddleware.js";

const app = express();
app.set('trust proxy', 1);

// Achievements
async function initializeDefaultAchievements() {
  try {
    const existingCount = await Achievement.count();
    
    if (existingCount === 0) {
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
    }
  } catch (error) {}
}

async function ensureNoteArchiveColumns() {
    if (!Note) return;

    const queryInterface = sequelize.getQueryInterface();

    try {
        const definition = await queryInterface.describeTable('note');

        if (!('is_archived' in definition)) {
            await queryInterface.addColumn('note', 'is_archived', {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }

        if (!('archived_at' in definition)) {
            await queryInterface.addColumn('note', 'archived_at', {
                type: DataTypes.DATE,
                allowNull: true
            });
        }
    } catch (err) {}
}

async function ensureChatbotForeignKey() {
    try {
        const dbName = sequelize.config?.database || process.env.DB_NAME;
        if (!dbName) return;

        const [constraints] = await sequelize.query(
            `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = :dbName
               AND TABLE_NAME = 'chatbot'
               AND COLUMN_NAME = 'note_id'
               AND REFERENCED_TABLE_NAME IS NOT NULL`,
            { replacements: { dbName } }
        );

        let hasCorrectConstraint = false;

        for (const constraint of constraints) {
            if (constraint.REFERENCED_TABLE_NAME === 'note') {
                hasCorrectConstraint = true;
                continue;
            }

            await sequelize.getQueryInterface().removeConstraint('chatbot', constraint.CONSTRAINT_NAME);
        }

        if (!hasCorrectConstraint) {
            await sequelize.getQueryInterface().addConstraint('chatbot', {
                fields: ['note_id'],
                type: 'foreign key',
                name: 'fk_chatbot_note_id',
                references: {
                    table: 'note',
                    field: 'note_id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            });
        }
    } catch (err) {
        console.error('Failed to enforce chatbot.note_id foreign key:', err);
    }
}

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://studai.dev', 'https://www.studai.dev', 'https://walrus-app-umg67.ondigitalocean.app']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// security headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://*.firebasedatabase.app; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com; " +
    "connect-src 'self' blob: wss://*.firebasedatabase.app https://*.firebasedatabase.app https://studai.dev https://www.studai.dev https://walrus-app-umg67.ondigitalocean.app; " +
    "font-src 'self' data:; " +
    "worker-src 'self' blob:; " +
    "frame-src https://*.firebasedatabase.app; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'self';"
  );
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/api", auditMiddleware);

// Streak tracking
async function updateUserStreak(userId) {
    try {
        const user = await User.findByPk(userId);
        if (!user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // reset

        const lastActivity = user.last_activity_date
            ? new Date(user.last_activity_date)
            : null;

        if (lastActivity) {
            lastActivity.setHours(0, 0, 0, 0);

            const diffTime = today - lastActivity;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 0) {
                return user.study_streak;
            } else if (diffDays === 1) {
                user.study_streak += 1;
                user.last_activity_date = today;

                if (user.study_streak > user.longest_streak) {
                    user.longest_streak = user.study_streak;
                }

                console.log(`User ${userId}: Streak continued! Now at ${user.study_streak} days`);

                // Check for milestone rewards
                await checkStreakMilestones(userId, user.study_streak);
            } else {
                // Streak broken - reset to 0 (not 1)
                console.log(`User ${userId}: Streak broken after ${user.study_streak} days. Reset to 0 days`);
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
        console.error('Error updating user streak:', err);
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
    }
}

// Database connection
sequelize.authenticate()
    .then(async () => {
        await initializeDefaultAchievements();
        await ensureNoteArchiveColumns();
        await ChatMessage.sync();
        await AIUsageStat.sync();
        await ensureChatbotForeignKey();
        startEmailReminders();
    })
    .catch((err) => {
        console.error("Database error:", err);
        process.exit(1);
    });

// ----------------- Session Configuration -----------------
if (sessionStore) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    app.use(
        session({
            secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "fallback-secret",
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            name: "studai_session",
            cookie: {
                httpOnly: true,
                secure: isProduction, // Only require HTTPS in production
                maxAge: 1000 * 60 * 60 * 24,
                sameSite: isProduction ? 'none' : 'lax', // 'lax' for local dev, 'none' for production
                domain: isProduction ? '.walrus-app-umg67.ondigitalocean.app' : undefined, // No domain restriction in dev
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
    console.warn(' Google OAuth not configured - OAuth login will not be available');
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

        const domain = String(email).split('@')[1]?.toLowerCase();

        let user = await User.findOne({ where: { email } });

        if (!user) {
            if (domain !== 'ust.edu.ph') {
                return done(null, false, { message: 'domain_restricted' });
            }

            // Generate secure random password for OAuth users
            const crypto = await import('crypto');
            const securePassword = crypto.randomBytes(32).toString('hex');

            user = await User.create({
                email,
                username: profile.displayName || email.split('@')[0],
                password: await bcrypt.hash(securePassword, 12),
                role: "Student",
                status: "active",
                profile_picture: "/default-avatar.png"
            });
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

console.log('🔍 Checking PPT conversion methods:');
if (process.env.CLOUDCONVERT_API_KEY) {
    console.log('✅ CloudConvert API enabled');
} else {
    console.log('⚠️ No conversion API configured. Will use direct text extraction (limited accuracy).');
    console.log('   For better results, sign up for CloudConvert: https://cloudconvert.com/');
    console.log('   Add CLOUDCONVERT_API_KEY to your .env file');
}

// ----------------- ROUTE REGISTRATION -----------------
app.use("/api/pet", sessionLockCheck, petRoutes);
app.use("/api/notes", sessionLockCheck, noteRoutes);
app.use("/api/plans", sessionLockCheck, planRoutes);
app.use("/api/quizzes", sessionLockCheck, quizRoutes);
app.use("/api/question-bank", sessionLockCheck, questionBankRoutes);
app.use("/api/sessions", sessionLockCheck, sessionRoutes);
app.use("/api/jitsi", sessionLockCheck, jitsiRoutes);
app.use("/api/achievements", sessionLockCheck, achievementRoutes);
app.use("/api/admin", requireAdmin, auditRoutes);
app.use("/api/admin", requireAdmin, adminRoutes);
app.use("/api/chat", sessionLockCheck, chatRoutes);

// Public stats for landing page
app.get("/api/public/stats", async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalNotes = Note ? await Note.count() : 0;
        const totalQuizzes = Quiz ? await Quiz.count() : 0;

        res.json({
            totalUsers,
            totalNotes,
            totalQuizzes
        });
    } catch (error) {
        console.error("Error fetching public stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

app.get("/api/ai-usage/today", sessionLockCheck, async (req, res) => {
    try {
        const userId = req.session?.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const snapshot = await getUsageSnapshot(userId);
        res.json(snapshot);
    } catch (error) {
        console.error("Failed to fetch AI usage snapshot:", error);
        res.status(500).json({ error: "Failed to fetch AI usage" });
    }
});

// open ai routes
app.post("/api/openai/summarize", sessionLockCheck, async (req, res) => {
    try {
        const { text, systemPrompt } = req.body;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const summaryQuota = await ensureSummaryAvailable(userId);
        if (!summaryQuota.allowed) {
            return res.status(429).json({
                error: "Daily AI summary limit reached",
                limits: DAILY_AI_LIMITS,
                remaining: summaryQuota.remaining
            });
        }

        if (!text) {
            return res.status(400).json({ error: "Text content is required" });
        }

        await ensureContentIsSafe(text, {
            userId,
            feature: 'ai-summary',
            maxChars: 8000,
            blockMessage: 'This content cannot be summarized because it violates our safety policies.'
        });

        const openAiApiKey = process.env.OPENAI_API_KEY;
        console.log('🔑 [Server] OpenAI API Key status:', openAiApiKey ? 'Present ✓' : 'Missing ✗');
        if (!openAiApiKey) {
            console.error('[Server] OpenAI API key not configured in environment variables');
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        const defaultSystemPrompt = `You are a helpful assistant that creates concise, well-structured summaries of educational content. Focus on key concepts, main ideas, and important details.

Format your response with clear structure:
- Use line breaks between paragraphs for readability
- Start new topics on new lines
- Use simple indentation (2-4 spaces) for sub-points
- Keep sentences concise and clear
- Separate major sections with a blank line

Do NOT use Markdown syntax (no *, **, #, etc.). Use plain text with natural line breaks and spacing only.`;

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

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify(APIBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Server] OpenAI API error:", response.status, errorData);
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.status}`,
                details: errorData
            });
        }

        const data = await response.json();
        const summary = data.choices[0]?.message?.content?.trim();

        function stripMarkdown(md) {
            if (!md || typeof md !== 'string') return md;
            let out = md;
            // Remove code blocks
            out = out.replace(/```[\s\S]*?```/g, '');
            out = out.replace(/`([^`]+)`/g, '$1');
            // Convert headers to plain text with line breaks
            out = out.replace(/^#{1,6}\s+(.*)$/gm, '$1\n');
            out = out.replace(/(^.+)\n[-=]{2,}\s*$/gm, '$1\n');
            // Remove bold/italic but keep text
            out = out.replace(/\*\*(.*?)\*\*/g, '$1');
            out = out.replace(/\*(.*?)\*/g, '$1');
            out = out.replace(/__(.*?)__/g, '$1');
            out = out.replace(/_(.*?)_/g, '$1');
            // Convert lists to indented text
            out = out.replace(/^\s*[-*+]\s+(.+)$/gm, '  $1');
            out = out.replace(/^\s*\d+\.\s+(.+)$/gm, '  $1');
            // Remove images/links but keep alt text
            out = out.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');
            out = out.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
            // Normalize line breaks (max 2 consecutive)
            out = out.replace(/\n{3,}/g, '\n\n');
            return out.trim();
        }

        if (!summary) {
            return res.status(500).json({ error: "Failed to generate summary" });
        }
        const cleanedSummary = stripMarkdown(summary);
        const recordResult = await recordSummaryUsage(userId);

        if (!recordResult.allowed) {
            return res.status(429).json({
                error: "Daily AI summary limit reached",
                limits: DAILY_AI_LIMITS,
                remaining: 0
            });
        }

        const snapshot = await getUsageSnapshot(userId);

        res.json({
            summary: cleanedSummary,
            usage: snapshot,
            rawSummary: summary
        });
    } catch (err) {
        if (err instanceof ModerationError) {
            return res.status(err.statusCode).json({
                error: err.message,
                details: err.details
            });
        }
        console.error("Error in AI summarization:", err);
        res.status(500).json({ error: "Failed to generate summary" });
    }
});

// AI Chatbot endpoint
app.post("/api/openai/chat", sessionLockCheck, async (req, res) => {
    try {
        const { messages, noteId, fileId, userMessage } = req.body;
        const userId = req.session?.userId;

        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!messages || !Array.isArray(messages)) {
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

        await ensureContentIsSafe(latestUserMessage, {
            userId,
            feature: 'ai-chat',
            maxChars: 4000,
            blockMessage: 'Your message violates our safety policies and cannot be sent to the AI assistant.'
        });

        const openAiApiKey = process.env.OPENAI_API_KEY;
        if (!openAiApiKey) {
            return res.status(500).json({ error: "OpenAI API key not configured" });
        }

        const approxTokens = estimateTokensFromMessages(messages);
        const tokenQuota = await ensureChatbotTokensAvailable(userId, approxTokens);
        if (!tokenQuota.allowed) {
            return res.status(429).json({
                error: "Chatbot daily token limit reached",
                limits: DAILY_AI_LIMITS,
                remainingTokens: tokenQuota.remaining
            });
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

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openAiApiKey}`
            },
            body: JSON.stringify(APIBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("[Server] OpenAI API error:", response.status, errorData);
            return res.status(response.status).json({ 
                error: `OpenAI API error: ${response.status}`,
                details: errorData
            });
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content?.trim();

        if (!reply) {
            return res.status(500).json({ error: "Failed to generate response" });
        }

        let chatRecord = null;
        try {
            chatRecord = await ChatMessage.create({
                user_id: userId,
                note_id: normalizedNoteId,
                message: latestUserMessage,
                response: reply
            });
        } catch (storeErr) {
            const missingTable = storeErr?.original?.code === 'ER_NO_SUCH_TABLE';
            if (missingTable) {
                try {
                    await ChatMessage.sync();
                    chatRecord = await ChatMessage.create({
                        user_id: userId,
                        note_id: normalizedNoteId,
                        message: latestUserMessage,
                        response: reply
                    });
                } catch (retryErr) {}
            }
        }

        const totalTokens = data.usage?.total_tokens || approxTokens;
        const usageResult = await recordChatbotUsage(userId, totalTokens);

        if (!usageResult.allowed) {
            return res.status(429).json({
                error: "Chatbot daily token limit reached",
                limits: DAILY_AI_LIMITS,
                remainingTokens: 0
            });
        }

        const snapshot = await getUsageSnapshot(userId);

        res.json({
            reply,
            chat: chatRecord,
            remainingTokens: usageResult.remaining,
            limits: DAILY_AI_LIMITS,
            usage: snapshot
        });
    } catch (err) {
        if (err instanceof ModerationError) {
            return res.status(err.statusCode).json({
                error: err.message,
                details: err.details
            });
        }
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

app.get('/auth/google/callback', (req, res, next) => {
    // Use custom callback to handle domain restriction feedback from strategy
    passport.authenticate('google', async (err, user, info) => {
        try {
            if (err) {
                return res.redirect(`${CLIENT_URL}/?error=google_auth_failed`);
            }

            // If strategy provided info about domain restriction, redirect with specific message
            if (info && info.message === 'domain_restricted') {
                return res.redirect(`${CLIENT_URL}/?error=google_domain_restricted`);
            }

            if (!user) {
                return res.redirect(`${CLIENT_URL}/?error=google_auth_failed`);
            }

            // Check if account is locked
            if (user.status === 'locked' || user.status === 'Locked') {
                return res.redirect(`${CLIENT_URL}/?error=account_locked`);
            }

            if (user.status !== 'active' && user.status !== 'Active') {
                return res.redirect(`${CLIENT_URL}/?error=account_inactive`);
            }

            // Attach session info
            req.session.userId = user.user_id;
            req.session.email = user.email;
            req.session.username = user.username;
            req.session.role = user.role;

            // Generate JWT token as fallback
            const token = jwt.sign(
                {
                    userId: user.user_id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                },
                process.env.JWT_SECRET || 'fallback-secret',
                { expiresIn: '7d' }
            );

            // Force session save before redirect
            req.session.save((saveErr) => {
                if (saveErr) {
                    return res.redirect(`${CLIENT_URL}/?token=${token}&authMethod=token`);
                }

                return res.redirect(`${CLIENT_URL}/dashboard?token=${token}`);
            });
        } catch (catchErr) {
            return res.redirect(`${CLIENT_URL}/?error=server_error`);
        }
    })(req, res, next);
});

app.get("/api/ping", (req, res) => {
    res.json({ message: "Server running fine" });
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
            await existingPending.destroy();
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create token for verification
        const token = jwt.sign({ email, username }, process.env.JWT_SECRET, {
            expiresIn: "30m",
        });

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        
        await PendingUser.create({
            email,
            username,
            password: hashedPassword,
            birthday,
            verification_token: token,
            expires_at: expiresAt,
        });

        const verifyLink = `${SERVER_URL}/api/auth/verify-email?token=${token}`;

        // Send email asynchronously for instant response
        transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email",
            html: VerificationEmail(username, verifyLink),
        }).catch(err => console.error('Email send error:', err));

        res.status(201).json({
            message: "Verification email sent. Please verify your email within 5 minutes.",
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});


// delete expired pending users
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
        console.error("Auto-delete expired pending users failed:", err);
    }
}, 1 * 60 * 1000);


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

        const existingUser = await User.findOne({ where: { email: decoded.email } });
        if (existingUser) {
            await pendingUser.destroy();
            return res.redirect(`${CLIENT_URL}/verify-status?type=already`);
        }

        // Create user account
        const newUser = await User.create({
            email: pendingUser.email,
            username: pendingUser.username,
            password: pendingUser.password,
            birthday: pendingUser.birthday,
            status: "active",
        });

        const authToken = jwt.sign(
            {
                userId: newUser.user_id,
                email: newUser.email,
                username: newUser.username,
                role: newUser.role,
            },
            process.env.JWT_SECRET || "fallback-secret",
            { expiresIn: "7d" }
        );

        await pendingUser.destroy();

        res.redirect(`${CLIENT_URL}/verify-status?type=verified&token=${authToken}`);
    } catch (err) {
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
        const user = await User.findOne({ where: { email, status: "active" } });
        
        if (user) {
            return res.json({ verified: true });
        }

        const pending = await PendingUser.findOne({ where: { email } });
        
        if (!pending) {
            return res.json({ verified: false, expired: true });
        }

        return res.json({ verified: false, expired: false });
    } catch (err) {
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

        if (user.status === "locked" || user.status === "Locked") {
            return res.status(403).json({ 
                error: "Your account has been locked by an administrator. Please contact support.",
                locked: true 
            });
        }

        if (user.status === "pending") {
            return res.status(403).json({ 
                error: "Please verify your email before logging in.",
                pending: true 
            });
        }

        if (user.status !== "active" && user.status !== "Active") {
            return res.status(403).json({ 
                error: "Your account is not active. Please contact support.",
                inactive: true 
            });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        req.session.userId = user.user_id;
        req.session.email = user.email;
        req.session.username = user.username;
        req.session.role = user.role;

        const token = jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role,
            },
            process.env.JWT_SECRET || "fallback-secret",
            { expiresIn: "7d" }
        );

        // await updateUserStreak(user.user_id);

        const updatedUser = await User.findByPk(user.user_id);

        res.status(200).json({
            message: "Login successful",
            token, 
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
        res.status(500).json({ error: "Internal server error" });
    }
});


// Logout
app.post("/api/auth/logout", async (req, res) => {
    const userId = req.session?.user?.user_id;

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

            const isProduction = process.env.NODE_ENV === 'production';
            res.clearCookie("studai_session", {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                domain: isProduction ? '.walrus-app-umg67.ondigitalocean.app' : undefined,
                path: '/'
            });
            
            res.json({ message: "Logged out successfully" });
        });
    } else {
        res.json({ message: "No active session" });
    }
});

// profile routes
app.get("/api/user/profile", sessionLockCheck, async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const user = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture", "study_streak", "longest_streak", "last_activity_date", "createdAt"],
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        if (!user.profile_picture) {
            user.profile_picture = "/default-avatar.png";
        } else {
            try {
                const pic = user.profile_picture;
                if (pic && !pic.startsWith('http') && !pic.startsWith('/')) {
                    user.profile_picture = await getDownloadUrl(pic, 24 * 3600);
                }
            } catch (err) {
                console.error('R2 signed URL generation error for profile:', err);
            }
        }

        res.json(user);
    } catch (err) {
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

        await User.update(updates, { where: { user_id: req.session.userId } });

        // Fetch and return updated profile data
        const updatedUser = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture", "study_streak", "longest_streak"]
        });

        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });
    } catch (err) {
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
        
        const [dailyStats, created] = await UserDailyStat.findOrCreate({
            where: { 
                user_id: req.session.userId,
                last_reset_date: today
            },
            defaults: {
                user_id: req.session.userId,
                notes_created_today: 0,
                quizzes_completed_today: 0,
                planner_updates_today: 0,
                points_earned_today: 0,
                exp_earned_today: 0,
                last_reset_date: today
            }
        });

        res.json({
            notes_created_today: dailyStats.notes_created_today || 0,
            quizzes_completed_today: dailyStats.quizzes_completed_today || 0,
            planner_updates_today: dailyStats.planner_updates_today || 0,
            points_earned_today: dailyStats.points_earned_today || 0,
            exp_earned_today: dailyStats.exp_earned_today || 0
        });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});


const profileUpload = multer({ storage: multer.memoryStorage() });

app.post('/api/upload/profile', profileUpload.single('profilePic'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: "No file uploaded" });

        const ext = path.extname(file.originalname);
        const key = `profile_pictures/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        await uploadFile(key, file.buffer, file.mimetype);

        const photoUrl = await getDownloadUrl(key, 24 * 3600);

        res.json({ message: "Profile picture uploaded", photoUrl, r2Key: key });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload profile picture" });
    }
});

// Password update with email verification
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    socketTimeout: 30000,
    connectionTimeout: 30000,
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

        transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Confirm Your Password Update",
            html:PasswordUpdateEmail(confirmLink),
        }).catch(err => console.error('Email send error:', err));

        res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (err) {
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

        const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

                await user.save();

        const resetLink = `${CLIENT_URL}/passwordrecovery?token=${token}`;

        // Send email asynchronously for instant response
        transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset Request",
            html:PasswordResetEmail(resetLink),
        }).catch(err => console.error('Email send error:', err));

        res.json({ message: "Password reset link sent" });
    } catch (err) {
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

// File upload
const uploadsDir = path.join(__dirname, 'uploads');
const profilePicturesDir = path.join(__dirname, 'uploads', 'profile_pictures');

try {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    if (!fs.existsSync(profilePicturesDir)) {
        fs.mkdirSync(profilePicturesDir, { recursive: true });
    }
    
    const testFile = path.join(uploadsDir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
} catch (err) {
    console.error('Failed to setup uploads directory:', err);
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const safeFilename = `${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        cb(null, safeFilename)
    }
});

var upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Multer errors
app.use((err, req, res, next) => {
    const isUploadRoute = req.originalUrl?.startsWith('/api/upload');

    if (err instanceof multer.MulterError && isUploadRoute) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    }

    if (err && isUploadRoute) {
        return res.status(500).json({ error: 'File upload failed' });
    }

    return next(err);
});

app.post('/api/upload', upload.single('myFile'), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "Please upload a file" });
        }

        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const existingFile = await File.findOne({
            where: {
                user_id: userId,
                filename: file.filename
            }
        });

        if (existingFile) {
            return res.status(409).json({ error: "File with this name already exists for this user" });
        }

        // Upload to R2
        const ext = path.extname(file.originalname) || '';
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const key = `uploads/${userId}/${Date.now()}-${safeName}`;

        // If multer used disk storage, read from disk; otherwise use buffer if present
        let bodyStreamOrBuffer;
        if (file.buffer) {
            bodyStreamOrBuffer = file.buffer;
        } else if (file.path) {
            const fs = await import('fs');
            bodyStreamOrBuffer = fs.createReadStream(file.path);
        }

        await uploadFile(key, bodyStreamOrBuffer, file.mimetype || 'application/octet-stream');

        // Remove local file if exists
        if (file.path) {
            try {
                const fs = await import('fs');
                fs.unlinkSync(file.path);
            } catch (e) {
                console.warn('Failed to delete local temp file:', e);
            }
        }

        const newFile = await File.create({
            user_id: userId,
            filename: file.filename,
            file_path: key,
            upload_date: new Date(),
        });

        // Generate signed URL
        let signedUrl = null;
        try {
            signedUrl = await getDownloadUrl(key, 24 * 3600);
        } catch (err) {
            console.warn('Failed to generate signed URL for uploaded file:', err);
        }

        try {
            const { checkAndUnlockAchievements } = await import('./services/achievementServices.js');
            await checkAndUnlockAchievements(userId);
        } catch (err) {
            // Silent fail
        }

        res.json({
            file_id: newFile.file_id,
            filename: file.filename,
            url: signedUrl || null,
            r2Key: key
        });
    } catch (err) {
        res.status(500).json({ error: err.message || "Failed to save file to database" });
    }
});

// PPTX extraction
app.post("/api/extract-pptx", upload.single("file"), async (req, res) => {
    let convertedFilePath = null;
    
    try {
        const filePath = req.file.path;
        const fileExt = filePath.toLowerCase().endsWith('.ppt') ? 'PPT' : 'PPTX';
        console.log(`📊 Processing ${fileExt}:`, filePath);

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
            text = text.replace(/http:\/\/schemas\.[^\s]+/g, '');
            text = text.replace(/urn:schemas-[^\s]+/g, '');
            text = text.replace(/\brId\d+\b/g, '');
            text = text.replace(/\bShape\s+\d+\b/g, '');
            text = text.replace(/\bGoogle\s+Shape;[^\s]+/g, '');
            text = text.replace(/\b(rect|flowChartTerminator|flowChartConnector|straightConnector\d+)\b/g, '');
            text = text.replace(/\b(title|body|ctr|ctrTitle)\b/g, '');
            text = text.replace(/\b(solid|flat|sng|none|noStrike|square|arabicPeriod)\b/g, '');
            text = text.replace(/\b(dk1|lt1|sm)\b/g, '');
            text = text.replace(/\b(Arial|Proxima Nova|Twentieth Century|Corsiva|Times New Roman|Architects Daughter)\b/g, '');
            text = text.replace(/\ben-US\b/g, '');
            text = text.replace(/\b[0-9A-Fa-f]{6}\b/g, '');
            text = text.replace(/\b\d{4,}\b/g, '');
            text = text.replace(/\bl\s+\d+\b/g, '');
            text = text.replace(/\bt\s+\d+\b/g, '');
            text = text.replace(/\b\d+\s+l\b/g, '');
            text = text.replace(/\b\d+\s+t\b/g, '');
            text = text.replace(/\b(Related image|Image result for[^\n]*)\b/gi, '');
            text = text.replace(/\b[\w-]+\.(jpg|jpeg|png|gif|JPG|PNG)\b/g, '');
            text = text.replace(/\b[a-z]\s+\d+\b/gi, '');
            text = text.replace(/\b\d+\s+[a-z]\b/gi, '');
            text = text.replace(/\s+/g, ' ');

            const sentences = text.split(/[•\-–—\n]/);
            const cleanedSentences = sentences
                .map(s => s.trim())
                .filter(s => {
                    if (s.length < 10) return false;
                    const letterCount = (s.match(/[a-zA-Z]/g) || []).length;
                    const digitCount = (s.match(/\d/g) || []).length;
                    if (digitCount > letterCount) return false;
                    const words = s.split(/\s+/).filter(w => w.length > 0);
                    if (words.length < 3) return false;
                    const alphaRatio = letterCount / s.replace(/\s/g, '').length;
                    if (alphaRatio < 0.6) return false;
                    return true;
                });

            return cleanedSentences.join('\n• ');
        }

        function extractTextFromObject(obj) {
            if (typeof obj === 'string') return obj;
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
            wordCount: extractedText.trim().split(/\s+/).filter(w => w.length > 0).length,
            wasConverted: fileExt === 'PPT',
            extractionMethod: fileExt === 'PPT' ? (convertedFilePath ? 'cloudconvert' : 'direct') : 'pptx-parser'
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

        res.status(500).json({ 
            error: "Failed to extract text from PowerPoint file",
            details: err.message
        });
    }
});

// Summary generation
app.post("/api/generate-summary", async (req, res) => {
    try {
        const userId = req.session.userId;
        
        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!Note) {
            return res.status(503).json({ error: "Notes feature not available" });
        }

        const { content, title, restrictions, metadata, file_id, fileId } = req.body;

        if (!content || !title) {
            console.error('[Server] Missing required fields');
            return res.status(400).json({ error: "Missing required fields" });
        }

        let attachedFileId = null;
        const rawFileId = file_id ?? fileId;
        if (rawFileId !== undefined && rawFileId !== null) {
            const parsedFileId = parseInt(rawFileId, 10);
            if (Number.isNaN(parsedFileId)) {
                return res.status(400).json({ error: "file_id must be numeric" });
            }

            const uploadedFile = await File.findOne({
                where: {
                    file_id: parsedFileId,
                    user_id: userId
                }
            });

            if (!uploadedFile) {
                return res.status(404).json({ error: "Uploaded file not found for this user" });
            }

            attachedFileId = parsedFileId;
        }

        const newNote = await Note.create({
            user_id: userId,
            file_id: attachedFileId,
            title: title,
            content: content
        });

        // Award EXP
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
            // Silent fail
        }

        res.json({
            message: "Summary generated successfully",
            note: newNote,
            expEarned: AI_SUMMARY_EXP,
            petLevelUp
        });

    } catch (err) {
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

        const totalAttempts = await QuizAttempt.count({
            where: { user_id: userId }
        });

        const distinctQuizzes = await QuizAttempt.count({
            where: { user_id: userId },
            distinct: true,
            col: 'quiz_id'
        });

        res.json({ 
            totalAttempts,
            distinctQuizzes
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch quiz attempts count' });
    }
});

//admin check
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

//health check
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

// serve frontend
const frontendDistPath = path.join(__dirname, '..', 'dist');
const frontendIndexHtml = path.join(frontendDistPath, 'index.html');

app.use(express.static(frontendDistPath));

app.get(/^\/(?!api|auth|uploads).*$/, (req, res) => {
    res.sendFile(frontendIndexHtml);
});

app.use((err, req, res, next) => {
    const errorDetails = process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
    
    res.status(err.status || 500).json({
        error: errorDetails,
        path: req.path,
        method: req.method
    });
});

// Setup
setupAssociations();

// Start server
app.listen(PORT, () => {
    console.log(`Server running on ${SERVER_URL}`);
    
    try {
        startBattleCleanup();
    } catch (error) {
        console.error('Battle cleanup disabled:', error.message);
    }

    try {
        startArchivedNoteCleanup();
    } catch (error) {
        console.error('Archived note cleanup disabled:', error.message);
    }

    try {
        import('./services/uploadedFileCleanup.js')
            .then(mod => mod.startUploadedFileCleanup())
            .catch(err => console.error('File cleanup disabled:', err.message));
    } catch (error) {
        console.error('File cleanup disabled:', error.message);
    }
});