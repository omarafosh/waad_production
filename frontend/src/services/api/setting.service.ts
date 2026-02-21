import axiosClient from 'utils/axios';

/**
 * ============================================================================
 * Setting API Service - System Settings
 * ============================================================================
 *
 * Contract: SystemSettings
 * 
 * Service for managing TBA System Settings (Branding, Configuration, etc.).
 * Replaces legacy company.service.js
 *
 * Endpoints:
 * - GET  /api/settings      - Get global settings
 * - PUT  /api/settings      - Update global settings
 *
 * @created 2026-02-18
 */

const BASE_URL = '/settings';

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

/**
 * Get the system's global settings.
 * CONTRACT: GET /api/settings
 * 
 * Publicly accessible (for login branding).
 * 
 * @returns {Promise<Object>} System Settings (SettingDto)
 */
const getSettings = async () => {
    try {
        const response = await axiosClient.get(`${BASE_URL}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching system settings:', error);
        throw error;
    }
};

/**
 * Update the system settings.
 * CONTRACT: PUT /api/settings
 * 
 * Requires Admin/SuperAdmin privileges.
 * 
 * @param {Object} data - Updated settings data (SettingDto fields)
 * @returns {Promise<Object>} Updated settings (SettingDto)
 */
const updateSettings = async (data) => {
    try {
        const response = await axiosClient.put(`${BASE_URL}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating system settings:', error);
        throw error;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const settingService = {
    getSettings,
    updateSettings,

    // Aliases for compatibility during refactor (optional)
    getDefaultCompany: getSettings,
    updateDefaultCompany: updateSettings
};

export default settingService;
