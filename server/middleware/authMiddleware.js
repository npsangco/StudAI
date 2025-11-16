const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback-secret");

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (user.status === "locked" || user.status === "Locked") {
      return res.status(403).json({
        error: "Your account has been locked. Please contact support.",
        locked: true
      });
    }

    if (user.status !== "active" && user.status !== "Active") {
      return res.status(403).json({
        error: "Your account is not active. Please verify your email.",
        inactive: true
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

module.exports = authMiddleware;