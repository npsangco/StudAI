import User from "../models/User.js";
import jwt from "jsonwebtoken";

/**
 * Hybrid authentication and lock check middleware
 * Checks both session cookies and JWT tokens, then verifies account status
 */
export async function sessionLockCheck(req, res, next) {
    let userId = null;
    let authMethod = null;

    // Method 1: Check session cookie (primary method)
    if (req.session && req.session.userId) {
        userId = req.session.userId;
        authMethod = 'session';
    } 
    // Method 2: Check JWT token (fallback for cookie-blocked browsers)
    else {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.substring(7);
                const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
                if (decoded && decoded.userId) {
                    userId = decoded.userId;
                    authMethod = 'token';
                    // Store decoded user info in request for downstream use
                    req.user = decoded;
                }
            } catch (err) {
                // Invalid or expired token
                return res.status(401).json({
                    error: "Invalid or expired authentication token",
                    authRequired: true
                });
            }
        }
    }

    // If no authentication method found, require login
    if (!userId) {
        return res.status(401).json({
            error: "Authentication required. Please log in.",
            authRequired: true
        });
    }

    // Verify user exists and check account status
    try {
        const user = await User.findByPk(userId);

        if (!user) {
            if (authMethod === 'session') {
                req.session.destroy();
            }
            return res.status(401).json({
                error: "User not found",
                sessionExpired: true
            });
        }

        if (user.status === "locked" || user.status === "Locked") {
            if (authMethod === 'session') {
                req.session.destroy();
            }
            return res.status(403).json({
                error: "Your account has been locked. Please contact support.",
                locked: true
            });
        }

        if (user.status !== "active" && user.status !== "Active") {
            if (authMethod === 'session') {
                req.session.destroy();
            }
            return res.status(403).json({
                error: "Your account is not active.",
                inactive: true
            });
        }

        // Store user info in request for session-based auth
        if (authMethod === 'session' && req.session) {
            req.user = {
                userId: user.user_id,
                email: user.email,
                username: user.username,
                role: user.role
            };
        }

        req.authMethod = authMethod;
    } catch (err) {
        console.error("Session lock check error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }

    next();
}