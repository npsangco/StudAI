import cron from "node-cron";
import nodemailer from "nodemailer";
import { Op } from "sequelize";
import Plan from "../models/Plan.js";
import User from "../models/User.js";
import { sendStreakExpirationEmail, sendInactiveUserEmail } from "./emailService.js";

Plan.belongsTo(User, { foreignKey: 'user_id' });

// Optimized transporter for daily reminder emails
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    socketTimeout: 30000,
    connectionTimeout: 30000,
});

export function startEmailReminders() {
    // Runs every 2 days at 8am (Monday, Wednesday, Friday, Sunday)
    cron.schedule("0 8 * * 1,3,5,0", async () => {
        console.log("📬 Checking for upcoming and overdue tasks...");

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysLater = new Date();
        threeDaysLater.setDate(today.getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        const upcomingPlans = await Plan.findAll({
            where: {
                due_date: {
                    [Op.between]: [today, threeDaysLater],
                },
                completed: false, // Only include incomplete tasks
            },
            include: User,
        });

        const overduePlans = await Plan.findAll({
            where: {
                due_date: {
                    [Op.lt]: today,
                },
                completed: false, // Only include incomplete tasks
            },
            include: User,
        });

        const userPlans = {};

        for (const plan of upcomingPlans) {
            const user = plan.User;
            if (!user?.email) continue;
            if (!userPlans[user.email]) userPlans[user.email] = { upcoming: [], overdue: [] };
            userPlans[user.email].upcoming.push(plan);
        }

        for (const plan of overduePlans) {
            const user = plan.User;
            if (!user?.email) continue;
            if (!userPlans[user.email]) userPlans[user.email] = { upcoming: [], overdue: [] };
            userPlans[user.email].overdue.push(plan);
        }

        for (const [email, plans] of Object.entries(userPlans)) {
            const getStatusTag = (dueDate) => {
                const due = new Date(dueDate);
                due.setHours(0, 0, 0, 0);
                const diffTime = due - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays < 0) {
                    return '<span style="background-color: #ffebee; color: #d32f2f; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Overdue</span>';
                } else if (diffDays === 0) {
                    return '<span style="background-color: #fff9c4; color: #f57c00; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">Due today</span>';
                } else if (diffDays === 1) {
                    return '<span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">1 day</span>';
                } else {
                    return `<span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500;">${diffDays} days</span>`;
                }
            };

            const upcomingHTML =
                plans.upcoming.length > 0
                    ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1976d2; margin-bottom: 16px;">📅 Upcoming Tasks</h3>
          <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Title</th>
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Description</th>
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Deadline</th>
                  <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${plans.upcoming
                        .map(
                            (p) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 16px; color: #333;">${p.title}</td>
                  <td style="padding: 16px; color: #666;">${p.description || "—"}</td>
                  <td style="padding: 16px; color: #666;">${new Date(p.due_date).toLocaleDateString()}</td>
                  <td style="padding: 16px; text-align: right;">${getStatusTag(p.due_date)}</td>
                </tr>`
                        )
                        .join("")}
              </tbody>
            </table>
          </div>
        </div>`
                    : "";

            const overdueHTML =
                plans.overdue.length > 0
                    ? `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #d32f2f; margin-bottom: 16px;">⚠️ Overdue Tasks</h3>
          <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <table cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Title</th>
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Description</th>
                  <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Deadline</th>
                  <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #333; border-bottom: 1px solid #e0e0e0;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${plans.overdue
                        .map(
                            (p) => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding: 16px; color: #333;">${p.title}</td>
                  <td style="padding: 16px; color: #666;">${p.description || "—"}</td>
                  <td style="padding: 16px; color: #666;">${new Date(p.due_date).toLocaleDateString()}</td>
                  <td style="padding: 16px; text-align: right;">${getStatusTag(p.due_date)}</td>
                </tr>`
                        )
                        .join("")}
              </tbody>
            </table>
          </div>
        </div>`
                    : "";

            if (upcomingHTML || overdueHTML) {
                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: "📋 Task Reminder: Upcoming and Overdue Tasks",
                    html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 8px;">Daily Task Summary</h2>
                <p style="color: #666; margin-bottom: 32px;">Here's an overview of your upcoming and overdue tasks:</p>
                ${upcomingHTML}
                ${overdueHTML}
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                  <p style="color: #999; font-size: 14px; margin: 0;">— StudAI Reminder System</p>
                </div>
              </div>
            </div>
          `,
                }).then(() => {
                    console.log(`✅ Sent summary email to ${email}`);
                }).catch(err => {
                    console.error(`❌ Failed to send email to ${email}:`, err);
                });
            }
        }

        console.log("✅ Daily email check completed.");
    });

    // Check for expiring streaks - runs once daily at 9pm (3 hours before midnight)
    cron.schedule("0 21 * * *", async () => {
        console.log("🔥 Checking for expiring streaks...");

        try {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);

            const endOfYesterday = new Date(yesterday);
            endOfYesterday.setHours(23, 59, 59, 999);

            // Find users whose last activity was yesterday and have a streak > 0
            const usersWithExpiringStreaks = await User.findAll({
                where: {
                    study_streak: { [Op.gt]: 0 },
                    last_activity_date: {
                        [Op.between]: [yesterday, endOfYesterday]
                    },
                    email: { [Op.ne]: null }
                }
            });

            for (const user of usersWithExpiringStreaks) {
                const timeRemaining = "3 hours";
                await sendStreakExpirationEmail(
                    user.email,
                    user.username,
                    user.study_streak,
                    timeRemaining
                );
            }

            console.log(`✅ Sent ${usersWithExpiringStreaks.length} streak expiration warnings`);
        } catch (err) {
            console.error("❌ Streak check error:", err);
        }
    });

    // Check for inactive users - runs weekly on Mondays at 10am
    cron.schedule("0 10 * * 1", async () => {
        console.log("👋 Checking for inactive users...");

        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);

            const eightDaysAgo = new Date(now);
            eightDaysAgo.setDate(now.getDate() - 8);
            eightDaysAgo.setHours(0, 0, 0, 0);

            // Find users who were last active 7 days ago (send only once per week)
            const inactiveUsers = await User.findAll({
                where: {
                    last_activity_date: {
                        [Op.between]: [eightDaysAgo, sevenDaysAgo]
                    },
                    email: { [Op.ne]: null },
                    status: 'active'
                }
            });

            for (const user of inactiveUsers) {
                const daysSinceActivity = Math.floor(
                    (now - new Date(user.last_activity_date)) / (1000 * 60 * 60 * 24)
                );
                
                await sendInactiveUserEmail(
                    user.email,
                    user.username,
                    daysSinceActivity
                );
            }

            console.log(`✅ Sent ${inactiveUsers.length} inactive user reminders`);
        } catch (err) {
            console.error("❌ Inactive user check error:", err);
        }
    });
}