// frontend/src/services/facturaService.js
import api from "./api";

// Obtener todos los productos
export const getProductos = async () => {
  const res = await api.get("/productos");
  return res.data;
};

// Crear nueva factura (boleta)
export const crearFactura = async (factura) => {
  const res = await api.post("/facturas", factura);
  return res.data;
};

// Enviar factura a SUNAT
export const enviarFacturaSunat = async (idFactura) => {
  const res = await api.post(`/sunat/enviar/${idFactura}`);
  return res.data;
};

// Obtener lista de facturas emitidas
export const getFacturas = async () => {
  const res = await api.get("/facturas");
  return res.data;
};
