/**
 * Zod v4 Validation Middleware & Schemas
 * Centralised input validation for all API endpoints
 */
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { TransactionType, PaymentMethod } from '../utils/enums';

// ============================================
//  GENERIC MIDDLEWARE FACTORY
// ============================================

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Creates an Express middleware that validates `req[target]` against a Zod schema.
 * Returns 400 with structured errors on failure.
 */
export function validate(schema: z.ZodTypeAny, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }
    // Replace target with cleaned/transformed data
    (req as any)[target] = result.data;
    next();
  };
}

// ============================================
//  REUSABLE FIELD SCHEMAS
// ============================================

/** Phone number: E.164 (+27...) or local SA format (0XX...), 7-15 digits */
const phoneNumber = z
  .string({ error: 'Phone number is required' })
  .trim()
  .min(1, 'Phone number is required')
  .regex(/^(\+?[1-9]\d{6,14}|0\d{9})$/, 'Invalid phone number format');

/** 5-digit numeric PIN */
const pin = z
  .string({ error: 'PIN is required' })
  .length(5, 'PIN must be exactly 5 digits')
  .regex(/^\d{5}$/, 'PIN must contain only digits');

const firstName = z
  .string({ error: 'First name is required' })
  .trim()
  .min(2, 'First name must be at least 2 characters')
  .max(50, 'First name must be at most 50 characters');

const lastName = z
  .string({ error: 'Last name is required' })
  .trim()
  .min(1, 'Last name is required')
  .max(50, 'Last name must be at most 50 characters');

const idNumber = z
  .string({ error: 'ID number is required' })
  .trim()
  .regex(/^\d{13}$/, 'ID number must be exactly 13 digits');

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .email('Invalid email format');

const groupId = z
  .string({ error: 'Group ID is required' })
  .min(1, 'Group ID is required');

const positiveAmount = z.coerce
  .number({ error: 'Amount is required' })
  .positive('Amount must be greater than 0');

// ============================================
//  AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  phoneNumber: z
    .string({ error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone number is required'),
  pin: z
    .string({ error: 'PIN is required' })
    .min(1, 'PIN is required'),
});

export const superadminLoginSchema = z.object({
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const changePinSchema = z.object({
  currentPin: z.string({ error: 'Current PIN is required' }).min(1, 'Current PIN is required'),
  newPin: pin,
});

export const createAdminSchema = z.object({
  phoneNumber,
  firstName,
  lastName,
});

export const addMemberSchema = z.object({
  phoneNumber,
  firstName,
  lastName,
  groupId,
});

// ============================================
//  FORGOT PIN SCHEMAS
// ============================================

export const forgotPinRequestSchema = z.object({
  phoneNumber: z
    .string({ error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone number is required'),
});

export const forgotPinVerifySchema = z.object({
  phoneNumber: z
    .string({ error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone number is required'),
  otp: z
    .string({ error: 'OTP is required' })
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export const forgotPinResetSchema = z.object({
  sessionToken: z
    .string({ error: 'Session token is required' })
    .min(1, 'Session token is required'),
  newPin: pin,
});

// ============================================
//  ADMIN SELF-REGISTRATION SCHEMA
// ============================================

export const adminRegisterSchema = z.object({
  phoneNumber,
  firstName,
  lastName,
  idNumber,
});

// ============================================
//  ID VERIFICATION SCHEMA
// ============================================

export const submitIdSchema = z.object({
  idNumber,
});

// ============================================
//  GROUP SCHEMAS
// ============================================

export const createGroupSchema = z.object({
  name: z
    .string({ error: 'Group name is required' })
    .trim()
    .min(2, 'Group name must be at least 2 characters')
    .max(100, 'Group name must be at most 100 characters'),
  description: z.string().trim().max(500).optional(),
  contributionAmount: z.coerce.number().positive().optional(),
  contributionFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  payoutModel: z.enum(['ROTATING', 'END_OF_TERM']).optional(),
  durationMonths: z.coerce.number().int().min(1).max(120).optional(),
  currency: z.string().length(3).default('ZAR'),
  meetingSchedule: z.string().max(200).optional(),
}).superRefine((data, ctx) => {
  // END_OF_TERM model requires explicit durationMonths
  if (data.payoutModel === 'END_OF_TERM' && !data.durationMonths) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationMonths'],
      message: 'Duration (months) is required for End of Term payout model',
    });
  }
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  contributionAmount: z.coerce.number().positive().optional(),
  contributionFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  currency: z.string().length(3).optional(),
  meetingSchedule: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  payoutDate: z.coerce.date().optional(),
});

// ============================================
//  TRANSACTION SCHEMAS
// ============================================

const transactionTypeValues = Object.values(TransactionType) as [string, ...string[]];
const paymentMethodValues = Object.values(PaymentMethod) as [string, ...string[]];

const transactionTypeEnum = z.enum(transactionTypeValues, {
  error: `Invalid transaction type. Valid: ${transactionTypeValues.join(', ')}`,
});

const paymentMethodEnum = z.enum(paymentMethodValues, {
  error: `Invalid payment method. Valid: ${paymentMethodValues.join(', ')}`,
});

export const createTransactionSchema = z.object({
  stokvelGroupId: z.string({ error: 'Group ID is required' }).min(1),
  memberId: z.string().optional(),
  transactionType: transactionTypeEnum,
  amount: positiveAmount,
  paymentMethod: paymentMethodEnum,
  transactionDate: z.coerce.date().optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  metadata: z.any().optional(),
});

export const contributeSchema = z.object({
  stokvelGroupId: z.string({ error: 'Group ID is required' }).min(1),
  amount: positiveAmount,
  paymentMethod: paymentMethodEnum.optional(),
  notes: z.string().max(500).optional(),
});

// ============================================
//  CHAT SCHEMAS
// ============================================

// Helper: Strip HTML tags from user input to prevent stored XSS
const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '');

export const sendMessageSchema = z.object({
  stokvelGroupId: z.string({ error: 'Group ID is required' }).min(1),
  message: z
    .string({ error: 'Message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be at most 1000 characters')
    .transform(stripHtml),
  messageType: z.string().optional(),
});

// ============================================
//  ANNOUNCEMENT SCHEMAS
// ============================================

export const createAnnouncementSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .transform(stripHtml),
  content: z
    .string({ error: 'Content is required' })
    .trim()
    .min(1, 'Content is required')
    .max(2000, 'Content must be at most 2000 characters')
    .transform(stripHtml),
  groupId,
  pinned: z.boolean().default(false),
  expiresAt: z.coerce.date().optional(),
});

// ============================================
//  MEETING SCHEMAS
// ============================================

export const createMeetingSchema = z.object({
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().max(1000).optional(),
  date: z.coerce.date({ error: 'Date is required' }),
  location: z
    .string()
    .trim()
    .max(300, 'Location must be at most 300 characters')
    .optional(),
  groupId,
});

// ============================================
//  PAYMENT SCHEMAS
// ============================================

export const updateBankDetailsSchema = z.object({
  bankName: z
    .string({ error: 'Bank name is required' })
    .trim()
    .min(1, 'Bank name is required')
    .max(100),
  accountNumber: z
    .string({ error: 'Account number is required' })
    .trim()
    .min(1, 'Account number is required')
    .max(30),
  accountHolder: z
    .string({ error: 'Account holder is required' })
    .trim()
    .min(1, 'Account holder is required')
    .max(100),
  branchCode: z.string().trim().max(20).optional().nullable(),
});

export const initiateOzowPaymentSchema = z.object({
  groupId,
  amount: positiveAmount,
  bankReference: z.string().max(100).optional(),
});

// ============================================
//  PARAM SCHEMAS (for route params/query)
// ============================================

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const groupIdParamSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
});
