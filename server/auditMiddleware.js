import AuditLog from "./models/AuditLog.js";

const actionMap = {
    // Notes
    "POST /api/notes/create": { action: "Create Note", target: "Note" },
    "PUT /api/notes/:id": { action: "Update Note", target: "Note" },
    "DELETE /api/notes/:id": { action: "Delete Note", target: "Note" },

    // Categories
    "POST /api/notes/categories": { action: "Create Category", target: "Note Category" },

    // Shared Notes
    "POST /api/notes/:id/share": { action: "Share Note", target: "Shared Note" },
    "POST /api/notes/shared/retrieve": { action: "Retrieve Shared Note", target: "Shared Note" },
    "DELETE /api/notes/:id/share": { action: "Deactivate Shared Note", target: "Shared Note" },

    // Pin/Unpin Notes
    "POST /api/notes/:id/pin": { action: "Pin Note", target: "Note" },
    "POST /api/notes/:id/unpin": { action: "Unpin Note", target: "Note" },

    // Plans
    "POST /api/plans": { action: "Create Plan", target: "Plan" },
    "POST /api/plans/": { action: "Create Plan", target: "Plan" },
    "PUT /api/plans/:id": { action: "Update Plan", target: "Plan" },
    "DELETE /api/plans/:id": { action: "Delete Plan", target: "Plan" },

    // Quizzes
    "POST /api/quizzes": { action: "Create Quiz", target: "Quiz" },
    "PUT /api/quizzes/:id": { action: "Update Quiz", target: "Quiz" },
    "DELETE /api/quizzes/:id": { action: "Delete Quiz", target: "Quiz" },

    // Quiz Questions
    "POST /api/quizzes/:id/questions": { action: "Add Question", target: "Quiz Question" },
    "PUT /api/quizzes/:id/questions/:questionId": { action: "Update Question", target: "Quiz Question" },
    "DELETE /api/quizzes/:id/questions/:questionId": { action: "Delete Question", target: "Quiz Question" },

    // Quiz Attempts
    "POST /api/quizzes/:id/attempt": { action: "Attempt Quiz", target: "Quiz Attempt" },

    // Quiz Battles
    "POST /api/quizzes/:id/battle/create": { action: "Create Quiz Battle", target: "Quiz Battle" },
    "POST /api/quizzes/battle/join": { action: "Join Quiz Battle", target: "Quiz Battle" },
    "POST /api/quizzes/battle/:gamePin/ready": { action: "Mark Ready in Battle", target: "Quiz Battle" },
    "POST /api/quizzes/battle/:gamePin/start": { action: "Start Quiz Battle", target: "Quiz Battle" },
    "POST /api/quizzes/battle/:gamePin/submit": { action: "Submit Battle Score", target: "Quiz Battle" },
    "POST /api/quizzes/battle/:gamePin/end": { action: "End Quiz Battle", target: "Quiz Battle" },

    // === PET SYSTEM ===
    "POST /api/pet": { action: "Adopt Pet", target: "Pet" },
    "PUT /api/pet/name": { action: "Update Pet Name", target: "Pet" },
    "POST /api/pet/action": { action: "Perform Pet Action", target: "Pet" },
    "POST /api/pet/inventory/equip": { action: "Equip/Unequip Item", target: "Pet Inventory" },
    "POST /api/pet/inventory/auto-equip": { action: "Auto-Equip Items", target: "Pet Inventory" },
    "POST /api/pet/inventory/use": { action: "Use Item", target: "Pet Inventory" },
    "POST /api/pet/shop/purchase": { action: "Purchase Shop Item", target: "Pet Shop" },

    // === USER PROFILE ===
    "PUT /api/user/profile": { action: "Update Profile", target: "User" },
    "POST /api/upload/profile": { action: "Upload Profile Picture", target: "User" },
    "POST /api/user/request-password-update": { action: "Request Password Update", target: "User" },

    // === FILE UPLOADS ===
    "POST /api/upload": { action: "Upload File", target: "File" },
    "POST /api/extract-pptx": { action: "Extract PPTX Text", target: "File" },

    // === SUMMARY GENERATION ===
    "POST /api/generate-summary": { action: "Generate Summary", target: "Note" },

    // === SESSIONS ===
    "POST /api/sessions": { action: "Create Study Session", target: "Study Session" },
    "PUT /api/sessions/:id": { action: "Update Study Session", target: "Study Session" },
    "DELETE /api/sessions/:id": { action: "Delete Study Session", target: "Study Session" },
    "POST /api/sessions/:id/complete": { action: "Complete Study Session", target: "Study Session" },

    // === AUTHENTICATION ===
    "POST /api/auth/signup": { action: "Sign Up", target: "User" },
    "POST /api/auth/login": { action: "Login", target: "User" },
    "POST /api/auth/logout": { action: "Logout", target: "User" },
    "GET /api/auth/verify-email": { action: "Verify Email", target: "User" },
    "POST /api/auth/reset-request": { action: "Request Password Reset", target: "User" },
    "POST /api/auth/reset-password": { action: "Reset Password", target: "User" },

    // === USER PROFILE ROUTES ===
    "GET /api/user/confirm-password-update": { action: "Confirm Password Update", target: "User" },

    // === ACHIEVEMENTS ===
    "POST /api/achievements/equip": { action: "Equip Achievement", target: "Achievement" },
};

export async function auditMiddleware(req, res, next) {
    res.on("finish", async () => {
        try {
            const user_id = req.user?.user_id || req.session?.userId || null;

            const key = `${req.method} ${req.baseUrl}${req.route?.path}`;
            const mapping = actionMap[key];

            // only save successful actions with mappings
            if (res.statusCode < 400 && mapping) {
                const record_id = req.params?.id || req.params?.gamePin || req.body?.id || null;

                await AuditLog.create({
                    user_id,
                    action: mapping.action,
                    table_name: mapping.target,
                    record_id,
                });
            }
        } catch (err) {
            console.error("Audit middleware failed:", err.message);
        }
    });

    next();
}