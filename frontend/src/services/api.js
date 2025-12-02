import axios from 'axios';

// URL base configurada desde variable de entorno
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

console.log('🔗 API Base URL:', API_BASE);
console.log('🌍 Environment:', import.meta.env.MODE);

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // Importante para CORS
});

// Interceptor para añadir token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('📤 Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data
    });
    
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
    console.log('✅ Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
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
      console.error('🌐 Error de red - Posible problema de CORS o backend caído');
    }
    
    return Promise.reject(error);
  }
);

// Función para verificar salud de la API
export const checkAPIHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE}/api/health`, {
      timeout: 5000
    });
    console.log('💚 API Health Check:', response.data);
    return response.data;
  } catch (error) {
    console.error('💔 API Health Check failed:', error.message);
    return null;
  }
};

export default api;