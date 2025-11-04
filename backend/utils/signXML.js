import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { sunatConfig } from "../config/sunat.js";

// Obtener __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pemFromPfx = (pfxBuffer, pass) => {
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, pass);

  // privateKey
  const keyObj = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
    forge.pki.oids.pkcs8ShroudedKeyBag
  ][0].key;
  const privateKeyPem = forge.pki.privateKeyToPem(keyObj);

  // certificate
  const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag][0].cert;
  const certPem = forge.pki.certificateToPem(certObj);

  return { privateKeyPem, certPem };
};

export const firmarXML = async (xmlPath) => {
  const xml = fs.readFileSync(xmlPath, "utf8");

  // Construimos la ruta del PFX de forma segura
  const pfxPath = path.join(__dirname, "..", "certificados", "certificado_sunat.pfx");

  // Leemos el PFX con manejo de error
  let pfxBuffer;
  try {
    pfxBuffer = fs.readFileSync(pfxPath);
  } catch (err) {
    throw new Error(`No se encontró el archivo PFX en ${pfxPath}. Asegúrate de que exista.`);
  }

  const { privateKeyPem, certPem } = pemFromPfx(pfxBuffer, sunatConfig.certPass);

  // Crear firma
  const sig = new SignedXml();
  sig.signingKey = privateKeyPem;

  // Agregar certificado (X509) a la firma
  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data></X509Data>`,
  };

  // Referenciar el elemento raíz
  sig.addReference(
    "//*[local-name()='Invoice']",
    ["http://www.w3.org/2000/09/xmldsig#enveloped-signature"],
    "http://www.w3.org/2001/04/xmlenc#sha256"
  );

  sig.computeSignature(xml);

  const signedPath = xmlPath.replace(".xml", "_signed.xml");
  fs.writeFileSync(signedPath, sig.getSignedXml(), "utf8");

  return signedPath;
};
