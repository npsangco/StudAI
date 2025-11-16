export const requireAdmin = (req, res, next) => {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: "Not authenticated",
            redirectTo: "/login"
        });
    }

    // Check if user has admin role
    if (req.session.role !== "Admin" && req.session.role !== "admin") {
        return res.status(403).json({
            error: "Access denied. Admin privileges required.",
            forbidden: true
        });
    }

    // User is authenticated and is an admin
    next();
};

// Optional: Middleware to check admin status and return user info
export const checkAdminStatus = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.isAdmin = req.session.role === "Admin" || req.session.role === "admin";
    } else {
        req.isAdmin = false;
    }
    next();
};