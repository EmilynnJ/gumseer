import { z } from 'zod';
import { READING_TYPES, FORUM_CATEGORIES, MAX_BIO_LENGTH, MAX_POST_TITLE_LENGTH, MAX_POST_CONTENT_LENGTH, MAX_COMMENT_LENGTH, MAX_REVIEW_LENGTH, MAX_SPECIALTIES, MAX_RATE_PER_MINUTE, MIN_TOPUP, MAX_USERNAME_LENGTH, MAX_FULLNAME_LENGTH } from './constants.js';

export const createReadingSchema = z.object({ type: z.enum(READING_TYPES), readerId: z.number().int().positive() });
export const createPostSchema = z.object({ title: z.string().min(1).max(MAX_POST_TITLE_LENGTH), content: z.string().min(1).max(MAX_POST_CONTENT_LENGTH), category: z.enum(FORUM_CATEGORIES) });
export const createCommentSchema = z.object({ content: z.string().min(1).max(MAX_COMMENT_LENGTH) });
export const rateReadingSchema = z.object({ rating: z.number().int().min(1).max(5), review: z.string().max(MAX_REVIEW_LENGTH).optional() });
export const updatePricingSchema = z.object({ pricingChat: z.number().int().positive().max(MAX_RATE_PER_MINUTE), pricingVoice: z.number().int().positive().max(MAX_RATE_PER_MINUTE), pricingVideo: z.number().int().positive().max(MAX_RATE_PER_MINUTE) });
export const updateProfileSchema = z.object({ bio: z.string().max(MAX_BIO_LENGTH).optional(), specialties: z.array(z.string().min(1).max(50)).max(MAX_SPECIALTIES).optional() });
export const balanceAdjustSchema = z.object({ userId: z.number().int().positive(), amount: z.number().int(), note: z.string().min(1).max(500) });
export const createReaderSchema = z.object({ fullName: z.string().min(1).max(MAX_FULLNAME_LENGTH), email: z.string().email().max(255), username: z.string().min(1).max(MAX_USERNAME_LENGTH), bio: z.string().min(1).max(MAX_BIO_LENGTH), specialties: z.array(z.string().min(1).max(50)).min(1).max(MAX_SPECIALTIES), pricingChat: z.number().int().positive().max(MAX_RATE_PER_MINUTE), pricingVoice: z.number().int().positive().max(MAX_RATE_PER_MINUTE), pricingVideo: z.number().int().positive().max(MAX_RATE_PER_MINUTE) });
export const newsletterSignupSchema = z.object({ email: z.string().email().max(255) });
export const topUpSchema = z.object({ amount: z.number().int().min(MIN_TOPUP).max(500000) });
export const paginationSchema = z.object({ page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().min(1).max(50).default(10) });
export const flagContentSchema = z.object({ reason: z.string().min(1).max(500) });
