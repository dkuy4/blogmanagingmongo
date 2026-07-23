import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { MongoClient, ObjectId } from "mongodb";
import { getMockPosts, initialAuthors } from "./src/data/mockPosts.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// MONGODB CONNECTION SETUP
// ==========================================
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = "mongodb_blog_cms";
let mongoClient: MongoClient | null = null;
let isMongoConnected = false;
let mongoConnectPromise: Promise<void> | null = null;

async function connectToMongo() {
  if (isMongoConnected && mongoClient) return;
  if (!mongoConnectPromise) {
    mongoConnectPromise = (async () => {
      try {
        if (!mongoClient) {
          mongoClient = new MongoClient(mongoUri, {
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000
          });
        }
        await mongoClient.connect();
        isMongoConnected = true;
        console.log(`[MongoDB] Connected successfully to ${mongoUri}`);
        
        const db = mongoClient.db(dbName);

        // Populate Authors collection if empty
        const authorsCollection = db.collection("Authors");
        const authorCount = await authorsCollection.countDocuments();
        if (authorCount === 0) {
          console.log("[MongoDB] Authors collection is empty. Populating 3 initial authors...");
          await authorsCollection.insertMany(initialAuthors as any);
        }

        const collection = db.collection("Posts");
        
        // Create text index for full-text search
        await collection.createIndex(
          { title: "text", content: "text", excerpt: "text" },
          { weights: { title: 10, excerpt: 3, content: 1 }, name: "TextIndex" }
        ).catch(() => {});

        // Initialize database if empty
        const count = await collection.countDocuments();
        if (count === 0) {
          console.log("[MongoDB] Posts collection is empty. Populating with 52 mock posts...");
          const mockPosts = getMockPosts();
          const postsToInsert = mockPosts.map(p => {
            const { author, ...rest } = p;
            return {
              ...rest,
              authorId: p.authorId || p.author?.userId || initialAuthors[0].userId
            };
          });
          await collection.insertMany(postsToInsert as any);
          console.log(`[MongoDB] Successfully populated database with ${mockPosts.length} mock posts.`);
        }
      } catch (error) {
        isMongoConnected = false;
        mongoConnectPromise = null;
        console.error("[MongoDB] Failed to connect to MongoDB:", error);
        console.log("[MongoDB] Running server in Simulated Fallback Mode (in-memory).");
      }
    })();
  }
  await mongoConnectPromise;
}

connectToMongo();

// Middleware to ensure DB connection is attempted before handling API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    await connectToMongo();
  }
  next();
});

// ==========================================
// IN-MEMORY FALLBACK (if MongoDB is offline)
// ==========================================
let fallbackPosts = getMockPosts();

function getLocalPosts() {
  return fallbackPosts;
}

function saveLocalPosts(posts: any[]) {
  fallbackPosts = posts;
}

// ==========================================
// GEMINI CLIENT SETUP
// ==========================================
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ==========================================
// API ENDPOINTS FOR THE CMS & QUERY LAB
// ==========================================

// 1. Connection status endpoint
app.get("/api/db-status", (req, res) => {
  res.json({
    connected: isMongoConnected,
    database: dbName,
    uri: mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@") // Hide credentials in URI if any
  });
});

// 2. Reset database endpoint
app.post("/api/reset-db", async (req, res) => {
  const start = performance.now();
  try {
    const mockPosts = getMockPosts();
    const shellCommand = `db.Authors.drop();
db.createCollection("Authors");
db.Authors.insertMany([...${initialAuthors.length} authors...]);
db.Posts.drop();
db.createCollection("Posts");
db.Posts.insertMany([...${mockPosts.length} documents with authorId...]);`;
    
    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      
      // Reset Authors collection
      await db.collection("Authors").drop().catch(() => {});
      await db.collection("Authors").insertMany(initialAuthors as any);

      // Reset Posts collection
      await db.collection("Posts").drop().catch(() => {});
      
      // Re-create text index
      await db.collection("Posts").createIndex(
        { title: "text", content: "text", excerpt: "text" },
        { weights: { title: 10, excerpt: 3, content: 1 }, name: "TextIndex" }
      );
      
      const postsToInsert = mockPosts.map(p => {
        const { author, ...rest } = p;
        return {
          ...rest,
          authorId: p.authorId || p.author?.userId || initialAuthors[0].userId
        };
      });
      
      await db.collection("Posts").insertMany(postsToInsert as any);
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      return res.json({
        success: true,
        posts: mockPosts,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      fallbackPosts = mockPosts;
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      return res.json({
        success: true,
        posts: fallbackPosts,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch authors
app.get("/api/authors", async (req, res) => {
  try {
    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const authors = await db.collection("Authors").find({}).toArray();
      res.json(authors);
    } else {
      res.json(initialAuthors);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get all posts or filtered posts (with $lookup from Authors collection)
app.get("/api/posts", async (req, res) => {
  try {
    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const filter: any = {};
      
      if (req.query.category && req.query.category !== "All") {
        filter["category.name"] = req.query.category;
      }
      
      if (req.query.status) {
        filter.status = req.query.status;
      }
      
      const pipeline: any[] = [];
      if (Object.keys(filter).length > 0) {
        pipeline.push({ $match: filter });
      }
      
      pipeline.push(
        {
          $lookup: {
            from: "Authors",
            localField: "authorId",
            foreignField: "userId",
            as: "authorDetails"
          }
        },
        {
          $addFields: {
            author: { $arrayElemAt: ["$authorDetails", 0] }
          }
        },
        {
          $project: { authorDetails: 0 }
        }
      );
      
      const posts = await db.collection("Posts").aggregate(pipeline).toArray();
      res.json(posts);
    } else {
      // In-memory fallback filtering
      let posts = getLocalPosts();
      if (req.query.category && req.query.category !== "All") {
        posts = posts.filter(p => p.category.name === req.query.category);
      }
      if (req.query.status) {
        posts = posts.filter(p => p.status === req.query.status);
      }
      res.json(posts);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Create new post (InsertOne storing authorId)
app.post("/api/posts", async (req, res) => {
  const start = performance.now();
  try {
    const postData = req.body;
    const authorObj = postData.author || initialAuthors.find(a => a.userId === postData.authorId) || initialAuthors[0];
    const authorId = postData.authorId || authorObj.userId;

    const newPostDoc: any = {
      ...postData,
      _id: new ObjectId().toString(),
      authorId,
      createdAt: new Date().toISOString(),
      metrics: { views: 1, likes: 0, shares: 0 },
      recent_comments: []
    };
    delete newPostDoc.author; // Clean embedded author object to store authorId reference only

    const shellCommand = `db.Posts.insertOne({
  title: "${newPostDoc.title}",
  slug: "${newPostDoc.slug}",
  content: "...", // Content truncated
  status: "${newPostDoc.status}",
  createdAt: new Date(),
  authorId: "${authorId}", // Reference to Authors collection
  category: { name: "${newPostDoc.category.name}" },
  tags: ${JSON.stringify(newPostDoc.tags)}
});`;

    const responsePost = {
      ...newPostDoc,
      author: authorObj
    };

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      await db.collection("Posts").insertOne(newPostDoc);
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        post: responsePost,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      posts.unshift(responsePost as any);
      saveLocalPosts(posts);
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        post: responsePost,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update views/likes/shares ($inc)
app.post("/api/posts/:slug/metric", async (req, res) => {
  const start = performance.now();
  try {
    const { slug } = req.params;
    const { metric } = req.body;
    
    if (!["views", "likes", "shares"].includes(metric)) {
      return res.status(400).json({ error: "Invalid metric" });
    }
    
    const shellCommand = `db.Posts.updateOne(
  { slug: "${slug}" },
  { $inc: { "metrics.${metric}": 1 } }
);`;

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const result = await db.collection("Posts").findOneAndUpdate(
        { slug },
        { $inc: { [`metrics.${metric}`]: 1 } },
        { returnDocument: "after" }
      );
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        post: result,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      const index = posts.findIndex(p => p.slug === slug);
      if (index !== -1) {
        const mKey = metric as 'views' | 'likes' | 'shares';
        posts[index].metrics[mKey] += 1;
        saveLocalPosts(posts);
      }
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        post: index !== -1 ? posts[index] : null,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Add comment (Subset Pattern: $push with $slice)
app.post("/api/posts/:slug/comments", async (req, res) => {
  const start = performance.now();
  try {
    const { slug } = req.params;
    const { userName, text } = req.body;
    
    const commentId = new ObjectId().toString();
    const createdAt = new Date().toISOString();
    const newComment = {
      commentId,
      userName: userName || "Khách viếng thăm",
      text,
      createdAt
    };
    
    const shellCommand = `db.Posts.updateOne(
  { slug: "${slug}" },
  { 
    $push: { 
      recent_comments: { 
        $each: [{ 
          commentId: ObjectId("${commentId}"), 
          userName: "${newComment.userName}", 
          text: "${newComment.text}", 
          createdAt: ISODate("${createdAt}") 
        }], 
        $position: 0,
        $slice: 20
      }
    } 
  }
);`;

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const result = await db.collection("Posts").findOneAndUpdate(
        { slug },
        {
          $push: {
            recent_comments: {
              $each: [newComment],
              $position: 0,
              $slice: 20
            }
          } as any
        },
        { returnDocument: "after" }
      );
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        comment: newComment,
        post: result,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      const index = posts.findIndex(p => p.slug === slug);
      if (index !== -1) {
        posts[index].recent_comments.unshift(newComment);
        if (posts[index].recent_comments.length > 20) {
          posts[index].recent_comments = posts[index].recent_comments.slice(0, 20);
        }
        saveLocalPosts(posts);
      }
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        success: true,
        comment: newComment,
        post: index !== -1 ? posts[index] : null,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Q1: Complex Read Find with $lookup from Authors collection
app.get("/api/queries/q1", async (req, res) => {
  const start = performance.now();
  try {
    const categoryName = (req.query.category as string) || "Database";
    const limit = parseInt(req.query.limit as string) || 5;
    
    const shellCommand = `db.Posts.aggregate([
  { $match: { status: "published", "category.name": "${categoryName}" } },
  { 
    $lookup: { 
      from: "Authors", 
      localField: "authorId", 
      foreignField: "userId", 
      as: "author" 
    } 
  },
  { $unwind: "$author" },
  { 
    $project: { 
      title: 1, 
      slug: 1, 
      "author.name": 1, 
      metrics: 1, 
      createdAt: 1, 
      _id: 0 
    } 
  },
  { $sort: { createdAt: -1 } },
  { $limit: ${limit} }
]);`;

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const results = await db.collection("Posts").aggregate([
        { $match: { status: "published", "category.name": categoryName } },
        {
          $lookup: {
            from: "Authors",
            localField: "authorId",
            foreignField: "userId",
            as: "author"
          }
        },
        { $unwind: "$author" },
        {
          $project: {
            title: 1,
            slug: 1,
            "author.name": 1,
            metrics: 1,
            createdAt: 1,
            _id: 0
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: limit }
      ]).toArray();
        
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      let filtered = posts.filter(p => p.status === 'published' && p.category.name === categoryName);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const limited = filtered.slice(0, limit);
      const projected = limited.map(p => ({
        title: p.title,
        slug: p.slug,
        "author.name": p.author?.name || 'Trần Quang Mạnh',
        metrics: p.metrics,
        createdAt: p.createdAt
      }));
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results: projected,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Q4: Aggregation Pipeline
app.get("/api/queries/q4", async (req, res) => {
  const start = performance.now();
  try {
    const shellCommand = `db.Posts.aggregate([
  { $match: { status: "published" } },
  { 
    $group: { 
      _id: "$category.name",
      totalPosts: { $sum: 1 },
      totalViews: { $sum: "$metrics.views" },
      averageLikes: { $avg: "$metrics.likes" }
    } 
  },
  { $sort: { totalViews: -1 } }
]);`;

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const pipeline = [
        { $match: { status: "published" } },
        {
          $group: {
            _id: "$category.name",
            totalPosts: { $sum: 1 },
            totalViews: { $sum: "$metrics.views" },
            averageLikes: { $avg: "$metrics.likes" }
          }
        },
        { $sort: { totalViews: -1 } }
      ];
      
      const resultsRaw = await db.collection("Posts").aggregate(pipeline).toArray();
      const results = resultsRaw.map(r => ({
        _id: r._id,
        totalPosts: r.totalPosts,
        totalViews: r.totalViews,
        averageLikes: Math.round((r.averageLikes || 0) * 10) / 10
      }));
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      const published = posts.filter(p => p.status === 'published');
      const categoryGroups: { [key: string]: { count: number, views: number, totalLikes: number } } = {};
      
      published.forEach(p => {
        const catName = p.category.name;
        if (!categoryGroups[catName]) {
          categoryGroups[catName] = { count: 0, views: 0, totalLikes: 0 };
        }
        categoryGroups[catName].count += 1;
        categoryGroups[catName].views += (p.metrics.views || 0);
        categoryGroups[catName].totalLikes += (p.metrics.likes || 0);
      });
      
      let results = Object.keys(categoryGroups).map(catName => ({
        _id: catName,
        totalPosts: categoryGroups[catName].count,
        totalViews: categoryGroups[catName].views,
        averageLikes: Math.round((categoryGroups[catName].totalLikes / categoryGroups[catName].count) * 10) / 10
      }));
      results.sort((a, b) => b.totalViews - a.totalViews);
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Q5: Delete Drafts Older than 30 Days
app.delete("/api/queries/q5", async (req, res) => {
  const start = performance.now();
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const shellCommand = `var thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
db.Posts.deleteMany({ 
  status: "draft", 
  createdAt: { $lt: thirtyDaysAgo } 
});`;

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const filter = {
        status: "draft",
        createdAt: { $lt: thirtyDaysAgo.toISOString() }
      };
      
      const deleteTargets = await db.collection("Posts").find(filter, { projection: { title: 1 } }).toArray();
      const deletedTitles = deleteTargets.map(t => t.title);
      const result = await db.collection("Posts").deleteMany(filter);
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        deletedCount: result.deletedCount,
        deletedTitles,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      const posts = getLocalPosts();
      const keepPosts: any[] = [];
      const deletePosts: any[] = [];
      
      posts.forEach(p => {
        const postDate = new Date(p.createdAt);
        if (p.status === 'draft' && postDate < thirtyDaysAgo) {
          deletePosts.push(p);
        } else {
          keepPosts.push(p);
        }
      });
      
      saveLocalPosts(keepPosts);
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        deletedCount: deletePosts.length,
        deletedTitles: deletePosts.map(p => p.title),
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. E2E: Full Text Search
app.get("/api/queries/search", async (req, res) => {
  const start = performance.now();
  try {
    const searchString = (req.query.q as string) || "";
    
    const shellCommand = `db.Posts.find(
  { status: "published", $text: { $search: "${searchString}" } },
  { score: { $meta: "textScore" }, title: 1, slug: 1, _id: 0 }
).sort({ score: { $meta: "textScore" } });`;

    if (!searchString.trim()) {
      return res.json({
        results: [],
        shellCommand: `db.Posts.find({ $text: { $search: "" } })`,
        executionTimeMs: 1
      });
    }

    if (isMongoConnected && mongoClient) {
      const db = mongoClient.db(dbName);
      const resultsRaw = await db.collection("Posts")
        .find(
          { 
            status: "published",
            $text: { $search: searchString } 
          },
          {
            projection: {
              score: { $meta: "textScore" },
              title: 1,
              slug: 1,
              content: 1,
              excerpt: 1,
              status: 1,
              createdAt: 1,
              author: 1,
              category: 1,
              tags: 1,
              metrics: 1,
              recent_comments: 1
            }
          }
        )
        .sort({ score: { $meta: "textScore" } })
        .toArray();
        
      const results = resultsRaw.map(r => ({
        post: {
          ...r,
          score: undefined
        },
        score: Math.round((r.score || 0) * 10) / 10
      }));
      
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results,
        shellCommand,
        executionTimeMs: execTime
      });
    } else {
      // Full text search fallback simulation in JS
      const posts = getLocalPosts();
      const searchTerms = searchString.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
      const matched: any[] = [];
      const stopWords = ['và', 'với', 'trong', 'của', 'về', 'là', 'các', 'cho', 'một', 'những', 'để'];
      const filteredTerms = searchTerms.filter(term => !stopWords.includes(term));
      
      posts.forEach(p => {
        if (p.status !== 'published') return;
        let score = 0;
        const titleLower = p.title.toLowerCase();
        const contentLower = p.content.toLowerCase();
        
        const cleanSearchString = searchString.toLowerCase().trim();
        if (titleLower.includes(cleanSearchString)) {
          score += 2.0;
        } else if (contentLower.includes(cleanSearchString)) {
          score += 1.0;
        }
        
        filteredTerms.forEach(term => {
          const titleMatches = (titleLower.match(new RegExp(term, 'g')) || []).length;
          score += titleMatches * 1.0;
          const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
          score += contentMatches * 0.4;
          const tagMatches = p.tags.filter(tag => tag.toLowerCase().includes(term)).length;
          score += tagMatches * 0.8;
        });
        
        if (score > 0) {
          matched.push({ post: p, score: Math.round(score * 10) / 10 });
        }
      });
      
      matched.sort((a, b) => b.score - a.score);
      const end = performance.now();
      const execTime = Math.max(1, Math.round(end - start));
      
      res.json({
        results: matched,
        shellCommand,
        executionTimeMs: execTime
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for Gemini-powered blog generation
app.post("/api/generate-post", async (req, res) => {
  try {
    const { topic, category } = req.body;
    let ai;
    try {
      ai = getGeminiClient();
    } catch (e: any) {
      return res.status(400).json({ 
        error: "Vui lòng cấu hình API Key của Gemini trong phần Secrets của Google AI Studio (GEMINI_API_KEY) để sử dụng tính năng AI viết bài." 
      });
    }
    
    const prompt = `Viết một bài viết blog chuyên sâu bằng tiếng Việt về chủ đề: "${topic}" thuộc chuyên mục "${category || "Database"}".
Bài viết cần có cấu trúc chuyên nghiệp, có phần mở đầu, nội dung chi tiết chứa mã nguồn hoặc ví dụ nếu cần, định dạng HTML đơn giản (sử dụng các thẻ <p>, <h3>, <strong>, <pre><code>...</code></pre>).
Hãy trả về kết quả dưới dạng JSON có cấu trúc chính xác sau:
{
  "title": "Tiêu đề hấp dẫn của bài viết",
  "content": "<p>Nội dung chi tiết viết dưới dạng HTML...</p>",
  "excerpt": "Tóm tắt ngắn gọn khoảng 2-3 câu về bài viết",
  "tags": ["Từ_khóa_1", "Từ_khóa_2", "Từ_khóa_3", "Từ_khóa_4"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "content", "excerpt", "tags"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(response.text.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: error.message || "Không thể tự động tạo nội dung bằng Gemini AI." });
  }
});

// Serve frontend with Vite middleware
async function setupServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupServer();

export default app;
