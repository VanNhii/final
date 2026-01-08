const Notification = require('../models/Notification');

/**
 * Create notification for interview confirmation or rejection (for recruiter)
 */
exports.createInterviewNotification = async ({
    recruiterId,
    candidateName,
    jobTitle,
    interviewDate,
    interviewTime,
    type, // 'confirmed' or 'rejected'
    interviewId,
    candidateMessage
}) => {
    try {
        const titles = {
            confirmed: 'Ứng viên đã xác nhận phỏng vấn',
            rejected: 'Ứng viên đã từ chối phỏng vấn'
        };

        const baseMessage = `${candidateName} đã ${type === 'confirmed' ? 'xác nhận' : 'từ chối'} lịch phỏng vấn cho vị trí ${jobTitle} vào ${interviewDate} lúc ${interviewTime}`;

        const fullMessage = candidateMessage
            ? `${baseMessage}\n\nTin nhắn từ ứng viên: "${candidateMessage}"`
            : baseMessage;

        const notification = await Notification.create({
            user_id: recruiterId,
            title: titles[type],
            message: fullMessage,
            notification_type: 'interview_reminder',
            related_entity_type: 'Interview',
            related_entity_id: interviewId,
            priority: 'high',
            status: 'sent'
        });

        console.log(`✅ Notification created for recruiter ${recruiterId}: ${titles[type]}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating interview notification:', error);
        throw error;
    }
};

/**
 * Create notification for candidate when interview is scheduled
 */
exports.notifyCandidateInterviewScheduled = async ({
    candidateUserId,
    jobTitle,
    companyName,
    interviewDate,
    interviewTime,
    interviewType,
    interviewId
}) => {
    try {
        const notification = await Notification.create({
            user_id: candidateUserId,
            title: 'Bạn có lịch phỏng vấn mới!',
            message: `Bạn đã được mời phỏng vấn cho vị trí ${jobTitle} tại ${companyName}.\n\n📅 Ngày: ${interviewDate}\n⏰ Giờ: ${interviewTime}\n📍 Hình thức: ${interviewType || 'Trực tiếp'}`,
            notification_type: 'interview_reminder',
            related_entity_type: 'Interview',
            related_entity_id: interviewId,
            priority: 'high',
            status: 'sent'
        });

        console.log(`✅ Interview scheduled notification sent to candidate ${candidateUserId}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating interview scheduled notification:', error);
        throw error;
    }
};

/**
 * Create notification for candidate when application status changes
 */
exports.notifyCandidateStatusChange = async ({
    candidateUserId,
    jobTitle,
    companyName,
    oldStatus,
    newStatus,
    applicationId,
    rejectionReason
}) => {
    try {
        const statusMessages = {
            reviewing: `Đơn ứng tuyển cho vị trí ${jobTitle} tại ${companyName} đang được xem xét.`,
            shortlisted: `Chúc mừng! Bạn đã lọt vào danh sách ứng viên tiềm năng cho vị trí ${jobTitle} tại ${companyName}.`,
            interviewed: `Cảm ơn bạn đã tham gia phỏng vấn cho vị trí ${jobTitle} tại ${companyName}. Chúng tôi sẽ liên hệ sớm!`,
            offered: `🎉 Chúc mừng! Bạn đã được tuyển dụng cho vị trí ${jobTitle} tại ${companyName}!`,
            rejected: `Cảm ơn bạn đã quan tâm đến vị trí ${jobTitle} tại ${companyName}. Rất tiếc, chúng tôi đã chọn ứng viên phù hợp hơn.${rejectionReason ? `\n\nLý do: ${rejectionReason}` : ''}`,
            withdrawn: `Đơn ứng tuyển cho vị trí ${jobTitle} đã được rút.`
        };

        const statusTitles = {
            reviewing: 'Đơn ứng tuyển đang được xem xét',
            shortlisted: 'Bạn đã được chọn vào vòng tiếp theo!',
            interviewed: 'Cảm ơn bạn đã phỏng vấn',
            offered: '🎉 Chúc mừng bạn đã được tuyển dụng!',
            rejected: 'Thông báo về đơn ứng tuyển',
            withdrawn: 'Đơn ứng tuyển đã rút'
        };

        const priorities = {
            offered: 'high',
            rejected: 'medium',
            shortlisted: 'high',
            reviewing: 'normal',
            interviewed: 'normal',
            withdrawn: 'low'
        };

        const notification = await Notification.create({
            user_id: candidateUserId,
            title: statusTitles[newStatus] || 'Cập nhật đơn ứng tuyển',
            message: statusMessages[newStatus] || `Trạng thái đơn ứng tuyển của bạn đã thay đổi thành: ${newStatus}`,
            notification_type: 'application_update',
            related_entity_type: 'Application',
            related_entity_id: applicationId,
            priority: priorities[newStatus] || 'normal',
            status: 'sent'
        });

        console.log(`✅ Status change notification sent to candidate ${candidateUserId}: ${oldStatus} -> ${newStatus}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating status change notification:', error);
        throw error;
    }
};

/**
 * Create notification for candidate when interview is cancelled
 */
exports.notifyCandidateInterviewCancelled = async ({
    candidateUserId,
    jobTitle,
    companyName,
    interviewDate,
    interviewId,
    cancelReason
}) => {
    try {
        const notification = await Notification.create({
            user_id: candidateUserId,
            title: 'Lịch phỏng vấn đã bị hủy',
            message: `Lịch phỏng vấn cho vị trí ${jobTitle} tại ${companyName} vào ngày ${interviewDate} đã bị hủy.${cancelReason ? `\n\nLý do: ${cancelReason}` : ''}`,
            notification_type: 'interview_reminder',
            related_entity_type: 'Interview',
            related_entity_id: interviewId,
            priority: 'high',
            status: 'sent'
        });

        console.log(`✅ Interview cancelled notification sent to candidate ${candidateUserId}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating interview cancelled notification:', error);
        throw error;
    }
};

/**
 * Create notification for candidate when interview is completed
 */
exports.notifyCandidateInterviewCompleted = async ({
    candidateUserId,
    jobTitle,
    companyName,
    interviewId
}) => {
    try {
        const notification = await Notification.create({
            user_id: candidateUserId,
            title: 'Phỏng vấn đã hoàn thành',
            message: `Cảm ơn bạn đã tham gia phỏng vấn cho vị trí ${jobTitle} tại ${companyName}. Chúng tôi sẽ thông báo kết quả sớm nhất!`,
            notification_type: 'interview_reminder',
            related_entity_type: 'Interview',
            related_entity_id: interviewId,
            priority: 'normal',
            status: 'sent'
        });

        console.log(`✅ Interview completed notification sent to candidate ${candidateUserId}`);
        return notification;
    } catch (error) {
        console.error('❌ Error creating interview completed notification:', error);
        throw error;
    }
};

