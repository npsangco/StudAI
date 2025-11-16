import User from "../models/User.js";

export async function sessionLockCheck(req, res, next) {
    if (req.session && req.session.userId) {
        try {
            const user = await User.findByPk(req.session.userId);

            if (!user) {
                req.session.destroy();
                return res.status(401).json({
                    error: "User not found",
                    sessionExpired: true
                });
            }

            if (user.status === "locked" || user.status === "Locked") {
                req.session.destroy();
                return res.status(403).json({
                    error: "Your account has been locked. Please contact support.",
                    locked: true
                });
            }

            if (user.status !== "active" && user.status !== "Active") {
                req.session.destroy();
                return res.status(403).json({
                    error: "Your account is not active.",
                    inactive: true
                });
            }
        } catch (err) {
            console.error("Session lock check error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    next();
}