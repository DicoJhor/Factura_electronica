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

// ============= FUNCIÓN MEJORADA CON MÚLTIPLES APIs DE RESPALDO =============

/**
 * Consulta datos de RUC o DNI con sistema de fallback
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

    const esRUC = numeroLimpio.length === 11;
    console.log(`🔍 Consultando ${esRUC ? 'RUC' : 'DNI'}: ${numeroLimpio}`);

    // Intentar con múltiples APIs
    const datos = esRUC 
      ? await consultarRUCConFallback(numeroLimpio)
      : await consultarDNIConFallback(numeroLimpio);

    if (!datos) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

    console.log(`✅ Datos encontrados: ${datos.razonSocial || datos.nombre}`);

    return res.status(200).json({
      success: true,
      data: datos
    });

  } catch (error) {
    console.error('❌ Error al consultar:', error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Error al consultar los datos. Intente nuevamente.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Intenta consultar RUC con múltiples APIs
 */
async function consultarRUCConFallback(ruc) {
  const apis = [
    {
      nombre: 'API Perú',
      url: `https://api.apis.net.pe/v2/sunat/ruc/full?numero=${ruc}`,
      formatear: formatearDatosRUC_APIPeru
    },
    {
      nombre: 'APIs Peru',
      url: `https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFwaXNwZXJ1QGdtYWlsLmNvbSJ9.V_c8YtfjrPaZ6Xm2gsDH5m3sJ6Sd0VgL3sBwIVUvF0s`,
      formatear: formatearDatosRUC_APIsPeruCom
    },
    {
      nombre: 'Consulta RUC',
      url: `https://consultaruc.win/api/ruc/${ruc}`,
      formatear: formatearDatosRUC_ConsultaRUC
    }
  ];

  for (const api of apis) {
    try {
      console.log(`   Intentando con ${api.nombre}...`);
      const response = await axios.get(api.url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });

      if (response.data && (response.data.razonSocial || response.data.nombre)) {
        console.log(`   ✓ Éxito con ${api.nombre}`);
        return api.formatear(response.data, ruc);
      }
    } catch (error) {
      console.log(`   ✗ Falló ${api.nombre}: ${error.message}`);
      continue;
    }
  }

  return null;
}

/**
 * Intenta consultar DNI con múltiples APIs
 */
async function consultarDNIConFallback(dni) {
  const apis = [
    {
      nombre: 'API Perú DNI',
      url: `https://api.apis.net.pe/v2/reniec/dni?numero=${dni}`,
      formatear: formatearDatosDNI_APIPeru
    },
    {
      nombre: 'APIs Peru DNI',
      url: `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFwaXNwZXJ1QGdtYWlsLmNvbSJ9.V_c8YtfjrPaZ6Xm2gsDH5m3sJ6Sd0VgL3sBwIVUvF0s`,
      formatear: formatearDatosDNI_APIsPeruCom
    }
  ];

  for (const api of apis) {
    try {
      console.log(`   Intentando con ${api.nombre}...`);
      const response = await axios.get(api.url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });

      if (response.data && (response.data.nombres || response.data.nombreCompleto)) {
        console.log(`   ✓ Éxito con ${api.nombre}`);
        return api.formatear(response.data, dni);
      }
    } catch (error) {
      console.log(`   ✗ Falló ${api.nombre}: ${error.message}`);
      continue;
    }
  }

  return null;
}

// ============= FORMATEADORES PARA DIFERENTES APIs =============

function formatearDatosRUC_APIPeru(data, numero) {
  return {
    numero: numero,
    tipoDocumento: 'RUC',
    razonSocial: data.razonSocial || data.nombre || '',
    nombre: data.razonSocial || data.nombre || '',
    nombreComercial: data.nombreComercial || '',
    tipo: data.tipo || '',
    estado: data.estado || '',
    condicion: data.condicion || '',
    direccion: data.direccion || '',
    departamento: data.departamento || '',
    provincia: data.provincia || '',
    distrito: data.distrito || '',
    ubigeo: data.ubigeo || ''
  };
}

function formatearDatosRUC_APIsPeruCom(data, numero) {
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
    ubigeo: data.ubigeo || ''
  };
}

function formatearDatosRUC_ConsultaRUC(data, numero) {
  return {
    numero: numero,
    tipoDocumento: 'RUC',
    razonSocial: data.nombre || data.razonSocial || '',
    nombre: data.nombre || data.razonSocial || '',
    nombreComercial: '',
    tipo: '',
    estado: data.estado || '',
    condicion: data.condicion || '',
    direccion: data.direccion || '',
    departamento: data.departamento || '',
    provincia: data.provincia || '',
    distrito: data.distrito || '',
    ubigeo: ''
  };
}

function formatearDatosDNI_APIPeru(data, numero) {
  const nombreCompleto = data.nombreCompleto || 
    `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`.trim();
  
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

function formatearDatosDNI_APIsPeruCom(data, numero) {
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