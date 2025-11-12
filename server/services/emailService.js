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
                    <p style="color: #999; font-size: 14px; margin: 0;">If you didn't request this password update, please contact our support team immediately to secure your account.</p>
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