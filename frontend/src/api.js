import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

export const getProperties = () => api.get('/properties').then(r => r.data.data);
export const createProperty = (data) => api.post('/properties', data).then(r => r.data.data);
export const deleteProperty = (id) => api.delete(`/properties/${id}`);
export const addLink = (propertyId, data) => api.post(`/properties/${propertyId}/links`, data).then(r => r.data.data);
export const deleteLink = (propertyId, linkId) => api.delete(`/properties/${propertyId}/links/${linkId}`);
export const saveBuyrentStats = (propertyId, data) => api.post(`/properties/${propertyId}/buyrent-stats`, data);
export const getPropertyAnalytics = (id) => api.get(`/analytics/property/${id}`).then(r => r.data.data);
export const getOverview = () => api.get('/analytics/overview').then(r => r.data.data);
export const getPlatformStatus = () => api.get('/platforms/status').then(r => r.data.data);
export const refreshAll = () => api.post('/analytics/refresh-all').then(r => r.data);
export const getPlatformAnalytics = (platform) => api.get(`/analytics/platform/${platform}`).then(r => r.data.data);
export const saveManualPlatformStats = (propertyId, data) => api.post(`/properties/${propertyId}/manual-stats`, data).then(r => r.data);
