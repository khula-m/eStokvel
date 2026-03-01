// Validation utility functions
export function validatePhoneNumber(phone: string): boolean {
  // Simple phone validation - you can enhance this
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

// ============ PIN VALIDATION (5-digit for ADMIN/MEMBER) ============

const COMMON_PINS = ['12345', '54321', '00000', '11111', '22222', '33333', '44444',
  '55555', '66666', '77777', '88888', '99999', '123456', '13579', '24680'];

function isSequential(pin: string): boolean {
  const ascending = '0123456789';
  const descending = '9876543210';
  return ascending.includes(pin) || descending.includes(pin);
}

function isAllRepeating(pin: string): boolean {
  return new Set(pin.split('')).size === 1;
}

export function validatePin(pin: string): { isValid: boolean; message?: string } {
  if (!/^\d{5}$/.test(pin)) {
    return { isValid: false, message: "PIN must be exactly 5 digits" };
  }
  if (isAllRepeating(pin)) {
    return { isValid: false, message: "PIN cannot be all the same digit (e.g., 11111)" };
  }
  if (isSequential(pin)) {
    return { isValid: false, message: "PIN cannot be a sequential number (e.g., 12345)" };
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
