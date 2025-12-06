import express from "express";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/audit-logs", async (req, res) => {
    try {
        const logs = await AuditLog.findAll({
            include: [
                {
                    model: User,
                    attributes: ["username", "role"], 
                },
            ],
            order: [["log_id", "DESC"]], 
        });

        const formattedLogs = logs.map(log => {
            const logData = log.toJSON();
            
            const displayUsername = logData.User?.role === 'Admin' 
                ? 'Admin' 
                : (logData.User?.username || 'System');

            return {
                ...logData,
                User: {
                    username: displayUsername
                }
            };
        });

        res.json(formattedLogs);
    } catch (err) {
        console.error("Failed to fetch audit logs:", err);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});

export default router;