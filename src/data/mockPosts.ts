/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PostDocument, Author, Category } from '../types';

// Helper to simulate MongoDB ObjectId string
export function generateObjectId(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * 16)];
  }
  return result;
}

export const initialAuthors: Author[] = [
  { userId: '64b2c3d4e5f6g7b2c3d4e5f6', name: 'Trần Quang Mạnh', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80' },
  { userId: '64b2c3d4e5f6g7b2c3d4e5f7', name: 'Nguyễn Khôi Nam', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80' },
  { userId: '64b2c3d4e5f6g7b2c3d4e5f8', name: 'Nguyễn Tấn Kiệt', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80' }
];

export const initialCategories: Category[] = [
  { categoryId: '64c3d4e5f6g7h8c3d4e5f6g1', name: 'Database' },
  { categoryId: '64c3d4e5f6g7h8c3d4e5f6g2', name: 'Backend' },
  { categoryId: '64c3d4e5f6g7h8c3d4e5f6g3', name: 'Frontend' },
  { categoryId: '64c3d4e5f6g7h8c3d4e5f6g4', name: 'DevOps' },
  { categoryId: '64c3d4e5f6g7h8c3d4e5f6g5', name: 'AI' }
];

export function getMockPosts(): PostDocument[] {
  const samplePosts: PostDocument[] = [];

  // 1. Pre-seeded special post from Chapter 2.2 of the report
  samplePosts.push({
    _id: '64a1b2c3d4e5f6a1b2c3d4e5',
    title: 'Tối ưu hóa Schema trong MongoDB',
    slug: 'toi-uu-hoa-schema-trong-mongodb',
    excerpt: 'Các best practices khi thiết kế cấu trúc Document nhằm đạt hiệu suất tối ưu và tránh các lỗi kinh điển như Unbounded Arrays.',
    content: `
      <p>Trong kỷ nguyên Big Data, việc thiết kế cơ sở dữ liệu tối ưu là một thách thức lớn. Đối với các hệ thống CMS như blog hay mạng xã hội, dữ liệu có đặc điểm là <strong>Read-Heavy</strong> (Đọc nhiều, ghi ít). Việc sử dụng cơ sở dữ liệu quan hệ (RDBMS) với các phép <code>JOIN</code> phức tạp sẽ gây nghẽn hiệu năng nghiêm trọng.</p>
      
      <h3>Tại sao nên dùng MongoDB cho Hệ thống CMS?</h3>
      <p>MongoDB là hệ quản trị cơ sở dữ liệu NoSQL dạng Document Store. Nó cho phép áp dụng nguyên lý <strong>Khử chuẩn hóa (Denormalization)</strong> để lưu trữ các đối tượng liên quan trực tiếp với nhau trong cùng một Document.</p>
      
      <pre><code>// Ví dụ một cấu trúc Post Document tối ưu trong MongoDB
{
  "_id": ObjectId("64a1b2c3d4e5f6a1b2c3d4e5"),
  "title": "Tối ưu hóa Schema trong MongoDB",
  "author": {
    "name": "Trần Quang Mạnh",
    "avatarUrl": "/images/avatars/tqmanh.jpg"
  }
}</code></pre>

      <h3>Mô hình Embedded Document vs Referenced Document</h3>
      <p>Đối với thông tin tác giả (Author) và chuyên mục (Category), do tần suất thay đổi rất ít nhưng lại cần hiển thị ngay lập tức khi đọc bài viết, việc sử dụng <strong>Extended Reference Pattern</strong> (nhúng trực tiếp các trường cần hiển thị như tên và avatar) là cực kỳ hiệu quả, giúp đạt tốc độ đọc tối đa <code>O(1)</code> mà không cần phép <code>$lookup</code>.</p>
      
      <h3>Chiến lược Subset Pattern cho Comments</h3>
      <p>Bình luận có thể tăng lên vô hạn. Nếu nhúng toàn bộ bình luận vào bài viết, kích thước Document có thể vượt quá giới hạn 16MB của BSON. Giải pháp là áp dụng <strong>Subset Pattern</strong>: chỉ nhúng tối đa 20 bình luận mới nhất trực tiếp vào Post, phần còn lại lưu ở collection phụ và load thêm khi cần thiết.</p>
    `,
    status: 'published',
    createdAt: new Date('2026-07-15T08:00:00Z').toISOString(),
    authorId: initialAuthors[0].userId,
    author: initialAuthors[0], // Trần Quang Mạnh
    category: initialCategories[0], // Database
    tags: ['NoSQL', 'MongoDB', 'Schema Design', 'Tech'],
    metrics: {
      views: 24500,
      likes: 1240,
      shares: 89
    },
    recent_comments: [
      {
        commentId: '64d4e5f6g7h8i9d4e5f6g7h8',
        userName: 'Nguyễn Khôi Nam',
        text: 'Bài viết giải thích các pattern thiết kế rất chi tiết và dễ hiểu!',
        createdAt: new Date('2026-07-15T09:12:00Z').toISOString()
      },
      {
        commentId: '64e5f6g7h8i9j0e5f6g7h8i9',
        userName: 'Nguyễn Tấn Kiệt',
        text: 'Mình đang cần thông tin này cho đồ án tốt nghiệp khóa học cơ sở dữ liệu nâng cao.',
        createdAt: new Date('2026-07-15T10:05:00Z').toISOString()
      }
    ]
  });

  // 2. Pre-seeded special post from Chapter 4.2 (Text Search Use Case)
  samplePosts.push({
    _id: '64a1b2c3d4e5f6a1b2c3d4e9',
    title: 'Hiệu suất MongoDB trong môi trường Big Data',
    slug: 'hieu-suat-mongodb-big-data',
    excerpt: 'Phân tích cách NoSQL và MongoDB tối ưu hóa dữ liệu không cấu trúc và khả năng mở rộng ngang (Sharding) mạnh mẽ.',
    content: `
      <p>Khi quy mô dữ liệu vượt qua ngưỡng hàng triệu bản ghi, các phương pháp mở rộng theo chiều dọc (Vertical Scaling) truyền thống bắt đầu bộc lộ giới hạn chi phí đắt đỏ. Đây là lúc cơ chế mở rộng ngang (Horizontal Scaling) của MongoDB chứng minh được sức mạnh vượt trội.</p>
      
      <h3>Phân tán dữ liệu với Sharding</h3>
      <p>MongoDB hỗ trợ Sharding tự động ngay từ kiến trúc cốt lõi. Bằng cách phân chia dữ liệu dựa trên một <strong>Shard Key</strong>, hệ thống tự động phân phối các bài viết và bình luận sang nhiều máy chủ (nodes) trong cụm cluster, giúp chia tải băng thông và bộ nhớ vô cùng mượt mà.</p>

      <h3>Công cụ Tìm kiếm Toàn văn (Full-text Search) tích hợp</h3>
      <p>Thay vì phải triển khai và duy trì thêm một cụm Elasticsearch phức tạp cho các ứng dụng vừa và nhỏ, chúng ta có thể tận dụng ngay tính năng <strong>Text Index</strong> của MongoDB trên các trường <code>title</code> và <code>content</code>:</p>
      
      <pre><code>db.Posts.createIndex({ title: "text", content: "text" });</code></pre>
      
      <p>Khi đó, truy vấn tìm kiếm sử dụng toán tử <code>$text</code> sẽ tự động bỏ qua các stop-words, phân tích ngữ nghĩa tiếng Việt cơ bản và trả về kết quả được xếp hạng theo điểm số liên quan <code>textScore</code> từ cao xuống thấp.</p>
    `,
    status: 'published',
    createdAt: new Date('2026-07-16T12:30:00Z').toISOString(),
    authorId: initialAuthors[0].userId,
    author: initialAuthors[0], // Trần Quang Mạnh
    category: initialCategories[0], // Database
    tags: ['Big Data', 'Performance', 'MongoDB', 'NoSQL'],
    metrics: {
      views: 18200,
      likes: 950,
      shares: 120
    },
    recent_comments: [
      {
        commentId: generateObjectId(),
        userName: 'Admin',
        text: 'Tính năng Full-text Search của MongoDB chạy rất nhanh đối với dữ liệu vừa và nhỏ!',
        createdAt: new Date('2026-07-16T13:00:00Z').toISOString()
      }
    ]
  });

  // 3. Populate 50 standard documents according to the Chapter 3.3 script
  for (let i = 1; i <= 50; i++) {
    const author = initialAuthors[i % 3];
    const category = initialCategories[i % 5];
    
    // Calculate a unique creation date moving backwards day by day to simulate a timeline
    const creationDate = new Date();
    creationDate.setDate(creationDate.getDate() - i);
    
    samplePosts.push({
      _id: generateObjectId(),
      title: `Bài viết chuyên sâu về ${category.name} phần ${i}`,
      slug: `bai-viet-chuyen-sau-${category.name.toLowerCase()}-${i}`,
      excerpt: `Đây là tóm tắt ngắn của bài viết số ${i}. Nội dung này tập trung phân tích các vấn đề và bài toán thực tế cốt lõi của chuyên mục ${category.name}.`,
      content: `
        <p>Đây là nội dung chi tiết của bài viết số <strong>${i}</strong> thuộc chuyên mục <strong>${category.name}</strong>. Trong bài viết này, chúng ta sẽ cùng đi sâu tìm hiểu các khía cạnh kỹ thuật tiên tiến nhất để áp dụng hiệu quả vào hệ thống thực tế.</p>
        
        <h3>1. Khái niệm cơ bản trong ${category.name}</h3>
        <p>Khi bắt đầu xây dựng ứng dụng quy mô lớn, việc hiểu rõ lý thuyết cốt lõi giúp các lập trình viên tránh được các sai lầm trong quá trình triển khai cấu trúc thư mục, luồng dữ liệu và thiết kế kiến trúc hệ thống.</p>
        
        <pre><code>// Code minh họa cho bài viết số ${i}
function initializeModule() {
  console.log("Khởi tạo module ${category.name} thành công!");
  return { status: "active", version: "1.${i}.0" };
}</code></pre>

        <h3>2. Các thách thức và giải pháp</h3>
        <p>Mỗi giai đoạn phát triển lại mang tới những bài toán nâng cấp khác nhau, từ việc tối ưu hóa truy vấn dữ liệu đến tăng tốc thời gian phản hồi trang web.</p>
      `,
      status: i % 10 === 0 ? 'draft' : 'published', // Make every 10th post a draft to showcase draft deletion (Query 5)
      createdAt: creationDate.toISOString(),
      authorId: author.userId,
      author: author,
      category: {
        categoryId: generateObjectId(), // Creates a unique Category ID to represent standard mongo document behavior
        name: category.name
      },
      tags: [category.name, 'Tutorial', '2026', 'Advanced'],
      metrics: {
        views: Math.floor(Math.random() * 5000) + 100,
        likes: Math.floor(Math.random() * 500) + 10,
        shares: Math.floor(Math.random() * 50)
      },
      recent_comments: []
    });
  }

  return samplePosts;
}
