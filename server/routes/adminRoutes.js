import express from "express";
import { Op } from "sequelize";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import JitsiSession from "../models/JitsiSession.js";
import sequelize from "../db.js";
import Note from "../models/Note.js";
import Question from "../models/Question.js";
import { sendAccountStatusEmail } from "../services/emailService.js";
import nodemailer from "nodemailer";

const router = express.Router();

router.get("/users", async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                "user_id",
                "username",
                "email",
                "status",
                "role",
                "createdAt",
                [
                    sequelize.literal(`(
                        SELECT MAX(timestamp)
                        FROM audit_logs
                        WHERE audit_logs.user_id = User.user_id
                    )`),
                    "lastActivityTimestamp"
                ]
            ],
            order: [["user_id", "ASC"]],
        });

        const formattedUsers = users.map(user => {
            const userData = user.toJSON();

            let lastActivity = "Never";
            if (userData.lastActivityTimestamp) {
                const activityDate = new Date(userData.lastActivityTimestamp);
                const now = new Date();
                const diffMs = now - activityDate;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);

                if (diffMins < 1) {
                    lastActivity = "Just now";
                } else if (diffMins < 60) {
                    lastActivity = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
                } else if (diffHours < 24) {
                    lastActivity = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                } else if (diffDays < 7) {
                    lastActivity = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                } else {
                    lastActivity = activityDate.toLocaleDateString();
                }
            }

            return {
                user_id: userData.user_id,
                username: userData.username,
                email: userData.email,
                status: userData.status === "active" ? "Active" : "Locked",
                role: userData.role,
                lastActivity: lastActivity,
                lastActivityTimestamp: userData.lastActivityTimestamp
            };
        });

        res.json(formattedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Lock a user
router.post("/users/:userId/lock", async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        // Get user details before locking
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update user status
        await User.update(
            { status: "locked" },
            { where: { user_id: userId } }
        );

        // Send email notification
        try {
            await sendAccountStatusEmail(user.email, user.username, "locked", reason || "No reason provided");
        } catch (emailError) {
            console.error("Failed to send lock notification email:", emailError);
            // Continue even if email fails
        }

        res.json({ message: "User locked successfully" });
    } catch (error) {
        console.error("Error locking user:", error);
        res.status(500).json({ error: "Failed to lock user" });
    }
});

// Unlock a user
router.post("/users/:userId/unlock", async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        // Get user details before unlocking
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Update user status
        await User.update(
            { status: "active" },
            { where: { user_id: userId } }
        );

        // Send email notification
        try {
            await sendAccountStatusEmail(user.email, user.username, "unlocked", reason || "No reason provided");
        } catch (emailError) {
            console.error("Failed to send unlock notification email:", emailError);
            // Continue even if email fails
        }

        res.json({ message: "User unlocked successfully" });
    } catch (error) {
        console.error("Error unlocking user:", error);
        res.status(500).json({ error: "Failed to unlock user" });
    }
});

// Get all quizzes for admin
router.get("/quizzes", async (req, res) => {
    try {
        const quizzes = await Quiz.findAll({
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['username'],
                    foreignKey: 'created_by'
                }
            ],
            order: [["created_at", "DESC"]],
        });

        const formattedQuizzes = quizzes.map(quiz => {
            const quizData = quiz.toJSON();

            // Format created date
            const createdDate = new Date(quizData.created_at);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            return {
                quiz_id: quizData.quiz_id,
                creator: quizData.creator?.username || 'Unknown',
                title: quizData.title,
                details: quizData.description || 'No description',
                questions: quizData.total_questions,
                timesTaken: quizData.total_attempts,
                status: quizData.is_public ? "Open" : "Private",
                created: formattedDate,
                createdAt: quizData.createdAt
            };
        });

        res.json(formattedQuizzes);
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ error: "Failed to fetch quizzes" });
    }
});

// Delete a quiz
router.delete("/quizzes/:quizId", async (req, res) => {
    try {
        const { quizId } = req.params;
        const { reason } = req.body;

        // Check if quiz exists and get creator details
        const quiz = await Quiz.findByPk(quizId, {
            include: [{
                model: User,
                as: 'creator',
                attributes: ['email', 'username']
            }]
        });
        
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        const quizTitle = quiz.title;
        const creatorEmail = quiz.creator?.email;
        const creatorUsername = quiz.creator?.username;

        // Delete the quiz (cascade should handle related records if configured)
        await Quiz.destroy({
            where: { quiz_id: quizId }
        });

        // Send email notification to quiz creator
        if (creatorEmail && creatorUsername) {
            try {
                const { sendQuizDeletionEmail } = await import('../services/emailService.js');
                await sendQuizDeletionEmail(
                    creatorEmail, 
                    creatorUsername, 
                    quizTitle, 
                    reason || "No reason provided"
                );
            } catch (emailError) {
                console.error("Failed to send quiz deletion email:", emailError);
                // Continue even if email fails
            }
        }

        res.json({ message: "Quiz deleted successfully" });
    } catch (error) {
        console.error("Error deleting quiz:", error);
        res.status(500).json({ error: "Failed to delete quiz" });
    }
});

// Get all questions for a specific quiz
router.get("/quizzes/:quizId/questions", async (req, res) => {
    try {
        const { quizId } = req.params;

        const questions = await Question.findAll({
            where: { quiz_id: quizId },
            order: [['question_order', 'ASC']]
        });

        res.json(questions);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ error: "Failed to fetch questions" });
    }
});

// Delete a specific question
router.delete("/questions/:questionId", async (req, res) => {
    try {
        const { questionId } = req.params;
        const { reason } = req.body;

        const question = await Question.findByPk(questionId, {
            include: [{
                model: Quiz,
                as: 'quiz',
                attributes: ['title', 'user_id'],
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['email', 'username']
                }]
            }]
        });

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        const quizId = question.quiz_id;
        const questionText = question.question;
        const quizTitle = question.quiz?.title || "Unknown Quiz";
        const creatorEmail = question.quiz?.creator?.email;
        const creatorUsername = question.quiz?.creator?.username;

        // Delete the question
        await Question.destroy({
            where: { question_id: questionId }
        });

        // Send email notification to quiz creator
        if (creatorEmail && creatorUsername) {
            try {
                const { sendQuestionDeletionEmail } = await import('../services/emailService.js');
                await sendQuestionDeletionEmail(
                    creatorEmail,
                    creatorUsername,
                    quizTitle,
                    questionText,
                    reason || "No reason provided"
                );
            } catch (emailError) {
                console.error("Failed to send question deletion email:", emailError);
                // Continue even if email fails
            }
        }

        // Update the quiz's total_questions count
        await Quiz.decrement('total_questions', {
            where: { quiz_id: quizId }
        });

        res.json({ success: true, message: "Question deleted successfully" });
    } catch (error) {
        console.error("Error deleting question:", error);
        res.status(500).json({ error: "Failed to delete question" });
    }
});

// Get all Jitsi study sessions for admin
router.get("/sessions", async (req, res) => {
    try {
        const sessions = await JitsiSession.findAll({
            order: [["created_at", "DESC"]],
        });

        // Get user info for each session
        const formattedSessions = await Promise.all(sessions.map(async (session) => {
            const sessionData = session.toJSON();

            // Get creator info
            const creator = await User.findByPk(sessionData.user_id, {
                attributes: ['username']
            });

            // Calculate duration
            let duration = "N/A";
            if (sessionData.duration) {
                const hours = Math.floor(sessionData.duration / 60);
                const minutes = sessionData.duration % 60;

                if (hours > 0) {
                    duration = `${hours}h ${minutes}m`;
                } else {
                    duration = `${minutes}m`;
                }
            }

            // Format status
            let status = "Scheduled";
            if (sessionData.status === "active") {
                status = "Active";
            } else if (sessionData.status === "completed") {
                status = "Completed";
            } else if (sessionData.status === "cancelled") {
                status = "Cancelled";
            }

            return {
                session_id: sessionData.session_id,
                host: creator?.username || 'Unknown',
                topic: sessionData.topic,
                duration: duration,
                status: status,
                start_time: sessionData.start_time,
                is_private: sessionData.is_private,
                room_id: sessionData.room_id
            };
        }));

        res.json(formattedSessions);
    } catch (error) {
        console.error("Error fetching Jitsi sessions:", error);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

// End a Jitsi study session
router.put("/sessions/:sessionId/end", async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await JitsiSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        await JitsiSession.update(
            { status: "completed" },
            { where: { session_id: sessionId } }
        );

        res.json({ message: "Session ended successfully" });
    } catch (error) {
        console.error("Error ending session:", error);
        res.status(500).json({ error: "Failed to end session" });
    }
});

// Dashboard Stats
router.get("/stats", async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalQuizzes = await Quiz.count();
        const totalNotes = await Note.count();
        const activeSessions = await JitsiSession.count({
            where: {
                status: {
                    [Op.in]: ['active', 'scheduled']
                }
            }
        });

        res.json({
            totalUsers,
            totalQuizzes,
            totalNotes,
            activeSessions
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

// Recent 5 Active Users with Last Activity
router.get("/recent-users", async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: [
                "user_id",
                "username",
                "email",
                "status",
                [
                    sequelize.literal(`(
                        SELECT MAX(timestamp)
                        FROM audit_logs
                        WHERE audit_logs.user_id = User.user_id
                    )`),
                    "lastActivityTimestamp"
                ]
            ],
            order: [["createdAt", "DESC"]],
            limit: 5
        });

        const formatted = users.map(u => {
            const data = u.toJSON();

            let activity = "Never";
            if (data.lastActivityTimestamp) {
                const date = new Date(data.lastActivityTimestamp);
                activity = date.toLocaleString();
            }

            return {
                user_id: data.user_id,
                username: data.username,
                email: data.email,
                status: data.status === "active" ? "Active" : "Locked",
                lastActivity: activity
            };
        });

        res.json({ users: formatted });
    } catch (error) {
        console.error("Error fetching recent users:", error);
        res.status(500).json({ error: "Failed to fetch recent users" });
    }
});

// Recent Jitsi Study Sessions
router.get("/recent-sessions", async (req, res) => {
    try {
        const sessions = await JitsiSession.findAll({
            order: [["created_at", "DESC"]],
            limit: 5
        });

        const formatted = await Promise.all(sessions.map(async (session) => {
            const creator = await User.findByPk(session.user_id, {
                attributes: ['username']
            });

            // Calculate duration
            let duration = "N/A";
            if (session.duration) {
                const hours = Math.floor(session.duration / 60);
                const minutes = session.duration % 60;

                if (hours > 0) {
                    duration = `${hours}h ${minutes}m`;
                } else {
                    duration = `${minutes}m`;
                }
            }

            // Format status
            let status = "Scheduled";
            if (session.status === "active") {
                status = "Active";
            } else if (session.status === "completed") {
                status = "Completed";
            } else if (session.status === "cancelled") {
                status = "Cancelled";
            }

            return {
                session_id: session.session_id,
                host: creator?.username || "Unknown",
                topic: session.topic,
                duration: duration,
                status: status
            };
        }));

        res.json({ sessions: formatted });
    } catch (error) {
        console.error("Error fetching recent sessions:", error);
        res.status(500).json({ error: "Failed to fetch recent sessions" });
    }
});

export default router;