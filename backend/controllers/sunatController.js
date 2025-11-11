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

// ============= NUEVAS FUNCIONES PARA CONSULTA RUC/DNI =============

/**
 * Consulta datos de RUC o DNI en SUNAT
 */
export const consultarRUC = async (req, res) => {
  try {

    if (!numero) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un número de RUC o DNI'
      });
    }

    // Validar formato
    const numeroLimpio = numero.toString().trim();
    if (numeroLimpio.length !== 11 && numeroLimpio.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'El número debe tener 8 dígitos (DNI) o 11 dígitos (RUC)'
      });
    }

    // Realizar consulta a SUNAT
    const urlConsulta = 'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias';
    
    const response = await axios.get(urlConsulta, {
      params: {
        accion: 'consPorRuc',
        nroRuc: numeroLimpio
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-PE,es;q=0.9',
      },
      timeout: 15000
    });

    // Parsear la respuesta HTML
    const datos = parsearRespuestaSUNAT(response.data, numeroLimpio);

    if (!datos.razonSocial && !datos.nombre) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

    return res.status(200).json({
      success: true,
      data: datos
    });

  } catch (error) {
    console.error('Error al consultar SUNAT:', error.message);
    
    // Manejar errores específicos
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        message: 'Tiempo de espera agotado al consultar SUNAT'
      });
    }
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron datos para el número proporcionado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error al consultar los datos en SUNAT',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Parsea la respuesta HTML de SUNAT y extrae los datos
 */
function parsearRespuestaSUNAT(html, numero) {
  const datos = {
    numero: numero,
    tipoDocumento: numero.length === 8 ? 'DNI' : 'RUC',
    razonSocial: '',
    nombre: '',
    estado: '',
    condicion: '',
    direccion: '',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: ''
  };

  try {
    // Extraer todos los datos de las celdas de la tabla
    const celdas = extraerCeldasTabla(html);

    // Buscar Razón Social o Nombre
    const razonSocialIndex = celdas.findIndex(c => 
      c.includes('Nombre') || c.includes('Razón Social')
    );
    if (razonSocialIndex !== -1 && celdas[razonSocialIndex + 1]) {
      datos.razonSocial = limpiarTexto(celdas[razonSocialIndex + 1]);
      datos.nombre = datos.razonSocial;
    }

    // Extraer Tipo de Contribuyente
    const tipoMatch = html.match(/Tipo\s+Contribuyente[:\s]*<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>/i);
    if (tipoMatch && tipoMatch[1]) {
      datos.tipoContribuyente = limpiarTexto(tipoMatch[1]);
    }

    // Extraer Estado
    const estadoIndex = celdas.findIndex(c => 
      c.includes('Estado del Contribuyente')
    );
    if (estadoIndex !== -1 && celdas[estadoIndex + 1]) {
      datos.estado = limpiarTexto(celdas[estadoIndex + 1]);
    }

    // Extraer Condición
    const condicionIndex = celdas.findIndex(c => 
      c.includes('Condición del Contribuyente')
    );
    if (condicionIndex !== -1 && celdas[condicionIndex + 1]) {
      datos.condicion = limpiarTexto(celdas[condicionIndex + 1]);
    }

    // Extraer Dirección
    const direccionIndex = celdas.findIndex(c => 
      c.includes('Domicilio Fiscal')
    );
    if (direccionIndex !== -1 && celdas[direccionIndex + 1]) {
      datos.direccion = limpiarTexto(celdas[direccionIndex + 1]);
    }

    // Extraer Departamento
    const deptoMatch = html.match(/Departamento[:\s]*<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>/i);
    if (deptoMatch && deptoMatch[1]) {
      datos.departamento = limpiarTexto(deptoMatch[1]);
    }

    // Extraer Provincia
    const provMatch = html.match(/Provincia[:\s]*<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>/i);
    if (provMatch && provMatch[1]) {
      datos.provincia = limpiarTexto(provMatch[1]);
    }

    // Extraer Distrito
    const distMatch = html.match(/Distrito[:\s]*<\/td>[\s\S]*?<td[^>]*>(.*?)<\/td>/i);
    if (distMatch && distMatch[1]) {
      datos.distrito = limpiarTexto(distMatch[1]);
    }

  } catch (error) {
    console.error('Error al parsear respuesta SUNAT:', error);
  }

  return datos;
}

/**
 * Extrae todas las celdas de la tabla HTML
 */
function extraerCeldasTabla(html) {
  const celdas = [];
  const regex = /<td[^>]*>(.*?)<\/td>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    celdas.push(match[1]);
  }

  return celdas;
}

/**
 * Limpia el texto extraído del HTML
 */
function limpiarTexto(texto) {
  if (!texto) return '';
  
  return texto
    .replace(/<[^>]*>/g, '') // Remover tags HTML
    .replace(/&nbsp;/g, ' ') // Reemplazar &nbsp;
    .replace(/&amp;/g, '&') // Reemplazar &amp;
    .replace(/&lt;/g, '<') // Reemplazar &lt;
    .replace(/&gt;/g, '>') // Reemplazar &gt;
    .replace(/&quot;/g, '"') // Reemplazar &quot;
    .replace(/&#39;/g, "'") // Reemplazar &#39;
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/\n+/g, ' ') // Remover saltos de línea
    .trim();
}