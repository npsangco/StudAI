// 🌍 Environment variables
import dotenv from "dotenv";
dotenv.config();

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

//pet companion route
import petRoutes from "./routes/petRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import SharedNote from "./models/SharedNote.js";

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

// ----------------- DB Connection -----------------
sequelize.authenticate()
    .then(() => {
        console.log("✅ Database connected");
        return Promise.all([
            User.sync({ force: false }),
            File.sync({ force: false }),
            Note ? Note.sync({ force: false }) : Promise.resolve(),
            SharedNote.sync({ force: false }),
            Plan.sync({ force: false })
        ]);
    })
    .then(() => {
        console.log("✅ Models synced");
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

// ----------------- AUTH ROUTES -----------------
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "http://localhost:5173/" }),
    async (req, res) => {
        try {
            // Save user details into session
            req.session.userId = req.user.user_id;
            req.session.email = req.user.email;
            req.session.username = req.user.username;
            req.session.role = req.user.role;

            console.log("✅ Google login session set:", req.session);

            // redirect to dashboard
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

// Request password update (send verification email)
app.post("/api/user/request-password-update", async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: "Password required" });

    // Validate password
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
            error: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        });
    }

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        // Prevent reusing the old password
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) return res.status(400).json({ error: "Password cannot be the same as the old one" });

        // Create token with userId and newPassword (hashed inside token for security)
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

// Confirm password update (when user clicks email link)
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
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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

// ----------------- PPTX EXTRACTION ENDPOINT (ONLY) -----------------
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
                    // Must be at least 10 characters
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

        // Here you would implement your AI summary generation logic
        // For now, just create a note with the content
        const newNote = await Note.create({
            user_id: userId,
            file_id: null, // Can be linked to uploaded file if needed
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

// ----------------- PLANS ROUTES -----------------
app.get("/api/plans", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const plans = await Plan.findAll({
      where: { user_id: req.session.userId },
      order: [["createdAt", "DESC"]],
    });

    res.json({ plans });
  } catch (err) {
    console.error("❌ Failed to fetch plans:", err);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

app.post("/api/plans", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const { title, description, due_date } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const newPlan = await Plan.create({
      user_id: req.session.userId,
      title,
      description,
      due_date: due_date || null,
    });

    res.status(201).json({ plan: newPlan });
  } catch (err) {
    console.error("❌ Failed to create plan:", err);
    res.status(500).json({ error: "Failed to create plan" });
  }
});

app.delete("/api/plans/:id", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    const deleted = await Plan.destroy({
      where: { planner_id: req.params.id, user_id: req.session.userId },
    });

    if (!deleted) return res.status(404).json({ error: "Plan not found" });

    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    console.error("❌ Failed to delete plan:", err);
    res.status(500).json({ error: "Failed to delete plan" });
  }
});

// ----------------- PET SYSTEM ROUTES -----------------
app.use("/api/pet", petRoutes);
app.use("/api/notes", noteRoutes);


// ----------------- START SERVER -----------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));