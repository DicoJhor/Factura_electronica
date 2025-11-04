// backend/utils/generarXML.js
import fs from "fs";
import path from "path";

export const generarXML = ({ numero, cliente = {}, total = 0, productos = [] }) => {
  const date = new Date().toISOString().split("T")[0];

  let itemsXml = "";
  productos.forEach((p, i) => {
    const qty = p.cantidad || 1;
    const price = Number(p.precio || p.precio_unitario || 0).toFixed(2);
    const subtotal = (qty * price).toFixed(2);
    itemsXml += `
      <cac:InvoiceLine>
        <cbc:ID>${i + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="NIU">${qty}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="PEN">${subtotal}</cbc:LineExtensionAmount>
        <cac:Item>
          <cbc:Description>${p.nombre || p.producto}</cbc:Description>
        </cac:Item>
        <cac:Price>
          <cbc:PriceAmount currencyID="PEN">${price}</cbc:PriceAmount>
        </cac:Price>
      </cac:InvoiceLine>`;
  });

  const invoiceId = `Invoice-${numero}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         Id="${invoiceId}">
  <cbc:ID>${numero}</cbc:ID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>PEN</cbc:DocumentCurrencyCode>

  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>${process.env.SUNAT_RUC || "20123456789"}</cbc:CustomerAssignedAccountID>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>MI EMPRESA PRUEBA</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cbc:CustomerAssignedAccountID>${cliente.ruc || cliente.documento || "00000000"}</cbc:CustomerAssignedAccountID>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${cliente.nombre || "CLIENTE PRUEBA"}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${itemsXml}

  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="PEN">${Number(total).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;

  const folder = path.resolve("./facturas");
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const xmlPath = path.join(folder, `${numero}.xml`);
  fs.writeFileSync(xmlPath, xml, "utf8");

  return { xmlPath, xmlContent: xml };
};