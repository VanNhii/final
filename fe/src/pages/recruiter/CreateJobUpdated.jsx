import recruiterService from '@/services/recruiterService';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';

const CreateJobUpdated = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // ✅ UPDATED: FormData structure with new fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: [''], // ✅ Changed to Array
    benefits: [''],     // ✅ Changed to Array
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
    is_active: true,
    
    // ✅ NEW FIELDS
    is_hot: false,
    is_urgent: false,
    tags: [''],
    nice_to_have_skills: [],
    working_conditions: {
      working_hours: '8:00 - 17:30 (Thứ 2 - Thứ 6)',
      working_model: 'onsite',
      probation_period: '2 tháng',
      start_date: 'Thỏa thuận'
    },
    job_highlights: ['']
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

  // ✅ UPDATED: Handle nested object changes
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

  // ✅ NEW: Array field handlers
  const handleArrayFieldChange = (fieldName, index, value) => {
    const newArray = [...formData[fieldName]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [fieldName]: newArray }));
  };

  const addArrayField = (fieldName) => {
    setFormData(prev => ({ 
      ...prev, 
      [fieldName]: [...prev[fieldName], ''] 
    }));
  };

  const removeArrayField = (fieldName, index) => {
    if (formData[fieldName].length <= 1) return; // Keep at least one
    const newArray = formData[fieldName].filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [fieldName]: newArray }));
  };

  // ✅ NEW: Skills handlers
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

  const addSkill = (isRequired = true) => {
    const fieldName = isRequired ? 'skills_required' : 'nice_to_have_skills';
    const newSkill = {
      skill_name: '',
      is_required: isRequired,
      weight: isRequired ? 5 : 3
    };
    setFormData(prev => ({
      ...prev,
      [fieldName]: [...prev[fieldName], newSkill]
    }));
  };

  const removeSkill = (index, isRequired = true) => {
    const fieldName = isRequired ? 'skills_required' : 'nice_to_have_skills';
    const updatedSkills = formData[fieldName].filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [fieldName]: updatedSkills
    }));
  };

  // ✅ NEW: Working conditions handler
  const handleWorkingConditionChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      working_conditions: {
        ...prev.working_conditions,
        [field]: value
      }
    }));
  };

  // ✅ UPDATED: Validation with new fields
  const validateForm = () => {
    const errors = [];
    
    if (!formData.title.trim()) errors.push('Tiêu đề công việc là bắt buộc');
    if (!formData.description.trim()) errors.push('Mô tả công việc là bắt buộc');
    if (!formData.location.city.trim()) errors.push('Thành phố là bắt buộc');
    if (!formData.category_id) errors.push('Danh mục công việc là bắt buộc');
    
    // ✅ NEW: Validate array fields
    const validReqs = formData.requirements.filter(req => req.trim());
    if (validReqs.length === 0) {
      errors.push('Ít nhất một yêu cầu công việc là bắt buộc');
    }
    
    const validTags = formData.tags.filter(tag => tag.trim());
    if (validTags.length === 0) {
      errors.push('Ít nhất một tag là bắt buộc');
    }
    
    // ✅ NEW: Validate working conditions
    if (!formData.working_conditions.working_hours.trim()) {
      errors.push('Giờ làm việc là bắt buộc');
    }
    
    if (formData.salary_min && formData.salary_max) {
      if (parseInt(formData.salary_min) > parseInt(formData.salary_max)) {
        errors.push('Mức lương tối thiểu phải nhỏ hơn hoặc bằng mức lương tối đa');
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

  // ✅ UPDATED: Submit with new data structure
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // ✅ NEW: Prepare data with array filtering
      const submitData = {
        ...formData,
        salary_min: formData.salary_min ? parseInt(formData.salary_min) : undefined,
        salary_max: formData.salary_max ? parseInt(formData.salary_max) : undefined,
        experience_required: {
          min: parseInt(formData.experience_required.min) || 0,
          max: formData.experience_required.max ? parseInt(formData.experience_required.max) : undefined
        },
        // ✅ Filter out empty array items
        requirements: formData.requirements.filter(req => req.trim()),
        benefits: formData.benefits.filter(benefit => benefit.trim()),
        tags: formData.tags.filter(tag => tag.trim()),
        skills_required: formData.skills_required.filter(skill => skill.skill_name.trim()),
        nice_to_have_skills: formData.nice_to_have_skills.filter(skill => skill.skill_name.trim()),
        job_highlights: formData.job_highlights.filter(highlight => highlight.trim())
      };
      
      // Remove empty optional fields
      if (!submitData.salary_min) delete submitData.salary_min;
      if (!submitData.salary_max) delete submitData.salary_max;
      if (!submitData.experience_required.max) delete submitData.experience_required.max;
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

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả công việc <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Mô tả chi tiết về công việc, trách nhiệm, môi trường làm việc..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={5000}
                required
              />
            </div>
          </div>
        </div>

        {/* ✅ NEW: Job Priority & Features */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ưu tiên & Đặc điểm</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_hot"
                checked={formData.is_hot}
                onChange={(e) => handleInputChange('is_hot', e.target.checked)}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="is_hot" className="ml-2 text-sm font-medium text-gray-700">
                🔥 Việc làm HOT (Nổi bật trên trang chủ)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_urgent"
                checked={formData.is_urgent}
                onChange={(e) => handleInputChange('is_urgent', e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="is_urgent" className="ml-2 text-sm font-medium text-gray-700">
                ⚡ Tuyển GẤP (Ưu tiên hiển thị)
              </label>
            </div>
          </div>
        </div>

        {/* ✅ NEW: Requirements (Array) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Yêu cầu công việc</h2>
          
          <div className="space-y-3">
            {formData.requirements.map((requirement, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={requirement}
                  onChange={(e) => handleArrayFieldChange('requirements', index, e.target.value)}
                  placeholder={`Yêu cầu ${index + 1}: Ví dụ - 3+ năm kinh nghiệm React`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.requirements.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayField('requirements', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('requirements')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              ➕ Thêm yêu cầu
            </button>
          </div>
        </div>

        {/* ✅ NEW: Benefits (Array) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quyền lợi & Phúc lợi</h2>
          
          <div className="space-y-3">
            {formData.benefits.map((benefit, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={benefit}
                  onChange={(e) => handleArrayFieldChange('benefits', index, e.target.value)}
                  placeholder={`Quyền lợi ${index + 1}: Ví dụ - Bảo hiểm sức khỏe cao cấp`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.benefits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayField('benefits', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('benefits')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              ➕ Thêm quyền lợi
            </button>
          </div>
        </div>

        {/* ✅ NEW: Tags */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Tags & Kỹ năng</h2>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Thêm các tag để ứng viên dễ tìm thấy công việc</p>
            {formData.tags.map((tag, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => handleArrayFieldChange('tags', index, e.target.value)}
                  placeholder={`Tag ${index + 1}: React, TypeScript, Node.js...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {formData.tags.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeArrayField('tags', index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('tags')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              ➕ Thêm tag
            </button>
          </div>
        </div>

        {/* ✅ NEW: Working Conditions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Điều kiện làm việc</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giờ làm việc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.working_conditions.working_hours}
                onChange={(e) => handleWorkingConditionChange('working_hours', e.target.value)}
                placeholder="8:00 - 17:30 (Thứ 2 - Thứ 6)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hình thức làm việc
              </label>
              <select
                value={formData.working_conditions.working_model}
                onChange={(e) => handleWorkingConditionChange('working_model', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                Thời gian thử việc
              </label>
              <input
                type="text"
                value={formData.working_conditions.probation_period}
                onChange={(e) => handleWorkingConditionChange('probation_period', e.target.value)}
                placeholder="2 tháng"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bắt đầu làm việc
              </label>
              <input
                type="text"
                value={formData.working_conditions.start_date}
                onChange={(e) => handleWorkingConditionChange('start_date', e.target.value)}
                placeholder="Ngay sau khi onboard"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/recruiter/jobs')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Đang tạo...' : 'Tạo công việc'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJobUpdated;