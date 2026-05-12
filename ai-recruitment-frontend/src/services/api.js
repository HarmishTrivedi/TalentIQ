import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const API_BASE = `${BASE_URL}/api/v1`

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
}, Promise.reject)

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error.response?.data?.detail || error.response?.data?.error || error.message
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    } else if (error.response?.status !== 404) {
      toast.error(msg || 'Something went wrong')
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/me/change-password', data),
  uploadAvatar: (formData) => api.post('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const candidatesApi = {
  upload: (formData, onProgress) => api.post('/candidates/upload', formData, {
    onUploadProgress: (e) => onProgress && onProgress(Math.round(e.loaded / e.total * 100)),
    timeout: 120000,
  }),
  list: (params) => api.get('/candidates', { params }),
  get: (id) => api.get(`/candidates/${id}`),
  delete: (id) => api.delete(`/candidates/${id}`),
  reprocess: (id) => api.post(`/candidates/${id}/reprocess`),
}

export const jobsApi = {
  create: (data) => api.post('/jobs', data),
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  generateJD: (data) => api.post('/jobs/generate-jd', data, { timeout: 60000 }),
}

export const matchingApi = {
  run: (data) => api.post('/matching/run', data, { timeout: 180000 }),
  getJobMatches: (jobId) => api.get(`/matching/job/${jobId}`),
  getCandidateMatches: (candidateId) => api.get(`/matching/candidate/${candidateId}`),
}

export const chatApi = {
  createSession: (data) => api.post('/chat/sessions', data),
  sendMessage: (sessionId, content) => api.post(`/chat/sessions/${sessionId}/messages`, { content }),
  getSession: (sessionId) => api.get(`/chat/sessions/${sessionId}`),
  listSessions: () => api.get('/chat/sessions'),
  deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
}

export const adminApi = {
  getPlatformStats: () => api.get('/admin/platform-stats'),
  listUsers: () => api.get('/admin/users'),
  createAdmin: (data) => api.post('/admin/users/create-admin', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUsageStats: () => api.get('/admin/usage-stats'),
  getPricing: () => api.get('/admin/pricing'),
  createPlan: (data) => api.post('/admin/pricing', data),
  updatePlan: (id, data) => api.put(`/admin/pricing/${id}`, data),
  deletePlan: (id) => api.delete(`/admin/pricing/${id}`),
  getSubscriptions: () => api.get('/admin/subscriptions'),
  updateSubscription: (id, status) => api.patch(`/admin/subscriptions/${id}`, { status }),
  subscribe: (data) => api.post('/admin/subscribe', data),
}

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
}

export default api
