import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import recruiterService from '@/services/recruiterService';

const CreateJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'VND',
    job_type: 'full_time',
    work_location: 'onsite',
    location: {
      address: '',
      city: '',
      country: 'Vietnam'
    },
    experience_required: {
      min: 0,
      max: ''
    },
    education_required: 'not_required',
    skills_required: [],
    application_deadline: '',
    category_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await recruiterService.getJobCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Không thể tải danh mục công việc');
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSkillAdd = () => {
    const newSkill = {
      skill_name: '',
      is_required: true,
      weight: 5
    };
    setFormData(prev => ({
      ...prev,
      skills_required: [...prev.skills_required, newSkill]
    }));
  };

  const handleSkillChange = (index, field, value) => {
    const updatedSkills = [...formData.skills_required];
    updatedSkills[index] = {
      ...updatedSkills[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      skills_required: updatedSkills
    }));
  };

  const handleSkillRemove = (index) => {
    const updatedSkills = formData.skills_required.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      skills_required: updatedSkills
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.title.trim()) errors.push('Tiêu đề công việc là bắt buộc');
    if (!formData.description.trim()) errors.push('Mô tả công việc là bắt buộc');
    if (!formData.requirements.trim()) errors.push('Yêu cầu công việc là bắt buộc');
    if (!formData.location.city.trim()) errors.push('Thành phố là bắt buộc');
    if (!formData.category_id) errors.push('Danh mục công việc là bắt buộc');
    
    if (formData.salary_min && formData.salary_max) {
      if (parseInt(formData.salary_min) > parseInt(formData.salary_max)) {
        errors.push('Mức lương tối thiểu phải nhỏ hơn hoặc bằng mức lương tối đa');
      }
    }
    
    if (formData.experience_required.min && formData.experience_required.max) {
      if (parseInt(formData.experience_required.min) > parseInt(formData.experience_required.max)) {
        errors.push('Kinh nghiệm tối thiểu phải nhỏ hơn hoặc bằng kinh nghiệm tối đa');
      }
    }
    
    if (formData.application_deadline && new Date(formData.application_deadline) <= new Date()) {
      errors.push('Hạn nộp đơn phải là ngày trong tương lai');
    }

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : undefined,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : undefined,
        experience_required: {
          min: parseInt(formData.experience_required.min) || 0,
          max: formData.experience_required.max ? parseInt(formData.experience_required.max) : undefined
        },
        skills_required: formData.skills_required.filter(skill => skill.skill_name.trim())
      };
      
      // Remove empty optional fields
      if (!submitData.salary_min) delete submitData.salary_min;
      if (!submitData.salary_max) delete submitData.salary_max;
      if (!submitData.experience_required.max) delete submitData.experience_required.max;
      if (!submitData.benefits?.trim()) delete submitData.benefits;
      if (!submitData.application_deadline) delete submitData.application_deadline;
      if (!submitData.location.address?.trim()) delete submitData.location.address;
      
      const response = await recruiterService.createJob(submitData);
      
      if (response.success) {
        toast.success('Tạo công việc thành công!');
        navigate('/recruiter/jobs');
      } else {
        throw new Error(response.message || 'Có lỗi xảy ra khi tạo công việc');
      }
    } catch (error) {
      console.error('Create job error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo công việc';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const jobTypeOptions = [
    { value: 'full_time', label: 'Toàn thời gian' },
    { value: 'part_time', label: 'Bán thời gian' },
    { value: 'contract', label: 'Hợp đồng' },
    { value: 'internship', label: 'Thực tập' },
    { value: 'freelance', label: 'Freelance' }
  ];

  const workLocationOptions = [
    { value: 'onsite', label: 'Tại văn phòng' },
    { value: 'remote', label: 'Làm việc từ xa' },
    { value: 'hybrid', label: 'Hybrid' }
  ];

  const educationOptions = [
    { value: 'not_required', label: 'Không yêu cầu' },
    { value: 'high_school', label: 'Trung học phổ thông' },
    { value: 'associate', label: 'Cao đẳng' },
    { value: 'bachelor', label: 'Đại học' },
    { value: 'master', label: 'Thạc sĩ' },
    { value: 'doctorate', label: 'Tiến sĩ' }
  ];

  const salaryOptions = [
    { value: 'VND', label: 'VND' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => navigate('/recruiter/jobs')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Tạo công việc mới</h1>
        </div>
        <p className="text-gray-600">Điền thông tin chi tiết về vị trí tuyển dụng của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Thông tin cơ bản</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề công việc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Ví dụ: Senior Frontend Developer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục công việc <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Chọn danh mục</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.category_name || category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loại công việc <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => handleInputChange('job_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {jobTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình thức làm việc <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.work_location}
                onChange={(e) => handleInputChange('work_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {workLocationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hạn nộp đơn
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                onChange={(e) => handleInputChange('application_deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Mô tả công việc</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả công việc <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Mô tả chi tiết về công việc, trách nhiệm và môi trường làm việc..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={5000}
                required
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {formData.description.length}/5000
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yêu cầu công việc <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                placeholder="Liệt kê các yêu cầu về kỹ năng, kinh nghiệm, bằng cấp..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={3000}
                required
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {formData.requirements.length}/3000
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quyền lợi
              </label>
              <textarea
                value={formData.benefits}
                onChange={(e) => handleInputChange('benefits', e.target.value)}
                placeholder="Mô tả các quyền lợi, phúc lợi mà ứng viên sẽ nhận được..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={2000}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {formData.benefits.length}/2000
              </div>
            </div>
          </div>
        </div>

        {/* Salary & Experience */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Mức lương & Kinh nghiệm</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mức lương tối thiểu
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => handleInputChange('salary_min', e.target.value)}
                  placeholder="5000000"
                  min="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={formData.salary_currency}
                  onChange={(e) => handleInputChange('salary_currency', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {salaryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mức lương tối đa
              </label>
              <input
                type="number"
                value={formData.salary_max}
                onChange={(e) => handleInputChange('salary_max', e.target.value)}
                placeholder="15000000"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kinh nghiệm tối thiểu (năm)
              </label>
              <input
                type="number"
                value={formData.experience_required.min}
                onChange={(e) => handleInputChange('experience_required.min', e.target.value)}
                placeholder="0"
                min="0"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kinh nghiệm tối đa (năm)
              </label>
              <input
                type="number"
                value={formData.experience_required.max}
                onChange={(e) => handleInputChange('experience_required.max', e.target.value)}
                placeholder="5"
                min="0"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yêu cầu bằng cấp
              </label>
              <select
                value={formData.education_required}
                onChange={(e) => handleInputChange('education_required', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {educationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Địa điểm làm việc</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thành phố <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location.city}
                onChange={(e) => handleInputChange('location.city', e.target.value)}
                placeholder="Hà Nội"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quốc gia
              </label>
              <input
                type="text"
                value={formData.location.country}
                onChange={(e) => handleInputChange('location.country', e.target.value)}
                placeholder="Vietnam"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Địa chỉ cụ thể
              </label>
              <input
                type="text"
                value={formData.location.address}
                onChange={(e) => handleInputChange('location.address', e.target.value)}
                placeholder="Số 123, Đường ABC, Quận XYZ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Skills Required */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Kỹ năng yêu cầu</h2>
            <button
              type="button"
              onClick={handleSkillAdd}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Thêm kỹ năng
            </button>
          </div>

          <div className="space-y-4">
            {formData.skills_required.map((skill, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={skill.skill_name}
                    onChange={(e) => handleSkillChange(index, 'skill_name', e.target.value)}
                    placeholder="Tên kỹ năng (ví dụ: ReactJS, NodeJS...)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={skill.is_required}
                      onChange={(e) => handleSkillChange(index, 'is_required', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Bắt buộc</span>
                  </label>
                </div>
                
                <div className="w-20">
                  <select
                    value={skill.weight}
                    onChange={(e) => handleSkillChange(index, 'weight', parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>Mức {num}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleSkillRemove(index)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            
            {formData.skills_required.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p>Chưa có kỹ năng nào được thêm</p>
                <p className="text-sm">Nhấn "Thêm kỹ năng" để bắt đầu</p>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Cài đặt</h2>
          
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="mr-3"
              />
              <span className="text-sm font-medium text-gray-700">
                Kích hoạt tin tuyển dụng ngay sau khi tạo
              </span>
            </label>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/recruiter/jobs')}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, is_active: false }));
                handleSubmit({ preventDefault: () => {} });
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lưu nháp
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Tạo công việc
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
