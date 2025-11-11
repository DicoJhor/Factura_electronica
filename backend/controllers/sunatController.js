// backend/controllers/sunatController.js
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

// ============= FUNCIONES PARA CONSULTA RUC/DNI CON API EXTERNA =============

/**
 * Consulta RUC usando API externa (api.apis.net.pe)
 */
const consultarRUCAPI = async (ruc) => {
  try {
    const response = await axios.get(`https://api.apis.net.pe/v2/sunat/ruc/full`, {
      params: { numero: ruc },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FacturadorApp/1.0'
      }
    });

    if (response.data && response.data.nombre) {
      return {
        success: true,
        data: {
          numero: ruc,
          tipoDocumento: 'RUC',
          razonSocial: response.data.nombre,
          nombre: response.data.nombre,
          estado: response.data.estado || '',
          condicion: response.data.condicion || '',
          direccion: response.data.direccion || '',
          ubigeo: response.data.ubigeo || '',
          departamento: response.data.departamento || '',
          provincia: response.data.provincia || '',
          distrito: response.data.distrito || '',
          tipoContribuyente: response.data.tipo || ''
        }
      };
    }

    return {
      success: false,
      message: 'No se encontraron datos para el RUC proporcionado'
    };
  } catch (error) {
    console.error('Error consultando RUC en API:', error.message);
    throw error;
  }
};

/**
 * Consulta DNI usando API externa (api.apis.net.pe)
 */
const consultarDNIAPI = async (dni) => {
  try {
    const response = await axios.get(`https://api.apis.net.pe/v2/reniec/dni`, {
      params: { numero: dni },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FacturadorApp/1.0'
      }
    });

    if (response.data && response.data.nombres) {
      const nombreCompleto = `${response.data.nombres} ${response.data.apellidoPaterno} ${response.data.apellidoMaterno}`.trim();
      
      return {
        success: true,
        data: {
          numero: dni,
          tipoDocumento: 'DNI',
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          nombres: response.data.nombres,
          apellidoPaterno: response.data.apellidoPaterno,
          apellidoMaterno: response.data.apellidoMaterno,
          direccion: '',
          estado: 'ACTIVO',
          condicion: 'HABIDO'
        }
      };
    }

    return {
      success: false,
      message: 'No se encontraron datos para el DNI proporcionado'
    };
  } catch (error) {
    console.error('Error consultando DNI en API:', error.message);
    throw error;
  }
};

/**
 * Controlador principal para consultar RUC o DNI
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

    const numeroLimpio = numero.toString().trim();

    // Validar formato
    if (numeroLimpio.length !== 11 && numeroLimpio.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'El número debe tener 8 dígitos (DNI) o 11 dígitos (RUC)'
      });
    }

    let resultado;

    // Consultar según el tipo de documento
    if (numeroLimpio.length === 11) {
      // Es un RUC
      resultado = await consultarRUCAPI(numeroLimpio);
    } else {
      // Es un DNI
      resultado = await consultarDNIAPI(numeroLimpio);
    }

    if (resultado.success) {
      return res.status(200).json(resultado);
    } else {
      return res.status(404).json(resultado);
    }

  } catch (error) {
    console.error('Error al consultar documento:', error);

    // Manejo de errores específicos
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: 'Tiempo de espera agotado. Intente nuevamente.'
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas consultas. Por favor espere un momento e intente nuevamente.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al consultar los datos. Por favor intente nuevamente.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Alternativa: Consulta usando apiperu.dev (requiere token gratuito)
 * Para usar esta API, registrarse en https://apiperu.dev/
 */
export const consultarRUCAlternativo = async (req, res) => {
  try {
    const { numero } = req.body;
    const API_TOKEN = process.env.APIPERU_TOKEN; // Agregar en .env

    if (!API_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'API Token no configurado'
      });
    }

    const numeroLimpio = numero.toString().trim();
    let url;

    if (numeroLimpio.length === 11) {
      url = `https://apiperu.dev/api/ruc/${numeroLimpio}`;
    } else if (numeroLimpio.length === 8) {
      url = `https://apiperu.dev/api/dni/${numeroLimpio}`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Formato de documento inválido'
      });
    }

    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      return res.status(200).json({
        success: true,
        data: {
          numero: numeroLimpio,
          tipoDocumento: numeroLimpio.length === 11 ? 'RUC' : 'DNI',
          razonSocial: response.data.data.nombre_o_razon_social || response.data.data.nombre_completo,
          nombre: response.data.data.nombre_o_razon_social || response.data.data.nombre_completo,
          estado: response.data.data.estado || '',
          condicion: response.data.data.condicion || '',
          direccion: response.data.data.direccion || '',
          ubigeo: response.data.data.ubigeo || ''
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos'
      });
    }

  } catch (error) {
    console.error('Error en API alternativa:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al consultar los datos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};