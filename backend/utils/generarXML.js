// backend/utils/generarXML.js
import fs from "fs";
import path from "path";
import { pool } from "../config/db.js";

// Función para escapar caracteres especiales XML (pero mantener CDATA)
const escapeXml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

export const generarXML = async ({ 
  serie, 
  numero, 
  cliente = {}, 
  total = 0, 
  productos = [],
  nombreArchivo,
  cliente_id,
  empresa_id
}) => {
  
  console.log("📝 Generando XML UBL 2.1...");
  
  // Obtener datos completos de la empresa
  let empresaData;
  if (empresa_id) {
    const [rows] = await pool.query('SELECT * FROM empresas WHERE id = ?', [empresa_id]);
    empresaData = rows[0];
  }

  // Obtener datos completos del cliente
  let clienteCompleto = cliente;
  if (cliente_id && (!cliente.nombre || !cliente.documento)) {
    const [rows] = await pool.query('SELECT * FROM clientes WHERE id = ?', [cliente_id]);
    if (rows && rows.length > 0) {
      clienteCompleto = {
        documento: rows[0].numero_doc,
        nombre: rows[0].nombre,
        direccion: rows[0].direccion || '-',
        tipoDoc: rows[0].tipo_doc === 'RUC' ? '6' : '1'
      };
    }
  }

  const date = new Date().toISOString().split("T")[0];
  const time = new Date().toISOString().split("T")[1].split(".")[0];
  
  // Calcular totales
  const subtotal = (total / 1.18).toFixed(2);
  const igv = (total - subtotal).toFixed(2);

  // Determinar tipo de comprobante
  const tipoDoc = serie.startsWith('F') ? '01' : '03'; // F=Factura, B=Boleta
  
  let itemsXml = "";
  productos.forEach((p, i) => {
    const qty = p.cantidad || 1;
    const price = Number(p.precio || p.precio_unitario || 0).toFixed(2);
    const subtotalItem = (qty * price / 1.18).toFixed(2);
    const igvItem = (qty * price - subtotalItem).toFixed(2);
    const totalItem = (qty * price).toFixed(2);
    
    // Usar CDATA para descripciones con caracteres especiales
    const descripcion = p.descripcion || p.nombre || p.producto || 'Producto';
    
    itemsXml += `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="NIU">${qty}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="PEN">${subtotalItem}</cbc:LineExtensionAmount>
      <cac:PricingReference>
        <cac:AlternativeConditionPrice>
          <cbc:PriceAmount currencyID="PEN">${price}</cbc:PriceAmount>
          <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
        </cac:AlternativeConditionPrice>
      </cac:PricingReference>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="PEN">${igvItem}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="PEN">${subtotalItem}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="PEN">${igvItem}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>18.00</cbc:Percent>
            <cbc:TaxExemptionReasonCode>10</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme>
              <cbc:ID>1000</cbc:ID>
              <cbc:Name>IGV</cbc:Name>
              <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description><![CDATA[${descripcion}]]></cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="PEN">${price}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
  });

  const rucEmisor = empresaData?.ruc || process.env.SUNAT_RUC || "20000000000";
  const razonSocial = empresaData?.razon_social || "MI EMPRESA S.A.C.";
  const nombreComercial = empresaData?.nombre_comercial || razonSocial;
  const direccionEmisor = empresaData?.direccion || "AV. EJEMPLO 123";

  // Generar XML sin espacios innecesarios entre tags
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ccts="urn:un:unece:uncefact:documentation:2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2" xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent></ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${serie}-${String(numero).padStart(8, '0')}</cbc:ID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode listID="0101">${tipoDoc}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${rucEmisor}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>${rucEmisor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${razonSocial}]]></cbc:Name>
      </cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#SignatureSP</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="6">${rucEmisor}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${nombreComercial}]]></cbc:Name>
      </cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${razonSocial}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${direccionEmisor}]]></cbc:Line>
          </cac:AddressLine>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${clienteCompleto.tipoDoc || '1'}">${clienteCompleto.documento || clienteCompleto.ruc || "00000000"}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[${clienteCompleto.nombre || "CLIENTE"}]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cac:AddressLine>
            <cbc:Line><![CDATA[${clienteCompleto.direccion || '-'}]]></cbc:Line>
          </cac:AddressLine>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${subtotal}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${igv}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:ID>1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="PEN">${Number(total).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="PEN">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${itemsXml}
</Invoice>`;

  const folder = path.resolve("./facturas");
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
  
  const fileName = nombreArchivo || `${serie}-${String(numero).padStart(6, '0')}`;
  const xmlPath = path.join(folder, `${fileName}.xml`);
  
  console.log(`💾 Guardando XML: ${fileName}.xml`);
  
  // Guardar con UTF-8 sin BOM
  fs.writeFileSync(xmlPath, xml, { encoding: "utf8" });
  
  console.log("✅ XML generado correctamente");
  
  return { xmlPath, xmlContent: xml };
};
