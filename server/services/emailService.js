// Email Verification
export const VerificationEmail = (username, verifyLink) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Welcome to StudAI, ${username}!</h2>
                <p style="color: #666; margin-bottom: 32px; font-size: 16px; line-height: 1.5;">Please verify your email address to get started with StudAI. Click the button below to complete your registration:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${verifyLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Verify Email</a>
                </div>
                
                <p style="color: #999; font-size: 14px; margin-bottom: 0; text-align: center;">This link will expire in 30 minutes.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0;">If you didn't create an account with StudAI, you can safely ignore this email.</p>
                </div>
            </div>
        </div>
    `;
};

// Password update verification
export const PasswordUpdateEmail = (confirmLink) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Confirm Your Password Update</h2>
                <p style="color: #666; margin-bottom: 32px; font-size: 16px; line-height: 1.5;">You requested to update your password for your StudAI account. Click the button below to confirm this change:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${confirmLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Confirm Password Update</a>
                </div>
                
                <p style="color: #999; font-size: 14px; margin-bottom: 0; text-align: center;">This link will expire in 10 minutes.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0;">If you didn't request this password update, please contact our support team at studai.service@gmail.com immediately to secure your account.</p>
                </div>
            </div>
        </div>
    `;
};

// Password reset email
export const PasswordResetEmail = (resetLink) => {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Reset Your Password</h2>
            <p style="color: #666; margin-bottom: 32px; font-size: 16px; line-height: 1.5;">We received a request to reset your password for your StudAI account. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Reset Password</a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 0; text-align: center;">This link will expire in 10 minutes.</p>
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                <p style="color: #999; font-size: 14px; margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
        </div>
    </div>
  `;
};

// Account status email (lock/unlock)
export const AccountStatusEmail = (username, status, reason) => {
    const isLocked = status === "locked";
    const title = isLocked ? "Account Locked" : "Account Unlocked";
    const message = isLocked 
        ? "Your StudAI account has been temporarily locked by an administrator."
        : "Your StudAI account has been unlocked and you can now access all features.";
    const bgColor = isLocked ? "#dc2626" : "#16a34a";
    
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: ${bgColor}; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        ${title}
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Hello ${username},</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">${message}</p>
                
                <div style="background-color: #f3f4f6; border-left: 4px solid ${bgColor}; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Reason:</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${reason}</p>
                </div>
                
                ${isLocked 
                    ? `<p style="color: #666; font-size: 16px; line-height: 1.5;">If you believe this is a mistake or would like to discuss this action, please contact our support team at studai.service@gmail.com.</p>`
                    : `<p style="color: #666; font-size: 16px; line-height: 1.5;">You can now log in to the website. Thank you for your patience.</p>`
                }
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">This is an automated notification from StudAI. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    `;
};

// Streak expiration warning email
export const StreakExpirationEmail = (username, currentStreak, expiresIn) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        Streak Alert!
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Don't Break Your Streak, ${username}!</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">Your ${currentStreak}-day study streak is about to expire! You have ${expiresIn} to complete an activity and keep your streak alive.</p>
                
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fee2e2 100%); border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Current Streak: ${currentStreak} days</p>
                    <p style="margin: 0; color: #78350f; font-size: 14px;">Quick activities to maintain your streak: Take a quiz, create a note, or update your planner!</p>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.CLIENT_URL || 'https://studai.dev'}/dashboard" style="display: inline-block; background-color: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">Continue Learning</a>
                </div>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">Keep up the great work! Consistency is the key to success.</p>
                </div>
            </div>
        </div>
    `;
};

// Inactive user reminder email
export const InactiveUserEmail = (username, daysSinceActivity) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #818cf8; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        We Miss You!
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Come Back, ${username}!</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">It's been ${daysSinceActivity} days since your last visit to StudAI. Your learning journey is waiting for you!</p>
                
                <div style="background-color: #e0e7ff; border-left: 4px solid #818cf8; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #3730a3; font-weight: 600; font-size: 14px; margin-bottom: 8px;">What you're missing:</p>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #4338ca; font-size: 14px; line-height: 1.8;">
                        <li>Your personalized study dashboard</li>
                        <li>AI-powered notes and summaries</li>
                        <li>Quiz challenges and battles</li>
                        <li>Your pet companion needs you!</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.CLIENT_URL || 'https://studai.dev'}/dashboard" style="display: inline-block; background-color: #818cf8; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(129, 140, 248, 0.3);">Resume Learning</a>
                </div>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">We're here whenever you're ready to continue your learning adventure!</p>
                </div>
            </div>
        </div>
    `;
};

// Function to send account status email
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Optimized transporter for faster email delivery
const transporter = nodemailer.createTransport({
    service: "Gmail",
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

export const sendAccountStatusEmail = async (userEmail, username, status, reason) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: status === "locked" ? "Your StudAI Account Has Been Locked" : "Your StudAI Account Has Been Unlocked",
            html: AccountStatusEmail(username, status, reason),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Account status email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send account status email:", error);
        });
    } catch (error) {
        console.error("❌ Email service error:", error);
    }
};

// Quiz deletion email
export const QuizDeletionEmail = (username, quizTitle, reason) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        Quiz Deleted
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Hello ${username},</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">Your quiz has been deleted by an administrator.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Quiz Title:</p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${quizTitle}</p>
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Reason:</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${reason}</p>
                </div>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5;">If you have questions about this action, please contact our support team at studai.service@gmail.com.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">This is an automated notification from StudAI. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    `;
};

export const sendQuizDeletionEmail = async (userEmail, username, quizTitle, reason) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Your Quiz "${quizTitle}" Has Been Deleted`,
            html: QuizDeletionEmail(username, quizTitle, reason),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Quiz deletion email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send quiz deletion email:", error);
        });
    } catch (error) {
        console.error("❌ Email service error:", error);
    }
};

// Question deletion email
export const QuestionDeletionEmail = (username, quizTitle, questionText, reason) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        Question Deleted
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Hello ${username},</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">A question from your quiz has been deleted by an administrator.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Quiz:</p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${quizTitle}</p>
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Question:</p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${questionText}</p>
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Reason:</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${reason}</p>
                </div>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5;">If you have questions about this action, please contact our support team at studai.service@gmail.com.</p>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">This is an automated notification from StudAI. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    `;
};

export const sendQuestionDeletionEmail = async (userEmail, username, quizTitle, questionText, reason) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `A Question Was Deleted from "${quizTitle}"`,
            html: QuestionDeletionEmail(username, quizTitle, questionText, reason),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Question deletion email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send question deletion email:", error);
        });
    } catch (error) {
        console.error("❌ Email service error:", error);
    }
};

export const sendStreakExpirationEmail = async (userEmail, username, currentStreak, expiresIn) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Your ${currentStreak}-Day Streak is Expiring Soon!`,
            html: StreakExpirationEmail(username, currentStreak, expiresIn),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Streak expiration email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send streak expiration email:", error);
        });
    } catch (error) {
        console.error("❌ Streak email service error:", error);
    }
};

export const sendInactiveUserEmail = async (userEmail, username, daysSinceActivity) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `We Miss You at StudAI!`,
            html: InactiveUserEmail(username, daysSinceActivity),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Inactive user email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send inactive user email:", error);
        });
    } catch (error) {
        console.error("❌ Inactive user email service error:", error);
    }
};

// Session ended email
export const SessionEndedEmail = (username, sessionTopic, reason) => {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 32px 16px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                        Session Ended
                    </div>
                </div>
                
                <h2 style="color: #1a1a1a; margin-top: 0; margin-bottom: 16px; font-size: 24px;">Hello ${username},</h2>
                <p style="color: #666; margin-bottom: 24px; font-size: 16px; line-height: 1.5;">Your study session has been ended by an administrator.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Session Topic:</p>
                    <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${sessionTopic}</p>
                    <p style="margin: 0; color: #374151; font-weight: 600; font-size: 14px; margin-bottom: 8px;">Reason:</p>
                    <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">${reason}</p>
                </div>
                
                <p style="color: #666; font-size: 16px; line-height: 1.5;">You can create a new session anytime from your dashboard. If you have questions about this action, please contact our support team at studai.service@gmail.com.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.CLIENT_URL || 'https://studai.dev'}/jitsi-sessions" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">Create New Session</a>
                </div>
                
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e0e0e0;">
                    <p style="color: #999; font-size: 14px; margin: 0; text-align: center;">This is an automated notification from StudAI. Please do not reply to this email.</p>
                </div>
            </div>
        </div>
    `;
};

export const sendSessionEndedEmail = async (userEmail, username, sessionTopic, reason) => {
    try {
        const mailOptions = {
            from: `"StudAI" <${process.env.EMAIL_USER}>`,
            to: userEmail,
            subject: `Your Study Session "${sessionTopic}" Was Ended`,
            html: SessionEndedEmail(username, sessionTopic, reason),
        };

        transporter.sendMail(mailOptions).then(() => {
            console.log(`Session ended email sent to ${userEmail}`);
        }).catch(error => {
            console.error("Failed to send session ended email:", error);
        });
    } catch (error) {
        console.error("❌ Session ended email service error:", error);
    }
};