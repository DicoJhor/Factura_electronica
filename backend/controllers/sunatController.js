import { enviarFacturaASunat } from "../services/sunatService.js";
import axios from 'axios';

// Tu función existente
export const reenviarASunat = async (req, res) => {
  const { zipPath, nombreArchivo } = req.body;
  try {
    const resultado = await enviarFacturaASunat(zipPath, nombreArchivo);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============= FUNCIÓN MEJORADA PARA CONSULTA RUC/DNI =============

/**
 * Consulta datos de RUC o DNI usando API de terceros confiable
 */
export const consultarRUC = async (req, res) => {
  try {
    const { numero } = req.body;

    // Validación de entrada
    if (!numero) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un número de RUC o DNI'
      });
    }

    // Limpiar y validar formato
    const numeroLimpio = numero.toString().trim();
    if (numeroLimpio.length !== 11 && numeroLimpio.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'El número debe tener 8 dígitos (DNI) o 11 dígitos (RUC)'
      });
    }

    // Determinar tipo de consulta
    const esRUC = numeroLimpio.length === 11;
    const endpoint = esRUC ? 'ruc' : 'dni';
    
    // API gratuita para consulta de RUC/DNI en Perú
    const urlConsulta = `https://dniruc.apisperu.com/api/v1/${endpoint}/${numeroLimpio}?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFwaXNwZXJ1QGdtYWlsLmNvbSJ9.V_c8YtfjrPaZ6Xm2gsDH5m3sJ6Sd0VgL3sBwIVUvF0s`;
    
    console.log(`🔍 Consultando ${endpoint.toUpperCase()}: ${numeroLimpio}`);

    // Realizar la petición
    const response = await axios.get(urlConsulta, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FacturadorElectronico/1.0'
      },
      timeout: 15000
    });

    // Verificar que hay datos
    if (!response.data) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

    // Formatear respuesta según tipo de documento
    const datos = esRUC ? formatearDatosRUC(response.data, numeroLimpio) : formatearDatosDNI(response.data, numeroLimpio);

    console.log(`✅ Datos encontrados: ${datos.razonSocial || datos.nombre}`);

    return res.status(200).json({
      success: true,
      data: datos
    });

  } catch (error) {
    console.error('❌ Error al consultar:', error.message);
    
    // Manejar errores específicos
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: 'Tiempo de espera agotado. Intente nuevamente.'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el RUC/DNI proporcionado en la base de datos'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas consultas. Espere un momento e intente nuevamente.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al consultar los datos. Intente nuevamente.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Formatea los datos de un RUC
 */
function formatearDatosRUC(data, numero) {
  return {
    numero: numero,
    tipoDocumento: 'RUC',
    razonSocial: data.razonSocial || '',
    nombre: data.razonSocial || '',
    nombreComercial: data.nombreComercial || '',
    tipo: data.tipo || '',
    estado: data.estado || '',
    condicion: data.condicion || '',
    direccion: data.direccion || '',
    departamento: data.departamento || '',
    provincia: data.provincia || '',
    distrito: data.distrito || '',
    ubigeo: data.ubigeo || '',
    // Datos adicionales que puede devolver la API
    sistemaEmision: data.sistemaEmision || '',
    actividadEconomica: data.actividadEconomica || '',
    numeroTrabajadores: data.numeroTrabajadores || '',
    tipoFacturacion: data.tipoFacturacion || '',
    comercioExterior: data.comercioExterior || '',
    fechaInscripcion: data.fechaInscripcion || '',
    fechaInicioActividades: data.fechaInicioActividades || ''
  };
}

/**
 * Formatea los datos de un DNI
 */
function formatearDatosDNI(data, numero) {
  const nombreCompleto = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
  
  return {
    numero: numero,
    tipoDocumento: 'DNI',
    nombre: nombreCompleto,
    razonSocial: nombreCompleto,
    nombres: data.nombres || '',
    apellidoPaterno: data.apellidoPaterno || '',
    apellidoMaterno: data.apellidoMaterno || '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    estado: 'ACTIVO',
    condicion: 'HABIDO'
  };
}