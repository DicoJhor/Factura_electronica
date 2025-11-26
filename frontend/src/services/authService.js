// src/services/authService.js ← versión final que nunca falla
import api from './api';
import jwtDecode from 'jwt-decode';   // ← así, sin llaves

export const authService = {
  registro: async (datos) => {
    const response = await api.post('/auth/registro', datos);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      const usuario = jwtDecode(response.data.token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
    }
    return response.data;
  },

  login: async (emailOrUsuario, password) => {
    const response = await api.post('/auth/login', { emailOrUsuario, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
    }
    return response.data;
  },

  logout: () => {
    localStorage.clear();
    window.location.href = '/login';
  },

  estaAutenticado: () => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const decoded = jwtDecode(token);
      return decoded.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  },

  obtenerUsuarioActual: () => {
    const usuario = localStorage.getItem('usuario');
    return usuario ? JSON.parse(usuario) : null;
  },

  verificarToken: async () => {
    const response = await api.get('/auth/verificar');
    return response.data;
  }
};