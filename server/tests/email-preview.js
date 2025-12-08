import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
    VerificationEmail,
    PasswordUpdateEmail,
    PasswordResetEmail,
    AccountStatusEmail,
    StreakExpirationEmail,
    InactiveUserEmail,
    QuizDeletionEmail,
    QuestionDeletionEmail,
    SessionEndedEmail
} from '../services/emailService.js';

const outputDir = path.join(__dirname, 'email-previews');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const templates = [
    {
        name: '1-verification',
        html: VerificationEmail('TestUser', 'https://studai.dev/verify?token=abc123')
    },
    {
        name: '2-password-update',
        html: PasswordUpdateEmail('https://studai.dev/confirm-password?token=abc123')
    },
    {
        name: '3-password-reset',
        html: PasswordResetEmail('https://studai.dev/reset-password?token=abc123')
    },
    {
        name: '4-account-locked',
        html: AccountStatusEmail('TestUser', 'locked', 'Multiple failed login attempts detected.')
    },
    {
        name: '5-account-unlocked',
        html: AccountStatusEmail('TestUser', 'unlocked', 'Your appeal has been reviewed and approved.')
    },
    {
        name: '6-streak-expiration',
        html: StreakExpirationEmail('TestUser', 15, '6 hours')
    },
    {
        name: '7-inactive-user',
        html: InactiveUserEmail('TestUser', 30)
    },
    {
        name: '8-quiz-deletion',
        html: QuizDeletionEmail('TestUser', 'Introduction to JavaScript', 'Violated community guidelines.')
    },
    {
        name: '9-question-deletion',
        html: QuestionDeletionEmail('TestUser', 'Math Quiz', 'What is 2+2?', 'Inappropriate content.')
    },
    {
        name: '10-session-ended',
        html: SessionEndedEmail('TestUser', 'Study Group Session', 'Session exceeded time limit.')
    }
];

templates.forEach(template => {
    const filePath = path.join(outputDir, `${template.name}.html`);
    fs.writeFileSync(filePath, template.html);
    console.log(`✅ Created: ${template.name}.html`);
});

console.log(`\n📧 All email previews generated in: ${outputDir}`);
console.log(`\n💡 To view the emails:`);
console.log(`   1. Open any .html file in your browser`);
console.log(`   2. Or run: start ${outputDir}`);
