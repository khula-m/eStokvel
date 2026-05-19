// Validation utility functions
export function validatePhoneNumber(phone: string): boolean {
  // Simple phone validation - you can enhance this
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

// ============ PIN VALIDATION (6-digit for ADMIN/MEMBER) ============

const COMMON_PINS = [
  '123456', '654321', '000000', '111111', '222222', '333333', '444444',
  '555555', '666666', '777777', '888888', '999999', '112233', '121212',
  '123123', '246810', '135790', '100000', '200000',
  // Legacy 5-digit common PINs kept for reference during login backward compat
  '12345', '54321', '00000', '11111',
];

function isSequential(pin: string): boolean {
  const asc = '0123456789';
  const desc = '9876543210';
  return asc.includes(pin) || desc.includes(pin);
}

function isAllRepeating(pin: string): boolean {
  return new Set(pin.split('')).size === 1;
}

export function validatePin(pin: string): { isValid: boolean; message?: string } {
  if (!/^\d{6}$/.test(pin)) {
    return { isValid: false, message: "PIN must be exactly 6 digits" };
  }
  if (isAllRepeating(pin)) {
    return { isValid: false, message: "PIN cannot be all the same digit (e.g., 111111)" };
  }
  if (isSequential(pin)) {
    return { isValid: false, message: "PIN cannot be a sequential number (e.g., 123456)" };
  }
  if (COMMON_PINS.includes(pin)) {
    return { isValid: false, message: "This PIN is too common. Please choose a more secure PIN." };
  }
  return { isValid: true };
}

// ============ PASSWORD VALIDATION (for SUPERADMIN) ============

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('At least 8 characters');
  }
  if (password.length > 128) {
    errors.push('Maximum 128 characters');
  }
  // Reject passwords containing 'admin' or 'estokvel' (case-insensitive)
  const lowerPw = (password || '').toLowerCase();
  if (lowerPw.includes('admin') || lowerPw.includes('estokvel')) {
    errors.push('Password must not contain "admin" or "estokvel"');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('One special character (!@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateFullName(name: string): { isValid: boolean; message?: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { isValid: false, message: "Full name must be at least 2 characters" };
  }
  if (trimmed.length > 100) {
    return { isValid: false, message: "Full name must be less than 100 characters" };
  }
  return { isValid: true };
}

// Simple validation middleware
export function validateRequest(validations: Array<(body: any) => { isValid: boolean; message?: string }>) {
  return (req: any, res: any, next: any) => {
    const errors: Array<{ field: string; message: string }> = [];
    
    for (const validation of validations) {
      const result = validation(req.body);
      if (!result.isValid && result.message) {
        // Extract field name from validation if possible
        errors.push({ field: "body", message: result.message });
      }
    }
    
    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        errors
      });
      return;
    }
    
    next();
  };
}
