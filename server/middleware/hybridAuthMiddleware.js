/**
 * Hybrid Authentication Middleware
 * 
 * This middleware supports both session-based (cookie) and token-based (JWT) authentication.
 * It provides a fallback mechanism for browsers that don't support cookies properly
 * (incognito mode, strict privacy settings, etc.)
 * 
 * Priority:
 * 1. Check session cookie first (primary method - most users)
 * 2. Fall back to JWT Authorization header (for cookie-blocked browsers)
 */

import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} - Decoded token or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");
    } catch (err) {
        return null;
    }
}

/**
 * Hybrid authentication middleware
 * Checks session cookies first, then falls back to JWT tokens
 */
export async function hybridAuth(req, res, next) {
    try {
        // Method 1: Check session cookie (primary method)
        if (req.session && req.session.userId) {
            // User is authenticated via session
            req.user = {
                userId: req.session.userId,
                email: req.session.email,
                username: req.session.username,
                role: req.session.role,
            };
            req.authMethod = 'session';
            return next();
        }

        // Method 2: Fall back to JWT token (for cookie-blocked browsers)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            const decoded = verifyToken(token);

            if (decoded && decoded.userId) {
                // Verify user still exists and is active
                const user = await User.findByPk(decoded.userId);
                
                if (!user) {
                    return res.status(401).json({ 
                        error: "User not found",
                        authMethod: 'token' 
                    });
                }

                if (user.status === "locked" || user.status === "Locked") {
                    return res.status(403).json({
                        error: "Your account has been locked. Please contact support.",
                        locked: true,
                        authMethod: 'token'
                    });
                }

                if (user.status !== "active" && user.status !== "Active") {
                    return res.status(403).json({
                        error: "Your account is not active. Please verify your email.",
                        inactive: true,
                        authMethod: 'token'
                    });
                }

                // User is authenticated via JWT token
                req.user = {
                    userId: user.user_id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                };
                req.authMethod = 'token';
                return next();
            }
        }

        // No valid authentication found
        return res.status(401).json({ 
            error: "Authentication required. Please log in.",
            authRequired: true 
        });
    } catch (err) {
        console.error("Hybrid auth error:", err);
        return res.status(500).json({ 
            error: "Authentication error",
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}

/**
 * Optional: Middleware to require session-only authentication
 * Use this for routes that specifically need session cookies (e.g., OAuth callbacks)
 */
export function requireSession(req, res, next) {
    if (req.session && req.session.userId) {
        req.user = {
            userId: req.session.userId,
            email: req.session.email,
            username: req.session.username,
            role: req.session.role,
        };
        return next();
    }
    
    return res.status(401).json({ 
        error: "Session authentication required",
        authRequired: true,
        requiresSession: true
    });
}

/**
 * Optional: Middleware to require token-only authentication
 * Use this for routes that specifically need JWT tokens (e.g., mobile apps, API-only endpoints)
 */
export function requireToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: "Token authentication required",
            authRequired: true,
            requiresToken: true
        });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
        return res.status(401).json({ 
            error: "Invalid or expired token",
            authRequired: true
        });
    }

    req.user = decoded;
    req.authMethod = 'token';
    next();
}

export default hybridAuth;
