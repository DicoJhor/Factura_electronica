import api from './api';

export const empresaService = {
  // Listar todas las empresas del usuario
  listar: async () => {
    const response = await api.get('/empresas');
    return response.data.empresas;
  },

  // Obtener una empresa por ID
  obtenerPorId: async (id) => {
    const response = await api.get(`/empresas/${id}`);
    return response.data.empresa;
  },

  // Crear nueva empresa
  crear: async (formData) => {
    const response = await api.post('/empresas', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Actualizar empresa
  actualizar: async (id, formData) => {
    const response = await api.put(`/empresas/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Establecer como principal
  establecerPrincipal: async (id) => {
    const response = await api.patch(`/empresas/${id}/principal`);
    return response.data;
  },

  // Eliminar empresa
  eliminar: async (id) => {
    const response = await api.delete(`/empresas/${id}`);
    return response.data;
  },

  // Gestionar empresa activa en localStorage
  setEmpresaActiva: (empresa) => {
    localStorage.setItem('empresaActiva', JSON.stringify(empresa));
  },

  getEmpresaActiva: () => {
    const empresa = localStorage.getItem('empresaActiva');
    return empresa ? JSON.parse(empresa) : null;
  },

  clearEmpresaActiva: () => {
    localStorage.removeItem('empresaActiva');
  }
};