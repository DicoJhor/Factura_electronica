import { useEffect, useRef } from 'react';

const PDFPreview = ({ factura }) => {
  const iframeRef = useRef(null);

  // URL de tu backend en Railway
  const BASE_URL = "https://facturaelectronica-production.up.railway.app";

  useEffect(() => {
    if (!factura || !factura.cliente) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: white; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          h1 { color: #333; margin: 0; font-size: 24px; }
          .info { margin: 20px 0; line-height: 1.6; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; padding-top: 10px; border-top: 2px solid #333; }
          .text-right { text-align: right; }
          .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>FACTURA ELECTRÓNICA</h1>
          <p>Número: ${factura.numero || 'N/A'}</p>
          <span class="success-badge">✓ Generada Correctamente</span>
        </div>
        
        <div class="info">
          <p><strong>Cliente:</strong> ${factura.cliente.nombre || 'N/A'}</p>
          <p><strong>RUC/DNI:</strong> ${factura.cliente.ruc || factura.cliente.documento || 'N/A'}</p>
          <p><strong>Dirección:</strong> ${factura.cliente.direccion || 'N/A'}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <h3>Detalle de Productos</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 50%">Producto</th>
              <th style="width: 15%; text-align: center">Cantidad</th>
              <th style="width: 17.5%; text-align: right">Precio Unit.</th>
              <th style="width: 17.5%; text-align: right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${(factura.productos || []).map(p => {
              const cantidad = Number(p.cantidad) || 1;
              const precio = Number(p.precio || p.precio_unitario) || 0;
              const subtotal = cantidad * precio;
              return `
                <tr>
                  <td>${p.nombre || p.producto || 'N/A'}</td>
                  <td style="text-align: center">${cantidad}</td>
                  <td style="text-align: right">S/ ${precio.toFixed(2)}</td>
                  <td style="text-align: right">S/ ${subtotal.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="total">
          TOTAL: S/ ${(factura.total || 0).toFixed(2)}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
          <p><strong>Archivos generados:</strong></p>
          <p>📄 XML: ${factura.xmlPath || 'N/A'}</p>
          <p>📄 PDF: ${factura.pdfPath || 'N/A'}</p>
        </div>
      </body>
      </html>
    `;

    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }
  }, [factura]);

  if (!factura) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">📄 Vista Previa de la Factura</h3>
      <div style={{ width: '100%', height: '600px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
        <iframe ref={iframeRef} title="Vista previa del PDF" style={{ width: '100%', height: '100%', border: 'none' }} />
      </div>

      {factura.pdfPath && (
        <div className="mt-4 flex gap-3">
          <a
            href={`${BASE_URL}${factura.pdfPath}`}
            download
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            📥 Descargar PDF
          </a>
          {factura.xmlPath && (
            <a
              href={`${BASE_URL}${factura.xmlPath}`}
              download
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              📥 Descargar XML
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default PDFPreview;
