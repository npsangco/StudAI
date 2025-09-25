// Load .env file
require("dotenv").config();

const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nodemailer = require("nodemailer");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use("/uploads", express.static("uploads"));

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

// ----------------- DB + User Model -----------------
let sequelize, User;
try {
    sequelize = require("./db");
    User = require("./models/User");
} catch (error) {
    console.error("Failed to load DB or User model:", error.message);
    process.exit(1);
}

sequelize.authenticate()
    .then(() => {
        console.log("✅ Database connected");
        return User.sync({ force: false });
    })
    .then(() => {
        console.log("✅ User model synced");
    })
    .catch((err) => {
        console.error("❌ Database error:", err);
        process.exit(1);
    });

// ----------------- Session Store -----------------
let sessionStore;
try {
    sessionStore = require("./sessionStore");
} catch (error) {
    console.error("Failed to load session store:", error.message);
}

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
                secure: false, // 🔑 keep false for local HTTP
                maxAge: 1000 * 60 * 60 * 24, // 1 day
                sameSite: "lax", // 🔑 change to "none" if testing cross-domain with HTTPS
            },
            rolling: true,
        })
    );
}

// ----------------- PASSPORT (Google OAuth) -----------------
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
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
    (req, res) => res.redirect("http://localhost:5173/dashboard")
);

// Ping test
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

    // Check regex
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

        // Store session
        req.session.userId = user.user_id;
        req.session.email = user.email;
        req.session.username = user.username;
        req.session.role = user.role;

        res.status(200).json({
            message: "Login successful",
            user: {
                id: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role,
                points: user.points,
                profile_picture: user.profile_picture,
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
            attributes: ["user_id", "email", "username", "birthday", "role", "points", "profile_picture"],
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
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    try {
        const { username, password, birthday, profile_picture } = req.body;
        const updates = { username, birthday, profile_picture };

        if (password) {
            const passwordRegex =
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

            // Validate new password
            if (!passwordRegex.test(password)) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
                });
            }

            // Check if new password is same as old
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


// ----------------- RESET PASSWORD ROUTES -----------------
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Request password reset
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


// Handle password reset
app.post("/api/auth/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Check regex
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch the current password from DB
        const user = await User.findByPk(decoded.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Prevent reuse of old password
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ error: "New password cannot be the same as the old password." });
        }

        // Hash and update
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
    destination: function(req, file, cb){
        cb(null, 'uploads/')
    },
    filename: function(req, file, cb) {
        cb(null, file.originalname)
    }
})

var upload = multer({storage: storage})

const File = require('./models/File');


app.post('/api/upload', upload.single('myFile'), async (req,res,next) => {
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

        // 🔎 Check for duplicate filename for this user
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

        // Save to DB
        const newFile = await File.create({
            user_id: userId,
            filename: file.filename,
            file_path: file.path,
            upload_date: new Date(), // add this if your model expects it
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








// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));





