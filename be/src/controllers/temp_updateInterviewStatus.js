// @desc    Update interview status
// @route   PUT /api/v1/interviews/:id/status
// @access  Private/Recruiter
exports.updateInterviewStatus = async (req, res, next) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: 'Interview not found'
            });
        }

        // Get recruiter
        const recruiter = await Recruiter.findOne({ user_id: req.user.id });

        if (!recruiter) {
            return res.status(403).json({
                success: false,
                message: 'Recruiter profile not found'
            });
        }

        // Check authorization - handle both populated and non-populated recruiter_id
        const interviewRecruiterId = interview.recruiter_id._id
            ? interview.recruiter_id._id.toString()
            : interview.recruiter_id.toString();

        if (interviewRecruiterId !== recruiter._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this interview'
            });
        }

        // Validate status
        const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'];
        if (!validStatuses.includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        // Update status
        interview.status = req.body.status;
        await interview.save();

        res.status(200).json({
            success: true,
            data: interview,
            message: 'Interview status updated successfully'
        });
    } catch (error) {
        next(error);
    }
};
