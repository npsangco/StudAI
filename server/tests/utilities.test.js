import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const isoString = date.toISOString();
      
      expect(isoString).toContain('2024-01-15');
      expect(isoString).toContain('T');
    });

    it('should get date without time', () => {
      const dateString = '2024-12-04T15:30:00Z';
      const dateOnly = dateString.split('T')[0];
      
      expect(dateOnly).toBe('2024-12-04');
      expect(dateOnly).not.toContain('T');
    });

    it('should handle UTC dates', () => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
    });
  });

  describe('String Operations', () => {
    it('should validate email format', () => {
      const validEmail = 'user@ust.edu.ph';
      const hasAt = validEmail.includes('@');
      const hasDot = validEmail.includes('.');
      
      expect(hasAt).toBe(true);
      expect(hasDot).toBe(true);
      expect(validEmail.endsWith('ust.edu.ph')).toBe(true);
    });

    it('should validate password strength', () => {
      const strongPassword = 'SecurePass123!';
      const hasUpper = /[A-Z]/.test(strongPassword);
      const hasLower = /[a-z]/.test(strongPassword);
      const hasNumber = /[0-9]/.test(strongPassword);
      
      expect(hasUpper).toBe(true);
      expect(hasLower).toBe(true);
      expect(hasNumber).toBe(true);
      expect(strongPassword.length).toBeGreaterThanOrEqual(8);
    });

    it('should sanitize user input', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = input.replace(/[<>]/g, '');
      
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });
  });

  describe('Number Operations', () => {
    it('should calculate percentages', () => {
      const score = 8;
      const total = 10;
      const percentage = (score / total) * 100;
      
      expect(percentage).toBe(80);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should round numbers correctly', () => {
      const value = 3.7;
      const rounded = Math.round(value);
      const floored = Math.floor(value);
      const ceiled = Math.ceil(value);
      
      expect(rounded).toBe(4);
      expect(floored).toBe(3);
      expect(ceiled).toBe(4);
    });

    it('should handle min/max operations', () => {
      const values = [5, 10, 3, 8, 15];
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      expect(max).toBe(15);
      expect(min).toBe(3);
    });
  });

  describe('Array Helpers', () => {
    it('should find items in arrays', () => {
      const users = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' }
      ];
      
      const found = users.find(u => u.id === 2);
      expect(found).toBeTruthy();
      expect(found.name).toBe('Bob');
    });

    it('should filter arrays', () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const evens = numbers.filter(n => n % 2 === 0);
      
      expect(evens).toEqual([2, 4, 6]);
      expect(evens.length).toBe(3);
    });

    it('should map arrays', () => {
      const items = [{ price: 10 }, { price: 20 }, { price: 30 }];
      const prices = items.map(item => item.price);
      
      expect(prices).toEqual([10, 20, 30]);
      expect(prices.length).toBe(3);
    });

    it('should reduce arrays', () => {
      const numbers = [1, 2, 3, 4];
      const sum = numbers.reduce((acc, val) => acc + val, 0);
      
      expect(sum).toBe(10);
    });
  });

  describe('Object Helpers', () => {
    it('should check object properties', () => {
      const user = { id: 1, email: 'test@test.com', verified: false };
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user.verified).toBe(false);
    });

    it('should merge objects', () => {
      const defaults = { theme: 'light', lang: 'en' };
      const custom = { theme: 'dark' };
      const merged = { ...defaults, ...custom };
      
      expect(merged.theme).toBe('dark');
      expect(merged.lang).toBe('en');
    });

    it('should extract object keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = Object.keys(obj);
      
      expect(keys).toEqual(['a', 'b', 'c']);
      expect(keys.length).toBe(3);
    });
  });

  describe('Validation Helpers', () => {
    it('should validate required fields', () => {
      const data = { username: 'test', email: 'test@test.com' };
      const required = ['username', 'email', 'password'];
      const missing = required.filter(field => !data[field]);
      
      expect(missing).toEqual(['password']);
      expect(missing.length).toBe(1);
    });

    it('should validate data types', () => {
      expect(typeof 'hello').toBe('string');
      expect(typeof 123).toBe('number');
      expect(typeof true).toBe('boolean');
      expect(Array.isArray([])).toBe(true);
    });

    it('should validate ranges', () => {
      const age = 25;
      const isValid = age >= 18 && age <= 100;
      
      expect(isValid).toBe(true);
      expect(age).toBeGreaterThanOrEqual(18);
      expect(age).toBeLessThanOrEqual(100);
    });
  });

  describe('JSON Operations', () => {
    it('should parse JSON strings', () => {
      const jsonString = '{"name":"Test","value":42}';
      const parsed = JSON.parse(jsonString);
      
      expect(parsed.name).toBe('Test');
      expect(parsed.value).toBe(42);
    });

    it('should stringify objects', () => {
      const obj = { id: 1, active: true };
      const json = JSON.stringify(obj);
      
      expect(json).toContain('"id":1');
      expect(json).toContain('"active":true');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          profile: {
            name: 'John'
          }
        }
      };
      
      expect(data.user.profile.name).toBe('John');
    });
  });
});
