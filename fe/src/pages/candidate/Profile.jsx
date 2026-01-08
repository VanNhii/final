import LoadingSpinner from '@/components/common/LoadingSpinner';
import candidateService from '@/services/candidateService';
import uploadService from '@/services/uploadService';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';

const CandidateProfile = () => {
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);

  // Modal states
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingSkill, setEditingSkill] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await candidateService.getCandidateProfile();
      if (response.success) {
        setProfile(response.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const response = await candidateService.updateCandidateProfile(profile);
      if (response.success) {
        setProfile(response.data);
        setIsEditing(false);
        toast.success('Cập nhật hồ sơ thành công!');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingAvatar(true);
      const response = await uploadService.uploadAvatar(file);

      if (response.success && response.data) {
        // Backend returns file_url like: /uploads/profile_avatar/filename.jpg
        const avatarUrl = response.data.file_url;

        // Update profile with new avatar URL
        await candidateService.updateUserProfile(profile.user_id._id, {
          avatar_url: avatarUrl
        });

        // Update local state
        setProfile(prev => ({
          ...prev,
          user_id: {
            ...prev.user_id,
            avatar_url: avatarUrl
          }
        }));
        toast.success('Cập nhật ảnh đại diện thành công!');
      } else {
        throw new Error(response.message || 'Upload ảnh thất bại');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(error.message || 'Không thể tải ảnh lên. Vui lòng thử lại');
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  // Experience handlers
  const handleAddExperience = () => {
    setEditingExperience({
      company_name: '',
      position: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      technologies: []
    });
    setShowExperienceModal(true);
  };

  const handleEditExperience = (exp) => {
    setEditingExperience({ ...exp });
    setShowExperienceModal(true);
  };

  const handleSaveExperience = async () => {
    if (!editingExperience.company_name || !editingExperience.position || !editingExperience.start_date) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setSaving(true);
      let updatedExperience;
      if (editingExperience._id) {
        // Edit existing
        updatedExperience = profile.experience.map(exp =>
          exp._id === editingExperience._id ? editingExperience : exp
        );
      } else {
        // Add new - remove _id to let MongoDB generate it
        const { _id, ...newExperience } = editingExperience;
        updatedExperience = [...(profile.experience || []), newExperience];
      }

      const updatedProfile = { ...profile, experience: updatedExperience };
      const response = await candidateService.updateCandidateProfile(updatedProfile);

      if (response.success) {
        setProfile(response.data);
        setShowExperienceModal(false);
        setEditingExperience(null);
        toast.success(editingExperience._id ? 'Đã cập nhật kinh nghiệm' : 'Đã thêm kinh nghiệm mới');
      }
    } catch (error) {
      console.error('Error saving experience:', error);
      toast.error(error.message || 'Không thể lưu kinh nghiệm');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExperience = async (expId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kinh nghiệm này?')) {
      try {
        setSaving(true);
        const updatedExperience = profile.experience.filter(exp => exp._id !== expId);
        const updatedProfile = { ...profile, experience: updatedExperience };

        const response = await candidateService.updateCandidateProfile(updatedProfile);

        if (response.success) {
          setProfile(response.data);
          toast.success('Đã xóa kinh nghiệm');
        }
      } catch (error) {
        console.error('Error deleting experience:', error);
        toast.error(error.message || 'Không thể xóa kinh nghiệm');
      } finally {
        setSaving(false);
      }
    }
  };

  // Education handlers
  const handleAddEducation = () => {
    setEditingEducation({
      school_name: '',
      degree: '',
      major: '',
      start_date: '',
      end_date: '',
      is_current: false,
      gpa: '',
      description: ''
    });
    setShowEducationModal(true);
  };

  const handleEditEducation = (edu) => {
    setEditingEducation({ ...edu });
    setShowEducationModal(true);
  };

  const handleSaveEducation = async () => {
    if (!editingEducation.school_name || !editingEducation.degree || !editingEducation.major || !editingEducation.start_date) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    try {
      setSaving(true);
      let updatedEducation;
      if (editingEducation._id) {
        // Edit existing
        updatedEducation = profile.education.map(edu =>
          edu._id === editingEducation._id ? editingEducation : edu
        );
      } else {
        // Add new - remove _id to let MongoDB generate it
        const { _id, ...newEducation } = editingEducation;
        updatedEducation = [...(profile.education || []), newEducation];
      }

      const updatedProfile = { ...profile, education: updatedEducation };
      const response = await candidateService.updateCandidateProfile(updatedProfile);

      if (response.success) {
        setProfile(response.data);
        setShowEducationModal(false);
        setEditingEducation(null);
        toast.success(editingEducation._id ? 'Đã cập nhật học vấn' : 'Đã thêm học vấn mới');
      }
    } catch (error) {
      console.error('Error saving education:', error);
      toast.error(error.message || 'Không thể lưu học vấn');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEducation = async (eduId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học vấn này?')) {
      try {
        setSaving(true);
        const updatedEducation = profile.education.filter(edu => edu._id !== eduId);
        const updatedProfile = { ...profile, education: updatedEducation };

        const response = await candidateService.updateCandidateProfile(updatedProfile);

        if (response.success) {
          setProfile(response.data);
          toast.success('Đã xóa học vấn');
        }
      } catch (error) {
        console.error('Error deleting education:', error);
        toast.error(error.message || 'Không thể xóa học vấn');
      } finally {
        setSaving(false);
      }
    }
  };

  // Skill handlers
  const handleAddSkill = () => {
    setEditingSkill({
      skill_name: '',
      skill_level: 'intermediate',
      years_of_experience: 0,
      is_primary: false
    });
    setShowSkillModal(true);
  };

  const handleEditSkill = (skill, index) => {
    setEditingSkill({ ...skill, index });
    setShowSkillModal(true);
  };

  const handleSaveSkill = async () => {
    if (!editingSkill.skill_name) {
      toast.error('Vui lòng nhập tên kỹ năng');
      return;
    }

    try {
      setSaving(true);
      let updatedSkills;
      if (editingSkill.index !== undefined) {
        // Edit existing
        updatedSkills = profile.skills_detailed.map((skill, idx) =>
          idx === editingSkill.index ? { ...editingSkill, index: undefined } : skill
        );
      } else {
        // Add new
        const { index, ...skillData } = editingSkill;
        updatedSkills = [...(profile.skills_detailed || []), skillData];
      }

      const updatedProfile = { ...profile, skills_detailed: updatedSkills };
      const response = await candidateService.updateCandidateProfile(updatedProfile);

      if (response.success) {
        setProfile(response.data);
        setShowSkillModal(false);
        setEditingSkill(null);
        toast.success(editingSkill.index !== undefined ? 'Đã cập nhật kỹ năng' : 'Đã thêm kỹ năng mới');
      }
    } catch (error) {
      console.error('Error saving skill:', error);
      toast.error(error.message || 'Không thể lưu kỹ năng');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa kỹ năng này?')) {
      try {
        setSaving(true);
        const updatedSkills = profile.skills_detailed.filter((_, index) => index !== skillId);
        const updatedProfile = { ...profile, skills_detailed: updatedSkills };

        const response = await candidateService.updateCandidateProfile(updatedProfile);

        if (response.success) {
          setProfile(response.data);
          toast.success('Đã xóa kỹ năng');
        }
      } catch (error) {
        console.error('Error deleting skill:', error);
        toast.error(error.message || 'Không thể xóa kỹ năng');
      } finally {
        setSaving(false);
      }
    }
  };

  const getSkillLevel = (level) => {
    const levels = {
      'beginner': 'Mới bắt đầu',
      'intermediate': 'Trung bình',
      'advanced': 'Nâng cao',
      'expert': 'Chuyên gia'
    };
    return levels[level] || level;
  };

  const getSkillLevelNumber = (level) => {
    const levels = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3,
      'expert': 4
    };
    return levels[level] || 2;
  };

  const renderSkillBars = (level) => {
    const levelNum = typeof level === 'string' ? getSkillLevelNumber(level) : level;
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-6 h-2 rounded ${i <= levelNum ? 'bg-blue-500' : 'bg-gray-200'
              }`}
          />
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'personal', label: 'Thông tin cá nhân', icon: '👤' },
    { id: 'professional', label: 'Thông tin nghề nghiệp', icon: '💼' },
    { id: 'skills', label: 'Kỹ năng', icon: '⚡' },
    { id: 'experience', label: 'Kinh nghiệm', icon: '📋' },
    { id: 'education', label: 'Học vấn', icon: '🎓' }
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Không tìm thấy thông tin hồ sơ</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-4 py-2 rounded-lg font-medium ${isEditing
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
          >
            {isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
          </button>
          {isEditing && (
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>Lưu thay đổi</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Profile completeness */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-blue-900">Độ hoàn thiện hồ sơ</h3>
          <span className="text-2xl font-bold text-blue-600">85%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-3 mb-3">
          <div className="bg-blue-600 h-3 rounded-full" style={{ width: '85%' }}></div>
        </div>
        <p className="text-sm text-blue-700">
          Hồ sơ của bạn đã hoàn thiện 85%. Thêm chứng chỉ và dự án để đạt 100%.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Personal Info Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-6">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {profile.user_id?.avatar_url ? (
                      <img
                        src={profile.user_id.avatar_url.startsWith('http')
                          ? profile.user_id.avatar_url
                          : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${profile.user_id.avatar_url}`
                        }
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-gray-400">👤</span>
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleAvatarChange}
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {uploadingAvatar ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Thay đổi ảnh</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên</label>
                  <p className="text-gray-900">{profile.user_id?.full_name || 'Chưa cập nhật'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p className="text-gray-900">{profile.user_id?.email || 'Chưa cập nhật'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                  <p className="text-gray-900">{profile.user_id?.phone || 'Chưa cập nhật'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sinh</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ''}
                      onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giới tính</label>
                  {isEditing ? (
                    <select
                      value={profile.gender || ''}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {profile.gender === 'male' ? 'Nam' : profile.gender === 'female' ? 'Nữ' : profile.gender === 'other' ? 'Khác' : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                  {isEditing ? (
                    <textarea
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.address || 'Chưa cập nhật'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Thành phố</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.city || ''}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.city || 'Chưa cập nhật'}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Professional Info Tab */}
          {activeTab === 'professional' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái việc làm</label>
                  {isEditing ? (
                    <select
                      value={profile.job_status || 'seeking'}
                      onChange={(e) => setProfile({ ...profile, job_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="seeking">Đang tìm việc</option>
                      <option value="employed">Đang làm việc</option>
                      <option value="not_seeking">Không tìm việc</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">
                      {profile.job_status === 'seeking' ? 'Đang tìm việc' :
                        profile.job_status === 'employed' ? 'Đang làm việc' : 'Không tìm việc'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Năm kinh nghiệm</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={profile.experience_years || 0}
                      onChange={(e) => setProfile({ ...profile, experience_years: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{profile.experience_years || 0} năm</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mức lương tối thiểu</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={profile.salary_expectation?.min || ''}
                      onChange={(e) => setProfile({ ...profile, salary_expectation: { ...profile.salary_expectation, min: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.salary_expectation?.min ? `${profile.salary_expectation.min.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mức lương tối đa</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={profile.salary_expectation?.max || ''}
                      onChange={(e) => setProfile({ ...profile, salary_expectation: { ...profile.salary_expectation, max: parseInt(e.target.value) } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.salary_expectation?.max ? `${profile.salary_expectation.max.toLocaleString('vi-VN')} VNĐ` : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trình độ học vấn</label>
                  {isEditing ? (
                    <select
                      value={profile.education_level || ''}
                      onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Chọn trình độ</option>
                      <option value="high_school">Trung học</option>
                      <option value="associate">Cao đẳng</option>
                      <option value="bachelor">Đại học</option>
                      <option value="master">Thạc sĩ</option>
                      <option value="doctorate">Tiến sĩ</option>
                      <option value="other">Khác</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{profile.education_level || 'Chưa cập nhật'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={profile.linkedin_url || ''}
                      onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.linkedin_url ? (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {profile.linkedin_url}
                        </a>
                      ) : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={profile.github_url || ''}
                      onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                      placeholder="https://github.com/username"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.github_url ? (
                        <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {profile.github_url}
                        </a>
                      ) : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={profile.portfolio_url || ''}
                      onChange={(e) => setProfile({ ...profile, portfolio_url: e.target.value })}
                      placeholder="https://yourportfolio.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.portfolio_url ? (
                        <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {profile.portfolio_url}
                        </a>
                      ) : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CV File</label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={profile.cv_file_url || ''}
                      onChange={(e) => setProfile({ ...profile, cv_file_url: e.target.value })}
                      placeholder="https://example.com/cv.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {profile.cv_file_url ? (
                        <a href={profile.cv_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:underline">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Tải xuống CV
                        </a>
                      ) : 'Chưa cập nhật'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu</label>
                {isEditing ? (
                  <textarea
                    value={profile.bio || ''}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    placeholder="Giới thiệu bản thân, kinh nghiệm và mục tiêu nghề nghiệp..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{profile.bio || 'Chưa cập nhật'}</p>
                )}
              </div>
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {isEditing && (
                <button
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Thêm kỹ năng mới
                </button>
              )}

              {profile.skills_detailed && profile.skills_detailed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.skills_detailed.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{skill.skill_name}</span>
                          <span className="text-sm text-gray-500">{getSkillLevel(skill.skill_level)}</span>
                        </div>
                        {renderSkillBars(skill.skill_level)}
                        {skill.years_of_experience > 0 && (
                          <p className="text-xs text-gray-500 mt-1">{skill.years_of_experience} năm kinh nghiệm</p>
                        )}
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => handleDeleteSkill(index)}
                          className="ml-3 text-red-600 hover:text-red-700"
                          title="Xóa kỹ năng"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Chưa có kỹ năng nào được thêm</p>
                </div>
              )}
            </div>
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && (
            <div className="space-y-6">
              {isEditing && (
                <button
                  onClick={handleAddExperience}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Thêm kinh nghiệm mới
                </button>
              )}

              {profile.experience && profile.experience.length > 0 ? (
                profile.experience.map((exp, index) => (
                  <div key={exp._id || index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{exp.position}</h3>
                        <p className="text-blue-600 font-medium">{exp.company_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(exp.start_date).toLocaleDateString('vi-VN')} - {
                            exp.is_current || !exp.end_date ? 'Hiện tại' : new Date(exp.end_date).toLocaleDateString('vi-VN')
                          }
                        </p>
                      </div>
                      {isEditing && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditExperience(exp._id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteExperience(exp._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>

                    {exp.description && <p className="text-gray-700 mb-4">{exp.description}</p>}

                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exp.technologies.map((tech, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Chưa có kinh nghiệm làm việc nào</p>
                </div>
              )}
            </div>
          )}

          {/* Education Tab */}
          {activeTab === 'education' && (
            <div className="space-y-6">
              {isEditing && (
                <button
                  onClick={handleAddEducation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Thêm học vấn mới
                </button>
              )}

              {profile.education && profile.education.length > 0 ? (
                profile.education.map((edu, index) => (
                  <div key={edu._id || index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{edu.degree}</h3>
                        <p className="text-blue-600 font-medium">{edu.school_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(edu.start_date).toLocaleDateString('vi-VN')} - {
                            edu.is_current || !edu.end_date ? 'Hiện tại' : new Date(edu.end_date).toLocaleDateString('vi-VN')
                          }
                        </p>
                        {edu.major && (
                          <p className="text-sm text-gray-600">Chuyên ngành: {edu.major}</p>
                        )}
                        {edu.gpa && (
                          <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>
                        )}
                        {edu.description && (
                          <p className="text-gray-700 mt-2">{edu.description}</p>
                        )}
                      </div>
                      {isEditing && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleEditEducation(edu._id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteEducation(edu._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Chưa có học vấn nào</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Experience Modal */}
      {showExperienceModal && editingExperience && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingExperience._id ? 'Sửa kinh nghiệm' : 'Thêm kinh nghiệm mới'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vị trí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingExperience.position}
                    onChange={(e) => setEditingExperience({ ...editingExperience, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: Frontend Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Công ty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingExperience.company_name}
                    onChange={(e) => setEditingExperience({ ...editingExperience, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: ABC Technology"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingExperience.start_date ? new Date(editingExperience.start_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingExperience({ ...editingExperience, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={editingExperience.end_date ? new Date(editingExperience.end_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingExperience({ ...editingExperience, end_date: e.target.value })}
                      disabled={editingExperience.is_current}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingExperience.is_current}
                      onChange={(e) => setEditingExperience({ ...editingExperience, is_current: e.target.checked, end_date: e.target.checked ? null : editingExperience.end_date })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Đang làm việc tại đây</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả công việc</label>
                  <textarea
                    value={editingExperience.description}
                    onChange={(e) => setEditingExperience({ ...editingExperience, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mô tả công việc và trách nhiệm của bạn..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Công nghệ sử dụng (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={editingExperience.technologies?.join(', ') || ''}
                    onChange={(e) => setEditingExperience({ ...editingExperience, technologies: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: React, Node.js, MongoDB"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowExperienceModal(false);
                    setEditingExperience(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveExperience}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Education Modal */}
      {showEducationModal && editingEducation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingEducation._id ? 'Sửa học vấn' : 'Thêm học vấn mới'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên trường <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingEducation.school_name}
                    onChange={(e) => setEditingEducation({ ...editingEducation, school_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: Đại học Bách Khoa Hà Nội"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bằng cấp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingEducation.degree}
                    onChange={(e) => setEditingEducation({ ...editingEducation, degree: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: Cử nhân"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chuyên ngành <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingEducation.major}
                    onChange={(e) => setEditingEducation({ ...editingEducation, major: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: Công nghệ Thông tin"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingEducation.start_date ? new Date(editingEducation.start_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingEducation({ ...editingEducation, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ngày kết thúc
                    </label>
                    <input
                      type="date"
                      value={editingEducation.end_date ? new Date(editingEducation.end_date).toISOString().split('T')[0] : ''}
                      onChange={(e) => setEditingEducation({ ...editingEducation, end_date: e.target.value })}
                      disabled={editingEducation.is_current}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingEducation.is_current}
                      onChange={(e) => setEditingEducation({ ...editingEducation, is_current: e.target.checked, end_date: e.target.checked ? null : editingEducation.end_date })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Đang học</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    value={editingEducation.gpa || ''}
                    onChange={(e) => setEditingEducation({ ...editingEducation, gpa: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: 3.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
                  <textarea
                    value={editingEducation.description}
                    onChange={(e) => setEditingEducation({ ...editingEducation, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mô tả về quá trình học tập..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEducationModal(false);
                    setEditingEducation(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEducation}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skill Modal */}
      {showSkillModal && editingSkill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingSkill.index !== undefined ? 'Sửa kỹ năng' : 'Thêm kỹ năng mới'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên kỹ năng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingSkill.skill_name}
                    onChange={(e) => setEditingSkill({ ...editingSkill, skill_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: React, JavaScript, Python..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trình độ <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingSkill.skill_level}
                    onChange={(e) => setEditingSkill({ ...editingSkill, skill_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="beginner">Mới bắt đầu</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                    <option value="expert">Chuyên gia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Số năm kinh nghiệm
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={editingSkill.years_of_experience}
                    onChange={(e) => setEditingSkill({ ...editingSkill, years_of_experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: 2"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingSkill.is_primary}
                      onChange={(e) => setEditingSkill({ ...editingSkill, is_primary: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Kỹ năng chính</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowSkillModal(false);
                    setEditingSkill(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateProfile;
