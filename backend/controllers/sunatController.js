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

// ============= FUNCIONES PARA CONSULTA RUC/DNI =============

/**
 * Consulta RUC usando múltiples APIs (con fallback)
 */
const consultarRUCConFallback = async (ruc) => {
  const apis = [
    {
      name: 'apis.net.pe',
      url: `https://api.apis.net.pe/v2/sunat/ruc/full?numero=${ruc}`,
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: 'RUC',
        razonSocial: data.nombre || '',
        nombre: data.nombre || '',
        estado: data.estado || '',
        condicion: data.condicion || '',
        direccion: data.direccion || '',
        departamento: data.departamento || '',
        provincia: data.provincia || '',
        distrito: data.distrito || '',
        ubigeo: data.ubigeo || ''
      })
    },
    {
      name: 'apiperu.dev',
      url: `https://apiperu.dev/api/ruc/${ruc}`,
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: 'RUC',
        razonSocial: data.data?.nombre_o_razon_social || '',
        nombre: data.data?.nombre_o_razon_social || '',
        estado: data.data?.estado || '',
        condicion: data.data?.condicion || '',
        direccion: data.data?.direccion || '',
        departamento: data.data?.departamento || '',
        provincia: data.data?.provincia || '',
        distrito: data.data?.distrito || '',
        ubigeo: data.data?.ubigeo || ''
      })
    },
    {
      name: 'dniruc.apisperu.com',
      url: `https://dniruc.apisperu.com/api/v1/ruc/${ruc}`,
      transform: (data) => ({
        numero: ruc,
        tipoDocumento: 'RUC',
        razonSocial: data.razonSocial || '',
        nombre: data.razonSocial || '',
        estado: data.estado || '',
        condicion: data.condicion || '',
        direccion: data.direccion || '',
        departamento: data.departamento || '',
        provincia: data.provincia || '',
        distrito: data.distrito || '',
        ubigeo: data.ubigeo || ''
      })
    }
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`Intentando consultar RUC en ${api.name}...`);
      
      const response = await axios.get(api.url, {
        timeout: 8000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && (response.data.nombre || response.data.razonSocial || response.data.data)) {
        const datos = api.transform(response.data);
        
        if (datos.razonSocial && datos.razonSocial.trim() !== '') {
          console.log(`✅ RUC encontrado en ${api.name}`);
          return {
            success: true,
            data: datos
          };
        }
      }
    } catch (error) {
      console.log(`❌ Error en ${api.name}:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('No se pudo consultar el RUC en ninguna API');
};

/**
 * Consulta DNI usando múltiples APIs (con fallback)
 */
const consultarDNIConFallback = async (dni) => {
  const apis = [
    {
      name: 'apis.net.pe',
      url: `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`,
      transform: (data) => {
        const nombreCompleto = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
        return {
          numero: dni,
          tipoDocumento: 'DNI',
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          nombres: data.nombres || '',
          apellidoPaterno: data.apellidoPaterno || '',
          apellidoMaterno: data.apellidoMaterno || '',
          direccion: '',
          estado: 'ACTIVO',
          condicion: 'HABIDO'
        };
      }
    },
    {
      name: 'apiperu.dev',
      url: `https://apiperu.dev/api/dni/${dni}`,
      transform: (data) => {
        const nombreCompleto = data.data?.nombre_completo || '';
        return {
          numero: dni,
          tipoDocumento: 'DNI',
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          direccion: '',
          estado: 'ACTIVO',
          condicion: 'HABIDO'
        };
      }
    },
    {
      name: 'dniruc.apisperu.com',
      url: `https://dniruc.apisperu.com/api/v1/dni/${dni}`,
      transform: (data) => {
        const nombreCompleto = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
        return {
          numero: dni,
          tipoDocumento: 'DNI',
          nombre: nombreCompleto,
          razonSocial: nombreCompleto,
          direccion: '',
          estado: 'ACTIVO',
          condicion: 'HABIDO'
        };
      }
    }
  ];

  let lastError = null;

  for (const api of apis) {
    try {
      console.log(`Intentando consultar DNI en ${api.name}...`);
      
      const response = await axios.get(api.url, {
        timeout: 8000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && (response.data.nombres || response.data.nombre_completo || response.data.data)) {
        const datos = api.transform(response.data);
        
        if (datos.nombre && datos.nombre.trim() !== '') {
          console.log(`✅ DNI encontrado en ${api.name}`);
          return {
            success: true,
            data: datos
          };
        }
      }
    } catch (error) {
      console.log(`❌ Error en ${api.name}:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('No se pudo consultar el DNI en ninguna API');
};

/**
 * Controlador principal para consultar RUC o DNI
 */
export const consultarRUC = async (req, res) => {
  try {
    console.log('📥 Solicitud de consulta recibida:', req.body);
    
    const { numero } = req.body;

    // Validación de entrada
    if (!numero) {
      console.log('❌ No se proporcionó número');
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un número de RUC o DNI'
      });
    }

    const numeroLimpio = numero.toString().trim();
    console.log('🔍 Consultando número:', numeroLimpio);

    // Validar formato
    if (numeroLimpio.length !== 11 && numeroLimpio.length !== 8) {
      console.log('❌ Formato inválido');
      return res.status(400).json({
        success: false,
        message: 'El número debe tener 8 dígitos (DNI) o 11 dígitos (RUC)'
      });
    }

    let resultado;

    // Consultar según el tipo de documento
    if (numeroLimpio.length === 11) {
      console.log('📋 Consultando RUC...');
      resultado = await consultarRUCConFallback(numeroLimpio);
    } else {
      console.log('🆔 Consultando DNI...');
      resultado = await consultarDNIConFallback(numeroLimpio);
    }

    if (resultado.success) {
      console.log('✅ Consulta exitosa:', resultado.data);
      return res.status(200).json(resultado);
    } else {
      console.log('⚠️ No se encontraron datos');
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

  } catch (error) {
    console.error('❌ Error en consultarRUC:', error);
    console.error('Stack trace:', error.stack);

    // Manejo de errores específicos
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: 'Tiempo de espera agotado. Intente nuevamente.'
      });
    }

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return res.status(503).json({
        success: false,
        message: 'No se pudo conectar con el servicio de consulta. Verifique su conexión a internet.'
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
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};