// backend/utils/firmarXML.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import forge from "node-forge";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pemFromPfx = (pfxBuffer, pass) => {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);
  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ][0].key;
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
  const certPem = forge.pki.certificateToPem(certObj);
  return { privateKeyPem, certPem };
};

export const firmarXML = (xmlPath, xmlContent) => {
  try {
    const pfxPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");
    const pfxBuffer = fs.readFileSync(pfxPath);
    const { privateKeyPem, certPem } = pemFromPfx(pfxBuffer, process.env.SUNAT_CERT_PASS || "");
    
    // 🔧 PASO 1: Crear el hash del XML ORIGINAL (sin firma)
    const hash = crypto.createHash('sha256').update(xmlContent, 'utf8').digest('base64');
    
    // 🔧 PASO 2: Crear SignedInfo
    const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
  <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <Reference URI="">
    <Transforms>
      <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </Transforms>
    <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <DigestValue>${hash}</DigestValue>
  </Reference>
</SignedInfo>`;
    
    // 🔧 PASO 3: Firmar el SignedInfo usando canonicalización
    const canonicalSignedInfo = signedInfo
      .replace(/\n/g, '')
      .replace(/>\s+</g, '><')
      .trim();
    
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(canonicalSignedInfo);
    const signature = sign.sign(privateKeyPem, 'base64');
    
    // 🔧 PASO 4: Extraer el certificado sin headers
    const certBase64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\n/g, '');
    
    // 🔧 PASO 5: Construir la firma completa
    const signatureXml = `
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="SignatureSP">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
      <ds:Reference URI="">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue>${hash}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue>${signature}</ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate>${certBase64}</ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
  </ds:Signature>`;
    
    // 🔧 PASO 6: Insertar la firma en la sección ExtensionContent
    const signedXml = xmlContent.replace(
      /<ext:ExtensionContent>\s*<\/ext:ExtensionContent>/,
      `<ext:ExtensionContent>${signatureXml}
      </ext:ExtensionContent>`
    );
    
    // 🔧 PASO 7: Guardar el XML firmado
    const signedPath = xmlPath;
    
    fs.writeFileSync(signedPath, signedXml, "utf8");
    
    console.log(`🔐 XML firmado y guardado en: ${path.basename(signedPath)}`);
    
    return signedPath;
  } catch (error) {
    console.error("❌ Error al firmar XML:", error);
    throw error;
  }
};
