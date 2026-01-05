import LoadingSpinner from '@/components/common/LoadingSpinner';
import contentService from '@/services/contentService';
import { useEffect, useState } from 'react';
import { BsJournalText } from 'react-icons/bs';
import {
    FiArrowRight,
    FiBookOpen,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiFileText,
    FiFilter,
    FiSearch
} from 'react-icons/fi';
import { MdSort } from 'react-icons/md';
import { Link, useSearchParams } from 'react-router';

const Blog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    sort: searchParams.get('sort') || '-published_at'
  });
  
  const [loading, setLoading] = useState(false);

  // Fetch blog posts
  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pagination.limit,
        content_type: 'blog',
        ...filters
      };
      
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await contentService.getAllContent(params);
      
      if (response.success) {
        setPosts(response.data.data || response.data || []);
        
        // Safely access pagination data with fallbacks
        const paginationData = response.data.pagination || {};
        setPagination({
          page: paginationData.page || page,
          limit: paginationData.limit || pagination.limit,
          total: paginationData.total || 0,
          totalPages: paginationData.totalPages || 1
        });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
      // Reset pagination to safe defaults on error
      setPagination({
        page: 1,
        limit: pagination.limit,
        total: 0,
        totalPages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch featured posts
  const fetchFeaturedPosts = async () => {
    try {
      const response = await contentService.getFeaturedContent({
        content_type: 'blog',
        limit: 3
      });
      
      if (response.success) {
        setFeaturedPosts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching featured posts:', error);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await contentService.getCategoriesByType('blog_post');
      if (response.success) {
        setCategories(response.data?.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchPosts(1);
    fetchFeaturedPosts();
    fetchCategories();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchPosts(1);
    
    // Update URL params
    const newParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) newParams.set(key, value);
    });
    setSearchParams(newParams);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchPosts(newPage);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate reading time
  const calculateReadingTime = (content) => {
    if (!content) return 5;
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-lg mr-3">
                <BsJournalText className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Blog</h1>
            </div>
            <p className="text-gray-600 text-lg">
              Chia sẻ kiến thức, kinh nghiệm và xu hướng trong ngành IT
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FiBookOpen className="w-6 h-6 mr-2 text-blue-600" />
              Bài viết nổi bật
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Link
                  key={post._id}
                  to={`/blog/${post.slug || post._id}`}
                  className="group"
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                    {post.featured_image_url && (
                      <div className="overflow-hidden">
                        <img
                          src={post.featured_image_url}
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <FiClock className="w-4 h-4 mr-1.5" />
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                        {post.category && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="text-blue-600 flex items-center">
                              <FiFileText className="w-3 h-3 mr-1" />
                              {post.category}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 line-clamp-2 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                        {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-gray-500 flex items-center">
                          <FiClock className="w-4 h-4 mr-1" />
                          {calculateReadingTime(post.content)} phút đọc
                        </span>
                        <span className="text-blue-600 group-hover:text-blue-700 font-semibold flex items-center">
                          Đọc thêm
                          <FiArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 mb-8 lg:mb-0">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-4 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <FiFilter className="w-5 h-5 mr-2 text-blue-600" />
                Bộ lọc
              </h3>
              
              {/* Search */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiSearch className="w-4 h-4 mr-1.5" />
                  Tìm kiếm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Tìm kiếm bài viết..."
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <FiFileText className="w-4 h-4 mr-1.5" />
                  Danh mục
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <MdSort className="w-4 h-4 mr-1.5" />
                  Sắp xếp
                </label>
                <select
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="-published_at">Mới nhất</option>
                  <option value="published_at">Cũ nhất</option>
                  <option value="-views_count">Xem nhiều nhất</option>
                  <option value="title">Theo tên A-Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results count */}
            <div className="flex items-center justify-between mb-6 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="text-sm text-gray-600 font-medium flex items-center">
                {pagination.total > 0 && (
                  <>
                    <FiFileText className="w-4 h-4 mr-2 text-blue-600" />
                    Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} của {pagination.total} bài viết
                  </>
                )}
              </div>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Posts Grid */}
                {posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <Link
                        key={post._id}
                        to={`/blog/${post.slug || post._id}`}
                        className="group"
                      >
                        <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100">
                          {post.featured_image_url && (
                            <div className="overflow-hidden">
                              <img
                                src={post.featured_image_url}
                                alt={post.title}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            <div className="flex items-center text-sm text-gray-500 mb-3">
                              <FiClock className="w-4 h-4 mr-1.5" />
                              <span>{formatDate(post.published_at || post.created_at)}</span>
                              {post.category && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span className="text-blue-600 flex items-center">
                                    <FiFileText className="w-3 h-3 mr-1" />
                                    {post.category}
                                  </span>
                                </>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 line-clamp-2 transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                              {post.excerpt || (post.content ? post.content.substring(0, 150) + '...' : '')}
                            </p>
                            <div className="mt-4 flex items-center justify-between text-sm">
                              <span className="text-gray-500 flex items-center">
                                <FiClock className="w-4 h-4 mr-1" />
                                {calculateReadingTime(post.content)} phút đọc
                              </span>
                              <span className="text-blue-600 group-hover:text-blue-700 font-semibold flex items-center">
                                Đọc thêm
                                <FiArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                    <div className="inline-block p-6 bg-gray-100 rounded-full mb-4">
                      <FiFileText className="w-16 h-16 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Không tìm thấy bài viết nào
                    </h3>
                    <p className="text-gray-500">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <nav className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-2 border border-gray-100">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <FiChevronLeft className="w-4 h-4 mr-1" />
                        Trước
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              pageNum === pagination.page
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sau
                        <FiChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;