// src/services/authService.js
import api from './api';
import { jwtDecode } from 'jwt-decode'; // ← Con llaves { }

export const authService = {
  login: async (emailOrUsuario, password) => {
    try {
      const response = await api.post('/auth/login', { emailOrUsuario, password });
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      
      window.location.href = '/empresas';
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  registro: async (nombre, usuario, email, password) => {
    try {
      const response = await api.post('/auth/registro', { nombre, usuario, email, password });
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      
      window.location.href = '/empresas';
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login';
  },

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

  obtenerUsuarioActual: () => {
    const usuarioStr = localStorage.getItem('usuario');
    return usuarioStr ? JSON.parse(usuarioStr) : null;
  },

  obtenerToken: () => {
    return localStorage.getItem('token');
  }
};