import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

// Attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// Staff
export const getStaff = () => api.get('/staff/');
export const getStaffById = (id) => api.get(`/staff/${id}`);
export const createStaff = (data) => api.post('/staff/', data);
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/staff/${id}`);

// Attendance
export const checkIn = (data) => api.post('/attendance/checkin', data);
export const checkOut = (data) => api.post('/attendance/checkout', data);
export const getTodayAttendance = () => api.get('/attendance/today');
export const getMyHistory = () => api.get('/attendance/my-history');
export const getAllAttendance = () => api.get('/attendance/all');
export const kioskScan = (data) => api.post('/attendance/kiosk', data);

// Shifts
export const getWeekShifts = (weekStart) => api.get(`/shifts/week?week_start=${weekStart}`);
export const getMyShifts = () => api.get('/shifts/my');
export const createShift = (data) => api.post('/shifts/', data);
export const createBulkShifts = (data) => api.post('/shifts/bulk', data);

// Leave
export const applyLeave = (data) => api.post('/leaves/', data);
export const getMyLeaves = () => api.get('/leaves/my');
export const getAllLeaves = () => api.get('/leaves/all');
export const getPendingLeaves = () => api.get('/leaves/pending');
export const reviewLeave = (id, data) => api.put(`/leaves/${id}/review`, data);

// Tasks
export const createTask = (data) => api.post('/tasks/', data);
export const getMyTasks = () => api.get('/tasks/my');
export const getAllTasks = () => api.get('/tasks/all');
export const completeTask = (id) => api.put(`/tasks/${id}/complete`);
export const updateTaskStatus = (id, data) => api.put(`/tasks/${id}/status`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Communication
export const getAnnouncements = () => api.get('/communication/announcements');
export const createAnnouncement = (data) => api.post('/communication/announcements', data);
export const deleteAnnouncement = (id) => api.delete(`/communication/announcements/${id}`);
export const submitFeedback = (data) => api.post('/communication/feedback', data);
export const getFeedback = () => api.get('/communication/feedback');

// Tracking
export const updateLocation = (data) => api.post('/tracking/update', data);
export const getLiveLocations = () => api.get('/tracking/live');
export const getLocationHistory = (userId) => api.get(`/tracking/history/${userId}`);

// Reports
export const getAttendanceSummary = (period) => api.get(`/reports/attendance-summary?period=${period}`);
export const getLeaveSummary = (period) => api.get(`/reports/leave-summary?period=${period}`);
export const getPerformanceReport = (period) => api.get(`/reports/performance?period=${period}`);
export const getDashboardStats = () => api.get('/reports/dashboard-stats');
export const exportAttendanceCsv = (period) => `${API_BASE}/reports/export/attendance-csv?period=${period}`;

// Settings
export const getSettings = () => api.get('/settings/');
export const updateSettings = (data) => api.put('/settings/', data);

// Payroll
export const getPayrollSummary = (month) => api.get(`/payroll/summary?month=${encodeURIComponent(month)}`);
export const getSalarySheet = (month) => api.get(`/payroll/sheet?month=${encodeURIComponent(month)}`);
export const updateSalaryRecord = (id, data) => api.put(`/payroll/${id}`, data);
export const disburseSalaries = (month) => api.post('/payroll/disburse', { month });
