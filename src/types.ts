/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Author {
  userId: string;
  name: string;
  avatarUrl: string;
}

export interface Category {
  categoryId: string;
  name: string;
}

export interface Comment {
  commentId: string;
  userName: string;
  text: string;
  createdAt: string; // ISO Date String
}

export interface Metrics {
  views: number;
  likes: number;
  shares: number;
}

export interface PostDocument {
  _id: string; // Simulates MongoDB ObjectId
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'published' | 'draft';
  createdAt: string; // ISO Date String
  authorId: string; // Reference to Authors collection (userId)
  author: Author; // Populated Author object
  category: Category;
  tags: string[];
  metrics: Metrics;
  recent_comments: Comment[]; // Embedded recent comments (Subset Pattern)
}

export interface QueryLog {
  id: string;
  timestamp: string;
  operation: string; // e.g. "db.Posts.find"
  query: string; // Formatted query string
  resultCount: number;
  executionTimeMs: number;
}

export interface AggregationResult {
  _id: string; // Category name
  totalPosts: number;
  totalViews: number;
  averageLikes: number;
}
