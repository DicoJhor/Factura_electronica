import api from './api';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  // Registrar nuevo usuario
  registro: async (datos) => {
    try {
      console.log('🔄 Intentando registrar usuario:', {
        nombre: datos.nombre,
        usuario: datos.usuario,
        email: datos.email,
        password: '***' // No mostrar password en logs
      });

      const response = await api.post('/auth/registro', {
        nombre: datos.nombre,
        usuario: datos.usuario,
        email: datos.email,
        password: datos.password,
        rol: datos.rol || 'cajero'
      });

      console.log('✅ Registro exitoso:', response.data);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        const usuario = jwtDecode(response.data.token);
        localStorage.setItem('usuario', JSON.stringify(usuario));
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error en authService.registro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Login
  login: async (emailOrUsuario, password) => {
    try {
      console.log('🔄 Intentando login:', { emailOrUsuario });

      const response = await api.post('/auth/login', { emailOrUsuario, password });

      console.log('✅ Login exitoso');

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      }

      return response.data;
    } catch (error) {
      console.error('❌ Error en authService.login:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Logout
  logout: () => {
    console.log('👋 Cerrando sesión...');
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
      console.error('❌ Error al verificar token:', error);
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
    try {
      const response = await api.get('/auth/verificar');
      return response.data;
    } catch (error) {
      console.error('❌ Error al verificar token:', error);
      throw error;
    }
  }
};