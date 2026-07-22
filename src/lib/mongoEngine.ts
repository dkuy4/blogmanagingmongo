/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PostDocument, Comment, AggregationResult, QueryLog } from '../types';
import { generateObjectId } from '../data/mockPosts';

const LOGS_STORAGE_KEY = 'mongo_blog_query_logs';

// Helper to check MongoDB connection status
export async function getDbStatus(): Promise<{ connected: boolean, database: string, uri: string }> {
  try {
    const res = await fetch('/api/db-status');
    return await res.json();
  } catch (e) {
    return { connected: false, database: '', uri: '' };
  }
}

// Initialize or load posts
export async function loadPostsFromStorage(): Promise<PostDocument[]> {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error("Failed to fetch posts");
    return await res.json();
  } catch (e) {
    console.error("Error fetching posts from backend:", e);
    return [];
  }
}

export function savePostsToStorage(posts: PostDocument[]) {
  // No-op since backend persists it to MongoDB or in-memory
}

// Reset Database
export async function resetDatabase(): Promise<PostDocument[]> {
  try {
    const res = await fetch('/api/reset-db', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      logQuery(data.shellCommand, data.posts.length, data.executionTimeMs);
      return data.posts;
    }
  } catch (e) {
    console.error("Failed to reset database:", e);
  }
  return [];
}

// Initialize or load logs
export function loadLogsFromStorage(): QueryLog[] {
  const data = localStorage.getItem(LOGS_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Error parsing query logs", e);
    }
  }
  return [];
}

export function saveLogsToStorage(logs: QueryLog[]) {
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(-50))); // Keep last 50 logs
}

export function clearLogs() {
  localStorage.removeItem(LOGS_STORAGE_KEY);
}

// Log a query execution
export function logQuery(operation: string, resultCount: number, executionTimeMs: number, queryDetails?: any) {
  const logs = loadLogsFromStorage();
  const newLog: QueryLog = {
    id: generateObjectId(),
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    operation,
    query: queryDetails ? JSON.stringify(queryDetails, null, 2) : '',
    resultCount,
    executionTimeMs
  };
  logs.unshift(newLog); // Prepend so newest is first
  saveLogsToStorage(logs);
  
  // Dispatch custom event to notify components
  window.dispatchEvent(new Event('mongo_query_logged'));
}

/**
 * ==========================================
 * CHAPTER 4 QUERY IMPLEMENTATIONS (LIVE API)
 * ==========================================
 */

// Q1: Complex Read Find (Filters, projection, sort, limit)
export async function runQuery1_ComplexFind(categoryName: string = 'Database', limit: number = 5): Promise<{ queryShell: string, results: any[] }> {
  try {
    const res = await fetch(`/api/queries/q1?category=${encodeURIComponent(categoryName)}&limit=${limit}`);
    const data = await res.json();
    logQuery(data.shellCommand, data.results.length, data.executionTimeMs);
    return { queryShell: data.shellCommand, results: data.results };
  } catch (e) {
    console.error("Error executing Q1:", e);
    return { queryShell: '', results: [] };
  }
}

// Q2: Atomic Metric Update ($inc view/like counts)
export async function runQuery2_AtomicUpdateMetric(slug: string, metric: 'views' | 'likes' | 'shares'): Promise<{ queryShell: string, post: PostDocument | null }> {
  try {
    const res = await fetch(`/api/posts/${slug}/metric`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ metric })
    });
    const data = await res.json();
    logQuery(data.shellCommand, data.post ? 1 : 0, data.executionTimeMs);
    return { queryShell: data.shellCommand, post: data.post };
  } catch (e) {
    console.error("Error executing Q2:", e);
    return { queryShell: '', post: null };
  }
}

// Q3: Subset Pattern Comment Push ($push with $slice)
export async function runQuery3_AddComment(slug: string, userName: string, text: string): Promise<{ queryShell: string, comment: Comment, post: PostDocument | null }> {
  try {
    const res = await fetch(`/api/posts/${slug}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userName, text })
    });
    const data = await res.json();
    logQuery(data.shellCommand, 1, data.executionTimeMs);
    return { queryShell: data.shellCommand, comment: data.comment, post: data.post };
  } catch (e) {
    console.error("Error executing Q3:", e);
    const defaultComment: Comment = { commentId: '', userName: '', text: '', createdAt: '' };
    return { queryShell: '', comment: defaultComment, post: null };
  }
}

// Q4: Aggregation Pipeline (Group by category, count posts, sum views, avg likes, sort)
export async function runQuery4_AggregationPipeline(): Promise<{ queryShell: string, results: AggregationResult[] }> {
  try {
    const res = await fetch('/api/queries/q4');
    const data = await res.json();
    logQuery(data.shellCommand, data.results.length, data.executionTimeMs);
    return { queryShell: data.shellCommand, results: data.results };
  } catch (e) {
    console.error("Error executing Q4:", e);
    return { queryShell: '', results: [] };
  }
}

// Q5: Delete Drafts Older than 30 Days
export async function runQuery5_DeleteOldDrafts(): Promise<{ queryShell: string, deletedCount: number, deletedTitles: string[] }> {
  try {
    const res = await fetch('/api/queries/q5', { method: 'DELETE' });
    const data = await res.json();
    logQuery(data.shellCommand, data.deletedCount, data.executionTimeMs);
    return {
      queryShell: data.shellCommand,
      deletedCount: data.deletedCount,
      deletedTitles: data.deletedTitles
    };
  } catch (e) {
    console.error("Error executing Q5:", e);
    return { queryShell: '', deletedCount: 0, deletedTitles: [] };
  }
}

// 4.2 End-to-End Use Case: Text Index / Full-text Search with Relevance Scoring
export async function runFullTextSearch(searchString: string): Promise<{ queryShell: string, results: { post: PostDocument, score: number }[] }> {
  try {
    const res = await fetch(`/api/queries/search?q=${encodeURIComponent(searchString)}`);
    const data = await res.json();
    logQuery(data.shellCommand, data.results.length, data.executionTimeMs);
    return { queryShell: data.shellCommand, results: data.results };
  } catch (e) {
    console.error("Error executing Text Search:", e);
    return { queryShell: '', results: [] };
  }
}

// Add New Article (InsertOne)
export async function runQuery_InsertOne(postData: Omit<PostDocument, '_id' | 'createdAt' | 'metrics' | 'recent_comments'>): Promise<{ queryShell: string, post: PostDocument }> {
  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });
    const data = await res.json();
    logQuery(data.shellCommand, 1, data.executionTimeMs);
    return { queryShell: data.shellCommand, post: data.post };
  } catch (e) {
    console.error("Error executing InsertOne:", e);
    throw e;
  }
}
