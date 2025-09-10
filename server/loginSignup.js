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

app.use(express.json());

// Import Sequelize instance and User model
let sequelize, User;
try {
    sequelize = require("./db");
    User = require("./models/User");
} catch (error) {
    process.exit(1); 
}

// Establish database connection and sync models
sequelize.authenticate()
    .then(() => {
        console.log('Database connection has been established successfully.');
        // Sync User model, false to prevent dropping existing tables
        return User.sync({ force: false }); 
    })
    .then(() => {
        console.log('User model synced.');
    })
    .catch((err) => {
        console.error('Database connection or sync error:', err);
        process.exit(1);
    });

let sessionStore;
try {
    // Load session store
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
            name: 'studai_session', // Custom session cookie name
            cookie: {
                secure: false, // Set to true in production if using HTTPS
                httpOnly: true, // Prevent XSS attacks
                maxAge: 1000 * 60 * 60 * 24, // 24 hours
                sameSite: 'lax' // CSRF protection
            },
            // Custom session save callback
            rolling: true, // Reset expiry on each request
        })
    );
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, 
async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails[0].value;
        if (!email) {
            return done(new Error("No email found in Google profile"), null);
        }

        // 🔹 Check if user exists in Sequelize DB
        let user = await User.findOne({ where: { email } });

        if (!user) {
            // 🔹 If not found, create new user

            const dummyPass = Math.random().toString(36).slice(-8); //random string pass due to pass cannot be null

            user = await User.create({
                email,
                username: profile.displayName || email, // fallback to email if no name
                password: await bcrypt.hash(dummyPass, 10), // dummy random password
                role: "Student", // default
                status: "active" // default
            });
        }

        return done(null, user); // pass Sequelize user
    } catch (err) {
        return done(err, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.user_id); // store only the primary key in session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findByPk(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});



// 🔹 Routes
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
  (req, res) => {
    res.redirect("http://localhost:5173/dashboard"); // frontend route
  }
);


app.get("/api/user", (req, res) => {
  if (req.user) res.json(req.user);
  else res.status(401).json({ error: "Not logged in" });
});

app.listen(4000, () => console.log("Server running on http://localhost:4000"));


// --- API Routes ---

app.get("/api/ping", (req, res) => {
    console.log("Ping route hit!");
    res.json({ message: "Server is working with basic middleware!" });
});

// User Signup Route
app.post("/api/auth/signup", async (req, res) => {
    const { email, username, password, birthday } = req.body;
    
    // Validate required fields
    if (!email || !username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Check for existing user by email or username
        console.log("Checking for existing users...");
        const existingUserByEmail = await User.findOne({ where: { email: email } });
        if (existingUserByEmail) {
            return res.status(400).json({ error: "Email already exists" });
        }

        const existingUserByUsername = await User.findOne({ where: { username: username } });
        if (existingUserByUsername) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user using the model
        // Sequelize will automatically handle default values for role, status, points, and createdAt
        console.log("Creating new user...");
        const newUser = await User.create({
            email,
            username,
            password: hashedPassword,
            birthday, // Sequelize handles the date conversion from string
            // Explicitly setting role, status, and points can be done if you want to override defaults,
            // but since your table defaults are 'Student', 'active', and 0,
            // and your model reflects this, they should be handled.
            // If you *don't* specify them here, Sequelize will use the defaults from the model/table.
        });

        res.status(201).json({
            message: "User signed up successfully",
            userId: newUser.id
        });

    } catch (err) {
        console.error("Error details:", err.message); // Log server-side errors
        // Handle specific unique constraint errors (email/username already exists)
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Email or username already exists" });
        }
        
        // Generic server error.
        res.status(500).json({
            error: "Internal server error",
            // Include more details in development for debugging
            details: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later'
        });
    }
});

// User Login Route
app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    // Ensure email and password are provided
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        // Find user by email
        const user = await User.findOne({ where: { email: email } });
        
        // If user not found or account is inactive, return an error.
        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password with the stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Create JWT token
        const token = jwt.sign(
            { 
                userId: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '24h' }
        );

        // Store minimal, clean session data
        if (req.session) {
            req.session.userId = user.user_id;
            req.session.email = user.email;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.loginTime = new Date();
            // Don't store sensitive data like passwords or full user objects
        }

        // Respond with login success, token, and user info
        res.status(200).json({
            message: "Login successful",
            token: token,
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
        console.error("Error details:", err.message); // Log server-side errors

        res.status(500).json({
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? err.message : 'Please try again later'
        });
    }
});

// Logout route to clear session
app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
        req.session.destroy((err) => {
            if (err) {
                console.error("Session destroy error:", err);
                return res.status(500).json({ error: "Could not log out" });
            }
            
            res.clearCookie('studai_session'); // Clear the session cookie
            console.log("User logged out successfully");
            res.status(200).json({ message: "Logged out successfully" });
        });
    } else {
        res.status(200).json({ message: "No active session" });
    }
});

// --- Server Start ---
// Define the port, specified in environment variables
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
