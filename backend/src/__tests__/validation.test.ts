/**
 * Validation Utility Unit Tests
 * Tests PIN validation, password validation, phone normalization, and full name validation
 */
import { validatePin, validatePassword, validateFullName, validatePhoneNumber } from '../utils/validation';

describe('Validation Utilities', () => {

  // ====== PIN Validation ======
  describe('validatePin', () => {
    it('should accept valid 5-digit PIN', () => {
      expect(validatePin('97531').isValid).toBe(true);
    });

    it('should accept another valid PIN', () => {
      expect(validatePin('48263').isValid).toBe(true);
    });

    it('should reject PIN shorter than 5 digits', () => {
      const result = validatePin('1234');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('5 digits');
    });

    it('should reject PIN longer than 5 digits', () => {
      const result = validatePin('123456');
      expect(result.isValid).toBe(false);
    });

    it('should reject non-numeric PIN', () => {
      const result = validatePin('abcde');
      expect(result.isValid).toBe(false);
    });

    it('should reject all-same-digit PIN (11111)', () => {
      const result = validatePin('11111');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('same digit');
    });

    it('should reject sequential PIN (12345)', () => {
      const result = validatePin('12345');
      expect(result.isValid).toBe(false);
    });

    it('should reject reverse sequential PIN (54321)', () => {
      const result = validatePin('54321');
      expect(result.isValid).toBe(false);
    });

    it('should reject common PIN (00000)', () => {
      const result = validatePin('00000');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validatePin('');
      expect(result.isValid).toBe(false);
    });
  });

  // ====== Password Validation ======
  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('Admin@2026!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password shorter than 8 chars', () => {
      const result = validatePassword('Abc1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('admin@2026!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('ADMIN@2026!');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = validatePassword('Admin@!!abc');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('should reject password without special char', () => {
      const result = validatePassword('Admin2026abc');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('special'))).toBe(true);
    });

    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
    });
  });

  // ====== Full Name Validation ======
  describe('validateFullName', () => {
    it('should accept valid name', () => {
      expect(validateFullName('John Doe').isValid).toBe(true);
    });

    it('should accept short valid name', () => {
      expect(validateFullName('Li').isValid).toBe(true);
    });

    it('should reject single character name', () => {
      const result = validateFullName('J');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty name', () => {
      const result = validateFullName('');
      expect(result.isValid).toBe(false);
    });

    it('should reject name over 100 chars', () => {
      const longName = 'A'.repeat(101);
      const result = validateFullName(longName);
      expect(result.isValid).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateFullName('  John Doe  ').isValid).toBe(true);
    });

    it('should reject whitespace-only name', () => {
      const result = validateFullName('   ');
      expect(result.isValid).toBe(false);
    });
  });

  // ====== Phone Number Validation ======
  describe('validatePhoneNumber', () => {
    it('should accept valid international format', () => {
      expect(validatePhoneNumber('+27831234567')).toBe(true);
    });

    it('should reject empty string', () => {
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should reject too short number (single digit)', () => {
      expect(validatePhoneNumber('1')).toBe(false);
    });

    it('should reject number starting with 0', () => {
      expect(validatePhoneNumber('0831234567')).toBe(false);
    });
  });
});
