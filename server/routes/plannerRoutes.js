const express = require("express");
const Planner = require("../models/Planner");
const authMiddleware = require("../authMiddleware");
const router = express.Router();

// GET all plans for a user (protected)
router.get("/:userId", authMiddleware, async (req, res) => {
    try {
        // Only allow if the logged-in user matches the requested userId
        if (parseInt(req.params.userId) !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const plans = await Planner.findAll({
            where: { user_id: req.params.userId },
            order: [["createdAt", "DESC"]],
        });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create a plan (protected)
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { title, description, due_date } = req.body;
        const newPlan = await Planner.create({
            user_id: req.user.userId, // use logged-in user
            title,
            description,
            due_date
        });
        res.json(newPlan);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE plan (protected)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const plan = await Planner.findByPk(req.params.id);
        if (!plan) return res.status(404).json({ error: "Plan not found" });

        // Only allow the owner to delete
        if (plan.user_id !== req.user.userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await plan.destroy();
        res.json({ message: "Plan deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
