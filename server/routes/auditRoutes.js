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
                    attributes: ["username", "role"], // Add role to the attributes
                },
            ],
            order: [["log_id", "DESC"]], 
        });

        // Format the logs to display "Admin" for admin users
        const formattedLogs = logs.map(log => {
            const logData = log.toJSON();
            
            // Display "Admin" if the user has admin role, otherwise show username
            const displayUsername = logData.User?.role === 'admin' 
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