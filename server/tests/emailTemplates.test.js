import { describe, it, expect } from 'vitest';
import { VerificationEmail, PasswordUpdateEmail, PasswordResetEmail } from '../services/emailService.js';

describe('Email Template Generation', () => {
  describe('VerificationEmail', () => {
    it('should generate HTML with username', () => {
      const html = VerificationEmail('TestUser', 'https://example.com/verify/abc123');
      
      expect(html).toBeTruthy();
      expect(html).toContain('TestUser');
      expect(html).toContain('https://example.com/verify/abc123');
    });

    it('should include verification link', () => {
      const verifyLink = 'https://studai.com/verify/token123';
      const html = VerificationEmail('John', verifyLink);
      
      expect(html).toContain(verifyLink);
      expect(html).toContain('href');
    });

    it('should generate valid HTML structure', () => {
      const html = VerificationEmail('Alice', 'https://test.com/verify');
      
      expect(html).toContain('<');
      expect(html).toContain('>');
      expect(html.length).toBeGreaterThan(100);
    });
  });

  describe('PasswordUpdateEmail', () => {
    it('should generate HTML with confirmation link', () => {
      const confirmLink = 'https://example.com/confirm/xyz789';
      const html = PasswordUpdateEmail(confirmLink);
      
      expect(html).toBeTruthy();
      expect(html).toContain(confirmLink);
    });

    it('should include href attribute', () => {
      const html = PasswordUpdateEmail('https://studai.com/confirm/token');
      
      expect(html).toContain('href');
      expect(html).toContain('https://studai.com/confirm/token');
    });

    it('should generate substantial content', () => {
      const html = PasswordUpdateEmail('https://test.com/confirm');
      
      expect(html.length).toBeGreaterThan(100);
      expect(html).toContain('<');
    });
  });

  describe('PasswordResetEmail', () => {
    it('should generate HTML with reset link', () => {
      const resetLink = 'https://example.com/reset/token456';
      const html = PasswordResetEmail(resetLink);
      
      expect(html).toBeTruthy();
      expect(html).toContain(resetLink);
    });

    it('should include clickable link', () => {
      const resetLink = 'https://studai.com/reset/secrettoken';
      const html = PasswordResetEmail(resetLink);
      
      expect(html).toContain('href');
      expect(html).toContain(resetLink);
    });

    it('should generate proper HTML', () => {
      const html = PasswordResetEmail('https://test.com/reset/abc');
      
      expect(html).toBeTruthy();
      expect(html.length).toBeGreaterThan(50);
    });
  });

  describe('Email Template Consistency', () => {
    it('should generate different content for different inputs', () => {
      const email1 = VerificationEmail('User1', 'https://link1.com');
      const email2 = VerificationEmail('User2', 'https://link2.com');
      
      expect(email1).not.toBe(email2);
      expect(email1).toContain('User1');
      expect(email2).toContain('User2');
    });

    it('should handle special characters in URLs', () => {
      const link = 'https://example.com/verify?token=abc123&user=test';
      const html = VerificationEmail('Test', link);
      
      expect(html).toContain('abc123');
    });
  });
});
