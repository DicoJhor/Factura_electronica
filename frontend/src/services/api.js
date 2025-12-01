import axios from 'axios';

// URL base configurada desde variable de entorno
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

console.log('🔗 Conectando a API:', API_BASE); // Para debugging

const api = axios.create({
  baseURL: `${API_BASE}/api`,
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
    console.log('📤 Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => {
    console.log('📥 Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.response?.status, error.message);
    
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/registro') {
        console.log('🔐 Token inválido, redirigiendo a login...');
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Timeout - El backend tardó más de 30 segundos');
    }
    
    if (error.message === 'Network Error') {
      console.error('🌐 Error de red - Backend no responde o CORS bloqueado');
    }
    
    return Promise.reject(error);
  }
);

export default api;