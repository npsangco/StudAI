// 🌐 Environment variables
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

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

// 📦 Core modules
import fs from "fs";
import path from "path";
import unzipper from 'unzipper';

// 🚀 Framework
import express from "express";
import session from "express-session";
import multer from "multer";
import cors from "cors";

// 🗄️ Database + Models
import sequelize from "./db.js";
import User from "./models/User.js";
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
import { Op } from "sequelize";
import { auditMiddleware } from "./auditMiddleware.js";

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
import { parseString } from 'xml2js';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

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

const app = express();

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
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
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
    .then(() => {
        console.log("✅ Database connected");
        return Promise.all([
            User.sync({ force: false }),
            File.sync({ force: false }),
            Note ? Note.sync({ force: false }) : Promise.resolve(),
            SharedNote.sync({ force: false }),
            Plan.sync({ force: false }),
            Quiz.sync({ force: false }),
            Question.sync({ force: false }),
            QuizAttempt.sync({ force: false }),
            QuizBattle.sync({ force: false }),
            BattleParticipant.sync({ force: false }),
            Session.sync({ force: false }),
            ZoomToken.sync({ force: false }), // ← ADDED TO SYNC
            Achievement.sync({ force: false }), // ← ADD THIS
            UserAchievement.sync({ force: false }), // ← ADD THIS
            UserDailyStat.sync({ force: false }) // ← ADD THIS
        ]);
    })
    .then(async () => {
        console.log("✅ All models synced");
        
        // Initialize default achievements if they don't exist
        await initializeDefaultAchievements();
        
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
            secret: process.env.JWT_SECRET || "fallback-secret",
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            name: "studai_session",
            cookie: {
                httpOnly: true,
                secure: false,
                maxAge: 1000 * 60 * 60 * 24,
                sameSite: "lax",
            },
            rolling: true,
        })
    );
}

// ----------------- PASSPORT (Google OAuth) -----------------
app.use(passport.initialize());
app.use(passport.session());

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
            const dummyPass = Math.random().toString(36).slice(-8);

            user = await User.create({
                email,
                username: profile.displayName || email,
                password: await bcrypt.hash(dummyPass, 10),
                role: "Student",
                status: "active",
                profile_picture: profile.photos && profile.photos.length > 0
                    ? profile.photos[0].value
                    : "/uploads/profile_pictures/default-avatar.png"
            });
        } else {
            if ((!user.profile_picture || user.profile_picture.includes("default-avatar")) &&
                profile.photos && profile.photos.length > 0) {
                user.profile_picture = profile.photos[0].value;
                await user.save();
            }
        }

        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

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
app.use("/api/pet", petRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", auditRoutes);
app.use("/api/achievements", achievementRoutes);

// ----------------- AUTH ROUTES -----------------
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "https://walrus-app-umg67.ondigitalocean.app/login" }),
    async (req, res) => {
        try {
            req.session.userId = req.user.user_id;
            req.session.email = req.user.email;
            req.session.username = req.user.username;
            req.session.role = req.user.role;

            // await updateUserStreak(req.user.user_id);

            console.log("✅ Google login session set:", req.session);
            res.redirect("https://walrus-app-umg67.ondigitalocean.app/dashboard");
        } catch (err) {
            console.error("Google login session error:", err);
            res.redirect("https://walrus-app-umg67.ondigitalocean.app/login");
        }
    }
);

app.get("/api/ping", (req, res) => {
    res.json({ message: "Server running fine ✅" });
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Signup
app.post("/api/auth/signup", async (req, res) => {
    const { email, username, password, birthday } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format." });
    }

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error:
                "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        });
    }

    try {
        if (await User.findOne({ where: { email } }))
            return res.status(400).json({ error: "Email already exists" });
        if (await User.findOne({ where: { username } }))
            return res.status(400).json({ error: "Username already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            email,
            username,
            password: hashedPassword,
            birthday,
            status: "pending",
        });

        const token = jwt.sign({ userId: newUser.user_id }, process.env.JWT_SECRET, {
            expiresIn: "30m",
        });

        const verifyLink = `http://localhost:4000/api/auth/verify-email?token=${token}`;

        await transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Verify Your Email",
            html:VerificationEmail(username, verifyLink),
        });

        res.status(201).json({
            message:
                "Signup successful. Please check your email to verify your account.",
        });
    } catch (err) {
        console.error("Signup error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});


// ----------------- AUTO-DELETE UNVERIFIED USERS AFTER 30 MIN -----------------
setInterval(async () => {
    try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const unverifiedUsers = await User.findAll({
            where: {
                status: "pending",
                createdAt: { [Op.lt]: thirtyMinutesAgo }
            }
        });

        if (unverifiedUsers.length > 0) {
            const ids = unverifiedUsers.map(u => u.user_id);
            await User.destroy({ where: { user_id: ids } });
            console.log(`🧹 Removed ${ids.length} unverified user(s):`, ids);
        }
    } catch (err) {
        console.error("❌ Auto-delete unverified users failed:", err);
    }
}, 5 * 60 * 1000);


app.get("/api/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.redirect("http://localhost:5173/verify-status?type=error");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);

        if (!user) return res.redirect("http://localhost:5173/verify-status?type=error");

        if (user.status === "active") {
            return res.redirect("http://localhost:5173/verify-status?type=already");
        }

        user.status = "active";
        await user.save();

        res.redirect("http://localhost:5173/verify-status?type=verified");
    } catch (err) {
        console.error("Verification error:", err.message);
        res.redirect("http://localhost:5173/verify-status?type=error");
    }
});


// Login
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        // Block unverified accounts
        if (user.status !== "active") {
            return res.status(403).json({ error: "Please verify your email before logging in." });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

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
app.post("/api/auth/logout", (req, res) => {
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
app.get("/api/user/profile", async (req, res) => {
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

app.put("/api/user/profile", async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const { username, password, birthday, profile_picture } = req.body;
        const updates = { username, birthday, profile_picture };

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
        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get user streak info
app.get("/api/user/streak", async (req, res) => {
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

        const confirmLink = `http://localhost:4000/api/user/confirm-password-update?token=${token}`;

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
    if (!token) return res.redirect("http://localhost:5173/password-link-expired");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        await User.update(
            { password: decoded.newPassword },
            { where: { user_id: decoded.userId } }
        );

        res.redirect("http://localhost:5173/password-updated");
    } catch (err) {
        console.error("Password confirm error:", err);
        res.redirect("http://localhost:5173/password-link-expired");
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

        const resetLink = `http://localhost:5173/passwordrecovery?token=${token}`;

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
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
});

var upload = multer({ storage: storage })

app.post('/api/upload', upload.single('myFile'), async (req, res, next) => {
    try {
        console.log("Incoming file upload...");

        const file = req.file;
        if (!file) {
            console.log("❌ No file uploaded");
            return res.status(400).json({ error: "Please upload a file" });
        }

        const userId = req.session.userId;
        if (!userId) {
            console.log("❌ No session / not logged in");
            return res.status(401).json({ error: "Not logged in" });
        }

        console.log("✅ File received:", file);

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

        console.log("✅ File saved to DB:", newFile.file_id);

        // Check for file upload achievements
        try {
            const { checkAndUnlockAchievements } = await import('./services/achievementServices.js');
            const unlockedAchievements = await checkAndUnlockAchievements(userId);
            if (unlockedAchievements && unlockedAchievements.length > 0) {
                console.log(`🏆 User ${userId} unlocked ${unlockedAchievements.length} achievement(s):`, 
                    unlockedAchievements.map(a => a.title).join(', '));
            }
        } catch (err) {
            console.error('Achievement check error:', err);
        }

        res.json({
            file_id: newFile.file_id,
            filename: file.filename,
            url: `/uploads/${file.filename}`
        });
    } catch (err) {
        console.error("❌ Upload DB error:", err);
        res.status(500).json({ error: err.message || "Failed to save file to database" });
    }
});

// ----------------- PPTX EXTRACTION ENDPOINT -----------------
app.post("/api/extract-pptx", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            console.error("❌ No file uploaded");
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        console.log("📊 Processing PPTX:", filePath);

        try {
            const extractedText = await extractTextFromPPTX(filePath);
            console.log(`✅ Successfully extracted text from PPTX`);

            const wordCount = extractedText.trim().split(/\s+/).filter(w => w.length > 0).length;
            console.log(`✅ Extracted ${extractedText.length} characters, ${wordCount} words from PPTX`);

            res.json({
                text: extractedText,
                wordCount
            });

            // Delete file AFTER successful response
            setImmediate(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🧹 Deleted PPTX file: ${filePath}`);
                    }
                } catch (e) {
                    console.error("Warning: Failed to delete PPTX file:", e.message);
                }
            });
        } catch (extractErr) {
            console.error("❌ Text extraction failed:", extractErr.message);

            res.status(400).json({ 
                error: "Failed to extract text from PPTX",
                details: extractErr.message 
            });

            // Delete file even on error
            setImmediate(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    console.error("Warning: Failed to delete PPTX file:", e.message);
                }
            });
        }
    } catch (err) {
        console.error("❌ PPTX extraction endpoint error:", err);

        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error("Failed to clean up file:", e);
            }
        }

        res.status(500).json({ 
            error: "Failed to extract text from PPTX",
            details: err.message 
        });
    }
});

// ----------------- PDF EXTRACTION ENDPOINT -----------------
app.post("/api/extract-pdf", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            console.error("❌ No file uploaded");
            return res.status(400).json({ error: "No file uploaded" });
        }

        const filePath = req.file.path;
        console.log("📄 Processing PDF:", filePath);
        console.log(`📋 File details:`, {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: filePath,
            exists: fs.existsSync(filePath)
        });

        try {
            const extractedText = await extractTextFromPDF(filePath);
            console.log(`✅ Successfully extracted text from PDF`);

            const wordCount = extractedText.trim().split(/\s+/).filter(w => w.length > 0).length;
            console.log(`✅ Extracted ${extractedText.length} characters, ${wordCount} words from PDF`);

            res.json({
                text: extractedText,
                wordCount
            });

            // Delete file AFTER successful response
            setImmediate(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`🧹 Deleted PDF file: ${filePath}`);
                    }
                } catch (e) {
                    console.error("Warning: Failed to delete PDF file:", e.message);
                }
            });
        } catch (extractErr) {
            console.error("❌ Text extraction failed:", extractErr.message);

            res.status(400).json({ 
                error: "Failed to extract text from PDF",
                details: extractErr.message 
            });

            // Delete file even on error
            setImmediate(() => {
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    console.error("Warning: Failed to delete PDF file:", e.message);
                }
            });
        }
    } catch (err) {
        console.error("❌ PDF extraction endpoint error:", err);

        res.status(500).json({ 
            error: "Failed to extract text from PDF",
            details: err.message 
        });
    }
});

async function extractTextFromPPTX(filePath) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(filePath)) {
                reject(new Error(`File not found: ${filePath}`));
                return;
            }

            const extractedSlides = [];
            const imageFiles = []; // Track images for OCR fallback
            let hasError = false;
            let pendingParsers = 0;
            const tempDir = path.join(path.dirname(filePath), `pptx_temp_${Date.now()}`);

            const stream = fs.createReadStream(filePath);
            
            stream.on('error', (err) => {
                console.error('Stream error:', err);
                hasError = true;
                reject(err);
            });

            const unzipStream = stream.pipe(unzipper.Parse());

            unzipStream.on('entry', (entry) => {
                const fileName = entry.path;
                
                if (hasError) {
                    entry.autodrain();
                    return;
                }

                // Extract text from slide XML files
                if (fileName.match(/ppt\/slides\/slide\d+\.xml$/)) {
                    pendingParsers++;
                    let xmlContent = '';
                    
                    entry.on('data', (chunk) => {
                        try {
                            xmlContent += chunk.toString('utf8');
                        } catch (e) {
                            console.error('Error reading chunk:', e);
                        }
                    });
                    
                    entry.on('error', (err) => {
                        console.error('Entry error:', err);
                        pendingParsers--;
                        entry.autodrain();
                    });
                    
                    entry.on('end', () => {
                        try {
                            if (xmlContent.trim()) {
                                // Save first slide XML for debugging
                                if (fileName === 'ppt/slides/slide1.xml' && !fs.existsSync('./slide1_debug.xml')) {
                                    fs.writeFileSync('./slide1_debug.xml', xmlContent);
                                    console.log('💾 Saved slide1.xml for debugging');
                                }

                                parseString(xmlContent, { strict: false, mergeAttrs: true }, (err, result) => {
                                    try {
                                        if (err) {
                                            console.warn(`Warning: Failed to parse ${fileName}:`, err.message);
                                            pendingParsers--;
                                            return;
                                        }

                                        console.log(`📄 Parsing ${fileName}...`);
                                        
                                        const slideText = extractTextFromSlideXML(result);
                                        
                                        if (slideText && slideText.trim().length > 0) {
                                            console.log(`   ✓ Found text: "${slideText.substring(0, 100).replace(/\n/g, ' ')}..."`);
                                            extractedSlides.push(slideText);
                                        } else {
                                            console.log(`   ⚠️ No text found in this slide - will try OCR on images`);
                                        }
                                    } catch (extractErr) {
                                        console.warn(`Warning: Failed to extract text from ${fileName}:`, extractErr.message);
                                    } finally {
                                        pendingParsers--;
                                        if (pendingParsers === 0) {
                                            console.log(`📊 All slides parsed. Total with text: ${extractedSlides.length}`);
                                        }
                                    }
                                });
                            } else {
                                pendingParsers--;
                            }
                        } catch (e) {
                            console.warn('Warning: Error processing entry:', e.message);
                            pendingParsers--;
                        }
                    });
                } 
                // Collect images for OCR if needed
                else if (fileName.match(/ppt\/media\/image\d+\.(png|jpg|jpeg|gif)$/i)) {
                    pendingParsers++;
                    
                    // Ensure temp directory exists
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    const imagePath = path.join(tempDir, path.basename(fileName));
                    const writeStream = fs.createWriteStream(imagePath);
                    
                    entry.pipe(writeStream);
                    writeStream.on('finish', () => {
                        imageFiles.push(imagePath);
                        console.log(`📸 Extracted image: ${imagePath}`);
                        pendingParsers--;
                    });
                    writeStream.on('error', (err) => {
                        console.error(`Error writing image ${fileName}:`, err);
                        pendingParsers--;
                    });
                } else {
                    entry.autodrain();
                }
            });

            unzipStream.on('error', (err) => {
                console.error('Unzip stream error:', err);
                hasError = true;
                reject(err);
            });

            unzipStream.on('close', () => {
                // Wait for pending operations
                const checkCompletion = () => {
                    if (pendingParsers === 0) {
                        handleExtractionComplete();
                    } else {
                        setTimeout(checkCompletion, 50);
                    }
                };

                const handleExtractionComplete = async () => {
                    try {
                        if (hasError) return;

                        const textResult = extractedSlides.join('\n\n').trim();
                        console.log(`✅ Text extraction complete: ${textResult.length} characters`);
                        
                        if (textResult.length > 0) {
                            // Clean up temp files
                            cleanupTempDir(tempDir);
                            resolve(textResult);
                        } else if (imageFiles.length > 0) {
                            // Try OCR on images
                            console.log(`🔍 No text found - attempting OCR on ${imageFiles.length} images...`);
                            try {
                                const ocrText = await performOCROnImages(imageFiles);
                                cleanupTempDir(tempDir);
                                resolve(ocrText || 'No readable text found in presentation');
                            } catch (ocrErr) {
                                console.error('❌ OCR failed:', ocrErr.message);
                                cleanupTempDir(tempDir);
                                resolve('No readable text found in presentation');
                            }
                        } else {
                            console.warn('⚠️ No text or images found');
                            cleanupTempDir(tempDir);
                            resolve('No readable text found in presentation');
                        }
                    } catch (err) {
                        console.error('Error in handleExtractionComplete:', err);
                        cleanupTempDir(tempDir);
                        reject(err);
                    }
                };

                checkCompletion();
            });

        } catch (err) {
            console.error('Error in extractTextFromPPTX:', err);
            reject(err);
        }
    });
}

async function performOCROnImages(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) {
        return '';
    }

    try {
        const ocrResults = [];

        for (const imagePath of imagePaths) {
            try {
                console.log(`🔍 Preprocessing image: ${imagePath}`);
                
                // Preprocess image: increase contrast, brightness, and upscale
                const processedImagePath = imagePath.replace(/\.([^.]+)$/, '_processed.$1');
                
                await sharp(imagePath)
                    .normalize()  // Normalize histogram
                    .modulate({ brightness: 1.2, contrast: 1.6, saturation: 1.2 })  // Enhance contrast, brightness, and saturation
                    .sharpen({ sigma: 2.5 })  // More aggressive sharpening
                    .median(2)  // Reduce noise
                    .resize(2400, 1800, {  // Upscale to 2x for better OCR
                        fit: 'contain',
                        withoutEnlargement: false
                    })
                    .toFile(processedImagePath);
                
                console.log(`   ✓ Preprocessed: ${processedImagePath}`);
                console.log(`🔍 Running OCR on: ${processedImagePath}`);
                
                const { data: { text, confidence } } = await Tesseract.recognize(
                    processedImagePath,
                    'eng',
                    {
                        logger: m => {
                            if (m.status === 'recognizing') {
                                console.log(`   Tesseract: ${m.status} ${Math.round(m.progress * 100)}%`);
                            }
                        }
                    }
                );

                if (text && text.trim()) {
                    console.log(`   ✓ OCR found (${Math.round(confidence * 100)}% confidence): "${text.substring(0, 100).replace(/\n/g, ' ')}..."`);
                    ocrResults.push(text);
                } else {
                    console.log(`   ⚠️ OCR found no text in this image`);
                }
                
                // Clean up processed image
                try {
                    fs.unlinkSync(processedImagePath);
                } catch (e) {
                    console.warn(`   Warning: Could not delete processed image: ${e.message}`);
                }
            } catch (err) {
                console.warn(`   ⚠️ OCR failed for ${imagePath}:`, err.message);
            }
        }

        return ocrResults.join('\n\n').trim();
    } catch (err) {
        console.error('Error in performOCROnImages:', err);
        throw err;
    }
}

function cleanupTempDir(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`🧹 Cleaned up temp directory: ${dirPath}`);
        }
    } catch (err) {
        console.warn(`Warning: Failed to cleanup temp directory: ${err.message}`);
    }
}

function extractTextFromSlideXML(xmlObj) {
    try {
        const textElements = [];

        // Navigate through the slide structure - handle both p:sld and variations
        const slide = xmlObj['p:sld'] || xmlObj['p:cSld'] || xmlObj;
        
        if (!slide) {
            console.warn('No slide element found');
            return '';
        }

        // Get the shape tree which contains all shapes on the slide
        let spTree = null;
        if (slide['p:cSld'] && Array.isArray(slide['p:cSld'])) {
            spTree = slide['p:cSld'][0]['p:spTree'];
        } else if (slide['p:spTree']) {
            spTree = slide['p:spTree'];
        }

        if (!spTree) {
            console.warn('No shape tree found in slide');
            return '';
        }

        const spTreeArray = Array.isArray(spTree) ? spTree : [spTree];

        // Extract from all shape elements
        spTreeArray.forEach(tree => {
            // Regular shapes
            if (tree['p:sp'] && Array.isArray(tree['p:sp'])) {
                tree['p:sp'].forEach(sp => {
                    const text = extractTextFromShape(sp);
                    if (text && text.trim()) {
                        textElements.push(text);
                    }
                });
            }

            // Graphic frames (for charts, etc)
            if (tree['p:graphicFrame'] && Array.isArray(tree['p:graphicFrame'])) {
                tree['p:graphicFrame'].forEach(frame => {
                    const text = extractTextFromShape(frame);
                    if (text && text.trim()) {
                        textElements.push(text);
                    }
                });
            }

            // Group shapes
            if (tree['p:grpSp'] && Array.isArray(tree['p:grpSp'])) {
                tree['p:grpSp'].forEach(grpSp => {
                    // Check for shapes within group
                    if (grpSp['p:grpSpPr']) {
                        // This might be a grouped element, try to extract
                        const text = extractTextFromShape(grpSp);
                        if (text && text.trim()) {
                            textElements.push(text);
                        }
                    }
                    
                    // Also check for nested shapes
                    if (grpSp['p:sp'] && Array.isArray(grpSp['p:sp'])) {
                        grpSp['p:sp'].forEach(sp => {
                            const text = extractTextFromShape(sp);
                            if (text && text.trim()) {
                                textElements.push(text);
                            }
                        });
                    }
                });
            }
        });

        console.log(`✅ Extracted ${textElements.length} text elements from slide`);
        return textElements.join('\n');
    } catch (err) {
        console.error('Error extracting text from slide XML:', err.message);
        return '';
    }
}

function extractTextFromShape(shape) {
    try {
        const textBody = shape['p:txBody'];
        if (!textBody || !Array.isArray(textBody) || textBody.length === 0) {
            return '';
        }

        const paragraphs = [];

        textBody.forEach(body => {
            if (body['a:p'] && Array.isArray(body['a:p'])) {
                body['a:p'].forEach(paragraph => {
                    const paragraphText = extractTextFromParagraph(paragraph);
                    if (paragraphText && paragraphText.trim()) {
                        paragraphs.push(paragraphText);
                    }
                });
            }
        });

        return paragraphs.join('\n');
    } catch (err) {
        console.error('Error extracting text from shape:', err.message);
        return '';
    }
}

function extractTextFromParagraph(paragraph) {
    try {
        const textRuns = [];

        // Extract from text runs
        if (paragraph['a:r'] && Array.isArray(paragraph['a:r'])) {
            paragraph['a:r'].forEach(run => {
                if (run['a:t'] && Array.isArray(run['a:t']) && run['a:t'][0]) {
                    textRuns.push(run['a:t'][0]);
                } else if (typeof run['a:t'] === 'string') {
                    textRuns.push(run['a:t']);
                }
            });
        }

        // Also check for direct text (endParaRPr contains formatting)
        if (paragraph['a:t'] && Array.isArray(paragraph['a:t']) && paragraph['a:t'][0]) {
            textRuns.push(paragraph['a:t'][0]);
        }

        return textRuns.join('');
    } catch (err) {
        console.error('Error extracting text from paragraph:', err.message);
        return '';
    }
}

// ==================== PDF EXTRACTION ====================
async function extractTextFromPDF(filePath) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check file exists with detailed logging
            const fileExists = fs.existsSync(filePath);
            console.log(`📄 File check for ${filePath}: ${fileExists ? '✓ EXISTS' : '✗ MISSING'}`);
            
            if (!fileExists) {
                console.error(`❌ File not found at path: ${filePath}`);
                console.error(`📁 Uploads directory contents:`, fs.readdirSync('uploads/').slice(0, 10));
                reject(new Error(`File not found: ${filePath}`));
                return;
            }

            console.log(`📄 Reading PDF: ${filePath}`);
            const fileBuffer = fs.readFileSync(filePath);
            console.log(`📊 Buffer size: ${fileBuffer.length} bytes`);

            // Try to extract text using pdf-parse
            let textExtracted = false;
            try {
                console.log(`🔍 Parsing PDF with pdf-parse...`);
                // Use require for pdf-parse to avoid ES module loading issues
                const pdfParse = require('pdf-parse');
                const data = await pdfParse(fileBuffer);

                if (data.text && data.text.trim().length > 0) {
                    console.log(`✅ Successfully extracted text from ${data.numpages} pages`);
                    resolve(data.text.trim());
                    textExtracted = true;
                    return;
                } else {
                    console.log(`⚠️ pdf-parse found no text - attempting OCR on PDF images...`);
                }
            } catch (err) {
                console.warn(`⚠️ pdf-parse failed: ${err.message}`);
            }

            // If no text extracted, try OCR on PDF
            if (!textExtracted) {
                console.log(`🔍 Attempting OCR on PDF...`);
                try {
                    const ocrText = await performOCROnPDFBuffer(fileBuffer);
                    if (ocrText && ocrText.trim().length > 0) {
                        console.log(`✅ OCR extracted ${ocrText.trim().split(/\s+/).length} words from PDF`);
                        resolve(ocrText);
                        return;
                    }
                } catch (ocrErr) {
                    console.warn(`⚠️ OCR failed: ${ocrErr.message}`);
                }
            }

            // Fallback message
            console.log(`⚠️ No text found in PDF via text extraction or OCR`);
            resolve('No readable text found in PDF. This PDF may contain only images or be encrypted. Please upload a text-based PDF or document.');
        } catch (err) {
            console.error('Error in extractTextFromPDF:', err);
            reject(err);
        }
    });
}

async function performOCROnPDFBuffer(fileBuffer) {
    try {
        // Note: Full PDF rendering to images requires additional setup
        // For now, we'll return empty to fall back to message
        console.log(`⚠️ PDF image extraction requires additional libraries (pdf-lib for rendering)`);
        return '';
    } catch (err) {
        console.error('Error in performOCROnPDFBuffer:', err);
        throw err;
    }
}

// ==================== END PDF EXTRACTION ====================

// ==================== SUMMARY GENERATION ==================== SUMMARY GENERATION -----------------
app.post("/api/generate-summary", async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!Note) {
            return res.status(503).json({ error: "Notes feature not available" });
        }

        const { content, title, file_id, restrictions, metadata } = req.body;

        if (!content || !title) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newNote = await Note.create({
            user_id: userId,
            file_id: file_id || null,
            title: title,
            content: content
        });

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

        res.json({
            message: "Summary generated successfully",
            note: newNote,
            expEarned: AI_SUMMARY_EXP,
            petLevelUp
        });

    } catch (err) {
        console.error("❌ Summary generation error:", err);
        res.status(500).json({ error: "Failed to generate summary" });
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

// ----------------- HEALTH CHECK ENDPOINT -----------------
app.get('/health', async (req, res) => {
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

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));