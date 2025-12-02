// backend/services/sunatService.js

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { parseStringPromise } from 'xml2js';
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
        const errorInfo = await this.parsearErrorSunat(response.data);
        throw new Error(`Error SUNAT (${response.status}): ${errorInfo.mensaje}`);
      }

      // Parsear respuesta SOAP exitosa
      const resultado = await this.parsearRespuestaSunat(response.data);

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
   * Parsea la respuesta exitosa de SUNAT
   */
  async parsearRespuestaSunat(xmlResponse) {
    try {
      const parsed = await parseStringPromise(xmlResponse, {
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [(name) => name.replace(/^.*:/, '')] // Remueve namespace prefixes
      });

      // Navegar por la respuesta SOAP
      const body = parsed.Envelope?.Body;
      const sendBillResponse = body?.sendBillResponse;

      if (!sendBillResponse) {
        throw new Error('Respuesta SOAP inválida: no se encontró sendBillResponse');
      }

      // Extraer datos de la respuesta
      const applicationResponse = sendBillResponse.applicationResponse;
      
      if (!applicationResponse) {
        throw new Error('No se recibió applicationResponse de SUNAT');
      }

      // El CDR (Constancia de Recepción) viene en Base64
      const cdrBase64 = applicationResponse;
      const cdrBuffer = Buffer.from(cdrBase64, 'base64');

      // Extraer información del CDR (opcional)
      let codigoRespuesta = '0';
      let mensajeRespuesta = 'Comprobante aceptado por SUNAT';

      try {
        const zip = new AdmZip(cdrBuffer);
        const zipEntries = zip.getEntries();
        
        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('.xml')) {
            const cdrXml = entry.getData().toString('utf8');
            const cdrParsed = await parseStringPromise(cdrXml, {
              explicitArray: false,
              tagNameProcessors: [(name) => name.replace(/^.*:/, '')]
            });

            // Extraer código y mensaje de respuesta
            const response = cdrParsed.ApplicationResponse?.DocumentResponse?.Response;
            if (response) {
              codigoRespuesta = response.ResponseCode || '0';
              mensajeRespuesta = response.Description || 'Aceptado';
            }
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
      console.error('Error al parsear respuesta SUNAT:', error);
      throw new Error(`Error al procesar respuesta de SUNAT: ${error.message}`);
    }
  }

  /**
   * Parsea errores SOAP de SUNAT
   */
  async parsearErrorSunat(xmlResponse) {
    try {
      const parsed = await parseStringPromise(xmlResponse, {
        explicitArray: false,
        tagNameProcessors: [(name) => name.replace(/^.*:/, '')]
      });

      const fault = parsed.Envelope?.Body?.Fault;
      
      if (fault) {
        return {
          codigo: fault.faultcode || 'ERROR',
          mensaje: fault.faultstring || 'Error desconocido de SUNAT'
        };
      }

      return {
        codigo: 'ERROR',
        mensaje: 'Error desconocido al procesar respuesta de SUNAT'
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

      const resultado = await this.parsearEstado(response.data);
      return resultado;

    } catch (error) {
      console.error('❌ Error al consultar estado:', error.message);
      throw error;
    }
  }

  /**
   * Parsea respuesta de getStatus
   */
  async parsearEstado(xmlResponse) {
    const parsed = await parseStringPromise(xmlResponse, {
      explicitArray: false,
      tagNameProcessors: [(name) => name.replace(/^.*:/, '')]
    });

    const statusResponse = parsed.Envelope?.Body?.getStatusResponse;

    if (!statusResponse) {
      throw new Error('Respuesta de estado inválida');
    }

    return {
      estado: statusResponse.statusCode,
      mensaje: statusResponse.statusMessage || 'Sin mensaje'
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
