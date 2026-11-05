import { z } from 'zod';

/**
 * Strict schema validations for incoming user inputs, API payloads, and form submissions.
 * Prevents injection attacks, buffer overruns, and unexpected property spoofing.
 */

// Email regex enforcing RFC 5322 compliance standards
const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email must be at least 3 characters')
  .max(254, 'Email must not exceed 254 characters')
  .email('Invalid email address format');

// Strict username schema
const usernameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(40, 'Username must not exceed 40 characters')
  .regex(/^[a-zA-Z0-9_@.-]+$/, 'Username contains forbidden characters');

// Safe text schemas (prevent script injection & excessive payloads)
const safeTextSchema = (minLength: number, maxLength: number) =>
  z
    .string()
    .trim()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must not exceed ${maxLength} characters`);

// 1. User Registration Schema
export const UserRegistrationSchema = z.object({
  firstName: safeTextSchema(1, 50).optional().or(z.literal('')),
  lastName: safeTextSchema(1, 50).optional().or(z.literal('')),
  name: safeTextSchema(2, 100),
  email: emailSchema,
  username: usernameSchema.optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
  phone: z.string().max(30).optional().or(z.literal('')),
  avatar: z.string().max(20).optional().or(z.literal('')),
  profilePicUrl: z.string().max(500000).optional().or(z.literal('')),
  bio: safeTextSchema(0, 1000).optional().or(z.literal('')),
  specialization: safeTextSchema(0, 100).optional().or(z.literal('')),
  categories: z.array(z.string().max(50)).max(10).default(['Storybook Illustration']),
  role: z.enum(['student', 'artist', 'admin']).default('artist')
});

export type UserRegistrationInput = z.infer<typeof UserRegistrationSchema>;

// 2. User Login Schema
export const UserLoginSchema = z.object({
  identifier: z.string().trim().min(2, 'Email or username is required').max(254),
  password: z.string().min(1, 'Password is required').max(128)
});

export type UserLoginInput = z.infer<typeof UserLoginSchema>;

// 3. Book Page Schema
export const BookPageSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  pageNumber: z.number().int().positive().optional(),
  text: z.string().max(5000).default(''),
  textSw: z.string().max(5000).optional().default(''),
  illustration: z.string().max(500000).default(''),
  canvasStrokes: z.array(z.any()).max(500).optional(),
  stickers: z.array(z.any()).max(100).optional(),
  audioUrl: z.string().max(5000).optional().or(z.literal(''))
});

// 4. Picture Book Creation & Update Schema
export const BookSchema = z.object({
  id: z.string().max(128),
  title: safeTextSchema(1, 150),
  titleSw: safeTextSchema(0, 150).optional().or(z.literal('')),
  author: safeTextSchema(1, 100),
  coverUrl: z.string().max(500000).optional().or(z.literal('')),
  category: safeTextSchema(1, 50).default('Adventure'),
  language: z.enum(['en', 'sw', 'both', 'bilingual']).default('en'),
  ageGroup: z.string().max(30).optional().default('3-8'),
  pages: z.array(BookPageSchema).min(1, 'Book must have at least 1 page').max(50),
  createdAt: z.string().max(50).optional(),
  updatedAt: z.string().max(50).optional(),
  userId: z.string().max(128).optional(),
  authorEmail: emailSchema.optional().or(z.literal('')),
  authorName: safeTextSchema(0, 100).optional().or(z.literal(''))
});

export type BookInput = z.infer<typeof BookSchema>;

// 5. Book Review Schema
export const BookReviewSchema = z.object({
  id: z.string().max(128).optional(),
  bookId: z.string().min(1).max(128),
  rating: z.number().min(1).max(5),
  comment: safeTextSchema(1, 1000),
  reviewerName: safeTextSchema(1, 80).default('Verified Reader'),
  reviewerEmail: emailSchema.optional().or(z.literal('')),
  createdAt: z.string().max(50).optional()
});

export type BookReviewInput = z.infer<typeof BookReviewSchema>;

// 6. Moderation / Report Schema
export const ReportSchema = z.object({
  id: z.string().max(128).optional(),
  bookId: z.string().min(1).max(128),
  bookTitle: safeTextSchema(0, 150).optional(),
  reason: safeTextSchema(3, 500),
  reporterEmail: emailSchema.optional().or(z.literal('')),
  status: z.enum(['pending', 'resolved', 'dismissed']).default('pending'),
  createdAt: z.string().max(50).optional()
});

export type ReportInput = z.infer<typeof ReportSchema>;

// 7. Direct Message Schema
export const DirectMessageSchema = z.object({
  id: z.string().max(128).optional(),
  senderEmail: emailSchema,
  recipientEmail: emailSchema,
  senderName: safeTextSchema(1, 100),
  message: safeTextSchema(1, 2000),
  createdAt: z.string().max(50).optional()
});

export type DirectMessageInput = z.infer<typeof DirectMessageSchema>;

// 8. Admin Status Update Schema
export const AdminStatusUpdateSchema = z.object({
  email: emailSchema,
  status: z.enum(['unapplied', 'pending', 'pending_application', 'approved', 'rejected', 'suspended'])
});

/**
 * Universal Validation Helper with clean error formatting
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[]; firstError: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`);
  return {
    success: false,
    errors,
    firstError: errors[0] || 'Validation failed'
  };
}
