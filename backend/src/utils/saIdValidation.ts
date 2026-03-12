/**
 * South African ID Number Validation
 * 
 * SA ID format: YYMMDDSSSSCAZ
 * - YYMMDD: Date of birth
 * - SSSS: Gender (0000-4999 = Female, 5000-9999 = Male)
 * - C: Citizenship (0 = SA citizen, 1 = permanent resident)
 * - A: Usually 8 or 9
 * - Z: Luhn check digit
 */

interface SAIdValidationResult {
  isValid: boolean;
  dateOfBirth?: Date;
  gender?: 'male' | 'female';
  citizenshipStatus?: 'citizen' | 'permanent_resident';
  age?: number;
  message?: string;
}

/**
 * Luhn algorithm check digit validation
 */
function luhnCheck(idNumber: string): boolean {
  let sum = 0;
  let alternate = false;

  for (let i = idNumber.length - 1; i >= 0; i--) {
    let n = parseInt(idNumber[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Parse and extract date of birth from SA ID number
 */
function extractDateOfBirth(idNumber: string): Date | null {
  const year = parseInt(idNumber.substring(0, 2), 10);
  const month = parseInt(idNumber.substring(2, 4), 10);
  const day = parseInt(idNumber.substring(4, 6), 10);

  // Determine century: if year > current 2-digit year, assume 1900s, otherwise 2000s
  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year > currentYear ? 1900 + year : 2000 + year;

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(fullYear, month - 1, day);
  // Verify the date is valid (catches things like Feb 30)
  if (date.getFullYear() !== fullYear || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Validate a South African ID number
 * Performs: format check, Luhn check, DOB validation, age >= 18, gender + citizenship extraction
 */
export function validateSAId(idNumber: string): SAIdValidationResult {
  // Strip spaces
  const cleaned = idNumber.replace(/\s/g, '');

  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleaned)) {
    return { isValid: false, message: 'ID number must be exactly 13 digits' };
  }

  // Luhn check
  if (!luhnCheck(cleaned)) {
    return { isValid: false, message: 'Invalid ID number (check digit failed)' };
  }

  // Extract and validate date of birth
  const dob = extractDateOfBirth(cleaned);
  if (!dob) {
    return { isValid: false, message: 'Invalid date of birth in ID number' };
  }

  // Check DOB is not in the future
  if (dob > new Date()) {
    return { isValid: false, message: 'Date of birth cannot be in the future' };
  }

  const age = calculateAge(dob);

  // Must be at least 18
  if (age < 18) {
    return { isValid: false, message: 'You must be at least 18 years old to register' };
  }

  // Gender: digits 6-9 (SSSS)
  const genderDigits = parseInt(cleaned.substring(6, 10), 10);
  const gender: 'male' | 'female' = genderDigits >= 5000 ? 'male' : 'female';

  // Citizenship: digit 10 (C)
  const citizenshipDigit = parseInt(cleaned[10], 10);
  if (citizenshipDigit !== 0 && citizenshipDigit !== 1) {
    return { isValid: false, message: 'Invalid citizenship digit in ID number' };
  }
  const citizenshipStatus: 'citizen' | 'permanent_resident' =
    citizenshipDigit === 0 ? 'citizen' : 'permanent_resident';

  return {
    isValid: true,
    dateOfBirth: dob,
    gender,
    citizenshipStatus,
    age,
  };
}
