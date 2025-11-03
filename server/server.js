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
import File from "./models/File.js";
import sessionStore from "./sessionStore.js";
import Plan from "./models/Plan.js";
import Quiz from "./models/Quiz.js";
import Question from "./models/Question.js";
import QuizAttempt from "./models/QuizAttempt.js";
import QuizBattle from "./models/QuizBattle.js";
import BattleParticipant from "./models/BattleParticipant.js";
import Session from "./models/Session.js";
import ZoomToken from "./models/ZoomToken.js"; // ← ADDED

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

const app = express();

// ----------------- CORS -----------------
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

// ============================================
// STREAK TRACKING SYSTEM
// ============================================

async function updateUserStreak(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivity = user.last_activity_date 
      ? new Date(user.last_activity_date) 
      : null;

    if (lastActivity) {
      lastActivity.setHours(0, 0, 0, 0);
      
      const diffTime = today - lastActivity;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (diffDays === 0) {
        console.log(`User ${userId}: Same day activity, streak unchanged`);
        return user.study_streak;
      } else if (diffDays === 1) {
        user.study_streak += 1;
        user.last_activity_date = today;
        
        if (user.study_streak > user.longest_streak) {
          user.longest_streak = user.study_streak;
        }
        
        console.log(`✅ User ${userId}: Streak continued! Now at ${user.study_streak} days`);
        
        await checkStreakMilestones(userId, user.study_streak);
      } else {
        console.log(`⚠️ User ${userId}: Streak broken after ${user.study_streak} days. Reset to 1 day`);
        user.study_streak = 1;
        user.last_activity_date = today;
      }
    } else {
      user.study_streak = 1;
      user.last_activity_date = today;
      user.longest_streak = 1;
      console.log(`🎉 User ${userId}: First activity! Streak started`);
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
            ZoomToken.sync({ force: false }) // ← ADDED TO SYNC
        ]);
    })
    .then(() => {
        console.log("✅ All models synced");
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

// ----------------- AUTH ROUTES -----------------
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
    async (req, res) => {
        try {
            req.session.userId = req.user.user_id;
            req.session.email = req.user.email;
            req.session.username = req.user.username;
            req.session.role = req.user.role;

            await updateUserStreak(req.user.user_id);

            console.log("✅ Google login session set:", req.session);
            res.redirect("http://localhost:5173/dashboard");
        } catch (err) {
            console.error("Google login session error:", err);
            res.redirect("http://localhost:5173/");
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

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
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
        });

        res.status(201).json({ message: "Signup successful", userId: newUser.user_id });
    } catch (err) {
        console.error("Signup error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    try {
        const user = await User.findOne({ where: { email } });
        if (!user || user.status !== "active") return res.status(401).json({ error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });
        
        req.session.userId = user.user_id;
        req.session.email = user.email;
        req.session.username = user.username;
        req.session.role = user.role;

        await updateUserStreak(user.user_id);
        
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
                longest_streak: updatedUser.longest_streak
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
            { expiresIn: "15m" }
        );

        const confirmLink = `http://localhost:4000/api/user/confirm-password-update?token=${token}`;

        await transporter.sendMail({
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Confirm Your Password Update",
            html: `
                <p>You requested to update your password. Click below to confirm:</p>
                <a href="${confirmLink}">${confirmLink}</a>
                <p>This link will expire in 15 minutes.</p>
            `,
        });

        res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (err) {
        console.error("Password update request error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/api/user/confirm-password-update", async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid request");

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        await User.update(
            { password: decoded.newPassword },
            { where: { user_id: decoded.userId } }
        );

        res.send("<h2>Password updated successfully ✅</h2>");
    } catch (err) {
        console.error("Password confirm error:", err);
        res.status(400).send("Invalid or expired token");
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
            text: `Click here to reset your password: ${resetLink}`,
            html: `<p>Click here to reset your password:</p><a href="${resetLink}">${resetLink}</a>`,
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
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        if (!Note) {
            return res.status(503).json({ error: "Notes feature not available" });
        }

        const { content, title, restrictions, metadata } = req.body;

        if (!content || !title) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const newNote = await Note.create({
            user_id: userId,
            file_id: null,
            title: title,
            content: content
        });

        res.json({
            message: "Summary generated successfully",
            note: newNote
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

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));