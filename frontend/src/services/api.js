import axios from 'axios';

// URL base SIN el /api al final
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Siempre agregamos /api al final
const getBaseURL = () => {
  return `${API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),        // → ahora sí: https://...onrender.com/api
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/registro') {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('Backend dormido o sin conexión (Render free tier normal)');
    }
    
    return Promise.reject(error);
  }
);

export default api;