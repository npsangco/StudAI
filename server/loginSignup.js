// Load .env file
require('dotenv').config();

const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const jwt = require('jsonwebtoken');
const cors = require('cors');
const passport = require('passport'); //OAUTH
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

app.use(express.json());

// CORS configuration - Add this BEFORE other middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], // Common Vite and React ports
    credentials: true, // Allow cookies/sessions
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Import Sequelize instance and User model
let sequelize, User;
try {
    sequelize = require("./db");
    User = require("./models/User");
} catch (error) {
    console.error("Failed to load DB or User model:", error.message);
    process.exit(1); 
}

// Establish database connection and sync models
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connection established.');
        return User.sync({ force: false }); 
    })
    .then(() => {
        console.log('✅ User model synced.');
    })
    .catch((err) => {
        console.error('❌ Database error:', err);
        process.exit(1);
    });

// Load session store
let sessionStore;
try {
    sessionStore = require("./sessionStore");
} catch (error) {
    console.error("Failed to load session store module:", error.message);
}

if (sessionStore) {
    app.use(
        session({
            secret: process.env.JWT_SECRET || 'fallback-secret',
            resave: false,
            saveUninitialized: false,
            store: sessionStore,
            name: 'studai_session', 
            cookie: {
                secure: false, 
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24, // 24h
                sameSite: 'lax'
            },
            rolling: true,
        })
    );
}

// ----------------- PASSPORT (Google OAuth) -----------------
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, 
async (accessToken, refreshToken, profile, done) => {
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
                status: "active"
            });
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

// ----------------- AUTH ROUTES -----------------

// Google login
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
    (req, res) => res.redirect("http://localhost:5173/dashboard")
);

// Ping test
app.get("/api/ping", (req, res) => {
    console.log("Ping route hit!");
    res.json({ message: "Server is working!" });
});

// Signup
app.post("/api/auth/signup", async (req, res) => {
    const { email, username, password, birthday } = req.body;
    if (!email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const existingUserByEmail = await User.findOne({ where: { email } });
        if (existingUserByEmail) return res.status(400).json({ error: "Email already exists" });

        const existingUserByUsername = await User.findOne({ where: { username } });
        if (existingUserByUsername) return res.status(400).json({ error: "Username already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            email,
            username,
            password: hashedPassword,
            birthday,
        });

        res.status(201).json({ message: "User signed up successfully", userId: newUser.user_id });
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
        if (!user || user.status !== 'active') return res.status(401).json({ error: "Invalid credentials" });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        if (req.session) {
            req.session.userId = user.user_id;
            req.session.email = user.email;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.loginTime = new Date();
        }

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role,
                points: user.points,
                profile_picture: user.profile_picture
            }
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
            if (err) return res.status(500).json({ error: "Could not log out" });
            res.clearCookie('studai_session');
            res.status(200).json({ message: "Logged out successfully" });
        });
    } else {
        res.status(200).json({ message: "No active session" });
    }
});

// ----------------- PROFILE ROUTES -----------------

// Fetch logged-in user's profile
app.get("/api/user/profile", async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const user = await User.findByPk(req.session.userId, {
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture"]
        });

        if (!user) return res.status(404).json({ error: "User not found" });

        res.json(user);
    } catch (err) {
        console.error("Profile fetch error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Update profile
app.put("/api/user/profile", async (req, res) => {
    try {
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const { username, password, birthday, profile_picture } = req.body;
        const updates = { username, birthday, profile_picture };

        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        await User.update(updates, { where: { user_id: req.session.userId } });

        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        console.error("Profile update error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
