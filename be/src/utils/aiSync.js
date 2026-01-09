const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

/**
 * Sync a job to the AI service (RAG)
 * @param {string} jobId - The ID of the job to sync
 */
exports.syncJobToAI = async (jobId) => {
    try {
        console.log(`[AI-SYNC] Syncing job: ${jobId}`);
        const response = await axios.post(`${AI_SERVICE_URL}/api/ai/sync/job`, {
            job_id: jobId
        });
        console.log(`[AI-SYNC] Job sync success:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`[AI-SYNC] Job sync failed for ${jobId}:`, error.message);
        // We don't throw error to avoid breaking the main request flow
        return null;
    }
};

/**
 * Sync a candidate to the AI service (RAG)
 * @param {string} candidateId - The ID of the candidate to sync
 */
exports.syncCandidateToAI = async (candidateId) => {
    try {
        console.log(`[AI-SYNC] Syncing candidate: ${candidateId}`);
        const response = await axios.post(`${AI_SERVICE_URL}/api/ai/sync/candidate`, {
            candidate_id: candidateId
        });
        console.log(`[AI-SYNC] Candidate sync success:`, response.data);
        return response.data;
    } catch (error) {
        console.error(`[AI-SYNC] Candidate sync failed for ${candidateId}:`, error.message);
        return null;
    }
};
