import api from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getLoginUrl = () => api.get('/auth/login');
export const authCallback = (code) => api.get(`/auth/callback?code=${code}`);
export const logout = () => api.post('/auth/logout');
export const localLogin = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/users/me');
export const updateMe = (data) => api.put('/users/me', data);

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const getTasks = (projectId) => api.get(`/projects/${projectId}/tasks`);
export const getTask = (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`);
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data);
export const updateTask = (projectId, taskId, data) =>
  api.put(`/projects/${projectId}/tasks/${taskId}`, data);
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`);
export const reorderTasks = (projectId, updates) =>
  api.patch(`/projects/${projectId}/tasks/reorder`, { updates });

// ── Members ───────────────────────────────────────────────────────────────────
export const getMembers = (projectId) => api.get(`/projects/${projectId}/members`);
export const inviteMember = (projectId, data) =>
  api.post(`/projects/${projectId}/members/invite`, data);
export const changeMemberRole = (projectId, userId, role) =>
  api.put(`/projects/${projectId}/members/${userId}/role`, { role });
export const removeMember = (projectId, userId) =>
  api.delete(`/projects/${projectId}/members/${userId}`);

// ── Invites ───────────────────────────────────────────────────────────────────
export const acceptInvite = (token) => api.get(`/invites/accept?token=${token}`);
