import { describe, it, expect } from 'vitest';
import * as validators from '../../utils/validators';

describe('Validators', () => {
  describe('emailSchema', () => {
    it('should validate correct email addresses', async () => {
      await expect(validators.emailSchema.validate('test@example.com')).resolves.toBe('test@example.com');
      await expect(validators.emailSchema.validate('user.name@example.co.uk')).resolves.toBe('user.name@example.co.uk');
    });

    it('should reject invalid email addresses', async () => {
      await expect(validators.emailSchema.validate('invalid-email')).rejects.toThrow();
      await expect(validators.emailSchema.validate('@example.com')).rejects.toThrow();
      await expect(validators.emailSchema.validate('test@')).rejects.toThrow();
    });

    it('should require email field', async () => {
      await expect(validators.emailSchema.validate('')).rejects.toThrow('Email is required');
      await expect(validators.emailSchema.validate(undefined)).rejects.toThrow('Email is required');
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', async () => {
      await expect(validators.passwordSchema.validate('Password123')).resolves.toBe('Password123');
      await expect(validators.passwordSchema.validate('MyStr0ng!Pass')).resolves.toBe('MyStr0ng!Pass');
    });

    it('should reject weak passwords', async () => {
      await expect(validators.passwordSchema.validate('short')).rejects.toThrow('at least 8 characters');
      await expect(validators.passwordSchema.validate('nouppercase123')).rejects.toThrow('uppercase letter');
      await expect(validators.passwordSchema.validate('NOLOWERCASE123')).rejects.toThrow('lowercase letter');
      await expect(validators.passwordSchema.validate('NoNumbersHere')).rejects.toThrow('number');
    });
  });

  describe('qidSchema', () => {
    it('should validate correct QID format', async () => {
      await expect(validators.qidSchema.validate('12345678901')).resolves.toBe('12345678901');
    });

    it('should reject invalid QID format', async () => {
      await expect(validators.qidSchema.validate('12345')).rejects.toThrow('exactly 11 digits');
      await expect(validators.qidSchema.validate('123456789012')).rejects.toThrow('exactly 11 digits');
      await expect(validators.qidSchema.validate('abc12345678')).rejects.toThrow();
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        rememberMe: false,
      };
      await expect(validators.loginSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject invalid login data', async () => {
      await expect(validators.loginSchema.validate({ email: 'invalid', password: 'Password123' })).rejects.toThrow();
      await expect(validators.loginSchema.validate({ email: 'test@example.com', password: 'weak' })).rejects.toThrow();
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate matching passwords', async () => {
      const validData = {
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      };
      await expect(validators.resetPasswordSchema.validate(validData)).resolves.toEqual(validData);
    });

    it('should reject non-matching passwords', async () => {
      await expect(
        validators.resetPasswordSchema.validate({
          password: 'NewPassword123',
          confirmPassword: 'DifferentPassword123',
        })
      ).rejects.toThrow('Passwords must match');
    });
  });
});

