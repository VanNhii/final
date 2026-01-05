import { useEffect, useState } from 'react';
import {
    FaBuilding,
    FaCamera,
    FaEdit,
    FaEnvelope,
    FaFacebook,
    FaGlobe,
    FaLinkedin,
    FaMapMarkerAlt,
    FaPhone,
    FaPlus,
    FaSave,
    FaTimes,
    FaTrash,
    FaTwitter,
    FaUser
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import recruiterService from '../../services/recruiterService';
import { formatDate } from '../../utils/formatters';

const RecruiterProfile = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Helper function to validate URLs
  const isValidUrl = (url) => {
    if (!url || url.trim() === '') return true; // Empty URLs are allowed
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // Helper function to validate email
  const isValidEmail = (email) => {
    if (!email || email.trim() === '') return true; // Empty emails are allowed
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
  };

  // Helper function to clean and validate profile data
  const validateAndCleanData = () => {
    const errors = [];

    // Validate required fields
    if (!companyInfo.company_name?.trim()) {
      errors.push('Tên công ty là bắt buộc');
    }

    // Validate email formats
    if (!isValidEmail(companyInfo.company_email)) {
      errors.push('Email công ty không hợp lệ');
    }
    if (!isValidEmail(personalInfo.contact_email)) {
      errors.push('Email liên hệ không hợp lệ');
    }

    // Validate URLs
    if (!isValidUrl(companyInfo.website)) {
      errors.push('Website không hợp lệ (phải bắt đầu bằng http:// hoặc https://)');
    }
    if (!isValidUrl(personalInfo.social_links?.linkedin)) {
      errors.push('LinkedIn URL không hợp lệ');
    }
    if (!isValidUrl(personalInfo.social_links?.facebook)) {
      errors.push('Facebook URL không hợp lệ');
    }
    if (!isValidUrl(personalInfo.social_links?.twitter)) {
      errors.push('Twitter URL không hợp lệ');
    }

    // Validate founded year
    if (companyInfo.founded_year && (companyInfo.founded_year < 1800 || companyInfo.founded_year > new Date().getFullYear())) {
      errors.push('Năm thành lập không hợp lệ');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Company Information State
  const [companyInfo, setCompanyInfo] = useState({
    company_name: '',
    company_description: '',
    industry: '',
    company_size: null, // Use null instead of empty string for enum fields
    website: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    founded_year: null, // Use null for number fields
    logo_url: '',
    cover_image_url: '',
    mission: '',
    vision: '',
    company_culture: '',
    benefits: [],
    company_locations: []
  });

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    contact_person_name: '',
    contact_email: '',
    contact_phone: '',
    position: '',
    department: '',
    bio: '',
    avatar_url: '',
    skills: [],
    languages: [],
    social_links: {
      linkedin: '',
      facebook: '',
      twitter: ''
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await recruiterService.getProfile();
      const profileData = response.data;
      
      setProfile(profileData);
      
      // Set company info
      setCompanyInfo({
        company_name: profileData.company_name || '',
        company_description: profileData.company_description || '',
        industry: profileData.industry || '',
        company_size: profileData.company_size || null,
        website: profileData.website || '',
        company_email: profileData.company_email || '',
        company_phone: profileData.company_phone || '',
        company_address: profileData.company_address || '',
        founded_year: profileData.founded_year || null,
        logo_url: profileData.logo_url || '',
        cover_image_url: profileData.cover_image_url || '',
        mission: profileData.mission || '',
        vision: profileData.vision || '',
        company_culture: profileData.company_culture || '',
        benefits: profileData.benefits || [],
        company_locations: profileData.company_locations || []
      });

      // Set personal info
      setPersonalInfo({
        contact_person_name: profileData.contact_person_name || '',
        contact_email: profileData.contact_email || '',
        contact_phone: profileData.contact_phone || '',
        position: profileData.position || '',
        department: profileData.department || '',
        bio: profileData.bio || '',
        avatar_url: profileData.avatar_url || '',
        skills: profileData.skills || [],
        languages: profileData.languages || [],
        social_links: {
          linkedin: profileData.social_links?.linkedin || '',
          facebook: profileData.social_links?.facebook || '',
          twitter: profileData.social_links?.twitter || ''
        }
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Không thể tải thông tin hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      
      // Validate data before sending
      const validation = validateAndCleanData();
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      // Validate and clean data before sending
      const cleanedProfileData = {
        ...companyInfo,
        ...personalInfo,
        // Handle enum fields - convert empty strings to null
        company_size: companyInfo.company_size || null,
        // Convert empty strings to null for optional fields that might have validation
        founded_year: companyInfo.founded_year || null,
        website: companyInfo.website?.trim() || null,
        company_email: companyInfo.company_email?.trim() || null,
        company_phone: companyInfo.company_phone?.trim() || null,
        company_address: companyInfo.company_address?.trim() || null,
        contact_email: personalInfo.contact_email?.trim() || null,
        contact_phone: personalInfo.contact_phone?.trim() || null,
        // Ensure arrays are properly formatted
        benefits: Array.isArray(companyInfo.benefits) ? companyInfo.benefits.filter(b => b?.trim()) : [],
        skills: Array.isArray(personalInfo.skills) ? personalInfo.skills.filter(s => s?.trim()) : [],
        languages: Array.isArray(personalInfo.languages) ? personalInfo.languages.filter(l => l?.trim()) : [],
        // Ensure social_links object exists with proper URL validation
        social_links: {
          linkedin: personalInfo.social_links?.linkedin?.trim() || null,
          facebook: personalInfo.social_links?.facebook?.trim() || null,
          twitter: personalInfo.social_links?.twitter?.trim() || null
        }
      };

      // Remove any undefined or empty string values, but keep null values
      Object.keys(cleanedProfileData).forEach(key => {
        if (cleanedProfileData[key] === '' || cleanedProfileData[key] === undefined) {
          cleanedProfileData[key] = null;
        }
      });
      
      console.log('Sending profile data:', cleanedProfileData); // Debug log
      
      await recruiterService.updateProfile(cleanedProfileData);
      toast.success('Cập nhật hồ sơ thành công!');
      setEditMode(false);
      await loadProfile(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving profile:', error);
      // Better error handling
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Có lỗi xảy ra khi cập nhật hồ sơ');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCompanyUpdate = (field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePersonalUpdate = (field, value) => {
    setPersonalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkUpdate = (platform, value) => {
    setPersonalInfo(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }));
  };

  const addBenefit = () => {
    setCompanyInfo(prev => ({
      ...prev,
      benefits: [...prev.benefits, '']
    }));
  };

  const updateBenefit = (index, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => i === index ? value : benefit)
    }));
  };

  const removeBenefit = (index) => {
    setCompanyInfo(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const addLocation = () => {
    setCompanyInfo(prev => ({
      ...prev,
      company_locations: [...prev.company_locations, { city: '', address: '', is_headquarters: false }]
    }));
  };

  const updateLocation = (index, field, value) => {
    setCompanyInfo(prev => ({
      ...prev,
      company_locations: prev.company_locations.map((location, i) => 
        i === index ? { ...location, [field]: value } : location
      )
    }));
  };

  const removeLocation = (index) => {
    setCompanyInfo(prev => ({
      ...prev,
      company_locations: prev.company_locations.filter((_, i) => i !== index)
    }));
  };

  const setHeadquarters = (index) => {
    setCompanyInfo(prev => ({
      ...prev,
      company_locations: prev.company_locations.map((location, i) => ({
        ...location,
        is_headquarters: i === index
      }))
    }));
  };

  const addSkill = () => {
    setPersonalInfo(prev => ({
      ...prev,
      skills: [...prev.skills, '']
    }));
  };

  const updateSkill = (index, value) => {
    setPersonalInfo(prev => ({
      ...prev,
      skills: prev.skills.map((skill, i) => i === index ? value : skill)
    }));
  };

  const removeSkill = (index) => {
    setPersonalInfo(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
  };

  const addLanguage = () => {
    setPersonalInfo(prev => ({
      ...prev,
      languages: [...prev.languages, '']
    }));
  };

  const updateLanguage = (index, value) => {
    setPersonalInfo(prev => ({
      ...prev,
      languages: prev.languages.map((language, i) => i === index ? value : language)
    }));
  };

  const removeLanguage = (index) => {
    setPersonalInfo(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'company', label: 'Thông tin công ty', icon: FaBuilding },
    { id: 'locations', label: 'Chi nhánh', icon: FaMapMarkerAlt },
    { id: 'personal', label: 'Thông tin cá nhân', icon: FaUser }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-r from-green-500 to-blue-600 relative">
            {companyInfo.cover_image_url && (
              <img 
                src={companyInfo.cover_image_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            )}
            {editMode && (
              <button className="absolute top-4 right-4 bg-white bg-opacity-80 rounded-full p-2 hover:bg-opacity-100 transition-all">
                <FaCamera className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Profile Header */}
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="relative -mt-16">
                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
                  {companyInfo.logo_url ? (
                    <img 
                      src={companyInfo.logo_url} 
                      alt="Logo" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                      <FaBuilding className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  {editMode && (
                    <button className="absolute bottom-0 right-0 bg-green-600 rounded-full p-1.5 text-white hover:bg-green-700 transition-colors">
                      <FaCamera className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {companyInfo.company_name || 'Chưa cập nhật tên công ty'}
                </h1>
                <p className="text-gray-600">{companyInfo.industry || 'Chưa cập nhật ngành nghề'}</p>
                <p className="text-sm text-gray-500">
                  Tham gia từ {formatDate(profile?.created_at)}
                </p>
              </div>
              
              <div className="flex space-x-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <FaEdit className="w-4 h-4" />
                    <span>Chỉnh sửa</span>
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <FaSave className="w-4 h-4" />
                      <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                      <span>Hủy</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'company' && (
              <CompanyInfoTab 
                companyInfo={companyInfo}
                editMode={editMode}
                onUpdate={handleCompanyUpdate}
                onAddBenefit={addBenefit}
                onUpdateBenefit={updateBenefit}
                onRemoveBenefit={removeBenefit}
              />
            )}
            
            {activeTab === 'locations' && (
              <LocationsTab
                locations={companyInfo.company_locations}
                editMode={editMode}
                onAddLocation={addLocation}
                onUpdateLocation={updateLocation}
                onRemoveLocation={removeLocation}
                onSetHeadquarters={setHeadquarters}
              />
            )}
            
            {activeTab === 'personal' && (
              <PersonalInfoTab 
                personalInfo={personalInfo}
                editMode={editMode}
                onUpdate={handlePersonalUpdate}
                onSocialLinkUpdate={handleSocialLinkUpdate}
                onAddSkill={addSkill}
                onUpdateSkill={updateSkill}
                onRemoveSkill={removeSkill}
                onAddLanguage={addLanguage}
                onUpdateLanguage={updateLanguage}
                onRemoveLanguage={removeLanguage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Company Information Tab Component
const CompanyInfoTab = ({ 
  companyInfo, 
  editMode, 
  onUpdate, 
  onAddBenefit, 
  onUpdateBenefit, 
  onRemoveBenefit 
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tên công ty *</label>
        {editMode ? (
          <input
            type="text"
            value={companyInfo.company_name}
            onChange={(e) => onUpdate('company_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Nhập tên công ty"
          />
        ) : (
          <p className="text-gray-900">{companyInfo.company_name || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ngành nghề</label>
        {editMode ? (
          <input
            type="text"
            value={companyInfo.industry}
            onChange={(e) => onUpdate('industry', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Ví dụ: Công nghệ thông tin"
          />
        ) : (
          <p className="text-gray-900">{companyInfo.industry || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quy mô công ty</label>
        {editMode ? (
          <select
            value={companyInfo.company_size || ''}
            onChange={(e) => onUpdate('company_size', e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Chọn quy mô</option>
            <option value="1-10">1-10 nhân viên</option>
            <option value="11-50">11-50 nhân viên</option>
            <option value="51-100">51-100 nhân viên</option>
            <option value="100-500">100-500 nhân viên</option>
            <option value="500+">500+ nhân viên</option>
          </select>
        ) : (
          <p className="text-gray-900">{companyInfo.company_size || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Năm thành lập</label>
        {editMode ? (
          <input
            type="number"
            value={companyInfo.founded_year || ''}
            onChange={(e) => onUpdate('founded_year', e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="2020"
            min="1800"
            max={new Date().getFullYear()}
          />
        ) : (
          <p className="text-gray-900">{companyInfo.founded_year || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
        {editMode ? (
          <input
            type="url"
            value={companyInfo.website}
            onChange={(e) => onUpdate('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="https://example.com"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaGlobe className="w-4 h-4 text-gray-400" />
            {companyInfo.website ? (
              <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {companyInfo.website}
              </a>
            ) : (
              <span className="text-gray-900">Chưa cập nhật</span>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email công ty</label>
        {editMode ? (
          <input
            type="email"
            value={companyInfo.company_email}
            onChange={(e) => onUpdate('company_email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="info@company.com"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaEnvelope className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{companyInfo.company_email || 'Chưa cập nhật'}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại công ty</label>
        {editMode ? (
          <input
            type="tel"
            value={companyInfo.company_phone}
            onChange={(e) => onUpdate('company_phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="0123456789"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaPhone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{companyInfo.company_phone || 'Chưa cập nhật'}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
        {editMode ? (
          <input
            type="text"
            value={companyInfo.company_address}
            onChange={(e) => onUpdate('company_address', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaMapMarkerAlt className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{companyInfo.company_address || 'Chưa cập nhật'}</span>
          </div>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả công ty</label>
      {editMode ? (
        <textarea
          rows={4}
          value={companyInfo.company_description}
          onChange={(e) => onUpdate('company_description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          placeholder="Mô tả về công ty của bạn..."
        />
      ) : (
        <p className="text-gray-900 whitespace-pre-wrap">{companyInfo.company_description || 'Chưa cập nhật'}</p>
      )}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sứ mệnh</label>
        {editMode ? (
          <textarea
            rows={3}
            value={companyInfo.mission}
            onChange={(e) => onUpdate('mission', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Sứ mệnh của công ty..."
          />
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{companyInfo.mission || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tầm nhìn</label>
        {editMode ? (
          <textarea
            rows={3}
            value={companyInfo.vision}
            onChange={(e) => onUpdate('vision', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Tầm nhìn của công ty..."
          />
        ) : (
          <p className="text-gray-900 whitespace-pre-wrap">{companyInfo.vision || 'Chưa cập nhật'}</p>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Văn hóa công ty</label>
      {editMode ? (
        <textarea
          rows={3}
          value={companyInfo.company_culture}
          onChange={(e) => onUpdate('company_culture', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          placeholder="Mô tả về văn hóa công ty..."
        />
      ) : (
        <p className="text-gray-900 whitespace-pre-wrap">{companyInfo.company_culture || 'Chưa cập nhật'}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Phúc lợi</label>
      {editMode ? (
        <div className="space-y-2">
          {companyInfo.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={benefit}
                onChange={(e) => onUpdateBenefit(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập phúc lợi..."
              />
              <button
                onClick={() => onRemoveBenefit(index)}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={onAddBenefit}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <FaPlus className="w-4 h-4" />
            <span>Thêm phúc lợi</span>
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {companyInfo.benefits.length > 0 ? (
            companyInfo.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-900">{benefit}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-900">Chưa cập nhật</p>
          )}
        </div>
      )}
    </div>
  </div>
);

// Locations Tab Component
const LocationsTab = ({ 
  locations, 
  editMode, 
  onAddLocation, 
  onUpdateLocation, 
  onRemoveLocation,
  onSetHeadquarters
}) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Các chi nhánh / Văn phòng</h3>
      {editMode && (
        <button
          onClick={onAddLocation}
          className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <FaPlus className="w-4 h-4" />
          <span>Thêm chi nhánh</span>
        </button>
      )}
    </div>

    {locations.length === 0 ? (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <FaMapMarkerAlt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Chưa có chi nhánh nào</p>
        {editMode && (
          <button
            onClick={onAddLocation}
            className="mt-4 text-green-600 hover:text-green-800 font-medium"
          >
            Thêm chi nhánh đầu tiên
          </button>
        )}
      </div>
    ) : (
      <div className="space-y-4">
        {locations.map((location, index) => (
          <div
            key={index}
            className={`bg-white border-2 rounded-lg p-4 ${
              location.is_headquarters ? 'border-green-500 bg-green-50' : 'border-gray-200'
            }`}
          >
            {location.is_headquarters && (
              <div className="flex items-center space-x-2 mb-3">
                <span className="bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">
                  TRỤ SỞ CHÍNH
                </span>
              </div>
            )}

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Thành phố</label>
                  <input
                    type="text"
                    value={location.city || ''}
                    onChange={(e) => onUpdateLocation(index, 'city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    placeholder="VD: Hồ Chí Minh, Hà Nội..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ chi tiết</label>
                  <input
                    type="text"
                    value={location.address || ''}
                    onChange={(e) => onUpdateLocation(index, 'address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    placeholder="Số nhà, đường, quận..."
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-4">
                    {!location.is_headquarters && (
                      <button
                        onClick={() => onSetHeadquarters(index)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        Đặt làm trụ sở chính
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveLocation(index)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-800"
                  >
                    <FaTrash className="w-4 h-4" />
                    <span className="text-sm">Xóa</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <FaMapMarkerAlt className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{location.city || 'Chưa có thành phố'}</p>
                    <p className="text-gray-600 text-sm">{location.address || 'Chưa có địa chỉ'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// Personal Information Tab Component  
const PersonalInfoTab = ({ 
  personalInfo, 
  editMode, 
  onUpdate, 
  onSocialLinkUpdate,
  onAddSkill,
  onUpdateSkill,
  onRemoveSkill,
  onAddLanguage,
  onUpdateLanguage,
  onRemoveLanguage
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tên người liên hệ</label>
        {editMode ? (
          <input
            type="text"
            value={personalInfo.contact_person_name}
            onChange={(e) => onUpdate('contact_person_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Nhập tên người liên hệ"
          />
        ) : (
          <p className="text-gray-900">{personalInfo.contact_person_name || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email liên hệ</label>
        {editMode ? (
          <input
            type="email"
            value={personalInfo.contact_email}
            onChange={(e) => onUpdate('contact_email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="contact@company.com"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaEnvelope className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{personalInfo.contact_email || 'Chưa cập nhật'}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
        {editMode ? (
          <input
            type="tel"
            value={personalInfo.contact_phone}
            onChange={(e) => onUpdate('contact_phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="0123456789"
          />
        ) : (
          <div className="flex items-center space-x-2">
            <FaPhone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{personalInfo.contact_phone || 'Chưa cập nhật'}</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Chức vụ</label>
        {editMode ? (
          <input
            type="text"
            value={personalInfo.position}
            onChange={(e) => onUpdate('position', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Ví dụ: HR Manager, Tuyển dụng viên"
          />
        ) : (
          <p className="text-gray-900">{personalInfo.position || 'Chưa cập nhật'}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phòng ban</label>
        {editMode ? (
          <input
            type="text"
            value={personalInfo.department}
            onChange={(e) => onUpdate('department', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
            placeholder="Ví dụ: Phòng Nhân sự, Phòng Tuyển dụng"
          />
        ) : (
          <p className="text-gray-900">{personalInfo.department || 'Chưa cập nhật'}</p>
        )}
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Giới thiệu bản thân</label>
      {editMode ? (
        <textarea
          rows={4}
          value={personalInfo.bio}
          onChange={(e) => onUpdate('bio', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          placeholder="Giới thiệu về bản thân và kinh nghiệm..."
        />
      ) : (
        <p className="text-gray-900 whitespace-pre-wrap">{personalInfo.bio || 'Chưa cập nhật'}</p>
      )}
    </div>

    {/* Skills */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Kỹ năng</label>
      {editMode ? (
        <div className="space-y-2">
          {personalInfo.skills.map((skill, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={skill}
                onChange={(e) => onUpdateSkill(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập kỹ năng..."
              />
              <button
                onClick={() => onRemoveSkill(index)}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={onAddSkill}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <FaPlus className="w-4 h-4" />
            <span>Thêm kỹ năng</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {personalInfo.skills.length > 0 ? (
            personalInfo.skills.map((skill, index) => (
              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                {skill}
              </span>
            ))
          ) : (
            <p className="text-gray-900">Chưa cập nhật</p>
          )}
        </div>
      )}
    </div>

    {/* Languages */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
      {editMode ? (
        <div className="space-y-2">
          {personalInfo.languages.map((language, index) => (
            <div key={index} className="flex items-center space-x-2">
              <input
                type="text"
                value={language}
                onChange={(e) => onUpdateLanguage(index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                placeholder="Nhập ngôn ngữ..."
              />
              <button
                onClick={() => onRemoveLanguage(index)}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <FaTrash className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={onAddLanguage}
            className="flex items-center space-x-2 text-green-600 hover:text-green-800"
          >
            <FaPlus className="w-4 h-4" />
            <span>Thêm ngôn ngữ</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {personalInfo.languages.length > 0 ? (
            personalInfo.languages.map((language, index) => (
              <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                {language}
              </span>
            ))
          ) : (
            <p className="text-gray-900">Chưa cập nhật</p>
          )}
        </div>
      )}
    </div>

    {/* Social Links */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Liên kết mạng xã hội</label>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <FaLinkedin className="w-5 h-5 text-blue-600" />
          <label className="text-sm font-medium text-gray-700 w-20">LinkedIn:</label>
          {editMode ? (
            <input
              type="url"
              value={personalInfo.social_links.linkedin}
              onChange={(e) => onSocialLinkUpdate('linkedin', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder="https://linkedin.com/in/username"
            />
          ) : (
            <span className="text-gray-900">
              {personalInfo.social_links.linkedin ? (
                <a href={personalInfo.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {personalInfo.social_links.linkedin}
                </a>
              ) : (
                'Chưa cập nhật'
              )}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <FaFacebook className="w-5 h-5 text-blue-800" />
          <label className="text-sm font-medium text-gray-700 w-20">Facebook:</label>
          {editMode ? (
            <input
              type="url"
              value={personalInfo.social_links.facebook}
              onChange={(e) => onSocialLinkUpdate('facebook', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder="https://facebook.com/username"
            />
          ) : (
            <span className="text-gray-900">
              {personalInfo.social_links.facebook ? (
                <a href={personalInfo.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {personalInfo.social_links.facebook}
                </a>
              ) : (
                'Chưa cập nhật'
              )}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <FaTwitter className="w-5 h-5 text-blue-400" />
          <label className="text-sm font-medium text-gray-700 w-20">Twitter:</label>
          {editMode ? (
            <input
              type="url"
              value={personalInfo.social_links.twitter}
              onChange={(e) => onSocialLinkUpdate('twitter', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
              placeholder="https://twitter.com/username"
            />
          ) : (
            <span className="text-gray-900">
              {personalInfo.social_links.twitter ? (
                <a href={personalInfo.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {personalInfo.social_links.twitter}
                </a>
              ) : (
                'Chưa cập nhật'
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default RecruiterProfile;