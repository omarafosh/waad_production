import api from './api';

export const getLifecyclePreview = async (entityType, entityId) => {
    const response = await api.get(`/lifecycle/preview/${entityType}/${entityId}`);
    return response.data;
};

export const executeLifecycleAction = async (entityType, entityId, actionData) => {
    const response = await api.post(`/lifecycle/execute/${entityType}/${entityId}`, actionData);
    return response.data;
};
