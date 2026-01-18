// Validation utility functions
export function validatePhoneNumber(phone: string): boolean {
  // Simple phone validation - you can enhance this
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 6) {
    return { isValid: false, message: "Password must be at least 6 characters" };
  }
  return { isValid: true };
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
