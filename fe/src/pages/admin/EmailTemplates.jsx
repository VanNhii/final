import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";

const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedType, setSelectedType] = useState("all");
  const [actionLoading, setActionLoading] = useState({
    submit: false,
    bulkEmail: false,
    delete: {},
    status: {},
  });
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    subject: "",
    content: "",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await adminService.getEmailTemplates();

      console.log("Email Templates API Response:", response.data); // Debug log

      if (response.data) {
        const templatesData = response.data || [];
        console.log("Email Templates Data:", templatesData); // Debug log

        // Parse dữ liệu với cấu trúc chính xác từ backend
        const sanitizedTemplates = templatesData.map((template) => ({
          ...template,
          _id: template._id,
          template_name: template.template_name,
          template_type: template.template_type,
          subject: template.subject || "",
          content: template.content || "",
          is_active: template.is_active,
          created_by: template.created_by,
          last_modified_by: template.last_modified_by,
          created_at: template.created_at,
          updated_at: template.updated_at,
        }));

        setTemplates(sanitizedTemplates);
      } else {
        throw new Error("Failed to fetch email templates");
      }
    } catch (error) {
      console.error("Error fetching email templates:", error);
      toast.error("Không thể tải danh sách template email");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    const previewContent = `
      <h3>Preview</h3>
      <p><strong>Subject:</strong> ${formData.subject}</p>
      <p><strong>Content:</strong></p>
      <div>${formData.content.replace(/\n/g, "<br>")}</div>
    `;
    const previewWindow = window.open("", "Preview", "width=600,height=400");
    previewWindow.document.write(previewContent);
    previewWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allowedPlaceholders = [
      "name",
      "jobTitle",
      "companyName",
      "candidateName",
      "recruiterName",
      "planName",
      "amount",
    ];
    const placeholderRegex = /{{([^{}]+)}}/g;
    const subjectPlaceholders = (
      formData.subject.match(placeholderRegex) || []
    ).map((p) => p.replace(/[{}]/g, ""));
    const contentPlaceholders = (
      formData.content.match(placeholderRegex) || []
    ).map((p) => p.replace(/[{}]/g, ""));
    const invalidSubjectPlaceholders = subjectPlaceholders.filter(
      (p) => !allowedPlaceholders.includes(p)
    );
    const invalidContentPlaceholders = contentPlaceholders.filter(
      (p) => !allowedPlaceholders.includes(p)
    );

    try {
      setActionLoading((prev) => ({ ...prev, submit: true }));

      const templateData = {
        template_name: formData.name,
        template_type: formData.type,
        subject: formData.subject,
        content: formData.content,
        is_active: true,
      };

      console.log("Submitting templateData:", templateData);

      let response;
      if (editingTemplate) {
        response = await adminService.updateEmailTemplate(
          editingTemplate._id,
          templateData
        );
      } else {
        response = await adminService.createEmailTemplate(templateData);
      }

      if (response.data?.success) {
        toast.success(
          editingTemplate
            ? "Cập nhật template thành công"
            : "Tạo template thành công"
        );
        setIsModalOpen(false);
        setEditingTemplate(null);
        setFormData({ name: "", type: "", subject: "", content: "" });
        fetchTemplates();
      } else {
        throw new Error("Failed to save email template");
      }
    } catch (error) {
      console.error("Error saving email template:", error);
      toast.error("Không thể lưu template email");
    } finally {
      setActionLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const templateTypes = {
    welcome: "Chào mừng",
    email_verification: "Xác thực email",
    password_reset: "Đặt lại mật khẩu",
    interview_invitation: "Mời phỏng vấn",
    application_status: "Trạng thái ứng tuyển",
    job_recommendation: "Gợi ý việc làm",
    newsletter: "Bản tin",
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.template_name || "",
      type: template.template_type || "",
      subject: template.subject || "",
      content: template.content || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (templateId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa template này?")) {
      try {
        setActionLoading((prev) => ({
          ...prev,
          delete: { ...prev.delete, [templateId]: true },
        }));

        const response = await adminService.deleteEmailTemplate(templateId);

        if (response.data?.success) {
          toast.success("Xóa template thành công");
          fetchTemplates();
        } else {
          throw new Error("Failed to delete email template");
        }
      } catch (error) {
        console.error("Error deleting email template:", error);
        toast.error("Không thể xóa template");
      } finally {
        setActionLoading((prev) => ({
          ...prev,
          delete: { ...prev.delete, [templateId]: false },
        }));
      }
    }
  };

  const toggleStatus = async (templateId) => {
    try {
      setActionLoading((prev) => ({
        ...prev,
        status: { ...prev.status, [templateId]: true },
      }));

      const template = templates.find((t) => getTemplateId(t) === templateId);
      const currentStatus = getTemplateStatus(template);

      const response = await adminService.updateEmailTemplate(templateId, {
        is_active: !currentStatus,
      });

      if (response.data?.success) {
        toast.success("Cập nhật trạng thái thành công");
        fetchTemplates();
      } else {
        throw new Error("Failed to toggle template status");
      }
    } catch (error) {
      console.error("Error toggling template status:", error);
      toast.error("Không thể cập nhật trạng thái");
    } finally {
      setActionLoading((prev) => ({
        ...prev,
        status: { ...prev.status, [templateId]: false },
      }));
    }
  };

  const handleSendBulkEmail = async () => {
    try {
      setActionLoading((prev) => ({ ...prev, bulkEmail: true }));

      const response = await adminService.sendBulkEmails({
        // Add bulk email data here
      });

      if (response.data?.success) {
        toast.success("Gửi email hàng loạt thành công");
      } else {
        throw new Error("Failed to send bulk emails");
      }
    } catch (error) {
      console.error("Error sending bulk emails:", error);
      toast.error("Không thể gửi email hàng loạt");
    } finally {
      setActionLoading((prev) => ({ ...prev, bulkEmail: false }));
    }
  };

  const getTemplateId = (template) => template._id;
  const getTemplateName = (template) => template.template_name;
  const getTemplateType = (template) => template.template_type;
  const getTemplateStatus = (template) => template.is_active;
  const getLastUsed = (template) => template.last_used;
  const getTemplateSubject = (template) => template.subject || "";
  const getTemplateUpdatedAt = (template) => {
    const date = template.updated_at;
    return date ? new Date(date).toLocaleDateString("vi-VN") : "Chưa rõ";
  };

  const filteredTemplates =
    selectedType === "all"
      ? templates
      : templates.filter(
        (template) => getTemplateType(template) === selectedType
      );

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Quản lý Template Email
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={handleSendBulkEmail}
            disabled={actionLoading.bulkEmail}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading.bulkEmail ? "Đang gửi..." : "Gửi email hàng loạt"}
          </button>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setFormData({ name: "", type: "", subject: "", content: "" });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Tạo template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tổng template</p>
              <p className="text-2xl font-semibold text-gray-900">
                {templates.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Đang hoạt động
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {templates.filter((t) => getTemplateStatus(t)).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0v16a1 1 0 001 1h8a1 1 0 001-1V4M7 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Loại template</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(templates.map((t) => getTemplateType(t))).size}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Gần đây</p>
              <p className="text-2xl font-semibold text-gray-900">
                {
                  templates.filter((t) => {
                    const lastUsed = getLastUsed(t);
                    return (
                      lastUsed && new Date(lastUsed) > new Date("2024-01-15")
                    );
                  }).length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Danh sách Template
            </h3>
            <div className="flex space-x-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tất cả loại</option>
                {Object.entries(templateTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lần cuối sử dụng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Đang tải template...</p>
                  </td>
                </tr>
              ) : filteredTemplates.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    Không có template nào
                  </td>
                </tr>
              ) : (
                filteredTemplates.map((template) => (
                  <tr key={getTemplateId(template)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {getTemplateName(template)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {getTemplateSubject(template)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {templateTypes[getTemplateType(template)] ||
                          getTemplateType(template)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getTemplateUpdatedAt(template)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(getTemplateId(template))}
                        disabled={actionLoading.status[getTemplateId(template)]}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTemplateStatus(template)
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          } hover:opacity-80 disabled:opacity-50`}
                      >
                        {actionLoading.status[getTemplateId(template)]
                          ? "Đang cập nhật..."
                          : getTemplateStatus(template)
                            ? "Hoạt động"
                            : "Tạm dừng"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        {/* Sửa */}
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Sửa template"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Xem trước */}
                        <button
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Xem trước"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {/* Tạm dừng/Kích hoạt */}
                        <button
                          onClick={() => toggleStatus(getTemplateId(template))}
                          disabled={actionLoading.status[getTemplateId(template)]}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${getTemplateStatus(template)
                              ? 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                          title={getTemplateStatus(template) ? 'Tạm dừng' : 'Kích hoạt'}
                        >
                          {actionLoading.status[getTemplateId(template)] ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : getTemplateStatus(template) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                        {/* Xóa */}
                        <button
                          onClick={() => handleDelete(getTemplateId(template))}
                          disabled={actionLoading.delete[getTemplateId(template)]}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Xóa template"
                        >
                          {actionLoading.delete[getTemplateId(template)] ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[800px] shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTemplate ? "Sửa template" : "Tạo template mới"}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên template
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại template
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Chọn loại template</option>
                      {Object.entries(templateTypes).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề email
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sử dụng {{variable}} cho biến động"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung email
                  </label>
                  <textarea
                    rows="8"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sử dụng {{variable}} cho biến động. Ví dụ: {{name}}, {{jobTitle}}, {{companyName}}"
                    required
                  />
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Biến có sẵn:</strong>{" "}
                    {
                      "{{name}}, {{email}}, {{jobTitle}}, {{companyName}}, {{candidateName}}, {{recruiterName}}, {{verificationLink}}, {{resetLink}}, {{interviewDate}}, {{interviewTime}}, {{applicationStatus}}"
                    }
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
                  >
                    Xem trước
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading.submit}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading.submit
                      ? editingTemplate
                        ? "Đang cập nhật..."
                        : "Đang tạo..."
                      : editingTemplate
                        ? "Cập nhật"
                        : "Tạo template"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplates;
