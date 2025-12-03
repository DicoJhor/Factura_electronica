// backend/services/sunatService.js
import axios from 'axios';
import https from 'https';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import forge from 'node-forge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🎭 MODO DEMO: Cambia esto a false cuando quieras enviar a SUNAT real
const FORZAR_MODO_DEMO = true; // 👈 TRUE = Todo sale aceptado | FALSE = Envío real a SUNAT

console.log('\n🎭 ==========================================');
console.log(`🎭 MODO DEMO: ${FORZAR_MODO_DEMO ? '✅ ACTIVADO - Todo saldrá ACEPTADO' : '❌ DESACTIVADO - Envío real a SUNAT'}`);
console.log('🎭 ==========================================\n');

// Función para extraer PEM del PFX
const pemFromPfx = (pfxPath, password) => {
  const pfxBuffer = fsSync.readFileSync(pfxPath);
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
  
  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ][0].key;
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);
  
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ][0].cert;
  const certPem = forge.pki.certificateToPem(certObj);
  
  return { privateKeyPem, certPem };
};

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
    this.certPassword = process.env.SUNAT_CERT_PASS || '';
    
    // Cargar certificado PFX
    this.certificadoPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");
    
    // Solo inicializar certificado si NO estamos en modo demo
    if (!FORZAR_MODO_DEMO) {
      this.inicializarCertificado();
    }
  }

  /**
   * Inicializa el agente HTTPS con el certificado PFX
   */
  inicializarCertificado() {
    try {
      if (!fsSync.existsSync(this.certificadoPath)) {
        console.warn(`⚠️ Certificado no encontrado en: ${this.certificadoPath}`);
        console.warn('⚠️ Las peticiones a SUNAT pueden fallar sin certificado');
        this.httpsAgent = null;
        return;
      }

      // Extraer PEM del PFX
      const { privateKeyPem, certPem } = pemFromPfx(this.certificadoPath, this.certPassword);
      
      // Crear agente HTTPS con el certificado
      this.httpsAgent = new https.Agent({
        cert: certPem,
        key: privateKeyPem,
        rejectUnauthorized: false // Para ambiente Beta
      });
      
      console.log('✅ Certificado digital cargado correctamente para SUNAT');
      
    } catch (error) {
      console.error('❌ Error al cargar certificado:', error.message);
      this.httpsAgent = null;
    }
  }

  /**
   * Envía un comprobante electrónico a SUNAT
   * @param {string} zipPath - Ruta al archivo ZIP con el XML
   * @param {string} nombreArchivo - Nombre del archivo (sin extensión .zip)
   */
  async enviarComprobante(zipPath, nombreArchivo) {
    // 🎭 MODO DEMO: Retornar éxito inmediatamente
    if (FORZAR_MODO_DEMO) {
      console.log('🎭 ========== MODO DEMOSTRACIÓN ==========');
      console.log(`🎭 Comprobante: ${nombreArchivo}`);
      console.log('🎭 Simulando envío a SUNAT...');
      
      // Simular delay realista
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Crear CDR simulado
      const cdrPath = zipPath.replace('.zip', '-CDR.zip');
      try {
        const cdrSimulado = this.crearCDRSimulado(nombreArchivo);
        await fs.writeFile(cdrPath, cdrSimulado);
        console.log('💾 CDR simulado guardado');
      } catch (e) {
        console.warn('⚠️ No se pudo guardar CDR:', e.message);
      }

      console.log('✅ COMPROBANTE ACEPTADO POR SUNAT (simulado)');
      console.log('🎭 =======================================\n');

      return {
        success: true,
        message: 'La Factura numero ' + nombreArchivo + ', ha sido aceptada',
        codigoRespuesta: '0',
        cdrPath: cdrPath
      };
    }

    // ====== CÓDIGO ORIGINAL PARA ENVÍO REAL ======
    try {
      console.log('📤 Enviando comprobante a SUNAT:', nombreArchivo);

      if (!this.httpsAgent) {
        console.warn('⚠️ Enviando sin certificado SSL - puede fallar');
      }

      const zipBuffer = await fs.readFile(zipPath);
      const zipBase64 = zipBuffer.toString('base64');
      console.log(`📦 ZIP cargado: ${zipBuffer.length} bytes`);

      const nombreSinExtension = nombreArchivo.replace('.zip', '');
      const soapEnvelope = this.construirSoapEnvelope({
        zipBase64,
        nombreArchivo: nombreSinExtension,
        rucEmisor: this.rucEmisor,
        usuarioSol: this.usuarioSol,
        claveSol: this.claveSol
      });

      const url = this.urls[this.ambiente];
      console.log(`🌐 Enviando a: ${url}`);
      console.log(`🔐 Usuario: ${this.rucEmisor}${this.usuarioSol}`);

      const axiosConfig = {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          'SOAPAction': 'urn:sendBill'
        },
        timeout: 60000,
        validateStatus: () => true,
        httpsAgent: this.httpsAgent
      };

      const response = await axios.post(url, soapEnvelope, axiosConfig);
      console.log(`✅ Respuesta recibida de SUNAT (Status: ${response.status})`);

      if (response.status !== 200) {
        const errorInfo = this.parsearErrorSunat(response.data);
        throw new Error(`Error SUNAT (${response.status}): ${errorInfo.mensaje}`);
      }

      const resultado = this.parsearRespuestaSunat(response.data);

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
      
      if (error.response) {
        console.error('📋 Status:', error.response.status);
        console.error('📋 Headers:', error.response.headers);
        if (error.response.data) {
          console.error('📋 Data (primeros 500 chars):', 
            String(error.response.data).substring(0, 500));
        }
      }
      
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }

  /**
   * Crea un CDR (Constancia de Recepción) simulado
   */
  crearCDRSimulado(nombreArchivo) {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toTimeString().split(' ')[0];
    
    const cdrXml = `<?xml version="1.0" encoding="UTF-8"?>
<ApplicationResponse xmlns="urn:oasis:names:specification:ubl:schema:xsd:ApplicationResponse-2"
                     xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                     xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
  <cbc:ID>${nombreArchivo}</cbc:ID>
  <cbc:IssueDate>${fecha}</cbc:IssueDate>
  <cbc:IssueTime>${hora}</cbc:IssueTime>
  <cac:Signature>
    <cbc:ID>SignatureSP</cbc:ID>
  </cac:Signature>
  <cac:SenderParty>
    <cac:PartyIdentification>
      <cbc:ID>20000000001</cbc:ID>
    </cac:PartyIdentification>
    <cac:PartyName>
      <cbc:Name>SUNAT</cbc:Name>
    </cac:PartyName>
  </cac:SenderParty>
  <cac:DocumentResponse>
    <cac:Response>
      <cbc:ResponseCode>0</cbc:ResponseCode>
      <cbc:Description>La Factura numero ${nombreArchivo}, ha sido aceptada</cbc:Description>
    </cac:Response>
    <cac:DocumentReference>
      <cbc:ID>${nombreArchivo}</cbc:ID>
    </cac:DocumentReference>
  </cac:DocumentResponse>
</ApplicationResponse>`;

    const zip = new AdmZip();
    zip.addFile(`R-${nombreArchivo}.xml`, Buffer.from(cdrXml, 'utf8'));
    return zip.toBuffer();
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
      
      let cdrBase64 = null;
      let match = String(xmlResponse).match(/<applicationResponse[^>]*>(.*?)<\/applicationResponse>/s);
      if (match && match[1]) {
        cdrBase64 = match[1].trim();
        console.log('✅ Encontrado applicationResponse (patrón 1)');
      }
      
      if (!cdrBase64) {
        match = String(xmlResponse).match(/<[^:]+:applicationResponse[^>]*>(.*?)<\/[^:]+:applicationResponse>/s);
        if (match && match[1]) {
          cdrBase64 = match[1].trim();
          console.log('✅ Encontrado applicationResponse (patrón 2 con namespace)');
        }
      }
      
      if (!cdrBase64) {
        match = String(xmlResponse).match(/>([A-Za-z0-9+/=]{100,})</s);
        if (match && match[1]) {
          cdrBase64 = match[1].trim();
          console.log('✅ Encontrado contenido Base64 (patrón 3)');
        }
      }

      if (!cdrBase64) {
        console.error('❌ No se encontró el CDR en la respuesta');
        throw new Error('No se encontró el CDR (applicationResponse) en la respuesta SOAP');
      }

      console.log(`📦 CDR Base64 encontrado (${cdrBase64.length} caracteres)`);

      const cdrBuffer = Buffer.from(cdrBase64, 'base64');
      console.log(`✅ CDR decodificado (${cdrBuffer.length} bytes)`);

      let codigoRespuesta = '0';
      let mensajeRespuesta = 'Comprobante aceptado por SUNAT';

      try {
        const zip = new AdmZip(cdrBuffer);
        const zipEntries = zip.getEntries();
        
        for (const entry of zipEntries) {
          if (entry.entryName.endsWith('.xml')) {
            const cdrXml = entry.getData().toString('utf8');
            
            const codigoMatch = cdrXml.match(/<cbc:ResponseCode[^>]*>(.*?)<\/cbc:ResponseCode>/);
            if (codigoMatch) {
              codigoRespuesta = codigoMatch[1];
            }
            
            const descMatch = cdrXml.match(/<cbc:Description[^>]*>(.*?)<\/cbc:Description>/);
            if (descMatch) {
              mensajeRespuesta = descMatch[1];
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
      const responseStr = String(xmlResponse);
      
      const codeMatch = responseStr.match(/<faultcode[^>]*>(.*?)<\/faultcode>/);
      const codigo = codeMatch ? codeMatch[1] : 'ERROR';

      const msgMatch = responseStr.match(/<faultstring[^>]*>(.*?)<\/faultstring>/);
      let mensaje = msgMatch ? msgMatch[1] : 'Error desconocido de SUNAT';
      
      const detailMatch = responseStr.match(/<detail[^>]*>(.*?)<\/detail>/s);
      if (detailMatch) {
        const detail = detailMatch[1];
        const msgDetailMatch = detail.match(/<message[^>]*>(.*?)<\/message>/);
        if (msgDetailMatch) {
          mensaje += ` - Detalle: ${msgDetailMatch[1]}`;
        }
      }

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
        timeout: 30000,
        httpsAgent: this.httpsAgent
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
    const responseStr = String(xmlResponse);
    const codeMatch = responseStr.match(/<statusCode[^>]*>(.*?)<\/statusCode>/);
    const msgMatch = responseStr.match(/<statusMessage[^>]*>(.*?)<\/statusMessage>/);

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
