/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Database, BookOpen, Terminal, Settings, Search, Sparkles, Trash2, 
  BarChart3, PlusCircle, RefreshCw, Compass, ThumbsUp, Share2, 
  MessageSquare, Calendar, User, Tag, ChevronRight, Info, FileText, 
  CheckCircle, AlertCircle, GitCompare, X, Send, Eye, ShieldAlert, ArrowRight,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  loadPostsFromStorage, resetDatabase, loadLogsFromStorage, 
  clearLogs, runQuery1_ComplexFind, runQuery2_AtomicUpdateMetric, 
  runQuery3_AddComment, runQuery4_AggregationPipeline, runQuery5_DeleteOldDrafts, 
  runFullTextSearch, runQuery_InsertOne, getDbStatus
} from './lib/mongoEngine';
import { initialAuthors, initialCategories, generateObjectId } from './data/mockPosts';
import { PostDocument, Comment, QueryLog, AggregationResult } from './types';

export default function App() {
  // Database States
  const [posts, setPosts] = useState<PostDocument[]>([]);
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostDocument | null>(null);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean, database: string, uri: string }>({ connected: false, database: '', uri: '' });
  const [isLogsMinimized, setIsLogsMinimized] = useState<boolean>(false);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'reader' | 'admin' | 'queryLab' | 'docs'>('reader');
  
  // Filter & Search States (Reader)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchText, setSearchText] = useState<string>('');
  const [searchScoreResults, setSearchScoreResults] = useState<{ post: PostDocument, score: number }[]>([]);
  const [isSearchingText, setIsSearchingText] = useState<boolean>(false);
  
  // Comment Form State
  const [commentName, setCommentName] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [commentSubmitted, setCommentSubmitted] = useState<boolean>(false);

  // Admin Form States
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Database');
  const [newExcerpt, setNewExcerpt] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newTags, setNewTags] = useState<string>('MongoDB, NoSQL, Tutorial');
  const [newStatus, setNewStatus] = useState<'published' | 'draft'>('published');
  const [formAuthor, setFormAuthor] = useState<string>('Trần Quang Mạnh');
  
  // AI Assistant States
  const [aiTopic, setAiTopic] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string>('');

  // Query Lab States
  const [q1Category, setQ1Category] = useState<string>('Database');
  const [q1Limit, setQ1Limit] = useState<number>(5);
  const [q1ShellCode, setQ1ShellCode] = useState<string>('');
  const [q1Results, setQ1Results] = useState<any[]>([]);
  
  const [q4ShellCode, setQ4ShellCode] = useState<string>('');
  const [q4Results, setQ4Results] = useState<AggregationResult[]>([]);
  
  const [labSearchText, setLabSearchText] = useState<string>('tối ưu MongoDB');
  const [labSearchShell, setLabSearchShell] = useState<string>('');
  const [labSearchResults, setLabSearchResults] = useState<{ post: PostDocument, score: number }[]>([]);

  // System Notifications
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  // Load Data on Mount
  useEffect(() => {
    const initData = async () => {
      const status = await getDbStatus();
      setDbStatus(status);

      const loadedPosts = await loadPostsFromStorage();
      setPosts(loadedPosts);
      
      setLogs(loadLogsFromStorage());
      
      // Set up Query 1 and Query 4 defaults in Lab
      const q1 = await runQuery1_ComplexFind('Database', 5);
      setQ1ShellCode(q1.queryShell);
      setQ1Results(q1.results);
      
      const q4 = await runQuery4_AggregationPipeline();
      setQ4ShellCode(q4.queryShell);
      setQ4Results(q4.results);
    };

    initData();

    // Listener for custom logging event
    const handleQueryLog = () => {
      setLogs(loadLogsFromStorage());
    };
    window.addEventListener('mongo_query_logged', handleQueryLog);
    return () => window.removeEventListener('mongo_query_logged', handleQueryLog);
  }, []);

  // Show Toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Sync Database State with Storage
  const refreshDatabaseState = async () => {
    const p = await loadPostsFromStorage();
    setPosts(p);
  };

  // Reset database handler
  const handleResetDB = async () => {
    if (window.confirm("Bạn có chắc chắn muốn đặt lại toàn bộ Cơ sở dữ liệu về 52 tài liệu mẫu ban đầu? Toàn bộ các bài viết và bình luận mới sẽ bị xóa.")) {
      const p = await resetDatabase();
      setPosts(p);
      setSelectedPost(null);
      
      // Reset search
      setSearchText('');
      setIsSearchingText(false);

      // Reset Query Lab defaults
      const q1 = await runQuery1_ComplexFind('Database', 5);
      setQ1ShellCode(q1.queryShell);
      setQ1Results(q1.results);
      
      const q4 = await runQuery4_AggregationPipeline();
      setQ4ShellCode(q4.queryShell);
      setQ4Results(q4.results);

      showToast("Khởi tạo lại Cơ sở dữ liệu và nạp 52 tài liệu thành công!", "success");
    }
  };

  // Handle article view (Atomic Increment Views - Q2)
  const handleViewPost = async (post: PostDocument) => {
    const res = await runQuery2_AtomicUpdateMetric(post.slug, 'views');
    await refreshDatabaseState();
    setSelectedPost(res.post);
    // Auto populate comment author name
    setCommentName('');
    setCommentText('');
    setCommentSubmitted(false);
  };

  // Handle article like (Atomic Increment Likes - Q2)
  const handleLikePost = async (slug: string) => {
    const res = await runQuery2_AtomicUpdateMetric(slug, 'likes');
    await refreshDatabaseState();
    if (selectedPost && selectedPost.slug === slug) {
      setSelectedPost(res.post);
    }
    showToast("Đã thích bài viết! (Thực thi $inc nguyên tử)", "success");
  };

  // Handle article share (Atomic Increment Shares - Q2)
  const handleSharePost = async (slug: string) => {
    const res = await runQuery2_AtomicUpdateMetric(slug, 'shares');
    await refreshDatabaseState();
    if (selectedPost && selectedPost.slug === slug) {
      setSelectedPost(res.post);
    }
    showToast("Đã tăng lượt chia sẻ! (Thực thi $inc nguyên tử)", "info");
  };

  // Handle Add Comment (Subset Pattern - Q3)
  const handleAddComment = async (e: React.FormEvent, slug: string) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const res = await runQuery3_AddComment(slug, commentName, commentText);
    await refreshDatabaseState();
    setSelectedPost(res.post);
    setCommentText('');
    setCommentSubmitted(true);
    showToast("Đã gửi bình luận! (Thêm mới $push và giới hạn $slice: -20)", "success");
    setTimeout(() => setCommentSubmitted(false), 3000);
  };

  // Full-text search handler (E2E Use Case)
  const handleSearchText = async (val: string) => {
    setSearchText(val);
    if (!val.trim()) {
      setIsSearchingText(false);
      setSearchScoreResults([]);
      return;
    }
    
    setIsSearchingText(true);
    const res = await runFullTextSearch(val);
    setSearchScoreResults(res.results);
  };

  // Clean Drafts Handler (Q5)
  const handleCleanDrafts = async () => {
    const res = await runQuery5_DeleteOldDrafts();
    await refreshDatabaseState();
    
    if (res.deletedCount > 0) {
      showToast(`Đã xóa ${res.deletedCount} bài viết nháp cũ (>30 ngày)!`, "success");
    } else {
      showToast("Không tìm thấy bài viết nháp nào được tạo quá 30 ngày để xóa.", "info");
    }
  };

  // Create Custom Post Handler (InsertOne)
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim() || !newExcerpt.trim()) {
      showToast("Vui lòng điền đầy đủ các trường bắt buộc!", "error");
      return;
    }

    const slug = newTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check duplicate slug
    if (posts.some(p => p.slug === slug)) {
      showToast("Lỗi: Slug bài viết đã tồn tại! Vui lòng thay đổi tiêu đề.", "error");
      return;
    }

    const authorObj = initialAuthors.find(a => a.name === formAuthor) || initialAuthors[0];
    const catObj = initialCategories.find(c => c.name === newCategory) || initialCategories[0];

    const tagsArr = newTags.split(',').map(t => t.trim()).filter(t => t !== '');

    const res = await runQuery_InsertOne({
      title: newTitle,
      slug,
      excerpt: newExcerpt,
      content: newContent,
      status: newStatus,
      author: authorObj,
      category: {
        categoryId: generateObjectId(),
        name: catObj.name
      },
      tags: tagsArr
    });

    await refreshDatabaseState();
    
    // Reset fields
    setNewTitle('');
    setNewExcerpt('');
    setNewContent('');
    setNewTags('MongoDB, NoSQL, Tutorial');
    
    showToast(`Đã xuất bản bài viết thành công! (Thực thi db.Posts.insertOne)`, "success");
    setActiveTab('reader');
  };

  // AI Generation via Gemini Endpoint
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setAiError("Vui lòng nhập chủ đề viết bài!");
      return;
    }

    setIsAiGenerating(true);
    setAiError('');
    setAiSuccessMessage('');

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: aiTopic,
          category: newCategory
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gặp lỗi khi tạo nội dung từ AI");
      }

      // Populate form with AI results
      setNewTitle(data.title);
      setNewExcerpt(data.excerpt);
      setNewContent(data.content);
      setNewTags(data.tags.join(', '));
      
      setAiSuccessMessage("Đã tạo nội dung chất lượng cao từ Gemini AI thành công! Toàn bộ nội dung đã được điền vào form bên dưới. Hãy kiểm tra và ấn 'Xuất bản bài viết'.");
      setAiTopic('');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Không thể kết nối tới server hoặc thiếu API Key.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Run Query 1 inside Lab
  const handleRunQ1 = async () => {
    const q1 = await runQuery1_ComplexFind(q1Category, q1Limit);
    setQ1ShellCode(q1.queryShell);
    setQ1Results(q1.results);
    showToast("Đã thực thi Q1 Complex Find!", "success");
  };

  // Run Query 4 inside Lab
  const handleRunQ4 = async () => {
    const q4 = await runQuery4_AggregationPipeline();
    setQ4ShellCode(q4.queryShell);
    setQ4Results(q4.results);
    showToast("Đã cập nhật Báo cáo Thống kê Aggregation Pipeline!", "success");
  };

  // Run Lab Search
  const handleRunLabSearch = async () => {
    const res = await runFullTextSearch(labSearchText);
    setLabSearchShell(res.queryShell);
    setLabSearchResults(res.results);
    showToast("Đã cập nhật xếp hạng Tìm kiếm Toàn văn!", "success");
  };

  // Format code blocks
  const renderFormattedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Filtered list based on selected category in Reader Tab
  const getFilteredReaderPosts = () => {
    if (selectedCategory === 'All') {
      return posts.filter(p => p.status === 'published');
    }
    return posts.filter(p => p.status === 'published' && p.category.name === selectedCategory);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* HEADER SECTION */}
      <header className="bg-slate-900 text-white shadow-xl border-b border-emerald-500/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 rounded-lg shadow-lg flex items-center justify-center animate-pulse">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  MongoDB CMS & Query Lab
                </h1>
                <div className="flex items-center">
                  {dbStatus.connected ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Real MongoDB Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Offline Mode (Simulated)
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                CƠ SỞ DỮ LIỆU NÂNG CAO • HỌC KỲ 3 • NĂM HỌC 2025-2026
              </p>
            </div>
          </div>

          {/* Tab Selection */}
          <nav className="flex bg-slate-800 p-1.5 rounded-xl border border-slate-700 w-full md:w-auto overflow-x-auto gap-1">
            <button
              onClick={() => { setActiveTab('reader'); setSelectedPost(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === 'reader' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Trang chủ Blog</span>
            </button>
            <button
              onClick={() => { setActiveTab('admin'); setSelectedPost(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === 'admin' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Bàn làm việc Admin</span>
            </button>
            <button
              onClick={() => { setActiveTab('queryLab'); setSelectedPost(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === 'queryLab' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>MongoDB Query Lab</span>
            </button>
            <button
              onClick={() => { setActiveTab('docs'); setSelectedPost(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                activeTab === 'docs' 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>So sánh & Schema</span>
            </button>
          </nav>
        </div>
      </header>

      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className={`fixed ${isLogsMinimized ? 'bottom-12' : 'bottom-28'} right-4 z-50 animate-bounce max-w-md bg-slate-900 text-white border border-emerald-500 rounded-xl shadow-2xl p-4 flex items-center gap-3 transition-all duration-200`}>
          <div className="p-1.5 bg-emerald-500 rounded-full text-white">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{toastMessage}</p>
            <p className="text-[10px] text-slate-400 font-mono">MongoDB Console vừa ghi nhận một hành động ghi mới!</p>
          </div>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-6 md:py-8 flex flex-col gap-8 pb-32">
        
        {/* TAB 1: READER VIEW (BLOG FRONTEND) */}
        {activeTab === 'reader' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Posts List */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Search and Category Filter Section */}
              {!selectedPost && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-emerald-600" />
                      Khám phá Kho bài viết
                    </h2>
                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded-md">
                      {posts.filter(p => p.status === 'published').length} posts
                    </span>
                  </div>

                  {/* Search bar with E2E MongoDB scoring info */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm bằng MongoDB Full-Text Search (Ví dụ: 'tối ưu MongoDB', 'Big Data')..."
                      value={searchText}
                      onChange={(e) => handleSearchText(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm shadow-inner transition-all"
                    />
                    {searchText && (
                      <button 
                        onClick={() => handleSearchText('')} 
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Category Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      onClick={() => setSelectedCategory('All')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        selectedCategory === 'All'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả
                    </button>
                    {initialCategories.map(cat => (
                      <button
                        key={cat.categoryId}
                        onClick={() => setSelectedCategory(cat.name)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                          selectedCategory === cat.name
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Text search active metadata banner */}
                  {isSearchingText && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-800">
                        <span className="font-bold">Đang hiển thị kết quả Tìm kiếm Toàn văn:</span> Đã lập chỉ mục <code>{"db.Posts.createIndex({ title: \"text\", content: \"text\" })"}</code>. Hệ thống tính điểm liên quan <code>$meta: "textScore"</code> và xếp hạng tự động.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* POST DETAILS VIEW (If active) */}
              {selectedPost ? (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden animate-fade-in flex flex-col">
                  {/* Image/Hero decoration */}
                  <div className="h-4 bg-emerald-600 w-full"></div>
                  
                  {/* Detailed Post Area */}
                  <div className="p-6 md:p-8 flex flex-col gap-6">
                    <button 
                      onClick={() => { setSelectedPost(null); setSearchText(''); setIsSearchingText(false); }}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold flex items-center gap-1 self-start group"
                    >
                      ← Quay lại danh sách
                    </button>

                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full">
                        {selectedPost.category.name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {renderFormattedDate(selectedPost.createdAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        ID: {selectedPost._id}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                      {selectedPost.title}
                    </h2>

                    {/* Author card inside Post */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <img 
                        src={selectedPost.author?.avatarUrl || initialAuthors[0].avatarUrl} 
                        alt={selectedPost.author?.name || 'Trần Quang Mạnh'}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30"
                      />
                      <div>
                        <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Tác giả (Referenced)</p>
                        <p className="text-sm font-bold text-slate-800">{selectedPost.author?.name || 'Trần Quang Mạnh'}</p>
                      </div>
                    </div>

                    {/* Excerpt */}
                    <p className="text-slate-600 italic bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-xl text-sm leading-relaxed">
                      "{selectedPost.excerpt}"
                    </p>

                    {/* HTML Content */}
                    <div 
                      className="prose prose-emerald max-w-none text-slate-800 text-sm leading-relaxed space-y-4"
                      dangerouslySetInnerHTML={{ __html: selectedPost.content }}
                    />

                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-4 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Thẻ:</span>
                      {selectedPost.tags.map((tag, idx) => (
                        <span key={idx} className="flex items-center gap-0.5 px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-mono">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* ATOMIC INTERACTION SYSTEM - Q2 DEMO */}
                    <div className="bg-slate-900 text-white rounded-2xl p-5 mt-4 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-emerald-400">Tương tác Nguyên tử (Atomic Operations)</h4>
                          <p className="text-[11px] text-slate-400">Các nút nhấn bên dưới sẽ thay đổi trực tiếp trường metrics bằng lệnh <code>$inc</code></p>
                        </div>
                        <span className="text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded">
                          Atomic Update
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>Lượt xem</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-white">{selectedPost.metrics.views}</span>
                          <span className="text-[9px] text-emerald-500 font-mono bg-emerald-950/40 px-1 rounded">Auto $inc +1</span>
                        </div>

                        <button 
                          onClick={() => handleLikePost(selectedPost.slug)}
                          className="bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800/80 rounded-xl p-3 flex flex-col items-center gap-1 transition group"
                        >
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs group-hover:text-emerald-400">
                            <ThumbsUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition" />
                            <span>Thích</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-white">{selectedPost.metrics.likes}</span>
                          <span className="text-[9px] text-emerald-500 font-mono bg-emerald-950/40 px-1 rounded">Click $inc +1</span>
                        </button>

                        <button 
                          onClick={() => handleSharePost(selectedPost.slug)}
                          className="bg-slate-800 border border-slate-700 hover:border-emerald-500 hover:bg-slate-800/80 rounded-xl p-3 flex flex-col items-center gap-1 transition group"
                        >
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs group-hover:text-emerald-400">
                            <Share2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 group-hover:scale-110 transition" />
                            <span>Chia sẻ</span>
                          </div>
                          <span className="text-lg font-bold font-mono text-white">{selectedPost.metrics.shares}</span>
                          <span className="text-[9px] text-emerald-500 font-mono bg-emerald-950/40 px-1 rounded">Click $inc +1</span>
                        </button>
                      </div>
                    </div>

                    {/* COMMENTS SECTION - SUBSET PATTERN Q3 DEMO */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-emerald-600" />
                            Bình luận mới nhất ({selectedPost.recent_comments.length})
                          </h3>
                          <p className="text-xs text-slate-500">Subset Pattern: Chỉ nhúng tối đa 20 bình luận mới nhất để tối ưu hiệu năng.</p>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 border text-slate-600 px-2.5 py-1 rounded-full">
                          Subset Limit: 20
                        </span>
                      </div>

                      {/* Add Comment Form */}
                      <form onSubmit={(e) => handleAddComment(e, selectedPost.slug)} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-bold text-slate-600">Gửi bình luận mới:</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            placeholder="Họ và tên của bạn..."
                            value={commentName}
                            onChange={(e) => setCommentName(e.target.value)}
                            className="md:col-span-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Nhập nội dung bình luận tại đây..."
                            required
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="md:col-span-2 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          {commentSubmitted ? (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                              <CheckCircle className="w-3.5 h-3.5" /> Gửi thành công!
                            </span>
                          ) : <span />}
                          <button
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 self-end transition shadow"
                          >
                            <Send className="w-3 h-3" />
                            Bình luận
                          </button>
                        </div>
                      </form>

                      {/* Comments List */}
                      <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                        {selectedPost.recent_comments.length === 0 ? (
                          <div className="text-center py-6 text-slate-400 text-xs italic">
                            Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên thảo luận!
                          </div>
                        ) : (
                          selectedPost.recent_comments.map((comment) => (
                            <div key={comment.commentId} className="bg-slate-50/50 hover:bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex gap-3 transition">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                                {comment.userName.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-grow flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-800">{comment.userName}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {renderFormattedDate(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">{comment.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                
                /* POSTS LIST SECTION */
                <div className="flex flex-col gap-4">
                  
                  {/* Results Subtitle */}
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                    {isSearchingText 
                      ? `Kết quả tìm kiếm cho: "${searchText}" (${searchScoreResults.length} bài viết)`
                      : `Chuyên mục: ${selectedCategory} (${getFilteredReaderPosts().length} bài viết)`
                    }
                  </div>

                  {/* Feed container */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Render search scores results if searching, otherwise standard filter list */}
                    {isSearchingText ? (
                      searchScoreResults.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                          <AlertCircle className="w-10 h-10 text-slate-400" />
                          <div>
                            <p className="font-bold text-slate-700">Không tìm thấy kết quả nào phù hợp</p>
                            <p className="text-xs text-slate-400">Hãy thử từ khóa khác như "MongoDB", "NoSQL", "Big Data", hoặc "Database"</p>
                          </div>
                        </div>
                      ) : (
                        searchScoreResults.map(({ post, score }) => (
                          <div 
                            key={post._id}
                            className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg overflow-hidden flex flex-col justify-between transition-all duration-300 group cursor-pointer"
                            onClick={() => handleViewPost(post)}
                          >
                            <div className="p-5 flex flex-col gap-3">
                              {/* Scoring Badge and Category */}
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                                  {post.category.name}
                                </span>
                                <span className="px-2 py-0.5 bg-slate-900 text-emerald-400 rounded-md text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                                  Score: {score}
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition duration-150">
                                {post.title}
                              </h3>

                              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                {post.excerpt}
                              </p>
                            </div>

                            {/* Card Footer */}
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                {post.author?.name || 'Tác giả'}
                              </span>
                              <span>
                                {renderFormattedDate(post.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    ) : (
                      getFilteredReaderPosts().length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                          Chưa có bài viết nào được xuất bản trong chuyên mục này.
                        </div>
                      ) : (
                        getFilteredReaderPosts().map((post) => (
                          <div 
                            key={post._id}
                            className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-lg overflow-hidden flex flex-col justify-between transition-all duration-300 group cursor-pointer"
                            onClick={() => handleViewPost(post)}
                          >
                            <div className="p-5 flex flex-col gap-3">
                              {/* Category and Quick view */}
                              <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold">
                                  {post.category.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <Eye className="w-2.5 h-2.5" /> {post.metrics.views}
                                </span>
                              </div>

                              <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-emerald-600 transition duration-150">
                                {post.title}
                              </h3>

                              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                {post.excerpt}
                              </p>
                            </div>

                            {/* Card Footer */}
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                {post.author?.name || 'Tác giả'}
                              </span>
                              <span>
                                {renderFormattedDate(post.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Schema/BSON inspect panel representing Chapter 2 */}
            <div className="flex flex-col gap-6">
              
              {/* Document Inspector Card */}
              <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-bold text-white">MongoDB Document Live Inspector</h3>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/20 text-[9px] rounded-full font-mono uppercase">
                    BSON Viewer
                  </span>
                </div>

                <div className="text-xs text-slate-400 leading-relaxed">
                  {selectedPost ? (
                    <span>Đang kiểm tra tài liệu bài viết đang xem (Bản nhúng thông tin thực tế được lấy từ database):</span>
                  ) : (
                    <span>Chọn một bài viết bất kỳ bên cạnh để nạp tài liệu BSON và theo dõi trạng thái thay đổi theo thời gian thực!</span>
                  )}
                </div>

                {/* BSON Code block representing standard MongoDB document layout */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-[480px] scrollbar-thin">
                  {selectedPost ? (
                    <pre className="whitespace-pre">{`{
  "_id": ObjectId("${selectedPost._id}"),
  "title": "${selectedPost.title.length > 25 ? selectedPost.title.slice(0, 25) + '...' : selectedPost.title}",
  "slug": "${selectedPost.slug}",
  "excerpt": "${selectedPost.excerpt.slice(0, 30)}...",
  "status": "${selectedPost.status}",
  "createdAt": ISODate("${selectedPost.createdAt}"),
  "author": {
    "userId": ObjectId("${selectedPost.author.userId}"),
    "name": "${selectedPost.author.name}",
    "avatarUrl": "${selectedPost.author.avatarUrl.slice(0, 15)}..."
  },
  "category": {
    "categoryId": ObjectId("${selectedPost.category.categoryId}"),
    "name": "${selectedPost.category.name}"
  },
  "tags": ${JSON.stringify(selectedPost.tags)},
  "metrics": {
    "views": ${selectedPost.metrics.views},
    "likes": ${selectedPost.metrics.likes},
    "shares": ${selectedPost.metrics.shares}
  },
  "recent_comments": [
${selectedPost.recent_comments.slice(0, 2).map(c => `    {
      "commentId": ObjectId("${c.commentId}"),
      "userName": "${c.userName}",
      "text": "${c.text.slice(0, 15)}...",
      "createdAt": ISODate("${c.createdAt.slice(0, 10)}")
    }`).join(',\n')}
${selectedPost.recent_comments.length > 2 ? `    ... // Thêm ${selectedPost.recent_comments.length - 2} bình luận khác (Subset limit: 20)` : ''}
  ]
}`}</pre>
                  ) : (
                    <div className="text-slate-500 py-12 text-center italic text-xs">
                      // [Hãy chọn một bài viết để bắt đầu xem cấu trúc BSON]
                    </div>
                  )}
                </div>

                {selectedPost && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-lg flex items-start gap-2 leading-relaxed">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Nhận xét từ Report:</span> Thiết kế nhúng (Embed) giúp nạp thông tin tác giả, danh mục và bình luận mới nhất của bài viết cực nhanh chỉ bằng <strong>đúng 1 lệnh truy vấn</strong> (O(1) disk read), thay vì phải thực hiện phép nối <code>JOIN</code> cực kỳ tốn tài nguyên trên 4-5 bảng như RDBMS truyền thống.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* TAB 2: ADMIN DASHBOARD (CREATE & AI ASSISTANT) */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Form and AI Integration */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* AI Writer Assistant Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Trợ lý Viết bài bằng Gemini AI (Server-side)</h2>
                    <p className="text-xs text-slate-500">Nhập ý tưởng hoặc từ khóa để Gemini tự động soạn thảo bài viết tối ưu cấu trúc NoSQL.</p>
                  </div>
                </div>

                <form onSubmit={handleAiGenerate} className="flex flex-col gap-3 mt-1">
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Ví dụ: 'Tối ưu hóa Index trong MongoDB', 'Kiến trúc Sharding cho tỷ lượt truy cập'..."
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="flex-grow px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                    
                    <button
                      type="submit"
                      disabled={isAiGenerating}
                      className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      {isAiGenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                          <span>Gemini đang viết bài...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>Viết bài với AI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-red-800 font-medium">{aiError}</div>
                    </div>
                  )}

                  {aiSuccessMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 animate-fade-in">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-800">{aiSuccessMessage}</div>
                    </div>
                  )}
                </form>
              </div>

              {/* Standard Article Creation Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  Soạn thảo Bài viết mới (db.Posts.insertOne)
                </h2>

                <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Tiêu đề hiển thị..."
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Chuyên mục <span className="text-red-500">*</span></label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm bg-white"
                      >
                        {initialCategories.map(cat => (
                          <option key={cat.categoryId} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Tác giả (Embedded)</label>
                      <select
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm bg-white"
                      >
                        {initialAuthors.map(author => (
                          <option key={author.userId} value={author.name}>{author.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Thẻ từ khóa (Phân cách bởi dấu phẩy)</label>
                      <input
                        type="text"
                        placeholder="MongoDB, Tech, NoSQL..."
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold text-slate-600">Trạng thái xuất bản</label>
                      <div className="flex gap-4 mt-2">
                        <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={newStatus === 'published'}
                            onChange={() => setNewStatus('published')}
                            className="mr-1.5 accent-emerald-600"
                          />
                          Xuất bản (Published)
                        </label>
                        <label className="inline-flex items-center text-xs font-medium text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={newStatus === 'draft'}
                            onChange={() => setNewStatus('draft')}
                            className="mr-1.5 accent-emerald-600"
                          />
                          Bản nháp (Draft)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">Đoạn trích tóm tắt (Excerpt) <span className="text-red-500">*</span></label>
                    <textarea
                      rows={2}
                      placeholder="Tóm tắt ngắn bài viết hiển thị trên trang chủ..."
                      required
                      value={newExcerpt}
                      onChange={(e) => setNewExcerpt(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-600">Nội dung chi tiết (HTML hoặc Text) <span className="text-red-500">*</span></label>
                    <textarea
                      rows={8}
                      placeholder="Nội dung bài viết chi tiết..."
                      required
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-mono text-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl flex items-center justify-center gap-1.5 self-end transition shadow-md"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Xuất bản bài viết</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: DB Settings & Bulk Ops representing Chapter 3 & 4 */}
            <div className="flex flex-col gap-6">
              
              {/* DB Administration */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-5">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Hành động Quản trị DB
                </h3>

                <div className="flex flex-col gap-4">
                  
                  {/* Clean draft (Query 5) */}
                  <div className="flex flex-col gap-2 bg-rose-50/50 border border-rose-100 p-4 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <h4 className="text-xs font-bold text-rose-800">Dọn dẹp bản nháp cũ (Query 5)</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Chạy câu lệnh <code>deleteMany()</code> để dọn dẹp các bài viết ở trạng thái "draft" được tạo quá 30 ngày để giải phóng tài nguyên.
                    </p>
                    <button
                      onClick={handleCleanDrafts}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold py-2 rounded-lg transition"
                    >
                      Xóa Bản nháp &gt;30 Ngày
                    </button>
                  </div>

                  {/* Reset Database */}
                  <div className="flex flex-col gap-2 bg-slate-100/50 border border-slate-200 p-4 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-slate-700" />
                      <h4 className="text-xs font-bold text-slate-800">Khôi phục Dữ liệu mẫu (Chapter 3)</h4>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Nạp lại toàn bộ 52 tài liệu mẫu như ban đầu theo thiết kế của Chương 3 để có đủ dữ liệu chạy Query Lab.
                    </p>
                    <button
                      onClick={handleResetDB}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold py-2 rounded-lg transition"
                    >
                      Nạp lại dữ liệu gốc (52 posts)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* TAB 3: MONGODB QUERY LAB & VISUAL ANALYTICS */}
        {activeTab === 'queryLab' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            
            {/* Intro text */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                <Terminal className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-900">MongoDB Query & Aggregation Laboratory</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Trực quan hóa hoạt động của các câu lệnh truy vấn MongoDB thực tế (Chương 4 trong Báo cáo). 
                  Nhập thông số, thực thi lệnh trực tiếp và nhận dữ liệu BSON thực, kết hợp biểu đồ thống kê thời gian thực!
                </p>
              </div>
            </div>

            {/* QUERY 1 & QUERY 4 SIDE-BY-SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Q1 LAB CARD */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center justify-center">1</span>
                      Truy vấn Phức tạp (Q1: Complex Find)
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">db.Posts.find</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nghiệp vụ: Lọc các bài viết có trạng thái "published" theo danh mục lựa chọn, sắp xếp theo ngày giảm dần, giới hạn số bản ghi, sử dụng projection trường cần thiết để tiết kiệm băng thông.
                  </p>

                  {/* Input parameters */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500">Danh mục (Category.name)</label>
                      <select 
                        value={q1Category}
                        onChange={(e) => setQ1Category(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        {initialCategories.map(c => <option key={c.categoryId} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500">Giới hạn (Limit)</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={20}
                        value={q1Limit}
                        onChange={(e) => setQ1Limit(parseInt(e.target.value) || 5)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <button 
                    onClick={handleRunQ1}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition"
                  >
                    Thực thi lệnh db.Posts.find()
                  </button>

                  {/* Shell command block */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">MongoDB Shell Code:</span>
                    <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                      {q1ShellCode}
                    </pre>
                  </div>

                  {/* Results preview */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">BSON Output ({q1Results.length} records):</span>
                    <div className="bg-slate-950 text-slate-300 p-4 rounded-xl text-[10px] font-mono max-h-48 overflow-y-auto border border-slate-800 scrollbar-thin">
                      <pre className="whitespace-pre">{JSON.stringify(q1Results, null, 2)}</pre>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    <strong>Tối ưu hóa:</strong> Lệnh này tự động tận dụng <strong>Compound Index</strong> <code>{`{"category.name": 1, "createdAt": -1}`}</code>, thỏa mãn ngay từ Index mà không cần quét toàn bộ bảng (Collection Scan) hay sắp xếp trong RAM (In-Memory Sort).
                  </span>
                </div>
              </div>

              {/* Q4 LAB CARD: AGGREGATION PIPELINE */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center justify-center">4</span>
                      Thống kê Phức tạp (Q4: Aggregation Pipeline)
                    </h3>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">db.Posts.aggregate</span>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nghiệp vụ: Quản trị viên cần báo cáo tổng hợp để đếm tổng số bài viết, tính tổng số lượt xem và trung bình lượt thích theo TỪNG danh mục bài viết.
                  </p>

                  <button 
                    onClick={handleRunQ4}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition"
                  >
                    Thực thi pipeline db.Posts.aggregate()
                  </button>

                  {/* Shell Code */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">MongoDB aggregation pipeline:</span>
                    <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed border border-slate-800">
                      {q4ShellCode}
                    </pre>
                  </div>

                  {/* Visual charts (Simulated using SVG elements for 100% render stability) */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-500">Biểu đồ Trực quan: Tổng Lượt Xem (views) theo chuyên mục</span>
                    
                    <div className="flex flex-col gap-2 pt-1">
                      {q4Results.map(res => {
                        // Calculate percentage of views relative to the highest views
                        const maxViews = Math.max(...q4Results.map(r => r.totalViews), 1);
                        const widthPct = Math.round((res.totalViews / maxViews) * 100);
                        
                        return (
                          <div key={res._id} className="flex items-center gap-2 text-xs">
                            <span className="w-20 font-bold text-slate-600 truncate">{res._id}</span>
                            <div className="flex-grow bg-slate-200 h-4 rounded overflow-hidden">
                              <div 
                                style={{ width: `${widthPct}%` }}
                                className="bg-emerald-500 h-full rounded transition-all duration-500"
                              />
                            </div>
                            <span className="w-16 font-mono font-bold text-right text-slate-700">{res.totalViews.toLocaleString('vi-VN')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Results preview */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">BSON Pipeline Output:</span>
                    <div className="bg-slate-950 text-slate-300 p-4 rounded-xl text-[10px] font-mono max-h-36 overflow-y-auto border border-slate-800 scrollbar-thin">
                      <pre className="whitespace-pre">{JSON.stringify(q4Results, null, 2)}</pre>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    <strong>Giải thích Pipeline:</strong> Dữ liệu đi qua 3 giai đoạn: <code>$match</code> lọc bản ghi <code>status: 'published'</code> → <code>$group</code> nhóm theo tên danh mục, tính tổng số bài viết bằng <code>$sum: 1</code>, tổng views bằng <code>$sum: "$metrics.views"</code>, trung bình likes bằng <code>$avg: "$metrics.likes"</code> → <code>$sort</code> giảm dần theo lượt xem.
                  </span>
                </div>
              </div>

            </div>

            {/* FULL TEXT SEARCH LAB BENCHMARK */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Compass className="w-5 h-5 text-emerald-600" />
                    Tính năng Tìm kiếm toàn văn (Text Index & relevance Scoring)
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">Full-Text search</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Trải nghiệm cách MongoDB tạo chỉ mục tìm kiếm và tính toán <code>textScore</code>. Nhập từ khóa tiếng Việt tìm kiếm, hệ thống sẽ tự phân tích, trích xuất điểm xếp hạng và hiển thị chi tiết nguyên lý.
                </p>

                <div className="flex flex-col md:flex-row gap-3">
                  <input 
                    type="text" 
                    value={labSearchText}
                    onChange={(e) => setLabSearchText(e.target.value)}
                    placeholder="Nhập từ khóa tìm kiếm (Ví dụ: 'tối ưu MongoDB', 'Big Data')..."
                    className="flex-grow px-3 py-2 text-xs rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={handleRunLabSearch}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-lg transition shrink-0"
                  >
                    Tìm kiếm trên Text Index
                  </button>
                </div>

                {labSearchShell && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">MongoDB query matching:</span>
                    <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800">
                      {labSearchShell}
                    </pre>
                  </div>
                )}

                {/* Search score results table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-3">Tiêu đề bài viết</th>
                        <th className="p-3">Chuyên mục</th>
                        <th className="p-3">Thẻ từ khóa</th>
                        <th className="p-3 text-center">Xếp hạng Điểm số (textScore)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {labSearchResults.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                            Nhập từ khóa bên trên và ấn Tìm kiếm để xem chấm điểm.
                          </td>
                        </tr>
                      ) : (
                        labSearchResults.map(({ post, score }) => (
                          <tr key={post._id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900">{post.title}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[10px]">
                                {post.category.name}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {post.tags.slice(0, 3).map((t, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-mono">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/25 rounded font-mono font-bold">
                                {score}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-150 text-[10px] leading-relaxed flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Cách thức chấm điểm:</span> Điểm số <code>score: {`{ $meta: "textScore" }`}</code> được tự động tính dựa trên thuật toán so khớp văn bản của MongoDB. Trận đấu trùng khớp trực tiếp từ khóa trong Tiêu đề (Title) có trọng số cao nhất (được cộng thêm nhiều điểm nhất), theo sau đó là từ khóa xuất hiện nhiều lần trong nội dung (Content) và Thẻ (Tags).
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* TAB 4: COMPILATION & DOCUMENTATION STUDY */}
        {activeTab === 'docs' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            
            {/* Header intro */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-start gap-4">
              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-900">Tổng quan Lý thuyết & So sánh (Chương 1, 2, 5)</h2>
                <p className="text-sm text-slate-500">Bản tóm tắt trực quan được ánh xạ trực tiếp từ tài liệu đồ án lý thuyết học phần Cơ sở dữ liệu nâng cao.</p>
              </div>
            </div>

            {/* Matrix comparison - Chapter 5 */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <GitCompare className="w-5 h-5 text-emerald-600" />
                  So sánh Chi tiết: RDBMS (SQL Server) vs NoSQL (MongoDB)
                </h3>
                <span className="text-[10px] font-bold text-slate-400 font-mono">CHƯƠNG 5</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-4 w-1/4">Tiêu chí đối chiếu</th>
                      <th className="p-4 w-3/8 bg-blue-50/20 text-blue-900">RDBMS (SQL Server)</th>
                      <th className="p-4 w-3/8 bg-emerald-50/20 text-emerald-900">NoSQL (MongoDB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">Mô hình dữ liệu</td>
                      <td className="p-4 text-slate-600">Dữ liệu cấu trúc chặt chẽ thành các Bảng (Table), bao gồm các hàng (row) và cột (column) cố định.</td>
                      <td className="p-4 text-slate-600">Dữ liệu dạng Document Store (BSON/JSON), cho phép mảng lồng nhau (nested arrays) và object phân cấp cực kỳ linh hoạt.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">Cấu trúc Schema</td>
                      <td className="p-4 text-slate-600 text-rose-700 font-medium">Cố định (Rigid Schema). Mọi thay đổi cấu trúc đều cần lệnh ALTER TABLE, có thể gây Table Lock và Downtime hệ thống lớn.</td>
                      <td className="p-4 text-emerald-700 font-medium">Linh hoạt (Schema-less). Mỗi document có thể có cấu trúc khác nhau hoàn toàn, dễ dàng thêm trường mà không ảnh hưởng document khác.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">Khả năng mở rộng</td>
                      <td className="p-4 text-slate-600">Mở rộng theo chiều dọc (Vertical Scaling - nâng cấp RAM, CPU, SSD). Cực kỳ đắt đỏ và có giới hạn vật lý. Mở rộng ngang (Sharding) vô cùng phức tạp.</td>
                      <td className="p-4 text-slate-600">Mở rộng theo chiều ngang (Horizontal Scaling - Sharding) được tích hợp sẵn từ nhân lõi, dễ dàng chia nhỏ dữ liệu ra cụm máy chủ giá rẻ.</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">Tính nhất quán</td>
                      <td className="p-4 text-slate-600 font-semibold">Tuân thủ chuẩn ACID (Atomicity, Consistency, Isolation, Durability) đầy đủ và khắt khe. Phù hợp giao dịch tài chính, kế toán.</td>
                      <td className="p-4 text-slate-600 font-semibold">Tuân thủ nguyên lý BASE (Basically Available, Soft-state, Eventual Consistency). Ưu tiên tối đa tốc độ phản hồi và tính sẵn sàng cao (High Availability).</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">Hiệu năng đọc bài viết</td>
                      <td className="p-4 text-rose-700 font-medium">Độ trễ cao do bế tắc hiệu năng phép JOIN. Cần kết nối 4-5 bảng (Posts, Categories, Tags, Comments...) để render 1 bài blog hoàn chỉnh.</td>
                      <td className="p-4 text-emerald-700 font-medium">Độ trễ cực thấp O(1). Sử dụng mảng nhúng (Embedded) nạp đầy đủ thông tin chỉ bằng 1 phép đọc duy nhất mà không cần JOIN.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Design Decision Details - Chapter 1 & 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Bottlenecks explanation */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
                  Điểm nghẽn RDBMS với bài toán CMS Blog
                </h3>
                
                <div className="flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong>1. Phân mảnh Dữ liệu:</strong> Chuẩn hóa 3NF trong RDBMS chia nhỏ một bài viết blog thành nhiều bảng liên kết: Posts, Authors, Categories, Tags, Post_Tags, Comments.
                  </p>
                  <p>
                    <strong>2. Thắt cổ chai CPU & I/O:</strong> Để hiển thị hoàn chỉnh một trang bài viết (gồm tác giả, nội dung bài, danh sách thẻ và 20 bình luận), RDBMS bắt buộc chạy các câu lệnh JOIN nhiều bảng lớn đồng thời. Khi lưu lượng truy cập đồng thời đột biến lên tới hàng ngàn user/giây, database nhanh chóng bị sập.
                  </p>
                  <p>
                    <strong>3. Table Locking:</strong> Các lĩnh vực truyền thông số thay đổi định dạng dữ liệu liên tục (thêm video nhúng, podcast, tọa độ...). Thao tác <code>ALTER TABLE</code> để thêm cột trên các bảng hàng triệu dòng sẽ gây khóa bảng, gián đoạn dịch vụ hệ thống hoàn toàn.
                  </p>
                </div>
              </div>

              {/* NoSQL Design Patterns */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Giải pháp Tối ưu hóa từ NoSQL MongoDB
                </h3>

                <div className="flex flex-col gap-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong>1. Khử chuẩn hóa (Denormalization):</strong> Cho phép dữ liệu quan hệ được gom nhóm và nhúng trực tiếp vào trong một Document duy nhất. Tải trang chi tiết bài viết chỉ tốn 1 phép đọc ổ đĩa duy nhất.
                  </p>
                  <p>
                    <strong>2. Extended Reference Pattern:</strong> Nhúng trực tiếp thông tin có tần suất thay đổi cực kỳ ít như <code>Tên và Avatar</code> của tác giả trực tiếp vào trong Post Document, giải quyết triệt để sự cần thiết của phép nối JOIN.
                  </p>
                  <p>
                    <strong>3. Subset Pattern (Ngăn ngừa Unbounded Arrays):</strong> Thay vì nhúng toàn bộ bình luận khiến kích thước Document phình to vượt quá 16MB của BSON, hệ thống chỉ nhúng tối đa 20 bình luận mới nhất (Subset) trực tiếp vào bài để tải trang đầu tức thì. Các bình luận cũ được chuyển sang Collection riêng biệt và tải thêm khi ấn nút.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* FLOATING LIVE MONGO TERMINAL LOGS */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-950 text-emerald-400 border-t border-emerald-500/30 z-30 shadow-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-1.5">
          
          {/* Header click bar to toggle */}
          <div 
            onClick={() => setIsLogsMinimized(!isLogsMinimized)}
            className="flex items-center justify-between py-1 border-b border-slate-900 text-xs cursor-pointer select-none group"
          >
            <div className="flex items-center gap-2 font-mono">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLogsMinimized ? 'bg-slate-500' : 'bg-emerald-500 animate-ping'}`} />
              <span className="font-bold text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                Live MongoDB Shell Console (Real-time logs)
              </span>
              <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-mono">
                {logs.length} logs
              </span>
            </div>
            
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <span className="hidden sm:inline text-[10px] text-slate-500 font-mono">
                {isLogsMinimized ? 'Bấm để mở rộng console' : 'Ghi lại các lệnh Mongo shell thực thi dưới nền'}
              </span>
              
              <button 
                onClick={() => { clearLogs(); setLogs([]); showToast("Đã dọn dẹp bảng điều khiển log shell!", "info"); }}
                className="text-slate-400 hover:text-white transition text-[10px] font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
              >
                Clear Console
              </button>

              <button
                onClick={() => setIsLogsMinimized(!isLogsMinimized)}
                className="flex items-center gap-1 text-emerald-400 hover:text-white transition text-[10px] font-bold bg-slate-900 hover:bg-slate-800 px-2.5 py-0.5 rounded border border-emerald-500/40"
                title={isLogsMinimized ? "Mở rộng console log" : "Thu gọn console log"}
              >
                {isLogsMinimized ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hiện Shell</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ẩn Shell</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Logs Output list */}
          {!isLogsMinimized && (
            <div className="h-16 overflow-y-auto font-mono text-[10px] leading-relaxed flex flex-col gap-1 py-1 scrollbar-thin animate-fade-in">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center italic py-2">
                  -- [Chưa có câu lệnh nào được thực thi. Hãy thử bấm thích bài viết, bình luận hoặc chạy Query Lab bên trên!] --
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/40 pb-1">
                    <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                    <div className="flex-grow text-emerald-300">
                      <pre className="whitespace-pre-wrap">{log.operation}</pre>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 font-mono text-[9px]">
                      <span className="text-slate-500">records: {log.resultCount}</span>
                      <span className="text-yellow-500 font-bold bg-yellow-950/20 px-1 rounded border border-yellow-500/10">{log.executionTimeMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </footer>

    </div>
  );
}
