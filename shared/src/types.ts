import type { ReadingType, ReadingStatus, PaymentStatus, UserRole, TransactionType, ForumCategory } from './constants.js';

export interface User {
  id: number; auth0Id: string; email: string; username: string; fullName: string;
  role: UserRole; bio: string | null; specialties: string[] | null; profileImage: string | null;
  pricingChat: number | null; pricingVoice: number | null; pricingVideo: number | null;
  accountBalance: number; isOnline: boolean; stripeAccountId: string | null;
  stripeCustomerId: string | null; onboardingComplete: boolean; createdAt: string;
}

export interface ChatMessage { userId: number; username: string; text: string; timestamp: string; }

export interface Reading {
  id: number; readerId: number; clientId: number; type: ReadingType; status: ReadingStatus;
  pricePerMinute: number; startedAt: string | null; completedAt: string | null;
  duration: number | null; totalPrice: number | null; paymentStatus: PaymentStatus;
  chatTranscript: ChatMessage[] | null; rating: number | null; review: string | null;
  agoraChannel: string | null; createdAt: string;
}

export interface Transaction {
  id: number; userId: number; type: TransactionType; amount: number;
  balanceBefore: number; balanceAfter: number; readingId: number | null;
  stripeId: string | null; note: string | null; createdAt: string;
}

export interface ForumPost {
  id: number; userId: number; title: string; content: string; category: ForumCategory;
  flagCount: number; createdAt: string; authorName?: string; commentCount?: number;
}

export interface ForumComment {
  id: number; postId: number; userId: number; content: string; flagCount: number;
  createdAt: string; authorName?: string;
}

export interface ForumFlag {
  id: number; postId: number | null; commentId: number | null; reporterId: number;
  reason: string; reviewedAt: string | null;
}

export interface ApiResponse<T> { success: true; data: T; }
export interface ApiErrorResponse { success: false; error: { message: string; code?: string; details?: unknown; }; }
export interface PaginatedResponse<T> {
  success: true; data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number; };
}

export interface CreateReadingRequest { type: ReadingType; readerId: number; }
export interface CreatePostRequest { title: string; content: string; category: ForumCategory; }
export interface CreateCommentRequest { content: string; }
export interface RateReadingRequest { rating: number; review?: string; }
export interface UpdatePricingRequest { pricingChat: number; pricingVoice: number; pricingVideo: number; }
export interface UpdateProfileRequest { bio?: string; specialties?: string[]; }
export interface BalanceAdjustRequest { userId: number; amount: number; note: string; }
export interface CreateReaderRequest { fullName: string; email: string; username: string; bio: string; specialties: string[]; pricingChat: number; pricingVoice: number; pricingVideo: number; }
export interface NewsletterSignupRequest { email: string; }
export interface TopUpRequest { amount: number; }
export interface ReadingSessionState { readingId: number; type: ReadingType; status: ReadingStatus; elapsedSeconds: number; currentCost: number; clientBalance: number; lowBalance: boolean; }
export interface BillingStatus { isActive: boolean; startedAt: string | null; elapsedSeconds: number; totalCost: number; nextTickAt: string | null; }
export interface CreatePaymentIntentResponse { clientSecret: string; amount: number; }
