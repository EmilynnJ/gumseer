import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  auth0Id: text('auth0_id').notNull().unique(),
  email: text('email').notNull().unique(),
  username: text('username').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role', { enum: ['client','reader','admin'] }).notNull().default('client'),
  bio: text('bio'),
  specialties: text('specialties').array(),
  profileImage: text('profile_image'),
  pricingChat: integer('pricing_chat'),
  pricingVoice: integer('pricing_voice'),
  pricingVideo: integer('pricing_video'),
  accountBalance: integer('account_balance').notNull().default(0),
  isOnline: boolean('is_online').notNull().default(false),
  stripeAccountId: text('stripe_account_id'),
  stripeCustomerId: text('stripe_customer_id'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  auth0Idx: uniqueIndex('auth0_id_idx').on(table.auth0Id),
  emailIdx: uniqueIndex('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
  onlineIdx: index('online_idx').on(table.isOnline),
}));

export const readings = pgTable('readings', {
  id: serial('id').primaryKey(),
  readerId: integer('reader_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: integer('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['chat','voice','video'] }).notNull(),
  status: text('status', { enum: ['pending','accepted','in_progress','completed','cancelled'] }).notNull().default('pending'),
  pricePerMinute: integer('price_per_minute').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  duration: integer('duration'),
  totalPrice: integer('total_price'),
  paymentStatus: text('payment_status', { enum: ['pending','paid','refunded'] }).notNull().default('pending'),
  chatTranscript: jsonb('chat_transcript'),
  rating: integer('rating'),
  review: text('review'),
  agoraChannel: text('agora_channel'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  readerIdx: index('readings_reader_idx').on(table.readerId),
  clientIdx: index('readings_client_idx').on(table.clientId),
  statusIdx: index('readings_status_idx').on(table.status),
}));

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['top_up','reading_charge','reader_credit','payout','adjustment'] }).notNull(),
  amount: integer('amount').notNull(),
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  readingId: integer('reading_id').references(() => readings.id, { onDelete: 'set null' }),
  stripeId: text('stripe_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('transactions_user_idx').on(table.userId),
  typeIdx: index('transactions_type_idx').on(table.type),
  createdIdx: index('transactions_created_idx').on(table.createdAt),
}));

export const forumPosts = pgTable('forum_posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category', { enum: ['General','Readings','Spiritual Growth','Ask a Reader','Announcements'] }).notNull(),
  flagCount: integer('flag_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('forum_posts_category_idx').on(table.category),
  createdIdx: index('forum_posts_created_idx').on(table.createdAt),
  userIdIdx: index('forum_posts_user_idx').on(table.userId),
}));

export const forumComments = pgTable('forum_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => forumPosts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  flagCount: integer('flag_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  postIdIdx: index('forum_comments_post_idx').on(table.postId),
  createdIdx: index('forum_comments_created_idx').on(table.createdAt),
}));

export const forumFlags = pgTable('forum_flags', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').references(() => forumPosts.id, { onDelete: 'cascade' }),
  commentId: integer('comment_id').references(() => forumComments.id, { onDelete: 'cascade' }),
  reporterId: integer('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
}, (table) => ({
  postIdIdx: index('forum_flags_post_idx').on(table.postId),
  commentIdIdx: index('forum_flags_comment_idx').on(table.commentId),
  reviewedIdx: index('forum_flags_reviewed_idx').on(table.reviewedAt),
}));

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('newsletter_email_idx').on(table.email),
}));

export const usersRelations = relations(users, ({ many }) => ({
  readingsAsReader: many(readings, { relationName: 'reader' }),
  readingsAsClient: many(readings, { relationName: 'client' }),
  transactions: many(transactions),
  forumPosts: many(forumPosts),
  forumComments: many(forumComments),
  forumFlags: many(forumFlags),
}));

export const readingsRelations = relations(readings, ({ one, many }) => ({
  reader: one(users, { fields: [readings.readerId], references: [users.id], relationName: 'reader' }),
  client: one(users, { fields: [readings.clientId], references: [users.id], relationName: 'client' }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  reading: one(readings, { fields: [transactions.readingId], references: [readings.id] }),
}));

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  author: one(users, { fields: [forumPosts.userId], references: [users.id] }),
  comments: many(forumComments),
  flags: many(forumFlags, { relationName: 'postFlags' }),
}));

export const forumCommentsRelations = relations(forumComments, ({ one, many }) => ({
  post: one(forumPosts, { fields: [forumComments.postId], references: [forumPosts.id] }),
  author: one(users, { fields: [forumComments.userId], references: [users.id] }),
  flags: many(forumFlags, { relationName: 'commentFlags' }),
}));

export const forumFlagsRelations = relations(forumFlags, ({ one }) => ({
  post: one(forumPosts, { fields: [forumFlags.postId], references: [forumPosts.id], relationName: 'postFlags' }),
  comment: one(forumComments, { fields: [forumFlags.commentId], references: [forumComments.id], relationName: 'commentFlags' }),
  reporter: one(users, { fields: [forumFlags.reporterId], references: [users.id] }),
}));

export const newsletterSubscribersRelations = relations(newsletterSubscribers, () => ({}));
