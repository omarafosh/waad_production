import axiosClient from './client';

const API_URL = '/notifications';

class NotificationService {
    /**
     * Get user notifications
     * @param {Object} params - { page, size, unreadOnly }
     */
    async getAll(params = {}) {
        const response = await axios.get(API_URL, { params });
        return response.data;
    }

    /**
     * Get unread count
     */
    async getUnreadCount() {
        const response = await axios.get(`${API_URL}/unread-count`);
        return response.data;
    }

    /**
     * Mark notification as read
     * @param {string|number} id 
     */
    async markAsRead(id) {
        const response = await axios.put(`${API_URL}/${id}/read`);
        return response.data;
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        const response = await axios.put(`${API_URL}/read-all`);
        return response.data;
    }
}

export const notificationService = new NotificationService();
export default notificationService;
