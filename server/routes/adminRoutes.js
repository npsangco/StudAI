import express from "express";
import { Op } from "sequelize";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import Session from "../models/Session.js";
import sequelize from "../db.js";
import Note from "../models/Note.js";
import Question from "../models/Question.js"

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

        await User.update(
            { status: "locked" },
            { where: { user_id: userId } }
        );

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

        await User.update(
            { status: "active" },
            { where: { user_id: userId } }
        );

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

        // Check if quiz exists
        const quiz = await Quiz.findByPk(quizId);
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        // Delete the quiz (cascade should handle related records if configured)
        await Quiz.destroy({
            where: { quiz_id: quizId }
        });

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

        const question = await Question.findByPk(questionId);

        if (!question) {
            return res.status(404).json({ error: "Question not found" });
        }

        const quizId = question.quiz_id;

        // Delete the question
        await Question.destroy({
            where: { question_id: questionId }
        });

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

// Get all study sessions for admin
router.get("/sessions", async (req, res) => {
    try {
        const sessions = await Session.findAll({
            include: [
                {
                    model: User,
                    as: 'host',
                    attributes: ['username'],
                    foreignKey: 'user_id'
                }
            ],
            order: [["createdAt", "DESC"]],
        });

        const formattedSessions = await Promise.all(sessions.map(async (session) => {
            const sessionData = session.toJSON();

            // Count participants
            const participantCount = await sequelize.query(
                `SELECT COUNT(DISTINCT user_id) as count 
                 FROM session_participants 
                 WHERE session_id = ?`,
                {
                    replacements: [sessionData.session_id],
                    type: sequelize.QueryTypes.SELECT
                }
            ).catch(() => [{ count: 0 }]);

            // Calculate duration
            let duration = "N/A";
            if (sessionData.scheduled_start && sessionData.scheduled_end) {
                const start = new Date(sessionData.scheduled_start);
                const end = new Date(sessionData.scheduled_end);
                const durationMs = end - start;
                const hours = Math.floor(durationMs / 3600000);
                const minutes = Math.floor((durationMs % 3600000) / 60000);

                if (hours > 0) {
                    duration = `${hours}h ${minutes}m`;
                } else {
                    duration = `${minutes}m`;
                }
            } else if (sessionData.duration) {
                duration = `${sessionData.duration}m`;
            }

            // Determine status
            let status = "Scheduled";
            if (sessionData.status === "active" || session.isActive()) {
                status = "Active";
            } else if (sessionData.status === "ended" || session.isExpired()) {
                status = "Ended";
            } else if (sessionData.status === "cancelled") {
                status = "Cancelled";
            }

            return {
                session_id: sessionData.session_id,
                host: sessionData.host?.username || sessionData.host_name || 'Unknown',
                participants: participantCount[0]?.count || 0,
                duration: duration,
                status: status,
                scheduled_start: sessionData.scheduled_start,
                scheduled_end: sessionData.scheduled_end
            };
        }));

        res.json(formattedSessions);
    } catch (error) {
        console.error("Error fetching sessions:", error);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});

// End a study session
router.put("/sessions/:sessionId/end", async (req, res) => {
    try {
        const { sessionId } = req.params;

        // Check if session exists
        const session = await Session.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // Update session status to ended
        await Session.update(
            {
                status: "ended",
                scheduled_end: new Date()
            },
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
        const activeSessions = await Session.count({ where: { status: "Active" } });

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

// Recent Study Sessions
router.get("/recent-sessions", async (req, res) => {
    try {
        const sessions = await Session.findAll({
            order: [["createdAt", "DESC"]],
            limit: 5
        });

        const formatted = sessions.map(s => ({
            session_id: s.session_id,
            host: s.host_name || "Unknown",
            participants: s.participants || 0,
            duration: s.duration || "N/A",
            status: s.status
        }));

        res.json({ sessions: formatted });
    } catch (error) {
        console.error("Error fetching recent sessions:", error);
        res.status(500).json({ error: "Failed to fetch recent sessions" });
    }
});

export default router;