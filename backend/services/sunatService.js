const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { parseStringPromise } = require('xml2js');

class SunatService {
  constructor() {
    // URLs de SUNAT
    this.urls = {
      beta: 'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService',
      produccion: 'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService'
    };
  }

  /**
   * Envía un comprobante electrónico a SUNAT
   */
  async enviarComprobante(options) {
    const {
      zipBase64,
      nombreArchivo,
      rucEmisor,
      usuarioSol,
      claveSol,
      ambiente = 'beta'
    } = options;

    try {
      console.log('📤 Enviando comprobante a SUNAT:', nombreArchivo);

      // Construir el SOAP Envelope manualmente
      const soapEnvelope = this.construirSoapEnvelope({
        zipBase64,
        nombreArchivo,
        rucEmisor,
        usuarioSol,
        claveSol
      });

      // URL según ambiente
      const url = this.urls[ambiente];

      // Enviar request HTTP directo
      const response = await axios.post(url, soapEnvelope, {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:sendBill'
        },
        timeout: 30000 // 30 segundos
      });

      console.log('✅ Respuesta recibida de SUNAT');

      // Parsear respuesta SOAP
      const resultado = await this.parsearRespuestaSunat(response.data);

      return resultado;

    } catch (error) {
      console.error('❌ Error al enviar a SUNAT:', error.message);
      
      if (error.response) {
        console.error('Respuesta de error:', error.response.data);
        // Intentar parsear el error SOAP
        try {
          const errorSunat = await this.parsearErrorSunat(error.response.data);
          throw new Error(`Error SUNAT: ${errorSunat.mensaje} (Código: ${errorSunat.codigo})`);
        } catch (parseError) {
          throw new Error(`Error HTTP ${error.response.status}: ${error.response.statusText}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Construye el SOAP Envelope para sendBill
   */
  construirSoapEnvelope({ zipBase64, nombreArchivo, rucEmisor, usuarioSol, claveSol }) {
    // Credenciales en formato Base64
    const credenciales = Buffer.from(`${rucEmisor}${usuarioSol}:${claveSol}`).toString('base64');

    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ser="http://service.sunat.gob.pe">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" 
                   xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${rucEmisor}${usuarioSol}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${claveSol}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <ser:sendBill>
      <fileName>${nombreArchivo}</fileName>
      <contentFile>${zipBase64}</contentFile>
    </ser:sendBill>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Parsea la respuesta exitosa de SUNAT
   */
  async parsearRespuestaSunat(xmlResponse) {
    try {
      const parsed = await parseStringPromise(xmlResponse, {
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [name => name.replace(/^.*:/, '')] // Remueve namespace prefixes
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

      // Decodificar para obtener información
      const cdrBuffer = Buffer.from(cdrBase64, 'base64');

      return {
        exito: true,
        codigoRespuesta: '0', // Aceptado
        mensajeRespuesta: 'Comprobante aceptado por SUNAT',
        cdrBase64: cdrBase64,
        cdrBuffer: cdrBuffer
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
        tagNameProcessors: [name => name.replace(/^.*:/, '')]
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
      numero,
      usuarioSol,
      claveSol,
      ambiente = 'beta'
    } = options;

    try {
      console.log(`📋 Consultando estado: ${tipoComprobante}-${serie}-${numero}`);

      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:ser="http://service.sunat.gob.pe">
  <soap:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${rucEmisor}${usuarioSol}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${claveSol}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <ser:getStatus>
      <rucComprobante>${rucEmisor}</rucComprobante>
      <tipoComprobante>${tipoComprobante}</tipoComprobante>
      <serieComprobante>${serie}</serieComprobante>
      <numeroComprobante>${numero}</numeroComprobante>
    </ser:getStatus>
  </soap:Body>
</soap:Envelope>`;

      const url = this.urls[ambiente];

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
      tagNameProcessors: [name => name.replace(/^.*:/, '')]
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

module.exports = new SunatService();
