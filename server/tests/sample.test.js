import { describe, it, expect } from 'vitest';

describe('Sample Tests', () => {
  describe('Basic Math Operations', () => {
    it('should add two numbers correctly', () => {
      expect(2 + 2).toBe(4);
      expect(10 + 5).toBe(15);
    });

    it('should multiply two numbers correctly', () => {
      expect(3 * 4).toBe(12);
      expect(5 * 5).toBe(25);
    });

    it('should handle string operations', () => {
      const greeting = 'Hello' + ' ' + 'World';
      expect(greeting).toBe('Hello World');
      expect('test'.toUpperCase()).toBe('TEST');
    });
  });

  describe('Array Operations', () => {
    it('should filter arrays correctly', () => {
      const numbers = [1, 2, 3, 4, 5];
      const evens = numbers.filter(n => n % 2 === 0);
      expect(evens).toEqual([2, 4]);
    });

    it('should map arrays correctly', () => {
      const numbers = [1, 2, 3];
      const doubled = numbers.map(n => n * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });
  });

  describe('Object Operations', () => {
    it('should create and compare objects', () => {
      const user = {
        name: 'John',
        email: 'john@example.com',
        age: 25
      };

      expect(user.name).toBe('John');
      expect(user).toHaveProperty('email');
      expect(user.age).toBeGreaterThan(18);
    });

    it('should handle object destructuring', () => {
      const data = { x: 10, y: 20 };
      const { x, y } = data;
      
      expect(x).toBe(10);
      expect(y).toBe(20);
    });
  });

  describe('Async Operations', () => {
    it('should handle promises', async () => {
      const promise = Promise.resolve('success');
      const result = await promise;
      expect(result).toBe('success');
    });

    it('should timeout correctly', async () => {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const start = Date.now();
      await delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });
});
