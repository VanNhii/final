import LoadingSpinner from '@/components/common/LoadingSpinner';
import adminService from '@/services/adminService';
import aiService from '@/services/aiService';
import { useEffect, useState } from 'react';
import {
    FaBrain,
    FaCheckCircle,
    FaDatabase,
    FaExclamationTriangle,
    FaInfoCircle,
    FaRobot,
    FaSync
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const AIManagement = () => {
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchModelStatus(),
        fetchStatistics(),
        checkHealth()
      ]);
    } catch (error) {
      console.error('Error fetching AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const response = await adminService.getAIModelStatus();
      if (response.success) {
        setModelStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching model status:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await adminService.getAIStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const checkHealth = async () => {
    try {
      const response = await aiService.checkHealth();
      if (response.success && response.data) {
        setHealthStatus(response.data);
      } else {
        setHealthStatus({ status: 'unhealthy' });
      }
    } catch (error) {
      console.error('Error checking health:', error);
      setHealthStatus({ status: 'unhealthy' });
    }
  };

  const handleTrainModel = async (modelType = 'both') => {
    if (!window.confirm(`Bạn có chắc muốn huấn luyện mô hình ${modelType}? Quá trình này có thể mất vài phút.`)) {
      return;
    }

    try {
      setTraining(true);
      const response = await adminService.trainAIModel({ 
        model_type: modelType,
        days_back: 180 
      });

      if (response.success) {
        toast.success('Huấn luyện mô hình thành công!');
        await fetchModelStatus();
      } else {
        toast.error('Huấn luyện thất bại: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error training model:', error);
      toast.error('Không thể huấn luyện mô hình');
    } finally {
      setTraining(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const isHealthy = healthStatus?.status === 'healthy';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Quản lý AI & Machine Learning
        </h1>
        <p className="text-gray-600">
          Giám sát và quản lý hệ thống gợi ý việc làm thông minh
        </p>
      </div>

      {/* Health Status */}
      <div className={`mb-6 p-6 rounded-lg border-2 ${isHealthy ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FaRobot className={`text-3xl ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Trạng thái AI Service
              </h3>
              <p className={`text-sm ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
                {isHealthy ? 'Đang hoạt động bình thường' : 'Không khả dụng'}
              </p>
            </div>
          </div>
          <button
            onClick={checkHealth}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FaSync />
            Kiểm tra
          </button>
        </div>
        {healthStatus?.timestamp && (
          <p className="text-sm text-gray-600 mt-2">
            Kiểm tra lần cuối: {formatDate(healthStatus.timestamp)}
          </p>
        )}
      </div>

      {/* Model Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Content-Based Model */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaBrain className="text-3xl text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mô hình Content-Based
              </h3>
              <p className="text-sm text-gray-600">
                Gợi ý dựa trên nội dung công việc
              </p>
            </div>
          </div>

          {modelStatus?.content_based ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {modelStatus.content_based.loaded ? (
                  <>
                    <FaCheckCircle className="text-green-600" />
                    <span className="text-green-600 font-medium">Đã tải</span>
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle className="text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Chưa tải</span>
                  </>
                )}
              </div>

              {modelStatus.content_based.metadata && (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">Phiên bản: </span>
                    <span className="font-medium">
                      {modelStatus.content_based.metadata.version || 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Huấn luyện: </span>
                    <span className="font-medium">
                      {formatDate(modelStatus.content_based.metadata.trained_at)}
                    </span>
                  </div>
                  {modelStatus.content_based.metadata.metrics && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="text-xs font-medium text-gray-700 mb-2">Metrics:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(modelStatus.content_based.metadata.metrics).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-gray-600">{key}: </span>
                            <span className="font-medium">
                              {typeof value === 'number' ? value.toFixed(4) : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => handleTrainModel('content_based')}
                disabled={training}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {training ? <FaSync className="animate-spin" /> : <FaSync />}
                Huấn luyện lại
              </button>
            </div>
          ) : (
            <p className="text-gray-500">Không có dữ liệu</p>
          )}
        </div>

        {/* Collaborative Filtering Model */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaDatabase className="text-3xl text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Mô hình Collaborative Filtering
              </h3>
              <p className="text-sm text-gray-600">
                Gợi ý dựa trên hành vi người dùng
              </p>
            </div>
          </div>

          {modelStatus?.collaborative_filtering ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {modelStatus.collaborative_filtering.loaded ? (
                  <>
                    <FaCheckCircle className="text-green-600" />
                    <span className="text-green-600 font-medium">Đã tải</span>
                  </>
                ) : (
                  <>
                    <FaExclamationTriangle className="text-yellow-600" />
                    <span className="text-yellow-600 font-medium">Chưa tải</span>
                  </>
                )}
              </div>

              {modelStatus.collaborative_filtering.metadata && (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">Phiên bản: </span>
                    <span className="font-medium">
                      {modelStatus.collaborative_filtering.metadata.version || 'N/A'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Huấn luyện: </span>
                    <span className="font-medium">
                      {formatDate(modelStatus.collaborative_filtering.metadata.trained_at)}
                    </span>
                  </div>
                </>
              )}

              <button
                onClick={() => handleTrainModel('collaborative_filtering')}
                disabled={training}
                className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {training ? <FaSync className="animate-spin" /> : <FaSync />}
                Huấn luyện lại
              </button>
            </div>
          ) : (
            <p className="text-gray-500">Không có dữ liệu</p>
          )}
        </div>
      </div>

      {/* Train All Button */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <FaInfoCircle className="text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Huấn luyện toàn bộ hệ thống
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Huấn luyện lại cả hai mô hình để cải thiện độ chính xác của hệ thống gợi ý.
              Quá trình này sẽ sử dụng dữ liệu từ 180 ngày gần nhất và có thể mất 5-10 phút.
            </p>
            <button
              onClick={() => handleTrainModel('both')}
              disabled={training}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {training ? (
                <>
                  <FaSync className="animate-spin" />
                  Đang huấn luyện...
                </>
              ) : (
                <>
                  <FaBrain />
                  Huấn luyện toàn bộ
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    
    </div>
  );
};

export default AIManagement;
