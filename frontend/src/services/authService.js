import api from './api';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  // Registrar nuevo usuario
  registro: async (datos) => {
    const response = await api.post('/auth/registro', datos);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      const usuario = jwtDecode(response.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
    return response.data;
  },

  // Login
  login: async (emailOrUsuario, password) => {
    const response = await api.post('/auth/login', { emailOrUsuario, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
    }
    return response.data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('empresaActiva');
    window.location.href = '/login';
  },

  // Verificar si está autenticado
  estaAutenticado: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const ahora = Date.now() / 1000;
      return decoded.exp > ahora;
    } catch (error) {
      return false;
    }
  },

  // Obtener usuario actual
  obtenerUsuarioActual: () => {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  },

  // Verificar token con el servidor
  verificarToken: async () => {
    const response = await api.get('/auth/verificar');
    return response.data;
  }
};