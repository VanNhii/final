// API middleware for handling common operations
export const withErrorHandling = (apiCall) => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      // Log error for debugging
      console.error('API Error:', error);
      
      // Check for specific error types
      if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      }
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        throw new Error('Bạn không có quyền thực hiện hành động này.');
      }
      
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        throw new Error('Không tìm thấy dữ liệu yêu cầu.');
      }
      
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        throw new Error('Lỗi server nội bộ. Vui lòng thử lại sau.');
      }
      
      // Default error message
      throw new Error(error.message || 'Đã xảy ra lỗi không mong muốn.');
    }
  };
};

// Retry logic for failed requests
export const withRetry = (apiCall, maxRetries = 3, delay = 1000) => {
  return async (...args) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall(...args);
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain error types
        if (error.message?.includes('401') || 
            error.message?.includes('403') || 
            error.message?.includes('404')) {
          throw error;
        }
        
        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  };
};

// Cache wrapper for GET requests
export const withCache = (apiCall, ttl = 5 * 60 * 1000) => { // 5 minutes default
  const cache = new Map();
  
  return async (...args) => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    const data = await apiCall(...args);
    cache.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache entries
    setTimeout(() => {
      cache.delete(key);
    }, ttl);
    
    return data;
  };
};

// Loading state wrapper
export const withLoadingState = (apiCall) => {
  return async (setState, ...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall(...args);
      setState(prev => ({ ...prev, loading: false, data: result }));
      return result;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || 'Unknown error' 
      }));
      throw error;
    }
  };
};

// Pagination helper
export const usePagination = (fetchFunction, dependencies = []) => {
  const [state, setState] = useState({
    data: [],
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0
    }
  });
  
  const fetchData = useCallback(async (params = {}) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetchFunction({
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...params
      });
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          data: response.data,
          loading: false,
          pagination: {
            ...prev.pagination,
            total: response.total || 0,
            totalPages: response.totalPages || 0
          }
        }));
      } else {
        throw new Error(response.message || 'Failed to fetch data');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
      throw error;
    }
  }, [fetchFunction, state.pagination.page, state.pagination.limit]);
  
  const changePage = (page) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
  };
  
  const changeLimit = (limit) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, limit, page: 1 }
    }));
  };
  
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);
  
  return {
    ...state,
    fetchData,
    changePage,
    changeLimit,
    refresh: () => fetchData()
  };
};

// Search with debounce
export const useSearch = (searchFunction, delay = 500) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await searchFunction(searchTerm);
        setResults(response.data || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchFunction, delay]);
  
  return {
    searchTerm,
    setSearchTerm,
    results,
    loading
  };
};

export default {
  withErrorHandling,
  withRetry,
  withCache,
  withLoadingState,
  usePagination,
  useSearch
};
