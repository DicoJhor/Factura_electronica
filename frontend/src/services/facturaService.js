import api from './api';

export const facturaService = {
  // Listar todas las facturas de una empresa
  listar: async (empresaId) => {
    const response = await api.get(`/facturas?empresaId=${empresaId}`);
    return response.data;
  },

  // Obtener una factura por ID
  obtenerPorId: async (id) => {
    const response = await api.get(`/facturas/${id}`);
    return response.data;
  },

  // Emitir nueva factura
  emitir: async (empresaId, facturaData) => {
    const response = await api.post('/facturas', {
      empresaId,
      ...facturaData
    });
    return response.data;
  },

  // Consultar RUC/DNI en SUNAT
  consultarSunat: async (numero) => {
    const response = await api.post('/sunat/consultar-ruc', { numero });
    return response.data;
  },

  // Reenviar comprobante a SUNAT
  reenviar: async (comprobanteId) => {
    const response = await api.post('/sunat/reenviar', { comprobanteId });
    return response.data;
  }
};
