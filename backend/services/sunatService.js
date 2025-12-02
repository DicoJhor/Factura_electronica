// backend/services/sunatService.js

import axios from 'axios';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';

class SunatService {
  constructor() {
    // URLs de SUNAT
    this.urls = {
      beta: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
      produccion: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
    };

    // Credenciales desde variables de entorno
    this.rucEmisor = process.env.SUNAT_RUC || '';
    this.usuarioSol = process.env.SUNAT_USUARIO_SOL || 'MODDATOS';
    this.claveSol = process.env.SUNAT_CLAVE_SOL || 'MODDATOS';
    this.ambiente = process.env.SUNAT_AMBIENTE || 'beta';
  }

  /**
   * Envía un comprobante electrónico a SUNAT
   * @param {string} zipPath - Ruta al archivo ZIP con el XML
   * @param {string} nombreArchivo - Nombre del archivo (sin extensión .zip)
   */
  async enviarComprobante(zipPath, nombreArchivo) {
    try {
      console.log('📤 Enviando comprobante a SUNAT:', nombreArchivo);

      // Leer el archivo ZIP y convertir a Base64
      const zipBuffer = await fs.readFile(zipPath);
      const zipBase64 = zipBuffer.toString('base64');

      // Eliminar la extensión .zip si viene en el nombre
      const nombreSinExtension = nombreArchivo.replace('.zip', '');

      // Construir el SOAP Envelope
      const soapEnvelope = this.construirSoapEnvelope({
        zipBase64,
        nombreArchivo: nombreSinExtension,
        rucEmisor: this.rucEmisor,
        usuarioSol: this.usuarioSol,
        claveSol: this.claveSol
      });

      // URL según ambiente
      const url = this.urls[this.ambiente];
      console.log(`🌐 Enviando a: ${url}`);

      // Enviar request HTTP directo
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:sendBill'
        },
        timeout: 60000, // 60 segundos
        validateStatus: () => true // Aceptar cualquier status para manejar errores manualmente
      });

      console.log(`✅ Respuesta recibida de SUNAT (Status: ${response.status})`);

      // Si el status no es 200, intentar parsear el error
      if (response.status !== 200) {
        const errorInfo = this.parsearErrorSunat(response.data);
        throw new Error(`Error SUNAT (${response.status}): ${errorInfo.mensaje}`);
      }

      // Parsear respuesta SOAP exitosa
      const resultado = this.parsearRespuestaSunat(response.data);

      // Guardar el CDR (Constancia de Recepción)
      if (resultado.cdrBuffer) {
        const cdrPath = zipPath.replace('.zip', '-CDR.zip');
        await fs.writeFile(cdrPath, resultado.cdrBuffer);
        console.log('💾 CDR guardado en:', cdrPath);
        resultado.cdrPath = cdrPath;
      }

      return {
        success: true,
        message: resultado.mensajeRespuesta,
        codigoRespuesta: resultado.codigoRespuesta,
        cdrPath: resultado.cdrPath
      };

    } catch (error) {
      console.error('❌ Error al enviar a SUNAT:', error.message);
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Construye el SOAP Envelope para sendBill
   */
  construirSoapEnvelope({ zipBase64, nombreArchivo, rucEmisor, usuarioSol, claveSol }) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:ser="http://service.sunat.gob.pe" 
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${rucEmisor}${usuarioSol}</wsse:Username>
        <wsse:Password>${claveSol}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${nombreArchivo}.zip</fileName>
      <contentFile>${zipBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  /**
   * Parsea la respuesta exitosa de SUNAT usando regex simple
   */
  parsearRespuestaSunat(xmlResponse) {
    try {
      console.log('🔍 Parseando respuesta XML de SUNAT...');
      
      // Log parcial de la respuesta para debug (primeros 500 caracteres)
      console.log('📄 Respuesta XML (inicio):', xmlResponse.substring(0, 500));

      // Intentar diferentes patrones para encontrar el contenido Base64
      let cdrBase64 = null;
      
      // Patrón 1: <applicationResponse>...</applicationResponse>
      let match = xmlResponse.match(/<applicationResponse[^>]*>(.*?)<\/applicationResponse>/s);
      if (match && match[1]) {
        cdrBase64 = match[1].trim();
        console.log('✅ Encontrado applicationResponse (patrón 1)');
      }
      
      // Patrón 2: <ns2:applicationResponse>...</ns2:applicationResponse>
      if (!cdrBase64) {
        match = xmlResponse.match(/<[^:]+:applicationResponse[^>]*>(.*?)<\/[^:]+:applicationResponse>/s);
        if (match && match[1]) {
          cdrBase64 = match[1].trim();
          console.log('✅ Encontrado applicationResponse (patrón 2 con namespace)');
        }
      }
      
      // Patrón 3: Buscar cualquier contenido Base64 largo (más de 100 caracteres)
      if (!cdrBase64) {
        match = xmlResponse.match(/>([A-Za-z0-9+/=]{100,})</s);
        if (match && match[1]) {
          cdrBase64 = match[1].trim();
          console.log('✅ Encontrado contenido Base64 (patrón 3)');
        }
      }

      // Patrón 4: Buscar entre tags que contengan "content" o "response"
      if (!cdrBase64) {
        match = xmlResponse.match(/<[^>]*(?:content|response)[^>]*>([A-Za-z0-9+/=\s]{100,})<\/[^>]+>/is);
        if (match && match[1]) {
          cdrBase64 = match[1].replace(/\s+/g, '');
          console.log('✅ Encontrado contenido en tags con content/response (patrón 4)');
        }
      }

      if (!cdrBase64) {
        console.error('❌ No se encontró el CDR en la respuesta');
        console.log('📄 Respuesta completa:', xmlResponse);
        throw new Error('No se encontró el CDR (applicationResponse) en la respuesta SOAP');
      }

      console.log(`📦 CDR Base64 encontrado (${cdrBase64.length} caracteres)`);

      // Decodificar el Base64
      const cdrBuffer = Buffer.from(cdrBase64, 'base64');
      console.log(`✅ CDR decodificado (${cdrBuffer.length} bytes)`);

      // Intentar extraer información del CDR
      let codigoRespuesta = '0';
      let mensajeRespuesta = 'Comprobante aceptado por SUNAT';

      try {
        const zip = new AdmZip(cdrBuffer);
        const zipEntries = zip.getEntries();
        
        console.log(`📂 ZIP contiene ${zipEntries.length} archivo(s)`);
        
        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('.xml')) {
            const cdrXml = entry.getData().toString('utf8');
            
            console.log(`📄 Leyendo CDR XML: ${entry.entryName}`);
            
            // Extraer código de respuesta
            const codigoMatch = cdrXml.match(/<cbc:ResponseCode[^>]*>(.*?)<\/cbc:ResponseCode>/);
            if (codigoMatch) {
              codigoRespuesta = codigoMatch[1];
              console.log(`✅ Código respuesta: ${codigoRespuesta}`);
            }
            
            // Extraer descripción/mensaje
            const descMatch = cdrXml.match(/<cbc:Description[^>]*>(.*?)<\/cbc:Description>/);
            if (descMatch) {
              mensajeRespuesta = descMatch[1];
              console.log(`✅ Mensaje: ${mensajeRespuesta}`);
            }
            
            break;
          }
        }
      } catch (cdrError) {
        console.warn('⚠️ No se pudo extraer detalles del CDR:', cdrError.message);
      }

      return {
        exito: true,
        codigoRespuesta,
        mensajeRespuesta,
        cdrBase64,
        cdrBuffer
      };

    } catch (error) {
      console.error('❌ Error al parsear respuesta SUNAT:', error.message);
      throw new Error(`Error al procesar respuesta de SUNAT: ${error.message}`);
    }
  }

  /**
   * Parsea errores SOAP de SUNAT usando regex
   */
  parsearErrorSunat(xmlResponse) {
    try {
      // Buscar faultcode
      const codeMatch = xmlResponse.match(/<faultcode[^>]*>(.*?)<\/faultcode>/);
      const codigo = codeMatch ? codeMatch[1] : 'ERROR';

      // Buscar faultstring
      const msgMatch = xmlResponse.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
      const mensaje = msgMatch ? msgMatch[1] : 'Error desconocido de SUNAT';

      return {
        codigo,
        mensaje
      };

    } catch (error) {
      return {
        codigo: 'PARSE_ERROR',
        mensaje: 'No se pudo parsear el error de SUNAT'
      };
    }
  }

  /**
   * Verifica el estado de un comprobante en SUNAT
   */
  async consultarEstado(options) {
    const {
      rucEmisor,
      tipoComprobante,
      serie,
      numero
    } = options;

    try {
      console.log(`📋 Consultando estado: ${tipoComprobante}-${serie}-${numero}`);

      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
                  xmlns:ser="http://service.sunat.gob.pe"
                  xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${this.rucEmisor}${this.usuarioSol}</wsse:Username>
        <wsse:Password>${this.claveSol}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:getStatus>
      <rucComprobante>${rucEmisor}</rucComprobante>
      <tipoComprobante>${tipoComprobante}</tipoComprobante>
      <serieComprobante>${serie}</serieComprobante>
      <numeroComprobante>${numero}</numeroComprobante>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

      const url = this.urls[this.ambiente];

      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:getStatus'
        },
        timeout: 30000
      });

      const resultado = this.parsearEstado(response.data);
      return resultado;

    } catch (error) {
      console.error('❌ Error al consultar estado:', error.message);
      throw error;
    }
  }

  /**
   * Parsea respuesta de getStatus usando regex
   */
  parsearEstado(xmlResponse) {
    const codeMatch = xmlResponse.match(/<statusCode[^>]*>(.*?)<\/statusCode>/);
    const msgMatch = xmlResponse.match(/<statusMessage[^>]*>(.*?)<\/statusMessage>/);

    if (!codeMatch) {
      throw new Error('Respuesta de estado inválida');
    }

    return {
      estado: codeMatch[1],
      mensaje: msgMatch ? msgMatch[1] : 'Sin mensaje'
    };
  }
}

// Exportar instancia única del servicio
const sunatService = new SunatService();

// Exportar la función compatible con tu código actual
export const enviarFacturaASunat = async (zipPath, nombreArchivo) => {
  return await sunatService.enviarComprobante(zipPath, nombreArchivo);
};

export default sunatService;
